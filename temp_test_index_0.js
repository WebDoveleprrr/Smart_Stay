
    // Session check
    fetch('https://smart-stay-0gxx.onrender.com/api/session', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.loggedIn) window.location.href = d.role === 'admin' ? '/admin.html' : '/dashboard.html';
      });

    function switchView(v) {
      document.getElementById('loginView').classList.remove('active');
      document.getElementById('registerView').classList.remove('active');
      
      if (v === 'login') {
        document.getElementById('loginView').classList.add('active');
      } else {
        document.getElementById('registerView').classList.add('active');
      }
      hideMsg();
    }

    function showMsg(id, text, type) {
      const el = document.getElementById(id);
      el.textContent = text;
      el.className = `msg ${type} show`;
    }

    function hideMsg() {
      document.getElementById('loginMsg').classList.remove('show');
      document.getElementById('regMsg').classList.remove('show');
    }

    function togglePwd(id, btn) {
      const inp = document.getElementById(id);
      if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
      else { inp.type = 'password'; btn.textContent = '👁'; }
    }

    async function doRegister() {
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const block = document.getElementById('regBlock').value.trim();
      const room = document.getElementById('regRoom').value.trim();
      const phone = document.getElementById('regPhone').value.trim();

      if (!name || !email || !password) return showMsg('regMsg', 'Name, email and password are required', 'error');

      showMsg('regMsg', 'Creating account...', 'success');
      const payload = { name, email, password, block, room, phone };

      try {
        const res = await fetch('https://smart-stay-0gxx.onrender.com/api/register', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.error) showMsg('regMsg', d.error, 'error');
        else {
          showMsg('regMsg', 'Account created successfully! Redirecting to login...', 'success');
          setTimeout(() => switchView('login'), 2000);
        }
      } catch (e) {
        showMsg('regMsg', 'Network error.', 'error');
      }
    }

    let otpTimerInterval;

    async function doLogin() {
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) return showMsg('loginMsg', 'Credentials required', 'error');

      showMsg('loginMsg', 'Authenticating...', 'success');

      try {
        const res = await fetch('https://smart-stay-0gxx.onrender.com/api/login', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const d = await res.json();
        if (d.error) {
          showMsg('loginMsg', d.error, 'error');
        } else if (d.role === 'admin') {
          showMsg('loginMsg', 'Admin login successful. Redirecting...', 'success');
          setTimeout(() => window.location.href = '/admin.html', 800);
        } else {
          showMsg('loginMsg', 'OTP sent to your email.', 'success');
          document.getElementById('loginStep1').style.display = 'none';
          document.getElementById('loginFooter').style.display = 'none';
          document.getElementById('loginStep2').classList.add('show');
          startOtpTimer();
        }
      } catch (e) {
        showMsg('loginMsg', 'Network error.', 'error');
      }
    }

    async function doVerifyOTP() {
      const otp = document.getElementById('otpInput').value.trim();
      if (!otp) return showMsg('loginMsg', 'OTP required', 'error');

      showMsg('loginMsg', 'Verifying...', 'success');
      try {
        const res = await fetch('https://smart-stay-0gxx.onrender.com/api/verify-otp', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otp })
        });
        const d = await res.json();
        if (d.error) showMsg('loginMsg', d.error, 'error');
        else {
          showMsg('loginMsg', 'Access granted. Redirecting...', 'success');
          setTimeout(() => window.location.href = '/dashboard.html', 800);
        }
      } catch (e) {
        showMsg('loginMsg', 'Network error', 'error');
      }
    }

    function startOtpTimer() {
      document.getElementById("resendBtn").disabled = true;
      document.getElementById("verifyBtn").disabled = false;
      if (otpTimerInterval) clearInterval(otpTimerInterval);

      let time = 300; // 5 mins
      const el = document.getElementById("timer");

      otpTimerInterval = setInterval(() => {
        let min = Math.floor(time / 60);
        let sec = time % 60;
        el.innerText = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        time--;

        if (time < 0) {
          clearInterval(otpTimerInterval);
          el.innerText = "OTP Expired";
          document.getElementById("verifyBtn").disabled = true;
          document.getElementById("resendBtn").disabled = false;
        }
      }, 1000);
    }

    function resendOTP() {
      document.getElementById("resendBtn").disabled = true;
      showMsg('loginMsg', 'Resending OTP...', 'success');

      fetch('https://smart-stay-0gxx.onrender.com/api/resend-otp', {
        method: 'POST', credentials: 'include'
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            showMsg('loginMsg', data.error, 'error');
            document.getElementById("resendBtn").disabled = false;
          } else {
            showMsg('loginMsg', 'New OTP sent to your email.', 'success');
            startOtpTimer();
          }
        })
        .catch(e => {
          showMsg('loginMsg', 'Network error', 'error');
          document.getElementById("resendBtn").disabled = false;
        });
    }

    function goHome() {
      window.location.href = "index.html";
    }
  