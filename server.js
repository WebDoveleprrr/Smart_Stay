require('dotenv').config({ override: true });
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://bikkinarohitchowdary_db_user:Rohit%401234@cluster0.n1qszgd.mongodb.net/smartstay';

// ── Admin Credentials ─────────────────────────────────────────────
const ADMIN_EMAIL = 'bikkinarohitchowdary@gmail.com';
const ADMIN_PASSWORD = 'Rohit@1234';

function sendMail(to, subject, textContent, attachments = [], status = null) {
  let statusHtml = '';
  if (status) {
    statusHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; background: #f9fafb; padding: 10px; border-radius: 6px;">
      <tr>
        <td style="width: 100px;"><strong>Status:</strong></td>
        <td style="color:${status === 'Closed' ? 'green' : 'orange'}; font-weight: bold;">
          ${status}
        </td>
      </tr>
    </table>`;
  }

  const htmlContent = `
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px; font-family: 'Inter', Helvetica, Arial, sans-serif;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <tr>
          <td style="background: linear-gradient(135deg, #f97316, #10b981, #3b82f6); padding: 24px; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Smart Stay System</h2>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px; color: #374151; font-size: 15px; line-height: 1.6;">
            ${textContent.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>')}
            ${statusHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #e2e8f0;">
            This is an automated email from Smart Stay.<br>Please do not reply.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const msg = {
    to,
    from: {
      name: 'Smart Stay',
      email: process.env.EMAIL_USER || "brohitchowdary5@gmail.com"
    },
    subject,
    text: textContent + '\n\nThis is an automated email from Smart Stay',
    html: htmlContent,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
      openTracking: { enable: false }
    }
  };

  if (attachments && attachments.length > 0) {
    msg.attachments = attachments;
  }

  setImmediate(() => {
    sgMail.send(msg)
      .then(() => console.log(`📧 Email sent to ${to}`))
      .catch(err => console.error("❌ ERROR:", err.response?.body || err.message));
  });
}

// ── Middleware ────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(uploadsDir));

// ── MongoDB Connection ────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    seedAdmin();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('👉 Make sure MongoDB is running: mongod');
    process.exit(1);
  });

