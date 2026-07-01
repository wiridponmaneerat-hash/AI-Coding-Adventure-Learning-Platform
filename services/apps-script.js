/* ============================================================
   AI Coding Adventure — services/apps-script.js
   Google Apps Script backend (Code.gs)

   ╔══════════════════════════════════════════════════════════════╗
   ║  THIS FILE RUNS ON GOOGLE APPS SCRIPT, NOT IN THE BROWSER.  ║
   ║  Copy its contents into the GAS editor at script.google.com ║
   ║  then deploy as a Web App:                                   ║
   ║    Execute as: Me  |  Who has access: Anyone                 ║
   ╚══════════════════════════════════════════════════════════════╝

   SPREADSHEET STRUCTURE
   ─────────────────────
   Sheet: Students
     A  userId        (e.g. STD001)
     B  name
     C  passwordHash  (SHA-256 hex — use getPasswordHash() below)
     D  class         (e.g. ป.5/1)
     E  xp
     F  level
     G  badges        (JSON array string)
     H  completedMissions (JSON array string)
     I  joinDate
     J  avatarColor
     K  nickname
     L  email
     M  bio

   Sheet: Teachers
     A  userId        (e.g. TCH001)
     B  name
     C  passwordHash
     D  subject
     E  classes       (JSON array string — e.g. ["ป.5/1","ป.5/2"])
     F  joinDate

   Sheet: Scores
     A  scoreId
     B  userId
     C  missionId
     D  score
     E  xpEarned
     F  durationSeconds
     G  codeSnapshot  (first 500 chars)
     H  submittedAt
     I  isPassed

   Sheet: Portfolio
     A  entryId
     B  userId
     C  missionId
     D  title
     E  description
     F  tags
     G  fileName
     H  mimeType
     I  fileSizeKb
     J  driveUrl
     K  fileId
     L  submittedAt

   Sheet: Analytics
     A  eventId
     B  userId
     C  eventType
     D  missionId
     E  value
     F  meta          (JSON string)
     G  timestamp

   INITIAL SETUP
   ─────────────
   1. Create the spreadsheet with sheets named above.
   2. Add header rows matching the columns above.
   3. Run getPasswordHash('yourpassword') from the Script Editor
      to obtain hashes for initial user passwords.
   4. Populate Students and Teachers sheets.
   5. Set SPREADSHEET_ID in Script Properties:
        Project Settings → Script Properties → Add
        Key: SPREADSHEET_ID  Value: <your-spreadsheet-id>
   6. Deploy → New deployment → Web App →
        Execute as: Me  |  Access: Anyone → Deploy
   7. Copy the Web App URL into config/app-config.js API_BASE_URL.
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   CONFIGURATION
   ──────────────────────────────────────────────────────────── */

var SHEET_NAMES = {
  STUDENTS:  'Students',
  TEACHERS:  'Teachers',
  SCORES:    'Scores',
  PORTFOLIO: 'Portfolio',
  ANALYTICS: 'Analytics',
};

var PASS_THRESHOLD = 60;  /* % correct to count as mission pass */

var XP_LEVELS = [
  { level: 1, name: 'มือใหม่',    min: 0    },
  { level: 2, name: 'ผู้เรียนรู้', min: 300  },
  { level: 3, name: 'นักสำรวจ',   min: 600  },
  { level: 4, name: 'นักพัฒนา',   min: 1000 },
  { level: 5, name: 'AI Master',  min: 1500 },
];

var DRIVE_FOLDER_ID = ''; /* Override via Script Properties: DRIVE_FOLDER_ID */

/* ────────────────────────────────────────────────────────────
   ENTRY POINTS — doGet / doPost
   ──────────────────────────────────────────────────────────── */

