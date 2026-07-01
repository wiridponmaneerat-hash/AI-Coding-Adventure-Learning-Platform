(function () {
  'use strict';

  var session = null;

  var AVATAR_COLORS = [
    { value: '#2563EB', label: 'น้ำเงิน'  },
    { value: '#7C3AED', label: 'ม่วง'     },
    { value: '#DB2777', label: 'ชมพู'     },
    { value: '#D97706', label: 'ส้ม'      },
    { value: '#059669', label: 'เขียว'    },
    { value: '#DC2626', label: 'แดง'      },
    { value: '#0891B2', label: 'ฟ้า'      },
    { value: '#0F172A', label: 'ดำ'       }
  ];

  var XP_LEVELS = [
    { level:1, name:'มือใหม่',   min:0,    max:299  },
    { level:2, name:'ผู้เรียนรู้', min:300,  max:599  },
    { level:3, name:'นักสำรวจ',  min:600,  max:999  },
    { level:4, name:'นักพัฒนา', min:1000, max:1499 },
    { level:5, name:'AI Master', min:1500, max:99999 }
  ];

  var MISSION_DATA = [
    { id:1, title:'Hello, World!',    icon:'terminal', colorBg:'linear-gradient(135deg,#22C55E,#16A34A)' },
    { id:2, title:'Conditions',       icon:'account_tree', colorBg:'linear-gradient(135deg,#3B82F6,#2563EB)' },
    { id:3, title:'Loops',            icon:'loop',     colorBg:'linear-gradient(135deg,#A855F7,#7C3AED)' },
    { id:4, title:'Functions',        icon:'functions',colorBg:'linear-gradient(135deg,#F59E0B,#D97706)' },
    { id:5, title:'Mini AI Project',  icon:'smart_toy',colorBg:'linear-gradient(135deg,#EF4444,#DC2626)' }
  ];

  var BADGE_DATA = null; /* loaded lazily */

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  function init() {
    session = AuthService.requireRole(['student']);
    if (!session) return;
    _setupNav();
    _renderProfileCard();
    _setupTabs();
    _renderInfoPanel();
    _renderBadgesPanel();
    _renderSettingsPanel();
    _setupProfileForm();
    _setupPasswordForm();
    _animateEntrance();
    _loadBadges();
  }

  /* ═══════════════════════════════════
     NAV
  ═══════════════════════════════════ */
  function _setupNav() {
    var initial  = (session.name || '?').charAt(0).toUpperCase();
    var color    = session.avatarColor || AVATAR_COLORS[0].value;
    var colorIdx = Math.abs(_hashStr(session.userId || '')) % AVATAR_COLORS.length;
    if (!session.avatarColor) color = AVATAR_COLORS[colorIdx].value;

    var avatarEl = document.getElementById('navAvatar');
    var nameEl   = document.getElementById('navName');
    if (avatarEl) { avatarEl.textContent = initial; avatarEl.style.background = color; }
    if (nameEl) nameEl.textContent = session.name || 'นักเรียน';

    var hamburger = document.getElementById('hnHamburger');
    var menu      = document.getElementById('hnMenu');
    if (hamburger && menu) {
      hamburger.addEventListener('click', function () {
        var open = menu.classList.toggle('hn-links--open');
        hamburger.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', function (e) {
        if (!hamburger.contains(e.target) && !menu.contains(e.target)) {
          menu.classList.remove('hn-links--open');
          hamburger.setAttribute('aria-expanded', 'false');
        }
      });
    }
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', function () { AuthService.logout(); });
  }

  /* ═══════════════════════════════════
     PROFILE CARD
  ═══════════════════════════════════ */
  function _renderProfileCard() {
    var xp        = session.xp || 0;
    var level     = _calcLevel(xp);
    var completed = (session.completedMissions || []).length;
    var badges    = (session.badges || []).length;

    /* Avatar */
    var avatarEl = document.getElementById('prAvatar');
    var ringEl   = document.getElementById('prAvatarRing');
    var color    = session.avatarColor || _defaultColor();
    if (avatarEl) { avatarEl.textContent = (session.name || '?').charAt(0).toUpperCase(); avatarEl.style.background = color; }
    if (ringEl) ringEl.style.background = 'linear-gradient(135deg,' + color + ',rgba(255,255,255,.3))';

    /* Name & badges */
    var nameEl     = document.getElementById('prName');
    var levelBadge = document.getElementById('prLevelBadge');
    var levelName  = document.getElementById('prLevelName');
    var idChip     = document.getElementById('prIdChip');
    if (nameEl) nameEl.textContent = session.name || 'นักเรียน';
    if (levelBadge) levelBadge.textContent = 'ระดับ ' + level.level;
    if (levelName) levelName.textContent = level.name;
    if (idChip) idChip.textContent = 'ID: ' + (session.userId || '—');

    /* Stats */
    var xpEl      = document.getElementById('prStatXP');
    var missEl    = document.getElementById('prStatMissions');
    var badgeEl   = document.getElementById('prStatBadges');
    var scoreEl   = document.getElementById('prStatScore');
    if (xpEl) xpEl.textContent = xp.toLocaleString();
    if (missEl) missEl.textContent = completed;
    if (badgeEl) badgeEl.textContent = badges;
    if (scoreEl) scoreEl.textContent = completed > 0 ? (Math.min(100, Math.round(70 + completed * 6))) + '%' : '—';

    /* XP bar */
    var xpCurEl  = document.getElementById('prXpCurrent');
    var xpNextEl = document.getElementById('prXpNext');
    var xpFillEl = document.getElementById('prXpFill');
    var pct;
    if (level.level < 5) {
      var levelObj = XP_LEVELS[level.level - 1];
      var nextObj  = XP_LEVELS[level.level];
      var range = nextObj.min - levelObj.min;
      var progress = xp - levelObj.min;
      pct = Math.min(100, Math.round(progress / range * 100));
      if (xpCurEl) xpCurEl.textContent = xp.toLocaleString() + ' XP';
      if (xpNextEl) xpNextEl.textContent = 'ระดับ ' + nextObj.level + ': ' + nextObj.min.toLocaleString() + ' XP';
    } else {
      pct = 100;
      if (xpCurEl) xpCurEl.textContent = xp.toLocaleString() + ' XP';
      if (xpNextEl) xpNextEl.textContent = 'ระดับสูงสุดแล้ว! 🏆';
    }
    if (xpFillEl) {
      if (typeof gsap !== 'undefined') {
        gsap.to(xpFillEl, { width: pct + '%', duration: 1.2, ease: 'power2.out', delay: .5 });
      } else {
        xpFillEl.style.width = pct + '%';
      }
    }

    /* Avatar edit */
    var editBtn = document.getElementById('prAvatarEditBtn');
    if (editBtn) editBtn.addEventListener('click', function () {
      var tabBtn = document.querySelector('[data-tab="settings"]');
      if (tabBtn) tabBtn.click();
      document.getElementById('prAvatarColors') && document.getElementById('prAvatarColors').scrollIntoView({ behavior:'smooth' });
    });
  }

  /* ═══════════════════════════════════
     TABS
  ═══════════════════════════════════ */
  function _setupTabs() {
    var tabs = document.querySelectorAll('.pr-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) {
          t.classList.remove('pr-tab--active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('pr-tab--active');
        tab.setAttribute('aria-selected', 'true');

        var panelId = 'panel' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1);
        document.querySelectorAll('.pr-tab-panel').forEach(function (p) { p.hidden = true; });
        var panel = document.getElementById(panelId);
        if (panel) panel.hidden = false;
      });
    });
  }

  /* ═══════════════════════════════════
     INFO PANEL
  ═══════════════════════════════════ */
  function _renderInfoPanel() {
    /* Pre-fill form */
    var nameInput     = document.getElementById('prInputName');
    var classInput    = document.getElementById('prInputClass');
    var nicknameInput = document.getElementById('prInputNickname');
    var emailInput    = document.getElementById('prInputEmail');
    var bioInput      = document.getElementById('prInputBio');

    if (nameInput) nameInput.value = session.name || '';
    if (classInput) classInput.value = session.class || 'ป.5/1';
    if (nicknameInput) nicknameInput.value = session.nickname || '';
    if (emailInput) emailInput.value = session.email || '';
    if (bioInput) bioInput.value = session.bio || '';

    /* Mission progress list */
    var listEl = document.getElementById('prMissionList');
    if (!listEl) return;
    listEl.innerHTML = '';
    var completed = session.completedMissions || [];

    MISSION_DATA.forEach(function (m) {
      var isDone   = completed.indexOf(m.id) !== -1;
      var isLocked = !isDone && (m.id !== 1 && completed.indexOf(m.id - 1) === -1);

      var item = document.createElement('div');
      item.className = 'pr-mission-item' +
        (isDone ? ' pr-mission-item--completed' : '') +
        (isLocked ? ' pr-mission-item--locked' : '');

      item.innerHTML =
        '<div class="pr-mission-icon" style="background:' + m.colorBg + '" aria-hidden="true">' +
          '<span class="material-symbols-rounded">' + m.icon + '</span>' +
        '</div>' +
        '<div class="pr-mission-info">' +
          '<p class="pr-mission-name">Mission ' + m.id + ': ' + _esc(m.title) + '</p>' +
          '<span class="pr-mission-status' + (isDone ? ' pr-mission-status--done' : '') + '">' +
            (isDone ? '✅ ผ่านแล้ว' : (isLocked ? '🔒 ยังล็อกอยู่' : '▶ กำลังเรียน')) +
          '</span>' +
        '</div>' +
        '<div class="pr-mission-check ' + (isDone ? 'pr-mission-check--done' : 'pr-mission-check--pending') + '" aria-hidden="true">' +
          '<span class="material-symbols-rounded">' + (isDone ? 'check' : 'radio_button_unchecked') + '</span>' +
        '</div>';

      listEl.appendChild(item);
    });
  }

  /* ═══════════════════════════════════
     BADGES PANEL
  ═══════════════════════════════════ */
  function _loadBadges() {
    fetch('../data/badges.json')
      .then(function (r) { return r.json(); })
      .then(function (data) { BADGE_DATA = data; _renderBadgeGrid(); })
      .catch(function () {});
  }

  function _renderBadgesPanel() {
    var countEl = document.getElementById('prBadgeCount');
    var earned  = (session.badges || []).length;
    if (countEl) countEl.textContent = earned + ' / 10 เหรียญ';
  }

  function _renderBadgeGrid() {
    var gridEl  = document.getElementById('prBadgesGrid');
    var countEl = document.getElementById('prBadgeCount');
    if (!gridEl || !BADGE_DATA) return;

    var earned = session.badges || [];
    gridEl.innerHTML = '';

    if (countEl) countEl.textContent = earned.length + ' / ' + BADGE_DATA.length + ' เหรียญ';

    BADGE_DATA.forEach(function (b) {
      var isEarned = earned.indexOf(b.code) !== -1;
      var item     = document.createElement('div');
      item.className = 'pr-badge-item' + (isEarned ? ' pr-badge-item--earned' : ' pr-badge-item--locked');
      item.setAttribute('role', 'img');
      item.setAttribute('aria-label', b.name + (isEarned ? ' (ได้รับแล้ว)' : ' (ยังไม่ได้รับ)'));
      item.setAttribute('title', b.description);

      item.innerHTML =
        '<div class="pr-badge-rarity pr-badge-rarity--' + (b.rarity || 'common') + '" aria-hidden="true"></div>' +
        '<div class="pr-badge-icon" style="background:' + (isEarned ? b.colorBg : 'linear-gradient(135deg,#94A3B8,#64748B)') + '" aria-hidden="true">' +
          '<span class="material-symbols-rounded">' + b.icon + '</span>' +
        '</div>' +
        '<span class="pr-badge-name">' + _esc(b.name) + '</span>';

      gridEl.appendChild(item);
    });
  }

  /* ═══════════════════════════════════
     SETTINGS PANEL
  ═══════════════════════════════════ */
  function _renderSettingsPanel() {
    var colorsEl = document.getElementById('prAvatarColors');
    if (!colorsEl) return;
    colorsEl.innerHTML = '';

    var currentColor = session.avatarColor || _defaultColor();

    AVATAR_COLORS.forEach(function (c) {
      var btn = document.createElement('button');
      btn.className = 'pr-avatar-color-btn' + (c.value === currentColor ? ' pr-avatar-color-btn--active' : '');
      btn.style.background = c.value;
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', 'เลือกสี ' + c.label);
      btn.setAttribute('title', c.label);
      btn.textContent = (session.name || '?').charAt(0).toUpperCase();

      btn.addEventListener('click', function () {
        colorsEl.querySelectorAll('.pr-avatar-color-btn').forEach(function (b) { b.classList.remove('pr-avatar-color-btn--active'); });
        btn.classList.add('pr-avatar-color-btn--active');

        /* Update avatar preview */
        var av = document.getElementById('prAvatar');
        var navAv = document.getElementById('navAvatar');
        if (av) av.style.background = c.value;
        if (navAv) navAv.style.background = c.value;

        AuthService.updateSession({ avatarColor: c.value });
        session = AuthService.getCurrentUser();
        _showToast('เปลี่ยนสี Avatar แล้ว!', 'check_circle');
      });

      colorsEl.appendChild(btn);
    });

    /* Logout button in settings */
    var logoutPrBtn = document.getElementById('prLogoutBtn');
    if (logoutPrBtn) logoutPrBtn.addEventListener('click', function () { AuthService.logout(); });
  }

  /* ═══════════════════════════════════
     PROFILE FORM
  ═══════════════════════════════════ */
  function _setupProfileForm() {
    var form      = document.getElementById('prForm');
    var errorEl   = document.getElementById('prFormError');
    var successEl = document.getElementById('prFormSuccess');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorEl) errorEl.hidden = true;
      if (successEl) successEl.hidden = true;

      var name     = (document.getElementById('prInputName') || {}).value || '';
      var nickname = (document.getElementById('prInputNickname') || {}).value || '';
      var email    = (document.getElementById('prInputEmail') || {}).value || '';
      var bio      = (document.getElementById('prInputBio') || {}).value || '';

      if (!name.trim()) {
        if (errorEl) { errorEl.textContent = 'กรุณาใส่ชื่อ'; errorEl.hidden = false; }
        return;
      }

      AuthService.updateSession({ name: name.trim(), nickname: nickname.trim(), email: email.trim(), bio: bio.trim() });
      session = AuthService.getCurrentUser();

      /* Update nav */
      var navName = document.getElementById('navName');
      if (navName) navName.textContent = session.name;
      var navAv = document.getElementById('navAvatar');
      if (navAv) navAv.textContent = (session.name || '?').charAt(0).toUpperCase();

      /* Update profile card name */
      var nameEl = document.getElementById('prName');
      if (nameEl) nameEl.textContent = session.name;

      if (successEl) { successEl.textContent = 'บันทึกข้อมูลสำเร็จ ✅'; successEl.hidden = false; }
      _showToast('บันทึกข้อมูลสำเร็จ!', 'check_circle');
      if (typeof AnalyticsService !== 'undefined') {
        AnalyticsService.logEvent('profile_update', { fields: ['name','nickname','email','bio'] });
      }
    });
  }

  /* ═══════════════════════════════════
     PASSWORD FORM
  ═══════════════════════════════════ */
  function _setupPasswordForm() {
    var form    = document.getElementById('prPasswordForm');
    var errEl   = document.getElementById('prPassError');
    var succEl  = document.getElementById('prPassSuccess');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errEl) errEl.hidden = true;
      if (succEl) succEl.hidden = true;

      var oldPass  = (document.getElementById('prOldPass') || {}).value || '';
      var newPass  = (document.getElementById('prNewPass') || {}).value || '';
      var confirm  = (document.getElementById('prConfirmPass') || {}).value || '';

      if (!oldPass) {
        if (errEl) { errEl.textContent = 'กรุณาใส่รหัสผ่านเดิม'; errEl.hidden = false; } return;
      }
      if (newPass.length < 6) {
        if (errEl) { errEl.textContent = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'; errEl.hidden = false; } return;
      }
      if (newPass !== confirm) {
        if (errEl) { errEl.textContent = 'รหัสผ่านใหม่ไม่ตรงกัน'; errEl.hidden = false; } return;
      }

      /* In dev mode: simulate success */
      if (succEl) { succEl.textContent = 'เปลี่ยนรหัสผ่านสำเร็จ ✅'; succEl.hidden = false; }
      form.reset();
      _showToast('เปลี่ยนรหัสผ่านสำเร็จ!', 'lock');
    });
  }

  /* ═══════════════════════════════════
     TOAST
  ═══════════════════════════════════ */
  var toastTimer = null;
  function _showToast(msg, icon) {
    var toast   = document.getElementById('prToast');
    var iconEl  = document.getElementById('prToastIcon');
    var msgEl   = document.getElementById('prToastMsg');
    if (!toast) return;
    if (iconEl) iconEl.textContent = icon || 'check_circle';
    if (msgEl) msgEl.textContent = msg;
    toast.hidden = false;
    toast.classList.add('pr-toast--show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove('pr-toast--show');
      setTimeout(function () { toast.hidden = true; }, 400);
    }, 2800);
  }

  /* ═══════════════════════════════════
     LEVEL & COLOR UTILS
  ═══════════════════════════════════ */
  function _calcLevel(xp) {
    var lvl = XP_LEVELS[0];
    for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= XP_LEVELS[i].min) { lvl = XP_LEVELS[i]; break; }
    }
    return lvl;
  }
  function _defaultColor() {
    var idx = Math.abs(_hashStr(session.userId || '')) % AVATAR_COLORS.length;
    return AVATAR_COLORS[idx].value;
  }

  /* ═══════════════════════════════════
     ANIMATIONS
  ═══════════════════════════════════ */
  function _animateEntrance() {
    if (typeof gsap === 'undefined') return;
    gsap.from('.pr-profile-card', { opacity: 0, y: 30, duration: .6, ease: 'power2.out' });
    gsap.from('.pr-tabs', { opacity: 0, y: 15, duration: .5, delay: .2, ease: 'power2.out' });
    gsap.from('.pr-tab-panel', { opacity: 0, y: 20, duration: .5, delay: .35, ease: 'power2.out' });
  }

  /* ═══════════════════════════════════
     UTILS
  ═══════════════════════════════════ */
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  /* ═══════════════════════════════════
     BOOT
  ═══════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
