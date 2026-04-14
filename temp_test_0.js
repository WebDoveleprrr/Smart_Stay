
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar').classList.toggle('open');
  } else {
    document.body.classList.toggle('sidebar-collapsed');
  }
}
let selectedService = '', selectedFacility = '', selectedSlot = '', lfItems = [];
const tilts = ['−2deg', '1.5deg', '−1deg', '2deg', '−1.5deg', '0.8deg', '−0.5deg', '1.8deg'];
const catIcons = { Electrician: '⚡', Plumber: '🔩', Cleaning: '🧹', Laundry: '👕', Carpenter: '🪚', Other: '⚙️' };

fetch('https://smart-stay-0gxx.onrender.com/api/session', { credentials: 'include' }).then(r => r.json()).then(d => {
  if (!d.loggedIn) return window.location.href = '/';
  document.getElementById('sidebarName').textContent = d.name;
  document.getElementById('avatarInit').textContent = d.name.charAt(0).toUpperCase();
  loadOverview(); loadServices(); loadBookings(); loadLF();
  document.getElementById('facDate').min = new Date().toISOString().split('T')[0];
  document.getElementById('caseNum').textContent = String(Math.floor(Math.random() * 9000) + 1000);
  document.getElementById('caseDate').textContent = new Date().toLocaleDateString('en-GB');
});

const pageIcons = { overview: '🏠', services: '🔧', facilities: '🏋️', lostfound: '🔍', profile: '👤' };
const pageTitles = { overview: 'Overview', services: 'Service Requests', facilities: 'Facility Booking', lostfound: 'Lost & Found Bureau', profile: 'My Profile' };

function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (btn) btn.classList.add('active');
  document.getElementById('topTitle').textContent = pageTitles[id] || id;
  document.getElementById('topIcon').textContent = pageIcons[id] || '';
  document.getElementById('topBread').textContent = pageTitles[id] || id;
}

// MOD 7 + MOD 8: Overview with 3 stat cards, activity with two headings
async function loadOverview() {
  const [s, b, lf] = await Promise.all([
    fetch('https://smart-stay-0gxx.onrender.com/api/services', { credentials: 'include' }).then(r => r.json()),
    fetch('https://smart-stay-0gxx.onrender.com/api/bookings', { credentials: 'include' }).then(r => r.json()),
    fetch('https://smart-stay-0gxx.onrender.com/api/lost-found', { credentials: 'include' }).then(r => r.json())
  ]);
  const reqs = s.requests || [];
  const books = b.bookings || [];
  const lfAll = lf.items || [];
  const lfLost = lfAll.filter(i => i.type === 'Lost');
  const lfFound = lfAll.filter(i => i.type === 'Found');

  // MOD 7: Update counters
  document.getElementById('s-req').textContent = reqs.length;
  document.getElementById('s-book').textContent = books.length;
  document.getElementById('s-lost').textContent = lfLost.length;
  document.getElementById('s-found').textContent = lfFound.length;

  // MOD 8: Recent Activity — two separate sections
  const recentReqs = reqs.slice(0, 3);
  const recentBooks = books.slice(0, 3);

  const reqHtml = recentReqs.length
    ? recentReqs.map(r => `
        <div class="activity-item">
          <span style="font-size:1.1rem">${catIcons[r.category] || '⚙️'}</span>
          <div style="flex:1">
            <div style="font-size:0.84rem;font-weight:600;color:var(--cream)">${r.category}</div>
            <div style="font-size:0.7rem;color:var(--muted)">${r.description ? r.description.substring(0, 40) + '…' : new Date(r.created_at * 1000).toLocaleDateString()}</div>
          </div>
          <span class="badge ${r.status === 'Pending' ? 'pending' : r.status === 'Resolved' ? 'resolved' : 'progress'}">${r.status}</span>
        </div>`).join('')
    : '<div style="color:var(--muted);font-size:0.82rem;padding:6px 0">No requests yet</div>';

  const bookHtml = recentBooks.length
    ? recentBooks.map(b => `
        <div class="activity-item">
          <span style="font-size:1.1rem">🏋️</span>
          <div style="flex:1">
            <div style="font-size:0.84rem;font-weight:600;color:var(--cream)">${b.facility}</div>
            <div style="font-size:0.7rem;color:var(--muted)">${b.date} &nbsp;·&nbsp; ${b.time_slot}</div>
          </div>
          <span class="badge confirmed">${b.status}</span>
        </div>`).join('')
    : '<div style="color:var(--muted);font-size:0.82rem;padding:6px 0">No bookings yet</div>';

  document.getElementById('recentActivity').innerHTML = `
    <div class="activity-section-head">🔧 Service Requests</div>
    ${reqHtml}
    <div class="activity-section-head" style="margin-top:14px">🏋️ Facility Bookings</div>
    ${bookHtml}
  `;
}

function selectService(el, name) {
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected'); selectedService = name;
}