function doGet(e) {
  var action = (e.parameter && e.parameter.action) || '';
  var params = e.parameter || {};
  var result;

  try {
    switch (action) {
      case 'ping':                result = { ok: true,  pong: true, ts: new Date().toISOString() }; break;
      case 'getStudentProfile':   result = _getStudentProfile(params);    break;
      case 'getStudentDashboard': result = _getStudentDashboard(params);  break;
      case 'getMissions':         result = _getMissions(params);           break;
      case 'getMission':          result = _getMission(params);            break;
      case 'getPortfolio':        result = _getPortfolio(params);          break;
      case 'getAnalytics':        result = _getAnalytics(params);          break;
      case 'getLeaderboard':      result = _getLeaderboard(params);        break;
      case 'getClassData':        result = _getClassData(params);          break;
      case 'getClassAnalytics':   result = _getClassAnalytics(params);     break;
      case 'getBadgeDefinitions': result = _getBadgeDefinitions();         break;
      default:
        result = { ok: false, error: 'unknown_action', message: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { ok: false, error: 'server_error', message: err.message };
  }

  return _jsonResponse(result);
}

function doPost(e) {
  var body   = {};
  var result;

  try {
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
  } catch (err) {
    return _jsonResponse({ ok: false, error: 'invalid_json', message: 'Request body is not valid JSON' });
  }

  var action = body.action  || '';
  var method = body._method || 'POST';

  try {
    if (method === 'DELETE') {
      switch (action) {
        case 'deletePortfolioEntry': result = _deletePortfolioEntry(body); break;
        default: result = { ok: false, error: 'unknown_action' };
      }
    } else if (method === 'PUT') {
      switch (action) {
        case 'updateStudentProfile': result = _updateStudentProfile(body); break;
        default: result = { ok: false, error: 'unknown_action' };
      }
    } else {
      switch (action) {
        case 'login':              result = _login(body);           break;
        case 'submitMission':      result = _submitMission(body);   break;
        case 'uploadPortfolio':    result = _uploadPortfolio(body); break;
        case 'logEvents':          result = _logEvents(body);       break;
        default: result = { ok: false, error: 'unknown_action', message: 'Unknown action: ' + action };
      }
    }
  } catch (err) {
    result = { ok: false, error: 'server_error', message: err.message };
  }

  return _jsonResponse(result);
}

/* ────────────────────────────────────────────────────────────
   RESPONSE HELPERS
   ──────────────────────────────────────────────────────────── */

function _jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function _ok(data) {
  return { ok: true, data: data };
}

function _err(error, message) {
  return { ok: false, error: error, message: message || error };
}

/* ────────────────────────────────────────────────────────────
   SHEET HELPERS
   ──────────────────────────────────────────────────────────── */

function _getSpreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID not set in Script Properties');
  return SpreadsheetApp.openById(id);
}

function _getSheet(name) {
  var ss    = _getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

/**
 * Convert a sheet to an array of plain objects using row 1 as header keys.
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {object[]}
 */
function _sheetToObjects(sheet) {
  var data    = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0].map(function (h) { return String(h).trim(); });
  var rows    = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    /* Skip completely empty rows */
    if (row.every(function (c) { return c === '' || c === null || c === undefined; })) continue;
    var obj = {};
    headers.forEach(function (h, j) { obj[h] = row[j] !== undefined ? row[j] : ''; });
    rows.push(obj);
  }
  return rows;
}

/**
 * Find the first row index (1-based) where column `colIndex` equals `value`.
 * Returns -1 if not found.
 */
function _findRowIndex(sheet, colIndex, value) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][colIndex]).toUpperCase() === String(value).toUpperCase()) {
      return i + 1; /* 1-based row number */
    }
  }
  return -1;
}

/**
 * Parse a JSON-encoded cell (arrays / objects stored as strings in the sheet).
 * Returns the fallback value if parsing fails.
 */
function _parseJson(raw, fallback) {
  if (raw === null || raw === undefined || raw === '') return fallback;
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw); } catch (_) { return fallback; }
}

/**
 * Generate a unique prefixed ID.
 */
function _generateId(prefix) {
  return (prefix || 'id') + '_' + Date.now() + '_' +
    Math.random().toString(36).slice(2, 8).toUpperCase();
}

/* ────────────────────────────────────────────────────────────
   PASSWORD HELPERS
   ──────────────────────────────────────────────────────────── */

/**
 * SHA-256 hex hash of `text`.
 * Run this from the GAS editor to generate initial password hashes:
 *   Logger.log(getPasswordHash('yourpassword'));
 */
function getPasswordHash(text) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    text,
    Utilities.Charset.UTF_8
  );
  return raw.map(function (b) {
    return ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2);
  }).join('');
}

function _verifyPassword(plain, stored) {
  if (!plain || !stored) return false;
  var hashed = getPasswordHash(plain);
  /* Accept SHA-256 hash OR plaintext match (for dev convenience) */
  return hashed === stored || plain === stored;
}

/* ────────────────────────────────────────────────────────────
   XP / LEVEL HELPERS
   ──────────────────────────────────────────────────────────── */

function _calcLevel(xp) {
  var lvl = XP_LEVELS[0];
  for (var i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].min) { lvl = XP_LEVELS[i]; break; }
  }
  return lvl;
}

/* ────────────────────────────────────────────────────────────
   AUTH — login
   ──────────────────────────────────────────────────────────── */

