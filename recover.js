const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// Fix function declaration
server = server.replace('async function await sendEmail(', 'async function sendEmail(');

// Fix session.save callback errors
let authCallbackOld = `req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      await sendEmail(`;

let authCallbackNew = `req.session.save(async (err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Session error. Please try again.' });
      }
      await sendEmail(`;
server = server.replace(authCallbackOld, authCallbackNew);


// Fix admin seed logic replacement if any
// (Not necessary since sendEmail is not in seedAdmin)

fs.writeFileSync('server.js', server);

// Login HTML picture on the left side
let login = fs.readFileSync('login.html', 'utf8');
// Swap login-left and login-right CSS attributes
login = login.replace(
`.login-left {
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
    }`,
`.login-left {
      flex: 1;
      background: url('/images/aryabhatta.jpg') center/cover no-repeat;
    }

    .login-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      background: #F3E6D3;
    }`
);

// Swap HTML structure positions
let htmlLeft = `<div class="login-left">
    <div class="login-card">
      <div class="auth-header">
        <div class="brand-icon">🏨</div>
        <div class="brand-title">Smart Stay</div>
        <div class="brand-subtitle">Premium Hostel Management</div>
      </div>`;

login = login.replace('<div class="login-left">', '<div class="login-right">');
login = login.replace('<div class="login-right"></div>', '<div class="login-left"></div>');

fs.writeFileSync('login.html', login);

console.log("Syntax and layout patched!");
