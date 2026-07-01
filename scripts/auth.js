/* ============================================================
   auth.js — Login page controller
   Depends on: gsap, AuthService (auth-service.js)
   ============================================================ */

(function () {
  'use strict';

  /* ----- State vars declared here so var-initialisation never resets them
     after init() has already populated _dom / set _role etc.             ----- */
  var _dom = {};
  var _role = 'student';
  var _submitting = false;
  var _redirecting = false;

  /* ----- Guard: redirect if already authenticated ----- */
  try {
    if (typeof AuthService !== 'undefined' && AuthService.isLoggedIn()) {
      var _authedUser = AuthService.getCurrentUser();
      window.location.href = AuthService.getRedirectPath(_authedUser.role);
      _redirecting = true;
      /* If navigation hasn't happened after 2s (redirect failed / circular loop),
         unlock the form so the user can still log in manually. */
      setTimeout(function () { _redirecting = false; }, 2000);
    }
  } catch (_guardErr) { /* ignore — always fall through to init() */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ========================
     INIT
     ======================== */
  function init() {
    cacheDOM();
    bindEvents();
    loadRemembered();
    runEntranceAnimation();
    updatePlaceholder();
    /* Apply initial password visibility based on default role (student) */
    switchRole(_role);
  }

  /* ========================
     DOM CACHE
     ======================== */
  function cacheDOM() {
    _dom = {
      form:          document.getElementById('loginForm'),
      userId:        document.getElementById('userId'),
      password:      document.getElementById('password'),
      rememberMe:    document.getElementById('rememberMe'),
      loginBtn:      document.getElementById('loginBtn'),
      btnText:       document.querySelector('#loginBtn .btn-text'),
      formError:     document.getElementById('formError'),
      formErrorMsg:  document.getElementById('formErrorMsg'),
      formSuccess:   document.getElementById('formSuccess'),
      formSuccessMsg:document.getElementById('formSuccessMsg'),
      userIdError:   document.getElementById('userIdError'),
      passwordError: document.getElementById('passwordError'),
      togglePwd:     document.getElementById('togglePwd'),
      roleTabs:      document.querySelectorAll('.role-tab'),
      demoPanel:     document.getElementById('demoPanel'),
      demoPanelHdr:  document.getElementById('demoPanelHeader'),
      demoAccounts:  document.querySelectorAll('.demo-account'),
      authCard:      document.querySelector('.auth-card'),
      forgotLink:    document.getElementById('forgotLink')
    };
  }

  /* ========================
     EVENTS
     ======================== */
  function bindEvents() {
    _dom.roleTabs.forEach(function (tab) {
      tab.addEventListener('click', function () { switchRole(this.dataset.role); });
      tab.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchRole(this.dataset.role); }
      });
    });

    if (_dom.togglePwd) {
      _dom.togglePwd.addEventListener('click', togglePassword);
    }

    if (_dom.userId) {
      _dom.userId.addEventListener('blur', function () {
        if (this.value.trim()) validateUserId();
      });
      _dom.userId.addEventListener('input', function () {
        clearFieldError('userIdError');
        clearFormError();
      });
    }

    if (_dom.password) {
      _dom.password.addEventListener('blur', function () {
        if (this.value) validatePassword();
      });
      _dom.password.addEventListener('input', function () {
        clearFieldError('passwordError');
        clearFormError();
      });
    }

    if (_dom.form) {
      _dom.form.addEventListener('submit', handleSubmit);
    }

    if (_dom.demoPanelHdr) {
      _dom.demoPanelHdr.addEventListener('click', toggleDemoPanel);
      _dom.demoPanelHdr.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDemoPanel(); }
      });
    }

    _dom.demoAccounts.forEach(function (account) {
      account.addEventListener('click', function () {
        fillDemoAccount(this.dataset.id, this.dataset.pwd, this.dataset.role);
      });
    });

    if (_dom.forgotLink) {
      _dom.forgotLink.addEventListener('click', function (e) {
        e.preventDefault();
        showFormError('ฟีเจอร์รีเซ็ตรหัสผ่านกำลังพัฒนา กรุณาติดต่อครูผู้สอน');
        setTimeout(clearFormError, 4000);
      });
    }

    /* Arrow-key navigation between role tabs */
    var tabList = document.querySelector('.role-selector');
    if (tabList) {
      tabList.addEventListener('keydown', function (e) {
        var tabs = Array.from(_dom.roleTabs);
        var idx  = tabs.indexOf(document.activeElement);
        if (idx === -1) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(idx + 1) % tabs.length].focus(); }
        if (e.key === 'ArrowLeft')  { e.preventDefault(); tabs[(idx + tabs.length - 1) % tabs.length].focus(); }
      });
    }
  }

  /* ========================
     ROLE SWITCHING
     ======================== */
  function switchRole(role) {
    _role = role;
    _dom.roleTabs.forEach(function (tab) {
      var isActive = tab.dataset.role === role;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });

    /* Hide password field entirely for student role */
    var isStudent = role === 'student';
    if (_dom.password) {
      var pwdGroup = _dom.password.closest('.form-group');
      if (pwdGroup) pwdGroup.hidden = isStudent;
    }
    if (_dom.togglePwd) _dom.togglePwd.hidden = isStudent;

    updatePlaceholder();
    clearErrors();

    if (typeof gsap !== 'undefined') {
      gsap.from(_dom.form.querySelectorAll('.form-group:not([hidden])'), {
        y: 5, opacity: 0.7, duration: 0.22, stagger: 0.04, ease: 'power1.out'
      });
    }
  }

  function updatePlaceholder() {
    var map = { student: 'STD001', teacher: 'TCH001' };
    if (_dom.userId) _dom.userId.placeholder = 'เช่น ' + (map[_role] || 'STD001');
  }

  /* ========================
     PASSWORD TOGGLE
     ======================== */
  function togglePassword() {
    var input  = _dom.password;
    var icon   = _dom.togglePwd.querySelector('.material-symbols-rounded');
    var isText = input.type === 'text';
    input.type       = isText ? 'password' : 'text';
    icon.textContent = isText ? 'visibility' : 'visibility_off';
    if (typeof gsap !== 'undefined') {
      gsap.from(icon, { scale: 0.7, duration: 0.18, ease: 'back.out(2)' });
    }
  }

  /* ========================
     VALIDATION
     ======================== */
  var _patterns = {
    student: /^STD\d{3}$/i,
    teacher: /^TCH\d{3}$/i
  };

  var _examples = { student: 'STD001', teacher: 'TCH001' };

  function validateUserId() {
    var val = _dom.userId.value.trim();
    if (!val) {
      showFieldError('userIdError', 'กรุณากรอกรหัสผู้ใช้');
      _dom.userId.classList.add('input-error');
      return false;
    }
    if (!_patterns[_role].test(val)) {
      showFieldError('userIdError', 'รูปแบบไม่ถูกต้อง เช่น ' + _examples[_role]);
      _dom.userId.classList.add('input-error');
      return false;
    }
    _dom.userId.classList.remove('input-error');
    return true;
  }

  function validatePassword() {
    if (_role === 'student') return true; /* no password required for students */
    var val = _dom.password ? _dom.password.value : '';
    if (!val) {
      showFieldError('passwordError', 'กรุณากรอกรหัสผ่าน');
      if (_dom.password) _dom.password.classList.add('input-error');
      return false;
    }
    if (val.length < 6) {
      showFieldError('passwordError', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      if (_dom.password) _dom.password.classList.add('input-error');
      return false;
    }
    if (_dom.password) _dom.password.classList.remove('input-error');
    return true;
  }

  function validateAll() {
    var okId  = validateUserId();
    var okPwd = validatePassword();
    return okId && okPwd;
  }

  /* ========================
     FORM SUBMIT
     ======================== */
  function handleSubmit(e) {
    e.preventDefault();
    if (_submitting || _redirecting) return;
    clearFormError();
    clearFormSuccess();

    if (!validateAll()) { shakeCard(); return; }

    _submitting = true;
    setLoading(true);

    AuthService.login(
      _dom.userId.value.trim(),
      _dom.password.value,
      _role,
      _dom.rememberMe ? _dom.rememberMe.checked : false
    ).then(function (result) {
      if (result.success) {
        onLoginSuccess(result.user);
      } else {
        setLoading(false);
        _submitting = false;
        showFormError(getErrorMessage(result.error));
        shakeCard();
      }
    }).catch(function () {
      setLoading(false);
      _submitting = false;
      showFormError('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง');
    });
  }

  function getErrorMessage(code) {
    var map = {
      invalid_credentials: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
      role_mismatch: 'บัญชีนี้ไม่ใช่ประเภทที่เลือก กรุณาเลือกประเภทให้ถูกต้อง'
    };
    return map[code] || 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
  }

  /* ========================
     LOADING / SUCCESS
     ======================== */
  function setLoading(on) {
    _dom.loginBtn.disabled = on;
    _dom.loginBtn.classList.toggle('loading', on);
    [_dom.userId, _dom.password, _dom.rememberMe].filter(Boolean).forEach(function (el) {
      el.disabled = on;
    });
    _dom.roleTabs.forEach(function (t) { t.disabled = on; });
  }

  function onLoginSuccess(user) {
    _dom.loginBtn.classList.remove('loading');
    _dom.loginBtn.classList.add('success');
    if (_dom.btnText) _dom.btnText.textContent = 'เข้าสู่ระบบสำเร็จ!';
    if (typeof AnalyticsService !== 'undefined') {
      AnalyticsService.logEvent('login', { role: user.role });
    }
    showFormSuccess('ยินดีต้อนรับ ' + (user.name || user.userName || '') + ' กำลังพาไปยังหน้าหลัก...');

    if (typeof gsap !== 'undefined') {
      gsap.to(_dom.authCard, {
        scale: 1.01, duration: 0.22, ease: 'power1.out', yoyo: true, repeat: 1
      });
    }

    setTimeout(function () {
      window.location.href = AuthService.getRedirectPath(user.role);
    }, 900);
  }

  /* ========================
     UI HELPERS
     ======================== */
  function showFieldError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    if (typeof gsap !== 'undefined') {
      gsap.from(el, { x: -5, opacity: 0, duration: 0.2, ease: 'power1.out' });
    }
  }

  function clearFieldError(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = '';
    el.classList.remove('visible');
    var inputId = id.replace('Error', '');
    var input = document.getElementById(inputId);
    if (input) input.classList.remove('input-error');
  }

  function showFormError(msg) {
    if (!_dom.formError) return;
    if (_dom.formErrorMsg) _dom.formErrorMsg.textContent = msg;
    else _dom.formError.querySelector('span:not(.material-symbols-rounded)').textContent = msg;
    _dom.formError.classList.add('visible');
    if (typeof gsap !== 'undefined') {
      gsap.from(_dom.formError, { y: -8, opacity: 0, duration: 0.28, ease: 'power2.out' });
    }
  }

  function clearFormError() {
    if (!_dom.formError) return;
    _dom.formError.classList.remove('visible');
  }

  function showFormSuccess(msg) {
    if (!_dom.formSuccess) return;
    if (_dom.formSuccessMsg) _dom.formSuccessMsg.textContent = msg;
    else _dom.formSuccess.querySelector('span:not(.material-symbols-rounded)').textContent = msg;
    _dom.formSuccess.classList.add('visible');
  }

  function clearFormSuccess() {
    if (!_dom.formSuccess) return;
    _dom.formSuccess.classList.remove('visible');
  }

  function clearErrors() {
    clearFieldError('userIdError');
    clearFieldError('passwordError');
    clearFormError();
    clearFormSuccess();
  }

  function shakeCard() {
    if (!_dom.authCard || typeof gsap === 'undefined') return;
    gsap.to(_dom.authCard, {
      keyframes: [
        { x: -9, duration: 0.07 },
        { x:  9, duration: 0.07 },
        { x: -6, duration: 0.06 },
        { x:  6, duration: 0.06 },
        { x:  0, duration: 0.06 }
      ]
    });
  }

  /* ========================
     DEMO PANEL
     ======================== */
  function toggleDemoPanel() {
    if (!_dom.demoPanel) return;
    var isOpen = _dom.demoPanel.classList.toggle('open');
    if (_dom.demoPanelHdr) {
      _dom.demoPanelHdr.setAttribute('aria-expanded', String(isOpen));
    }

    if (isOpen && typeof gsap !== 'undefined') {
      gsap.from('.demo-account', {
        y: 6, opacity: 0, stagger: 0.05, duration: 0.25, ease: 'power1.out'
      });
    }
  }

  function fillDemoAccount(id, pwd, role) {
    if (_dom.userId) _dom.userId.value = id;
    switchRole(role); /* updates visibility before we try to show password */
    if (role !== 'student' && _dom.password) {
      _dom.password.value = pwd;
      _dom.password.type  = 'text';
      var icon = _dom.togglePwd && _dom.togglePwd.querySelector('.material-symbols-rounded');
      if (icon) icon.textContent = 'visibility_off';
    }

    var animTargets = [_dom.userId];
    if (role !== 'student' && _dom.password) animTargets.push(_dom.password);
    if (typeof gsap !== 'undefined' && animTargets.length) {
      gsap.fromTo(
        animTargets,
        { backgroundColor: '#EFF6FF' },
        { backgroundColor: '', duration: 0.6, ease: 'power1.out' }
      );
    }

    if (_dom.userId) _dom.userId.focus();
  }

  /* ========================
     REMEMBER ME RESTORE
     ======================== */
  function loadRemembered() {
    var stored = localStorage.getItem('aca_remember_hint');
    if (!stored) return;
    try {
      var hint = JSON.parse(stored);
      if (_dom.userId && hint.userId)   _dom.userId.value = hint.userId;
      if (_dom.rememberMe)              _dom.rememberMe.checked = true;
      if (hint.role)                    switchRole(hint.role);
    } catch (err) {}
  }

  /* ========================
     ENTRANCE ANIMATIONS
     ======================== */
  function runEntranceAnimation() {
    /* CSS handles the card fade-in via @keyframes authCardIn (always works,
       never leaves elements at opacity:0 if GSAP fails). GSAP adds only
       decorative positional slide-ins on child elements — no opacity hiding. */
    if (typeof gsap === 'undefined') return;

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.from('.brand-logo',         { x: -18, duration: 0.45, delay: 0.35 })
      .from('.brand-illustration', { scale: 0.88, duration: 0.55, ease: 'back.out(1.4)' }, '-=0.3')
      .from('.brand-feature',      { x: -14, stagger: 0.09, duration: 0.38 }, '-=0.28')
      .from('.auth-form-header',   { y: 12, duration: 0.4 }, '-=0.4')
      .from('.role-selector',      { y: 8, duration: 0.32 }, '-=0.22')
      .from('.form-group',         { y: 8, stagger: 0.06, duration: 0.3 }, '-=0.2')
      .from('.form-row',           { y: 6, duration: 0.26 }, '-=0.16')
      .from('.login-btn',          { y: 6, duration: 0.28, ease: 'back.out(1.5)' }, '-=0.1')
      .from('.demo-panel',         { y: 5, duration: 0.24 }, '-=0.1');

    /* Idle pulse on login button */
    gsap.to('.login-btn:not(.loading):not(.success)', {
      boxShadow: '0 14px 40px rgba(37,99,235,0.38)',
      duration: 1.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
      delay: 1.6
    });
  }

})();