function _login(body) {
  var userId   = String(body.userId   || '').toUpperCase();
  var password = String(body.password || '');
  var role     = String(body.role     || 'student');

  /* Students log in with just their ID (matches frontend UX — no password
     field is shown for the student role). Teachers/admins still require a
     password. */
  if (!userId) return _err('missing_credentials');
  if (role !== 'student' && !password) return _err('missing_credentials');

  /* Look up in the appropriate sheet */
  var sheetName = (role === 'teacher' || role === 'admin')
    ? SHEET_NAMES.TEACHERS
    : SHEET_NAMES.STUDENTS;

  var rows = _sheetToObjects(_getSheet(sheetName));
  var user = null;

  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].userId || '').toUpperCase() === userId) {
      user = rows[i];
      break;
    }
  }

  if (!user) return _err('invalid_credentials', 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

  if (role !== 'student' && !_verifyPassword(password, String(user.passwordHash || ''))) {
    return _err('invalid_credentials', 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }

  /* Build user object matching the shape auth-service._buildSession() expects */
  var userData;

  if (role === 'teacher' || role === 'admin') {
    userData = {
      id:                userId,
      name:              user.name,
      role:              role,
      subject:           user.subject || null,
      classes:           _parseJson(user.classes, []),
      avatar:            (user.name || '?').charAt(0),
      xp:                0,
      level:             1,
      badges:            [],
      completedMissions: [],
      joinDate:          user.joinDate || '',
    };
  } else {
    var xp    = Number(user.xp) || 0;
    var lvl   = _calcLevel(xp);
    userData  = {
      id:                userId,
      name:              user.name,
      role:              'student',
      class:             user.class || null,
      avatar:            (user.name || '?').charAt(0),
      avatarColor:       user.avatarColor || null,
      xp:                xp,
      level:             lvl.level,
      badges:            _parseJson(user.badges, []),
      completedMissions: _parseJson(user.completedMissions, []),
      nickname:          user.nickname || null,
      email:             user.email    || null,
      bio:               user.bio      || null,
      joinDate:          user.joinDate || '',
    };
  }

  /* Log login event */
  try {
    _appendAnalytics(userId, 'login', null, null, { role: role });
  } catch (_) { /* non-fatal */ }

  return _ok({ success: true, user: userData });
}

/* ────────────────────────────────────────────────────────────
   STUDENT PROFILE
   ──────────────────────────────────────────────────────────── */

function _getStudentProfile(params) {
  var userId = String(params.userId || '').toUpperCase();
  if (!userId) return _err('missing_user_id');

  var rows = _sheetToObjects(_getSheet(SHEET_NAMES.STUDENTS));
  var row  = rows.find(function (r) { return String(r.userId || '').toUpperCase() === userId; });
  if (!row) return _err('user_not_found');

  var xp  = Number(row.xp) || 0;
  var lvl = _calcLevel(xp);

  return _ok({
    userId:            userId,
    name:              row.name,
    class:             row.class,
    xp:                xp,
    level:             lvl.level,
    levelName:         lvl.name,
    badges:            _parseJson(row.badges, []),
    completedMissions: _parseJson(row.completedMissions, []),
    avatarColor:       row.avatarColor || null,
    nickname:          row.nickname || null,
    email:             row.email    || null,
    bio:               row.bio      || null,
    joinDate:          row.joinDate || '',
  });
}

function _updateStudentProfile(body) {
  var userId  = String(body.userId || '').toUpperCase();
  var updates = body.updates || {};

  if (!userId) return _err('missing_user_id');
  if (!Object.keys(updates).length) return _err('no_updates');

  var ALLOWED = ['name', 'nickname', 'email', 'bio', 'avatarColor'];
  var sheet   = _getSheet(SHEET_NAMES.STUDENTS);
  var rowIdx  = _findRowIndex(sheet, 0, userId); /* col 0 = userId */
  if (rowIdx < 0) return _err('user_not_found');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });

  ALLOWED.forEach(function (field) {
    if (!(field in updates)) return;
    var colIdx = headers.indexOf(field);
    if (colIdx === -1) return;
    sheet.getRange(rowIdx, colIdx + 1).setValue(updates[field]);
  });

  return _ok(updates);
}

/* ────────────────────────────────────────────────────────────
   STUDENT DASHBOARD (aggregated)
   ──────────────────────────────────────────────────────────── */

function _getStudentDashboard(params) {
  var userId = String(params.userId || '').toUpperCase();
  if (!userId) return _err('missing_user_id');

  /* Profile */
  var profResult = _getStudentProfile(params);
  if (!profResult.ok) return profResult;
  var prof = profResult.data;

  /* Recent scores */
  var scoreRows = _sheetToObjects(_getSheet(SHEET_NAMES.SCORES))
    .filter(function (r) { return String(r.userId || '').toUpperCase() === userId; })
    .sort(function (a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); });

  var avgScore = scoreRows.length
    ? Math.round(scoreRows.reduce(function (s, r) { return s + (Number(r.score) || 0); }, 0) / scoreRows.length)
    : 0;

  /* Portfolio count */
  var pfRows = _sheetToObjects(_getSheet(SHEET_NAMES.PORTFOLIO))
    .filter(function (r) { return String(r.userId || '').toUpperCase() === userId; });

  return _ok(Object.assign({}, prof, {
    stats: {
      missions: { completed: prof.completedMissions.length, total: 5 },
      avgScore: avgScore,
      xp:       prof.xp,
      badges:   prof.badges.length,
      portfolio: pfRows.length,
    },
    recentScores: scoreRows.slice(0, 5).map(function (r) {
      return {
        missionId:   Number(r.missionId),
        score:       Number(r.score),
        xpEarned:    Number(r.xpEarned),
        submittedAt: r.submittedAt,
        isPassed:    r.isPassed === true || r.isPassed === 'TRUE' || r.isPassed === 'true',
      };
    }),
    lastActivity: scoreRows.length ? scoreRows[0].submittedAt : prof.joinDate,
  }));
}

/* ────────────────────────────────────────────────────────────
   MISSIONS
   ──────────────────────────────────────────────────────────── */

