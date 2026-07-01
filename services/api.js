/* ============================================================
   AI Coding Adventure — services/api.js
   Reusable HTTP client for the Google Apps Script backend.

   Google Apps Script Web Apps only support GET and POST.
   PUT / DELETE are emulated by sending { _method: 'PUT'|'DELETE' }
   inside the POST body, which the backend reads from e.postData.

   CORS note: GAS Web Apps trigger a preflight when Content-Type is
   'application/json'.  We use 'text/plain;charset=UTF-8' instead —
   a "simple" content type that skips the preflight — while still
   sending a valid JSON string in the body.  GAS parses the body
   with JSON.parse(e.postData.contents) regardless of content-type.

   Depends on: config/app-config.js (AppConfig)
   ============================================================ */

const ApiService = (function () {
  'use strict';

  /* ============================================================
     Private helpers
     ============================================================ */

  function _cfg() {
    return window.AppConfig || {
      API_BASE_URL: '',
      TIMEOUT: 15000,
      RETRY_LIMIT: 2,
      RETRY_DELAY: 1000,
    };
  }

  function _buildUrl(base, params) {
    if (!params || !Object.keys(params).length) return base;
    const qs = Object.keys(params)
      .filter(k => params[k] !== undefined && params[k] !== null)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
      .join('&');
    return qs ? base + (base.includes('?') ? '&' : '?') + qs : base;
  }

  function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function _normaliseError(err, status) {
    if (err && err.name === 'AbortError') {
      return { ok: false, status: 408, error: 'timeout', message: 'Request timed out — กรุณาลองใหม่อีกครั้ง' };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { ok: false, status: 0, error: 'offline', message: 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต' };
    }
    const message = (err && err.message) ? err.message : 'Unknown network error';
    return { ok: false, status: status || 0, error: 'network_error', message };
  }

  async function _fetchOnce(url, options) {
    const cfg     = _cfg();
    const timeout = cfg.TIMEOUT || 15000;

    const controller = new AbortController();
    const timer      = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal:   controller.signal,
        redirect: 'follow',   /* GAS Web App issues a 302 on POST — follow it */
        mode:     'cors',
        cache:    'no-store',
      });
      clearTimeout(timer);

      let data;
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch (_) { data = { message: text }; }
      }

      if (!response.ok) {
        return { ok: false, status: response.status, error: 'http_error', message: data.message || response.statusText, data };
      }

      /* GAS may wrap response in { ok, data } or return payload directly */
      if (data && typeof data === 'object' && 'ok' in data && 'data' in data) {
        return data.ok
          ? { ok: true,  status: response.status, data: data.data }
          : { ok: false, status: response.status, error: data.error || 'api_error', message: data.message || '', data: data.data };
      }

      return { ok: true, status: response.status, data };

    } catch (err) {
      clearTimeout(timer);
      return _normaliseError(err, 0);
    }
  }

  async function _fetchWithRetry(url, options) {
    const cfg    = _cfg();
    const limit  = cfg.RETRY_LIMIT !== undefined ? cfg.RETRY_LIMIT : 2;
    const delay  = cfg.RETRY_DELAY || 1000;
    let last     = null;

    for (let attempt = 0; attempt <= limit; attempt++) {
      if (attempt > 0) await _sleep(delay * attempt);

      last = await _fetchOnce(url, options);

      /* Don't retry client errors or success */
      if (last.ok || (last.status >= 400 && last.status < 500)) break;
    }

    return last;
  }

  /* ============================================================
     Public API — HTTP Methods
     ============================================================ */

  /**
   * GET request. All parameters are serialised into the query string.
   * GAS: handled by doGet(e) — e.parameter contains fields.
   */
  async function get(action, params) {
    const base  = _cfg().API_BASE_URL || '';
    const query = Object.assign({ action }, params || {});
    const url   = _buildUrl(base, query);

    return _fetchWithRetry(url, {
      method:  'GET',
      headers: { 'Accept': 'application/json' },
    });
  }

  /**
   * POST request.  Body is JSON but sent as text/plain to avoid
   * the CORS preflight that 'application/json' triggers on GAS.
   * GAS: handled by doPost(e) — e.postData.contents is the raw body.
   */
  async function post(action, body) {
    const url     = _cfg().API_BASE_URL || '';
    const payload = Object.assign({ action }, body || {});

    return _fetchWithRetry(url, {
      method:  'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        'Accept':       'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  /** PUT emulated via POST + _method:'PUT' */
  function put(action, body) {
    return post(action, Object.assign({ _method: 'PUT' }, body || {}));
  }

  /** DELETE emulated via POST + _method:'DELETE' */
  function del(action, body) {
    return post(action, Object.assign({ _method: 'DELETE' }, body || {}));
  }

  /**
   * Fire-and-forget POST using navigator.sendBeacon.
   * Used for analytics flush on page unload — does not return a promise.
   * @returns {boolean} whether sendBeacon was available and accepted the data
   */
  function beacon(action, body) {
    if (typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
    const url     = _cfg().API_BASE_URL || '';
    if (!url) return false;
    const payload = JSON.stringify(Object.assign({ action }, body || {}));
    const blob    = new Blob([payload], { type: 'text/plain;charset=UTF-8' });
    try { return navigator.sendBeacon(url, blob); } catch (_) { return false; }
  }

  /**
   * Upload a file encoded as Base64 via POST.
   * The GAS backend decodes and saves to Google Drive.
   *
   * @param {string} action
   * @param {File}   file
   * @param {object} [metadata]
   */
  async function upload(action, file, metadata) {
    const cfg      = _cfg();
    const drive    = cfg.DRIVE || {};
    const maxBytes = (drive.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

    if (file.size > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: 'file_too_large',
        message: 'ไฟล์ขนาดใหญ่เกินไป (สูงสุด ' + (drive.MAX_FILE_SIZE_MB || 10) + ' MB)',
      };
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader  = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return post(action, Object.assign({
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      fileData: base64,
    }, metadata || {}));
  }

  /**
   * Health-check — returns true if the API base URL is configured and reachable.
   */
  async function isAvailable() {
    const cfg = _cfg();
    if (!cfg.API_BASE_URL || cfg.API_BASE_URL.includes('YOUR_DEPLOYMENT_ID')) return false;
    const result = await get('ping');
    return result.ok;
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return { get, post, put, delete: del, beacon, upload, isAvailable };

})();

window.ApiService = ApiService;
