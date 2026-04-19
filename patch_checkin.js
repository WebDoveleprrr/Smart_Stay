const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Regex to replace the badge mapping array and the cancel button row:
const regexBadge = /<td><span class="badge \${b\.status === 'Cancelled' \? 'urgent' : \(b\.status === 'Confirmed' \? 'confirmed' : b\.status === 'No-Show' \? 'high' : 'progress'\)}">\${b\.status}<\/span><\/td>[\s\S]*?<\/td>/m;
const replacementBadge = `<td><span class="badge \${b.status === 'cancelled' ? 'urgent' : (b.status === 'completed' ? 'resolved' : ['booked', 'under_review'].includes(b.status) ? 'confirmed' : 'progress')}">\${b.status}</span></td>
      <td>
        \${['booked', 'under_review'].includes(b.status) ? \`<button class="btn" style="background:#10b981; border:none; padding:4px 8px; font-size:0.75rem; margin-right:5px; cursor:pointer;" onclick="checkInBooking('\${b._id || b.id}')">Check-In</button><button class="btn-danger" style="padding:4px 8px; font-size:0.75rem; cursor:pointer;" onclick="cancelBooking('\${b._id || b.id}')">Cancel</button>\` : ''}
      </td>`;

html = html.replace(regexBadge, replacementBadge);

// 2. Regex to inject checkInBooking() directly under cancelBooking()
const regexCancelFunc = /async function cancelBooking\(id\) \{[\s\S]*?console\.error\(err\);\s*\}\s*\}/m;
const replacementFunc = `async function cancelBooking(id) {
      if (!confirm('Cancel this booking?')) return;
      try {
        await fetch(\`/api/bookings/\${id}\`, { method: 'DELETE', credentials: 'include' });
        showMsg('facMsg', 'Booking Cancelled', 'success');
        await loadBookings();
        loadActiveBookings();
        loadOverview();
        loadUserReliability();
      } catch (err) {
        console.error(err);
      }
    }

    async function checkInBooking(id) {
      try {
        const res = await fetch(\`/api/bookings/checkin/\${id}\`, { method: 'POST', credentials: 'include' });
        const d = await res.json();
        if (d.error) showMsg('facMsg', d.error, 'error');
        else {
          showMsg('facMsg', 'Checked in successfully!', 'success');
          loadBookings();
          loadActiveBookings();
          loadOverview();
        }
      } catch(e) { console.error(e) }
    }`;

html = html.replace(regexCancelFunc, replacementFunc);

fs.writeFileSync('dashboard.html', html);
console.log("Check-in and Badges Patched");
