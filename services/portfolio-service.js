/* ============================================================
   AI Coding Adventure — services/portfolio-service.js
   Portfolio data layer: upload work samples, retrieve portfolio.

   In 'development' mode all functions resolve with localStorage data.
   In 'production' mode they delegate to ApiService → Google Apps Script
   which saves file metadata to the Portfolio sheet and uploads the file
   to Google Drive.

   Google Sheets tables used:
     Portfolio — metadata for each uploaded work (fileId, driveUrl, missionId …)

   Google Drive:
     Files are uploaded via ApiService.upload() which sends Base64-encoded
     data to doPost(); the backend calls DriveApp to store them.

   Depends on: config/app-config.js, services/api.js, services/auth-service.js
   ============================================================ */

const PortfolioService = (function () {
  'use strict';

  /* Local storage key for dev-mode portfolio entries */
  var _LOCAL_KEY = 'aca_portfolio';

  /* ============================================================
     Private helpers
     ============================================================ */

  function _isProd() {
    return window.AppConfig && window.AppConfig.ENVIRONMENT === 'production';
  }

  /**
   * Read all portfolio entries from localStorage (development only).
   * @returns {object[]}
   */
  function _readLocal() {
    try {
      var raw = localStorage.getItem(_LOCAL_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  /**
   * Persist all portfolio entries to localStorage (development only).
   * @param {object[]} entries
   */
  function _writeLocal(entries) {
    localStorage.setItem(_LOCAL_KEY, JSON.stringify(entries));
  }

  /**
   * Validate a portfolio entry before upload.
   * @param {object} meta
   * @returns {string|null} error key, or null if valid
   */
  function _validateMeta(meta) {
    if (!meta.userId)    return 'missing_user_id';
    if (!meta.missionId) return 'missing_mission_id';
    if (!meta.title || !meta.title.trim()) return 'missing_title';
    return null;
  }

  /**
   * Build a new portfolio entry record.
   * @param {string} userId
   * @param {object} meta
   * @param {File|null} file
   * @param {string} [driveUrl]
   * @param {string} [fileId]
   * @returns {object}
   */
  function _buildEntry(userId, meta, file, driveUrl, fileId) {
    return {
      id:          'pf_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      userId:      userId,
      missionId:   Number(meta.missionId),
      title:       meta.title.trim(),
      description: (meta.description || '').trim(),
      tags:        Array.isArray(meta.tags) ? meta.tags : [],
      fileName:    file ? file.name : null,
      mimeType:    file ? file.type : null,
      fileSizeKb:  file ? Math.round(file.size / 1024) : null,
      driveUrl:    driveUrl || null,
      fileId:      fileId   || null,
      submittedAt: new Date().toISOString(),
    };
  }

  /**
   * Validate file type and size against AppConfig.DRIVE limits.
   * @param {File} file
   * @returns {string|null} error key, or null if valid
   */
  function _validateFile(file) {
    var drive    = (window.AppConfig && window.AppConfig.DRIVE) || {};
    var maxBytes = (drive.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
    var allowed  = drive.ALLOWED_TYPES || ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'];

    if (file.size > maxBytes) return 'file_too_large';
    if (allowed.indexOf(file.type) === -1) return 'invalid_file_type';
    return null;
  }

  /* ============================================================
     Public API
     ============================================================ */

  /**
   * Upload a portfolio entry (metadata + optional file).
   *
   * @param {string}   userId       - Student ID
   * @param {object}   meta         - Entry metadata
   * @param {string}   meta.missionId
   * @param {string}   meta.title
   * @param {string}   [meta.description]
   * @param {string[]} [meta.tags]
   * @param {File}     [file]       - Optional file attachment (image / PDF)
   * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
   */
  async function uploadPortfolio(userId, meta, file) {
    if (!userId) return { ok: false, error: 'missing_user_id' };
    meta = meta || {};

    var validationError = _validateMeta(Object.assign({ userId: userId }, meta));
    if (validationError) return { ok: false, error: validationError };

    if (file) {
      var fileError = _validateFile(file);
      if (fileError) return { ok: false, error: fileError };
    }

    /* ---- Development mode ---- */
    if (!_isProd()) {
      var entry = _buildEntry(userId, meta, file, null, null);
      var all   = _readLocal();
      all.unshift(entry);
      _writeLocal(all);
      return { ok: true, data: entry };
    }

    /* ---- Production mode ---- */
    var payload = {
      userId:      userId,
      missionId:   Number(meta.missionId),
      title:       meta.title.trim(),
      description: (meta.description || '').trim(),
      tags:        Array.isArray(meta.tags) ? meta.tags.join(',') : '',
      folderId:    (window.AppConfig && window.AppConfig.DRIVE && window.AppConfig.DRIVE.FOLDER_ID) || '',
    };

    var result;
    if (file) {
      /* Upload file + metadata in one POST */
      result = await ApiService.upload('uploadPortfolio', file, payload);
    } else {
      /* Metadata-only entry (e.g. a description / link without attachment) */
      result = await ApiService.post('uploadPortfolio', payload);
    }

    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Retrieve all portfolio entries for a student.
   * Entries are sorted newest-first.
   *
   * @param {string}  userId
   * @param {object}  [filters]
   * @param {number}  [filters.missionId] - Filter by mission
   * @param {number}  [filters.limit]     - Max entries to return
   * @returns {Promise<{ok: boolean, data?: object[], error?: string}>}
   */
  async function getPortfolio(userId, filters) {
    if (!userId) return { ok: false, error: 'missing_user_id' };
    filters = filters || {};

    /* ---- Development mode ---- */
    if (!_isProd()) {
      var all = _readLocal().filter(function (e) { return e.userId === userId; });

      if (filters.missionId) {
        all = all.filter(function (e) { return e.missionId === Number(filters.missionId); });
      }

      /* Sort newest-first */
      all.sort(function (a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); });

      if (filters.limit) { all = all.slice(0, filters.limit); }

      return { ok: true, data: all };
    }

    /* ---- Production mode ---- */
    var params = { userId: userId };
    if (filters.missionId) params.missionId = filters.missionId;
    if (filters.limit)     params.limit     = filters.limit;

    var result = await ApiService.get('getPortfolio', params);
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true, data: result.data };
  }

  /**
   * Delete a portfolio entry by ID.
   *
   * @param {string} userId    - Must match the entry's owner
   * @param {string} entryId   - Portfolio entry ID
   * @returns {Promise<{ok: boolean, error?: string}>}
   */
  async function deletePortfolioEntry(userId, entryId) {
    if (!userId || !entryId) return { ok: false, error: 'missing_parameters' };

    /* ---- Development mode ---- */
    if (!_isProd()) {
      var all     = _readLocal();
      var updated = all.filter(function (e) { return !(e.id === entryId && e.userId === userId); });
      if (updated.length === all.length) return { ok: false, error: 'entry_not_found' };
      _writeLocal(updated);
      return { ok: true };
    }

    /* ---- Production mode ---- */
    var result = await ApiService.delete('deletePortfolioEntry', { userId: userId, entryId: entryId });
    if (!result.ok) return { ok: false, error: result.error, message: result.message };
    return { ok: true };
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return {
    uploadPortfolio:      uploadPortfolio,
    getPortfolio:         getPortfolio,
    deletePortfolioEntry: deletePortfolioEntry,
  };

})();

window.PortfolioService = PortfolioService;
