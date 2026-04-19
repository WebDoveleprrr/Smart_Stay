const ServiceRequest = require('../models/ServiceRequest');
const mongoose = require('mongoose');

const getUserModel = () => mongoose.model('User');

exports.createRequest = async (req, res) => {
  console.log("[Service POST]", req.body);
  const { category, description, severity, location, title } = req.body;
  if (!category || !location) return res.status(400).json({ error: 'Category and location required.' });

  try {
    const User = getUserModel();
    const currentUser = await User.findById(req.session.userId);
    if (!currentUser) return res.status(404).json({ error: 'User not found.' });

    // Assign priority based on severity
    let priority = 'Normal';
    if (severity === 'high') priority = 'High';
    if (severity === 'low') priority = 'Low';

    // Recurring issue detection
    const recentRequests = await ServiceRequest.find({
      category,
      location,
      created_at: { $gt: Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60 } // last 30 days
    });
    const recurring_issue = recentRequests.length >= 2;

    const svc = new ServiceRequest({
      userId: req.session.userId,
      user_id: req.session.userId,
      title: title || 'Service Request',
      category,
      description: description || '',
      severity: severity || 'low',
      priority,
      location,
      block: currentUser.block || '',
      room: currentUser.room || '',
      recurring_issue
    });
    
    // Auto Assign Staff Logic
    const staffMembers = await User.find({ role: 'staff' });
    if (staffMembers.length > 0) {
      // Find staff workloads
      const workloads = await ServiceRequest.aggregate([
        { $match: { status: { $in: ['pending', 'in_progress', 'escalated'] }, assignee_id: { $ne: null } } },
        { $group: { _id: "$assignee_id", count: { $sum: 1 } } }
      ]);
      const workloadMap = {};
      workloads.forEach(w => { workloadMap[w._id] = w.count; });
      
      let bestStaff = null;
      let bestScore = -Infinity;
      
      for (const staff of staffMembers) {
        const load = workloadMap[staff._id.toString()] || 0;
        const rating = staff.rating !== undefined ? staff.rating : 5.0;
        // Prefer high rating, low workload
        const score = rating - (load * 0.5); 
        if (score > bestScore) {
          bestScore = score;
          bestStaff = staff;
        }
      }
      
      if (bestStaff) {
        svc.assignee_id = bestStaff._id;
      }
    }

    await svc.save();
    res.json({ success: true, message: 'Service request submitted!', id: svc._id, assignee: svc.assignee_id });
  } catch (err) { res.status(500).json({ error: 'Failed to submit.' }); }
};

exports.getRequests = async (req, res) => {
  try {
    const isAdmin = req.session.userRole === 'admin';
    const isStaff = req.session.userRole === 'staff';
    const User = getUserModel();
    let requests;
    
    const fillUserData = async (svcs) => {
      const userIds = [...new Set(svcs.map(s => s.user_id)), ...new Set(svcs.map(s => s.assignee_id))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u._id] = u; });
      return svcs.map(s => ({
        ...s,
        id: s._id,
        user_name: userMap[s.user_id]?.name || '—',
        user_email: userMap[s.user_id]?.email || '',
        assignee_name: s.assignee_id ? (userMap[s.assignee_id]?.name || '—') : 'Unassigned'
      }));
    };

    if (isAdmin) {
      const svcs = await ServiceRequest.find().sort({ created_at: -1 }).lean();
      requests = await fillUserData(svcs);
    } else if (isStaff) {
      const svcs = await ServiceRequest.find({ assignee_id: req.session.userId }).sort({ created_at: -1 }).lean();
      requests = await fillUserData(svcs);
    } else {
      const svcs = await ServiceRequest.find({ user_id: req.session.userId }).sort({ created_at: -1 }).lean();
      requests = await fillUserData(svcs);
    }
    res.json({ requests });
  } catch (err) { res.status(500).json({ error: 'DB error.' }); }
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const isStaffOrAdmin = ['admin', 'staff'].includes(req.session.userRole);
  if (!isStaffOrAdmin) return res.status(403).json({ error: 'Unauthorized.' });

  try {
    const svc = await ServiceRequest.findById(req.params.id);
    if (!svc) return res.status(404).json({ error: 'Not found.' });
    
    svc.status = status;
    svc.updated_at = Math.floor(Date.now() / 1000);
    
    if (status === 'completed') {
      svc.resolutionTimeMinutes = Math.floor((svc.updated_at - svc.created_at) / 60);
    }
    
    await svc.save();
    res.json({ success: true, message: 'Status updated.' });
  } catch (err) { res.status(500).json({ error: 'Update failed.' }); }
};

exports.rateService = async (req, res) => {
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Invalid rating.' });
  
  try {
    const svc = await ServiceRequest.findOne({ _id: req.params.id, user_id: req.session.userId });
    if (!svc) return res.status(404).json({ error: 'Not found.' });
    if (svc.status !== 'completed' && svc.status !== 'verified') return res.status(400).json({ error: 'Service not completed yet.' });
    if (svc.rating) return res.status(400).json({ error: 'Already rated.' });

    svc.rating = rating;
    svc.status = 'verified'; // Mark verified after user rates it
    await svc.save();

    if (svc.assignee_id) {
      const User = getUserModel();
      const staff = await User.findById(svc.assignee_id);
      if (staff) {
        // Simple moving average or basic update
        staff.rating = staff.rating ? ((staff.rating * 9) + rating) / 10 : rating;
        await staff.save();
      }
    }
    res.json({ success: true, message: 'Rating submitted.' });
  } catch (err) { res.status(500).json({ error: 'Rating failed.' }); }
};

// GET /api/services/analytics
exports.getAnalytics = async (req, res) => {
  if (req.session.userRole !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const User = getUserModel();
    const currentUnix = Math.floor(Date.now() / 1000);
    
    // Average resolution time
    const completed = await ServiceRequest.find({ resolutionTimeMinutes: { $ne: null } });
    const avgResTime = completed.length 
      ? Math.round(completed.reduce((sum, req) => sum + req.resolutionTimeMinutes, 0) / completed.length) 
      : 0;

    // Frequent issues
    const issues = await ServiceRequest.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    // Staff ranking
    const staffList = await User.find({ role: 'staff' }).sort({ rating: -1 }).limit(5).select('name rating');

    // Escalated requests
    const escalated = await ServiceRequest.find({ status: 'escalated' }).lean();

    res.json({
      avgResolutionMinutes: avgResTime,
      frequentIssues: issues.map(i => ({ category: i._id, count: i.count })),
      staffRanking: staffList,
      escalatedRequests: escalated
    });
  } catch (err) { res.status(500).json({ error: 'Analytics failed' }); }
};
