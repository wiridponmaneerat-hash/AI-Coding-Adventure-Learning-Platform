/* ============================================================
   AI Coding Adventure — home.js
   Student Home Dashboard Controller
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS — Mission Data
     ============================================================ */
  var MISSIONS = [
    {
      id: 1,
      num: '01',
      title: 'สวัสดีโลก! Hello, World!',
      desc: 'เริ่มต้นการผจญภัยด้วยการเขียนโปรแกรมแรกของคุณ เรียนรู้การใช้ print() และตัวแปร',
      icon: 'terminal',
      emoji: '🌱',
      color: '#22C55E',
      colorBg: 'linear-gradient(135deg,#22C55E,#16A34A)',
      difficulty: 'beginner',
      diffLabel: 'ง่าย',
      diffClass: 'diff-beginner',
      xp: 100,
      time: '20 นาที',
      topics: ['print()', 'ตัวแปร', 'ชนิดข้อมูล'],
      steps: 5,
    },
    {
      id: 2,
      num: '02',
      title: 'เงื่อนไขและการตัดสินใจ',
      desc: 'สอน AI ให้ตัดสินใจได้! เรียนรู้ if / elif / else และ Boolean',
      icon: 'account_tree',
      emoji: '🔀',
      color: '#3B82F6',
      colorBg: 'linear-gradient(135deg,#3B82F6,#2563EB)',
      difficulty: 'beginner',
      diffLabel: 'ง่าย',
      diffClass: 'diff-beginner',
      xp: 150,
      time: '25 นาที',
      topics: ['if/else', 'Boolean', 'การเปรียบเทียบ'],
      steps: 6,
    },
    {
      id: 3,
      num: '03',
      title: 'วนซ้ำกับ Loop',
      desc: 'สั่งให้ AI ทำงานซ้ำๆ อย่างชาญฉลาด เรียนรู้ for loop และ while loop',
      icon: 'loop',
      emoji: '🔄',
      color: '#A855F7',
      colorBg: 'linear-gradient(135deg,#A855F7,#7C3AED)',
      difficulty: 'intermediate',
      diffLabel: 'ปานกลาง',
      diffClass: 'diff-intermediate',
      xp: 200,
      time: '30 นาที',
      topics: ['for loop', 'while loop', 'range()'],
      steps: 7,
    },
    {
      id: 4,
      num: '04',
      title: 'ฟังก์ชั่น — สร้างเครื่องมือของตัวเอง',
      desc: 'สร้าง "ทักษะ" ให้ AI! เรียนรู้ def และ return เพื่อประหยัดโค้ด',
      icon: 'functions',
      emoji: '⚙️',
      color: '#F59E0B',
      colorBg: 'linear-gradient(135deg,#F59E0B,#D97706)',
      difficulty: 'intermediate',
      diffLabel: 'ปานกลาง',
      diffClass: 'diff-intermediate',
      xp: 250,
      time: '35 นาที',
      topics: ['def', 'return', 'parameters'],
      steps: 8,
    },
    {
      id: 5,
      num: '05',
      title: 'AI สร้างได้! — Mini Project',
      desc: 'ใช้ทุกที่เรียนมาสร้าง Mini AI ของตัวเอง โปรเจกต์สุดท้ายที่ท้าทายที่สุด!',
      icon: 'smart_toy',
      emoji: '🤖',
      color: '#EF4444',
      colorBg: 'linear-gradient(135deg,#EF4444,#DC2626)',
      difficulty: 'advanced',
      diffLabel: 'ยาก',
      diffClass: 'diff-advanced',
      xp: 350,
      time: '45 นาที',
      topics: ['Mini AI', 'Input/Output', 'Logic'],
      steps: 10,
    },
  ];

  /* ============================================================
     CONSTANTS — Badge Definitions
     ============================================================ */
  var BADGES = [
    {
      id: 'first_login',
      icon: 'login',
      label: 'นักผจญภัยใหม่',
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.12)',
    },
    {
      id: 'mission1_complete',
      icon: 'terminal',
      label: 'Hello World',
      color: '#22C55E',
      bg: 'rgba(34,197,94,0.12)',
    },
    {
      id: 'mission2_complete',
      icon: 'account_tree',
      label: 'นักตัดสินใจ',
      color: '#60A5FA',
      bg: 'rgba(96,165,250,0.12)',
    },
    {
      id: 'mission3_complete',
      icon: 'loop',
      label: 'ราชา Loop',
      color: '#A855F7',
      bg: 'rgba(168,85,247,0.12)',
    },
    {
      id: 'mission4_complete',
      icon: 'functions',
      label: 'นักสร้างฟังก์ชั่น',
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.12)',
    },
    {
      id: 'mission5_complete',
      icon: 'smart_toy',
      label: 'สร้าง AI แล้ว!',
      color: '#EF4444',
      bg: 'rgba(239,68,68,0.12)',
    },
    {
      id: 'top_student',
      icon: 'military_tech',
      label: 'นักเรียนดีเด่น',
      color: '#FBBF24',
      bg: 'rgba(251,191,36,0.15)',
    },
  ];

  /* ============================================================
     CONSTANTS — XP Level Table
     ============================================================ */
  var XP_LEVELS = [
    { level: 1, name: 'มือใหม่',      min: 0,    max: 299  },
    { level: 2, name: 'ผู้เรียนรู้',  min: 300,  max: 599  },
    { level: 3, name: 'นักสำรวจ',    min: 600,  max: 999  },
    { level: 4, name: 'นักพัฒนา',    min: 1000, max: 1499 },
    { level: 5, name: 'AI Master',   min: 1500, max: 9999  },
  ];

  /* ============================================================
     AI RECOMMENDATION MESSAGES
     ============================================================ */
  /* ============================================================
     CONSTANTS — Leaderboard (mock classmates)
     ============================================================ */
  var CLASS_LEADERBOARD = [
    { name:'มาริสา นาคทอง',   xp:1200, level:4, missions:3, avatar:'ม' },
    { name:'พีรพัฒน์ สุขศรี', xp:950,  level:3, missions:2, avatar:'พ' },
    { name:'นภัสสร สุขใจ',   xp:850,  level:3, missions:2, avatar:'น' },
    { name:'กรกช วงศ์ดี',     xp:720,  level:3, missions:2, avatar:'ก' },
    { name:'ณัฐกานต์ แสงทอง',xp:650,  level:3, missions:1, avatar:'ณ' },
  ];

  /* ============================================================
     CONSTANTS — Coding Tips
     ============================================================ */
  var CODING_TIPS = [
    {
      code: 'print("สวัสดีโลก!")',
      tip: 'ใช้ print() เพื่อแสดงผลข้อความออกมาที่หน้าจอ — เหมือนการส่งข้อความให้คอมพิวเตอร์บอกกับโลก 🌍',
      tag: 'Python Basics'
    },
    {
      code: 'if score >= 60:\n    print("ผ่าน!")',
      tip: 'if/else คือการสอน AI ให้ตัดสินใจได้ด้วยตัวเอง เหมือนการตั้งกฎให้ผู้ช่วยอัจฉริยะ 🤔',
      tag: 'Conditions'
    },
    {
      code: 'for i in range(5):\n    print(i)',
      tip: 'for loop ช่วยให้ไม่ต้องเขียนโค้ดซ้ำๆ สั่งให้คอมทำงาน 1,000 ครั้งด้วยโค้ดแค่ 2 บรรทัด! 🔄',
      tag: 'Loops'
    },
    {
      code: 'def greet(name):\n    return "สวัสดี " + name',
      tip: 'Function เปรียบเหมือนสูตรอาหารที่ใช้ซ้ำได้ สร้างครั้งเดียว เรียกใช้ได้ไม่จำกัด ⚙️',
      tag: 'Functions'
    },
    {
      code: 'name = input("ชื่อของคุณ: ")\nprint("Hi", name)',
      tip: 'input() ทำให้โปรแกรมโต้ตอบกับผู้ใช้ได้ นี่คือจุดเริ่มต้นของ AI ที่แท้จริง! 🤖',
      tag: 'Input/Output'
    },
  ];

  var AI_MESSAGES = [
    {
      missions: 0,
      title: 'ยินดีต้อนรับ! 🎉',
      msg: 'สวัสดีนักผจญภัย! คุณพร้อมเริ่มการเดินทางสู่โลกของ AI แล้วหรือยัง? Mission 1 รอคุณอยู่!',
      action: 'เริ่ม Mission 1',
      missionId: 1,
    },
    {
      missions: 1,
      title: 'ผ่าน Mission 1 แล้ว! 🌟',
      msg: 'เยี่ยมมาก! คุณเรียนรู้ print() และตัวแปรแล้ว ถึงเวลาฝึกการตัดสินใจกับ if/else ใน Mission 2!',
      action: 'ไป Mission 2',
      missionId: 2,
    },
    {
      missions: 2,
      title: 'สองด่านผ่านแล้ว! 🔥',
      msg: 'โค้ดเริ่มสนุกขึ้นแล้วใช่ไหม? Mission 3 จะสอนให้คุณใช้ Loop วนซ้ำอย่างชาญฉลาด — ไปลุยเลย!',
      action: 'ไป Mission 3',
      missionId: 3,
    },
    {
      missions: 3,
      title: 'ครึ่งทางแล้ว! 💪',
      msg: 'คุณเก่งมากๆ! Mission 4 จะสอนให้สร้าง function ของตัวเอง เปรียบเสมือนการสร้างเครื่องมือพิเศษ!',
      action: 'ไป Mission 4',
      missionId: 4,
    },
    {
      missions: 4,
      title: 'เกือบถึงจุดหมาย! 🚀',
      msg: 'คุณเรียนรู้มาเยอะมากแล้ว! Mission สุดท้ายรอคุณอยู่ — สร้าง Mini AI ของตัวเองได้เลย!',
      action: 'Mission สุดท้าย!',
      missionId: 5,
    },
    {
      missions: 5,
      title: 'สำเร็จทุก Mission แล้ว! 🏆',
      msg: 'ยอดเยี่ยมที่สุด! คุณพิชิตทุก Mission แล้ว ลองรีวิว Mission ที่ชอบ หรือรอ Mission ใหม่ที่กำลังจะมา!',
      action: 'ดู Portfolio',
      missionId: null,
    },
  ];

  /* ============================================================
     STATE
     ============================================================ */
  var _user = null;
  var _aiMsgIndex = 0;
  var _mobileMenuOpen = false;
  var _tipIndex = 0;

  /* ============================================================
     UTILS
     ============================================================ */
  function _getLevelInfo(xp) {
    var info = XP_LEVELS[0];
    for (var i = 0; i < XP_LEVELS.length; i++) {
      if (xp >= XP_LEVELS[i].min) {
        info = XP_LEVELS[i];
      }
    }
    return info;
  }

  function _getXpProgress(xp) {
    var info = _getLevelInfo(xp);
    var range = info.max - info.min;
    var current = xp - info.min;
    return Math.min(Math.round((current / range) * 100), 100);
  }

  function _getNextLevel(xp) {
    var info = _getLevelInfo(xp);
    for (var i = 0; i < XP_LEVELS.length; i++) {
      if (XP_LEVELS[i].level === info.level + 1) {
        return XP_LEVELS[i];
      }
    }
    return null;
  }

  function _getGreeting() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'อรุณสวัสดิ์';
    if (h >= 12 && h < 17) return 'สวัสดีตอนบ่าย';
    if (h >= 17 && h < 21) return 'สวัสดีตอนเย็น';
    return 'สวัสดีตอนดึก';
  }

  function _getTimeChip() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return { icon: 'wb_sunny', label: 'ช่วงเช้า' };
    if (h >= 12 && h < 17) return { icon: 'light_mode', label: 'ช่วงบ่าย' };
    if (h >= 17 && h < 21) return { icon: 'wb_twilight', label: 'ช่วงเย็น' };
    return { icon: 'bedtime', label: 'ช่วงดึก' };
  }

  function _getNextMissionId(completedMissions) {
    for (var i = 0; i < MISSIONS.length; i++) {
      if (!_inArray(MISSIONS[i].id, completedMissions)) {
        return MISSIONS[i].id;
      }
    }
    return null;
  }

  function _inArray(val, arr) {
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === val) return true;
    }
    return false;
  }

  function _hasBadge(badgeId, earned) {
    return _inArray(badgeId, earned);
  }

  function _getAIMessage(completedCount) {
    var idx = Math.min(completedCount, AI_MESSAGES.length - 1);
    return AI_MESSAGES[idx];
  }

  function _todayDate() {
    var d = new Date();
    var th = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
               'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return d.getDate() + ' ' + th[d.getMonth()] + ' ' + (d.getFullYear() + 543);
  }

  function _formatXP(n) {
    return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
  }

  /* ============================================================
     AUTH GUARD
     ============================================================ */
  function _init() {
    if (!window.AuthService) {
      window.location.href = 'login.html';
      return;
    }
    if (!AuthService.requireRole(['student'])) return;

    _user = AuthService.getCurrentUser();
    if (!_user) {
      window.location.href = 'login.html';
      return;
    }

    _aiMsgIndex = Math.min(
      (_user.completedMissions || []).length,
      AI_MESSAGES.length - 1
    );

    _render();
    _bindEvents();
    _runEntranceAnimation();
  }

  /* ============================================================
     RENDER ORCHESTRATOR
     ============================================================ */
  function _render() {
    _renderNav();
    _renderWelcome();
    _renderStats();
    _renderTodaysMission();
    _renderXPCard();
    _renderMissions();
    _renderBadges();
    _renderAIRecommendation();
    _renderMiniLeaderboard();
    _renderTip();
    _renderActivity();
  }

  /* ============================================================
     NAV
     ============================================================ */
  function _renderNav() {
    var avatar = document.getElementById('navAvatar');
    var name   = document.getElementById('navName');
    var role   = document.getElementById('navRole');

    if (avatar) avatar.textContent = (_user.avatar || _user.name.charAt(0)).toUpperCase();
    if (name)   name.textContent   = _user.name;
    if (role)   role.textContent   = 'นักเรียน';
  }

  /* ============================================================
     WELCOME CARD
     ============================================================ */
  function _renderWelcome() {
    var greeting = document.getElementById('welcomeGreeting');
    var nameEl   = document.getElementById('welcomeName');
    var classEl  = document.getElementById('welcomeClass');
    var timeChipEl = document.querySelector('.wm-chip:nth-of-type(2)');
    var timeEl   = document.getElementById('welcomeTime');
    var levelEl  = document.getElementById('levelLabel');
    var levelNm  = document.getElementById('levelName');
    var xpEl     = document.getElementById('xpLabel');
    var avatarEl = document.getElementById('welcomeAvatar');
    var streakEl = document.getElementById('streakText');

    var lvInfo  = _getLevelInfo(_user.xp || 0);
    var time    = _getTimeChip();
    var totalXP = _user.xp || 0;

    if (greeting) greeting.textContent = _getGreeting() + ', ';
    if (nameEl)   nameEl.textContent   = _user.name;
    if (classEl)  classEl.textContent  = _user.class || 'ป.5';
    if (timeEl) timeEl.textContent = time.label;
    if (timeChipEl) {
      var iconSpan = timeChipEl.querySelector('.material-symbols-rounded');
      if (iconSpan) iconSpan.textContent = time.icon;
    }
    if (levelEl) levelEl.textContent = 'Level ' + lvInfo.level;
    if (levelNm) levelNm.textContent = lvInfo.name;
    if (xpEl)    xpEl.textContent    = _formatXP(totalXP) + ' XP';
    if (avatarEl) avatarEl.textContent = (_user.avatar || _user.name.charAt(0)).toUpperCase();
    if (streakEl) streakEl.textContent = '🔥 สตรีค 5 วัน';
  }

  /* ============================================================
     STATISTICS ROW
     ============================================================ */
  function _renderStats() {
    var completed = (_user.completedMissions || []).length;
    var totalMissions = MISSIONS.length;
    var avgScore = completed > 0 ? Math.round(72 + (completed * 5.4)) : 0;
    var totalXP  = _user.xp || 0;
    var badgeCount = (_user.badges || []).length;

    var vals = {
      statMissionsVal : String(completed) + '/' + totalMissions,
      statScoreVal    : avgScore + '%',
      statXPVal       : _formatXP(totalXP),
      statBadgesVal   : String(badgeCount),
    };

    Object.keys(vals).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = vals[id];
    });

    /* Animate counters once visible */
    var counted = false;
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !counted) {
        counted = true;
        _animateCounters(completed, totalMissions, avgScore, totalXP, badgeCount);
        observer.disconnect();
      }
    }, { threshold: 0.3 });

    var row = document.querySelector('.stats-row');
    if (row) observer.observe(row);
  }

  function _animateCounters(completed, total, score, xp, badges) {
    if (typeof gsap === 'undefined') return;

    var counters = [
      { id: 'statMissionsVal', from: 0, to: completed, suffix: '/' + total, decimals: 0 },
      { id: 'statScoreVal',    from: 0, to: score,     suffix: '%',         decimals: 0 },
      { id: 'statXPVal',       from: 0, to: xp,        suffix: ' XP',       decimals: 0 },
      { id: 'statBadgesVal',   from: 0, to: badges,    suffix: '',          decimals: 0 },
    ];

    counters.forEach(function (c) {
      var el = document.getElementById(c.id);
      if (!el) return;
      var obj = { val: c.from };
      gsap.to(obj, {
        val: c.to,
        duration: 1.6,
        ease: 'power3.out',
        onUpdate: function () {
          var display = c.id === 'statXPVal'
            ? _formatXP(Math.round(obj.val)) + ' XP'
            : Math.round(obj.val) + c.suffix;
          el.textContent = display;
        },
      });
    });
  }

  /* ============================================================
     TODAY'S MISSION CARD
     ============================================================ */
  function _renderTodaysMission() {
    var card = document.getElementById('todayCard');
    if (!card) return;

    var dateEl = document.getElementById('todayDate');
    if (dateEl) dateEl.textContent = _todayDate();

    var completedMissions = _user.completedMissions || [];
    var nextId = _getNextMissionId(completedMissions);

    if (nextId === null) {
      /* All done */
      var body = card.querySelector('.today-body');
      if (body) {
        body.innerHTML = '<div class="today-all-done">' +
          '<span class="material-symbols-rounded">celebration</span>' +
          '<strong>ผ่านทุก Mission แล้ว!</strong>' +
          '<p>คุณสำเร็จการผจญภัยครบทุกด่านแล้ว เยี่ยมมาก!</p>' +
          '</div>';
      }
      var footer = card.querySelector('.today-footer-row');
      if (footer) footer.style.display = 'none';
      return;
    }

    var m = null;
    for (var i = 0; i < MISSIONS.length; i++) {
      if (MISSIONS[i].id === nextId) { m = MISSIONS[i]; break; }
    }
    if (!m) return;

    var iconEl  = document.getElementById('todayIcon');
    var diffEl  = document.getElementById('todayDiff');
    var titleEl = document.getElementById('todayTitle');
    var descEl  = document.getElementById('todayDesc');
    var xpEl    = document.getElementById('todayXP');
    var timeEl  = document.getElementById('todayTime');
    var btnEl   = document.getElementById('todayBtn');

    if (iconEl) {
      iconEl.style.background = m.colorBg;
      iconEl.querySelector('.material-symbols-rounded').textContent = m.icon;
    }
    if (diffEl) {
      diffEl.textContent = m.diffLabel;
      diffEl.className = 'today-diff-badge ' + m.diffClass;
    }
    if (titleEl) titleEl.textContent = m.title;
    if (descEl)  descEl.textContent  = m.desc;
    if (xpEl)    xpEl.textContent    = '+' + m.xp + ' XP';
    if (timeEl)  timeEl.textContent  = m.time;
    if (btnEl) {
      btnEl.textContent = '';
      btnEl.innerHTML   = '<span class="material-symbols-rounded">play_arrow</span> เริ่มเลย!';
      btnEl.setAttribute('href', 'mission-detail.html?id=' + m.id);
    }
  }

  /* ============================================================
     XP PROGRESS CARD
     ============================================================ */
  function _renderXPCard() {
    var xp       = _user.xp || 0;
    var lvInfo   = _getLevelInfo(xp);
    var nextLv   = _getNextLevel(xp);
    var pct      = _getXpProgress(xp);
    var needed   = nextLv ? (nextLv.min - xp) : 0;

    var curLvEl  = document.getElementById('xpdCurrentLevel');
    var barEl    = document.getElementById('xpdBarFill');
    var minEl    = document.getElementById('xpdMin');
    var curEl    = document.getElementById('xpdCurrent');
    var maxEl    = document.getElementById('xpdMax');
    var nextNmEl = document.getElementById('xpdNextLevel');
    var needEl   = document.getElementById('xpdNeeded');
    var circleEl = document.getElementById('xpFillCircle');
    var numEl    = document.getElementById('xpCircleNum');

    if (curLvEl) curLvEl.textContent = 'Level ' + lvInfo.level + ' · ' + lvInfo.name;
    if (minEl)   minEl.textContent   = lvInfo.min + ' XP';
    if (curEl)   curEl.textContent   = xp + ' XP';
    if (maxEl)   maxEl.textContent   = lvInfo.max + ' XP';
    if (nextNmEl) nextNmEl.textContent = nextLv ? nextLv.name : 'MAX';
    if (needEl)  needEl.textContent  = nextLv ? ('อีก ' + needed + ' XP') : 'ถึง MAX Level แล้ว!';
    if (numEl)   numEl.textContent   = xp;

    /* Animate SVG ring + bar on scroll */
    var animated = false;
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && !animated) {
        animated = true;
        _animateXPRing(pct, circleEl, barEl, numEl, xp);
        observer.disconnect();
      }
    }, { threshold: 0.4 });

    var xpCard = document.querySelector('.xp-card');
    if (xpCard) observer.observe(xpCard);
  }

  function _animateXPRing(pct, circleEl, barEl, numEl, xp) {
    var circumference = 314.16; /* 2 * Math.PI * 50 */

    /* SVG ring */
    if (circleEl) {
      var offset = circumference * (1 - pct / 100);
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(circleEl,
          { strokeDashoffset: circumference },
          { strokeDashoffset: offset, duration: 1.4, ease: 'power3.out' }
        );
      } else {
        circleEl.style.strokeDashoffset = offset;
      }
    }

    /* Bar */
    if (barEl) {
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(barEl,
          { width: '0%' },
          { width: pct + '%', duration: 1.4, ease: 'power3.out' }
        );
      } else {
        barEl.style.width = pct + '%';
      }
    }

    /* Counter in circle */
    if (numEl && typeof gsap !== 'undefined') {
      var obj = { val: 0 };
      gsap.to(obj, {
        val: xp,
        duration: 1.4,
        ease: 'power3.out',
        onUpdate: function () { numEl.textContent = Math.round(obj.val); },
      });
    }
  }

  /* ============================================================
     MISSIONS GRID
     ============================================================ */
  function _renderMissions() {
    var grid = document.getElementById('missionsGrid');
    if (!grid) return;

    var completedMissions = _user.completedMissions || [];
    var nextId = _getNextMissionId(completedMissions);
    grid.innerHTML = '';

    MISSIONS.forEach(function (m) {
      var isCompleted = _inArray(m.id, completedMissions);
      var isCurrent   = m.id === nextId;
      var isLocked    = !isCompleted && !isCurrent;

      var statusClass = isCompleted ? 'mission-card--completed'
                      : isCurrent   ? 'mission-card--current'
                      : 'mission-card--locked';

      var statusBadge = isCompleted ? '<span class="mc-status-badge mcstatus--done"><span class="material-symbols-rounded">check_circle</span>เสร็จแล้ว</span>'
                      : isCurrent   ? '<span class="mc-status-badge mcstatus--current"><span class="material-symbols-rounded">play_circle</span>ทำได้เลย</span>'
                      : '<span class="mc-status-badge mcstatus--locked"><span class="material-symbols-rounded">lock</span>ล็อก</span>';

      var progress = isCompleted ? 100 : isCurrent ? 0 : 0;

      var btnHTML;
      if (isCompleted) {
        btnHTML = '<a href="mission-detail.html?id=' + m.id + '" class="mc-btn mc-btn--review">'
                + '<span class="material-symbols-rounded">replay</span>รีวิว</a>';
      } else if (isCurrent) {
        btnHTML = '<a href="mission-detail.html?id=' + m.id + '" class="mc-btn mc-btn--start">'
                + '<span class="material-symbols-rounded">play_arrow</span>เริ่มเลย</a>';
      } else {
        btnHTML = '<button class="mc-btn mc-btn--locked" disabled>'
                + '<span class="material-symbols-rounded">lock</span>ล็อก</button>';
      }

      var lockOverlay = isLocked
        ? '<div class="mc-lock-overlay"><span class="material-symbols-rounded">lock</span></div>'
        : '';

      var card = document.createElement('div');
      card.className = 'mission-card ' + statusClass;
      card.setAttribute('data-mission', m.id);
      card.innerHTML =
        statusBadge +
        '<div class="mc-num">' + m.num + '</div>' +
        '<div class="mc-icon" style="background:' + m.colorBg + '">' +
          '<span class="material-symbols-rounded">' + m.icon + '</span>' +
        '</div>' +
        '<span class="mc-diff ' + m.diffClass + '">' + m.diffLabel + '</span>' +
        '<div class="mc-title">' + m.title + '</div>' +
        '<div class="mc-progress-wrap">' +
          '<div class="mc-progress-bar">' +
            '<div class="mc-progress-fill" style="background:' + m.colorBg + ';width:' + progress + '%"></div>' +
          '</div>' +
          '<div class="mc-progress-labels">' +
            '<span>' + (isCompleted ? 'เสร็จสมบูรณ์' : isLocked ? 'ยังไม่ถึง' : 'พร้อมแล้ว') + '</span>' +
            '<span>' + (isCompleted ? '100%' : '0%') + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="mc-meta">' +
          '<span class="mc-xp"><span class="material-symbols-rounded">bolt</span>+' + m.xp + ' XP</span>' +
        '</div>' +
        btnHTML +
        lockOverlay;

      grid.appendChild(card);
    });

    /* Animate mission cards on scroll */
    _animateMissions();
  }

  function _animateMissions() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    var cards = document.querySelectorAll('.mission-card');
    if (!cards.length) return;

    gsap.from(cards, {
      opacity: 0,
      y: 32,
      scale: 0.96,
      duration: 0.55,
      ease: 'power3.out',
      stagger: 0.08,
      scrollTrigger: {
        trigger: '.missions-grid',
        start: 'top 85%',
        once: true,
      },
    });
  }

  /* ============================================================
     BADGES
     ============================================================ */
  function _renderBadges() {
    var grid = document.getElementById('badgesGrid');
    if (!grid) return;

    var earned = _user.badges || [];
    grid.innerHTML = '';

    BADGES.forEach(function (b) {
      var isEarned = _hasBadge(b.id, earned);
      var item = document.createElement('div');
      item.className = 'badge-item ' + (isEarned ? 'badge-item--earned' : 'badge-item--locked');
      item.title = b.label + (isEarned ? ' (ได้รับแล้ว)' : ' (ยังไม่ได้รับ)');

      var checkMark = isEarned
        ? '<span class="badge-earned-check"><span class="material-symbols-rounded">check</span></span>'
        : '';

      item.innerHTML =
        '<div class="badge-icon-wrap" style="' + (isEarned ? 'background:' + b.bg + ';border-color:' + b.color + ';' : '') + '">' +
          '<span class="material-symbols-rounded" style="' + (isEarned ? 'color:' + b.color + ';' : '') + '">' + b.icon + '</span>' +
          checkMark +
        '</div>' +
        '<span class="badge-label">' + b.label + '</span>';

      grid.appendChild(item);
    });

    /* Update badge count text */
    var countEl = document.getElementById('badgeCountText');
    if (countEl) countEl.textContent = earned.length + ' / ' + BADGES.length + ' เหรียญ';

    /* Animate on scroll */
    _animateBadges();
  }

  function _animateBadges() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    var items = document.querySelectorAll('.badge-item--earned');
    if (!items.length) return;

    gsap.from(items, {
      opacity: 0,
      scale: 0.6,
      duration: 0.45,
      ease: 'back.out(1.7)',
      stagger: 0.07,
      scrollTrigger: {
        trigger: '.badges-grid',
        start: 'top 88%',
        once: true,
      },
    });
  }

  /* ============================================================
     MINI LEADERBOARD
     ============================================================ */
  function _renderMiniLeaderboard() {
    var list = document.getElementById('miniLbList');
    if (!list) return;

    var MEDAL = ['🥇','🥈','🥉'];
    var COLORS = ['#FBBF24','#94A3B8','#D97706'];

    /* Merge user into leaderboard and sort */
    var lb = CLASS_LEADERBOARD.slice();
    var userEntry = {
      name: _user.name,
      xp: _user.xp || 0,
      level: _getLevelInfo(_user.xp || 0).level,
      missions: (_user.completedMissions || []).length,
      avatar: (_user.name || '?').charAt(0).toUpperCase(),
      isMe: true,
    };
    lb.push(userEntry);
    lb.sort(function (a, b) { return b.xp - a.xp; });

    list.innerHTML = '';
    lb.slice(0, 3).forEach(function (entry, idx) {
      var li = document.createElement('li');
      li.className = 'mini-lb-item' + (entry.isMe ? ' mini-lb-item--me' : '');
      li.innerHTML =
        '<span class="mini-lb-rank">' + MEDAL[idx] + '</span>' +
        '<div class="mini-lb-avatar" style="border-color:' + COLORS[idx] + '">' + entry.avatar + '</div>' +
        '<div class="mini-lb-info">' +
          '<span class="mini-lb-name">' + entry.name + (entry.isMe ? ' <span class="mini-lb-you">(คุณ)</span>' : '') + '</span>' +
          '<span class="mini-lb-meta">Lv.' + entry.level + ' · ' + entry.missions + ' Mission' + '</span>' +
        '</div>' +
        '<span class="mini-lb-xp">' + (entry.xp).toLocaleString() + ' XP</span>';
      list.appendChild(li);
    });
  }

  /* ============================================================
     CODING TIPS
     ============================================================ */
  function _renderTip() {
    _showTip(_tipIndex);
  }

  function _showTip(idx) {
    var body    = document.getElementById('tipBody');
    var counter = document.getElementById('tipCounter');
    if (!body) return;

    var tip = CODING_TIPS[idx];
    body.innerHTML =
      '<div class="tip-tag">' + tip.tag + '</div>' +
      '<pre class="tip-code"><code>' + tip.code + '</code></pre>' +
      '<p class="tip-text">' + tip.tip + '</p>';

    if (counter) counter.textContent = (idx + 1) + ' / ' + CODING_TIPS.length;
  }

  /* ============================================================
     AI RECOMMENDATION
     ============================================================ */
  function _renderAIRecommendation() {
    var completedCount = (_user.completedMissions || []).length;
    var msg = _getAIMessage(completedCount);

    var titleEl  = document.getElementById('aiTitle');
    var msgEl    = document.getElementById('aiMessage');
    var actionEl = document.getElementById('aiActionBtn');
    var labelEl  = document.getElementById('aiActionLabel');

    if (titleEl)  titleEl.textContent = msg.title;
    if (msgEl)    msgEl.textContent   = msg.msg;
    if (labelEl)  labelEl.textContent = msg.action;

    if (actionEl) {
      if (msg.missionId) {
        actionEl.setAttribute('href', 'mission-detail.html?id=' + msg.missionId);
      } else {
        actionEl.setAttribute('href', 'portfolio.html');
      }
    }
  }

  /* ============================================================
     RECENT ACTIVITY
     ============================================================ */
  function _renderActivity() {
    var list = document.getElementById('activityList');
    if (!list) return;

    var completedMissions = _user.completedMissions || [];
    var activities = [];

    completedMissions.forEach(function (mId) {
      var m = null;
      for (var i = 0; i < MISSIONS.length; i++) {
        if (MISSIONS[i].id === mId) { m = MISSIONS[i]; break; }
      }
      if (!m) return;
      activities.push({
        icon: m.icon,
        color: m.color,
        bg: 'rgba(' + _hexToRgb(m.color) + ',0.12)',
        title: 'ผ่าน Mission ' + m.id + ': ' + m.title,
        desc: 'ได้รับ ' + m.xp + ' XP',
        time: mId === completedMissions[completedMissions.length - 1] ? 'ล่าสุด' : mId + ' วันที่แล้ว',
      });
    });

    /* Add login activity */
    activities.unshift({
      icon: 'login',
      color: '#3B82F6',
      bg: 'rgba(59,130,246,0.1)',
      title: 'เข้าสู่ระบบ',
      desc: 'ยินดีต้อนรับกลับ ' + _user.name,
      time: 'เมื่อกี้',
    });

    if (!activities.length) {
      list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:.875rem">ยังไม่มีกิจกรรม</div>';
      return;
    }

    list.innerHTML = '';
    activities.slice(0, 5).forEach(function (a) {
      var item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML =
        '<div class="activity-icon" style="background:' + a.bg + '">' +
          '<span class="material-symbols-rounded" style="color:' + a.color + '">' + a.icon + '</span>' +
        '</div>' +
        '<div class="activity-body">' +
          '<div class="activity-title">' + a.title + '</div>' +
          '<div class="activity-desc">' + a.desc + '</div>' +
        '</div>' +
        '<span class="activity-time">' + a.time + '</span>';
      list.appendChild(item);
    });
  }

  function _hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? parseInt(result[1], 16) + ',' + parseInt(result[2], 16) + ',' + parseInt(result[3], 16)
      : '0,0,0';
  }

  /* ============================================================
     BIND EVENTS
     ============================================================ */
  function _bindEvents() {
    /* Logout */
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        AuthService.logout();
      });
    }

    /* Hamburger */
    var hamburger = document.getElementById('hnHamburger');
    var links = document.getElementById('hnMenu');
    if (hamburger && links) {
      hamburger.addEventListener('click', function () {
        _mobileMenuOpen = !_mobileMenuOpen;
        hamburger.classList.toggle('open', _mobileMenuOpen);
        links.classList.toggle('open', _mobileMenuOpen);
        hamburger.setAttribute('aria-expanded', String(_mobileMenuOpen));
      });
    }

    /* Close mobile menu on link click */
    var navLinks = document.querySelectorAll('.hn-link');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        if (_mobileMenuOpen) {
          _mobileMenuOpen = false;
          if (hamburger) {
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
          }
          if (links) links.classList.remove('open');
        }
      });
    });

    /* Tips navigation */
    var tipPrev = document.getElementById('tipPrev');
    var tipNext = document.getElementById('tipNext');
    if (tipPrev) {
      tipPrev.addEventListener('click', function () {
        _tipIndex = (_tipIndex - 1 + CODING_TIPS.length) % CODING_TIPS.length;
        _showTip(_tipIndex);
      });
    }
    if (tipNext) {
      tipNext.addEventListener('click', function () {
        _tipIndex = (_tipIndex + 1) % CODING_TIPS.length;
        _showTip(_tipIndex);
      });
    }

    /* AI Refresh */
    var refreshBtn = document.getElementById('aiRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', function () {
        _rotateAIMessage();
      });
    }

    /* Mission card click (locked — shake) */
    document.addEventListener('click', function (e) {
      var card = e.target.closest('.mission-card--locked');
      if (card) {
        e.preventDefault();
        _shakeElement(card);
      }
    });

    /* Navbar scroll effect */
    window.addEventListener('scroll', function () {
      var nav = document.getElementById('homeNav');
      if (nav) {
        nav.style.boxShadow = window.scrollY > 10
          ? '0 4px 24px rgba(0,0,0,0.1)'
          : '';
      }
    }, { passive: true });

    /* Notification panel */
    (function () {
      var btn = document.querySelector('.hn-notif-btn');
      if (!btn) return;
      var panel = document.createElement('div');
      panel.className = 'notif-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'การแจ้งเตือน');
      panel.innerHTML =
        '<div class="notif-panel-hdr"><span class="notif-panel-title">การแจ้งเตือน</span></div>' +
        '<div class="notif-panel-body" id="notifPanelBody"></div>';
      btn.parentElement.appendChild(panel);

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
        if (open) _renderNotifPanel(panel.querySelector('#notifPanelBody'));
      });

      document.addEventListener('click', function (e) {
        if (!panel.contains(e.target) && e.target !== btn) {
          panel.classList.remove('open');
          btn.setAttribute('aria-expanded', 'false');
        }
      }, true);
    })();
  }

  function _renderNotifPanel(body) {
    if (!body) return;
    var items = [];
    var cm = (_user && _user.completedMissions) ? _user.completedMissions : [];
    cm.slice(-3).reverse().forEach(function (mid) {
      var m = MISSIONS.filter(function (x) { return x.id === mid; })[0];
      if (!m) return;
      items.push({
        iconClass: 'notif-icon--mission',
        icon: 'check_circle',
        title: 'ภารกิจสำเร็จ! ' + m.title,
        sub: 'รับ +' + m.xp + ' XP'
      });
    });
    var badges = (_user && _user.badges) ? _user.badges : [];
    if (badges.length) {
      items.unshift({
        iconClass: 'notif-icon--badge',
        icon: 'emoji_events',
        title: 'ได้รับ Badge ใหม่',
        sub: 'สะสมทั้งหมด ' + badges.length + ' เหรียญ'
      });
    }
    if (!items.length) {
      body.innerHTML =
        '<div class="notif-empty">' +
        '<span class="material-symbols-rounded">notifications_off</span>' +
        '<p class="notif-empty-txt">ไม่มีการแจ้งเตือนใหม่</p>' +
        '</div>';
      return;
    }
    body.innerHTML = items.map(function (it) {
      return '<div class="notif-item">' +
        '<div class="notif-icon ' + it.iconClass + '">' +
        '<span class="material-symbols-rounded">' + it.icon + '</span>' +
        '</div>' +
        '<div class="notif-body">' +
        '<div class="notif-body-title">' + it.title + '</div>' +
        '<div class="notif-body-sub">' + it.sub + '</div>' +
        '</div></div>';
    }).join('');
  }

  function _rotateAIMessage() {
    var completedCount = (_user.completedMissions || []).length;
    _aiMsgIndex = (_aiMsgIndex + 1) % (completedCount + 2 <= AI_MESSAGES.length ? completedCount + 2 : AI_MESSAGES.length);
    var msg = AI_MESSAGES[_aiMsgIndex];

    var titleEl  = document.getElementById('aiTitle');
    var msgEl    = document.getElementById('aiMessage');
    var actionEl = document.getElementById('aiActionBtn');
    var labelEl  = document.getElementById('aiActionLabel');

    if (typeof gsap !== 'undefined') {
      var card = document.querySelector('.ai-chat-bubble');
      gsap.to(card, { opacity: 0, y: -6, duration: 0.18, onComplete: function () {
        if (titleEl)  titleEl.textContent = msg.title;
        if (msgEl)    msgEl.textContent   = msg.msg;
        if (labelEl)  labelEl.textContent = msg.action;
        if (actionEl) actionEl.setAttribute('href', msg.missionId ? 'mission-detail.html?id=' + msg.missionId : 'portfolio.html');
        gsap.to(card, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
      }});
    } else {
      if (titleEl)  titleEl.textContent = msg.title;
      if (msgEl)    msgEl.textContent   = msg.msg;
      if (labelEl)  labelEl.textContent = msg.action;
    }

    /* Spin refresh icon */
    var refreshBtn = document.getElementById('aiRefreshBtn');
    if (refreshBtn && typeof gsap !== 'undefined') {
      gsap.to(refreshBtn, { rotation: 360, duration: 0.5, ease: 'power2.inOut', onComplete: function () {
        gsap.set(refreshBtn, { rotation: 0 });
      }});
    }
  }

  function _shakeElement(el) {
    if (typeof gsap === 'undefined') return;
    gsap.killTweensOf(el);
    gsap.to(el, {
      keyframes: [
        { x: -8, duration: 0.06 },
        { x: 8,  duration: 0.06 },
        { x: -6, duration: 0.06 },
        { x: 6,  duration: 0.06 },
        { x: 0,  duration: 0.06 },
      ],
    });
  }

  /* ============================================================
     ENTRANCE ANIMATION
     ============================================================ */
  function _runEntranceAnimation() {
    if (typeof gsap === 'undefined') return;
    if (typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
    }

    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    /* Nav */
    tl.from('#homeNav', { y: -60, opacity: 0, duration: 0.55 });

    /* Welcome card */
    tl.from('.welcome-card', { y: 40, opacity: 0, duration: 0.6, scale: 0.98 }, '-=0.25');

    /* Stats row */
    tl.from('.stat-card', {
      y: 30,
      opacity: 0,
      duration: 0.45,
      stagger: 0.09,
    }, '-=0.25');

    /* Mid row */
    tl.from(['.today-card', '.xp-card'], {
      y: 30,
      opacity: 0,
      duration: 0.5,
      stagger: 0.12,
    }, '-=0.1');

    /* Missions section heading */
    tl.from('.missions-section .section-hdr', {
      y: 20,
      opacity: 0,
      duration: 0.4,
    }, '-=0.1');

    /* ScrollTrigger for bottom sections */
    gsap.from('.bottom-row > *', {
      opacity: 0,
      y: 36,
      duration: 0.55,
      stagger: 0.14,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.bottom-row',
        start: 'top 85%',
        once: true,
      },
    });

    gsap.from('.activity-section', {
      opacity: 0,
      y: 30,
      duration: 0.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.activity-section',
        start: 'top 88%',
        once: true,
      },
    });

    /* Welcome avatar float */
    gsap.to('.welcome-avatar', {
      y: -6,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    });

    /* AI status dot pulse (handled by CSS, ensure initial state) */
    gsap.from('.ai-rec-card', {
      opacity: 0,
      y: 28,
      duration: 0.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.ai-rec-card',
        start: 'top 88%',
        once: true,
      },
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
