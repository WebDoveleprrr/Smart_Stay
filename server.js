require('dotenv').config();
const { sendEmail, emailTemplate } = require('./utils/mailer');
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
require('./utils/cronJobs');
const { v2: cloudinary } = require('cloudinary');

const ServiceRequest = require('./models/ServiceRequest');
const Booking = require('./models/Booking');
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


// ── Middleware ────────────────────────────────────────────────────
app.use(cors({
  origin: true, // dynamically reflects origin
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.set('trust proxy', 1);
app.use(express.static("public"));
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

// Booking and ServiceRequest schemas are imported from /models

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
    await sendEmail(user.email, "Welcome to Smart Stay", emailTemplate(
      "Welcome to Smart Stay",
      "#2F5D8C",
      `Hello ${user.name},<br><br>Your account has been created successfully.<br>You can now login.<br><br>- Smart Stay`
    ));

    await sendEmail(ADMIN_EMAIL, "New User Registered", emailTemplate(
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

    req.session.save(async (err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      await sendEmail(user.email, "Smart Stay Login Code", emailTemplate(
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

    await sendEmail(user.email, "Smart Stay Login Verification Code", emailTemplate(
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
// MODULAR ROUTES - SERVICE REQUESTS & BOOKINGS
// ════════════════════════════════════════════════════════════════════
app.use('/api/services', requireAuth, require('./routes/serviceRoutes'));
app.use('/api/bookings', requireAuth, require('./routes/bookingRoutes'));
// PATCH /api/services/:id  — update service request status (admin)
app.patch('/api/services/:id', requireAuth, async (req, res) => {
  if (req.session.userRole !== 'admin') {
    return res.status(403).json({ error: 'Admin only.' });
  }

  const { status } = req.body;

  // Maps UI display values → DB enum values (ServiceRequest schema uses lowercase)
  const statusMap = {
    'Pending': 'pending',
    'In Progress': 'in_progress',
    'Resolved': 'completed',
    'Escalated': 'escalated'
  };

  const dbStatus = statusMap[status];
  if (!dbStatus) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${Object.keys(statusMap).join(', ')}` });
  }

  try {
    const updated = await ServiceRequest.findByIdAndUpdate(
      req.params.id,
      { status: dbStatus, updated_at: Math.floor(Date.now() / 1000) },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Service request not found.' });
    const mongoose = require('mongoose');
    const User = mongoose.model('User');
    const reqCreator = await User.findById(updated.user_id);
    if (reqCreator) {
      await sendEmail(
        reqCreator.email,
        'Request Status Updated',
        emailTemplate(
          'Status Update',
          '#f59e0b',
          `Hello ${reqCreator.name},<br><br>Your <b>${updated.category}</b> request status has been updated to <b>${status}</b>.`
        )
      );
    }
    res.json({ success: true, request: updated });
  } catch (err) {
    console.error('Service status update error:', err);
    res.status(500).json({ error: 'Update failed.' });
  }
});

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

// ════════════════════════════════════════════════════════════════════
// LOST & FOUND
// ════════════════════════════════════════════════════════════════════

// Use upload.any() to flexibly handle FormData regardless of field name mismatch
app.post("/api/lost-found", requireAuth, upload.any(), async (req, res) => {
  console.log(`[Lost & Found POST] Request from ${req.session.userId}`);
  console.log(`[Lost & Found POST] Body:`, req.body);

  const type = req.body.type;
  const description = req.body.description;
  const location = req.body.location;

  if (!description || !location || !type || !['Lost', 'Found'].includes(type)) {
    return res.status(400).json({ error: "Missing or invalid fields" });
  }

  try {
    let imagePayload = null;
    const imageFile = req.files && req.files.length > 0 ? req.files[0] : req.file;

    if (!imageFile) {
      return res.status(400).json({ error: "Image is required" });
    }

    const base64Fallback = {
      data: imageFile.buffer.toString('base64'),
      contentType: imageFile.mimetype
    };

    if (!process.env.CLOUDINARY_API_KEY) {
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

    const item = new LostFound({
      user_id: req.session.userId,
      item_name: req.body.description || "Unknown",
      type: req.body.type,
      description: req.body.description,
      location: req.body.location,
      details: req.body.details,
      image: imagePayload,
      status: 'Open'
    });

    await item.save();

    const itemObj = item.toObject();
    itemObj.id = itemObj._id;

    const owner = await User.findById(req.session.userId);
    if (owner) {
      await sendEmail(owner.email, "Item Registered", emailTemplate("Lost & Found Item Registered", "#6366f1", `Hello ${owner.name},<br><br>Your item <b>${req.body.description || 'Unknown'}</b> has been successfully registered in the system.`));

      await sendEmail(ADMIN_EMAIL || process.env.ADMIN_EMAIL || "bikkinarohitchowdary@gmail.com", "New Lost/Found Item Reoprted", emailTemplate("Lost/Found Item", "#6366f1", `A new ${req.body.type} item was reported by ${owner.name}.<br>Description: ${req.body.description || 'Unknown'}<br>Location: ${req.body.location}`));
    }

    res.status(200).json(itemObj);

    // Call AI in the background
    if (AI_URL && imagePayload) {
      setTimeout(async () => {
        try {
          let b64 = "";
          if (imagePayload.data) {
            b64 = imagePayload.data;
          } else if (typeof imagePayload === "string" && imagePayload.startsWith("http")) {
            const resp = await fetch(imagePayload);
            const buf = await resp.arrayBuffer();
            b64 = Buffer.from(buf).toString('base64');
          }
          if (b64) {
            const aiRes = await fetch(`${AI_URL}/embed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_base64: b64 }),
              signal: AbortSignal.timeout(30000)
            });
            if (aiRes.ok) {
              const data = await aiRes.json();
              if (data.embedding) {
                item.embedding = data.embedding;
                await item.save();
                console.log(`[AI] Embedding saved for item ${item._id}`);
              }
            } else {
              console.error(`[AI] /embed failed with status ${aiRes.status}`);
            }
          }
        } catch (e) {
          console.error("[AI] Error generating embedding:", e);
        }
      }, 0);
    }

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

    // On-demand embedding: if item has no embedding yet (background job still running),
    // generate it synchronously right now before attempting match
    const ensureEmbedding = async (doc) => {
      if (doc.embedding && doc.embedding.length > 0) return doc;
      if (!AI_URL || !doc.image) return doc;
      try {
        let b64 = '';
        if (doc.image.data) {
          b64 = doc.image.data;
        } else if (typeof doc.image === 'string' && doc.image.startsWith('http')) {
          const imgResp = await fetch(doc.image, { signal: AbortSignal.timeout(15000) });
          const buf = await imgResp.arrayBuffer();
          b64 = Buffer.from(buf).toString('base64');
        }
        if (!b64) return doc;
        const embedRes = await fetch(`${AI_URL}/embed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_base64: b64 }),
          signal: AbortSignal.timeout(30000)
        });
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          if (embedData.embedding) {
            doc.embedding = embedData.embedding;
            await doc.save();
            console.log(`[match-image] On-demand embedding generated for ${doc._id}`);
          }
        }
      } catch (e) {
        console.error(`[match-image] On-demand embed failed for ${doc._id}:`, e.message);
      }
      return doc;
    };

    // Ensure source item has embedding
    await ensureEmbedding(item);

    // Ensure all candidates have embeddings in parallel for speed
    await Promise.all(candidates.map(c => ensureEmbedding(c)));

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

    const sendMatchEmails = async (user, item, matchedItemTitle) => {
      if (!user?.email) return;
      if (item.type === 'Lost') {
        await sendEmail(
          user.email,
          "Your lost item has been found",
          emailTemplate("Match Confirmed", "#10b981", `Hello ${user.name},<br><br>Good news! Your lost item '${item.item_name}' has been matched with a found item.<br><br>Please check your dashboard for details.<br><br>- Smart Stay`)
        );
      } else {
        await sendEmail(
          user.email,
          "Match confirmed for found item",
          emailTemplate("Match Confirmed", "#10b981", `Hello ${user.name},<br><br>The item you reported has been successfully matched with a lost report and the case is now closed.<br><br>- Smart Stay`)
        );
      }
    };

    sendMatchEmails(sOwner, source, target.item_name);
    sendMatchEmails(tOwner, target, source.item_name);

    await sendEmail(ADMIN_EMAIL || process.env.ADMIN_EMAIL || "bikkinarohitchowdary@gmail.com", "Match Confirmed", emailTemplate("Lost/Found Match", "#6366f1", `A match was successfully confirmed between item ${source.item_name} and ${target.item_name}.`));

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
