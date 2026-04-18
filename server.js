require('dotenv').config();
const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('WARNING: SENDGRID_API_KEY not set. Emails will be skipped.');
}
const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const multer = require('multer');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { v2: cloudinary } = require('cloudinary');

// Cloudinary config
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}
const AI_URL = process.env.AI_URL || null;
if (!AI_URL) console.warn('WARNING: AI_URL not set. Image matching will be disabled.');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ uploadsDir FIRST
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ══════════════════════════════════════════════════════════════════
// ⚠️  MONGODB CONNECTION STRING  ⚠️
//  Replace with your MongoDB Atlas connection string when deploying
//  OR keep as-is for local MongoDB
// ══════════════════════════════════════════════════════════════════
const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('FATAL: MONGO_URI environment variable is not set.');
  process.exit(1);
}

// ── Admin Credentials ─────────────────────────────────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bikkinarohitchowdary@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Rohit@1234';

function emailTemplate(title, color, body) {
  return `
  <div style="font-family:Arial;background:#f5f5f5;padding:20px;">
    <div style="max-width:600px;margin:auto;background:white;border-radius:10px;overflow:hidden;">
      
      <div style="background:${color};color:white;padding:15px;font-size:20px;font-weight:bold;">
        ${title}
      </div>

      <div style="padding:20px;">
        ${body}
      </div>

    </div>
  </div>`;
}