/* Static mission metadata — mirrors data/missions.json */
var _MISSION_META = [
  { id:1, title:'สวัสดีโลก! Hello, World!', icon:'terminal',    color:'#22C55E', colorBg:'linear-gradient(135deg,#22C55E,#16A34A)', difficulty:'beginner',     diffLabel:'ง่าย',       xpReward:100, estimatedMinutes:20, topics:['print()','ตัวแปร','ชนิดข้อมูล'], badgeOnComplete:'mission1_complete' },
  { id:2, title:'เงื่อนไขและการตัดสินใจ',    icon:'account_tree', color:'#3B82F6', colorBg:'linear-gradient(135deg,#3B82F6,#2563EB)', difficulty:'beginner',     diffLabel:'ง่าย',       xpReward:150, estimatedMinutes:25, topics:['if/else','Boolean','การเปรียบเทียบ'], badgeOnComplete:'mission2_complete' },
  { id:3, title:'วนซ้ำกับ Loop',             icon:'loop',         color:'#A855F7', colorBg:'linear-gradient(135deg,#A855F7,#7C3AED)', difficulty:'intermediate', diffLabel:'ปานกลาง',   xpReward:200, estimatedMinutes:30, topics:['for loop','while loop','range()'], badgeOnComplete:'mission3_complete' },
  { id:4, title:'ฟังก์ชั่น — สร้างเครื่องมือ', icon:'functions',  color:'#F59E0B', colorBg:'linear-gradient(135deg,#F59E0B,#D97706)', difficulty:'intermediate', diffLabel:'ปานกลาง',   xpReward:250, estimatedMinutes:35, topics:['def','return','parameters'], badgeOnComplete:'mission4_complete' },
  { id:5, title:'AI สร้างได้! — Mini Project', icon:'smart_toy', color:'#EF4444', colorBg:'linear-gradient(135deg,#EF4444,#DC2626)', difficulty:'advanced',     diffLabel:'ยาก',       xpReward:350, estimatedMinutes:45, topics:['Mini AI','Input/Output','Logic'], badgeOnComplete:'mission5_complete' },
];

function _annotateMissions(missions, completedIds) {
  completedIds = completedIds || [];
  return missions.map(function (m) {
    var done = completedIds.indexOf(m.id) !== -1;
    var prev = m.id === 1 || completedIds.indexOf(m.id - 1) !== -1;
    return Object.assign({}, m, {
      isCompleted: done,
      isUnlocked:  done || prev,
      isCurrent:   !done && prev,
    });
  });
}

function _getMissions(params) {
  var userId   = params.userId ? String(params.userId).toUpperCase() : null;
  var completed = [];

  if (userId) {
    var rows = _sheetToObjects(_getSheet(SHEET_NAMES.STUDENTS));
    var row  = rows.find(function (r) { return String(r.userId || '').toUpperCase() === userId; });
    if (row) completed = _parseJson(row.completedMissions, []);
  }

  return _ok(_annotateMissions(_MISSION_META, completed));
}

function _getMission(params) {
  var missionId = Number(params.missionId);
  if (!missionId) return _err('missing_mission_id');

  var m = _MISSION_META.find(function (x) { return x.id === missionId; });
  if (!m) return _err('mission_not_found');

  var userId    = params.userId ? String(params.userId).toUpperCase() : null;
  var completed = [];
  if (userId) {
    var rows = _sheetToObjects(_getSheet(SHEET_NAMES.STUDENTS));
    var row  = rows.find(function (r) { return String(r.userId || '').toUpperCase() === userId; });
    if (row) completed = _parseJson(row.completedMissions, []);
  }

  return _ok(_annotateMissions([m], completed)[0]);
}

/* ────────────────────────────────────────────────────────────
   MISSION SUBMISSION
   ──────────────────────────────────────────────────────────── */

