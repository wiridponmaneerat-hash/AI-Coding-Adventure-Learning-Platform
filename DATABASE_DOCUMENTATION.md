# Database Documentation

## Platform

**Google Sheets** — used as a relational-like database.  
Accessed exclusively through the Google Apps Script backend.  
Direct access from the frontend is never allowed.

**Spreadsheet name**: AI Coding Adventure DB  
**Created by**: `initializeSpreadsheet()` function in `services/apps-script.js`

---

## Sheets (Tables)

### 1. Students

Primary table for student accounts and progress.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | Unique student ID (e.g., `STD001`) |
| `name` | String | Full name (ชื่อ-นามสกุล) |
| `password` | String | SHA-256 hash (or plaintext before migration) |
| `class` | String | ห้องเรียน (e.g., `ป.5/1`) |
| `xp` | Number | Total XP accumulated |
| `level` | Number | Current level (1–5) |
| `badges` | JSON String | `["mission1_complete","perfect_score"]` |
| `completedMissions` | JSON String | `[1,2,3]` — mission IDs passed |
| `avatar` | String | Single character used as avatar initial |
| `avatarColor` | String | Hex color (e.g., `#2563EB`) |
| `theme` | String | UI theme (`default`) |
| `nickname` | String | Display nickname |
| `email` | String | Optional student email |
| `bio` | String | Short bio (max 200 chars) |
| `joinDate` | Date | ISO 8601 date string |

---

### 2. Teachers

Teacher accounts with class assignments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | Unique teacher ID (e.g., `TCH001`) |
| `name` | String | Full name |
| `password` | String | SHA-256 hash |
| `subject` | String | วิชาที่สอน |
| `classes` | JSON String | `["ป.5/1","ป.5/2"]` — classes taught |
| `avatar` | String | Avatar initial |
| `avatarColor` | String | Hex color |

---

### 3. Missions

Static mission definitions (can be edited in the sheet to update content without redeploying).

| Column | Type | Description |
|--------|------|-------------|
| `id` | Number | Mission ID (1–5) |
| `title` | String | Mission title |
| `description` | String | Short description |
| `difficulty` | String | `beginner`, `intermediate`, `advanced` |
| `xpReward` | Number | Max XP for completing this mission |
| `badgeOnComplete` | String | Badge ID awarded on first pass |
| `estimatedMinutes` | Number | Estimated completion time |
| `steps` | JSON String | Array of step objects |
| `quiz` | JSON String | Array of quiz question objects |

---

### 4. Scores

Historical record of every mission submission.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | Auto-generated row ID |
| `userId` | String | Student ID |
| `missionId` | Number | Mission ID |
| `score` | Number | Score 0–100 |
| `xpAwarded` | Number | XP given (0 if repeat) |
| `passed` | Boolean | `true` if score ≥ 60 |
| `elapsed` | Number | Time taken in seconds |
| `firstTime` | Boolean | `true` if first time passing |
| `submittedAt` | DateTime | ISO 8601 timestamp |

**Indexes** (logical): `userId`, `missionId`, `submittedAt`

---

### 5. Portfolio

Portfolio entry metadata. Files are stored in Google Drive.

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | Auto-generated row ID |
| `userId` | String | Student ID |
| `title` | String | Portfolio entry title |
| `description` | String | Description text |
| `missionId` | Number | Related mission ID |
| `fileName` | String | Original file name |
| `mimeType` | String | `image/png`, `application/pdf`, etc. |
| `driveFileId` | String | Google Drive file ID |
| `viewUrl` | String | `drive.google.com/file/d/{id}/view` |
| `createdAt` | DateTime | ISO 8601 timestamp |

---

### 6. Badges

Badge definitions (read-only reference data).

| Column | Type | Description |
|--------|------|-------------|
| `id` | String | Badge identifier (e.g., `perfect_score`) |
| `name` | String | Display name (Thai) |
| `description` | String | How to earn this badge |
| `icon` | String | Material Symbol icon name |
| `color` | String | Hex color |

**Predefined badges:**

| ID | Name | Trigger |
|----|------|---------|
| `mission1_complete` | ผู้พิชิตภารกิจ 1 | ผ่าน Mission 1 ครั้งแรก |
| `mission2_complete` | ผู้พิชิตภารกิจ 2 | ผ่าน Mission 2 ครั้งแรก |
| `mission3_complete` | ผู้พิชิตภารกิจ 3 | ผ่าน Mission 3 ครั้งแรก |
| `mission4_complete` | ผู้พิชิตภารกิจ 4 | ผ่าน Mission 4 ครั้งแรก |
| `mission5_complete` | ผู้พิชิตภารกิจ 5 | ผ่าน Mission 5 ครั้งแรก |
| `perfect_score` | Perfect Score | ได้ 100% ในภารกิจใด ๆ |
| `speed_learner` | Speed Learner | ผ่านภารกิจภายใน 15 นาที |
| `portfolio_first` | Portfolio Creator | อัปโหลดผลงานชิ้นแรก |
| `all_missions` | AI Master | ผ่านครบทั้ง 5 ภารกิจ |

---

### 7. Analytics

Event log for learning analytics.

| Column | Type | Description |
|--------|------|-------------|
| `eventId` | String | UUID v4 |
| `userId` | String | Student/teacher ID |
| `sessionId` | String | Browser session UUID |
| `type` | String | Event type (see below) |
| `page` | String | Page filename |
| `data` | JSON String | Event-specific payload |
| `ts` | DateTime | ISO 8601 client timestamp |
| `receivedAt` | DateTime | ISO 8601 server timestamp |

**Event types:**

| Type | When fired | Key data fields |
|------|-----------|-----------------|
| `login` | On successful login | `role` |
| `page_view` | On DOMContentLoaded | *(none)* |
| `mission_start` | After mission loads | `missionId`, `title` |
| `quiz_answer` | After each submitted answer | `missionId`, `qIndex`, `correct`, `type` |
| `mission_complete` | After passing quiz | `missionId`, `score`, `xpEarned`, `duration`, `firstTime` |
| `mission_fail` | After failing quiz | `missionId`, `score` |
| `portfolio_upload` | After successful upload | `missionId`, `type`, `fileSize` |
| `profile_update` | After saving profile form | `fields[]` |
| `error` | On `window.error` event | `message`, `filename`, `lineno` |

---

## Data Relationships

```
Teachers ──< classes >── Students
Students ──< Scores >── Missions
Students ──< Portfolio
Students ──< Analytics
Missions ──< Badges (via badgeOnComplete field)
```

---

## Backup Strategy

Google Sheets automatically versions history (File → Version history).  
For disaster recovery, periodically export each sheet as CSV using:

```
File → Download → Comma Separated Values (.csv)
```

Or run this in GAS to export all sheets to Drive:

```javascript
function backupAllSheets() {
  var ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  var folder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID'));
  var date = new Date().toISOString().slice(0,10);
  ss.getSheets().forEach(function(sheet) {
    var data = sheet.getDataRange().getValues();
    var csv = data.map(function(row) { return row.join(','); }).join('\n');
    folder.createFile('backup_' + sheet.getName() + '_' + date + '.csv', csv, MimeType.CSV);
  });
}
```

---

## Security Notes

- All student passwords must be SHA-256 hashed — run `migratePasswordsToHash()` after initial setup
- The Spreadsheet should be set to **restricted access** (only the GAS service account)
- Never commit plaintext passwords to the repository
- GAS Web App runs as the spreadsheet owner — ensure the owner account has 2FA enabled
- Portfolio Drive files are set to `ANYONE_WITH_LINK VIEW` — filenames should not contain sensitive information
