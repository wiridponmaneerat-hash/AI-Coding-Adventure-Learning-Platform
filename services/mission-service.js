/* ============================================================
   AI Coding Adventure — services/mission-service.js
   Mission data layer: list, detail, and submission.

   In 'development' mode all functions resolve with static local data.
   In 'production' mode they delegate to ApiService → Google Apps Script.

   Google Sheets tables used:
     Missions  — mission definitions
     Scores    — student submissions and scores
     Analytics — activity events logged on submission

   Depends on: config/app-config.js, services/api.js, services/auth-service.js
   ============================================================ */

const MissionService = (function () {
  'use strict';

  /* ============================================================
     Local mission catalogue
     Mirrors the Missions sheet structure.
     Replace or extend when the backend is live.
     ============================================================ */
  const _localMissions = [
    {
      id: 1,
      title: 'สวัสดีโลก! Hello, World!',
      titleEn: 'Hello, World!',
      desc: 'เริ่มต้นการผจญภัยด้วยการเขียนโปรแกรมแรกของคุณ เรียนรู้การใช้ print() และตัวแปร',
      icon: 'terminal',
      color: '#22C55E',
      colorBg: 'linear-gradient(135deg,#22C55E,#16A34A)',
      difficulty: 'beginner',
      diffLabel: 'ง่าย',
      xpReward: 100,
      estimatedMinutes: 20,
      topics: ['print()', 'ตัวแปร', 'ชนิดข้อมูล'],
      totalSteps: 5,
      badgeOnComplete: 'mission1_complete',
    },
    {
      id: 2,
      title: 'เงื่อนไขและการตัดสินใจ',
      titleEn: 'Conditions',
      desc: 'สอน AI ให้ตัดสินใจได้! เรียนรู้ if / elif / else และ Boolean',
      icon: 'account_tree',
      color: '#3B82F6',
      colorBg: 'linear-gradient(135deg,#3B82F6,#2563EB)',
      difficulty: 'beginner',
      diffLabel: 'ง่าย',
      xpReward: 150,
      estimatedMinutes: 25,
      topics: ['if/else', 'Boolean', 'การเปรียบเทียบ'],
      totalSteps: 6,
      badgeOnComplete: 'mission2_complete',
    },
    {
      id: 3,
      title: 'วนซ้ำกับ Loop',
      titleEn: 'Loops',
      desc: 'สั่งให้ AI ทำงานซ้ำๆ อย่างชาญฉลาด เรียนรู้ for loop และ while loop',
      icon: 'loop',
      color: '#A855F7',
      colorBg: 'linear-gradient(135deg,#A855F7,#7C3AED)',
      difficulty: 'intermediate',
      diffLabel: 'ปานกลาง',
      xpReward: 200,
      estimatedMinutes: 30,
      topics: ['for loop', 'while loop', 'range()'],
      totalSteps: 7,
      badgeOnComplete: 'mission3_complete',
    },
    {
      id: 4,
      title: 'ฟังก์ชั่น — สร้างเครื่องมือของตัวเอง',
      titleEn: 'Functions',
      desc: 'สร้าง "ทักษะ" ให้ AI! เรียนรู้ def และ return เพื่อประหยัดโค้ด',
      icon: 'functions',
      color: '#F59E0B',
      colorBg: 'linear-gradient(135deg,#F59E0B,#D97706)',
      difficulty: 'intermediate',
      diffLabel: 'ปานกลาง',
      xpReward: 250,
      estimatedMinutes: 35,
      topics: ['def', 'return', 'parameters'],
      totalSteps: 8,
      badgeOnComplete: 'mission4_complete',
    },
    {
      id: 5,
      title: 'AI สร้างได้! — Mini Project',
      titleEn: 'Mini AI Project',
      desc: 'ใช้ทุกที่เรียนมาสร้าง Mini AI ของตัวเอง โปรเจกต์สุดท้ายที่ท้าทายที่สุด!',
      icon: 'smart_toy',
      color: '#EF4444',
      colorBg: 'linear-gradient(135deg,#EF4444,#DC2626)',
      difficulty: 'advanced',
      diffLabel: 'ยาก',
      xpReward: 350,
      estimatedMinutes: 45,
      topics: ['Mini AI', 'Input/Output', 'Logic'],
      totalSteps: 10,
      badgeOnComplete: 'mission5_complete',
    },
  ];

  /* ============================================================
     Private helpers
     ============================================================ */

  function _isProd() {
    return window.AppConfig && window.AppConfig.ENVIRONMENT === 'production';
  }

  function _findLocal(missionId) {
    for (var i = 0; i < _localMissions.length; i++) {
      if (_localMissions[i].id === Number(missionId)) return _localMissions[i];
    }
    return null;
  }

  /**
   * Annotate mission objects with the student's completion state.
   * @param {object[]} missions
   * @param {number[]} completedIds
   * @returns {object[]}
   */
  function _annotateMissions(missions, completedIds) {
    return missions.map(function (m) {
      var isCompleted = completedIds.indexOf(m.id) !== -1;
      /* A mission is unlocked when all previous missions are completed */
      var prevCompleted = m.id === 1 || completedIds.indexOf(m.id - 1) !== -1;
      return Object.assign({}, m, {
        isCompleted: isCompleted,
        isUnlocked:  isCompleted || prevCompleted,
        isCurrent:   !isCompleted && prevCompleted,
      });
    });
  }

  /* ============================================================
     Public API
     ============================================================ */

  /**
   * Fetch all missions, annotated with the current student's progress.
   *
   * @param {string} [userId] - Optional: student ID for progress annotation
   * @returns {Promise<{ok: boolean, data?: object[], error?: string}>}
   */
  async function getMissions(userId) {
    if (!_isProd()) {
      var completed = [];
      if (userId && window.AuthService) {
        var user = AuthService.getCurrentUser();
        if (user) completed = user.completedMissions || [];
      }
      return { ok: true, data: _annotateMissions(_localMissions, completed) };
    }

    /* Production */
    var params  = userId ? { userId: userId } : {};
    var result  = await ApiService.get('getMissions', params);
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Fetch a single mission by ID.
   *
   * @param {number|string} missionId
   * @param {string} [userId] - Include for progress context
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function getMission(missionId, userId) {
    if (!missionId) return { ok: false, error: 'missing_mission_id' };

    if (!_isProd()) {
      var m = _findLocal(missionId);
      if (!m) return { ok: false, error: 'mission_not_found' };

      var completed = [];
      if (userId && window.AuthService) {
        var u = AuthService.getCurrentUser();
        if (u) completed = u.completedMissions || [];
      }
      return { ok: true, data: _annotateMissions([m], completed)[0] };
    }

    /* Production */
    var result = await ApiService.get('getMission', { missionId: missionId, userId: userId });
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Submit a completed mission and record the student's score.
   * On success, the session is updated with new XP, level, and badges.
   *
   * Payload sent to backend:
   *   { userId, missionId, score, codeSnapshot, durationSeconds, submittedAt }
   *
   * Response from backend:
   *   { success, xpEarned, totalXp, level, newBadges, completedMissions }
   *
   * @param {string}        userId
   * @param {number|string} missionId
   * @param {object}        submission
   * @param {number}        submission.score           - Score 0–100
   * @param {string}        [submission.codeSnapshot]  - Student's code at submission
   * @param {number}        [submission.durationSeconds]
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function submitMission(userId, missionId, submission) {
    if (!userId)     return { ok: false, error: 'missing_user_id' };
    if (!missionId)  return { ok: false, error: 'missing_mission_id' };
    if (!submission) return { ok: false, error: 'missing_submission' };

    var score = Number(submission.score);
    if (isNaN(score) || score < 0 || score > 100) {
      return { ok: false, error: 'invalid_score' };
    }

    var m = _findLocal(missionId);
    if (!m) return { ok: false, error: 'mission_not_found' };

    if (!_isProd()) {
      /* Development: compute rewards locally and update session */
      var xpEarned = Math.round(m.xpReward * (score / 100));
      var user     = window.AuthService ? AuthService.getCurrentUser() : null;
      var newBadges = [];

      if (user) {
        var alreadyDone = (user.completedMissions || []).indexOf(Number(missionId)) !== -1;
        var newCompleted = alreadyDone
          ? user.completedMissions
          : (user.completedMissions || []).concat([Number(missionId)]);

        if (!alreadyDone && m.badgeOnComplete &&
            (user.badges || []).indexOf(m.badgeOnComplete) === -1) {
          newBadges = [m.badgeOnComplete];
        }

        var totalXp = (user.xp || 0) + (alreadyDone ? 0 : xpEarned);
        AuthService.updateSession({
          xp:                totalXp,
          badges:            (user.badges || []).concat(newBadges),
          completedMissions: newCompleted,
        });

        return {
          ok: true,
          data: {
            success:           true,
            xpEarned:          alreadyDone ? 0 : xpEarned,
            totalXp:           totalXp,
            newBadges:         newBadges,
            completedMissions: newCompleted,
            score:             score,
          },
        };
      }

      /* No session — return computed result without persisting */
      return {
        ok: true,
        data: { success: true, xpEarned: xpEarned, newBadges: [], score: score },
      };
    }

    /* Production */
    var payload = {
      userId:          userId,
      missionId:       Number(missionId),
      score:           score,
      codeSnapshot:    submission.codeSnapshot    || '',
      durationSeconds: submission.durationSeconds || 0,
      submittedAt:     new Date().toISOString(),
    };

    var result = await ApiService.post('submitMission', payload);
    if (!result.ok) return { ok: false, error: result.error, message: result.message };

    /* Sync session with server response */
    var body = result.data;
    if (body && window.AuthService) {
      AuthService.updateSession({
        xp:                body.totalXp,
        level:             body.level,
        badges:            body.badges || body.newBadges,
        completedMissions: body.completedMissions,
      });
    }

    return { ok: true, data: body };
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return {
    getMissions:   getMissions,
    getMission:    getMission,
    submitMission: submitMission,
  };

})();

window.MissionService = MissionService;
