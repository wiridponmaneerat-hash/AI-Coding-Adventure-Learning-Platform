/* ============================================================
   AI Coding Adventure — services/auth-service.js
   Authentication module with API-ready architecture.

   Behaviour driven by AppConfig.ENVIRONMENT:
     'development' — authenticates against inline fallback data (no server needed)
     'production'  — authenticates via ApiService → Google Apps Script

   Depends on: config/app-config.js, services/api.js
   ============================================================ */

const AuthService = (function () {
  'use strict';

  /* ============================================================
     Fallback user data — used when ENVIRONMENT = 'development'
     Mirrors the structure returned by the Google Sheets backend.
     ============================================================ */
  const _fallbackUsers = [
    {
      id: 'STD001', name: 'นภัสสร สุขใจ', password: 'student123',
      role: 'student', class: 'ป.5/1', avatar: 'น', xp: 850, level: 4,
      badges: ['first_login', 'mission1_complete', 'mission2_complete'],
      completedMissions: [1, 2], theme: 'default', joinDate: '2026-01-15',
    },
    {
      id: 'STD002', name: 'ปภัสรา คงดี', password: 'learn2code',
      role: 'student', class: 'ป.5/1', avatar: 'ป', xp: 650, level: 3,
      badges: ['first_login', 'mission1_complete'],
      completedMissions: [1], theme: 'default', joinDate: '2026-01-15',
    },
    {
      id: 'TCH001', name: 'ครูวิริยา สมใจ', password: 'teacher123',
      role: 'teacher', subject: 'วิทยาการคำนวณ', classes: ['ป.5'],
      avatar: 'ว', xp: 0, level: 1, badges: [], completedMissions: [],
      theme: 'default', joinDate: '2026-01-10',
    },
    {
      id: 'ADM001', name: 'ผู้ดูแลระบบ', password: 'admin2026',
      role: 'admin', avatar: 'ผ', permissions: ['all'],
      xp: 0, level: 1, badges: [], completedMissions: [],
      theme: 'default', joinDate: '2026-01-01',
    },
  ];

  /* ============================================================
     Private helpers
     ============================================================ */

  function _cfg() {
    return window.AppConfig || { SESSION_KEY: 'aca_session', ENVIRONMENT: 'development', ROUTES: {} };
  }

  function _sessionKey() { return _cfg().SESSION_KEY || 'aca_session'; }

  function _isProd() { return _cfg().ENVIRONMENT === 'production'; }

  /** Persist session in localStorage (remember=true) or sessionStorage (tab only). */
  function _saveSession(session, remember) {
    var payload = JSON.stringify(session);
    var key     = _sessionKey();
    if (remember) {
      localStorage.setItem(key, payload);
      sessionStorage.removeItem(key);
    } else {
      sessionStorage.setItem(key, payload);
      localStorage.removeItem(key);
    }
  }

  /** Read session from storage — sessionStorage wins over localStorage. */
  function _readSession() {
    var key = _sessionKey();
    var raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (_) { return null; }
  }

  /** Remove session from both storages. */
  function _clearSession() {
    var key = _sessionKey();
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }

  /** Determine the login page path relative to the current page's depth. */
  function _getLoginPath() {
    var path = window.location.pathname.replace(/\\/g, '/');
    if (path.includes('/dashboard/')) return '../pages/login.html';
    if (path.includes('/pages/'))     return 'login.html';
    return 'pages/login.html';
  }

  /**
   * Build a sanitised session payload from a raw user record.
   * Same structure whether the user comes from local data or the API.
   */
  function _buildSession(user) {
    return {
      userId:            user.id,
      name:              user.name,
      role:              user.role,
      avatar:            user.avatar || (user.name || '?').charAt(0),
      avatarColor:       user.avatarColor || null,
      xp:                user.xp    || 0,
      level:             user.level || 1,
      badges:            Array.isArray(user.badges) ? user.badges : [],
      completedMissions: Array.isArray(user.completedMissions) ? user.completedMissions : [],
      class:             user.class   || null,
      classes:           Array.isArray(user.classes) ? user.classes : null,
      subject:           user.subject || null,
      nickname:          user.nickname || null,
      email:             user.email    || null,
      bio:               user.bio      || null,
      theme:             user.theme    || 'default',
      loginTime:         new Date().toISOString(),
    };
  }

  /* ============================================================
     Authentication — development mode (local data)
     ============================================================ */
  function _loginLocal(userId, password, role) {
    var match;
    if (role === 'student') {
      /* Students log in with user ID only — no password required */
      match = _fallbackUsers.find(function (u) {
        return u.id.toUpperCase() === userId.toUpperCase() && u.role === 'student';
      });
    } else {
      match = _fallbackUsers.find(function (u) {
        return u.id.toUpperCase() === userId.toUpperCase() && u.password === password;
      });
    }

    if (!match)              return { success: false, error: 'invalid_credentials' };
    if (match.role !== role) return { success: false, error: 'role_mismatch' };

    return { success: true, user: match };
  }

  /* ============================================================
     Authentication — production mode (Google Apps Script)
     ============================================================ */
  async function _loginRemote(userId, password, role) {
    if (!window.ApiService) {
      console.warn('AuthService: ApiService not loaded — falling back to local auth');
      return _loginLocal(userId, password, role);
    }

    var result = await ApiService.post('login', {
      userId:   userId,
      password: password,
      role:     role,
    });

    if (!result.ok) {
      return { success: false, error: result.error || 'server_error', message: result.message };
    }

    /* Backend returns { success, user } or { success: false, error } */
    var body = result.data;
    if (!body.success) {
      return { success: false, error: body.error || 'auth_failed' };
    }

    return { success: true, user: body.user };
  }

  /* ============================================================
     Public API
     ============================================================ */

  /**
   * Authenticate a user.
   * Routes to local fallback (development) or Google Apps Script (production).
   *
   * @param {string}  userId   - User ID, e.g. "STD001"
   * @param {string}  password - Plain-text password
   * @param {string}  role     - Expected role: "student" | "teacher" | "admin"
   * @param {boolean} [remember=false] - Persist session across browser sessions
   * @returns {Promise<{success: boolean, user?: object, error?: string, message?: string}>}
   */
  async function login(userId, password, role, remember) {
    remember = remember || false;
    var result = _isProd()
      ? await _loginRemote(userId, password, role)
      : _loginLocal(userId, password, role);

    if (!result.success) return result;

    var session = _buildSession(result.user);
    _saveSession(session, remember);
    try {
      var hintKey = _cfg().REMEMBER_HINT_KEY || 'aca_remember_hint';
      if (remember) {
        localStorage.setItem(hintKey, JSON.stringify({ userId: session.userId, role: session.role }));
      } else {
        localStorage.removeItem(hintKey);
      }
    } catch (_) {}
    return { success: true, user: session };
  }

  /**
   * Destroy the current session and redirect to the login page.
   */
  function logout() {
    _clearSession();
    window.location.href = _getLoginPath();
  }

  /**
   * Check whether a valid session exists.
   * @returns {boolean}
   */
  function isLoggedIn() {
    return !!_readSession();
  }

  /**
   * Retrieve the current session object, or null if not authenticated.
   * @returns {object|null}
   */
  function getCurrentUser() {
    return _readSession();
  }

  /**
   * Explicitly persist a session object.
   * @param {object}  session
   * @param {boolean} [remember=false]
   */
  function saveSession(session, remember) {
    _saveSession(session, !!remember);
  }

  /**
   * Remove the current session from all storages.
   */
  function clearSession() {
    _clearSession();
  }

  /**
   * Guard a page to a specific set of roles.
   * Redirects unauthenticated or unauthorised visitors to login.
   *
   * @param {string|string[]} allowedRoles
   * @returns {boolean} true if access is granted
   */
  function requireRole(allowedRoles) {
    var user  = _readSession();
    if (!user) { window.location.href = _getLoginPath(); return false; }

    var roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (roles.indexOf(user.role) === -1) {
      window.location.href = _getLoginPath();
      return false;
    }
    return user;
  }

  /**
   * Return the post-login redirect path for a given role.
   * Paths are relative to the pages/ directory.
   *
   * @param {string} role
   * @returns {string}
   */
  function getRedirectPath(role) {
    var routes = (_cfg().ROUTES) || {};
    return routes[role] || 'home.html';
  }

  /**
   * Merge partial updates into the current session without re-logging in.
   * Use this to reflect XP / badge changes from API responses.
   *
   * @param {object} updates - Partial session properties to merge
   */
  function updateSession(updates) {
    var session = _readSession();
    if (!session) return;
    var merged  = Object.assign({}, session, updates);
    var inLocal = !!localStorage.getItem(_sessionKey());
    _saveSession(merged, inLocal);
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return {
    login:           login,
    logout:          logout,
    isLoggedIn:      isLoggedIn,
    getCurrentUser:  getCurrentUser,
    getSession:      getCurrentUser,
    saveSession:     saveSession,
    clearSession:    clearSession,
    requireRole:     requireRole,
    getRedirectPath: getRedirectPath,
    updateSession:   updateSession,
  };

})();

window.AuthService = AuthService;