// ── Session (stored in MongoDB) ───────────────────────────────────
app.use(session({
  secret: 'smartstay_secret_2024_hostel',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI, ttl: 86400 }),
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

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
  status: { type: String, default: 'Confirmed' },
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
  image: { data: String, contentType: String },
  status: { type: String, default: 'Open' },
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
      console.log(`✅ Admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log(`✅ Admin exists: ${ADMIN_EMAIL}`);
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
    sendMail(user.email, "Welcome to Smart Stay",
      `Hello ${user.name},

Your account has been created successfully.
You can now login.

- Smart Stay`);

    sendMail(ADMIN_EMAIL, "New User Registered",
      `New user registered:

Name: ${user.name}
Email: ${user.email}
Block: ${user.block}
Room: ${user.room}
Phone: ${user.phone}

- Smart Stay`);

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
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

    // ADMIN BYPASS OTP — direct login
    if (user.role === 'admin') {
      req.session.userId = user._id;
      req.session.userName = user.name;
      req.session.userRole = user.role;
      req.session.verified = true;
      return res.json({ success: true, name: user.name, role: user.role, message: 'Admin login successful' });
    }

    // NORMAL USER → OTP FLOW
    const otp = generateOTP();
    const expires = Date.now() + 5 * 60 * 1000;
    await User.findByIdAndUpdate(user._id, { otp, otp_expires: expires });
    req.session.pendingUserId = user._id.toString();

    sendMail(user.email, "Smart Stay Login Code",
      `Hello ${user.name || 'User'},

Your login code is: ${otp}

Valid for 5 minutes.
If not you, ignore.

- Smart Stay`);

    // Admin OTP removed per user request
    console.log(`\n🔐 OTP for ${user.email}: ${otp}\n`);
    res.json({ success: true, message: 'OTP sent to your registered email! Check your inbox.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login error.' });
  }
});

// VERIFY OTP
app.post('/api/verify-otp', async (req, res) => {
  const { otp } = req.body;
  if (!req.session.pendingUserId) return res.status(400).json({ error: 'No pending login.' });
  try {
    const user = await User.findById(req.session.pendingUserId);
    if (!user) return res.status(500).json({ error: 'Session error.' });
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
    res.json({ success: true, name: user.name, role: user.role });
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

    user.otp = generateOTP();
    user.otp_expires = Date.now() + 5 * 60 * 1000;

    await user.save();

    sendMail(user.email, "Smart Stay Login Verification Code",
      `Hello ${user.name || 'User'},

You requested a new login code.

Verification Code:
${user.otp}

This code is valid for 5 minutes.
If this was not you, please ignore.

- Smart Stay`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend OTP.' });
  }
});

app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/session', (req, res) => {
  if (req.session?.userId && req.session?.verified)
    res.json({ loggedIn: true, name: req.session.userName, role: req.session.userRole, userId: req.session.userId });
  else res.json({ loggedIn: false });
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).select('-password_hash -otp -otp_expires');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user: { id: user._id, name: user.name, email: user.email, room: user.room, block: user.block, phone: user.phone, role: user.role, created_at: user.created_at } });
  } catch (err) { res.status(500).json({ error: 'Error fetching profile.' }); }
});

// ════════════════════════════════════════════════════════════════════
// SERVICE REQUESTS
// ════════════════════════════════════════════════════════════════════

app.post('/api/services', requireAuth, async (req, res) => {
  const { category, description, priority } = req.body;
  if (!category) return res.status(400).json({ error: 'Category required.' });
  try {
    const user = await User.findById(req.session.userId);
    const svc = await ServiceRequest.create({
      user_id: req.session.userId,
      category,
      description: description || '',
      priority: priority || 'Normal',
      block: user?.block || '',
      room: user?.room || ''
    });

    if (user?.email) {
      sendMail(user.email, "Service Request Received",
        `Hello ${user.name},

Your service request has been submitted.

Category: ${category}
Description: ${description}
Priority: ${priority}

We will resolve it soon.

- Smart Stay`);

      sendMail(ADMIN_EMAIL, "New Service Request",
        `User: ${user.name}
Email: ${user.email}
Category: ${category}
Priority: ${priority}
Description: ${description}

- Smart Stay`);
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
    await ServiceRequest.findByIdAndUpdate(req.params.id, { status, updated_at: Math.floor(Date.now() / 1000) });
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
    const existing = await Booking.findOne({ facility, date, time_slot, status: 'Confirmed' });
    if (existing) return res.status(409).json({ error: 'This slot is already booked. Choose another time.' });

    const booking = await Booking.create({ user_id: req.session.userId, facility, date, time_slot });

    const user = await User.findById(req.session.userId);
    if (user?.email) {
      sendMail(user.email, "Booking Confirmed",
        `Hello ${user.name},

Your booking has been confirmed.

Facility: ${facility}
Date: ${date}
Time: ${time_slot}

- Smart Stay`);

      sendMail(ADMIN_EMAIL, "New Booking",
        `User: ${user.name}
Email: ${user.email}
Facility: ${facility}
Date: ${date}
Time: ${time_slot}

- Smart Stay`);
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
      bookings = bks.map(b => ({ ...b, id: b._id, user_name: userMap[b.user_id]?.name || '—' }));
    } else {
      const bks = await Booking.find({ user_id: req.session.userId }).sort({ date: -1 }).lean();
      bookings = bks.map(b => ({ ...b, id: b._id }));
    }
    res.json({ bookings });
  } catch (err) { res.status(500).json({ error: 'DB error.' }); }
});

app.delete('/api/bookings/:id', requireAuth, async (req, res) => {
  try {
    if (req.session.userRole === 'admin') {
      await Booking.findByIdAndDelete(req.params.id);
    } else {
      await Booking.findOneAndDelete({ _id: req.params.id, user_id: req.session.userId });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Delete failed.' }); }
});

// ════════════════════════════════════════════════════════════════════
// LOST & FOUND
// ════════════════════════════════════════════════════════════════════

app.post('/api/lost-found', requireAuth, (req, res) => {
  upload.single('image')(req, res, async err => {
    if (err) return res.status(400).json({ error: err.message });
    const { type, item_name, description, location } = req.body;
    if (!type || !item_name) return res.status(400).json({ error: 'Type and item name required.' });
    try {
      let item = await LostFound.create({
        user_id: req.session.userId,
        type,
        item_name,
        description: description || '',
        location: location || '',
        image: req.file ? {
          data: req.file.buffer.toString("base64"),
          contentType: req.file.mimetype
        } : null,
        status: 'Open'
      });

      // AUTO-CLOSE LOGIC: Match Lost & Found dynamically via Candidate Scoring
      const oppositeType = type === 'Lost' ? 'Found' : 'Lost';
      const candidates = await LostFound.find({
        type: oppositeType,
        item_name: new RegExp('^' + item_name + '$', 'i'),
        status: { $ne: 'Closed' }
      });

      if (candidates.length > 0) {
        let bestCandidate = null;
        let maxScore = -1;
        for (const c of candidates) {
          let score = 0;
          if (c.image) score += 2; // Stronger match if photo exists
          if (description && c.description) {
            const descWords1 = description.toLowerCase().split(/\s+/);
            const descWords2 = c.description.toLowerCase().split(/\s+/);
            const common = descWords1.filter(w => descWords2.includes(w) && w.length > 2);
            score += common.length; // +1 score for each overlapping descriptive keyword
          }
          if (location && c.location) {
            const locWords1 = location.toLowerCase().split(/\s+/);
            const locWords2 = c.location.toLowerCase().split(/\s+/);
            const commonLoc = locWords1.filter(w => locWords2.includes(w) && w.length > 2);
            score += commonLoc.length * 2; // +2 score for matching location words
          }
          if (score > maxScore) {
            maxScore = score;
            bestCandidate = c;
          }
        }
        if (bestCandidate) {
          bestCandidate.status = 'Closed';
          bestCandidate.matched_id = item._id.toString();
          await bestCandidate.save();
          item.status = 'Closed';
          item.matched_id = bestCandidate._id.toString();

          // Send email to the matched user
          try {
            const candidateUser = await User.findById(bestCandidate.user_id);
            if (candidateUser && candidateUser.email) {
              sendMail(
                candidateUser.email,
                "Match Found for Your Item",
                `Hello ${candidateUser.name},\n\nGreat news! A match was found for your reported ${bestCandidate.type.toLowerCase()} item: ${bestCandidate.item_name}.\n\nThe status has been updated. Please check the portal.`,
                [],
                bestCandidate.status
              );
            }
          } catch (err) {
            console.error('Error sending match email:', err);
          }
        }
      }
      await item.save();

      const user = await User.findById(req.session.userId);
      if (user?.email) {
        let attachments = [];
        if (req.file) {
          try {
            const base64Str = req.file.buffer.toString("base64");
            attachments.push({
              content: base64Str,
              filename: req.file.originalname,
              type: req.file.mimetype,
              disposition: "attachment"
            });
          } catch (e) {
            console.error("Attachment err:", e);
          }
        }

        const isLost = type === 'Lost';

        sendMail(user.email, isLost ? "Lost Item Report Submitted" : "Found Item Submitted",
          `Hello ${user.name},

Your ${isLost ? "lost item report" : "found item report"} has been submitted.

Item: ${item_name}
Description: ${description}
Location: ${location || "Not specified"}

- Smart Stay`, attachments, item.status);

        sendMail(ADMIN_EMAIL, "Lost/Found Report",
          `User: ${user.name}
Email: ${user.email}
Type: ${type}
Item: ${item_name}
Location: ${location}
Description: ${description}

- Smart Stay`, attachments, item.status);

      }
      res.json({ success: true, message: 'Report posted! Confirmation email sent.', id: item._id });
    } catch (err) { res.status(500).json({ error: 'Failed to post.' }); }
  });
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

// ── Auto-open browser & Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏨 Smart Stay running at http://localhost:${PORT}`);
  console.log(`👤 Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`📧 Mail: ${process.env.EMAIL_USER}`);
  console.log(`🍃 MongoDB: ${MONGO_URI}\n`);

  const { exec } = require('child_process');
  const url = `http://localhost:${PORT}`;
  const cmd = process.platform === 'win32' ? `start ${url}`
    : process.platform === 'darwin' ? `open ${url}`
      : `xdg-open ${url}`;
  exec(cmd, err => { if (err) console.log(`Open browser manually: ${url}`); });
});
