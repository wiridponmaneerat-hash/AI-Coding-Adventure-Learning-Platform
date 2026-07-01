(function () {
  'use strict';

  var session = null;
  var allMissions = [];
  var activeFilter = 'all';

  var AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#D97706','#059669','#DC2626','#0891B2'];

  /* ───────── INIT ───────── */
  function init() {
    session = AuthService.requireRole(['student']);
    if (!session) return;
    _setupNav();
    _loadMissions();
    _setupFilters();
  }

  /* ───────── NAV ───────── */
  function _setupNav() {
    var initial = (session.name || '?').charAt(0).toUpperCase();
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

  function _hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    return h;
  }

  /* ───────── LOAD DATA ───────── */
  function _loadMissions() {
    fetch('../data/missions.json')
      .then(function (r) {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then(function (data) {
        allMissions = data;
        _render();
      })
      .catch(function () {
        var grid = document.getElementById('msGrid');
        if (grid) grid.innerHTML = '<p style="color:var(--text-muted);padding:2rem;grid-column:1/-1;text-align:center">ไม่สามารถโหลดข้อมูล Mission ได้</p>';
      });
  }

  /* ───────── RENDER ───────── */
  function _render() {
    _renderHero();
    _renderMissions(allMissions);
    _animate();
  }

  function _renderHero() {
    var completed = (session.completedMissions || []);
    var total     = allMissions.length;
    var doneCount = completed.length;

    var ringEl  = document.getElementById('msRingFill');
    var valEl   = document.getElementById('msRingVal');
    var xpEl    = document.getElementById('msHeroXP');
    var badgeEl = document.getElementById('msHeroBadges');

    if (valEl) valEl.textContent = doneCount + '/' + total;
    if (badgeEl) badgeEl.textContent = (session.badges || []).length;

    var offset = 314.16 * (1 - doneCount / total);
    if (typeof gsap !== 'undefined' && ringEl) {
      gsap.fromTo(ringEl,
        { strokeDashoffset: 314.16 },
        { strokeDashoffset: offset, duration: 1.2, ease: 'power2.out', delay: .4 }
      );
    } else if (ringEl) {
      ringEl.style.strokeDashoffset = offset;
    }

    if (xpEl) {
      if (typeof gsap !== 'undefined') {
        var obj = { val: 0 };
        gsap.to(obj, {
          val: session.xp || 0, duration: 1.2, ease: 'power2.out', delay: .3,
          onUpdate: function () { xpEl.textContent = Math.round(obj.val).toLocaleString(); }
        });
      } else {
        xpEl.textContent = (session.xp || 0).toLocaleString();
      }
    }
  }

  function _renderMissions(missions) {
    var grid = document.getElementById('msGrid');
    if (!grid) return;

    grid.innerHTML = '';
    var completed = session.completedMissions || [];

    var filtered = activeFilter === 'all'
      ? missions
      : missions.filter(function (m) { return m.difficulty === activeFilter; });

    if (filtered.length === 0) {
      grid.innerHTML = '<p style="color:var(--text-muted);padding:3rem;grid-column:1/-1;text-align:center">ไม่มี Mission ในระดับนี้</p>';
      return;
    }

    filtered.forEach(function (m) {
      var isCompleted = completed.indexOf(m.id) !== -1;
      var isUnlocked  = isCompleted || m.id === 1 || completed.indexOf(m.id - 1) !== -1;
      grid.appendChild(_buildCard(m, isCompleted, isUnlocked));
    });
  }

  function _buildCard(m, isCompleted, isUnlocked) {
    var card = document.createElement('article');
    card.className = 'ms-card' +
      (isCompleted ? ' ms-card--completed' : '') +
      (!isUnlocked ? ' ms-card--locked' : '') +
      (isUnlocked && !isCompleted ? ' ms-card--current' : '');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', 'Mission ' + m.id + ': ' + m.title);

    var diffMap   = { beginner: 'ms-diff-badge--beginner', intermediate: 'ms-diff-badge--intermediate', advanced: 'ms-diff-badge--advanced' };
    var stateIcon = isCompleted ? 'check_circle' : (!isUnlocked ? 'lock' : 'play_circle');
    var stateEl   = isCompleted
      ? '<div class="ms-card-check-icon" aria-hidden="true"><span class="material-symbols-rounded">check_circle</span></div>'
      : (!isUnlocked ? '<div class="ms-card-lock-icon" aria-hidden="true"><span class="material-symbols-rounded">lock</span></div>' : '');

    var topicsHtml = (m.topics || []).map(function (t) {
      return '<span class="ms-topic-tag">' + _esc(t) + '</span>';
    }).join('');

    var ctaText  = isCompleted ? 'ทำอีกครั้ง' : (!isUnlocked ? 'ยังล็อกอยู่' : 'เริ่มเลย!');
    var ctaIcon  = isCompleted ? 'replay' : (!isUnlocked ? 'lock' : 'arrow_forward');
    var ctaClass = 'ms-card-cta' + (isCompleted ? ' ms-card-cta--completed' : '') + (!isUnlocked ? ' ms-card-cta--locked' : '');
    var ctaHref  = isUnlocked ? 'mission-detail.html?id=' + m.id : null;

    var ctaEl = ctaHref
      ? '<a href="' + ctaHref + '" class="' + ctaClass + '" aria-label="' + ctaText + ' Mission ' + m.id + '"><span class="material-symbols-rounded" aria-hidden="true">' + ctaIcon + '</span>' + ctaText + '</a>'
      : '<span class="' + ctaClass + '" aria-disabled="true" role="button"><span class="material-symbols-rounded" aria-hidden="true">' + ctaIcon + '</span>' + ctaText + '</span>';

    card.innerHTML =
      '<div class="ms-card-banner" style="background:' + m.colorBg + '" aria-hidden="true">' +
        '<div class="ms-card-icon"><span class="material-symbols-rounded">' + _esc(m.icon) + '</span></div>' +
        stateEl +
      '</div>' +
      '<div class="ms-card-body">' +
        '<div class="ms-card-title-row">' +
          '<h2 class="ms-card-title">' + _esc(m.title) + '</h2>' +
          '<span class="ms-card-num">M' + m.id + '</span>' +
        '</div>' +
        '<p class="ms-card-desc">' + _esc(m.description) + '</p>' +
        '<div class="ms-card-meta">' +
          '<span class="ms-diff-badge ' + (diffMap[m.difficulty] || '') + '">' + _esc(m.diffLabel) + '</span>' +
          '<span class="ms-card-meta-item"><span class="material-symbols-rounded" aria-hidden="true">star</span>' + m.xpReward + ' XP</span>' +
          '<span class="ms-card-meta-item"><span class="material-symbols-rounded" aria-hidden="true">schedule</span>' + m.estimatedMinutes + ' นาที</span>' +
        '</div>' +
        '<div class="ms-card-topics">' + topicsHtml + '</div>' +
        ctaEl +
      '</div>';

    return card;
  }

  /* ───────── FILTERS ───────── */
  function _setupFilters() {
    var bar = document.getElementById('msFilterBar');
    if (!bar) return;
    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.ms-filter-btn');
      if (!btn) return;
      bar.querySelectorAll('.ms-filter-btn').forEach(function (b) {
        b.classList.remove('ms-filter-btn--active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('ms-filter-btn--active');
      btn.setAttribute('aria-selected', 'true');
      activeFilter = btn.dataset.filter;
      _renderMissions(allMissions);
    });
  }

  /* ───────── ANIMATIONS ───────── */
  function _animate() {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.from('#msHero', { opacity: 0, y: 30, duration: .7, ease: 'power2.out' });
    gsap.from('#msFilterBar', { opacity: 0, y: 20, duration: .5, ease: 'power2.out', delay: .2 });

    ScrollTrigger.batch('#msGrid .ms-card', {
      onEnter: function (els) {
        gsap.from(els, { opacity: 0, y: 40, stagger: .09, duration: .6, ease: 'power2.out' });
      },
      start: 'top 88%',
      once: true
    });

    ScrollTrigger.batch('#msSkillsSection', {
      onEnter: function (els) {
        gsap.from(els, { opacity: 0, y: 30, duration: .6, ease: 'power2.out' });
      },
      start: 'top 90%',
      once: true
    });
  }

  /* ───────── UTILS ───────── */
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ───────── BOOT ───────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
