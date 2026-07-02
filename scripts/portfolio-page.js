(function () {
  'use strict';

  var session       = null;
  var allEntries    = [];
  var activeFilter  = 'all';
  var viewingId     = null;
  var selectedFile  = null;

  var AVATAR_COLORS = ['#2563EB','#7C3AED','#DB2777','#D97706','#059669','#DC2626','#0891B2'];

  var MISSION_NAMES = {
    '1': 'Hello, World!',
    '2': 'Conditions',
    '3': 'Loops',
    '4': 'Functions',
    '5': 'Mini AI Project'
  };

  /* ═══════════════════════════════════
     INIT
  ═══════════════════════════════════ */
  function init() {
    session = AuthService.requireRole(['student']);
    if (!session) return;
    _setupNav();
    _loadPortfolio();
    _setupFilters();
    _setupUploadModal();
    _setupViewModal();
    _animate();
  }

  /* ═══════════════════════════════════
     NAV
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
     LOAD
  ═══════════════════════════════════ */
  async function _loadPortfolio() {
    var grid = document.getElementById('pfGrid');
    if (grid) grid.innerHTML = '<p style="opacity:.6">กำลังโหลดผลงาน...</p>';

    try {
      var result = await PortfolioService.getPortfolio(session.userId);
      allEntries = (result.ok && Array.isArray(result.data)) ? result.data : [];
    } catch (e) {
      allEntries = [];
    }
    _renderStats();
    _renderGrid();
  }

  /* ═══════════════════════════════════
     STATS
  ═══════════════════════════════════ */
  function _renderStats() {
    var countEl    = document.getElementById('pfStatCount');
    var missionsEl = document.getElementById('pfStatMissions');
    var subtitleEl = document.getElementById('pfSubtitle');

    if (countEl) countEl.textContent = allEntries.length;

    var missionSet = {};
    allEntries.forEach(function (e) { missionSet[e.missionId] = true; });
    if (missionsEl) missionsEl.textContent = Object.keys(missionSet).length;

    if (subtitleEl) {
      subtitleEl.textContent = allEntries.length === 0
        ? 'เริ่มอัปโหลดผลงานชิ้นแรกของคุณ!'
        : 'ผลงานทั้งหมด ' + allEntries.length + ' ชิ้น · สะสมมาแล้ว';
    }
  }

  /* ═══════════════════════════════════
     GRID
  ═══════════════════════════════════ */
  function _renderGrid() {
    var grid  = document.getElementById('pfGrid');
    var empty = document.getElementById('pfEmpty');
    if (!grid) return;

    var filtered = activeFilter === 'all'
      ? allEntries
      : allEntries.filter(function (e) { return String(e.missionId) === String(activeFilter); });

    /* Sort newest first */
    filtered = filtered.slice().sort(function (a, b) { return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0); });

    grid.innerHTML = '';

    if (filtered.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    filtered.forEach(function (entry) {
      grid.appendChild(_buildCard(entry));
    });
  }

  function _buildCard(entry) {
    var card = document.createElement('article');
    card.className = 'pf-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', 'ผลงาน: ' + _esc(entry.title));
    card.setAttribute('tabindex', '0');
    card.dataset.id = entry.id;

    var isImage = (entry.mimeType || '').indexOf('image/') === 0;
    var thumbSrc = entry.thumbnailUrl || entry.driveUrl || '';

    var thumbHtml;
    if (isImage && thumbSrc) {
      thumbHtml = '<img src="' + thumbSrc + '" alt="' + _esc(entry.title) + '" class="pf-card-thumb-img" loading="lazy" />';
    } else {
      thumbHtml = '<span class="pf-card-thumb-icon"><span class="material-symbols-rounded" aria-hidden="true">picture_as_pdf</span></span>';
    }

    var missionLabel = entry.missionId ? 'Mission ' + entry.missionId : '';
    var dateStr      = entry.submittedAt ? new Date(entry.submittedAt).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' }) : '';
    var typeLabel    = isImage ? 'IMAGE' : 'PDF';

    card.innerHTML =
      '<div class="pf-card-thumb">' +
        thumbHtml +
        (missionLabel ? '<span class="pf-card-mission-tag">' + _esc(missionLabel) + '</span>' : '') +
      '</div>' +
      '<div class="pf-card-body">' +
        '<h2 class="pf-card-title">' + _esc(entry.title) + '</h2>' +
        '<p class="pf-card-desc">' + _esc(entry.description || '') + '</p>' +
        '<div class="pf-card-footer">' +
          '<span class="pf-card-date">' + dateStr + '</span>' +
          '<span class="pf-card-type"><span class="material-symbols-rounded" aria-hidden="true">' + (isImage ? 'image' : 'picture_as_pdf') + '</span>' + typeLabel + '</span>' +
        '</div>' +
      '</div>';

    card.addEventListener('click', function () { _openView(entry.id); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); _openView(entry.id); } });
    return card;
  }

  /* ═══════════════════════════════════
     FILTERS
  ═══════════════════════════════════ */
  function _setupFilters() {
    var bar = document.getElementById('pfFilterBar');
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
      activeFilter = btn.dataset.mission;
      _renderGrid();
    });
  }

  /* ═══════════════════════════════════
     UPLOAD MODAL
  ═══════════════════════════════════ */
  function _setupUploadModal() {
    var overlay    = document.getElementById('pfModalOverlay');
    var form       = document.getElementById('pfForm');
    var dropzone   = document.getElementById('pfDropzone');
    var fileInput  = document.getElementById('pfFileInput');
    var previewArea= document.getElementById('pfPreviewArea');
    var previewImg = document.getElementById('pfPreviewImg');
    var previewPdf = document.getElementById('pfPreviewPdf');
    var pdfName    = document.getElementById('pfPreviewPdfName');
    var removeBtn  = document.getElementById('pfRemoveFile');
    var cancelBtn  = document.getElementById('pfCancelBtn');
    var closeBtn   = document.getElementById('pfModalClose');
    var submitBtn  = document.getElementById('pfSubmitBtn');
    var errorEl    = document.getElementById('pfFormError');

    function openModal() {
      selectedFile = null;
      if (form) form.reset();
      if (previewArea) previewArea.hidden = true;
      if (previewImg) previewImg.hidden = true;
      if (previewPdf) previewPdf.hidden = true;
      if (errorEl) errorEl.hidden = true;
      if (overlay) { overlay.hidden = false; overlay.querySelector('.pf-modal').focus(); }
    }
    function closeModal() { if (overlay) overlay.hidden = true; }

    var openBtns = [
      document.getElementById('pfUploadHeroBtn'),
      document.getElementById('pfUploadEmptyBtn')
    ];
    openBtns.forEach(function (btn) { if (btn) btn.addEventListener('click', openModal); });
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay && overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

    /* Keyboard trap */
    overlay && overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    /* Drag & drop */
    if (dropzone) {
      dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('pf-dropzone--active'); });
      dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('pf-dropzone--active'); });
      dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('pf-dropzone--active');
        var files = e.dataTransfer.files;
        if (files.length) _handleFile(files[0]);
      });
    }
    if (fileInput) fileInput.addEventListener('change', function () { if (this.files.length) _handleFile(this.files[0]); });
    if (removeBtn) removeBtn.addEventListener('click', function () {
      selectedFile = null;
      if (previewArea) previewArea.hidden = true;
      if (previewImg) { previewImg.hidden = true; previewImg.src = ''; }
      if (previewPdf) previewPdf.hidden = true;
      if (fileInput) fileInput.value = '';
    });

    function _handleFile(file) {
      var MAX_MB = 10;
      var ALLOWED = ['image/png','image/jpeg','image/gif','application/pdf'];
      if (ALLOWED.indexOf(file.type) === -1) { _showError('ไฟล์ที่รองรับ: PNG, JPG, GIF, PDF เท่านั้น'); return; }
      if (file.size > MAX_MB * 1024 * 1024) { _showError('ไฟล์ต้องไม่เกิน 10 MB'); return; }
      selectedFile = file;
      if (errorEl) errorEl.hidden = true;

      if (file.type.startsWith('image/')) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          if (previewImg) { previewImg.src = ev.target.result; previewImg.hidden = false; }
          if (previewPdf) previewPdf.hidden = true;
          if (previewArea) previewArea.hidden = false;
        };
        reader.readAsDataURL(file);
      } else {
        if (pdfName) pdfName.textContent = file.name;
        if (previewImg) previewImg.hidden = true;
        if (previewPdf) previewPdf.hidden = false;
        if (previewArea) previewArea.hidden = false;
      }
    }

    function _showError(msg) {
      if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; }
    }

    if (form) form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!selectedFile) { _showError('กรุณาเลือกไฟล์'); return; }
      var title   = (document.getElementById('pfTitle') || {}).value || '';
      var mId     = (document.getElementById('pfMissionSelect') || {}).value || '';
      var desc    = (document.getElementById('pfDesc') || {}).value || '';
      if (!title.trim()) { _showError('กรุณาใส่ชื่อผลงาน'); return; }
      if (!mId) { _showError('กรุณาเลือก Mission ที่เกี่ยวข้อง'); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'กำลังบันทึก...'; }

      var result = await PortfolioService.uploadPortfolio(
        session.userId,
        { missionId: mId, title: title.trim(), description: desc.trim() },
        selectedFile
      );

      if (!result.ok) {
        _showError('บันทึกผลงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">save</span> บันทึกผลงาน'; }
        return;
      }

      /* Award portfolio badge if first upload */
      var badges = session.badges || [];
      if (badges.indexOf('portfolio_first') === -1) {
        badges = badges.concat(['portfolio_first']);
        AuthService.updateSession({ badges: badges });
        session = AuthService.getCurrentUser();
      }

      if (typeof AnalyticsService !== 'undefined') {
        AnalyticsService.logEvent('portfolio_upload', {
          missionId: parseInt(mId, 10),
          type:      selectedFile.type.indexOf('image/') === 0 ? 'image' : 'pdf',
          fileSize:  selectedFile.size,
        });
      }

      await _loadPortfolio();
      closeModal();
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">save</span> บันทึกผลงาน'; }
    });
  }

  /* ═══════════════════════════════════
     VIEW MODAL
  ═══════════════════════════════════ */
  function _setupViewModal() {
    var overlay  = document.getElementById('pfViewOverlay');
    var closeBtn = document.getElementById('pfViewClose');
    var deleteBtn= document.getElementById('pfViewDeleteBtn');

    if (closeBtn) closeBtn.addEventListener('click', function () { if (overlay) overlay.hidden = true; });
    overlay && overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.hidden = true; });
    overlay && overlay.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.hidden = true; });

    if (deleteBtn) deleteBtn.addEventListener('click', async function () {
      if (!viewingId) return;
      if (!confirm('ต้องการลบผลงานนี้?')) return;
      deleteBtn.disabled = true;
      var result = await PortfolioService.deletePortfolioEntry(session.userId, viewingId);
      deleteBtn.disabled = false;
      if (!result.ok) { alert('ลบผลงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'); return; }
      if (overlay) overlay.hidden = true;
      await _loadPortfolio();
    });
  }

  function _openView(id) {
    var entry   = allEntries.find(function (e) { return e.id === id; });
    if (!entry) return;
    viewingId = id;

    var overlay  = document.getElementById('pfViewOverlay');
    var titleEl  = document.getElementById('pfViewTitle');
    var imgEl    = document.getElementById('pfViewImg');
    var pdfEl    = document.getElementById('pfViewPdf');
    var pdfNameEl= document.getElementById('pfViewPdfName');
    var itemTitle= document.getElementById('pfViewItemTitle');
    var itemDesc = document.getElementById('pfViewItemDesc');
    var tagsEl   = document.getElementById('pfViewTags');

    if (titleEl) titleEl.textContent = entry.title;
    if (itemTitle) itemTitle.textContent = entry.title;
    if (itemDesc) itemDesc.textContent = entry.description || 'ไม่มีคำอธิบาย';

    var isImage  = (entry.mimeType || '').indexOf('image/') === 0;
    var imgSrc   = entry.thumbnailUrl || entry.driveUrl || '';
    if (isImage && imgSrc) {
      if (imgEl) { imgEl.src = imgSrc; imgEl.alt = entry.title; imgEl.hidden = false; }
      if (pdfEl) pdfEl.hidden = true;
    } else {
      if (imgEl) imgEl.hidden = true;
      if (pdfEl) pdfEl.hidden = false;
      if (pdfNameEl) pdfNameEl.textContent = entry.fileName || 'ไฟล์ PDF';
    }

    if (tagsEl) {
      var mName = entry.missionId ? ('Mission ' + entry.missionId + ': ' + (MISSION_NAMES[entry.missionId] || '')) : '';
      tagsEl.innerHTML = mName ? '<span class="pf-view-tag">' + _esc(mName) + '</span>' : '';
    }

    if (overlay) { overlay.hidden = false; }
  }

  /* ═══════════════════════════════════
     ANIMATIONS
  ═══════════════════════════════════ */
  function _animate() {
    if (typeof gsap === 'undefined') return;
    gsap.from('#pfHero', { opacity: 0, y: 30, duration: .6, ease: 'power2.out' });
    gsap.from('#pfFilterBar', { opacity: 0, y: 20, duration: .5, delay: .2, ease: 'power2.out' });
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

  /* Hide modals when browser restores page from BFCache */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      var viewEl  = document.getElementById('pfViewOverlay');
      var modalEl = document.getElementById('pfModalOverlay');
      if (viewEl)  viewEl.hidden  = true;
      if (modalEl) modalEl.hidden = true;
    }
  });
})();
