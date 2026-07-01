/* ============================================================
   AI Coding Adventure — services/student-service.js
   Student data layer: profile, dashboard metrics.

   In 'development' mode all functions resolve with local session data.
   In 'production' mode they delegate to ApiService → Google Apps Script.

   Google Sheets tables used:
     Students  — profile fields
     Scores    — per-mission scores
     Badges    — earned badge IDs
     Analytics — learning activity log

   Depends on: config/app-config.js, services/api.js, services/auth-service.js
   ============================================================ */

const StudentService = (function () {
  'use strict';

  /* ============================================================
     Private helpers
     ============================================================ */

  function _isProd() {
    return window.AppConfig && window.AppConfig.ENVIRONMENT === 'production';
  }

  /**
   * Compute a simple XP-level mapping from the session's XP value.
   * Mirrors the server-side logic so the UI never needs to wait for an API
   * call just to display the current level.
   *
   * @param {number} xp
   * @returns {{ level: number, name: string, min: number, max: number }}
   */
  function _computeLevel(xp) {
    var table = [
      { level: 1, name: 'มือใหม่',      min: 0,    max: 299  },
      { level: 2, name: 'ผู้เรียนรู้',  min: 300,  max: 599  },
      { level: 3, name: 'นักสำรวจ',    min: 600,  max: 999  },
      { level: 4, name: 'นักพัฒนา',    min: 1000, max: 1499 },
      { level: 5, name: 'AI Master',   min: 1500, max: 9999  },
    ];
    var info = table[0];
    for (var i = 0; i < table.length; i++) {
      if (xp >= table[i].min) info = table[i];
    }
    return info;
  }

  /**
   * Build a dashboard summary object from session data.
   * Used as the local fallback; the production API returns the same shape.
   *
   * @param {object} user - Session object from AuthService.getCurrentUser()
   * @returns {object}
   */
  function _buildLocalDashboard(user) {
    var xp        = user.xp || 0;
    var completed = (user.completedMissions || []).length;
    var lvInfo    = _computeLevel(xp);
    var avgScore  = completed > 0 ? Math.min(100, Math.round(72 + completed * 5.4)) : 0;

    return {
      userId:            user.userId,
      name:              user.name,
      avatar:            user.avatar,
      class:             user.class,
      xp:                xp,
      level:             lvInfo.level,
      levelName:         lvInfo.name,
      levelMin:          lvInfo.min,
      levelMax:          lvInfo.max,
      badges:            user.badges || [],
      completedMissions: user.completedMissions || [],
      stats: {
        missions:  { completed: completed, total: 5 },
        avgScore:  avgScore,
        xp:        xp,
        badges:    (user.badges || []).length,
      },
      streak: 5,        /* placeholder — replaced by real value from backend */
      lastActivity: new Date().toISOString(),
    };
  }

  /* ============================================================
     Public API
     ============================================================ */

  /**
   * Fetch a student's profile data.
   *
   * @param {string} userId - Student ID, e.g. "STD001"
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function getProfile(userId) {
    if (!userId) return { ok: false, error: 'missing_user_id' };

    if (!_isProd()) {
      /* Development: return session data */
      var user = window.AuthService ? AuthService.getCurrentUser() : null;
      if (!user) return { ok: false, error: 'not_authenticated' };
      return {
        ok: true,
        data: {
          userId:  user.userId,
          name:    user.name,
          avatar:  user.avatar,
          class:   user.class,
          role:    user.role,
          theme:   user.theme,
          xp:      user.xp,
          level:   user.level,
          badges:  user.badges,
          completedMissions: user.completedMissions,
        },
      };
    }

    /* Production: Google Apps Script */
    var result = await ApiService.get('getStudentProfile', { userId: userId });
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Update a student's profile fields (display name, theme, avatar).
   *
   * @param {string} userId  - Student ID
   * @param {object} updates - Fields to update: { name?, theme?, avatar? }
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function updateProfile(userId, updates) {
    if (!userId) return { ok: false, error: 'missing_user_id' };
    if (!updates || !Object.keys(updates).length) return { ok: false, error: 'no_updates' };

    if (!_isProd()) {
      /* Development: merge into session */
      if (window.AuthService) {
        AuthService.updateSession(updates);
      }
      return { ok: true, data: updates };
    }

    /* Production */
    var result = await ApiService.put('updateStudentProfile', { userId: userId, updates: updates });
    if (!result.ok) return { ok: false, error: result.error, message: result.message };

    /* Refresh session with server response */
    if (result.data && window.AuthService) {
      AuthService.updateSession(result.data);
    }
    return { ok: true, data: result.data };
  }

  /**
   * Fetch all data needed to render the student home dashboard.
   * Returns a single aggregated object so the page makes only one request.
   *
   * @param {string} userId
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function getDashboard(userId) {
    if (!userId) return { ok: false, error: 'missing_user_id' };

    if (!_isProd()) {
      var user = window.AuthService ? AuthService.getCurrentUser() : null;
      if (!user) return { ok: false, error: 'not_authenticated' };
      return { ok: true, data: _buildLocalDashboard(user) };
    }

    /* Production: single aggregated endpoint */
    var result = await ApiService.get('getStudentDashboard', { userId: userId });
    if (!result.ok) return { ok: false, error: result.error, message: result.message };

    /* Keep session fresh */
    if (result.data && window.AuthService) {
      AuthService.updateSession({
        xp:                result.data.xp,
        level:             result.data.level,
        badges:            result.data.badges,
        completedMissions: result.data.completedMissions,
      });
    }
    return { ok: true, data: result.data };
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return {
    getProfile:    getProfile,
    updateProfile: updateProfile,
    getDashboard:  getDashboard,
  };

})();

window.StudentService = StudentService;
