const fs = require('fs');

// DASHBOARD MODIFICATIONS
let dash = fs.readFileSync('dashboard.html', 'utf8');

// Update column headers for services
dash = dash.replace(
  '<th>Date</th>\n                    </tr>',
  '<th>Date</th>\n                      <th>Action</th>\n                    </tr>'
);

// Replace loadServices function
let oldLoadServices = `async function loadServices() {
      const d = await fetch('/api/services', { credentials: 'include' }).then(r => r.json());
      const reqs = d.requests || [];
      document.getElementById('srvTable').innerHTML = reqs.length
        ? reqs.map(r => \`<tr>
      <td>\${catIcons[r.category] || '⚙️'} \${r.category}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">\${r.description || '—'}</td>
      <td><span class="badge \${r.priority.toLowerCase()}">\${r.priority}</span></td>
      <td><span class="badge \${r.status === 'Pending' ? 'pending' : r.status === 'Resolved' ? 'resolved' : 'progress'}">\${r.status}</span></td>
      <td style="font-size:0.72rem;color:var(--muted)">\${new Date(r.created_at * 1000).toLocaleDateString()}</td>
    </tr>\`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px">No requests yet</td></tr>';
    }`;

let newLoadServices = `async function loadServices() {
      const d = await fetch('/api/services', { credentials: 'include' }).then(r => r.json());
      const reqs = d.requests || [];
      document.getElementById('srvTable').innerHTML = reqs.length
        ? reqs.map(r => \`<tr>
      <td>\${catIcons[r.category] || '⚙️'} \${r.category}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">\${r.description || '—'}</td>
      <td><span class="badge \${r.priority.toLowerCase()}">\${r.priority}</span></td>
      <td><span class="badge \${r.status === 'pending' ? 'pending' : r.status === 'completed' || r.status === 'verified' ? 'resolved' : 'progress'}">\${r.status}</span></td>
      <td style="font-size:0.72rem;color:var(--muted)">\${new Date(r.created_at * 1000).toLocaleDateString()}</td>
      <td>
        \${r.status === 'completed' ? \`<button class="btn" style="padding:4px 8px;font-size:0.7rem;background:var(--success)" onclick="rateService('\${r.id}')">Rate</button>\` : ''}
        \${r.status === 'verified' ? \`<span style="font-size:0.7rem;color:var(--muted)">Rated \${r.rating}★</span>\` : ''}
      </td>
    </tr>\`).join('')
        : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:28px">No requests yet</td></tr>';
    }

    async function rateService(id) {
       const rating = prompt('Rate service from 1 to 5:');
       if(!rating || isNaN(rating) || rating < 1 || rating > 5) return alert('Invalid rating');
       await fetch('/api/services/rate/' + id, { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({rating: parseInt(rating)}) });
       loadServices();
       alert('Thank you for rating!');
    }`;
dash = dash.replace(oldLoadServices, newLoadServices);

// Replace loadBookings function
let oldLoadBookings = `async function loadBookings() {
      const d = await fetch('/api/bookings', { credentials: 'include' }).then(r => r.json());
      const books = d.bookings || [];
      document.getElementById('bookTable').innerHTML = books.length
        ? books.map(b => \`<tr>
      <td>\${b.facility}</td>
      <td>\${b.date}</td>
      <td>\${b.time_slot}</td>
      <td><span class="badge \${b.status === 'Cancelled' ? 'urgent' : (b.status === 'Confirmed' ? 'confirmed' : b.status === 'No-Show' ? 'high' : 'progress')}">\${b.status}</span></td>
      <td>
        \${b.status === 'Confirmed' ? \`<button class="btn-danger" onclick="cancelBooking('\${b.id}')">Cancel</button>\` : ''}
      </td>
    </tr>\`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px">No bookings yet</td></tr>';
    }`;

let newLoadBookings = `async function loadBookings() {
      const d = await fetch('/api/bookings', { credentials: 'include' }).then(r => r.json());
      const books = d.bookings || [];
      document.getElementById('bookTable').innerHTML = books.length
        ? books.map(b => \`<tr>
      <td>\${b.facility}</td>
      <td>\${b.date}</td>
      <td>\${b.time_slot}</td>
      <td><span class="badge \${b.status === 'cancelled' ? 'urgent' : (b.status === 'booked' ? 'confirmed' : b.status === 'completed' ? 'resolved' : 'progress')}">\${b.status}</span></td>
      <td>
        \${b.status === 'booked' ? \`<button class="btn" style="padding:4px 8px;font-size:0.75rem;background:var(--amber)" onclick="checkIn('\${b.id}')">Check-in</button>
                                   <button class="btn" style="padding:4px 8px;font-size:0.75rem;border:1px solid #DC2626;background:transparent;color:#DC2626;cursor:pointer;" onclick="reportNotUse('\${b.id}')">Report</button>\` : ''}
        \${b.status === 'in_use' ? \`<span style="font-size:0.8rem;color:var(--success);font-weight:600;">Checked In</span>\` : ''}
      </td>
    </tr>\`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px">No bookings yet</td></tr>';
    }

    async function checkIn(id) {
        let res = await fetch('/api/bookings/checkin/' + id, { method: 'POST', credentials: 'include' });
        let d = await res.json();
        if(d.error) alert(d.error);
        loadBookings(); loadOverview();
    }
    
    async function reportNotUse(id) {
        if(!confirm('Report this facility as unused?')) return;
        let res = await fetch('/api/bookings/report/' + id, { method: 'POST', credentials: 'include' });
        let d = await res.json();
        if(d.error) alert(d.error);
        else alert(d.message);
        loadBookings(); loadOverview(); loadUserReliability();
    }`;
dash = dash.replace(oldLoadBookings, newLoadBookings);

fs.writeFileSync('dashboard.html', dash);

