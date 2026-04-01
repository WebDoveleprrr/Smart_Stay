═══════════════════════════════════════════════════════════════
🏨 SMART STAY — Hostel Management System v4.0
   MongoDB Edition — Complete Setup & Deployment Guide
═══════════════════════════════════════════════════════════════

ADMIN LOGIN:
  Email:    bikkinarohitchowdary@gmail.com
  Password: Rohit@1234
  (Admin skips OTP — direct login)

═══════════════════════════════════════════════════════════════
PART 1 — RUN LOCALLY ON YOUR PC
═══════════════════════════════════════════════════════════════

STEP 1 — Install Node.js
  → Go to: https://nodejs.org
  → Download LTS version → Install it
  → Verify: open terminal, type:  node --version

STEP 2 — Install MongoDB locally
  → Go to: https://www.mongodb.com/try/download/community
  → Download "MongoDB Community Server" for Windows
  → Install with default settings
  → After install, MongoDB runs automatically as a service
  → Verify: open terminal, type:  mongod --version

STEP 3 — Open project in VS Code
  → Open VS Code
  → File → Open Folder → Select this SmartStay folder

STEP 4 — Install Node packages
  → Press Ctrl+` to open terminal in VS Code
  → Type:
      npm install
  → Wait for it to finish

STEP 5 — Start the server
  → In terminal type:
      node server.js
  → Browser opens automatically at http://localhost:3000
  → You will see the REGISTER page by default
  → Admin login: bikkinarohitchowdary@gmail.com / Rohit@1234

STEP 6 — Stop the server
  → Press Ctrl+C in terminal

═══════════════════════════════════════════════════════════════
PART 2 — DEPLOY TO INTERNET (Free hosting on Railway)
═══════════════════════════════════════════════════════════════

--- PREPARE MONGODB ATLAS (Free cloud database) ---

STEP A — Create MongoDB Atlas account
  1. Go to: https://mongodb.com/atlas
  2. Click "Try Free" → Sign up with Google
  3. Choose "Free" tier (M0 Sandbox)
  4. Choose region closest to India (e.g. Mumbai)
  5. Click "Create Deployment"

STEP B — Set up database access
  1. In Atlas dashboard → left panel → "Database Access"
  2. Click "Add New Database User"
  3. Username: smartstay
  4. Password: (click "Autogenerate" and COPY it!)
  5. Role: "Read and write to any database"
  6. Click "Add User"

STEP C — Allow all IP addresses (required for Railway)
  1. Left panel → "Network Access"
  2. Click "Add IP Address"
  3. Click "Allow Access From Anywhere" (adds 0.0.0.0/0)
  4. Click "Confirm"

STEP D — Get your connection string
  1. Left panel → "Clusters" → Click "Connect"
  2. Choose "Connect your application"
  3. Driver: Node.js, Version: 5.5 or later
  4. Copy the connection string. It looks like:
     mongodb+srv://smartstay:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
  5. Replace <password> with your actual password from Step B
  6. Add database name before the ? like this:
     mongodb+srv://smartstay:YOURPASS@cluster0.xxxxx.mongodb.net/smartstay?retryWrites=true&w=majority
  7. SAVE THIS STRING — you'll need it in Railway

--- UPLOAD CODE TO GITHUB ---

STEP E — Create GitHub account
  1. Go to: https://github.com
  2. Sign up for free

STEP F — Create a new repository
  1. Click + button (top right) → "New repository"
  2. Name it: smartstay
  3. Set to Public
  4. Click "Create repository"

STEP G — Upload your files to GitHub
  Option 1 — Using VS Code (easiest):
    1. In VS Code, open terminal
    2. Type these commands one by one:
         git init
         git add .
         git commit -m "Smart Stay v4"
         git branch -M main
         git remote add origin https://github.com/YOURUSERNAME/smartstay.git
         git push -u origin main
    (Replace YOURUSERNAME with your GitHub username)

  Option 2 — Drag & Drop:
    1. Open your repo on github.com
    2. Click "uploading an existing file"
    3. Drag all your project files
    4. Click "Commit changes"

--- DEPLOY ON RAILWAY ---

STEP H — Create Railway account
  1. Go to: https://railway.app
  2. Click "Login" → "Login with GitHub"
  3. Authorize Railway

STEP I — Create new project
  1. Click "New Project"
  2. Choose "Deploy from GitHub repo"
  3. Select your "smartstay" repository
  4. Railway will start deploying automatically

STEP J — Add environment variables in Railway
  1. Click on your deployed service
  2. Click "Variables" tab
  3. Click "Add Variable" and add these one by one:

     Variable Name    │ Value
     ─────────────────┼────────────────────────────────────────
     MONGO_URI        │ (paste your Atlas connection string)
     MAIL_USER        │ brohitchowdary5@gmail.com
     MAIL_PASS        │ nifbnpouacvmxuot
     PORT             │ 3000

  4. After adding all variables, Railway redeploys automatically

STEP K — Get your live URL
  1. Click "Settings" tab in Railway
  2. Under "Networking" → click "Generate Domain"
  3. You get a URL like: https://smartstay-production.up.railway.app
  4. That's your live website! Share it with anyone.

═══════════════════════════════════════════════════════════════
PART 3 — ALTERNATIVE FREE DEPLOYMENT: Render.com
═══════════════════════════════════════════════════════════════

STEP 1 — Go to: https://render.com → Sign up with GitHub

STEP 2 — Click "New +" → "Web Service"

STEP 3 — Connect your GitHub repo → Select "smartstay"

STEP 4 — Fill in settings:
  Name:           smartstay
  Runtime:        Node
  Build Command:  npm install
  Start Command:  node server.js

STEP 5 — Scroll down to "Environment Variables", add:
  MONGO_URI   = (your Atlas connection string)
  MAIL_USER   = brohitchowdary5@gmail.com
  MAIL_PASS   = nifbnpouacvmxuot

STEP 6 — Click "Create Web Service"
  → Wait ~3 minutes for deployment
  → You get a URL like: https://smartstay.onrender.com

NOTE: Render free tier sleeps after 15 minutes inactivity.
      First load after sleep takes ~30 seconds. Railway is faster.

═══════════════════════════════════════════════════════════════
PART 4 — RUNNING ON ANOTHER DEVICE (Friend's PC / Lab PC)
═══════════════════════════════════════════════════════════════

STEP 1 — Copy the SmartStay folder to that device
  (USB drive, Google Drive, etc.)

STEP 2 — Install Node.js on that device
  → https://nodejs.org → LTS version

STEP 3 — Install MongoDB on that device
  → https://mongodb.com/try/download/community

STEP 4 — Open terminal in the SmartStay folder
  → Right-click in folder → "Open in Terminal"
  → Type:  npm install

STEP 5 — Start the server
  → Type:  node server.js
  → Open browser: http://localhost:3000

═══════════════════════════════════════════════════════════════
TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

Problem: "Cannot connect to MongoDB"
Solution: Make sure MongoDB service is running
  Windows: Press Win+R → type "services.msc" → find "MongoDB Server" → Start it
  OR in terminal: net start MongoDB

Problem: "Port 3000 already in use"
Solution: Change PORT in server.js from 3000 to 3001 or 4000

Problem: "npm not found"
Solution: Node.js not installed. Go to nodejs.org and install.

Problem: OTP email not received
Solution: Check your Gmail App Password is correct in server.js
  Go to: myaccount.google.com/apppasswords to create/reset it

Problem: Railway deployment failed
Solution: Check the "Logs" tab in Railway for the error message

═══════════════════════════════════════════════════════════════
WHAT'S NEW IN v4.0
═══════════════════════════════════════════════════════════════

✅ MongoDB replaces SQLite (cloud-ready database)
✅ Register page shown by default when you open the site
✅ Enter key moves to next field on ALL fields (login + register)
✅ Admin credentials: bikkinarohitchowdary@gmail.com / Rohit@1234
✅ Admin skips OTP — direct login
✅ Sessions stored in MongoDB (persist across server restarts)
✅ All previous features retained:
   - OTP sent to real Gmail
   - Show/hide password toggle
   - Arrow keys navigate Block ↔ Room
   - Email confirmations for registration, service requests,
     facility bookings, lost/found reports
   - 3 stat cards in overview (no Pending card)
   - Recent Activity shows both Requests + Bookings sections
═══════════════════════════════════════════════════════════════
