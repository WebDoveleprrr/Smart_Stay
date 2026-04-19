const fs = require('fs');

// 1. UPDATE SERVER.JS
let server = fs.readFileSync('server.js', 'utf8');

// The user highlighted body parsing as critical. I'll just remove the ones at 108-110 and place them explicitly at the top of the routes section, or just where they are.
let oldBodyParsers = `
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));`;
if (server.includes(oldBodyParsers)) {
    server = server.replace(oldBodyParsers, `app.use(express.static("public"));\napp.use(express.json());\napp.use(express.urlencoded({ extended: true }));`);
} else {
    // Force insert at the top
    server = server.replace('const app = express();\nconst PORT', 'const app = express();\napp.use(express.json());\napp.use(express.urlencoded({ extended: true }));\nconst PORT');
}

// Add awaits to sendEmail to ensure they send before the connection closes on serverless
server = server.replace(/sendEmail\(/g, 'await sendEmail(');

fs.writeFileSync('server.js', server);


// 2. UPDATE SERVICE CONTROLLER (400 Error)
let srvCtrl = fs.readFileSync('controllers/serviceController.js', 'utf8');
if (srvCtrl.includes('const { category, priority, description, location } = req.body;')) {
    // Support either priority or severity fallback
    srvCtrl = srvCtrl.replace(
        'const { category, priority, description, location } = req.body;', 
        'const { category, priority, severity, description, location } = req.body;\n    const reqPriority = priority || (severity === "high" ? "High" : severity === "low" ? "Low" : "Normal");'
    );
    // And in the object creation:
    srvCtrl = srvCtrl.replace(
        'priority: priority || \'Normal\'',
        'priority: reqPriority || \'Normal\''
    );
}
fs.writeFileSync('controllers/serviceController.js', srvCtrl);


// 3. FIX LOGIN/REGISTER HTML LAYOUT
let login = fs.readFileSync('login.html', 'utf8');

// Replace body CSS
login = login.replace(
`    body {
      font-family: 'Nunito', sans-serif;
      min-height: 100vh;
      display: flex;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #F3E6D3, #EAD7C0);
      color: #1f2937;
      overflow-x: hidden;
    }

    body::after {
      content: '';
      position: fixed;
      right: 0;
      top: 0;
      width: 50%;
      height: 100vh;
      background: linear-gradient(135deg, rgba(44, 42, 40, 0.9), rgba(60, 50, 40, 0.8));
      background-size: cover;
      background-position: center;
      z-index: 0;
    }

    .auth-container {
      width: 50%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      z-index: 1;
    }

    .form-wrapper {
      width: 100%;
      max-width: 480px;
      background: #FFFFFF;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
    }`,
`    body {
      font-family: 'Inter', sans-serif;
      margin: 0;
      padding: 0;
      color: #1f2937;
      overflow-x: hidden;
    }

    .login-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    .login-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      background: #F3E6D3;
    }

    .login-right {
      flex: 1;
      background: url('/images/aryabhatta.jpg') center/cover no-repeat;
    }

    .login-card {
      width: 100%;
      max-width: 480px;
      background: #FFFFFF;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
    }`
);

// Replace structural HTML
let htmlStructOld = `<div class="auth-container">
    <div class="form-wrapper">
      <div class="auth-header">
        <div class="brand-icon">🏨</div>
        <div class="brand-title">Smart Stay</div>
        <img src="/images/aryabhatta.jpg" alt="Smart Stay" style="width:100%; border-radius:12px; margin: 10px 0; max-height:200px; object-fit:cover;" />
        <div class="brand-subtitle">Premium Hostel Management</div>
      </div>`;

let htmlStructNew = `<div class="login-container">
  <div class="login-left">
    <div class="login-card">
      <div class="auth-header">
        <div class="brand-icon">🏨</div>
        <div class="brand-title">Smart Stay</div>
        <div class="brand-subtitle">Premium Hostel Management</div>
      </div>`;
      
login = login.replace(htmlStructOld, htmlStructNew);

// Close the new structure appropriately at the bottom
let closeTagsOld = `    </div>

  </div>`;
let closeTagsNew = `    </div>
  </div>
  <div class="login-right"></div>
</div>`;
login = login.replace(closeTagsOld, closeTagsNew);

// Remove duplicate media query body::after
login = login.replace(
`      body::after {
        position: relative;
        width: 100%;
        height: 50vh;
        display: block;
      }`, ''
);

// Replace .auth-container with .login-left in media queries
login = login.replace('.auth-container', '.login-left');

// Replace .form-wrapper with .login-card in media queries
login = login.replace('.form-wrapper', '.login-card');

fs.writeFileSync('login.html', login);

// 4. Update DASHBOARD.HTML to ensure 'selectedCategory' logic is correctly passed
let dash = fs.readFileSync('dashboard.html', 'utf8');

// the frontend script already had:
// category: selectedService
// let's rename selectedService to selectedCategory internally to match perfectly.
dash = dash.replace(/selectedService/g, 'selectedCategory');
fs.writeFileSync('dashboard.html', dash);

console.log("Fixes applied successfully.");