// ADMIN HTML MODIFICATIONS
let admin = fs.readFileSync('admin.html', 'utf8');

// For Service Management: Assign staff, Change table to show Assigned To
admin = admin.replace(
  '<th>Priority</th>\n                  <th>Date</th>\n                  <th>Update Status</th>',
  '<th>Priority</th>\n                  <th>Date</th>\n                  <th>Assigned To</th>\n                  <th>Update Status</th>'
);

let oldFilterSrv = `function filterSrv(status, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSrv(status === 'all' ? allSrv : allSrv.filter(s => s.status === status));
    }`;

let newFilterSrv = `function filterSrv(status, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSrv(status === 'all' ? allSrv : allSrv.filter(s => s.status.toLowerCase() === status.toLowerCase() || (status==='Resolved' && ['completed','verified'].includes(s.status.toLowerCase())) || (status==='In Progress' && s.status==='in_progress')));
    }

    async function assignStaff(id) {
        // Mock prompt to assign staff
        const staffEmail = prompt("Enter Staff Email to re-assign (leave blank to clear):");
        if(staffEmail === null) return;
        alert("Staff assignment would occur here if we had a backend endpoint for assignment! (System auto-assigns currently)");
    }`;
admin = admin.replace(oldFilterSrv, newFilterSrv);

let oldRenderSrv = `function renderSrv(arr) {
      document.getElementById('adminSrvTable').innerHTML = arr.length ? arr.map(s => \`<tr>
        <td>
          <div style="font-weight:600;color:var(--text)">\${s.user_name}</div>
          <div style="font-size:0.75rem;color:var(--muted)">\${s.user_email}</div>
        </td>
        <td>\${s.category}</td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${s.description}</td>
        <td>\${s.block} - Room \${s.room}</td>
        <td><span class="badge \${s.priority.toLowerCase()}">\${s.priority}</span></td>
        <td style="font-size:0.75rem;color:var(--muted)">\${new Date(s.created_at * 1000).toLocaleDateString()}</td>
        <td>
          <select class="status-sel" onchange="updateSrvStatus('\${s.id}', this.value)">
            <option value="Pending" \${s.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="In Progress" \${s.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Resolved" \${s.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
          </select>
        </td>
      </tr>\`).join('') : '<tr><td colspan="7" style="text-align:center;padding:24px">No requests found.</td></tr>';
    }`;
    
let newRenderSrv = `function renderSrv(arr) {
      document.getElementById('adminSrvTable').innerHTML = arr.length ? arr.map(s => \`<tr>
        <td>
          <div style="font-weight:600;color:var(--text)">\${s.user_name}</div>
          <div style="font-size:0.75rem;color:var(--muted)">\${s.user_email}</div>
        </td>
        <td>
          \${s.category}
          \${s.recurring_issue ? '<span style="color:red;font-size:0.7rem;margin-left:5px" title="Recurring Issue!"><br>⚠️ Recurring</span>' : ''}
        </td>
        <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${s.description}</td>
        <td>\${s.block} - Room \${s.room}</td>
        <td><span class="badge \${s.priority.toLowerCase()}">\${s.priority}</span></td>
        <td style="font-size:0.75rem;color:var(--muted)">\${new Date(s.created_at * 1000).toLocaleDateString()}</td>
        <td style="font-size:0.8rem;color:var(--amber)" onclick="assignStaff('\${s.id}')" style="cursor:pointer">
          \${s.assignee_name || 'Unassigned'}
        </td>
        <td>
          <select class="status-sel" onchange="updateSrvStatus('\${s.id}', this.value)">
            <option value="pending" \${s.status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="in_progress" \${s.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" \${s.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="verified" \${s.status === 'verified' ? 'selected' : ''}>Verified</option>
            <option value="escalated" \${s.status === 'escalated' ? 'selected' : ''}>Escalated</option>
          </select>
        </td>
      </tr>\`).join('') : '<tr><td colspan="8" style="text-align:center;padding:24px">No requests found.</td></tr>';
    }`;
admin = admin.replace(oldRenderSrv, newRenderSrv);

// Add Analytics Endpoint to overview loader
let oldLoadStats = `async function loadStats() {
      const d = await fetch('/api/admin/stats', { credentials: 'include' }).then(r => r.json());
      if (d.stats) {
        document.getElementById('as-students').textContent = d.stats.students;
        document.getElementById('as-total').textContent = d.stats.totalRequests;
        document.getElementById('as-pending').textContent = d.stats.pendingRequests;
        document.getElementById('as-bookings').textContent = d.stats.totalBookings;
        document.getElementById('as-lf').textContent = d.stats.openLostFound;
      }
    }`;

let newLoadStats = `async function loadStats() {
      const d = await fetch('/api/admin/stats', { credentials: 'include' }).then(r => r.json());
      if (d.stats) {
        document.getElementById('as-students').textContent = d.stats.students;
        document.getElementById('as-total').textContent = d.stats.totalRequests;
        document.getElementById('as-pending').textContent = d.stats.pendingRequests;
        document.getElementById('as-bookings').textContent = d.stats.totalBookings;
        document.getElementById('as-lf').textContent = d.stats.openLostFound;
      }
      
      const a = await fetch('/api/services/analytics', { credentials: 'include' }).then(r=>r.json());
      if(!a.error) {
        let esc = a.escalatedRequests.length;
        document.getElementById('as-pending').textContent = esc > 0 ? \`\${d.stats.pendingRequests} (\${esc} Esc)\` : d.stats.pendingRequests;
        if(esc > 0) document.getElementById('as-pending').style.color = "red";
      }
    }`;
admin = admin.replace(oldLoadStats, newLoadStats);

fs.writeFileSync('admin.html', admin);
console.log("HTML files updated!");