async function submitService() {
  if (!selectedService) return showMsg('srvMsg', 'Please select a category.', 'error');
  const desc = document.getElementById('srvDesc').value.trim();
  const priority = document.getElementById('srvPriority').value;
  const res = await fetch('https://smart-stay-0gxx.onrender.com/api/services', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: selectedService, description: desc, priority }) });
  const d = await res.json();
  if (d.error) return showMsg('srvMsg', d.error, 'error');
  showMsg('srvMsg', d.message, 'success');
  document.getElementById('srvDesc').value = ''; selectedService = '';
  document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
  loadServices(); loadOverview();
}

async function loadServices() {
  const d = await fetch('https://smart-stay-0gxx.onrender.com/api/services', { credentials: 'include' }).then(r => r.json());
  const reqs = d.requests || [];
  document.getElementById('srvTable').innerHTML = reqs.length
    ? reqs.map(r => `<tr>
      <td>${catIcons[r.category] || '⚙️'} ${r.category}</td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">${r.description || '—'}</td>
      <td><span class="badge ${r.priority.toLowerCase()}">${r.priority}</span></td>
      <td><span class="badge ${r.status === 'Pending' ? 'pending' : r.status === 'Resolved' ? 'resolved' : 'progress'}">${r.status}</span></td>
      <td style="font-size:0.72rem;color:var(--muted)">${new Date(r.created_at * 1000).toLocaleDateString()}</td>
    </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px">No requests yet</td></tr>';
}

function selectFacility(el, name) { document.querySelectorAll('.fac-btn').forEach(b => b.classList.remove('selected')); el.classList.add('selected'); selectedFacility = name; }
function selectSlot(el, name) { document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected')); el.classList.add('selected'); selectedSlot = name; }

async function submitBooking() {
  if (!selectedFacility) return showMsg('facMsg', 'Select a facility.', 'error');
  const date = document.getElementById('facDate').value;
  if (!date) return showMsg('facMsg', 'Select a date.', 'error');
  if (!selectedSlot) return showMsg('facMsg', 'Select a time slot.', 'error');
  const res = await fetch('https://smart-stay-0gxx.onrender.com/api/bookings', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facility: selectedFacility, date, time_slot: selectedSlot }) });
  const d = await res.json();
  if (d.error) return showMsg('facMsg', d.error, 'error');
  showMsg('facMsg', d.message, 'success');
  loadBookings(); loadOverview();
}

async function loadBookings() {
  const d = await fetch('https://smart-stay-0gxx.onrender.com/api/bookings', { credentials: 'include' }).then(r => r.json());
  const books = d.bookings || [];
  document.getElementById('bookTable').innerHTML = books.length
    ? books.map(b => `<tr>
      <td>${b.facility}</td>
      <td>${b.date}</td>
      <td>${b.time_slot}</td>
      <td><span class="badge confirmed">${b.status}</span></td>
      <td><button class="btn-danger" onclick="cancelBooking('${b.id}')">Cancel</button></td>
    </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px">No bookings yet</td></tr>';
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  await fetch(`https://smart-stay-0gxx.onrender.com/api/bookings/${id}`, { method: 'DELETE', credentials: 'include' });
  loadBookings(); loadOverview();
}

function previewLF(e) {
  const fileInput = document.querySelector('#photoInput');
  const preview = document.querySelector('#previewImage');
  const file = fileInput.files[0];
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
  }
}

async function submitLF() {
  const type = document.getElementById('lfType').value;
  const item_name = document.getElementById('lfName').value.trim();
  if (!item_name) return showMsg('lfMsg', 'Item name required.', 'error');

  showMsg('lfMsg', 'Uploading & Finding matches...', 'success');
  const fd = new FormData();
  fd.append('type', type); fd.append('item_name', item_name);
  fd.append('description', document.getElementById('lfDesc').value);
  fd.append('location', document.getElementById('lfLocation').value);
  const photo = document.getElementById('photoInput').files[0];
  if (photo) fd.append('image', photo);

  const res = await fetch('https://smart-stay-0gxx.onrender.com/api/lost-found', { method: 'POST', credentials: 'include', body: fd });
  const d = await res.json();
  if (d.error) return showMsg('lfMsg', d.error, 'error');

  showMsg('lfMsg', d.message || 'Report posted!', 'success');

  try {
    showMsg('lfMsg', 'Analyzing image similarity...', 'success');
    const matchRes = await fetch('https://smart-stay-0gxx.onrender.com/api/match-image', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: d.id })
    });
    const mData = await matchRes.json();

    if (mData.matches && mData.matches.length > 0) {
      showMatchModal(d.id, mData.matches);
    } else {
      showMsg('lfMsg', 'Report posted! No high-confidence matches found yet.', 'success');
    }
  } catch (e) {
    console.warn('Match detection error:', e);
    showMsg('lfMsg', 'Report posted! (AI matching temporarily unavailable)', 'success');
  }

  document.getElementById('lfName').value = '';
  document.getElementById('lfDesc').value = '';
  document.getElementById('lfLocation').value = '';
  document.getElementById('previewImage').style.display = 'none';
  document.getElementById('previewImage').src = '';
  document.getElementById('caseNum').textContent = String(Math.floor(Math.random() * 9000) + 1000);
  loadLF(); loadOverview();
}

