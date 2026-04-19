const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// 1. role: add staff
content = content.replace(
  "role: { type: String, default: 'student', enum: ['student', 'admin'] },\n  rating: { type: Number, default: 5.0, min: 0, max: 5 },",
  "role: { type: String, default: 'student', enum: ['student', 'admin', 'staff'] },\n  rating: { type: Number, default: 5.0, min: 0, max: 5 },"
);

// 2. remove Old Schemas
let lines = content.split('\n');
let s1 = lines.findIndex(l => l.includes("const serviceSchema = new mongoose.Schema({"));
let e1 = lines.findIndex(l => l.includes("const Booking = mongoose.model('Booking', bookingSchema);"));
if (s1 !== -1 && e1 !== -1) {
    lines.splice(s1, e1 - s1 + 1, "// Booking and ServiceRequest schemas are imported from /models");
}

// 3. remove Service & Bookings logic, add cron and app.use
let s2 = lines.findIndex(l => l.includes("// SERVICE REQUESTS"));
let e2 = lines.findIndex((l, i) => i > s2 && l.includes("// LOST & FOUND"));
if (s2 !== -1 && e2 !== -1) {
    lines.splice(s2 - 1, e2 - s2, 
`// ════════════════════════════════════════════════════════════════════
// MODULAR ROUTES - SERVICE REQUESTS & BOOKINGS
// ════════════════════════════════════════════════════════════════════
app.use('/api/services', requireAuth, require('./routes/serviceRoutes'));
app.use('/api/bookings', requireAuth, require('./routes/bookingRoutes'));

// ── Admin Unblock Endpoint (kept from legacy bookings) ──
app.patch('/api/admin/users/:id/unblock', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.rating === undefined) { user.rating = 5.0; user.totalBookings = 0; user.cancelledBookings = 0; user.noShows = 0; user.isBlocked = false; }
    
    user.isBlocked = false;
    user.rating = 3.5;
    await user.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Unblock failed.' }); }
});
`);
}

// 4. import cron jobs at the top
let iCron = lines.findIndex(l => l.includes("const { v2: cloudinary }"));
if (iCron !== -1) {
    lines.splice(iCron, 0, "require('./utils/cronJobs');");
} else {
    lines.unshift("require('./utils/cronJobs');");
}

// 5. Remove the old background jobs interval from server.js
let s3 = lines.findIndex(l => l.includes("// BACKGROUND JOBS"));
if(s3 !== -1) {
    let e3 = lines.findIndex((l, i) => i > s3 && l.includes("// ── Auto-open browser & Start"));
    if(e3 !== -1) {
        lines.splice(s3 - 1, e3 - s3);
    }
}

fs.writeFileSync('server.js', lines.join('\n'));
console.log("server.js modified successfully.");
