(function () {
  'use strict';

  var session = null;

  var AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#D97706','#059669','#DC2626','#0891B2'];

  var XP_LEVELS = [
    { level:1, name:'มือใหม่',   min:0    },
    { level:2, name:'ผู้เรียนรู้', min:300  },
    { level:3, name:'นักสำรวจ',  min:600  },
    { level:4, name:'นักพัฒนา', min:1000 },
    { level:5, name:'AI Master', min:1500 }
  ];

  /* Mock class data — replaced by real API in production */
  var MOCK_STUDENTS = [
    { userId:'STD003', name:'มาริสา นาคทอง',    xp:1200, completedMissions:[1,2,3], badges:['first_login','mission1_complete','mission2_complete','mission3_complete'] },
    { userId:'STD004', name:'พีรพัฒน์ สุขศรี',  xp:950,  completedMissions:[1,2],   badges:['first_login','mission1_complete','mission2_complete'] },
    { userId:'STD005', name:'กรกช วงศ์ดี',       xp:720,  completedMissions:[1,2],   badges:['first_login','mission1_complete','mission2_complete'] },
    { userId:'STD006', name:'ณัฐกานต์ แสงทอง',  xp:650,  completedMissions:[1],     badges:['first_login','mission1_complete'] },
    { userId:'STD002', name:'ปภัสรา คงดี',       xp:500,  completedMissions:[1],     badges:['first_login','mission1_complete'] },
    { userId:'STD007', name:'ชญาภา รัตนกูล',     xp:300,  completedMissions:[1],     badges:['first_login','mission1_complete'] },
    { userId:'STD008', name:'ธนภัทร จันทร์แดง',  xp:150,  completedMissions:[],      badges:['first_login'] },
    { userId:'STD009', name:'อาทิตยา สมใจ',      xp:100,  completedMissions:[],      badges:['first_login'] },
    { userId:'STD010', name:'วรรณิสา พรมมา',     xp:50,   completedMissions:[],      badges:['first_login'] }
  ];

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  async function init() {
    session = AuthService.requireRole(['student']);
    if (!session) return;
    _setupNav();

    /* Production: fetch live leaderboard from GAS via GoogleSheetService */
    if (window.GoogleSheetService &&
        window.AppConfig && window.AppConfig.ENVIRONMENT === 'production') {
      try {
        var result = await GoogleSheetService.getLeaderboard();
        if (result.ok && Array.isArray(result.data)) {
          _renderMyRank(result.data);
          _renderPodium(result.data);
          _renderTable(result.data);
          _renderUpdateTime();
          _animate(result.data);
          return;
        }
      } catch (_) { /* fall through to mock */ }
    }

    _buildAndRender();
  }

  /* ═══════════════════════════════════
     NAV
  ═══════════════════════════════════ */
  function _setupNav() {
    var initial  = (session.name || '?').charAt(0).toUpperCase();
    var colorIdx = Math.abs(_hashStr(session.userId || '')) % AVATAR_COLORS.length;
    var avatarEl = document.getElementById('navAvatar');
    var nameEl   = document.getElementById('navName');
    if (avatarEl) { avatarEl.textContent = initial; avatarEl.style.background = AVATAR_COLORS[colorIdx]; }
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
     BUILD LEADERBOARD
  ═══════════════════════════════════ */
  function _buildAndRender() {
    /* Merge session user into the class list */
    var students = MOCK_STUDENTS.filter(function (s) { return s.userId !== session.userId; });
    students.push({
      userId:            session.userId,
      name:              session.name,
      xp:                session.xp || 0,
      completedMissions: session.completedMissions || [],
      badges:            session.badges || []
    });

    /* Sort: xp DESC, missions DESC */
    students.sort(function (a, b) {
      if (b.xp !== a.xp) return b.xp - a.xp;
      return (b.completedMissions.length) - (a.completedMissions.length);
    });

    /* Assign ranks */
    var ranked = students.map(function (s, i) {
      var lvl = _calcLevel(s.xp);
      var colorIdx = Math.abs(_hashStr(s.userId || '')) % AVATAR_COLORS.length;
      return Object.assign({}, s, {
        rank: i + 1,
        level: lvl.level,
        levelName: lvl.name,
        avatarColor: AVATAR_COLORS[colorIdx],
        initial: (s.name || '?').charAt(0).toUpperCase(),
        isMe: s.userId === session.userId
      });
    });

    _renderMyRank(ranked);
    _renderPodium(ranked);
    _renderTable(ranked);
    _renderUpdateTime();
    _animate(ranked);
  }

  /* ═══════════════════════════════════
     MY RANK BANNER
  ═══════════════════════════════════ */
  function _renderMyRank(ranked) {
    var me = ranked.find(function (s) { return s.isMe; });
    if (!me) return;

    var posEl    = document.getElementById('lbMyPos');
    var avatarEl = document.getElementById('lbMyAvatar');
    var nameEl   = document.getElementById('lbMyName');
    var xpEl     = document.getElementById('lbMyXP');
    var missEl   = document.getElementById('lbMyMissions');
    var changeEl = document.getElementById('lbMyChange');

    if (posEl) posEl.textContent = '#' + me.rank;
    if (avatarEl) { avatarEl.textContent = me.initial; avatarEl.style.background = me.avatarColor; }
    if (nameEl) nameEl.textContent = me.name;
    if (xpEl) xpEl.textContent = me.xp.toLocaleString();
    if (missEl) missEl.textContent = me.completedMissions.length + '/5';

    if (changeEl) {
      /* In dev mode, simulate rank changes */
      var prevRank = parseInt(sessionStorage.getItem('aca_prev_rank_' + session.userId), 10);
      if (!prevRank) {
        sessionStorage.setItem('aca_prev_rank_' + session.userId, String(me.rank));
        changeEl.textContent = '★ ใหม่';
        changeEl.className = 'lb-my-change lb-my-change--up';
      } else if (me.rank < prevRank) {
        changeEl.textContent = '↑ ' + (prevRank - me.rank);
        changeEl.className = 'lb-my-change lb-my-change--up';
      } else if (me.rank > prevRank) {
        changeEl.textContent = '↓ ' + (me.rank - prevRank);
        changeEl.className = 'lb-my-change lb-my-change--down';
      } else {
        changeEl.textContent = '—';
        changeEl.className = 'lb-my-change';
      }
    }
  }

  /* ═══════════════════════════════════
     PODIUM
  ═══════════════════════════════════ */
  function _renderPodium(ranked) {
    var slots = [
      { slotId: 1, avatarId: 'lbPod1Avatar', nameId: 'lbPod1Name', xpId: 'lbPod1XP' },
      { slotId: 2, avatarId: 'lbPod2Avatar', nameId: 'lbPod2Name', xpId: 'lbPod2XP' },
      { slotId: 3, avatarId: 'lbPod3Avatar', nameId: 'lbPod3Name', xpId: 'lbPod3XP' }
    ];

    slots.forEach(function (slot) {
      var student = ranked[slot.slotId - 1];
      var avatarEl = document.getElementById(slot.avatarId);
      var nameEl   = document.getElementById(slot.nameId);
      var xpEl     = document.getElementById(slot.xpId);
      if (!student) return;

      if (avatarEl) {
        avatarEl.textContent = student.initial;
        avatarEl.style.background = student.isMe
          ? 'linear-gradient(135deg,#FBBF24,#F59E0B)'
          : student.avatarColor;
        if (student.isMe) avatarEl.style.border = '3px solid #fff';
      }
      if (nameEl) nameEl.textContent = student.name + (student.isMe ? ' (ฉัน)' : '');
      if (xpEl) xpEl.textContent = student.xp.toLocaleString() + ' XP';
    });
  }

  /* ═══════════════════════════════════
     TABLE
  ═══════════════════════════════════ */
  function _renderTable(ranked) {
    var tbody = document.getElementById('lbTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    ranked.forEach(function (s) {
      var tr = document.createElement('tr');
      tr.className = 'lb-row' +
        (s.isMe ? ' lb-row--me' : '') +
        (s.rank === 1 ? ' lb-row--top1' : '');
      tr.setAttribute('aria-label', 'อันดับ ' + s.rank + ': ' + s.name + ' ' + s.xp + ' XP');

      var rankHtml;
      if (s.rank === 1) rankHtml = '<span class="lb-rank-medal--1" aria-label="อันดับ 1">🥇</span>';
      else if (s.rank === 2) rankHtml = '<span class="lb-rank-medal--2" aria-label="อันดับ 2">🥈</span>';
      else if (s.rank === 3) rankHtml = '<span class="lb-rank-medal--3" aria-label="อันดับ 3">🥉</span>';
      else rankHtml = '<span class="lb-rank-num">' + s.rank + '</span>';

      var changeHtml = '<span class="lb-change-badge lb-change-badge--same" aria-label="ไม่เปลี่ยนแปลง">—</span>';
      if (s.isMe && s.rank <= 3) {
        changeHtml = '<span class="lb-change-badge lb-change-badge--up" aria-label="อันดับสูงขึ้น">↑ ใหม่</span>';
      }

      tr.innerHTML =
        '<td class="lb-td lb-td--rank">' + rankHtml + '</td>' +
        '<td class="lb-td">' +
          '<div class="lb-player-cell">' +
            '<div class="lb-player-avatar" style="background:' + s.avatarColor + '" aria-hidden="true">' + s.initial + '</div>' +
            '<div class="lb-player-info">' +
              '<span class="lb-player-name">' + _esc(s.name) + '</span>' +
              (s.isMe ? '<span class="lb-player-me-tag" aria-label="นี่คือคุณ">ฉัน</span>' : '') +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td class="lb-td"><span class="lb-level-chip">Lv.' + s.level + ' ' + _esc(s.levelName) + '</span></td>' +
        '<td class="lb-td"><span class="lb-xp-val">' + s.xp.toLocaleString() + '</span></td>' +
        '<td class="lb-td">' + s.completedMissions.length + '/5</td>' +
        '<td class="lb-td lb-td--change">' + changeHtml + '</td>';

      tbody.appendChild(tr);
    });
  }

  function _renderUpdateTime() {
    var el = document.getElementById('lbUpdateTime');
    if (!el) return;
    var now = new Date();
    el.textContent = 'อัปเดตล่าสุด: ' + now.toLocaleDateString('th-TH', { day:'numeric', month:'long', year:'numeric' });
  }

  /* ═══════════════════════════════════
     LEVEL CALC
  ═══════════════════════════════════ */
  function _calcLevel(xp) {
    var lvl = XP_LEVELS[0];
    for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= XP_LEVELS[i].min) { lvl = XP_LEVELS[i]; break; }
    }
    return lvl;
  }

  /* ═══════════════════════════════════
     ANIMATIONS
  ═══════════════════════════════════ */
  function _animate(ranked) {
    if (typeof gsap === 'undefined') return;
    var tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.lb-hero', { opacity: 0, y: -20, duration: .5 })
      .from('.lb-my-rank', { opacity: 0, y: 20, duration: .5 }, '-=.2');

    /* Podium entrance */
    gsap.from('#lbPod2', { opacity: 0, y: 40, duration: .6, delay: .4, ease: 'back.out(1.2)' });
    gsap.from('#lbPod1', { opacity: 0, y: 50, duration: .7, delay: .6, ease: 'back.out(1.4)' });
    gsap.from('#lbPod3', { opacity: 0, y: 35, duration: .6, delay: .5, ease: 'back.out(1.2)' });

    /* Table rows stagger */
    var rows = document.querySelectorAll('#lbTableBody .lb-row');
    if (rows.length) {
      gsap.from(rows, { opacity: 0, x: -20, stagger: .05, duration: .4, delay: .9, ease: 'power2.out' });
    }

    /* XP counter for my rank */
    var xpEl = document.getElementById('lbMyXP');
    var myXp = session.xp || 0;
    if (xpEl && myXp) {
      var obj = { v: 0 };
      gsap.to(obj, {
        v: myXp, duration: 1.2, delay: .3,
        onUpdate: function () { xpEl.textContent = Math.round(obj.v).toLocaleString(); }
      });
    }
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
