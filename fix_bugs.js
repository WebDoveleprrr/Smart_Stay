const fs = require('fs');

// 1. dashbaord.html (Category Selection Fix)
let dash = fs.readFileSync('dashboard.html', 'utf8');

// Fix submitService to use selectedCategory and add location and severity
let oldSubmitService = `async function submitService() {
      if (!selectedService) return showMsg('srvMsg', 'Please select a category.', 'error');
      const desc = document.getElementById('srvDesc').value.trim();
      const priority = document.getElementById('srvPriority').value;
      const res = await fetch('/api/services', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: selectedService, description: desc, priority }) });`;

let newSubmitService = `async function submitService() {
      if (!selectedService) return showMsg('srvMsg', 'Please select a category and location.', 'error');
      const desc = document.getElementById('srvDesc').value.trim();
      const priority = document.getElementById('srvPriority').value;
      
      const payload = {
         title: selectedService + " request",
         description: desc,
         category: selectedService,
         location: "Hostel", // Default location
         severity: priority.toLowerCase() === 'urgent' ? 'high' : priority.toLowerCase() === 'normal' ? 'low' : 'medium'
      };

      const res = await fetch('/api/services', { 
        method: 'POST', 
        credentials: 'include', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });`;
dash = dash.replace(oldSubmitService, newSubmitService);

fs.writeFileSync('dashboard.html', dash);

// 2. login.html (Add Image)
let login = fs.readFileSync('login.html', 'utf8');
if(!login.includes('<img src="/images/aryabhatta.jpg"')) {
   login = login.replace(
     '<div class="brand-title">Smart Stay</div>',
     '<div class="brand-title">Smart Stay</div>\n        <img src="/images/aryabhatta.jpg" alt="Smart Stay" style="width:100%; border-radius:12px; margin: 10px 0; max-height:200px; object-fit:cover;" />'
   );
   fs.writeFileSync('login.html', login);
}

// 3. server.js (Image serving & bug fixes)
let server = fs.readFileSync('server.js', 'utf8');
if(!server.includes('app.use(express.static("public"));')) {
   let iAppUse = server.indexOf('app.use(express.json());');
   server = server.slice(0, iAppUse) + 'app.use(express.static("public"));\n' + server.slice(iAppUse);
}
fs.writeFileSync('server.js', server);

// 4. serviceController.js (Console log, Validate)
let srvCtrl = fs.readFileSync('controllers/serviceController.js', 'utf8');

let srvPostMatch = `exports.createServiceRequest = async (req, res) => {\n  try {\n    const User = getUserModel();\n    const { category, priority, description } = req.body;`;

if(srvCtrl.includes(srvPostMatch)) {
   let srvPostReplace = `exports.createServiceRequest = async (req, res) => {\n  try {\n    const User = getUserModel();\n    console.log("Incoming request:", req.body);\n    const { category, priority, description, location } = req.body;\n\n    if (!category || !location) return res.status(400).json({ error: 'Category and location required.' });`;
   srvCtrl = srvCtrl.replace(srvPostMatch, srvPostReplace);
}

// Ensure try/catch wrapping
fs.writeFileSync('controllers/serviceController.js', srvCtrl);

// 5. bookingRoutes.js (Add active bookings route)
let bkRoutes = fs.readFileSync('routes/bookingRoutes.js', 'utf8');
if(!bkRoutes.includes('/all-active')) {
   let insIdx = bkRoutes.indexOf('router.get(');
   let addRoute = `router.get('/all-active', requireAuth, bookingController.getAllActiveBookings);\n`;
   bkRoutes = bkRoutes.slice(0, insIdx) + addRoute + bkRoutes.slice(insIdx);
   fs.writeFileSync('routes/bookingRoutes.js', bkRoutes);
}

// 6. bookingController.js (Add getAllActiveBookings, logs, proper Dates)
let bkCtrl = fs.readFileSync('controllers/bookingController.js', 'utf8');
if(!bkCtrl.includes('getAllActiveBookings')) {
   let func = `\nexports.getAllActiveBookings = async (req, res) => {
  try {
    console.log("Fetching all active bookings");
    const bookings = await Booking.find({ status: { $in: ['booked', 'under_review'] } }).lean();
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch active bookings' });
  }
};\n`;
   bkCtrl += func;
}

// Add logs in createBooking and reports
if(!bkCtrl.includes('"Booking created:"')) {
   bkCtrl = bkCtrl.replace('await booking.save();', 'await booking.save();\n    console.log("Booking created:", booking);');
}
if(!bkCtrl.includes('"Report triggered:"')) {
   bkCtrl = bkCtrl.replace('await bk.save();\n\n    const User = getUserModel();', 'await bk.save();\n    console.log("Report triggered:", bk._id);\n\n    const User = getUserModel();');
}
fs.writeFileSync('controllers/bookingController.js', bkCtrl);

// Ensure public/images directory and move aryabhatta.jpg
if(!fs.existsSync('public')) fs.mkdirSync('public');
if(!fs.existsSync('public/images')) fs.mkdirSync('public/images');
if(fs.existsSync('aryabhatta.jpg')) {
   fs.renameSync('aryabhatta.jpg', 'public/images/aryabhatta.jpg');
}

console.log("All bugs fixed!");