function _submitMission(body) {
  var userId          = String(body.userId    || '').toUpperCase();
  var missionId       = Number(body.missionId);
  var score           = Number(body.score);
  var durationSeconds = Number(body.durationSeconds) || 0;
  var codeSnapshot    = String(body.codeSnapshot || '').slice(0, 500);
  var submittedAt     = body.submittedAt || new Date().toISOString();

  if (!userId)    return _err('missing_user_id');
  if (!missionId) return _err('missing_mission_id');
  if (isNaN(score) || score < 0 || score > 100) return _err('invalid_score');

  var mission = _MISSION_META.find(function (m) { return m.id === missionId; });
  if (!mission) return _err('mission_not_found');

  /* Fetch current student row */
  var sheet   = _getSheet(SHEET_NAMES.STUDENTS);
  var rowIdx  = _findRowIndex(sheet, 0, userId);
  if (rowIdx < 0) return _err('user_not_found');

  var headers    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  var rowData    = sheet.getRange(rowIdx, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowObj     = {};
  headers.forEach(function (h, i) { rowObj[h] = rowData[i]; });

  var currentXP         = Number(rowObj.xp) || 0;
  var completedMissions = _parseJson(rowObj.completedMissions, []);
  var currentBadges     = _parseJson(rowObj.badges, []);

  var alreadyDone = completedMissions.indexOf(missionId) !== -1;
  var isPassed    = score >= PASS_THRESHOLD;

  /* Only award XP / badges on first completion */
  var xpEarned  = 0;
  var newBadges = [];
  var newCompleted = completedMissions.slice();

  if (!alreadyDone && isPassed) {
    xpEarned = Math.round(mission.xpReward * (score / 100));
    newCompleted.push(missionId);

    /* Mission badge */
    if (mission.badgeOnComplete && currentBadges.indexOf(mission.badgeOnComplete) === -1) {
      newBadges.push(mission.badgeOnComplete);
    }
    /* Perfect score badge */
    if (score === 100 && currentBadges.indexOf('perfect_score') === -1 && newBadges.indexOf('perfect_score') === -1) {
      newBadges.push('perfect_score');
    }
    /* Speed learner badge (< 15 minutes) */
    if (durationSeconds > 0 && durationSeconds < 900 && currentBadges.indexOf('speed_learner') === -1 && newBadges.indexOf('speed_learner') === -1) {
      newBadges.push('speed_learner');
    }
    /* All missions badge */
    if (newCompleted.length === 5 && currentBadges.indexOf('all_missions') === -1 && newBadges.indexOf('all_missions') === -1) {
      newBadges.push('all_missions');
    }
  }

  var newTotalXP    = currentXP + xpEarned;
  var newLevel      = _calcLevel(newTotalXP);
  var updatedBadges = currentBadges.concat(newBadges);

  /* Update Students sheet */
  if (!alreadyDone && isPassed) {
    var xpCol         = headers.indexOf('xp')                + 1;
    var levelCol      = headers.indexOf('level')             + 1;
    var badgesCol     = headers.indexOf('badges')            + 1;
    var completedCol  = headers.indexOf('completedMissions') + 1;

    if (xpCol)        sheet.getRange(rowIdx, xpCol).setValue(newTotalXP);
    if (levelCol)     sheet.getRange(rowIdx, levelCol).setValue(newLevel.level);
    if (badgesCol)    sheet.getRange(rowIdx, badgesCol).setValue(JSON.stringify(updatedBadges));
    if (completedCol) sheet.getRange(rowIdx, completedCol).setValue(JSON.stringify(newCompleted));
  }

  /* Append to Scores sheet */
  try {
    var scoresSheet = _getSheet(SHEET_NAMES.SCORES);
    scoresSheet.appendRow([
      _generateId('SCR'),
      userId,
      missionId,
      score,
      xpEarned,
      durationSeconds,
      codeSnapshot,
      submittedAt,
      isPassed,
    ]);
  } catch (_) { /* non-fatal */ }

  /* Log analytics */
  try {
    _appendAnalytics(userId, isPassed ? 'mission_complete' : 'mission_fail', missionId, score, {
      xpEarned: xpEarned, duration: durationSeconds
    });
  } catch (_) { /* non-fatal */ }

  return _ok({
    success:           true,
    isPassed:          isPassed,
    score:             score,
    xpEarned:          xpEarned,
    totalXp:           newTotalXP,
    level:             newLevel.level,
    levelName:         newLevel.name,
    badges:            updatedBadges,
    newBadges:         newBadges,
    completedMissions: newCompleted,
    alreadyCompleted:  alreadyDone,
  });
}

/* ────────────────────────────────────────────────────────────
   PORTFOLIO
   ──────────────────────────────────────────────────────────── */

function _getPortfolio(params) {
  var userId    = String(params.userId    || '').toUpperCase();
  var missionId = params.missionId ? Number(params.missionId) : null;
  var limit     = params.limit     ? Number(params.limit)     : 0;

  if (!userId) return _err('missing_user_id');

  var rows = _sheetToObjects(_getSheet(SHEET_NAMES.PORTFOLIO))
    .filter(function (r) { return String(r.userId || '').toUpperCase() === userId; });

  if (missionId) {
    rows = rows.filter(function (r) { return Number(r.missionId) === missionId; });
  }

  rows.sort(function (a, b) { return new Date(b.submittedAt) - new Date(a.submittedAt); });

  if (limit > 0) rows = rows.slice(0, limit);

  return _ok(rows.map(function (r) {
    return {
      id:          r.entryId,
      userId:      r.userId,
      missionId:   Number(r.missionId),
      title:       r.title,
      description: r.description,
      tags:        _parseJson(r.tags, r.tags ? r.tags.split(',') : []),
      fileName:    r.fileName,
      mimeType:    r.mimeType,
      fileSizeKb:  Number(r.fileSizeKb) || 0,
      driveUrl:    r.driveUrl,
      fileId:      r.fileId,
      thumbnailUrl:r.fileId ? 'https://drive.google.com/thumbnail?id=' + r.fileId + '&sz=w400' : null,
      submittedAt: r.submittedAt,
    };
  }));
}

function _uploadPortfolio(body) {
  var userId      = String(body.userId    || '').toUpperCase();
  var missionId   = Number(body.missionId);
  var title       = String(body.title     || '').trim();
  var description = String(body.description || '').trim();
  var tags        = String(body.tags      || '');
  var folderId    = body.folderId || _getDriveFolderId();
  var fileData    = body.fileData  || null;
  var fileName    = body.fileName  || 'upload';
  var mimeType    = body.mimeType  || 'application/octet-stream';
  var fileSize    = Number(body.fileSize) || 0;

  if (!userId)    return _err('missing_user_id');
  if (!missionId) return _err('missing_mission_id');
  if (!title)     return _err('missing_title');

  var driveUrl = null;
  var fileId   = null;

  if (fileData) {
    try {
      var blob   = Utilities.newBlob(Utilities.base64Decode(fileData), mimeType, fileName);
      var folder = DriveApp.getFolderById(folderId);
      var file   = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileId   = file.getId();
      driveUrl = file.getUrl();
    } catch (e) {
      return _err('drive_upload_failed', e.message);
    }
  }

  var entryId  = _generateId('PF');
  var fileSizeKb = fileSize ? Math.round(fileSize / 1024) : 0;

  try {
    _getSheet(SHEET_NAMES.PORTFOLIO).appendRow([
      entryId,
      userId,
      missionId,
      title,
      description,
      tags,
      fileName,
      mimeType,
      fileSizeKb,
      driveUrl,
      fileId,
      new Date().toISOString(),
    ]);
  } catch (e) {
    return _err('sheet_write_failed', e.message);
  }

  /* portfolio_first badge */
  try {
    var existing = _sheetToObjects(_getSheet(SHEET_NAMES.PORTFOLIO))
      .filter(function (r) { return String(r.userId || '').toUpperCase() === userId; });
    if (existing.length === 1) {
      _awardBadge(userId, 'portfolio_first');
    }
  } catch (_) { /* non-fatal */ }

  /* Analytics */
  try { _appendAnalytics(userId, 'portfolio_upload', missionId, null, { fileName: fileName }); } catch (_) {}

  return _ok({
    id:          entryId,
    userId:      userId,
    missionId:   missionId,
    title:       title,
    description: description,
    tags:        tags ? tags.split(',') : [],
    fileName:    fileName,
    mimeType:    mimeType,
    fileSizeKb:  fileSizeKb,
    driveUrl:    driveUrl,
    fileId:      fileId,
    thumbnailUrl: fileId ? 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w400' : null,
    submittedAt: new Date().toISOString(),
  });
}

function _deletePortfolioEntry(body) {
  var userId  = String(body.userId  || '').toUpperCase();
  var entryId = String(body.entryId || '');

  if (!userId || !entryId) return _err('missing_parameters');

  var sheet    = _getSheet(SHEET_NAMES.PORTFOLIO);
  var data     = sheet.getDataRange().getValues();
  var headers  = data[0].map(function (h) { return String(h).trim(); });
  var idCol    = headers.indexOf('entryId');
  var userCol  = headers.indexOf('userId');
  var fileIdCol= headers.indexOf('fileId');

  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idCol]) === entryId &&
        String(data[i][userCol]).toUpperCase() === userId) {
      /* Optionally delete from Drive */
      var fid = data[i][fileIdCol];
      if (fid) {
        try { DriveApp.getFileById(fid).setTrashed(true); } catch (_) {}
      }
      sheet.deleteRow(i + 1);
      return _ok({ deleted: true, entryId: entryId });
    }
  }

  return _err('entry_not_found');
}

