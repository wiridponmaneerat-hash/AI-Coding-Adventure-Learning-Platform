/* ============================================================
   AI Coding Adventure — services/analytics-service.js
   Client-side analytics event queue that batches and flushes to GAS.

   Events are:
     • batched in sessionStorage so they survive soft navigations
     • flushed every FLUSH_INTERVAL ms while the page is open
     • flushed immediately when BATCH_SIZE is reached
     • flushed via sendBeacon on page unload (fire-and-forget)

   Page views are tracked automatically on DOMContentLoaded.
   Action events (mission_submit, portfolio_upload, etc.) are
   triggered by calling AnalyticsService.logEvent().

   Depends on: config/app-config.js, services/api.js, services/auth-service.js
   ============================================================ */

const AnalyticsService = (function () {
  'use strict';

  var _queue        = [];
  var _flushTimer   = null;
  var _sessionId    = null;
  var _initialized  = false;

  /* ============================================================
     Private helpers
     ============================================================ */

  function _cfg() {
    return (window.AppConfig && window.AppConfig.ANALYTICS) || {
      ENABLED:        true,
      BATCH_SIZE:     8,
      FLUSH_INTERVAL: 30000,
      ENDPOINT:       'logEvents',
      BEACON_ENABLED: true,
      SESSION_KEY:    'aca_analytics_queue',
    };
  }

  function _enabled() {
    var cfg = window.AppConfig;
    if (!cfg) return true;
    if (cfg.FEATURES && cfg.FEATURES.ANALYTICS === false) return false;
    return _cfg().ENABLED !== false;
  }

  function _isProd() {
    return window.AppConfig && window.AppConfig.ENVIRONMENT === 'production';
  }

  function _getSessionId() {
    if (_sessionId) return _sessionId;
    var stored = sessionStorage.getItem('aca_analytics_sid');
    if (stored) { _sessionId = stored; return stored; }
    _sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem('aca_analytics_sid', _sessionId);
    return _sessionId;
  }

  function _getUserId() {
    try {
      var u = window.AuthService && AuthService.getCurrentUser();
      return u ? u.userId : null;
    } catch (_) { return null; }
  }

  function _getPage() {
    var path = window.location.pathname.replace(/\\/g, '/');
    var parts = path.split('/');
    return parts[parts.length - 1] || 'index';
  }

  function _persistQueue() {
    try {
      sessionStorage.setItem(_cfg().SESSION_KEY, JSON.stringify(_queue));
    } catch (_) { /* storage full — skip */ }
  }

  function _restoreQueue() {
    try {
      var raw = sessionStorage.getItem(_cfg().SESSION_KEY);
      if (raw) _queue = JSON.parse(raw);
    } catch (_) { _queue = []; }
  }

  function _buildEvent(type, data) {
    return {
      eventId:   'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      userId:    _getUserId(),
      sessionId: _getSessionId(),
      type:      type,
      page:      _getPage(),
      data:      data || {},
      ts:        new Date().toISOString(),
    };
  }

  /* ============================================================
     Flush — send queued events to GAS
     ============================================================ */

  async function _flush(useBeacon) {
    if (!_queue.length) return;
    if (!_isProd())     { _queue = []; _persistQueue(); return; }
    if (!window.ApiService) return;

    var batch = _queue.slice();
    _queue    = [];
    _persistQueue();

    var cfg = _cfg();

    if (useBeacon && cfg.BEACON_ENABLED) {
      var sent = ApiService.beacon(cfg.ENDPOINT, { events: batch });
      if (!sent) {
        /* sendBeacon failed — put events back so retry can happen */
        _queue = batch.concat(_queue);
        _persistQueue();
      }
      return;
    }

    try {
      var result = await ApiService.post(cfg.ENDPOINT, { events: batch });
      if (!result.ok) {
        /* Server-side failure — re-queue (cap at 50 to avoid unbounded growth) */
        _queue = batch.concat(_queue).slice(0, 50);
        _persistQueue();
      }
    } catch (_) {
      _queue = batch.concat(_queue).slice(0, 50);
      _persistQueue();
    }
  }

  function _scheduledFlush() {
    _flush(false);
  }

  function _startTimer() {
    if (_flushTimer) return;
    var interval = _cfg().FLUSH_INTERVAL || 30000;
    _flushTimer  = setInterval(_scheduledFlush, interval);
  }

  /* ============================================================
     Auto page-view tracking
     ============================================================ */

  function _trackPageView() {
    logEvent('page_view', {
      title:    document.title,
      referrer: document.referrer || null,
    });
  }

  /* ============================================================
     Public API
     ============================================================ */

  /**
   * Log an analytics event.
   * Safe to call even when not authenticated or in dev mode.
   *
   * @param {string} type  - Event type (see list below)
   * @param {object} [data] - Arbitrary metadata
   *
   * Common event types:
   *   page_view          — auto-tracked on init
   *   mission_start      — student opens a mission
   *   mission_step       — student advances to a step
   *   quiz_answer        — student submits a quiz answer { missionId, qIndex, correct }
   *   mission_complete   — student passes a mission { missionId, score, xpEarned }
   *   mission_fail       — student fails a mission { missionId, score }
   *   portfolio_upload   — student uploads a portfolio item { missionId }
   *   portfolio_delete   — student deletes a portfolio item
   *   profile_update     — student updates profile fields
   *   badge_earn         — badge awarded { badgeCode }
   *   login              — successful login { role }
   *   logout             — explicit logout
   *   error              — caught JS error { message, source }
   */
  function logEvent(type, data) {
    if (!_enabled()) return;

    var event = _buildEvent(type, data);
    _queue.push(event);
    _persistQueue();

    var cfg = _cfg();
    if (_queue.length >= (cfg.BATCH_SIZE || 8)) {
      _flush(false);
    }
  }

  /**
   * Manually flush all queued events to the server.
   * @param {boolean} [useBeacon=false]
   */
  function flush(useBeacon) {
    return _flush(!!useBeacon);
  }

  /**
   * Initialise the service:
   *   - restores any queued events from sessionStorage
   *   - auto-tracks the current page view
   *   - starts the periodic flush timer
   *   - registers a page-unload flush
   *
   * Called automatically on DOMContentLoaded.
   */
  function init() {
    if (_initialized) return;
    _initialized = true;

    _restoreQueue();
    _trackPageView();
    _startTimer();

    window.addEventListener('pagehide', function () { _flush(true); });
    window.addEventListener('beforeunload', function () { _flush(true); });

    window.addEventListener('error', function (e) {
      logEvent('error', {
        message: e.message || 'Unknown error',
        source:  e.filename || window.location.href,
        line:    e.lineno,
      });
    });
  }

  /* Auto-init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return { logEvent, flush, init };

})();

window.AnalyticsService = AnalyticsService;
