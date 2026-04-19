const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');

let insertionPoint = '          </div>\n        </div>\n\n        <!-- LOST & FOUND -->';

let newHTML = `
            <!-- ACTIVE BOOKINGS -->
            <div class="card" style="margin-top: 20px; grid-column: 1 / -1;">
              <div class="card-title">Live Facility Status</div>
              <div class="card-sub">See currently active bookings by other users and report if unused</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Slot</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="activeBookingsTable">
                    <tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px">Loading...</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
`;

if (!dash.includes('id="activeBookingsTable"')) {
   dash = dash.replace(insertionPoint, newHTML + insertionPoint);
}

let loadFuncPoint = 'function goHome() {';
let newJS = `
    async function loadActiveBookings() {
      try {
        const d = await fetch('/api/bookings/all-active', { credentials: 'include' }).then(r => r.json());
        const books = d.bookings || [];
        document.getElementById('activeBookingsTable').innerHTML = books.length
          ? books.map(b => \`<tr>
        <td>\${b.facility}</td>
        <td>\${b.date} \${b.time_slot}</td>
        <td><span class="badge \${b.status === 'booked' ? 'confirmed' : 'progress'}">\${b.status}</span></td>
        <td>
           <button class="btn" style="padding:4px 8px;font-size:0.75rem;border:1px solid #DC2626;background:transparent;color:#DC2626;cursor:pointer;" onclick="reportNotUse('\${b._id || b.id}')">Report Ghost Booking</button>
        </td>
      </tr>\`).join('')
          : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:28px">No active bookings globally</td></tr>';
      } catch (err) { }
    }
`;
if (!dash.includes('loadActiveBookings() {')) {
   dash = dash.replace(loadFuncPoint, newJS + '\n    ' + loadFuncPoint);
}

if (!dash.includes('loadActiveBookings();')) {
   dash = dash.replace('loadBookings(); loadOverview();', 'loadBookings(); loadActiveBookings(); loadOverview();');
}

fs.writeFileSync('dashboard.html', dash);
console.log('Active Bookings updated in dashboard');