/* ────────────────────────────────────────────────────────────
   ANALYTICS
   ──────────────────────────────────────────────────────────── */

function _appendAnalytics(userId, eventType, missionId, value, meta) {
  _getSheet(SHEET_NAMES.ANALYTICS).appendRow([
    _generateId('EVT'),
    userId || '',
    eventType || '',
    missionId || '',
    value !== null && value !== undefined ? value : '',
    meta ? JSON.stringify(meta) : '',
    new Date().toISOString(),
  ]);
}

function _logEvents(body) {
  var events = Array.isArray(body.events) ? body.events : [];
  if (!events.length) return _ok({ logged: 0 });

  var sheet = _getSheet(SHEET_NAMES.ANALYTICS);
  var rows  = events.map(function (evt) {
    return [
      evt.eventId  || _generateId('EVT'),
      evt.userId   || '',
      evt.type     || '',
      (evt.data && evt.data.missionId) || '',
      (evt.data && evt.data.value)     || '',
      JSON.stringify({ page: evt.page, data: evt.data, sessionId: evt.sessionId }),
      evt.ts || new Date().toISOString(),
    ];
  });

  if (rows.length) {
    sheet.getRange(
      sheet.getLastRow() + 1, 1, rows.length, rows[0].length
    ).setValues(rows);
  }

  return _ok({ logged: rows.length });
}

function _getAnalytics(params) {
  var userId = String(params.userId || '').toUpperCase();
  if (!userId) return _err('missing_user_id');

  var rows = _sheetToObjects(_getSheet(SHEET_NAMES.ANALYTICS))
    .filter(function (r) { return String(r.userId || '').toUpperCase() === userId; })
    .sort(function (a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });

  /* Aggregate per-event-type counts */
  var counts = {};
  rows.forEach(function (r) {
    counts[r.eventType] = (counts[r.eventType] || 0) + 1;
  });

  return _ok({ events: rows.slice(0, 100), counts: counts, total: rows.length });
}

/* ────────────────────────────────────────────────────────────
   LEADERBOARD
   ──────────────────────────────────────────────────────────── */

