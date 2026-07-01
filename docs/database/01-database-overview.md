# AI Coding Adventure — Database Architecture Overview

**Version:** 1.0.0  
**Platform:** Google Sheets + Google Apps Script  
**Last Updated:** 2026-06-30  
**Status:** Production Design

---

## 1. Introduction

AI Coding Adventure Learning Platform uses **Google Sheets** as its primary database, accessed through a **Google Apps Script** REST API layer. This architecture was chosen because:

- The target school already uses Google Workspace
- No server infrastructure is required
- Teachers and administrators can inspect data directly in Sheets
- Google Drive handles file storage for Portfolio
- Zero additional licensing cost

---

## 2. Workbook Structure

All data lives in a single Google Sheets workbook titled **`ACA_Database`**.  
Each sheet in the workbook acts as a database table.

| Sheet Name      | Purpose                                  | Primary Key  |
|-----------------|------------------------------------------|--------------|
| `Students`      | Student accounts and profile data        | `student_id` |
| `Teachers`      | Teacher accounts and class assignments   | `teacher_id` |
| `Missions`      | Mission definitions and metadata         | `mission_id` |
| `Progress`      | Per-student mission progress tracking    | `progress_id`|
| `Scores`        | Quiz and mission submission scores       | `score_id`   |
| `Badges`        | Badge definitions and award records      | `badge_id`   |
| `Portfolio`     | Student portfolio entries and Drive links| `portfolio_id`|
| `Analytics`     | Learning activity events                 | `event_id`   |
| `Leaderboard`   | Computed rankings snapshot               | `rank_id`    |
| `AI_Recs`       | AI recommendation history                | `rec_id`     |
| `System_Logs`   | API request and error logs               | `log_id`     |

---

## 3. ID Naming Convention

All primary keys follow a **prefix + zero-padded sequence** pattern.

| Prefix | Entity         | Example       |
|--------|----------------|---------------|
| `STD`  | Student        | `STD001`      |
| `TCH`  | Teacher        | `TCH001`      |
| `MSN`  | Mission        | `MSN001`      |
| `PRG`  | Progress       | `PRG000001`   |
| `SCR`  | Score          | `SCR000001`   |
| `BDG`  | Badge          | `BDG001`      |
| `PF`   | Portfolio      | `PF000001`    |
| `EVT`  | Analytics Event| `EVT000001`   |
| `RNK`  | Leaderboard    | `RNK000001`   |
| `REC`  | AI Recommendation | `REC000001`|
| `LOG`  | System Log     | `LOG000001`   |

---

## 4. Data Types in Google Sheets Context

Google Sheets does not enforce strict types, so the API layer must validate all data before writing.

| Logical Type | Sheets Storage          | Validation Rule                         |
|--------------|-------------------------|------------------------------------------|
| `STRING`     | Plain text cell         | Max length enforced by Apps Script       |
| `INTEGER`    | Number cell (0 decimal) | Must be whole number ≥ 0                 |
| `DECIMAL`    | Number cell (2 decimal) | Must be numeric                          |
| `BOOLEAN`    | `TRUE` / `FALSE`        | Only accept literal TRUE or FALSE        |
| `DATETIME`   | ISO 8601 text           | `YYYY-MM-DDTHH:mm:ss.sssZ`              |
| `DATE`       | ISO 8601 text           | `YYYY-MM-DD`                            |
| `JSON_ARRAY` | JSON string             | Valid JSON array, parsed by Apps Script  |
| `ENUM`       | Plain text              | Must match predefined allowed values     |

---

## 5. Common Columns (All Tables)

Every table contains the following audit columns:

| Column        | Type       | Description                                      |
|---------------|------------|--------------------------------------------------|
| `created_at`  | DATETIME   | Row creation timestamp (UTC, ISO 8601)           |
| `updated_at`  | DATETIME   | Last modification timestamp (UTC, ISO 8601)      |
| `is_active`   | BOOLEAN    | Soft-delete flag — FALSE hides row from API      |

---

## 6. Google Apps Script API Layer

The Sheets database is never accessed directly from the browser. All reads and writes go through a **Google Apps Script Web App** deployed as a REST endpoint.

```
Browser → fetch(GAS_URL?action=xxx) → doGet(e) / doPost(e) → Sheets
```

### Supported Actions

| HTTP Method | GAS Handler | Use Case                        |
|-------------|-------------|---------------------------------|
| `GET`       | `doGet(e)`  | Read-only queries               |
| `POST`      | `doPost(e)` | Create, Update, Delete, Upload  |

### Standard Response Envelope

Every API response returns a consistent JSON envelope:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "timestamp": "2026-06-30T08:00:00.000Z"
}
```

On failure:

```json
{
  "success": false,
  "data": null,
  "error": "invalid_credentials",
  "message": "รหัสผ่านไม่ถูกต้อง",
  "timestamp": "2026-06-30T08:00:00.000Z"
}
```

---

## 7. Role-Based Access

| Role      | Read Own Data | Read All Data | Write Own Data | Write All Data | Admin Actions |
|-----------|:---:|:---:|:---:|:---:|:---:|
| `student` | ✅ | ❌ | ✅ (profile only) | ❌ | ❌ |
| `teacher` | ✅ | ✅ (own classes) | ✅ | ✅ (own classes) | ❌ |
| `admin`   | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 8. Capacity Planning

| Table        | Expected Rows / Year | Growth Driver             |
|--------------|---------------------:|---------------------------|
| Students     | ~120                 | School enrollment         |
| Teachers     | ~10                  | Staff                     |
| Missions     | ~20                  | Curriculum expansion      |
| Progress     | ~600                 | Students × Missions       |
| Scores       | ~3,000               | Attempts per mission      |
| Badges       | ~1,000               | Award events              |
| Portfolio    | ~720                 | ~6 per student            |
| Analytics    | ~50,000              | High-frequency events     |
| Leaderboard  | ~120 snapshots       | Weekly refresh            |
| AI_Recs      | ~5,000               | Recommendations generated |
| System_Logs  | ~100,000             | All API calls             |

> **Note:** Google Sheets supports up to 10 million cells per workbook. Analytics and System_Logs should be archived to a new sheet each academic term.

---

## 9. Backup Strategy

| Frequency | Method                                                        |
|-----------|---------------------------------------------------------------|
| Daily     | Apps Script trigger copies workbook to `ACA_Backup` folder in Drive |
| Weekly    | Export each sheet as CSV to a dated Drive folder              |
| Per Term  | Freeze sheet, create new workbook for next term               |

---

## 10. Document Index

| File | Content |
|------|---------|
| [02-students-table.md](02-students-table.md) | Students sheet schema |
| [03-teachers-table.md](03-teachers-table.md) | Teachers sheet schema |
| [04-missions-table.md](04-missions-table.md) | Missions sheet schema |
| [05-progress-table.md](05-progress-table.md) | Progress sheet schema |
| [06-scores-table.md](06-scores-table.md) | Scores sheet schema |
| [07-badges-table.md](07-badges-table.md) | Badges sheet schema |
| [08-portfolio-table.md](08-portfolio-table.md) | Portfolio sheet schema |
| [09-analytics-table.md](09-analytics-table.md) | Analytics sheet schema |
| [10-leaderboard-table.md](10-leaderboard-table.md) | Leaderboard sheet schema |
| [11-system-logs.md](11-system-logs.md) | System Logs sheet schema |
| [12-data-relationships.md](12-data-relationships.md) | Entity relationships and data flow |
