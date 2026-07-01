/* ============================================================
   AI Coding Adventure — config/app-config.js
   Central application configuration.
   Replace placeholder values before deploying to production.
   ============================================================ */

const AppConfig = Object.freeze({

  /* ----------------------------------------------------------
     Application identity
     ---------------------------------------------------------- */
  APP_NAME:    'AI Coding Adventure',
  APP_NAME_TH: 'แพลตฟอร์มเรียนวิทยาการคำนวณ',
  VERSION:     '1.0.0',
  SCHOOL:      'โรงเรียนวัดนวลนรดิศ',

  /* ----------------------------------------------------------
     Environment
     'development' — uses local fallback data, no real API calls
     'production'  — uses Google Apps Script API
     ---------------------------------------------------------- */
  ENVIRONMENT: 'production',

  /* ----------------------------------------------------------
     Google Apps Script backend
     Replace with your deployed Web App URL after publishing.

     How to deploy:
       1. Open Google Apps Script editor (script.google.com)
       2. Paste contents of services/apps-script.js
       3. Deploy → New Deployment → Web App
       4. Execute as: Me | Access: Anyone
       5. Copy the Web App URL here
     ---------------------------------------------------------- */
  API_BASE_URL: 'https://script.google.com/macros/s/AKfycbxD-0auIMRb2m7HPdPGVayA-MMDTuJ3cZvbsnAZKwnLERhCMVZ4TfxfDpNneEIBAHxclg/exec',

  /* ----------------------------------------------------------
     Google Spreadsheet ID
     Found in the sheet URL: .../spreadsheets/d/{ID}/edit
     The GAS backend reads this from ScriptProperties so this
     value is for reference / documentation only.
     ---------------------------------------------------------- */
  SPREADSHEET_ID: '1vnJ8l3pn8AUe8BqVrdaT6Z064EZwuX5UkTDpfUu_HvM',

  /* ----------------------------------------------------------
     Request settings
     ---------------------------------------------------------- */
  TIMEOUT:     15000,   /* milliseconds before a request is aborted */
  RETRY_LIMIT: 2,       /* max automatic retries on transient failures */
  RETRY_DELAY: 1000,    /* ms between retries (doubles each attempt) */

  /* ----------------------------------------------------------
     Session / storage
     ---------------------------------------------------------- */
  SESSION_KEY:       'aca_session',
  REMEMBER_HINT_KEY: 'aca_remember_hint',

  /* ----------------------------------------------------------
     Google Sheets — sheet / table names used by the backend
     ---------------------------------------------------------- */
  SHEETS: Object.freeze({
    STUDENTS:  'Students',
    TEACHERS:  'Teachers',
    SCORES:    'Scores',
    BADGES:    'Badges',
    PORTFOLIO: 'Portfolio',
    ANALYTICS: 'Analytics',
    MISSIONS:  'Missions',
  }),

  /* ----------------------------------------------------------
     Role → post-login route map (relative to pages/)
     ---------------------------------------------------------- */
  ROUTES: Object.freeze({
    student: 'home.html',
    teacher: '../dashboard/index.html',
    admin:   '../dashboard/index.html',
  }),

  /* ----------------------------------------------------------
     Google Drive upload settings (used by PortfolioService & GoogleDriveService)
     ---------------------------------------------------------- */
  DRIVE: Object.freeze({
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_TYPES:    ['image/png', 'image/jpeg', 'image/gif', 'application/pdf'],
    FOLDER_ID:        '16EHsrgEhw1klkdXk5__sLt6OR6Yn5ZRK',
    THUMBNAIL_SIZE:   400,
  }),

  /* ----------------------------------------------------------
     Analytics configuration
     ---------------------------------------------------------- */
  ANALYTICS: Object.freeze({
    ENABLED:        true,
    BATCH_SIZE:     8,       /* flush queue when this many events accumulate */
    FLUSH_INTERVAL: 30000,   /* ms — also flush periodically while page is open */
    ENDPOINT:       'logEvents',
    BEACON_ENABLED: true,    /* use sendBeacon on page unload */
    SESSION_KEY:    'aca_analytics_queue',
  }),

  /* ----------------------------------------------------------
     Feature flags
     Set to false to disable a feature without changing code.
     ---------------------------------------------------------- */
  FEATURES: Object.freeze({
    ANALYTICS:    true,
    PORTFOLIO:    true,
    LEADERBOARD:  true,
    ACHIEVEMENTS: true,
    OFFLINE_MODE: true,
    DEMO_PANEL:   true,   /* show demo credentials on login page */
  }),

  /* ----------------------------------------------------------
     XP Level table (shared client constant — GAS mirrors this)
     ---------------------------------------------------------- */
  XP_LEVELS: Object.freeze([
    { level: 1, name: 'มือใหม่',    min: 0,    max: 299  },
    { level: 2, name: 'ผู้เรียนรู้', min: 300,  max: 599  },
    { level: 3, name: 'นักสำรวจ',   min: 600,  max: 999  },
    { level: 4, name: 'นักพัฒนา',   min: 1000, max: 1499 },
    { level: 5, name: 'AI Master',  min: 1500, max: 99999 },
  ]),

  /* ----------------------------------------------------------
     Avatar palette — hash(userId) % length gives colour index
     ---------------------------------------------------------- */
  AVATAR_COLORS: Object.freeze([
    '#2563EB','#7C3AED','#DB2777','#D97706',
    '#059669','#DC2626','#0891B2','#65A30D',
  ]),

});

/* Make globally available to all page scripts */
window.AppConfig = AppConfig;
