const fs = require('fs');

// 1. ADD missing backend UI hooks to dashboard.html
let dash = fs.readFileSync('dashboard.html', 'utf8');

// Insert the needed UI functions inside the javascript block
let jsHook = `
    async function reportNotUse(id) {
      if (!confirm("Are you sure you want to report this booking? False reports decrease your rating.")) return;
      try {
        const res = await fetch('/api/bookings/report/' + id, { method: 'POST', credentials: 'include' });
        const d = await res.json();
        if (d.error) alert(d.error);
        else {
          alert('Report submitted successfully.');
          loadActiveBookings();
        }
      } catch (e) { alert("Network error"); }
    }

    async function checkInBooking(id) {
      try {
        const res = await fetch('/api/bookings/checkin/' + id, { method: 'POST', credentials: 'include' });
        const d = await res.json();
        if (d.error) alert(d.error);
        else {
          alert('Checked in successfully!');
          loadBookings();
          loadActiveBookings();
        }
      } catch (e) { alert("Network error"); }
    }
`;

if (!dash.includes('function reportNotUse')) {
    dash = dash.replace('    async function submitService() {', jsHook + '\n    async function submitService() {');
}

// Ensure the My Bookings section renders the check-in button correctly
// It's inside loadOverview()'s bookHtml generation or loadBookings()
// I will check loadBookings
if (!dash.includes('checkInBooking')) {
   let oldBook = `<td>\${b.status}</td>`;
   let newBook = `<td>\${b.status}</td>\n        <td>\${b.status === 'booked' ? \`<button onclick="checkInBooking('\${b._id || b.id}')" style="font-size:0.75rem;padding:4px 8px;cursor:pointer;">Check-in</button>\` : ''}</td>`;
   dash = dash.replace(/<td>\$\{b\.status\}<\/td>\s*<td.*?<\/td>/g, newBook); // Replace if previously added empty <td>
}

fs.writeFileSync('dashboard.html', dash);

// 2. Fix serviceController missing log
let sc = fs.readFileSync('controllers/serviceController.js', 'utf8');
let scMatch = `exports.createRequest = async (req, res) => {\n  const { category, description, severity, location, title } = req.body;`;
let scRep = `exports.createRequest = async (req, res) => {\n  console.log("[Service POST]", req.body);\n  const { category, description, severity, location, title } = req.body;`;
if (sc.includes(scMatch)) {
   sc = sc.replace(scMatch, scRep);
   fs.writeFileSync('controllers/serviceController.js', sc);
}

console.log("Features bound");
