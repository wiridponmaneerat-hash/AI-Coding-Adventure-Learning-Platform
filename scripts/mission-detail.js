(function () {
  'use strict';

  var session  = null;
  var mission  = null;
  var stepIdx  = 0;   /* 0-based lesson step index */
  var inQuiz   = false;
  var qIdx     = 0;   /* 0-based quiz question index */
  var answers  = [];  /* { selected: N|string, submitted: bool, correct: bool } per question */
  var startTime = 0;

  var AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#D97706','#059669','#DC2626','#0891B2'];

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  function init() {
    session = AuthService.requireRole(['student']);
    if (!session) return;
    _setupNav();

    var params    = new URLSearchParams(window.location.search);
    var missionId = parseInt(params.get('id'), 10);
    if (!missionId || missionId < 1 || missionId > 5) {
      window.location.href = 'missions.html';
      return;
    }

    fetch('../data/missions.json')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        mission = data.find(function (m) { return m.id === missionId; });
        if (!mission) { window.location.href = 'missions.html'; return; }

        /* Check unlock */
        var completed = session.completedMissions || [];
        var unlocked  = mission.id === 1 || completed.indexOf(mission.id - 1) !== -1 || completed.indexOf(mission.id) !== -1;
        if (!unlocked) { window.location.href = 'missions.html'; return; }

        _restoreProgress();
        _renderHeader();
        _buildStepBar();
        _showStep(stepIdx);
        _setupLessonNav();
        _setupQuiz();
        _setupOverlays();
        _animateEntrance();
        startTime = Date.now();
        if (typeof AnalyticsService !== 'undefined') {
          AnalyticsService.logEvent('mission_start', { missionId: mission.id, title: mission.title });
        }
      })
      .catch(function () { window.location.href = 'missions.html'; });
  }

  /* ═══════════════════════════════════
     NAV SETUP
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
     PROGRESS PERSISTENCE
  ═══════════════════════════════════ */
  var PROGRESS_KEY_PREFIX = 'aca_md_step_';

  function _saveProgress() {
    try { localStorage.setItem(PROGRESS_KEY_PREFIX + mission.id, stepIdx); } catch (e) {}
  }

  function _restoreProgress() {
    try {
      var saved = parseInt(localStorage.getItem(PROGRESS_KEY_PREFIX + mission.id), 10);
      if (!isNaN(saved) && saved >= 0 && saved < mission.steps.length) stepIdx = saved;
    } catch (e) {}
    /* init answer slots */
    answers = mission.quiz.map(function () { return { selected: null, submitted: false, correct: false }; });
  }

  /* ═══════════════════════════════════
     HEADER
  ═══════════════════════════════════ */
  function _renderHeader() {
    var isCompleted = (session.completedMissions || []).indexOf(mission.id) !== -1;

    /* Page title */
    document.title = mission.title + ' — AI Coding Adventure';

    /* Breadcrumb */
    var bc = document.getElementById('mdBreadcrumbTitle');
    if (bc) bc.textContent = 'Mission ' + mission.id;

    /* Icon */
    var iconWrap = document.getElementById('mdHeaderIcon');
    var iconEl   = document.getElementById('mdIconEl');
    if (iconWrap) iconWrap.style.background = mission.colorBg;
    if (iconEl) iconEl.textContent = mission.icon;

    /* Badges */
    var diffEl = document.getElementById('mdDiffBadge');
    var xpEl   = document.getElementById('mdXpVal');
    var timeEl = document.getElementById('mdTimeVal');
    if (diffEl) {
      diffEl.textContent = mission.diffLabel;
      var diffClass = { beginner: 'md-badge--diff-easy', intermediate: 'md-badge--diff-med', advanced: 'md-badge--diff-hard' }[mission.difficulty];
      if (diffClass) diffEl.classList.add(diffClass);
    }
    if (xpEl) xpEl.textContent = mission.xpReward;
    if (timeEl) timeEl.textContent = mission.estimatedMinutes;

    /* Title + desc */
    var titleEl = document.getElementById('mdTitle');
    var descEl  = document.getElementById('mdDesc');
    if (titleEl) titleEl.textContent = mission.title;
    if (descEl) descEl.textContent = mission.description;

    /* Topics */
    var topicsEl = document.getElementById('mdTopics');
    if (topicsEl) {
      topicsEl.innerHTML = (mission.topics || []).map(function (t) {
        return '<span class="md-topic-tag">' + _esc(t) + '</span>';
      }).join('');
    }

    /* Status */
    var statusRing  = document.getElementById('mdStatusRing');
    var statusIcon  = document.getElementById('mdStatusIcon');
    var statusLabel = document.getElementById('mdStatusLabel');
    if (isCompleted) {
      if (statusRing) statusRing.classList.add('md-status-ring--completed');
      if (statusIcon) statusIcon.textContent = 'check_circle';
      if (statusLabel) statusLabel.textContent = 'ผ่านแล้ว!';
    }
  }

  /* ═══════════════════════════════════
     STEP BAR
  ═══════════════════════════════════ */
  function _buildStepBar() {
    var container = document.getElementById('mdSteps');
    if (!container) return;
    container.innerHTML = '';

    var steps = mission.steps;
    steps.forEach(function (step, i) {
      /* connector before each step except first */
      if (i > 0) {
        var conn = document.createElement('div');
        conn.className = 'md-step-connector' + (i <= stepIdx ? ' md-step-connector--done' : '');
        conn.id = 'mdConn' + i;
        container.appendChild(conn);
      }

      var item = document.createElement('div');
      item.className = 'md-step-item';

      var isDone   = i < stepIdx;
      var isActive = i === stepIdx;
      var circleClass = isDone ? ' md-step-circle--done' : (isActive ? ' md-step-circle--active' : '');

      item.innerHTML =
        '<button class="md-step-btn" data-step="' + i + '" aria-label="ขั้นที่ ' + (i + 1) + ': ' + _esc(step.title) + '"' + (isActive ? ' aria-current="step"' : '') + '>' +
          '<div class="md-step-circle' + circleClass + '">' +
            (isDone ? '<span class="material-symbols-rounded" aria-hidden="true">check</span>' : (i + 1)) +
          '</div>' +
          '<span class="md-step-label">' + _esc(step.title.replace(/^[^\s]+\s/, '')) + '</span>' +
        '</button>';

      container.appendChild(item);
    });

    /* Quiz step */
    if (steps.length > 0) {
      var conn2 = document.createElement('div');
      conn2.className = 'md-step-connector' + (stepIdx >= steps.length ? ' md-step-connector--done' : '');
      conn2.id = 'mdConnQuiz';
      container.appendChild(conn2);
    }
    var quizItem = document.createElement('div');
    quizItem.className = 'md-step-item';
    var quizActive = stepIdx >= steps.length;
    quizItem.innerHTML =
      '<button class="md-step-btn" data-step="quiz" aria-label="แบบทดสอบ"' + (quizActive ? ' aria-current="step"' : '') + (stepIdx < steps.length ? ' disabled' : '') + '>' +
        '<div class="md-step-circle' + (quizActive ? ' md-step-circle--active' : '') + '">' +
          '<span class="material-symbols-rounded" aria-hidden="true">quiz</span>' +
        '</div>' +
        '<span class="md-step-label">แบบทดสอบ</span>' +
      '</button>';
    container.appendChild(quizItem);

    /* Step button click handlers */
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('.md-step-btn');
      if (!btn || btn.disabled) return;
      var s = btn.dataset.step;
      if (s === 'quiz' && stepIdx >= mission.steps.length) {
        _enterQuiz();
      } else {
        var idx = parseInt(s, 10);
        if (!isNaN(idx) && idx <= stepIdx) _showStep(idx);
      }
    });
  }

  function _updateStepBar() {
    var steps = mission.steps;
    steps.forEach(function (_, i) {
      var btn    = document.querySelector('.md-step-btn[data-step="' + i + '"]');
      var circle = btn ? btn.querySelector('.md-step-circle') : null;
      if (!circle) return;
      circle.className = 'md-step-circle';
      if (i < stepIdx) { circle.classList.add('md-step-circle--done'); circle.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check</span>'; }
      else if (i === stepIdx) { circle.classList.add('md-step-circle--active'); circle.textContent = i + 1; }
      else { circle.textContent = i + 1; }
      if (btn) btn.setAttribute('aria-current', i === stepIdx ? 'step' : 'false');

      var conn = document.getElementById('mdConn' + i);
      if (conn) { conn.className = 'md-step-connector' + (i <= stepIdx ? ' md-step-connector--done' : ''); }
    });

    /* Quiz step */
    var qBtn    = document.querySelector('.md-step-btn[data-step="quiz"]');
    var qCircle = qBtn ? qBtn.querySelector('.md-step-circle') : null;
    var qConn   = document.getElementById('mdConnQuiz');
    var allDone = stepIdx >= steps.length;
    if (qCircle) {
      qCircle.className = 'md-step-circle' + (allDone ? ' md-step-circle--active' : '');
    }
    if (qBtn) { qBtn.disabled = !allDone; qBtn.setAttribute('aria-current', allDone && inQuiz ? 'step' : 'false'); }
    if (qConn) qConn.className = 'md-step-connector' + (allDone ? ' md-step-connector--done' : '');
  }

  /* ═══════════════════════════════════
     LESSON STEPS
  ═══════════════════════════════════ */
  function _showStep(idx) {
    inQuiz = false;
    stepIdx = idx;
    _saveProgress();

    var step = mission.steps[idx];
    if (!step) return;

    var numEl   = document.getElementById('mdStepNum');
    var titleEl = document.getElementById('mdStepTitle');
    var bodyEl  = document.getElementById('mdLessonBody');

    if (numEl) numEl.textContent = 'ขั้นที่ ' + (idx + 1);
    if (titleEl) titleEl.textContent = step.title;
    if (bodyEl) {
      var html = _parseMarkdown(step.content);
      if (typeof gsap !== 'undefined') {
        gsap.to(bodyEl, { opacity: 0, duration: .15, onComplete: function () {
          bodyEl.innerHTML = html;
          gsap.to(bodyEl, { opacity: 1, duration: .3 });
        }});
      } else {
        bodyEl.innerHTML = html;
      }
    }

    /* Lesson panel visible, quiz panel hidden */
    var lessonPanel = document.getElementById('mdLessonPanel');
    var quizPanel   = document.getElementById('mdQuizPanel');
    if (lessonPanel) lessonPanel.hidden = false;
    if (quizPanel) quizPanel.hidden = true;

    _updateLessonNav();
    _updateDots();
    _updateStepBar();
    _updateLessonNavButtons();
  }

  function _updateLessonNav() {
    var prevBtn = document.getElementById('mdPrevBtn');
    var nextBtn = document.getElementById('mdNextBtn');
    var total   = mission.steps.length;

    if (prevBtn) {
      prevBtn.hidden = (stepIdx === 0);
    }
    if (nextBtn) {
      nextBtn.textContent = '';
      if (stepIdx === total - 1) {
        nextBtn.innerHTML = 'เริ่มแบบทดสอบ <span class="material-symbols-rounded" aria-hidden="true">quiz</span>';
      } else {
        nextBtn.innerHTML = 'ถัดไป <span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span>';
      }
    }
  }

  function _updateDots() {
    var dotsEl = document.getElementById('mdLessonDots');
    if (!dotsEl) return;
    var total = mission.steps.length;
    dotsEl.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var dot = document.createElement('span');
      dot.className = 'md-dot' + (i < stepIdx ? ' md-dot--done' : (i === stepIdx ? ' md-dot--active' : ''));
      dot.setAttribute('aria-hidden', 'true');
      dotsEl.appendChild(dot);
    }
  }

  function _updateLessonNavButtons() {
    /* keep buttons in sync — already handled in _updateLessonNav */
  }

  function _setupLessonNav() {
    var prevBtn = document.getElementById('mdPrevBtn');
    var nextBtn = document.getElementById('mdNextBtn');

    if (prevBtn) prevBtn.addEventListener('click', function () {
      if (stepIdx > 0) _showStep(stepIdx - 1);
    });

    if (nextBtn) nextBtn.addEventListener('click', function () {
      if (stepIdx < mission.steps.length - 1) {
        _showStep(stepIdx + 1);
      } else {
        _enterQuiz();
      }
    });
  }

  /* ═══════════════════════════════════
     QUIZ
  ═══════════════════════════════════ */
  function _enterQuiz() {
    inQuiz = true;
    stepIdx = mission.steps.length; /* move past all steps */
    _updateStepBar();

    var lessonPanel = document.getElementById('mdLessonPanel');
    var quizPanel   = document.getElementById('mdQuizPanel');
    if (lessonPanel) lessonPanel.hidden = true;
    if (quizPanel) quizPanel.hidden = false;

    qIdx = 0;
    answers = mission.quiz.map(function () { return { selected: null, submitted: false, correct: false }; });
    _showQuestion(qIdx);

    if (typeof gsap !== 'undefined') {
      gsap.from(quizPanel, { opacity: 0, y: 30, duration: .5, ease: 'power2.out' });
    }
  }

  function _showQuestion(idx) {
    var q      = mission.quiz[idx];
    var total  = mission.quiz.length;
    var answer = answers[idx];

    /* progress */
    var numEl   = document.getElementById('mdQNum');
    var totalEl = document.getElementById('mdQTotal');
    var fillEl  = document.getElementById('mdQProgFill');
    if (numEl) numEl.textContent = 'ข้อ ' + (idx + 1);
    if (totalEl) totalEl.textContent = total;
    if (fillEl) fillEl.style.width = ((idx + 1) / total * 100) + '%';

    /* type badge */
    var typeBadge = document.getElementById('mdQTypeBadge');
    if (typeBadge) typeBadge.textContent = q.type === 'coding' ? 'เขียนโค้ด' : 'Multiple Choice';

    /* question text */
    var qTextEl = document.getElementById('mdQText');
    if (qTextEl) qTextEl.textContent = q.question;

    /* Show/hide areas */
    var optionsEl   = document.getElementById('mdOptions');
    var codingEl    = document.getElementById('mdCodingArea');
    var feedbackEl  = document.getElementById('mdQFeedback');
    var hintPanel   = document.getElementById('mdHintPanel');
    if (feedbackEl) feedbackEl.hidden = true;
    if (hintPanel) hintPanel.hidden = true;

    if (q.type === 'coding') {
      if (optionsEl) optionsEl.innerHTML = '';
      if (codingEl) codingEl.hidden = false;
      var editor = document.getElementById('mdCodeEditor');
      if (editor) {
        editor.value = answer.submitted ? (answer.codeAnswer || '') : (q.sampleCode || '');
        editor.disabled = answer.submitted;
      }
      var hintBtn = document.getElementById('mdHintBtn');
      var hintText = document.getElementById('mdHintText');
      if (hintBtn) {
        hintBtn.onclick = function () {
          if (hintPanel) hintPanel.hidden = !hintPanel.hidden;
          if (hintText) hintText.textContent = q.hint || '';
        };
      }
    } else {
      if (codingEl) codingEl.hidden = true;
      if (optionsEl) _renderOptions(q, idx, answer);
    }

    /* feedback if already submitted */
    if (answer.submitted) _showFeedback(idx);

    /* nav buttons */
    _updateQuizNav(idx);
  }

  function _renderOptions(q, qIndex, answer) {
    var optionsEl = document.getElementById('mdOptions');
    if (!optionsEl) return;
    optionsEl.innerHTML = '';
    var letters = ['A','B','C','D'];

    q.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      var classes = 'md-option';
      if (answer.submitted) {
        if (i === q.correct) classes += ' md-option--correct';
        else if (i === answer.selected) classes += ' md-option--wrong';
      } else if (answer.selected === i) {
        classes += ' md-option--selected';
      }
      btn.className = classes;
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-label', letters[i] + ': ' + opt);
      if (answer.submitted) btn.disabled = true;
      btn.innerHTML = '<span class="md-option-letter" aria-hidden="true">' + letters[i] + '</span>' + _esc(opt);
      btn.addEventListener('click', function () {
        if (answers[qIndex].submitted) return;
        answers[qIndex].selected = i;
        _renderOptions(q, qIndex, answers[qIndex]);
      });
      optionsEl.appendChild(btn);
    });
  }

  function _setupQuiz() {
    var submitBtn = document.getElementById('mdQSubmitBtn');
    var finishBtn = document.getElementById('mdFinishBtn');
    var nextBtn   = document.getElementById('mdQNextBtn');
    var prevBtn   = document.getElementById('mdQPrevBtn');

    if (submitBtn) submitBtn.addEventListener('click', _submitAnswer);
    if (finishBtn) finishBtn.addEventListener('click', _finishQuiz);
    if (nextBtn) nextBtn.addEventListener('click', function () { if (qIdx < mission.quiz.length - 1) { qIdx++; _showQuestion(qIdx); } });
    if (prevBtn) prevBtn.addEventListener('click', function () { if (qIdx > 0) { qIdx--; _showQuestion(qIdx); } });
  }

  function _submitAnswer() {
    var q      = mission.quiz[qIdx];
    var answer = answers[qIdx];
    if (answer.submitted) return;

    if (q.type === 'coding') {
      var code = (document.getElementById('mdCodeEditor') || {}).value || '';
      answer.codeAnswer = code;
      answer.correct = _checkCode(code, q);
    } else {
      if (answer.selected === null) {
        /* shake the options */
        var optionsEl = document.getElementById('mdOptions');
        if (optionsEl && typeof gsap !== 'undefined') {
          gsap.from(optionsEl, { x: 8, duration: .3, ease: 'elastic.out(1,0.5)', yoyo: true, repeat: 1 });
        }
        return;
      }
      answer.correct = (answer.selected === q.correct);
    }

    answer.submitted = true;
    if (typeof AnalyticsService !== 'undefined') {
      AnalyticsService.logEvent('quiz_answer', {
        missionId: mission.id,
        qIndex:    qIdx,
        correct:   answer.correct,
        type:      q.type,
      });
    }
    _showFeedback(qIdx);
    _renderOptions(q, qIdx, answer);
    _updateQuizNav(qIdx);
  }

  function _checkCode(code, q) {
    var c = code.toLowerCase();
    var keywords = q.checkKeywords || [];
    for (var i = 0; i < keywords.length; i++) {
      if (c.indexOf(keywords[i].toLowerCase()) === -1) return false;
    }
    if (q.expectedPattern) {
      try { if (!new RegExp(q.expectedPattern, 'i').test(code)) return false; } catch (e) {}
    }
    return code.trim().length > 5;
  }

  function _showFeedback(idx) {
    var q         = mission.quiz[idx];
    var answer    = answers[idx];
    var feedbackEl = document.getElementById('mdQFeedback');
    var iconEl    = document.getElementById('mdFeedbackIcon');
    var textEl    = document.getElementById('mdFeedbackText');
    if (!feedbackEl) return;

    feedbackEl.hidden = false;
    feedbackEl.className = 'md-q-feedback' + (answer.correct ? '' : ' md-q-feedback--wrong');
    if (iconEl) iconEl.textContent = answer.correct ? 'check_circle' : 'cancel';
    if (textEl) textEl.textContent = answer.correct ? '✅ ถูกต้อง! ' + (q.explanation || '') : '❌ ยังไม่ถูก — ' + (q.explanation || '');

    /* Disable submit, show next/finish */
    var submitBtn = document.getElementById('mdQSubmitBtn');
    if (submitBtn) submitBtn.hidden = true;
    _updateQuizNav(idx);
  }

  function _updateQuizNav(idx) {
    var total     = mission.quiz.length;
    var answer    = answers[idx];
    var submitted = answer.submitted;
    var allSubmitted = answers.every(function (a) { return a.submitted; });

    var submitBtn = document.getElementById('mdQSubmitBtn');
    var nextBtn   = document.getElementById('mdQNextBtn');
    var prevBtn   = document.getElementById('mdQPrevBtn');
    var finishBtn = document.getElementById('mdFinishBtn');

    if (submitBtn) submitBtn.hidden = submitted;
    if (prevBtn) prevBtn.hidden = (idx === 0);
    if (nextBtn) nextBtn.hidden = !submitted || idx === total - 1;
    if (finishBtn) finishBtn.hidden = !(allSubmitted && idx === total - 1);
  }

  /* ═══════════════════════════════════
     FINISH & SCORE
  ═══════════════════════════════════ */
  function _finishQuiz() {
    var total   = mission.quiz.length;
    var correct = answers.filter(function (a) { return a.correct; }).length;
    var pct     = Math.round(correct / total * 100);

    if (pct >= 60) {
      _showCompletion(pct, correct, total);
    } else {
      if (typeof AnalyticsService !== 'undefined') {
        AnalyticsService.logEvent('mission_fail', { missionId: mission.id, score: pct });
      }
      _showRetry(pct);
    }
  }

  function _showCompletion(pct, correct, total) {
    var elapsed     = Math.round((Date.now() - startTime) / 1000);
    var completed   = session.completedMissions || [];
    var isFirstTime = completed.indexOf(mission.id) === -1;
    var xpEarned    = isFirstTime ? Math.round(mission.xpReward * (pct / 100)) : 0;
    /* Full XP on first pass, proportional otherwise */
    if (isFirstTime && pct >= 100) xpEarned = mission.xpReward;

    /* Update session */
    if (isFirstTime) {
      var newCompleted = completed.concat([mission.id]);
      var newXP        = (session.xp || 0) + xpEarned;
      var newBadges    = (session.badges || []).slice();
      var badgeCode    = mission.badgeOnComplete;
      var earnedBadge  = false;
      if (badgeCode && newBadges.indexOf(badgeCode) === -1) {
        newBadges.push(badgeCode);
        earnedBadge = true;
      }
      /* perfect score badge */
      if (pct === 100 && newBadges.indexOf('perfect_score') === -1) {
        newBadges.push('perfect_score');
      }
      /* all missions badge */
      if (newCompleted.length >= 5 && newBadges.indexOf('all_missions') === -1) {
        newBadges.push('all_missions');
      }
      /* speed badge */
      if (elapsed < 900 && newBadges.indexOf('speed_learner') === -1) {
        newBadges.push('speed_learner');
      }

      var newLevel     = _calcLevel(newXP);
      AuthService.updateSession({
        xp: newXP,
        level: newLevel.level,
        levelName: newLevel.name,
        completedMissions: newCompleted,
        badges: newBadges
      });
      session = AuthService.getCurrentUser();

      if (typeof AnalyticsService !== 'undefined') {
        AnalyticsService.logEvent('mission_complete', {
          missionId: mission.id,
          score:     pct,
          xpEarned:  xpEarned,
          duration:  elapsed,
          firstTime: isFirstTime,
        });
      }

      /* Show overlay */
      _populateCompletionOverlay(pct, xpEarned, earnedBadge, badgeCode);
    } else {
      _populateCompletionOverlay(pct, 0, false, null);
    }

    /* Clear saved step progress so next visit starts fresh */
    try { localStorage.removeItem('aca_md_step_' + mission.id); } catch (e) {}

    var overlay = document.getElementById('mdCompletionOverlay');
    if (overlay) {
      overlay.hidden = false;
      if (typeof gsap !== 'undefined') {
        gsap.from(overlay.querySelector('.md-completion-card'), { scale: .8, opacity: 0, duration: .5, ease: 'back.out(1.7)' });
      }
    }
  }

  function _populateCompletionOverlay(pct, xpEarned, earnedBadge, badgeCode) {
    var scoreEl    = document.getElementById('mdCompScore');
    var xpEl       = document.getElementById('mdCompXP');
    var accuracyEl = document.getElementById('mdCompAccuracy');
    var badgeRow   = document.getElementById('mdCompBadgeRow');
    var badgeSymEl = document.getElementById('mdCompBadgeSymbol');
    var badgeNameEl= document.getElementById('mdCompBadgeName');
    var nextBtn    = document.getElementById('mdCompNext');

    if (scoreEl) scoreEl.textContent = pct;
    if (xpEl) xpEl.textContent = xpEarned > 0 ? '+' + xpEarned : '0';
    if (accuracyEl) accuracyEl.textContent = pct + '%';

    if (badgeRow) {
      if (earnedBadge && badgeCode) {
        badgeRow.hidden = false;
        /* fetch badge info */
        fetch('../data/badges.json').then(function (r) { return r.json(); }).then(function (badges) {
          var b = badges.find(function (x) { return x.code === badgeCode; });
          if (b) {
            if (badgeSymEl) badgeSymEl.textContent = b.icon;
            if (badgeNameEl) badgeNameEl.textContent = b.name;
          }
        }).catch(function () {});
      } else {
        badgeRow.hidden = true;
      }
    }

    /* next mission link */
    var nextId = mission.id + 1;
    if (nextBtn) {
      if (nextId <= 5) {
        nextBtn.href = 'mission-detail.html?id=' + nextId;
        nextBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span> Mission ' + nextId;
      } else {
        nextBtn.href = 'missions.html';
        nextBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">emoji_events</span> ดูผลลัพธ์';
      }
    }
  }

  function _showRetry(pct) {
    var retryScoreEl = document.getElementById('mdRetryScore');
    if (retryScoreEl) retryScoreEl.textContent = pct;

    var overlay = document.getElementById('mdRetryOverlay');
    if (overlay) {
      overlay.hidden = false;
      if (typeof gsap !== 'undefined') {
        gsap.from(overlay.querySelector('.md-retry-card'), { scale: .85, opacity: 0, duration: .4, ease: 'back.out(1.7)' });
      }
    }
  }

  function _setupOverlays() {
    /* Retry */
    var retryLessonBtn = document.getElementById('mdRetryLessonBtn');
    var retryQuizBtn   = document.getElementById('mdRetryQuizBtn');
    if (retryLessonBtn) retryLessonBtn.addEventListener('click', function () {
      document.getElementById('mdRetryOverlay').hidden = true;
      _showStep(0);
    });
    if (retryQuizBtn) retryQuizBtn.addEventListener('click', function () {
      document.getElementById('mdRetryOverlay').hidden = true;
      answers = mission.quiz.map(function () { return { selected: null, submitted: false, correct: false }; });
      qIdx = 0;
      _enterQuiz();
    });
  }

  /* ═══════════════════════════════════
     LEVEL CALC
  ═══════════════════════════════════ */
  var XP_LEVELS = [
    { level:1, name:'มือใหม่', min:0 },
    { level:2, name:'ผู้เรียนรู้', min:300 },
    { level:3, name:'นักสำรวจ', min:600 },
    { level:4, name:'นักพัฒนา', min:1000 },
    { level:5, name:'AI Master', min:1500 }
  ];
  function _calcLevel(xp) {
    var lvl = XP_LEVELS[0];
    for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
      if (xp >= XP_LEVELS[i].min) { lvl = XP_LEVELS[i]; break; }
    }
    return lvl;
  }

  /* ═══════════════════════════════════
     MARKDOWN PARSER (minimal)
  ═══════════════════════════════════ */
  function _parseMarkdown(md) {
    if (!md) return '';

    /* code blocks */
    var html = md.replace(/```[\w]*\n?([\s\S]*?)```/g, function (_, code) {
      return '<pre><code>' + _esc(code.trim()) + '</code></pre>';
    });

    /* inline code */
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    /* headings */
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    /* bold */
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    /* simple table */
    html = html.replace(/((\|[^\n]+\|\n)+)/g, function (block) {
      var rows = block.trim().split('\n');
      var out  = '<table>';
      rows.forEach(function (row, ri) {
        if (/^\|[-| :]+\|$/.test(row)) return; /* separator row */
        var cells = row.replace(/^\||\|$/g, '').split('|');
        var tag   = ri === 0 ? 'th' : 'td';
        out += '<tr>' + cells.map(function (c) { return '<' + tag + '>' + c.trim() + '</' + tag + '>'; }).join('') + '</tr>';
      });
      return out + '</table>';
    });

    /* unordered list */
    html = html.replace(/(^- .+$\n?)+/gm, function (block) {
      var items = block.trim().split('\n').map(function (l) { return '<li>' + l.replace(/^- /, '') + '</li>'; });
      return '<ul>' + items.join('') + '</ul>';
    });

    /* paragraphs — split on double newlines */
    html = html.split(/\n\n+/).map(function (para) {
      para = para.trim();
      if (!para) return '';
      if (/^<(h[1-6]|pre|ul|ol|table|li)/.test(para)) return para;
      return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    return html;
  }

  /* ═══════════════════════════════════
     ANIMATIONS
  ═══════════════════════════════════ */
  function _animateEntrance() {
    if (typeof gsap === 'undefined') return;
    var tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('.md-breadcrumb', { opacity: 0, y: -10, duration: .4 })
      .from('.md-header',     { opacity: 0, y: 20,  duration: .5 }, '-=.2')
      .from('.md-step-bar',   { opacity: 0, y: 15,  duration: .4 }, '-=.3')
      .from('.md-lesson-panel, .md-quiz-panel', { opacity: 0, y: 20, duration: .5 }, '-=.2');
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

  /* Hide overlays when browser restores page from BFCache */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      var retryEl      = document.getElementById('mdRetryOverlay');
      var completionEl = document.getElementById('mdCompletionOverlay');
      if (retryEl)      retryEl.hidden      = true;
      if (completionEl) completionEl.hidden = true;
    }
  });
})();
