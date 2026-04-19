const fs = require('fs');

let dash = fs.readFileSync('dashboard.html', 'utf8');

// Replace submitService intelligently by locating the start and end of the function block
let fnStartIdx = dash.indexOf('async function submitService() {');
if (fnStartIdx !== -1) {
    let fnEndIdx = dash.indexOf('}', fnStartIdx) + 1;
    let oldFn = dash.substring(fnStartIdx, fnEndIdx);
    
    let newFn = `async function submitService() {
      if (!selectedCategory) return showMsg('srvMsg', 'Please select a category.', 'error');
      const desc = document.getElementById('srvDesc').value.trim();
      const priority = document.getElementById('srvPriority').value;
      const severity = priority.toLowerCase() === 'urgent' ? 'high' : (priority.toLowerCase() === 'normal' ? 'low' : 'medium');
      const res = await fetch('/api/services', { 
         method: 'POST', credentials: 'include', 
         headers: { 'Content-Type': 'application/json' }, 
         body: JSON.stringify({ category: selectedCategory, description: desc, severity, location: 'Hostel' }) 
      });
      const d = await res.json();
      if (d.error) return showMsg('srvMsg', d.error, 'error');
      showMsg('srvMsg', d.message, 'success');
      document.getElementById('srvDesc').value = ''; selectedCategory = '';
      document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
      loadServices(); loadOverview();
    }`;
    dash = dash.replace(oldFn, newFn);
    fs.writeFileSync('dashboard.html', dash);
    console.log("dashboard updated");
} else {
    console.log("Could not find submitService");
}
