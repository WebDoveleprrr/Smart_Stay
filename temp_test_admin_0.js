
    function toggleSidebar() {
      if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.toggle('open');
      } else {
        document.body.classList.toggle('sidebar-collapsed');
      }
    }
    let allSrv = [];
    fetch('https://smart-stay-0gxx.onrender.com/api/session', { credentials: 'include' }).then(r => r.json()).then(d => {
      if (!d.loggedIn || d.role !== 'admin') window.location.href = '/';
      else { loadStats(); loadAdminServices(); loadAdminBookings(); loadAdminLF(); }
    });

    const pageTitles = { overview: '🏨 Admin Dashboard', services: '🔧 Service Requests', bookings: '🏋️ Facility Bookings', lostfound: '🔍 Lost & Found Reports' };
    function showPage(id, btn) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      document.getElementById('page-' + id).classList.add('active');
      if (btn) btn.classList.add('active');
      document.getElementById('topTitle').textContent = pageTitles[id] || id;
    }

    async function loadStats() {
      const d = await fetch('https://smart-stay-0gxx.onrender.com/api/admin/stats', { credentials: 'include' }).then(r => r.json());
      const s = d.stats || {};
      document.getElementById('as-students').textContent = s.students ?? '—';
      document.getElementById('as-total').textContent = s.totalRequests ?? '—';
      document.getElementById('as-pending').textContent = s.pendingRequests ?? '—';
      document.getElementById('as-bookings').textContent = s.totalBookings ?? '—';
      document.getElementById('as-lf').textContent = s.openLostFound ?? '—';
    }

    async function loadAdminServices() {
      const d = await fetch('https://smart-stay-0gxx.onrender.com/api/services', { credentials: 'include' }).then(r => r.json());
      allSrv = d.requests || [];
      renderAdminSrv(allSrv);
      const catIcons = { Electrician: '⚡', Plumber: '🔩', Cleaning: '🧹', Laundry: '👕', Carpenter: '🪚', Other: '⚙️' };
      document.getElementById('overviewTable').innerHTML = allSrv.slice(0, 5).map(r => `
    <tr><td style="font-weight:600">${r.user_name || '—'}</td>
    <td>${catIcons[r.category] || '⚙️'} ${r.category}</td>
    <td><span class="badge ${r.priority.toLowerCase()}">${r.priority}</span></td>
    <td><span class="badge ${r.status === 'Pending' ? 'pending' : r.status === 'Resolved' ? 'resolved' : 'progress'}">${r.status}</span></td>
    </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px">No requests</td></tr>';
    }

    function filterSrv(type, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderAdminSrv(type === 'all' ? allSrv : allSrv.filter(r => r.status === type));
    }

    function renderAdminSrv(reqs) {
      const catIcons = { Electrician: '⚡', Plumber: '🔩', Cleaning: '🧹', Laundry: '👕', Carpenter: '🪚', Other: '⚙️' };
      document.getElementById('adminSrvTable').innerHTML = reqs.length
        ? reqs.map(r => `<tr>
      <td><div style="font-weight:700">${r.user_name || '—'}</div><div style="font-size:0.7rem;color:var(--muted)">${r.user_email || ''}</div></td>
      <td>${catIcons[r.category] || '⚙️'} ${r.category}</td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">${r.description || '—'}</td>
      <td style="font-size:0.78rem">${r.block || '—'} / ${r.room || '—'}</td>
      <td><span class="badge ${r.priority.toLowerCase()}">${r.priority}</span></td>
      <td style="font-size:0.72rem;color:var(--muted)">${new Date(r.created_at * 1000).toLocaleDateString()}</td>
      <td>
        <select class="status-sel" onchange="updateStatus('${r.id}',this.value)">
          <option ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option ${r.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option ${r.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
      </td></tr>`).join('')
        : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px">No requests found</td></tr>';
    }

    async function updateStatus(id, status) {
      await fetch(`https://smart-stay-0gxx.onrender.com/api/services/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      loadStats(); loadAdminServices();
    }

    async function loadAdminBookings() {
      const d = await fetch('https://smart-stay-0gxx.onrender.com/api/bookings', { credentials: 'include' }).then(r => r.json());
      const books = d.bookings || [];
      document.getElementById('adminBookTable').innerHTML = books.length
        ? books.map(b => `<tr>
      <td style="font-weight:600">${b.user_name || '—'}</td>
      <td>${b.facility}</td><td>${b.date}</td><td>${b.time_slot}</td>
      <td><span class="badge confirmed">${b.status}</span></td>
      <td><button class="cancel-btn" onclick="cancelBook('${b.id}')">Cancel</button></td>
      </tr>`).join('')
        : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">No bookings</td></tr>';
    }

    async function cancelBook(id) {
      if (!confirm('Cancel this booking?')) return;
      await fetch(`https://smart-stay-0gxx.onrender.com/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' });
      loadAdminBookings(); loadStats();
    }

    async function loadAdminLF() {
      const d = await fetch('https://smart-stay-0gxx.onrender.com/api/lost-found', { credentials: 'include' }).then(r => r.json());
      const items = d.items || [];
      document.getElementById('adminLFTable').innerHTML = items.length
        ? items.map(i => `<tr>
      <td>${i.image ? `<img src="${i.image ? `data:${i.image.contentType};base64,${i.image.data}` : ''}" width="50" height="50" style="object-fit:cover;border-radius:6px;" />` : '<span style="font-size:1.4rem">📦</span>'}</td>
      <td style="font-weight:600">${i.user_name}</td>
      <td><span class="badge ${i.type.toLowerCase()}">${i.type}</span></td>
      <td><div style="font-weight:600">${i.item_name}</div></td>
      <td style="font-size:0.78rem;color:var(--muted)">${i.location || '—'}</td>
      <td style="font-size:0.75rem;color:var(--muted);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${i.description || '—'}</td>
      <td><span class="badge ${i.status === 'Open' ? 'pending' : 'resolved'}">${i.status}</span></td>
      <td style="font-size:0.72rem;color:var(--muted)">${new Date(i.created_at * 1000).toLocaleDateString()}</td>
      <td>
        ${i.status === 'Open' ? `<button class="cancel-btn" style="background:var(--amber); padding:6px 12px; font-size:0.75rem;" onclick="findAdminMatches('${i.id}')">Find Matches</button>` : '—'}
      </td>
      </tr>`).join('')
        : '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px">No reports</td></tr>';
    }

    async function findAdminMatches(id) {
       document.getElementById('matchModalContent').innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">Analyzing images...</div>';
       document.getElementById('matchModal').style.display = 'flex';
       
       try {
         const matchRes = await fetch('https://smart-stay-0gxx.onrender.com/api/match-image', { 
            method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: id })
         });
         const mData = await matchRes.json();
         
         const mContent = document.getElementById('matchModalContent');
         if (mData.matches && mData.matches.length > 0) {
            mContent.innerHTML = mData.matches.map(m => {
                const simScore = (m.score * 100).toFixed(1);
                const isHigh = m.score > 0.90;
                return `
                <div style="border:1px solid ${isHigh ? 'var(--amber)' : 'var(--border)'}; padding:12px; border-radius:8px; display:flex; gap:12px; align-items:center; background:var(--surface2);">
                  <div style="width:70px; height:70px; border-radius:6px; overflow:hidden; background:#eee; flex-shrink:0;">
                    ${m.image_url ? `<img src="${m.image_url}" style="width:100%;height:100%;object-fit:cover;" />` : '<div style="font-size:2rem;text-align:center;line-height:70px;">📦</div>'}
                  </div>
                  <div style="flex:1;">
                    <div style="font-weight:bold; color:var(--text);">${m.item_name}</div>
                    <div style="font-size:0.8rem; color:var(--muted); margin-bottom:4px;">${m.type} • ${m.location || 'Unknown loc'}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:0.85rem; font-weight:bold; color:${isHigh ? 'var(--success)' : 'var(--amber)'};">
                        ${isHigh ? '🔥 High Match' : 'Similarity'}: ${simScore}%
                      </span>
                      <button class="cancel-btn" style="padding:4px 10px; font-size:0.8rem; background:var(--success);" onclick="confirmAdminMatch('${id}', '${m.id}')">Confirm</button>
                    </div>
                  </div>
                </div>`;
            }).join('');
         } else {
            mContent.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">No matching images found above confidence threshold.</div>';
         }
       } catch (e) {
          document.getElementById('matchModalContent').innerHTML = '<div style="color:var(--rust); text-align:center; padding:20px;">Failed to find matches. Ensure AI service is running.</div>';
       }
    }

    async function confirmAdminMatch(sourceId, targetId) {
       if(!confirm('Are you sure you want to mark these items as a match? Both cases will be closed.')) return;
       try {
         const res = await fetch('https://smart-stay-0gxx.onrender.com/api/confirm-match', {
            method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ source_id: sourceId, target_id: targetId })
         });
         const d = await res.json();
         if(d.error) alert(d.error);
         else {
            alert('Match confirmed successfully!');
            document.getElementById('matchModal').style.display = 'none';
            loadAdminLF(); loadStats();
         }
       } catch(e) {
         alert("Error confirming match.");
       }
    }

    function goHome() {
      showPage('overview', document.querySelectorAll('.nav-item')[0]);
    }
    async function doLogout() { await fetch('https://smart-stay-0gxx.onrender.com/api/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/'; }
  