function _getLeaderboard(params) {
  var classFilter = params.classes ? params.classes.split(',') : [];
  var limit       = params.limit   ? Number(params.limit)     : 0;

  var rows = _sheetToObjects(_getSheet(SHEET_NAMES.STUDENTS));

  if (classFilter.length) {
    rows = rows.filter(function (r) { return classFilter.indexOf(r.class) !== -1; });
  }

  var ranked = rows.map(function (r) {
    var xp   = Number(r.xp) || 0;
    var lvl  = _calcLevel(xp);
    var cm   = _parseJson(r.completedMissions, []);
    var bdg  = _parseJson(r.badges, []);
    return {
      userId:            r.userId,
      name:              r.name,
      class:             r.class,
      xp:                xp,
      level:             lvl.level,
      levelName:         lvl.name,
      completedMissions: cm,
      badges:            bdg,
      avatarColor:       r.avatarColor || null,
    };
  }).sort(function (a, b) {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.completedMissions.length - a.completedMissions.length;
  }).map(function (s, i) {
    return Object.assign(s, { rank: i + 1 });
  });

  if (limit > 0) ranked = ranked.slice(0, limit);
  return _ok(ranked);
}

/* ────────────────────────────────────────────────────────────
   CLASS DATA (teacher dashboard)
   ──────────────────────────────────────────────────────────── */

function _getClassData(params) {
  var teacherId   = String(params.teacherId || '').toUpperCase();
  var classFilter = params.classes ? params.classes.split(',') : [];

  if (!teacherId) return _err('missing_teacher_id');

  /* Verify teacher exists */
  var teachers = _sheetToObjects(_getSheet(SHEET_NAMES.TEACHERS));
  var teacher  = teachers.find(function (t) { return String(t.userId || '').toUpperCase() === teacherId; });
  if (!teacher) return _err('teacher_not_found');

  var teacherClasses = _parseJson(teacher.classes, []);
  var filter = classFilter.length ? classFilter : teacherClasses;

  var leaderboard = _getLeaderboard({ classes: filter.join(',') });
  if (!leaderboard.ok) return leaderboard;

  var students = leaderboard.data;
  var n        = students.length;
  var totXP    = students.reduce(function (a, s) { return a + s.xp; }, 0);
  var totMiss  = students.reduce(function (a, s) { return a + s.completedMissions.length; }, 0);
  var totBadge = students.reduce(function (a, s) { return a + s.badges.length; }, 0);

  var missionCounts = [0,0,0,0,0];
  students.forEach(function (s) {
    (s.completedMissions || []).forEach(function (mid) {
      if (mid >= 1 && mid <= 5) missionCounts[mid - 1]++;
    });
  });

  return _ok({
    students:      students,
    classes:       filter,
    teacherId:     teacherId,
    teacherName:   teacher.name,
    stats: {
      total:         n,
      avgXP:         n ? Math.round(totXP / n) : 0,
      totalMissions: totMiss,
      totalBadges:   totBadge,
      missionCounts: missionCounts,
      missionPcts:   missionCounts.map(function (c) { return n ? Math.round((c / n) * 100) : 0; }),
    },
  });
}

function _getClassAnalytics(params) {
  var teacherId = String(params.teacherId || '').toUpperCase();
  if (!teacherId) return _err('missing_teacher_id');

  var teachers     = _sheetToObjects(_getSheet(SHEET_NAMES.TEACHERS));
  var teacher      = teachers.find(function (t) { return String(t.userId || '').toUpperCase() === teacherId; });
  if (!teacher) return _err('teacher_not_found');
  var classes      = _parseJson(teacher.classes, []);

  /* Get student IDs in teacher's classes */
  var students     = _sheetToObjects(_getSheet(SHEET_NAMES.STUDENTS))
    .filter(function (r) { return classes.indexOf(r.class) !== -1; });
  var studentIds   = students.map(function (s) { return String(s.userId).toUpperCase(); });

  /* Filter analytics rows */
  var fromDate = params.from ? new Date(params.from) : new Date(Date.now() - 7 * 86400000);
  var toDate   = params.to   ? new Date(params.to)   : new Date();

  var events = _sheetToObjects(_getSheet(SHEET_NAMES.ANALYTICS))
    .filter(function (r) {
      var ts = new Date(r.timestamp);
      return studentIds.indexOf(String(r.userId || '').toUpperCase()) !== -1 &&
             ts >= fromDate && ts <= toDate;
    });

  /* Daily activity aggregation */
  var dayMap = {};
  events.forEach(function (evt) {
    var day = String(evt.timestamp || '').slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { date: day, events: 0, submissions: 0, users: {} };
    dayMap[day].events++;
    dayMap[day].users[evt.userId] = true;
    if (evt.eventType === 'mission_complete' || evt.eventType === 'mission_fail') {
      dayMap[day].submissions++;
    }
  });

  var dailyActivity = Object.values(dayMap)
    .sort(function (a, b) { return a.date.localeCompare(b.date); })
    .map(function (d) {
      return { date: d.date, events: d.events, submissions: d.submissions, activeUsers: Object.keys(d.users).length };
    });

  return _ok({ dailyActivity: dailyActivity, totalEvents: events.length, generatedAt: new Date().toISOString() });
}

/* ────────────────────────────────────────────────────────────
   BADGE HELPERS
   ──────────────────────────────────────────────────────────── */

