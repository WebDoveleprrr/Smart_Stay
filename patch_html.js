const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// Match the ending of the page-facilities block exactly using a robust regex
// It looks like:
//         </div>
//       </div>
//     </div>
//   </div>
//
//   <!-- LOST & FOUND -->
const regex = /\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- LOST & FOUND -->/;

const replacement = `
            </div>
            
            <div class="card" style="margin-top:20px; grid-column: 1 / -1;">
              <div class="card-title">All Active Bookings</div>
              <div class="card-sub">Report Ghost Bookings (Empty Facilities)</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Facility</th>
                      <th>Date</th>
                      <th>Slot</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody id="activeBookTable">
                    <tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px">Loading…</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <!-- LOST & FOUND -->`;

if (regex.test(html)) {
  html = html.replace(regex, replacement);
  fs.writeFileSync('dashboard.html', html);
  console.log("HTML Patched");
} else {
  console.log("Regex did not match!");
}