async function sendEmail(to, subject, htmlContent, attachments = []) {
  const msg = {
    to,
    from: process.env.EMAIL_USER || "brohitchowdary5@gmail.com",
    subject,
    html: htmlContent,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false }
    }
  };

  if (attachments && attachments.length > 0) {
    msg.attachments = attachments;
  }

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[MAIL SKIPPED - no key] To: ${to} | Subject: ${subject}`);
    return;
  }
  
  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error("ERROR:", err.response?.body || err.message);
  }
}

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: true, // dynamically reflects origin
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session (stored in MongoDB) ───────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'smartstay_secret_2024_hostel',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: uri,
    ttl: 86400,
    autoRemove: 'native',
    touchAfter: 24 * 3600
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(uploadsDir));

// ── MongoDB Connection ────────────────────────────────────────────
mongoose.connect(uri)
  .then(() => {
    console.log('Connected to MongoDB');
    seedAdmin();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Make sure MongoDB is running: mongod');
    process.exit(1);
  });

// ── File Uploads ──────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only images allowed'), { code: 'INVALID_TYPE' }));
    }
  }
});

// ════════════════════════════════════════════════════════════════════
// MONGODB SCHEMAS
// ════════════════════════════════════════════════════════════════════

const userSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  room: { type: String, default: '' },
  block: { type: String, default: '' },
  phone: { type: String, default: '' },
  otp: { type: String, default: null },
  otp_expires: { type: Number, default: null },
  role: { type: String, default: 'student', enum: ['student', 'admin'] },
  rating: { type: Number, default: 5.0, min: 0, max: 5 },
  totalBookings: { type: Number, default: 0 },
  cancelledBookings: { type: Number, default: 0 },
  noShows: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});
const User = mongoose.model('User', userSchema);

const serviceSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  user_id: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, default: 'Pending' },
  priority: { type: String, default: 'Normal' },
  block: { type: String, default: '' },
  room: { type: String, default: '' },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
  updated_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});
const ServiceRequest = mongoose.model('ServiceRequest', serviceSchema);

const bookingSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  user_id: { type: String, required: true },
  facility: { type: String, required: true },
  date: { type: String, required: true },
  time_slot: { type: String, required: true },
  status: { type: String, default: 'Confirmed', enum: ['Confirmed', 'Cancelled', 'Used', 'No-Show'] },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});
const Booking = mongoose.model('Booking', bookingSchema);

const lostFoundSchema = new mongoose.Schema({
  _id: { type: String, default: () => uuidv4() },
  user_id: { type: String, required: true },
  type: { type: String, required: true, enum: ['Lost', 'Found'] },
  item_name: { type: String, required: true },
  description: { type: String, default: '' },
  location: { type: String, default: '' },
  image: { type: mongoose.Schema.Types.Mixed },
  embedding: { type: [Number], default: [] },
  status: { type: String, default: 'Open', enum: ['Open', 'Closed'] },
  matched_id: { type: String, default: null },
  created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});
const LostFound = mongoose.model('LostFound', lostFoundSchema);

// ── Seed Admin ────────────────────────────────────────────────────
async function seedAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (!existing) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await User.create({
        _id: uuidv4(),
        name: 'Admin',
        email: ADMIN_EMAIL,
        password_hash: hash,
        role: 'admin'
      });
      console.log(`Admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log(`Admin exists: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
}

// ── Helpers ───────────────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const validatePassword = p => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=])[A-Za-z\d@$!%*?&#^()_\-+=]{8,}$/.test(p);
const requireAuth = (req, res, next) => {
  if (req.session?.userId && req.session?.verified) return next();
  res.status(401).json({ error: 'Please log in first.' });
};

// ════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ════════════════════════════════════════════════════════════════════

// REGISTER
app.post('/api/register', async (req, res) => {
  const { name, email, password, room, block, phone } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (!validatePassword(password))
    return res.status(400).json({ error: 'Password: min 8 chars, uppercase, lowercase, number, special character.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash: hash,
      room: room || '',
      block: block || '',
      phone: phone || ''
    });

    // Send registration confirmation email
    sendEmail(user.email, "Welcome to Smart Stay", emailTemplate(
      "Welcome to Smart Stay",
      "#2F5D8C",
      `Hello ${user.name},<br><br>Your account has been created successfully.<br>You can now login.<br><br>- Smart Stay`
    ));

    sendEmail(ADMIN_EMAIL, "New User Registered", emailTemplate(
      "New User Registered",
      "#2F5D8C",
      `New user registered:<br><br>Name: ${user.name}<br>Email: ${user.email}<br>Block: ${user.block}<br>Room: ${user.room}<br>Phone: ${user.phone}<br><br>- Smart Stay`
    ));

    res.json({ success: true, message: 'Account created! A confirmation email has been sent. Please login.' });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered.' });
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: new RegExp('^' + cleanEmail + '$', 'i') });
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

    if (user.rating === undefined) {
        user.rating = 5.0;
        user.totalBookings = 0;
        user.cancelledBookings = 0;
        user.noShows = 0;
        user.isBlocked = false;
        await user.save();
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    // ADMIN BYPASS OTP — direct login
    if (user.role === 'admin') {
      req.session.userId = user._id;
      req.session.userName = user.name;
      req.session.userRole = user.role;
      req.session.verified = true;
      return req.session.save((err) => {
        if (err) return res.status(500).json({ error: 'Session error.' });
        res.json({ success: true, name: user.name, role: user.role, message: 'Admin login successful' });
      });
    }

    // NORMAL USER → OTP FLOW
    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000;
    await User.findByIdAndUpdate(user._id, { otp, otp_expires: expires });
    req.session.pendingUserId = user._id.toString();

    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      sendEmail(user.email, "Smart Stay Login Code", emailTemplate(
        "Login Verification Code", "#2F5D8C",
        `Hello ${user.name || 'User'},<br><br>Your login code is: <b>${otp}</b><br><br>Valid for 5 minutes.<br>If not you, ignore.<br><br>- Smart Stay`
      ));
      console.log(`\nOTP for ${user.email}: ${otp}\n`);
      res.json({ success: true, message: 'OTP sent to your registered email! Check your inbox.' });
    }); // prevent double response
  } catch (err) {
    return res.status(500).json({ error: 'Login error.' });
  }
});

// VERIFY OTP
app.post('/api/verify-otp', async (req, res) => {
  const { otp } = req.body;
  if (!req.session.pendingUserId) return res.status(400).json({ error: 'No pending login.' });
  try {
    const user = await User.findById(req.session.pendingUserId);
    if (!user) return res.status(500).json({ error: 'Session error.' });
    
    if (user.rating === undefined) {
        user.rating = 5.0;
        user.totalBookings = 0;
        user.cancelledBookings = 0;
        user.noShows = 0;
        user.isBlocked = false;
        await user.save();
    }
    // ✅ FIRST check expiry
    if (!user.otp_expires || Date.now() > user.otp_expires) {
      return res.status(401).json({ error: 'OTP expired. Login again.' });
    }
    // ✅ THEN check correctness
    if (!user.otp || user.otp !== otp.toString()) {
      return res.status(401).json({ error: 'Invalid OTP.' });
    }
    await User.findByIdAndUpdate(user._id, { otp: null, otp_expires: null });
    req.session.userId = user._id.toString();
    req.session.userName = user.name;
    req.session.userRole = user.role;
    req.session.verified = true;
    delete req.session.pendingUserId;
    req.session.save((err) => {
      if (err) return res.status(500).json({ error: 'Session save error.' });
      res.json({ success: true, name: user.name, role: user.role });
    });
    return;
  } catch (err) {
    res.status(500).json({ error: 'OTP verification error.' });
  }
});

// RESEND OTP
app.post('/api/resend-otp', async (req, res) => {
  try {
    if (!req.session.pendingUserId) {
      return res.status(400).json({ error: 'No pending login.' });
    }

    const user = await User.findById(req.session.pendingUserId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const newOtp = generateOTP();
    const newExpires = Date.now() + 5 * 60 * 1000;
    await User.findByIdAndUpdate(user._id, { otp: newOtp, otp_expires: newExpires });
    user.otp = newOtp; // for email below

    sendEmail(user.email, "Smart Stay Login Verification Code", emailTemplate(
      "Login Verification Code", "#2F5D8C",
      `Hello ${user.name || 'User'},<br><br>You requested a new login code.<br><br>Verification Code:<br><b>${user.otp}</b><br><br>This code is valid for 5 minutes.<br>If this was not you, please ignore.<br><br>- Smart Stay`
    ));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ success: true });
  });
});

app.get('/api/session', (req, res) => {
  if (req.session?.userId && req.session?.verified)
    res.json({ loggedIn: true, name: req.session.userName, role: req.session.userRole, userId: req.session.userId });
  else res.json({ loggedIn: false });
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.rating === undefined) {
      user.rating = 5.0;
      user.totalBookings = 0;
      user.cancelledBookings = 0;
      user.noShows = 0;
      user.isBlocked = false;
      await user.save();
    }

    res.json({ user: { id: user._id, name: user.name, email: user.email, room: user.room, block: user.block, phone: user.phone, role: user.role, created_at: user.created_at, rating: user.rating, totalBookings: user.totalBookings, cancelledBookings: user.cancelledBookings, noShows: user.noShows, isBlocked: user.isBlocked } });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Server error' }); 
  }
});

// ════════════════════════════════════════════════════════════════════
// SERVICE REQUESTS
// ════════════════════════════════════════════════════════════════════

app.post('/api/services', requireAuth, async (req, res) => {
  const { category, description, priority } = req.body;
  if (!category) return res.status(400).json({ error: 'Category required.' });
  try {
    const currentUser = await User.findById(req.session.userId);
    const svc = new ServiceRequest({
      userId: req.session.userId,
      user_id: req.session.userId,
      category,
      description: description || '',
      priority: priority || 'Normal',
      block: currentUser?.block || '',
      room: currentUser?.room || ''
    });
    await svc.save();

    const user = await User.findById(req.session.userId);
    if (user?.email) {
      console.log("Booking user ID:", svc.user_id);
      console.log("Fetched user email:", user.email);

      await sendEmail(user.email, "Service Request Received", emailTemplate(
        "Service Request Received", "#f39c12",
        `Hello ${user.name},<br><br>Your service request has been submitted.<br><br>Category: ${category}<br>Description: ${description}<br>Priority: ${priority}<br><br>We will resolve it soon.<br><br>- Smart Stay`
      ));

      await sendEmail(process.env.ADMIN_EMAIL, "New Service Request", emailTemplate(
        "New Service Request", "#f39c12",
        `User: ${user.name}<br>Email: ${user.email}<br>Category: ${category}<br>Priority: ${priority}<br>Description: ${description}<br><br>- Smart Stay`
      ));
    }
    res.json({ success: true, message: 'Service request submitted! Confirmation email sent.', id: svc._id });
  } catch (err) { res.status(500).json({ error: 'Failed to submit.' }); }
});

app.get('/api/services', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.userRole === 'admin';
    let requests;
    if (isAdmin) {
      const svcs = await ServiceRequest.find().sort({ created_at: -1 }).lean();
      const userIds = [...new Set(svcs.map(s => s.user_id))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u._id] = u; });
      requests = svcs.map(s => ({ ...s, id: s._id, user_name: userMap[s.user_id]?.name || '—', user_email: userMap[s.user_id]?.email || '' }));
    } else {
      const svcs = await ServiceRequest.find({ user_id: req.session.userId }).sort({ created_at: -1 }).lean();
      requests = svcs.map(s => ({ ...s, id: s._id }));
    }
    res.json({ requests });
  } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.patch('/api/services/:id', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  const { status } = req.body;
  try {
    const updatedService = await ServiceRequest.findByIdAndUpdate(req.params.id, { status, updated_at: Math.floor(Date.now() / 1000) }, { new: true });
    
    if (updatedService) {
      const user = await User.findById(updatedService.user_id);
      if (user && user.email) {
        console.log("Booking user ID:", updatedService.user_id);
        console.log("Fetched user email:", user.email);
        
        await sendEmail(
          user.email,
          "Service Request Update",
          emailTemplate(
            "Service Request Updated",
            "#f39c12",
            `<table border="1" cellpadding="10">
              <tr><td>Status</td><td>${status}</td></tr>
              <tr><td>Category</td><td>${updatedService.category}</td></tr>
            </table>`
          )
        );

        await sendEmail(
          process.env.ADMIN_EMAIL,
          "Service Request Updated (Admin)",
          emailTemplate(
            "Service Request Updated",
            "#f39c12",
            `<table border="1" cellpadding="10">
              <tr><td>User</td><td>${user.name}</td></tr>
              <tr><td>Status</td><td>${status}</td></tr>
            </table>`
          )
        );
      }
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Update failed.' }); }
});

// ════════════════════════════════════════════════════════════════════
// FACILITY BOOKINGS
// ════════════════════════════════════════════════════════════════════

app.post('/api/bookings', requireAuth, async (req, res) => {
  const { facility, date, time_slot } = req.body;
  if (!facility || !date || !time_slot) return res.status(400).json({ error: 'All fields required.' });
  try {
    console.log("Booking route hit");
    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (user.rating === undefined) { user.rating = 5.0; user.totalBookings = 0; user.cancelledBookings = 0; user.noShows = 0; user.isBlocked = false; }
    if (user.isBlocked) return res.status(403).json({ error: 'Booking disabled due to low reliability score' });

    const existing = await Booking.findOne({ facility, date, time_slot, status: 'Confirmed' });
    if (existing) return res.status(409).json({ error: 'This slot is already booked. Choose another time.' });

    const booking = new Booking({
      userId: req.session.userId,
      user_id: req.session.userId,
      facility,
      date,
      time_slot
    });
    await booking.save();

    user.totalBookings = (user.totalBookings || 0) + 1;
    await user.save();

    const freshUser = await User.findById(req.session.userId);
    if (freshUser?.email) {
      console.log("Booking user ID:", booking.user_id);
      console.log("Fetched user email:", freshUser.email);
      const htmlUser = `Hello ${freshUser.name},<br><br>Your booking has been confirmed.<br><br>Facility: ${facility}<br>Date: ${date}<br>Time: ${time_slot}<br><br>- Smart Stay`;
      await sendEmail(freshUser.email, "Booking Confirmed", emailTemplate("Booking Confirmed", "#27ae60", htmlUser));
      
      const htmlAdmin = `User: ${freshUser.name}<br>Email: ${freshUser.email}<br>Facility: ${facility}<br>Date: ${date}<br>Time: ${time_slot}<br><br>- Smart Stay`;
      await sendEmail(process.env.ADMIN_EMAIL, "Booking Confirmed", emailTemplate("Booking Confirmed", "#27ae60", htmlAdmin));
    }
    res.json({ success: true, message: `${facility} booked for ${date} at ${time_slot}! Confirmation sent.`, id: booking._id });
  } catch (err) { res.status(500).json({ error: 'Booking failed.' }); }
});

app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.session.userRole === 'admin';
    let bookings;
    if (isAdmin) {
      const bks = await Booking.find().sort({ date: -1 }).lean();
      const userIds = [...new Set(bks.map(b => b.user_id))];
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = {};
      users.forEach(u => { userMap[u._id] = u; });
      bookings = bks.map(b => {
        const u = userMap[b.user_id];
        if (u && u.rating === undefined) { u.rating = 5.0; u.totalBookings = 0; u.cancelledBookings = 0; u.noShows = 0; u.isBlocked = false; }
        return {
          ...b,
          id: b._id,
          user_name: u?.name || '—',
          user_rating: u?.rating,
          user_totalBookings: u?.totalBookings,
          user_cancelledBookings: u?.cancelledBookings,
          user_noShows: u?.noShows,
          user_isBlocked: u?.isBlocked
        };
      });
    } else {
      const bks = await Booking.find({ user_id: req.session.userId }).sort({ date: -1 }).lean();
      bookings = bks.map(b => ({ ...b, id: b._id }));
    }
    res.json({ bookings });
  } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    console.log("Cancel route hit");
    let booking;
    if (req.session.userRole === 'admin') {
      booking = await Booking.findById(req.params.id);
    } else {
      booking = await Booking.findOne({ _id: req.params.id, user_id: req.session.userId });
    }
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });

    booking.status = 'Cancelled';
    await booking.save();

    const user = await User.findById(booking.user_id);
    if (user) {
      if (user.role === 'admin') {
        // do nothing for admin
      } else {
        if (user.rating === undefined) { user.rating = 5.0; user.totalBookings = 0; user.cancelledBookings = 0; user.noShows = 0; user.isBlocked = false; }
        user.cancelledBookings = (user.cancelledBookings || 0) + 1;
        user.rating -= 0.5;
        if (user.rating < 0) user.rating = 0;
        if (user.rating < 3.0) user.isBlocked = true;
        await user.save();
      }
    }
    const freshUser = await User.findById(booking.user_id);
    if (freshUser?.email) {
      console.log("Booking user ID:", booking.user_id);
      console.log("Fetched user email:", freshUser.email);
      const htmlCancel = `Your booking for ${booking.facility} on ${booking.date} at ${booking.time_slot} has been cancelled.<br><br>- Smart Stay`;
      await sendEmail(freshUser.email, "Booking Cancelled", emailTemplate("Booking Cancelled", "#e74c3c", htmlCancel));
      
      const htmlAdmin = `User: ${freshUser.name}<br>Facility: ${booking.facility}<br>Date: ${booking.date}<br>Time: ${booking.time_slot}<br><br>- Smart Stay`;
      await sendEmail(process.env.ADMIN_EMAIL, "Booking Cancelled", emailTemplate("Booking Cancelled", "#e74c3c", htmlAdmin));
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Cancel failed.' }); }
});

// MARK AS USED
app.patch('/api/bookings/:id/usage', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    
    booking.status = 'Used';
    await booking.save();

    const user = await User.findById(booking.user_id);
    if (user) {
      if (user.role === 'admin') return res.json({ success: true });
      if (user.rating === undefined) { user.rating = 5.0; user.totalBookings = 0; user.cancelledBookings = 0; user.noShows = 0; user.isBlocked = false; }
      user.rating += 0.2;
      if (user.rating > 5) user.rating = 5.0;
      await user.save();
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Usage update failed.' }); }
});

// ADMIN UNBLOCK
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

// ════════════════════════════════════════════════════════════════════
// LOST & FOUND
// ════════════════════════════════════════════════════════════════════

// Use upload.any() to flexibly handle FormData regardless of field name mismatch
app.post("/api/lost-found", upload.any(), async (req, res) => {
  console.log(`[Lost & Found POST] Request from ${req.session?.userId || req.userId || 'Guest'}`);
  console.log(`[Lost & Found POST] Body:`, req.body);

  try {
    let imagePayload = null;

    // Extract file dynamically if present
    const imageFile = req.files && req.files.length > 0 ? req.files[0] : req.file;

    if (imageFile) {
      // Setup the graceful Base64 MongoDB fallback ready to be used if Cloudinary isn't available
      const base64Fallback = {
        data: imageFile.buffer.toString('base64'),
        contentType: imageFile.mimetype
      };

      if (!process.env.CLOUDINARY_API_KEY) {
        // Silently fallback to MongoDB Base64 Storage
        imagePayload = base64Fallback;
      } else {
        try {
          console.log("[Cloudinary] Starting image stream upload...");
          const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream((error, result) => {
              if (error) reject(error);
              else resolve(result);
            }).end(imageFile.buffer);
          });
          imagePayload = result.secure_url;
          console.log("[Cloudinary] Upload successful! URL:", imagePayload);
        } catch (uploadErr) {
          console.error("[Cloudinary] Critical Upload Failure, falling back to MongoDB Base64:", uploadErr);
          imagePayload = base64Fallback;
        }
      }
    } else {
      console.log("[Lost & Found POST] No image attached.");
    }

    // Applying mapping to make their exact code work with existing schema
    const item = new LostFound({
      user_id: req.session ? req.session.userId : req.userId,
      item_name: req.body.description || "Unknown",
      type: req.body.type,
      description: req.body.description,
      location: req.body.location,
      details: req.body.details,
      image: imagePayload,
      status: 'Open'
    });

    await item.save();

    res.status(200).json(item);
  } catch (err) {
    console.error("Lost&Found error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post('/api/match-image', requireAuth, async (req, res) => {
  const { id } = req.body;
  try {
    const item = await LostFound.findById(id);
    if (!item) return res.status(404).json({ error: 'Item not found.' });
    const oppositeType = item.type === 'Lost' ? 'Found' : 'Lost';
    const candidates = await LostFound.find({
      type: oppositeType,
      status: 'Open',
      _id: { $ne: item._id }
    });

    const validCandidates = candidates.filter(c => c.embedding && c.embedding.length > 0);

    let aiData = { matches: [] };

    if (AI_URL && item.embedding && item.embedding.length > 0 && validCandidates.length > 0) {
      const reqBody = {
        source_embedding: item.embedding,
        candidates: validCandidates.map(c => ({ id: c._id.toString(), embedding: c.embedding }))
      };

      try {
        console.log("Calling AI similarity...");
        const aiRes = await fetch(AI_URL + "/similarity", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
          signal: AbortSignal.timeout(30000)
        });
        if (aiRes.ok) {
          aiData = await aiRes.json();
        } else {
          throw new Error("AI Service status " + aiRes.status);
        }
      } catch (err) {
        console.log("AI unavailable, skipping matching");
      }
    }

    // AI service already filters at >= 0.85; keep all returned matches
    if (!aiData || !aiData.matches) {
      aiData = { matches: [] };
    }

    const matchDetails = [];
    if (aiData && aiData.matches) {
      for (const m of aiData.matches) {
        let candDoc = candidates.find(c => c._id.toString() === m.id);
        if (candDoc) {
          const owner = await User.findById(candDoc.user_id);
          matchDetails.push({
            id: candDoc._id,
            item_name: candDoc.item_name,
            description: candDoc.description,
            location: candDoc.location,
            type: candDoc.type,
            score: m.score,
            image_url: candDoc.image ? (typeof candDoc.image === 'string' ? candDoc.image : `data:${candDoc.image.contentType};base64,${candDoc.image.data}`) : null,
            user_name: owner?.name,
            user_email: owner?.email
          });
        }
      }
    }
    const sourceImageUrl = item.image ? (typeof item.image === 'string' ? item.image : `data:${item.image.contentType};base64,${item.image.data}`) : null;
    res.json({ matches: matchDetails, source_image_url: sourceImageUrl });
  } catch (err) {
    console.error("Match error:", err);
    res.status(500).json({ error: 'Failed to find matches.' });
  }
});

app.post('/api/confirm-match', requireAuth, async (req, res) => {
  const { source_id, target_id } = req.body;
  try {
    const source = await LostFound.findById(source_id);
    const target = await LostFound.findById(target_id);
    if (!source || !target) return res.status(404).json({ error: 'Item not found.' });

    source.status = 'Closed';
    source.matched_id = target._id;
    target.status = 'Closed';
    target.matched_id = source._id;

    await source.save();
    await target.save();

    // Send emails
    const sOwner = await User.findById(source.user_id);
    const tOwner = await User.findById(target.user_id);

    const sendMatchEmails = (user, item, matchedItemTitle) => {
      if (!user?.email) return;
      if (item.type === 'Lost') {
        sendEmail(
          user.email,
          "Your lost item has been found",
          emailTemplate("Match Confirmed", "#10b981", `Hello ${user.name},<br><br>Good news! Your lost item '${item.item_name}' has been matched with a found item.<br><br>Please check your dashboard for details.<br><br>- Smart Stay`)
        );
      } else {
        sendEmail(
          user.email,
          "Match confirmed for found item",
          emailTemplate("Match Confirmed", "#10b981", `Hello ${user.name},<br><br>The item you reported has been successfully matched with a lost report and the case is now closed.<br><br>- Smart Stay`)
        );
      }
    };

    sendMatchEmails(sOwner, source, target.item_name);
    sendMatchEmails(tOwner, target, source.item_name);

    res.json({ success: true, message: 'Match confirmed and cases closed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm match.' });
  }
});

app.get('/api/lost-found', requireAuth, async (req, res) => {
  try {
    const items = await LostFound.find().sort({ created_at: -1 }).lean();
    const userIds = [...new Set(items.map(i => i.user_id))];
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u._id] = u; });
    const result = items.map(i => ({
      ...i, id: i._id,
      user_name: userMap[i.user_id]?.name || '—',
      user_phone: userMap[i.user_id]?.phone || '',
      user_owner_id: i.user_id
    }));
    res.json({ items: result });
  } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.patch('/api/lost-found/:id', requireAuth, async (req, res) => {
  const { status } = req.body;
  try {
    if (req.session.userRole === 'admin') {
      await LostFound.findByIdAndUpdate(req.params.id, { status });
    } else {
      await LostFound.findOneAndUpdate({ _id: req.params.id, user_id: req.session.userId }, { status });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Update failed.' }); }
});

// ════════════════════════════════════════════════════════════════════
// ADMIN STATS
// ════════════════════════════════════════════════════════════════════

app.get('/api/admin/stats', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') return res.status(403).json({ error: 'Admin only.' });
  try {
    const [students, totalRequests, pendingRequests, totalBookings, openLostFound] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      ServiceRequest.countDocuments(),
      ServiceRequest.countDocuments({ status: 'Pending' }),
      Booking.countDocuments(),
      LostFound.countDocuments({ status: 'Open' })
    ]);
    res.json({ stats: { students, totalRequests, pendingRequests, totalBookings, openLostFound } });
  } catch (err) { res.status(500).json({ error: 'Stats error.' }); }
});

// ════════════════════════════════════════════════════════════════════
// BACKGROUND JOBS
// ════════════════════════════════════════════════════════════════════

setInterval(async () => {
  try {
    const confirmedBookings = await Booking.find({ status: 'Confirmed' });
    const now = new Date();

    for (const bk of confirmedBookings) {
      if (!bk.time_slot || !bk.date) continue;
      // time_slot format e.g., "09:00 AM - 10:00 AM"
      const timeParts = bk.time_slot.split('-');
      if (timeParts.length < 2) continue;
      const endTimeStr = timeParts[1].trim(); 
      // Parse endTimeStr + bk.date into Date
      const dateStr = bk.date; // "yyyy-mm-dd"
      const dt = new Date(`${dateStr} ${endTimeStr}`);

      // If valid date and current time > end time + 15 mins
      if (!isNaN(dt.getTime())) {
        const threshold = new Date(dt.getTime() + 15 * 60 * 1000);
        if (now > threshold) {
          bk.status = 'No-Show';
          await bk.save();

          const user = await User.findById(bk.user_id);
          if (user) {
            if (user.role === 'admin') continue;
            if (user.rating === undefined) { user.rating = 5.0; user.totalBookings = 0; user.cancelledBookings = 0; user.noShows = 0; user.isBlocked = false; }
            user.noShows = (user.noShows || 0) + 1;
            user.rating -= 1.0;
            if (user.rating < 0) user.rating = 0;
            if (user.rating < 3.0) user.isBlocked = true;
            await user.save();
          }
        }
      }
    }
  } catch (err) {
    console.error("No-Show Cron Error:", err);
  }
}, 15 * 60 * 1000); // Run every 15 minutes

// ── Auto-open browser & Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nSmart Stay running at http://localhost:${PORT}`);
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Mail: ${process.env.EMAIL_USER}`);
  console.log(`MongoDB: ${uri}\n`);

  if (process.env.NODE_ENV !== 'production') {
    const { exec } = require('child_process');
    const url = `http://localhost:${PORT}`;
    const cmd = process.platform === 'win32' ? `start ${url}`
      : process.platform === 'darwin' ? `open ${url}`
        : `xdg-open ${url}`;
    exec(cmd, () => { });
  }
});

// KEEP-ALIVE for Render
setInterval(() => {
  fetch("https://smart-stay-0gxx.onrender.com").catch(err => console.error("Keep-Alive ping error:", err.message));
}, 5 * 60 * 1000);