function _awardBadge(userId, badgeCode) {
  var sheet   = _getSheet(SHEET_NAMES.STUDENTS);
  var rowIdx  = _findRowIndex(sheet, 0, userId);
  if (rowIdx < 0) return;

  var headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  var badgesCol= headers.indexOf('badges') + 1;
  if (!badgesCol) return;

  var rawBadges = sheet.getRange(rowIdx, badgesCol).getValue();
  var badges    = _parseJson(rawBadges, []);
  if (badges.indexOf(badgeCode) !== -1) return;
  badges.push(badgeCode);
  sheet.getRange(rowIdx, badgesCol).setValue(JSON.stringify(badges));
}

function _getBadgeDefinitions() {
  /* Return static badge defs — same data as data/badges.json */
  var defs = [
    { id:'first_login',       code:'first_login',       icon:'waving_hand',  name:'ยินดีต้อนรับ!',          rarity:'common',     xpBonus:0   },
    { id:'mission1_complete', code:'mission1_complete', icon:'terminal',     name:'Hello World Hero',       rarity:'common',     xpBonus:25  },
    { id:'mission2_complete', code:'mission2_complete', icon:'account_tree', name:'Decision Maker',         rarity:'common',     xpBonus:25  },
    { id:'mission3_complete', code:'mission3_complete', icon:'loop',         name:'Loop Master',            rarity:'uncommon',   xpBonus:50  },
    { id:'mission4_complete', code:'mission4_complete', icon:'functions',    name:'Function Creator',       rarity:'uncommon',   xpBonus:50  },
    { id:'mission5_complete', code:'mission5_complete', icon:'smart_toy',    name:'AI Builder',             rarity:'rare',       xpBonus:100 },
    { id:'perfect_score',    code:'perfect_score',     icon:'workspace_premium', name:'Perfect Score',     rarity:'epic',       xpBonus:200 },
    { id:'speed_learner',    code:'speed_learner',     icon:'bolt',         name:'Speed Learner',          rarity:'uncommon',   xpBonus:75  },
    { id:'portfolio_first',  code:'portfolio_first',   icon:'collections',  name:'Portfolio Star',         rarity:'common',     xpBonus:25  },
    { id:'all_missions',     code:'all_missions',      icon:'emoji_events', name:'AI Coding Master',       rarity:'legendary',  xpBonus:500 },
  ];
  return _ok(defs);
}

/* ────────────────────────────────────────────────────────────
   DRIVE FOLDER HELPER
   ──────────────────────────────────────────────────────────── */

function _getDriveFolderId() {
  return PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID') || DRIVE_FOLDER_ID;
}

/* ────────────────────────────────────────────────────────────
   ADMIN UTILITIES (run from GAS editor, not via web app)
   ──────────────────────────────────────────────────────────── */

/**
 * Hash a plain-text password for storage in the spreadsheet.
 * Run from the GAS Script Editor:
 *   Logger.log(getPasswordHash('yourpassword'));
 */
// getPasswordHash is already defined above and exported via the function name.

/**
 * One-time setup: hash all plain-text passwords in the Students sheet.
 * Run once after populating initial data. Idempotent — already-hashed
 * passwords (64-char hex) are skipped.
 */
function migratePasswordsToHash() {
  var sheet   = _getSheet(SHEET_NAMES.STUDENTS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  var pwdCol  = headers.indexOf('passwordHash') + 1;
  if (!pwdCol) { Logger.log('No passwordHash column found'); return; }

  var data    = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var val = String(data[i][pwdCol - 1] || '');
    if (val.length === 64 && /^[0-9a-f]+$/.test(val)) continue; /* already hashed */
    if (!val) continue;
    sheet.getRange(i + 1, pwdCol).setValue(getPasswordHash(val));
  }
  Logger.log('Password migration complete.');
}

/**
 * Create all required sheets with headers if they don't exist.
 * Run once to initialise a fresh spreadsheet.
 */
function initializeSpreadsheet() {
  var ss = _getSpreadsheet();

  var config = [
    { name: SHEET_NAMES.STUDENTS,  headers: ['userId','name','passwordHash','class','xp','level','badges','completedMissions','joinDate','avatarColor','nickname','email','bio'] },
    { name: SHEET_NAMES.TEACHERS,  headers: ['userId','name','passwordHash','subject','classes','joinDate'] },
    { name: SHEET_NAMES.SCORES,    headers: ['scoreId','userId','missionId','score','xpEarned','durationSeconds','codeSnapshot','submittedAt','isPassed'] },
    { name: SHEET_NAMES.PORTFOLIO, headers: ['entryId','userId','missionId','title','description','tags','fileName','mimeType','fileSizeKb','driveUrl','fileId','submittedAt'] },
    { name: SHEET_NAMES.ANALYTICS, headers: ['eventId','userId','eventType','missionId','value','meta','timestamp'] },
  ];

  config.forEach(function (cfg) {
    var sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
      Logger.log('Created sheet: ' + cfg.name);
    }
    var existing = sheet.getRange(1, 1, 1, Math.max(cfg.headers.length, sheet.getLastColumn() || 1)).getValues()[0];
    if (!existing[0]) {
      sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      Logger.log('Set headers on: ' + cfg.name);
    }
  });

  Logger.log('Spreadsheet initialization complete.');
}