function showMatchModal(sourceId, matches) {
  const mContent = document.getElementById('matchModalContent');
  mContent.innerHTML = matches.map(m => {
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
                <button class="btn" style="padding:4px 10px; font-size:0.8rem; background:var(--success);" onclick="confirmAIMatch('${sourceId}', '${m.id}')">Confirm</button>
              </div>
            </div>
          </div>`;
  }).join('');
  document.getElementById('matchModal').style.display = 'flex';

  // High-confidence indicator shown in modal UI — no blocking alert needed
}

async function confirmAIMatch(sourceId, targetId) {
  if (!confirm('Are you sure you want to mark these items as a match? Both cases will be closed.')) return;
  try {
    const res = await fetch('https://smart-stay-0gxx.onrender.com/api/confirm-match', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, target_id: targetId })
    });
    const d = await res.json();
    if (d.error) {
      alert(d.error);
    } else {
      alert('Match confirmed successfully!');
      document.getElementById('matchModal').style.display = 'none';
      loadLF(); loadOverview();
    }
  } catch (e) {
    console.error(e);
    alert("Error confirming match.");
  }
}

async function loadLF() {
  const d = await fetch('https://smart-stay-0gxx.onrender.com/api/lost-found', { credentials: 'include' }).then(r => r.json());
  lfItems = d.items || []; renderLF(lfItems);
}

function filterLF(type, btn) {
  document.querySelectorAll('.bfilter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderLF(type === 'all' ? lfItems : lfItems.filter(i => i.type === type));
}

function renderLF(items) {
  if (!items.length) {
    document.getElementById('lfGrid').innerHTML = '<div class="no-pins"><div class="no-pins-icon">📭</div><div>No Lost & Found reports yet</div></div>';
    return;
  }
  document.getElementById('lfGrid').innerHTML = items.map((i, idx) => `
    <div class="pin-card">
      <div class="image-box">
        ${i.image ? `<img src="${i.image ? `data:${i.image.contentType};base64,${i.image.data}` : 'https://via.placeholder.com/300x200?text=No+Image'}" alt=""/>` : (i.type === 'Lost' ? '🔍' : '📦')}
      </div>
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
        <div style="font-size:1.1rem; font-weight:700; color:var(--text); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;" title="${i.item_name}">${i.item_name}</div>
        <span class="badge ${i.type === 'Lost' ? 'lost' : 'found'}" style="font-size:0.7rem;">${i.type}</span>
      </div>
      <div style="font-size:0.85rem; color:var(--muted); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <span>📍</span> ${i.location || 'Unknown location'}
      </div>
      <div style="font-size:0.85rem; color:var(--text); margin-bottom:12px; flex:1; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
        ${i.description || 'No additional details provided.'}
      </div>
      <div style="border-top:1px solid var(--border); padding-top:12px; display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; color:var(--muted);">
        <div><span style="font-weight:600; color:var(--text);">By:</span> ${i.user_name}</div>
        <div>${new Date(i.created_at * 1000).toLocaleDateString()}</div>
      </div>
      <div style="margin-top:12px;">
        <span class="badge ${i.status === 'Closed' ? 'resolved' : 'pending'}" style="font-size:0.7rem;">${i.status}</span>
      </div>
    </div>`).join('');
}

async function loadProfile() {
  const d = await fetch('https://smart-stay-0gxx.onrender.com/api/profile', { credentials: 'include' }).then(r => r.json());
  const u = d.user;
  document.getElementById('profileContent').innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--border)">
      <div style="width:54px;height:54px;background:linear-gradient(135deg,var(--rust),var(--amber));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800">${u.name.charAt(0)}</div>
      <div><div style="font-family:'DM Serif Display',serif;font-size:1.2rem;color:var(--cream)">${u.name}</div><div style="color:var(--amber);font-size:0.78rem;font-weight:700">${u.role}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:12px;">
      ${[['📧', 'Email', u.email], ['🏢', 'Block', u.block || '—'], ['🚪', 'Room', u.room || '—'], ['📱', 'Phone', u.phone || '—'], ['📅', 'Joined', new Date(u.created_at * 1000).toLocaleDateString()]].map(([i, l, v]) => `
      <div style="display:flex;align-items:center;gap:14px;padding:11px;background:var(--surface2);border-radius:9px;border:1px solid var(--border)">
        <span style="font-size:1.1rem">${i}</span>
        <div><div style="font-size:0.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;font-weight:700">${l}</div><div style="font-size:0.88rem;margin-top:2px">${v}</div></div>
      </div>`).join('')}
    </div>`;
}

function goHome() {
  showPage('overview', document.querySelectorAll('.nav-item')[0]);
}
function showMsg(id, text, type) { const e = document.getElementById(id); e.textContent = text; e.className = `msg ${type} show`; }
async function doLogout() { await fetch('https://smart-stay-0gxx.onrender.com/api/logout', { method: 'POST', credentials: 'include' }); window.location.href = '/'; }
