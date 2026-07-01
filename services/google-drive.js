/* ============================================================
   AI Coding Adventure — services/google-drive.js
   Frontend utility for Google Drive file operations.

   Provides:
     • URL construction for viewing, downloading, and thumbnails
     • File validation against AppConfig.DRIVE constraints
     • Upload with XMLHttpRequest progress tracking
     • MIME-type → icon / label helpers

   In 'development' mode, uploadWithProgress stores a data-URL in
   localStorage (same as PortfolioService dev behaviour).
   In 'production' mode, it POSTs to the GAS backend which writes
   the file to Google Drive via DriveApp.

   Depends on: config/app-config.js, services/api.js
   ============================================================ */

const GoogleDriveService = (function () {
  'use strict';

  /* ============================================================
     Private helpers
     ============================================================ */

  function _cfg() {
    return (window.AppConfig && window.AppConfig.DRIVE) || {
      MAX_FILE_SIZE_MB: 10,
      ALLOWED_TYPES:    ['image/png','image/jpeg','image/gif','application/pdf'],
      FOLDER_ID:        '',
      THUMBNAIL_SIZE:   400,
    };
  }

  function _isProd() {
    return window.AppConfig && window.AppConfig.ENVIRONMENT === 'production';
  }

  function _apiBase() {
    return (window.AppConfig && window.AppConfig.API_BASE_URL) || '';
  }

  /* ============================================================
     URL builders
     ============================================================ */

  /**
   * Google Drive file view URL (opens in Drive viewer).
   * @param {string} fileId
   * @returns {string}
   */
  function getViewUrl(fileId) {
    if (!fileId) return '';
    return 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/view';
  }

  /**
   * Google Drive direct download URL.
   * @param {string} fileId
   * @returns {string}
   */
  function getDownloadUrl(fileId) {
    if (!fileId) return '';
    return 'https://drive.google.com/uc?id=' + encodeURIComponent(fileId) + '&export=download';
  }

  /**
   * Google Drive thumbnail URL.
   * Works for images and PDFs stored in Drive.
   *
   * @param {string} fileId
   * @param {number} [size=400]  - Thumbnail width in pixels
   * @returns {string}
   */
  function getThumbnailUrl(fileId, size) {
    if (!fileId) return '';
    size = size || _cfg().THUMBNAIL_SIZE || 400;
    return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w' + size;
  }

  /**
   * Embed URL for PDFs (uses Drive's built-in PDF viewer).
   * @param {string} fileId
   * @returns {string}
   */
  function getEmbedUrl(fileId) {
    if (!fileId) return '';
    return 'https://drive.google.com/file/d/' + encodeURIComponent(fileId) + '/preview';
  }

  /* ============================================================
     Validation
     ============================================================ */

  /**
   * Validate a browser File against AppConfig.DRIVE constraints.
   *
   * @param {File} file
   * @returns {{ valid: boolean, error?: string, message?: string }}
   */
  function validateFile(file) {
    if (!(file instanceof File)) {
      return { valid: false, error: 'invalid_input', message: 'ไม่ใช่ไฟล์ที่ถูกต้อง' };
    }

    var cfg      = _cfg();
    var maxBytes = (cfg.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
    var allowed  = cfg.ALLOWED_TYPES || ['image/png','image/jpeg','image/gif','application/pdf'];

    if (file.size > maxBytes) {
      return {
        valid:   false,
        error:   'file_too_large',
        message: 'ไฟล์ขนาดใหญ่เกินไป (สูงสุด ' + (cfg.MAX_FILE_SIZE_MB || 10) + ' MB)',
      };
    }

    if (allowed.indexOf(file.type) === -1) {
      return {
        valid:   false,
        error:   'invalid_file_type',
        message: 'ประเภทไฟล์ไม่รองรับ (รองรับ PNG, JPEG, GIF, PDF)',
      };
    }

    return { valid: true };
  }

  /* ============================================================
     MIME type utilities
     ============================================================ */

  var _MIME_MAP = {
    'image/png':        { icon: 'image',        label: 'PNG Image' },
    'image/jpeg':       { icon: 'image',        label: 'JPEG Image' },
    'image/jpg':        { icon: 'image',        label: 'JPEG Image' },
    'image/gif':        { icon: 'gif_box',      label: 'GIF Image' },
    'image/webp':       { icon: 'image',        label: 'WebP Image' },
    'application/pdf':  { icon: 'picture_as_pdf', label: 'PDF Document' },
    'video/mp4':        { icon: 'videocam',     label: 'MP4 Video' },
    'video/webm':       { icon: 'videocam',     label: 'WebM Video' },
  };

  /**
   * Get a Material Symbols icon name for a MIME type.
   * @param {string} mimeType
   * @returns {string}
   */
  function getFileIcon(mimeType) {
    return (_MIME_MAP[mimeType] || { icon: 'insert_drive_file' }).icon;
  }

  /**
   * Get a human-readable label for a MIME type.
   * @param {string} mimeType
   * @returns {string}
   */
  function getFileLabel(mimeType) {
    return (_MIME_MAP[mimeType] || { label: 'File' }).label;
  }

  /**
   * Format a byte count to a human-readable string.
   * @param {number} bytes
   * @returns {string}
   */
  function formatFileSize(bytes) {
    if (bytes < 1024)            return bytes + ' B';
    if (bytes < 1024 * 1024)     return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Check whether a MIME type represents an image.
   * @param {string} mimeType
   * @returns {boolean}
   */
  function isImage(mimeType) {
    return (mimeType || '').startsWith('image/');
  }

  /* ============================================================
     Upload with progress
     ============================================================ */

  /**
   * Upload a file to Google Drive via the GAS backend,
   * with real-time progress callbacks.
   *
   * In development mode the file is read as a data URL and
   * the onComplete callback receives a local-only entry.
   *
   * @param {File}     file
   * @param {object}   metadata           - { userId, missionId, title, description, folderId }
   * @param {Function} [onProgress]       - Called with (percentComplete: number)
   * @param {Function} [onComplete]       - Called with (result: { ok, data })
   * @param {Function} [onError]          - Called with (error: { error, message })
   */
  function uploadWithProgress(file, metadata, onProgress, onComplete, onError) {
    var v = validateFile(file);
    if (!v.valid) {
      if (onError) onError({ error: v.error, message: v.message });
      return;
    }

    /* Development: read as data URL, simulate progress, resolve locally */
    if (!_isProd()) {
      var reader = new FileReader();
      var fakeProgress = 0;
      var ticker = setInterval(function () {
        fakeProgress = Math.min(fakeProgress + Math.random() * 25, 90);
        if (onProgress) onProgress(Math.round(fakeProgress));
      }, 120);

      reader.onload = function () {
        clearInterval(ticker);
        if (onProgress) onProgress(100);
        var entry = {
          id:          'pf_' + Date.now(),
          userId:      metadata.userId,
          missionId:   Number(metadata.missionId),
          title:       (metadata.title || '').trim(),
          description: (metadata.description || '').trim(),
          fileName:    file.name,
          mimeType:    file.type,
          fileSizeKb:  Math.round(file.size / 1024),
          dataUrl:     reader.result,
          driveUrl:    null,
          fileId:      null,
          submittedAt: new Date().toISOString(),
        };
        if (onComplete) onComplete({ ok: true, data: entry });
      };
      reader.onerror = function () {
        clearInterval(ticker);
        if (onError) onError({ error: 'read_error', message: 'ไม่สามารถอ่านไฟล์ได้' });
      };
      reader.readAsDataURL(file);
      return;
    }

    /* Production: XMLHttpRequest so we can track upload progress */
    var cfg      = window.AppConfig || {};
    var drive    = cfg.DRIVE || {};

    var reader2  = new FileReader();
    reader2.onload = function () {
      var base64 = reader2.result.split(',')[1];
      var payload = JSON.stringify({
        action:      'uploadPortfolio',
        userId:      metadata.userId,
        missionId:   Number(metadata.missionId),
        title:       (metadata.title || '').trim(),
        description: (metadata.description || '').trim(),
        tags:        Array.isArray(metadata.tags) ? metadata.tags.join(',') : '',
        folderId:    metadata.folderId || drive.FOLDER_ID || '',
        fileName:    file.name,
        mimeType:    file.type,
        fileSize:    file.size,
        fileData:    base64,
      });

      var xhr = new XMLHttpRequest();
      xhr.open('POST', _apiBase(), true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      xhr.setRequestHeader('Accept', 'application/json');

      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', function (e) {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = function () {
        var data;
        try { data = JSON.parse(xhr.responseText); } catch (_) { data = {}; }
        if (xhr.status >= 200 && xhr.status < 300 && data.ok !== false) {
          if (onProgress) onProgress(100);
          if (onComplete) onComplete({ ok: true, data: data.data || data });
        } else {
          if (onError) onError({ error: data.error || 'upload_failed', message: data.message || 'Upload failed' });
        }
      };

      xhr.onerror = function () {
        if (onError) onError({ error: 'network_error', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์' });
      };

      xhr.ontimeout = function () {
        if (onError) onError({ error: 'timeout', message: 'การอัพโหลดใช้เวลานานเกินไป' });
      };

      xhr.timeout = (cfg.TIMEOUT || 60000) * 4; /* longer timeout for file upload */
      xhr.send(payload);
    };

    reader2.onerror = function () {
      if (onError) onError({ error: 'read_error', message: 'ไม่สามารถอ่านไฟล์ได้' });
    };

    reader2.readAsDataURL(file);
  }

  /* ============================================================
     Expose public interface
     ============================================================ */
  return {
    getViewUrl:          getViewUrl,
    getDownloadUrl:      getDownloadUrl,
    getThumbnailUrl:     getThumbnailUrl,
    getEmbedUrl:         getEmbedUrl,
    validateFile:        validateFile,
    getFileIcon:         getFileIcon,
    getFileLabel:        getFileLabel,
    formatFileSize:      formatFileSize,
    isImage:             isImage,
    uploadWithProgress:  uploadWithProgress,
  };

})();

window.GoogleDriveService = GoogleDriveService;
