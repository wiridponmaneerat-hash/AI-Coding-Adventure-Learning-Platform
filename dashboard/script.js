(function () {
  'use strict';

  var session = null;

  var AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#D97706','#059669','#DC2626','#0891B2','#7C3AED'];

  var XP_LEVELS = [
    { level:1, name:'มือใหม่',   min:0    },
    { level:2, name:'ผู้เรียนรู้', min:300  },
    { level:3, name:'นักสำรวจ',  min:600  },
    { level:4, name:'นักพัฒนา', min:1000 },
    { level:5, name:'AI Master', min:1500 }
  ];

  var MISSION_META = [
    { id:1, name:'Hello World', icon:'🐍', color:'#22C55E', colorBg:'rgba(34,197,94,0.1)'   },
    { id:2, name:'Conditions',  icon:'🔀', color:'#3B82F6', colorBg:'rgba(59,130,246,0.1)'  },
    { id:3, name:'Loops',       icon:'🔄', color:'#A855F7', colorBg:'rgba(168,85,247,0.1)'  },
    { id:4, name:'Functions',   icon:'⚡', color:'#F59E0B', colorBg:'rgba(245,158,11,0.1)'  },
    { id:5, name:'AI Project',  icon:'🤖', color:'#EF4444', colorBg:'rgba(239,68,68,0.1)'   }
  ];

  /* Mock teacher data */
  var MOCK_TEACHERS = [
    { userId:'TCH001', name:'ครูวิริยา สมใจ',  subject:'วิทยาการคำนวณ', classes:['ป.5'] },
    { userId:'TCH002', name:'ครูสมชาย ใจดี',   subject:'คณิตศาสตร์',    classes:['ป.5'] }
  ];

  var _classFilter      = 'all'; /* current class filter for student mgmt */
  var _editingStudentId = null;  /* userId being edited, or null for add */
  var _editingTeacherId = null;

  var MGMT_STU_KEY = 'aca_mgmt_students';
  var MGMT_TCH_KEY = 'aca_mgmt_teachers';

  /* All classes available in the system */
  var ALL_CLASSES = ['ป.5'];

  /* Mock student data — replace with API call in production */
  var MOCK_STUDENTS = [
    { userId:'STD001', name:'นภัสสร สุขใจ',    class:'ป.5', xp:850,  completedMissions:[1,2],     badges:['first_login','mission1_complete','mission2_complete'] },
    { userId:'STD003', name:'มาริสา นาคทอง',   class:'ป.5', xp:1200, completedMissions:[1,2,3],   badges:['first_login','mission1_complete','mission2_complete','mission3_complete'] },
    { userId:'STD004', name:'พีรพัฒน์ สุขศรี', class:'ป.5', xp:950,  completedMissions:[1,2],     badges:['first_login','mission1_complete','mission2_complete'] },
    { userId:'STD005', name:'กรกช วงศ์ดี',      class:'ป.5', xp:720,  completedMissions:[1,2],     badges:['first_login','mission1_complete','mission2_complete'] },
    { userId:'STD006', name:'ณัฐกานต์ แสงทอง', class:'ป.5', xp:650,  completedMissions:[1],       badges:['first_login','mission1_complete'] },
    { userId:'STD002', name:'ปภัสรา คงดี',      class:'ป.5', xp:500,  completedMissions:[1],       badges:['first_login','mission1_complete'] },
    { userId:'STD007', name:'ชญาภา รัตนกูล',    class:'ป.5', xp:300,  completedMissions:[1],       badges:['first_login','mission1_complete'] },
    { userId:'STD008', name:'ธนภัทร จันทร์แดง', class:'ป.5', xp:150,  completedMissions:[],        badges:['first_login'] },
    { userId:'STD009', name:'อาทิตยา สมใจ',     class:'ป.5', xp:100,  completedMissions:[],        badges:['first_login'] },
    { userId:'STD010', name:'วรรณิสา พรมมา',    class:'ป.5', xp:50,   completedMissions:[],        badges:['first_login'] }
  ];

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  async function init() {
    session = AuthService.requireRole(['teacher', 'admin']);
    if (!session) return;
    _setupNav();
    _renderHero();

    /* In production, load real class data from GAS */
    if (window.GoogleSheetService &&
        window.AppConfig && window.AppConfig.ENVIRONMENT === 'production') {
      var classes = Array.isArray(session.classes) ? session.classes : [];
      var result  = await GoogleSheetService.getClassData(session.userId, classes);
      if (result.ok && result.data) {
        var d = result.data;
        _renderStatsFromData(d.stats);
        _renderStudentTableFromData(d.students);
        _renderMissionListFromData(d.stats);
        _renderChartFromData(d.students, d.stats);
        _animate();
        _initRoleUI();
        _setupTabs();
        _initStudentMgmt();
        _initExcelImport();
        if (session.role === 'admin') _initTeacherMgmt();
        _initAIRefresh();
        _initProfileModal();
        _initNotifBtn();
        return;
      }
    }

    /* Fallback: mock data */
    _renderStats();
    _renderStudentTable();
    _renderMissionList();
    _renderChart();
    _renderAIInsights();
    _animate();

    _initRoleUI();
    _setupTabs();
    _initStudentMgmt();
    _initExcelImport();
    if (session.role === 'admin') _initTeacherMgmt();
    _initAIRefresh();
    _initProfileModal();
    _initNotifBtn();
  }

  /* Production-data renderers (same shape as mock renderers but data comes from GAS) */
  function _renderStatsFromData(stats) {
    var studentsEl = document.getElementById('dbStatStudents');
    var missionsEl = document.getElementById('dbStatMissions');
    var avgXpEl    = document.getElementById('dbStatAvgXP');
    var badgesEl   = document.getElementById('dbStatBadges');
    if (studentsEl) studentsEl.textContent = stats.total || 0;
    if (missionsEl) missionsEl.textContent = stats.totalMissions || 0;
    if (avgXpEl)    avgXpEl.textContent    = (stats.avgXP || 0).toLocaleString();
    if (badgesEl)   badgesEl.textContent   = stats.totalBadges || 0;
  }

  function _renderStudentTableFromData(students) {
    var tbody   = document.getElementById('dbStudentBody');
    var countEl = document.getElementById('dbStudentCount');
    if (!tbody) return;
    if (countEl) countEl.textContent = students.length + ' คน';
    tbody.innerHTML = '';
    students.forEach(function (s, idx) {
      var colorIdx = Math.abs(_hashStr(s.userId || '')) % AVATAR_COLORS.length;
      var rank     = s.rank || (idx + 1);
      var lvl      = _calcLevel(s.xp || 0);
      var rankHtml = rank === 1 ? '<span class="db-rank-medal">🥇</span>'
                   : rank === 2 ? '<span class="db-rank-medal">🥈</span>'
                   : rank === 3 ? '<span class="db-rank-medal">🥉</span>'
                   : '<span>' + rank + '</span>';
      var dotsHtml = '<span class="db-missions-chip">';
      for (var m = 1; m <= 5; m++) {
        var done = (s.completedMissions || []).indexOf(m) !== -1;
        dotsHtml += '<span class="db-missions-dot' + (done ? ' db-missions-dot--done' : '') + '"></span>';
      }
      dotsHtml += '</span>';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="db-td db-td--rank">' + rankHtml + '</td>' +
        '<td class="db-td"><div class="db-player-cell"><div class="db-row-avatar" style="background:' + AVATAR_COLORS[colorIdx] + '">' +
          _esc((s.name || '?').charAt(0).toUpperCase()) + '</div><div><p class="db-player-name">' +
          _esc(s.name) + '</p><p class="db-player-class">' + _esc(s.class || '') + '</p></div></div></td>' +
        '<td class="db-td"><span class="db-level-chip">Lv.' + lvl.level + ' ' + _esc(lvl.name) + '</span></td>' +
        '<td class="db-td"><span class="db-xp-val">' + (s.xp || 0).toLocaleString() + '</span></td>' +
        '<td class="db-td">' + dotsHtml + '</td>' +
        '<td class="db-td"><span class="db-badge-count"><span class="material-symbols-rounded" style="font-size:14px">military_tech</span>' +
          (s.badges || []).length + '</span></td>';
      tbody.appendChild(tr);
    });
  }

  function _renderMissionListFromData(stats) {
    var listEl = document.getElementById('dbMissionList');
    if (!listEl) return;
    listEl.innerHTML = '';
    MISSION_META.forEach(function (meta, i) {
      var pct = (stats.missionPcts || [])[i] || 0;
      var li  = document.createElement('li');
      li.className = 'db-mission-item';
      li.innerHTML =
        '<div class="db-mission-icon" style="background:' + meta.colorBg + ';color:' + meta.color + '">' + meta.icon + '</div>' +
        '<div class="db-mission-info"><p class="db-mission-name">' + _esc(meta.name) + '</p></div>' +
        '<div class="db-mission-prog-wrap"><div class="db-mission-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100">' +
          '<div class="db-mission-fill" style="width:0%" data-pct="' + pct + '"></div></div>' +
          '<span class="db-mission-pct">' + pct + '%</span></div>';
      listEl.appendChild(li);
    });
    setTimeout(function () {
      listEl.querySelectorAll('.db-mission-fill').forEach(function (el) {
        el.style.width = el.getAttribute('data-pct') + '%';
      });
    }, 300);
  }

  function _renderChartFromData(students, stats) {
    var canvas = document.getElementById('scoreChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (canvas._chart) { canvas._chart.destroy(); }
    var counts = (stats && stats.missionCounts) || [0,0,0,0,0];
    var n      = students.length || 1;
    var data   = counts.map(function (c) { return Math.round((c / n) * 100); });
    canvas._chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MISSION_META.map(function (m) { return m.icon + ' ' + m.name; }),
        datasets: [{
          label: 'นักเรียนที่ผ่าน (%)',
          data: data,
          backgroundColor: MISSION_META.map(function (m) { return m.colorBg; }),
          borderColor: MISSION_META.map(function (m) { return m.color; }),
          borderWidth: 2, borderRadius: 8,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (ctx) { return ' ผ่าน: ' + ctx.parsed.y + '%'; } } } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Nunito', size: 11 }, callback: function (v) { return v + '%'; } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Nunito', size: 11 } } },
        },
      },
    });
  }

  /* ═══════════════════════════════════
     NAV
  ═══════════════════════════════════ */
  function _setupNav() {
    var avatarEl  = document.getElementById('dbNavAvatar');
    var nameEl    = document.getElementById('dbNavName');
    var subjectEl = document.getElementById('dbNavSubject');
    var logoutBtn = document.getElementById('dbLogout');

    if (avatarEl) {
      var initial = (session.name || '?').charAt(0).toUpperCase();
      avatarEl.textContent = initial;
    }
    if (nameEl) nameEl.textContent = session.name || 'ครู';
    if (subjectEl) subjectEl.textContent = session.subject || 'วิทยาการคำนวณ';
    if (logoutBtn) logoutBtn.addEventListener('click', function () { AuthService.logout(); });
  }

  /* ═══════════════════════════════════
     HERO
  ═══════════════════════════════════ */
  function _renderHero() {
    var heroNameEl    = document.getElementById('dbHeroName');
    var heroClassesEl = document.getElementById('dbHeroClasses');
    var heroDateEl    = document.getElementById('dbHeroDate');

    if (heroNameEl) heroNameEl.textContent = session.name || 'ครู';
    if (heroClassesEl) {
      heroClassesEl.textContent = ALL_CLASSES.join(', ');
    }
    if (heroDateEl) {
      heroDateEl.textContent = new Date().toLocaleDateString('th-TH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }
  }

  /* ═══════════════════════════════════
     STATS
  ═══════════════════════════════════ */
  function _renderStats() {
    var totalStudents   = MOCK_STUDENTS.length;
    var totalMissions   = MOCK_STUDENTS.reduce(function (acc, s) { return acc + s.completedMissions.length; }, 0);
    var totalXP         = MOCK_STUDENTS.reduce(function (acc, s) { return acc + s.xp; }, 0);
    var avgXP           = totalStudents ? Math.round(totalXP / totalStudents) : 0;
    var totalBadges     = MOCK_STUDENTS.reduce(function (acc, s) { return acc + s.badges.length; }, 0);

    var studentsEl = document.getElementById('dbStatStudents');
    var missionsEl = document.getElementById('dbStatMissions');
    var avgXpEl    = document.getElementById('dbStatAvgXP');
    var badgesEl   = document.getElementById('dbStatBadges');

    if (studentsEl) studentsEl.textContent = totalStudents;
    if (missionsEl) missionsEl.textContent = totalMissions;
    if (avgXpEl)    avgXpEl.textContent    = avgXP.toLocaleString();
    if (badgesEl)   badgesEl.textContent   = totalBadges;

    if (typeof gsap !== 'undefined') {
      [
        { el: studentsEl, val: totalStudents },
        { el: missionsEl, val: totalMissions },
        { el: avgXpEl,    val: avgXP },
        { el: badgesEl,   val: totalBadges }
      ].forEach(function (item) {
        if (!item.el) return;
        var obj = { v: 0 };
        gsap.to(obj, {
          v: item.val, duration: 1.2, delay: 0.4,
          onUpdate: function () { item.el.textContent = Math.round(obj.v).toLocaleString(); }
        });
      });
    }
  }

  /* ═══════════════════════════════════
     STUDENT TABLE
  ═══════════════════════════════════ */
  function _renderStudentTable() {
    var tbody     = document.getElementById('dbStudentBody');
    var countEl   = document.getElementById('dbStudentCount');
    if (!tbody) return;

    var sorted = MOCK_STUDENTS.slice().sort(function (a, b) {
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.completedMissions.length - a.completedMissions.length;
    });

    if (countEl) countEl.textContent = sorted.length + ' คน';
    tbody.innerHTML = '';

    sorted.forEach(function (s, idx) {
      var rank = idx + 1;
      var lvl  = _calcLevel(s.xp);
      var colorIdx = Math.abs(_hashStr(s.userId || '')) % AVATAR_COLORS.length;
      var color    = AVATAR_COLORS[colorIdx];

      var rankHtml;
      if (rank === 1)      rankHtml = '<span class="db-rank-medal" aria-label="อันดับ 1">🥇</span>';
      else if (rank === 2) rankHtml = '<span class="db-rank-medal" aria-label="อันดับ 2">🥈</span>';
      else if (rank === 3) rankHtml = '<span class="db-rank-medal" aria-label="อันดับ 3">🥉</span>';
      else                 rankHtml = '<span>' + rank + '</span>';

      /* Mission dots */
      var dotsHtml = '<span class="db-missions-chip" aria-label="ภารกิจที่ผ่าน ' + s.completedMissions.length + ' จาก 5">';
      for (var m = 1; m <= 5; m++) {
        var done = s.completedMissions.indexOf(m) !== -1;
        dotsHtml += '<span class="db-missions-dot' + (done ? ' db-missions-dot--done' : '') + '" aria-hidden="true"></span>';
      }
      dotsHtml += '</span>';

      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="db-td db-td--rank">' + rankHtml + '</td>' +
        '<td class="db-td">' +
          '<div class="db-player-cell">' +
            '<div class="db-row-avatar" style="background:' + color + '" aria-hidden="true">' +
              _esc((s.name || '?').charAt(0).toUpperCase()) +
            '</div>' +
            '<div>' +
              '<p class="db-player-name">' + _esc(s.name) + '</p>' +
              '<p class="db-player-class">' + _esc(s.class || '') + '</p>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td class="db-td"><span class="db-level-chip">Lv.' + lvl.level + ' ' + _esc(lvl.name) + '</span></td>' +
        '<td class="db-td"><span class="db-xp-val">' + s.xp.toLocaleString() + '</span></td>' +
        '<td class="db-td">' + dotsHtml + '</td>' +
        '<td class="db-td">' +
          '<span class="db-badge-count">' +
            '<span class="material-symbols-rounded" aria-hidden="true" style="font-size:14px">military_tech</span>' +
            s.badges.length +
          '</span>' +
        '</td>';
      tbody.appendChild(tr);
    });
  }

  /* ═══════════════════════════════════
     MISSION PROGRESS LIST
  ═══════════════════════════════════ */
  function _renderMissionList() {
    var listEl = document.getElementById('dbMissionList');
    if (!listEl) return;

    var totalStudents = MOCK_STUDENTS.length;
    listEl.innerHTML = '';

    MISSION_META.forEach(function (meta) {
      var completed = MOCK_STUDENTS.filter(function (s) {
        return s.completedMissions.indexOf(meta.id) !== -1;
      }).length;
      var pct = totalStudents ? Math.round((completed / totalStudents) * 100) : 0;

      var li = document.createElement('li');
      li.className = 'db-mission-item';
      li.innerHTML =
        '<div class="db-mission-icon" style="background:' + meta.colorBg + ';color:' + meta.color + '" aria-hidden="true">' + meta.icon + '</div>' +
        '<div class="db-mission-info">' +
          '<p class="db-mission-name">' + _esc(meta.name) + '</p>' +
        '</div>' +
        '<div class="db-mission-prog-wrap">' +
          '<div class="db-mission-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + _esc(meta.name) + ' ' + pct + '%">' +
            '<div class="db-mission-fill" style="width:0%" data-pct="' + pct + '"></div>' +
          '</div>' +
          '<span class="db-mission-pct">' + pct + '%</span>' +
        '</div>';
      listEl.appendChild(li);
    });

    /* Animate bars after paint */
    setTimeout(function () {
      listEl.querySelectorAll('.db-mission-fill').forEach(function (el) {
        el.style.width = el.getAttribute('data-pct') + '%';
      });
    }, 300);
  }

  /* ═══════════════════════════════════
     CHART
  ═══════════════════════════════════ */
  function _renderChart() {
    var canvas = document.getElementById('scoreChart');
    if (!canvas || typeof Chart === 'undefined') return;

    /* Avg XP per mission (students who completed it) */
    var avgXPs = MISSION_META.map(function (meta) {
      var completers = MOCK_STUDENTS.filter(function (s) {
        return s.completedMissions.indexOf(meta.id) !== -1;
      });
      if (!completers.length) return 0;
      var sum = completers.reduce(function (acc, s) { return acc + s.xp; }, 0);
      return Math.round(sum / completers.length);
    });

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: MISSION_META.map(function (m) { return m.icon + ' ' + m.name; }),
        datasets: [{
          label: 'XP เฉลี่ย (ผู้ผ่านภารกิจ)',
          data: avgXPs,
          backgroundColor: MISSION_META.map(function (m) { return m.colorBg; }),
          borderColor: MISSION_META.map(function (m) { return m.color; }),
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ' XP เฉลี่ย: ' + ctx.parsed.y.toLocaleString(); }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { family: 'Nunito', size: 11 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Nunito', size: 11 } }
          }
        }
      }
    });
  }

  /* ═══════════════════════════════════
     AI TEACHING INSIGHTS
  ═══════════════════════════════════ */
  function _renderAIInsights() {
    var container = document.getElementById('dbAIInsights');
    if (!container) return;

    var students = _getStudents();
    var total = students.length;
    if (total === 0) {
      container.innerHTML = '<p class="db-ai-empty">ยังไม่มีข้อมูลนักเรียนเพียงพอ</p>';
      return;
    }

    /* Compute insights */
    var insights = [];

    /* 1. Struggling students (0 missions complete) */
    var struggling = students.filter(function (s) { return (s.completedMissions || []).length === 0; });
    if (struggling.length > 0) {
      insights.push({
        type: 'warn',
        icon: 'warning',
        title: 'ต้องการความช่วยเหลือ',
        body: 'มีนักเรียน ' + struggling.length + ' คนที่ยังไม่ผ่านภารกิจใดเลย ควรให้ความช่วยเหลือพิเศษก่อนภารกิจ 1 (Hello World)'
      });
    }

    /* 2. Mission with lowest completion rate */
    var missionCounts = MISSION_META.map(function (meta) {
      return students.filter(function (s) { return (s.completedMissions || []).indexOf(meta.id) !== -1; }).length;
    });
    var minCount = Math.min.apply(null, missionCounts);
    var minIdx   = missionCounts.indexOf(minCount);
    var minPct   = total ? Math.round((minCount / total) * 100) : 0;
    if (minPct < 60) {
      insights.push({
        type: 'info',
        icon: 'priority_high',
        title: 'ภารกิจที่ต้องทบทวน',
        body: MISSION_META[minIdx].icon + ' ' + MISSION_META[minIdx].name + ' มีนักเรียนผ่านเพียง ' + minPct + '% (' + minCount + '/' + total + ' คน) แนะนำให้อธิบายซ้ำหรือเพิ่มตัวอย่างใหม่'
      });
    }

    /* 3. Top performers */
    var topStudents = students.filter(function (s) { return (s.completedMissions || []).length >= 3; });
    if (topStudents.length > 0) {
      insights.push({
        type: 'success',
        icon: 'celebration',
        title: 'นักเรียนเก่งพิเศษ',
        body: 'มีนักเรียน ' + topStudents.length + ' คนผ่านไปแล้ว 3+ ภารกิจ ลองมอบ Challenge พิเศษหรือให้ช่วยเพื่อนสอน'
      });
    }

    /* 4. Average XP insight */
    var avgXP = Math.round(students.reduce(function (s, st) { return s + (st.xp || 0); }, 0) / total);
    var xpMsg = avgXP < 300
      ? 'XP เฉลี่ยของชั้นเรียนยังต่ำ (' + avgXP.toLocaleString() + ' XP) ลองเพิ่มกิจกรรมเสริมแรงจูงใจ'
      : avgXP < 700
      ? 'XP เฉลี่ยอยู่ในเกณฑ์ดี (' + avgXP.toLocaleString() + ' XP) รักษาความต่อเนื่องของการเรียนรู้'
      : 'XP เฉลี่ยสูงมาก (' + avgXP.toLocaleString() + ' XP) ชั้นเรียนนี้มีแรงจูงใจสูง เยี่ยม!';
    insights.push({
      type: avgXP < 300 ? 'warn' : avgXP < 700 ? 'info' : 'success',
      icon: 'bolt',
      title: 'ภาพรวม XP ชั้นเรียน',
      body: xpMsg
    });

    /* Render */
    container.innerHTML = insights.map(function (ins) {
      return '<div class="db-ai-insight db-ai-insight--' + ins.type + '">' +
        '<div class="db-ai-insight-icon"><span class="material-symbols-rounded">' + ins.icon + '</span></div>' +
        '<div class="db-ai-insight-body"><strong>' + _esc(ins.title) + '</strong><p>' + _esc(ins.body) + '</p></div>' +
        '</div>';
    }).join('');
  }

  /* ═══════════════════════════════════
     PROFILE SETTINGS MODAL
  ═══════════════════════════════════ */
  function _initProfileModal() {
    var openBtn    = document.getElementById('dbProfileBtn');
    var overlay    = document.getElementById('dbProfileModal');
    var closeBtn   = document.getElementById('dbProfileModalClose');
    var cancelBtn  = document.getElementById('dbProfileCancelBtn');
    var form       = document.getElementById('dbProfileForm');
    var avatarEl   = document.getElementById('dbProfileAvatar');
    var nameEl     = document.getElementById('dbProfileName');
    var displayEl  = document.getElementById('dbProfileDisplayName');
    var oldPwdEl   = document.getElementById('dbProfileOldPwd');
    var newPwdEl   = document.getElementById('dbProfileNewPwd');
    var confirmEl  = document.getElementById('dbProfileConfirmPwd');
    var errorEl    = document.getElementById('dbProfileError');
    var successEl  = document.getElementById('dbProfileSuccess');

    function _open() {
      if (avatarEl) avatarEl.textContent = (session.name || '?').charAt(0).toUpperCase();
      if (nameEl)   nameEl.textContent   = session.name || '';
      if (displayEl) displayEl.value = session.name || '';
      if (oldPwdEl)  oldPwdEl.value  = '';
      if (newPwdEl)  newPwdEl.value  = '';
      if (confirmEl) confirmEl.value = '';
      if (errorEl)   errorEl.hidden  = true;
      if (successEl) successEl.hidden = true;
      if (overlay)   { overlay.hidden = false; if (displayEl) displayEl.focus(); }
    }

    function _close() {
      if (overlay) overlay.hidden = true;
    }

    if (openBtn)   openBtn.addEventListener('click', _open);
    if (closeBtn)  closeBtn.addEventListener('click', _close);
    if (cancelBtn) cancelBtn.addEventListener('click', _close);
    if (overlay) {
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) _close();
      });
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (errorEl)   errorEl.hidden  = true;
        if (successEl) successEl.hidden = true;

        var newName    = displayEl  ? displayEl.value.trim()  : '';
        var oldPwd     = oldPwdEl   ? oldPwdEl.value           : '';
        var newPwd     = newPwdEl   ? newPwdEl.value           : '';
        var confirmPwd = confirmEl  ? confirmEl.value          : '';

        /* Validate password change if any pwd field filled */
        var wantsPwdChange = oldPwd || newPwd || confirmPwd;
        if (wantsPwdChange) {
          if (!oldPwd) { _showErr('กรุณาใส่รหัสผ่านปัจจุบัน'); return; }
          if (!newPwd) { _showErr('กรุณาใส่รหัสผ่านใหม่'); return; }
          if (newPwd.length < 6) { _showErr('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
          if (newPwd !== confirmPwd) { _showErr('รหัสผ่านใหม่ไม่ตรงกัน'); return; }

          /* Verify old password via auth service */
          var users = window.AuthService && AuthService._getUsers ? AuthService._getUsers() : [];
          var me = users.find(function (u) { return u.id === session.userId; });
          if (me && me.password && me.password !== oldPwd) {
            _showErr('รหัสผ่านปัจจุบันไม่ถูกต้อง'); return;
          }

          /* Save new password to localStorage */
          var storedUsers = JSON.parse(localStorage.getItem('aca_users') || '[]');
          var found = false;
          storedUsers = storedUsers.map(function (u) {
            if (u.id === session.userId || u.userId === session.userId) {
              found = true;
              return Object.assign({}, u, { password: newPwd });
            }
            return u;
          });
          if (!found) storedUsers.push({ id: session.userId, password: newPwd });
          localStorage.setItem('aca_users', JSON.stringify(storedUsers));
        }

        /* Save display name */
        if (newName && newName !== session.name) {
          session.name = newName;
          var currentSession = JSON.parse(localStorage.getItem('aca_session') || '{}');
          currentSession.name = newName;
          localStorage.setItem('aca_session', JSON.stringify(currentSession));
          /* Update nav */
          var navNameEl = document.getElementById('dbNavName');
          var heroNameEl = document.getElementById('dbHeroName');
          if (navNameEl) navNameEl.textContent = newName;
          if (heroNameEl) heroNameEl.textContent = newName;
          if (nameEl) nameEl.textContent = newName;
        }

        _showSuccess('บันทึกข้อมูลเรียบร้อยแล้ว');
        if (oldPwdEl)  oldPwdEl.value  = '';
        if (newPwdEl)  newPwdEl.value  = '';
        if (confirmEl) confirmEl.value = '';
      });
    }

    function _showErr(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
    function _showSuccess(msg) {
      if (!successEl) return;
      successEl.textContent = msg;
      successEl.hidden = false;
    }
  }

  function _initAIRefresh() {
    var btn = document.getElementById('dbAIRefreshBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var icon = btn.querySelector('.material-symbols-rounded');
      if (icon) icon.style.animation = 'spin 0.6s linear';
      setTimeout(function () {
        if (icon) icon.style.animation = '';
        _renderAIInsights();
      }, 600);
    });
  }

  /* ═══════════════════════════════════
     ANIMATIONS
  ═══════════════════════════════════ */
  function _animate() {
    if (typeof gsap === 'undefined') return;
    var tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.db-hero',       { opacity: 0, y: -16, duration: 0.5 })
      .from('.db-stat-card',  { opacity: 0, y: 20, stagger: 0.08, duration: 0.4 }, '-=.2')
      .from('.db-card',       { opacity: 0, y: 20, stagger: 0.1,  duration: 0.4 }, '-=.2');
  }

  /* ═══════════════════════════════════
     UTILS
  ═══════════════════════════════════ */
  function _calcLevel(xp) {
    var lvl = XP_LEVELS[0];
    for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= XP_LEVELS[i].min) { lvl = XP_LEVELS[i]; break; }
    }
    return lvl;
  }

  function _hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ═══════════════════════════════════
     TAB SWITCHING
  ═══════════════════════════════════ */
  function _setupTabs() {
    var tabBar = document.querySelector('.db-tabs');
    if (!tabBar) return;

    tabBar.addEventListener('click', function (e) {
      var tab = e.target.closest('.db-tab');
      if (!tab || tab.disabled) return;

      /* deactivate all */
      tabBar.querySelectorAll('.db-tab').forEach(function (t) {
        t.classList.remove('db-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('db-tab--active');
      tab.setAttribute('aria-selected', 'true');

      /* hide all panels */
      ['dbPanelOverview','dbPanelStudents','dbPanelTeachers'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.hidden = true;
      });

      /* show target panel */
      var target = document.getElementById(tab.dataset.panel);
      if (target) {
        target.hidden = false;
        if (tab.dataset.panel === 'dbPanelStudents') _renderStudentMgmt();
        if (tab.dataset.panel === 'dbPanelTeachers') _renderTeacherMgmt();
      }
    });
  }

  /* Show/hide admin-only tab based on role */
  function _initRoleUI() {
    if (session.role === 'admin') {
      var adminTab = document.getElementById('dbTabTeachers');
      if (adminTab) adminTab.hidden = false;
    }
    /* Adjust nav role chip */
    var chip = document.querySelector('.db-nav-role-chip');
    if (chip) chip.textContent = session.role === 'admin' ? 'Admin' : 'Teacher';
  }

  /* ═══════════════════════════════════
     STUDENT MANAGEMENT DATA
  ═══════════════════════════════════ */
  function _getStudents() {
    /* Merge MOCK_STUDENTS with custom students from localStorage */
    var custom = [];
    try { custom = JSON.parse(localStorage.getItem(MGMT_STU_KEY) || '[]'); } catch (e) {}
    /* Build map from mock data */
    var map = {};
    MOCK_STUDENTS.forEach(function (s) { map[s.userId] = Object.assign({}, s); });
    /* Apply custom overrides; _deleted entries remove the student */
    custom.forEach(function (s) {
      if (s._deleted) { delete map[s.userId]; }
      else             { map[s.userId] = Object.assign({}, s); }
    });
    return Object.values(map);
  }

  function _saveStudents(arr) {
    /* Only save non-mock students and overrides; don't duplicate mock data */
    var mockIds = MOCK_STUDENTS.reduce(function (m, s) { m[s.userId] = true; return m; }, {});
    var toSave = arr.filter(function (s) {
      if (!mockIds[s.userId]) return true;
      /* only save if different from mock */
      var mock = MOCK_STUDENTS.find(function (m) { return m.userId === s.userId; });
      return JSON.stringify(mock) !== JSON.stringify(s);
    });
    try { localStorage.setItem(MGMT_STU_KEY, JSON.stringify(toSave)); } catch (e) {}
  }

  /* ═══════════════════════════════════
     STUDENT MANAGEMENT UI
  ═══════════════════════════════════ */
  function _initStudentMgmt() {
    /* Always use the system-wide class list */
    var classes = ALL_CLASSES;

    /* Hide class filter — only one class in this system */
    var filterBar = document.getElementById('dbClassFilter');
    if (filterBar) filterBar.hidden = true;

    /* Add student button */
    var addBtn = document.getElementById('dbAddStudentBtn');
    if (addBtn) addBtn.addEventListener('click', function () { _openStudentModal(null); });

    /* Student table action buttons (edit/delete) — single delegated listener */
    var stuTbody = document.getElementById('dbMgmtStudentBody');
    if (stuTbody) stuTbody.addEventListener('click', function (e) {
      var editBtn = e.target.closest('.db-action-btn--edit');
      var delBtn  = e.target.closest('.db-action-btn--del');
      if (editBtn) {
        var stu = _getStudents().find(function (s) { return s.userId === editBtn.dataset.id; });
        if (stu) _openStudentModal(stu);
      }
      if (delBtn) {
        if (!confirm('ต้องการลบนักเรียน ' + delBtn.dataset.id + ' ออกจากระบบ?')) return;
        _deleteStudent(delBtn.dataset.id);
      }
    });

    /* Modal close */
    var closeBtn   = document.getElementById('dbStudentModalClose');
    var cancelBtn  = document.getElementById('dbStudentCancelBtn');
    var overlay    = document.getElementById('dbStudentModal');
    if (closeBtn) closeBtn.addEventListener('click', _closeStudentModal);
    if (cancelBtn) cancelBtn.addEventListener('click', _closeStudentModal);
    if (overlay) overlay.addEventListener('click', function (e) { if (e.target === overlay) _closeStudentModal(); });
    overlay && overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') _closeStudentModal(); });

    /* Form submit */
    var form = document.getElementById('dbStudentForm');
    if (form) form.addEventListener('submit', _handleStudentSubmit);
  }

  function _renderStudentMgmt() {
    var students = _getStudents();
    var classes  = session.role === 'admin' ? ALL_CLASSES : (session.classes || ALL_CLASSES);

    /* Filter by accessible classes */
    var visible  = students.filter(function (s) { return classes.indexOf(s.class || s['class']) !== -1; });
    /* Filter by active class tab */
    if (_classFilter !== 'all') {
      visible = visible.filter(function (s) { return (s.class || s['class']) === _classFilter; });
    }
    visible.sort(function (a, b) { return (b.xp || 0) - (a.xp || 0); });

    var tbody   = document.getElementById('dbMgmtStudentBody');
    var countEl = document.getElementById('dbMgmtStudentCount');
    if (!tbody) return;
    if (countEl) countEl.textContent = visible.length + ' คน';
    tbody.innerHTML = '';

    if (!visible.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="db-td-loading">ไม่มีนักเรียนในชั้นนี้</td></tr>';
      return;
    }

    visible.forEach(function (s) {
      var colorIdx = Math.abs(_hashStr(s.userId || '')) % AVATAR_COLORS.length;
      var lvl      = _calcLevel(s.xp || 0);
      var dotsHtml = '<span class="db-missions-chip">';
      for (var m = 1; m <= 5; m++) {
        var done = (s.completedMissions || []).indexOf(m) !== -1;
        dotsHtml += '<span class="db-missions-dot' + (done ? ' db-missions-dot--done' : '') + '"></span>';
      }
      dotsHtml += '</span>';

      var tr = document.createElement('tr');
      tr.dataset.userId = s.userId;
      tr.innerHTML =
        '<td class="db-td">' +
          '<div class="db-player-cell">' +
            '<div class="db-row-avatar" style="background:' + AVATAR_COLORS[colorIdx] + '" aria-hidden="true">' + _esc((s.name || '?').charAt(0).toUpperCase()) + '</div>' +
            '<div><p class="db-player-name">' + _esc(s.name) + '</p><p class="db-player-class db-text-muted">' + _esc(s.userId) + '</p></div>' +
          '</div>' +
        '</td>' +
        '<td class="db-td"><span class="db-level-chip">' + _esc(s.class || '') + '</span></td>' +
        '<td class="db-td"><span class="db-xp-val">' + (s.xp || 0).toLocaleString() + '</span></td>' +
        '<td class="db-td">' + dotsHtml + '</td>' +
        '<td class="db-td">' +
          '<div class="db-action-btns">' +
            '<button class="db-action-btn db-action-btn--edit" data-id="' + _esc(s.userId) + '" aria-label="แก้ไข ' + _esc(s.name) + '">' +
              '<span class="material-symbols-rounded" aria-hidden="true">edit</span>' +
            '</button>' +
            '<button class="db-action-btn db-action-btn--del" data-id="' + _esc(s.userId) + '" aria-label="ลบ ' + _esc(s.name) + '">' +
              '<span class="material-symbols-rounded" aria-hidden="true">delete</span>' +
            '</button>' +
          '</div>' +
        '</td>';
      tbody.appendChild(tr);
    });
  }

  function _openStudentModal(student) {
    _editingStudentId = student ? student.userId : null;
    var titleEl  = document.getElementById('dbStudentModalTitle');
    var idInput  = document.getElementById('dbStuId');
    var nameInput= document.getElementById('dbStuName');
    var classEl  = document.getElementById('dbStuClass');
    var errorEl  = document.getElementById('dbStuError');
    var overlay  = document.getElementById('dbStudentModal');

    if (titleEl) titleEl.textContent = student ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียน';
    if (idInput)   { idInput.value = student ? student.userId : ''; idInput.disabled = !!student; }
    if (nameInput) nameInput.value = student ? student.name : '';
    if (classEl)   classEl.value  = student ? (student.class || 'ป.5') : 'ป.5';
    if (errorEl)   errorEl.hidden = true;
    if (overlay)   { overlay.hidden = false; (nameInput || idInput).focus(); }
  }

  function _closeStudentModal() {
    var overlay = document.getElementById('dbStudentModal');
    if (overlay) overlay.hidden = true;
    _editingStudentId = null;
  }

  function _handleStudentSubmit(e) {
    e.preventDefault();
    var idVal   = (document.getElementById('dbStuId') || {}).value.trim().toUpperCase();
    var nameVal = (document.getElementById('dbStuName') || {}).value.trim();
    var classVal= (document.getElementById('dbStuClass') || {}).value;
    var errorEl = document.getElementById('dbStuError');

    function _showStuErr(msg) { if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; } }

    if (!idVal)   { _showStuErr('กรุณากรอกรหัสนักเรียน'); return; }
    if (!nameVal) { _showStuErr('กรุณากรอกชื่อ-สกุล');    return; }

    var students = _getStudents();
    if (!_editingStudentId) {
      if (students.find(function (s) { return s.userId === idVal; })) {
        _showStuErr('รหัสนักเรียน ' + idVal + ' มีอยู่แล้ว');
        return;
      }
      students.push({ userId: idVal, name: nameVal, class: classVal, xp: 0, completedMissions: [], badges: ['first_login'] });
    } else {
      var idx = students.findIndex(function (s) { return s.userId === _editingStudentId; });
      if (idx !== -1) { students[idx].name = nameVal; students[idx].class = classVal; }
    }
    _saveStudents(students);
    _closeStudentModal();
    _renderStudentMgmt();
  }

  function _deleteStudent(userId) {
    var students = _getStudents().filter(function (s) { return s.userId !== userId; });
    /* For mock students, save a "deleted" marker */
    var isMock = MOCK_STUDENTS.some(function (s) { return s.userId === userId; });
    if (isMock) {
      var custom = [];
      try { custom = JSON.parse(localStorage.getItem(MGMT_STU_KEY) || '[]'); } catch (e) {}
      custom = custom.filter(function (s) { return s.userId !== userId; });
      custom.push({ userId: userId, _deleted: true });
      try { localStorage.setItem(MGMT_STU_KEY, JSON.stringify(custom)); } catch (e) {}
    } else {
      _saveStudents(students);
    }
    _renderStudentMgmt();
  }

  /* ═══════════════════════════════════
     TEACHER MANAGEMENT DATA (admin)
  ═══════════════════════════════════ */
  function _getTeachers() {
    var custom = [];
    try { custom = JSON.parse(localStorage.getItem(MGMT_TCH_KEY) || '[]'); } catch (e) {}
    var map = {};
    MOCK_TEACHERS.forEach(function (t) { map[t.userId] = Object.assign({}, t); });
    custom.filter(function (t) { return !t._deleted; }).forEach(function (t) { map[t.userId] = Object.assign({}, t); });
    /* Remove deleted */
    custom.filter(function (t) { return t._deleted; }).forEach(function (t) { delete map[t.userId]; });
    return Object.values(map);
  }

  function _saveTeachers(arr) {
    try { localStorage.setItem(MGMT_TCH_KEY, JSON.stringify(arr)); } catch (e) {}
  }

  /* ═══════════════════════════════════
     TEACHER MANAGEMENT UI (admin)
  ═══════════════════════════════════ */
  function _initTeacherMgmt() {
    var addBtn  = document.getElementById('dbAddTeacherBtn');
    var overlay = document.getElementById('dbTeacherModal');
    var closeBtn= document.getElementById('dbTeacherModalClose');
    var cancelBtn= document.getElementById('dbTeacherCancelBtn');
    var form    = document.getElementById('dbTeacherForm');

    if (addBtn)   addBtn.addEventListener('click', function () { _openTeacherModal(null); });
    if (closeBtn) closeBtn.addEventListener('click', _closeTeacherModal);
    if (cancelBtn) cancelBtn.addEventListener('click', _closeTeacherModal);
    if (overlay)  overlay.addEventListener('click', function (e) { if (e.target === overlay) _closeTeacherModal(); });
    overlay && overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') _closeTeacherModal(); });
    if (form) form.addEventListener('submit', _handleTeacherSubmit);

    /* Teacher table action buttons — single delegated listener */
    var tchTbody = document.getElementById('dbMgmtTeacherBody');
    if (tchTbody) tchTbody.addEventListener('click', function (e) {
      var editBtn = e.target.closest('.db-action-btn--edit');
      var delBtn  = e.target.closest('.db-action-btn--del');
      if (editBtn) {
        var tch = _getTeachers().find(function (t) { return t.userId === editBtn.dataset.id; });
        if (tch) _openTeacherModal(tch);
      }
      if (delBtn) {
        if (!confirm('ต้องการลบครู ' + delBtn.dataset.id + ' ออกจากระบบ?')) return;
        _deleteTeacher(delBtn.dataset.id);
      }
    });
  }

  function _renderTeacherMgmt() {
    var teachers = _getTeachers();
    var tbody    = document.getElementById('dbMgmtTeacherBody');
    var countEl  = document.getElementById('dbMgmtTeacherCount');
    if (!tbody) return;
    if (countEl) countEl.textContent = teachers.length + ' คน';
    tbody.innerHTML = '';

    teachers.forEach(function (t) {
      var colorIdx = Math.abs(_hashStr(t.userId || '')) % AVATAR_COLORS.length;
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td class="db-td">' +
          '<div class="db-player-cell">' +
            '<div class="db-row-avatar" style="background:' + AVATAR_COLORS[colorIdx] + '" aria-hidden="true">' + _esc((t.name || '?').charAt(0).toUpperCase()) + '</div>' +
            '<div><p class="db-player-name">' + _esc(t.name) + '</p><p class="db-player-class db-text-muted">' + _esc(t.userId) + '</p></div>' +
          '</div>' +
        '</td>' +
        '<td class="db-td">' + _esc(t.subject || '—') + '</td>' +
        '<td class="db-td">' + _esc((t.classes || []).join(', ') || '—') + '</td>' +
        '<td class="db-td">' +
          '<div class="db-action-btns">' +
            '<button class="db-action-btn db-action-btn--edit" data-id="' + _esc(t.userId) + '" aria-label="แก้ไข ' + _esc(t.name) + '">' +
              '<span class="material-symbols-rounded" aria-hidden="true">edit</span>' +
            '</button>' +
            '<button class="db-action-btn db-action-btn--del" data-id="' + _esc(t.userId) + '" aria-label="ลบ ' + _esc(t.name) + '">' +
              '<span class="material-symbols-rounded" aria-hidden="true">delete</span>' +
            '</button>' +
          '</div>' +
        '</td>';
      tbody.appendChild(tr);
    });
  }

  function _openTeacherModal(teacher) {
    _editingTeacherId = teacher ? teacher.userId : null;
    var titleEl    = document.getElementById('dbTeacherModalTitle');
    var idInput    = document.getElementById('dbTchId');
    var nameInput  = document.getElementById('dbTchName');
    var subjectEl  = document.getElementById('dbTchSubject');
    var classesEl  = document.getElementById('dbTchClasses');
    var passwordEl = document.getElementById('dbTchPassword');
    var errorEl    = document.getElementById('dbTchError');
    var overlay    = document.getElementById('dbTeacherModal');

    if (titleEl) titleEl.textContent = teacher ? 'แก้ไขข้อมูลครู' : 'เพิ่มครู';
    if (idInput)   { idInput.value = teacher ? teacher.userId : '';  idInput.disabled = !!teacher; }
    if (nameInput) nameInput.value  = teacher ? teacher.name : '';
    if (subjectEl) subjectEl.value  = teacher ? (teacher.subject || '') : '';
    if (classesEl) classesEl.value  = teacher ? (teacher.classes || []).join(', ') : '';
    if (passwordEl) passwordEl.value = ''; /* always start blank — only fill if admin wants to change */
    if (errorEl)   errorEl.hidden   = true;
    if (overlay)   { overlay.hidden = false; (nameInput || idInput).focus(); }
  }

  function _closeTeacherModal() {
    var overlay = document.getElementById('dbTeacherModal');
    if (overlay) overlay.hidden = true;
    _editingTeacherId = null;
  }

  function _handleTeacherSubmit(e) {
    e.preventDefault();
    var idVal      = (document.getElementById('dbTchId')      || {}).value.trim().toUpperCase();
    var nameVal    = (document.getElementById('dbTchName')    || {}).value.trim();
    var subjectVal = (document.getElementById('dbTchSubject') || {}).value.trim();
    var classesRaw = (document.getElementById('dbTchClasses') || {}).value || '';
    var passwordVal= (document.getElementById('dbTchPassword')|| {}).value.trim();
    var errorEl    = document.getElementById('dbTchError');

    /* Parse classes: split by comma, trim each, filter empty */
    var classesList = classesRaw.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    function _showTchErr(msg) { if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; } }

    if (!idVal)   { _showTchErr('กรุณากรอกรหัสครู');   return; }
    if (!nameVal) { _showTchErr('กรุณากรอกชื่อ-สกุล'); return; }

    var teachers = _getTeachers();
    var custom   = [];
    try { custom = JSON.parse(localStorage.getItem(MGMT_TCH_KEY) || '[]'); } catch (e) {}

    if (!_editingTeacherId) {
      if (teachers.find(function (t) { return t.userId === idVal; })) {
        _showTchErr('รหัสครู ' + idVal + ' มีอยู่แล้ว');
        return;
      }
      var newEntry = { userId: idVal, name: nameVal, subject: subjectVal, classes: classesList };
      if (passwordVal) newEntry.password = passwordVal;
      custom.push(newEntry);
    } else {
      var idx = custom.findIndex(function (t) { return t.userId === _editingTeacherId; });
      var existing = teachers.find(function (t) { return t.userId === _editingTeacherId; }) || {};
      var entry = {
        userId: _editingTeacherId,
        name: nameVal,
        subject: subjectVal,
        classes: classesList,
        /* keep existing password if admin left the field blank */
        password: passwordVal || existing.password || ''
      };
      if (idx !== -1) custom[idx] = entry; else custom.push(entry);
    }
    _saveTeachers(custom);
    _closeTeacherModal();
    _renderTeacherMgmt();
  }

  function _deleteTeacher(userId) {
    var custom = [];
    try { custom = JSON.parse(localStorage.getItem(MGMT_TCH_KEY) || '[]'); } catch (e) {}
    custom = custom.filter(function (t) { return t.userId !== userId; });
    var isMock = MOCK_TEACHERS.some(function (t) { return t.userId === userId; });
    if (isMock) custom.push({ userId: userId, _deleted: true });
    _saveTeachers(custom);
    _renderTeacherMgmt();
  }

  /* ═══════════════════════════════════
     EXCEL / CSV IMPORT
  ═══════════════════════════════════ */
  var _importRows = []; /* rows parsed and validated, ready to import */

  function _initExcelImport() {
    var fileInput   = document.getElementById('dbExcelUpload');
    var uploadLabel = fileInput ? fileInput.parentElement : null;
    var closeBtn    = document.getElementById('dbImportModalClose');
    var cancelBtn   = document.getElementById('dbImportCancelBtn');
    var confirmBtn  = document.getElementById('dbImportConfirmBtn');
    var overlay     = document.getElementById('dbImportModal');

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var file = this.files[0];
        if (!file) return;
        this.value = ''; /* reset so same file can be re-selected */
        _parseImportFile(file);
      });
    }

    /* keyboard activation for the label-as-button */
    if (uploadLabel) {
      uploadLabel.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput && fileInput.click(); }
      });
    }

    if (closeBtn)  closeBtn.addEventListener('click',  _closeImportModal);
    if (cancelBtn) cancelBtn.addEventListener('click', _closeImportModal);
    if (overlay)   overlay.addEventListener('click',   function (e) { if (e.target === overlay) _closeImportModal(); });
    if (overlay)   overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') _closeImportModal(); });
    if (confirmBtn) confirmBtn.addEventListener('click', _confirmImport);
  }

  function _parseImportFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      var reader = new FileReader();
      reader.onload = function (e) { _processRawRows(_csvToRows(e.target.result)); };
      reader.readAsText(file, 'UTF-8');
      return;
    }

    /* Excel: requires SheetJS (XLSX) */
    if (typeof XLSX === 'undefined') {
      alert('ไลบรารี SheetJS ยังโหลดไม่เสร็จ กรุณารอสักครู่แล้วลองใหม่');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var wb   = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        var ws   = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        _processRawRows(rows);
      } catch (err) {
        alert('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel (.xlsx) หรือ CSV ที่ถูกต้อง');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function _csvToRows(text) {
    return text.split(/\r?\n/).map(function (line) {
      return line.split(',').map(function (cell) { return cell.trim().replace(/^"|"$/g, ''); });
    });
  }

  /* Normalise header name to one of: 'id' | 'name' | 'class' | null */
  function _normaliseHeader(h) {
    var s = String(h).toLowerCase().replace(/\s+/g, '');
    if (/^(รหัส|id|student_?id|เลขประจำตัว)/.test(s)) return 'id';
    if (/^(ชื่อ|ชื่อ-?สกุล|name|fullname|full_?name)/.test(s)) return 'name';
    if (/^(ชั้น|ห้อง|classroom|class|grade)/.test(s)) return 'class';
    return null;
  }

  function _processRawRows(rows) {
    if (!rows || rows.length < 2) { alert('ไม่พบข้อมูลในไฟล์'); return; }

    /* Detect header row — try first row */
    var header = rows[0].map(_normaliseHeader);
    var idIdx   = header.indexOf('id');
    var nameIdx = header.indexOf('name');
    var clsIdx  = header.indexOf('class');

    /* Fallback: assume positional (id=0, name=1, class=2) */
    if (idIdx === -1 && nameIdx === -1) { idIdx = 0; nameIdx = 1; clsIdx = 2; rows = rows.slice(0); }
    else { rows = rows.slice(1); } /* skip header */

    var existing = _getStudents();

    _importRows = [];
    rows.forEach(function (row) {
      var id   = String(row[idIdx]  || '').trim().toUpperCase();
      var name = String(row[nameIdx] || '').trim();
      var cls  = clsIdx !== -1 ? String(row[clsIdx] || '').trim() : '';
      if (!id && !name) return; /* skip blank rows */
      var status = !id || !name ? 'invalid' : existing.find(function (s) { return (s.userId || '').toUpperCase() === id; }) ? 'exists' : 'new';
      _importRows.push({ userId: id, name: name, cls: cls, status: status });
    });

    if (!_importRows.length) { alert('ไม่พบข้อมูลนักเรียนในไฟล์'); return; }
    _showImportPreview();
  }

  function _showImportPreview() {
    var tbody    = document.getElementById('dbImportBody');
    var countEl  = document.getElementById('dbImportCount');
    var summaryEl= document.getElementById('dbImportSummary');
    var overlay  = document.getElementById('dbImportModal');
    if (!tbody || !overlay) return;

    tbody.innerHTML = '';
    var newCount = 0;
    _importRows.forEach(function (row) {
      var tr = document.createElement('tr');
      if (row.status === 'new') newCount++;
      var statusLabel = { new: 'ใหม่', exists: 'มีอยู่แล้ว', invalid: 'ข้อมูลไม่ครบ' }[row.status] || '';
      var statusClass = { new: 'db-badge--new', exists: 'db-badge--exists', invalid: 'db-badge--invalid' }[row.status] || '';
      tr.innerHTML =
        '<td class="db-td">' + (row.userId || '-') + '</td>' +
        '<td class="db-td">' + (row.name || '-') + '</td>' +
        '<td class="db-td">' + (row.cls  || '-') + '</td>' +
        '<td class="db-td"><span class="db-status-badge ' + statusClass + '">' + statusLabel + '</span></td>';
      tbody.appendChild(tr);
    });

    if (countEl)  countEl.textContent  = newCount;
    if (summaryEl) summaryEl.textContent = 'พบ ' + _importRows.length + ' รายการ: ใหม่ ' + newCount + ' คน, มีอยู่แล้ว ' + (_importRows.length - newCount) + ' คน';

    var confirmBtn = document.getElementById('dbImportConfirmBtn');
    if (confirmBtn) confirmBtn.disabled = newCount === 0;
    overlay.hidden = false;
    overlay.focus();
  }

  function _closeImportModal() {
    var overlay = document.getElementById('dbImportModal');
    if (overlay) overlay.hidden = true;
    _importRows = [];
  }

  function _confirmImport() {
    var students = _getStudents(); /* merged list (mock + custom) */
    var added = 0;
    _importRows.forEach(function (row) {
      if (row.status !== 'new') return;
      if (students.find(function (s) { return (s.userId || '').toUpperCase() === row.userId; })) return;
      students.push({ userId: row.userId, name: row.name, class: row.cls || '', xp: 0, completedMissions: [], badges: ['first_login'] });
      added++;
    });

    _saveStudents(students);
    _closeImportModal();
    _renderStudentMgmt();
    alert('นำเข้าสำเร็จ เพิ่มนักเรียนใหม่ ' + added + ' คน');
  }

  /* ═══════════════════════════════════
     NOTIFICATION PANEL (teacher)
  ═══════════════════════════════════ */
  function _initNotifBtn() {
    var btn  = document.getElementById('dbNotifBtn');
    var wrap = document.getElementById('dbNotifWrap');
    if (!btn || !wrap) return;

    var panel = document.createElement('div');
    panel.className = 'db-notif-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'การแจ้งเตือน');
    panel.innerHTML =
      '<div class="db-notif-panel-hdr"><span class="db-notif-panel-title">การแจ้งเตือน</span></div>' +
      '<div class="db-notif-panel-body" id="dbNotifPanelBody"></div>';
    wrap.appendChild(panel);

    function _fillPanel(body) {
      var students = _getStudents();
      var items = [];
      var total = students.length;
      if (total > 0) {
        items.push({
          iconClass: 'db-notif-icon--student',
          icon: 'groups',
          title: 'นักเรียนในระบบ ' + total + ' คน',
          sub: 'ข้อมูลอัปเดตล่าสุด'
        });
      }
      var done = students.filter(function (s) {
        return s.completedMissions && s.completedMissions.length > 0;
      }).length;
      if (done > 0) {
        items.push({
          iconClass: 'db-notif-icon--mission',
          icon: 'check_circle',
          title: done + ' คน ทำภารกิจสำเร็จแล้ว',
          sub: 'ดูความคืบหน้าในแท็บภาพรวม'
        });
      }
      if (!items.length) {
        body.innerHTML =
          '<div class="db-notif-empty">' +
          '<span class="material-symbols-rounded">notifications_off</span>' +
          '<p class="db-notif-empty-txt">ไม่มีการแจ้งเตือนใหม่</p>' +
          '</div>';
        return;
      }
      body.innerHTML = items.map(function (it) {
        return '<div class="db-notif-item">' +
          '<div class="db-notif-icon ' + it.iconClass + '">' +
          '<span class="material-symbols-rounded">' + it.icon + '</span>' +
          '</div>' +
          '<div class="db-notif-body">' +
          '<div class="db-notif-body-title">' + it.title + '</div>' +
          '<div class="db-notif-body-sub">' + it.sub + '</div>' +
          '</div></div>';
      }).join('');
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      if (open) _fillPanel(document.getElementById('dbNotifPanelBody'));
    });

    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target) && e.target !== btn) {
        panel.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    }, true);
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
