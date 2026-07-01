/* ============================================================
   AI Coding Adventure — services/google-sheet.js
   Frontend service for class-level and leaderboard data.

   Used primarily by the teacher dashboard and the leaderboard page.
   In 'development' mode all methods resolve with local mock data.
   In 'production' mode they delegate to ApiService → Google Apps Script.

   Depends on: config/app-config.js, services/api.js, services/auth-service.js
   ============================================================ */

const GoogleSheetService = (function () {
  'use strict';

  /* ============================================================
     Mock data — dev mode fallback
     ============================================================ */

  var _MOCK_STUDENTS = [
    { userId:'STD001', name:'นภัสสร สุขใจ',    class:'ป.5/1', xp:850,  level:4, completedMissions:[1,2],     badges:['first_login','mission1_complete','mission2_complete'],    joinDate:'2026-01-15' },
    { userId:'STD002', name:'ปภัสรา คงดี',      class:'ป.5/1', xp:500,  level:2, completedMissions:[1],       badges:['first_login','mission1_complete'],                        joinDate:'2026-01-15' },
    { userId:'STD003', name:'มาริสา นาคทอง',   class:'ป.5/1', xp:1200, level:5, completedMissions:[1,2,3],   badges:['first_login','mission1_complete','mission2_complete','mission3_complete'], joinDate:'2026-01-15' },
    { userId:'STD004', name:'พีรพัฒน์ สุขศรี', class:'ป.5/2', xp:950,  level:4, completedMissions:[1,2],     badges:['first_login','mission1_complete','mission2_complete'],    joinDate:'2026-01-16' },
    { userId:'STD005', name:'กรกช วงศ์ดี',      class:'ป.5/1', xp:720,  level:3, completedMissions:[1,2],     badges:['first_login','mission1_complete','mission2_complete'],    joinDate:'2026-01-16' },
    { userId:'STD006', name:'ณัฐกานต์ แสงทอง', class:'ป.5/2', xp:650,  level:3, completedMissions:[1],       badges:['first_login','mission1_complete'],                        joinDate:'2026-01-17' },
    { userId:'STD007', name:'ชญาภา รัตนกูล',    class:'ป.5/2', xp:300,  level:2, completedMissions:[1],       badges:['first_login','mission1_complete'],                        joinDate:'2026-01-18' },
    { userId:'STD008', name:'ธนภัทร จันทร์แดง', class:'ป.5/1', xp:150,  level:1, completedMissions:[],        badges:['first_login'],                                           joinDate:'2026-01-19' },
    { userId:'STD009', name:'อาทิตยา สมใจ',     class:'ป.5/2', xp:100,  level:1, completedMissions:[],        badges:['first_login'],                                           joinDate:'2026-01-20' },
    { userId:'STD010', name:'วรรณิสา พรมมา',    class:'ป.5/2', xp:50,   level:1, completedMissions:[],        badges:['first_login'],                                           joinDate:'2026-01-20' },
  ];

  /* ============================================================
     Private helpers
     ============================================================ */

  function _isProd() {
    return window.AppConfig && window.AppConfig.ENVIRONMENT === 'production';
  }

  function _sortByXp(students) {
    return students.slice().sort(function (a, b) {
      if (b.xp !== a.xp) return b.xp - a.xp;
      return (b.completedMissions || []).length - (a.completedMissions || []).length;
    });
  }

  function _filterByClasses(students, classes) {
    if (!classes || !classes.length) return students;
    return students.filter(function (s) { return classes.indexOf(s.class) !== -1; });
  }

  function _computeClassStats(students) {
    var n       = students.length;
    var totXP   = students.reduce(function (acc, s) { return acc + (s.xp || 0); }, 0);
    var totMiss = students.reduce(function (acc, s) { return acc + (s.completedMissions || []).length; }, 0);
    var totBadge= students.reduce(function (acc, s) { return acc + (s.badges || []).length; }, 0);

    /* Per-mission completion counts */
    var missionCounts = [0,0,0,0,0];
    students.forEach(function (s) {
      (s.completedMissions || []).forEach(function (mid) {
        if (mid >= 1 && mid <= 5) missionCounts[mid - 1]++;
      });
    });

    return {
      total:           n,
      totalXP:         totXP,
      avgXP:           n ? Math.round(totXP / n) : 0,
      totalMissions:   totMiss,
      avgMissions:     n ? +(totMiss / n).toFixed(1) : 0,
      totalBadges:     totBadge,
      missionCounts:   missionCounts,
      missionPcts:     missionCounts.map(function (c) { return n ? Math.round((c / n) * 100) : 0; }),
    };
  }

  /* ============================================================
     Public API
     ============================================================ */

  /**
   * Fetch a ranked student leaderboard.
   *
   * @param {object} [options]
   * @param {string[]} [options.classes]   - Filter to specific class(es)
   * @param {number}   [options.limit]     - Max rows to return (0 = all)
   * @param {string}   [options.teacherId] - For production auth context
   * @returns {Promise<{ok: boolean, data?: object[], error?: string}>}
   */
  async function getLeaderboard(options) {
    options = options || {};

    if (!_isProd()) {
      var students = _filterByClasses(_MOCK_STUDENTS, options.classes || []);
      var ranked   = _sortByXp(students).map(function (s, i) {
        return Object.assign({}, s, { rank: i + 1 });
      });
      if (options.limit) ranked = ranked.slice(0, options.limit);
      return { ok: true, data: ranked };
    }

    var params = {};
    if (options.classes && options.classes.length) params.classes = options.classes.join(',');
    if (options.limit)     params.limit     = options.limit;
    if (options.teacherId) params.teacherId = options.teacherId;

    var result = await ApiService.get('getLeaderboard', params);
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Fetch all student data for a teacher's classes (teacher dashboard).
   * Returns students annotated with computed stats.
   *
   * @param {string}   teacherId
   * @param {string[]} [classes]   - Classes to fetch (defaults to teacher's own)
   * @returns {Promise<{ok: boolean, data?: {students: object[], stats: object}, error?: string}>}
   */
  async function getClassData(teacherId, classes) {
    if (!teacherId) return { ok: false, error: 'missing_teacher_id' };
    classes = classes || [];

    if (!_isProd()) {
      var filtered = _filterByClasses(_MOCK_STUDENTS, classes);
      var ranked   = _sortByXp(filtered).map(function (s, i) {
        return Object.assign({}, s, { rank: i + 1 });
      });
      return {
        ok: true,
        data: {
          students: ranked,
          stats:    _computeClassStats(filtered),
          classes:  classes,
          teacherId: teacherId,
        },
      };
    }

    var params = { teacherId: teacherId };
    if (classes.length) params.classes = classes.join(',');

    var result = await ApiService.get('getClassData', params);
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Fetch aggregated analytics for a teacher's class(es).
   *
   * @param {string}   teacherId
   * @param {object}   [dateRange]
   * @param {string}   [dateRange.from]  - ISO date string
   * @param {string}   [dateRange.to]    - ISO date string
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function getClassAnalytics(teacherId, dateRange) {
    if (!teacherId) return { ok: false, error: 'missing_teacher_id' };
    dateRange = dateRange || {};

    if (!_isProd()) {
      var students = _MOCK_STUDENTS;
      var stats    = _computeClassStats(students);

      /* Build mock daily activity for the last 7 days */
      var activity = [];
      for (var i = 6; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
        activity.push({
          date:        d.toISOString().slice(0, 10),
          events:      Math.floor(Math.random() * 25 + 5),
          submissions: Math.floor(Math.random() * 8 + 1),
          activeUsers: Math.floor(Math.random() * 6 + 2),
        });
      }

      return {
        ok: true,
        data: {
          summary:          stats,
          dailyActivity:    activity,
          topPerformers:    _sortByXp(students).slice(0, 3),
          leastActive:      _sortByXp(students).reverse().slice(0, 3),
          generatedAt:      new Date().toISOString(),
        },
      };
    }

    var params = { teacherId: teacherId };
    if (dateRange.from) params.from = dateRange.from;
    if (dateRange.to)   params.to   = dateRange.to;

    var result = await ApiService.get('getClassAnalytics', params);
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Fetch all badge definitions (for teacher reporting).
   * @returns {Promise<{ok: boolean, data?: object[], error?: string}>}
   */
  async function getBadgeDefinitions() {
    if (!_isProd()) {
      try {
        var resp = await fetch('../data/badges.json');
        if (!resp.ok) throw new Error('fetch failed');
        var data = await resp.json();
        return { ok: true, data: data };
      } catch (_) {
        return { ok: true, data: [] };
      }
    }

    var result = await ApiService.get('getBadgeDefinitions');
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return {
    getLeaderboard:      getLeaderboard,
    getClassData:        getClassData,
    getClassAnalytics:   getClassAnalytics,
    getBadgeDefinitions: getBadgeDefinitions,
  };

})();

window.GoogleSheetService = GoogleSheetService;
