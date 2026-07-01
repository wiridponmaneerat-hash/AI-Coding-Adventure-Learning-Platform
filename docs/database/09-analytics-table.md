# Analytics Table

**Sheet Name:** `Analytics`  
**Primary Key:** `event_id`  
**Row Limit (Design):** ~50,000 rows/year — archive each academic term  

---

## Purpose

Records every significant learning activity event as an immutable, timestamped log entry. This is the platform's **event stream** — it powers:

- Teacher dashboards showing student engagement
- AI recommendation engine (pattern analysis)
- Learning time tracking
- Class-level heatmaps (which missions/steps are hardest)
- Progress reports

This table is **append-only**. Rows are never updated or deleted (only `is_active` may be set to `FALSE` for data corrections).

---

## Column Definitions

| # | Column Name      | Data Type  | Required | Default    | Description |
|---|------------------|------------|:--------:|------------|-------------|
| 1 | `event_id`       | STRING     | ✅ Yes   | —          | Unique identifier. Format: `EVT` + 6-digit number (e.g. `EVT000001`). |
| 2 | `student_id`     | STRING     | ✅ Yes   | —          | Foreign key → `Students.student_id`. |
| 3 | `event_type`     | ENUM       | ✅ Yes   | —          | Category of event. See Event Type Catalogue below. |
| 4 | `mission_id`     | INTEGER    | ❌ No    | `0`        | Foreign key → `Missions.mission_id`. `0` if event is not mission-specific (e.g. `login`). |
| 5 | `step_number`    | INTEGER    | ❌ No    | `0`        | Specific step number within the mission. `0` if not applicable. |
| 6 | `ref_id`         | STRING     | ❌ No    | `""`       | Reference to a related record. e.g. `score_id` for `mission_submit`, `portfolio_id` for `portfolio_upload`. |
| 7 | `score_value`    | INTEGER    | ❌ No    | `0`        | Score value, if applicable to the event (e.g. `mission_submit`). Range: 0–100. |
| 8 | `xp_delta`       | INTEGER    | ❌ No    | `0`        | XP change caused by this event. Positive = gained, 0 = no XP impact. |
| 9 | `duration_sec`   | INTEGER    | ❌ No    | `0`        | Time in seconds this event represents (e.g. time on a step, session duration). |
| 10| `device_type`    | ENUM       | ❌ No    | `unknown`  | Device category. Allowed: `desktop`, `tablet`, `mobile`, `unknown`. |
| 11| `session_id`     | STRING     | ❌ No    | `""`       | Browser session ID (UUID generated client-side at login). Groups events in one visit. |
| 12| `metadata`       | STRING     | ❌ No    | `""`       | JSON string with additional context for this event. Max 500 characters. |
| 13| `occurred_at`    | DATETIME   | ✅ Yes   | Now (UTC)  | UTC ISO 8601 timestamp when the event occurred client-side. |
| 14| `received_at`    | DATETIME   | ✅ Yes   | Now (UTC)  | UTC ISO 8601 timestamp when Apps Script received the event. Used to detect clock drift. |
| 15| `is_active`      | BOOLEAN    | ✅ Yes   | `TRUE`     | `FALSE` = flagged as invalid/duplicate by admin. Never physically deleted. |
| 16| `created_at`     | DATETIME   | ✅ Yes   | Now (UTC)  | Same as `received_at` for analytics rows. |

---

## Event Type Catalogue

| `event_type` | Trigger | `mission_id` | `score_value` | `xp_delta` |
|---|---|:---:|:---:|:---:|
| `login` | Student logs in | — | — | — |
| `logout` | Student logs out | — | — | — |
| `mission_view` | Student opens a mission | ✅ | — | — |
| `step_advance` | Student clicks "Next" on a step | ✅ | — | — |
| `step_back` | Student clicks "Previous" on a step | ✅ | — | — |
| `hint_request` | Student clicks "Show Hint" | ✅ | — | — |
| `code_run` | Student runs code in the editor | ✅ | — | — |
| `code_error` | Runtime/syntax error occurs in editor | ✅ | — | — |
| `mission_submit` | Student submits a mission | ✅ | ✅ | ✅ |
| `mission_complete` | Mission marked as completed (first pass) | ✅ | ✅ | ✅ |
| `badge_earned` | Badge awarded to student | — | — | ✅ |
| `portfolio_upload` | Student uploads a portfolio entry | ✅ | — | — |
| `portfolio_view` | Student views a portfolio entry | ✅ | — | — |
| `profile_update` | Student updates their profile | — | — | — |
| `leaderboard_view` | Student views the leaderboard | — | — | — |
| `ai_rec_view` | Student views an AI recommendation | — | — | — |
| `ai_rec_click` | Student clicks an AI recommendation action | — | — | — |
| `session_start` | Page loaded, session initialised | — | — | — |
| `session_end` | Page unloaded or logout | — | — | — |

---

## Metadata Field Examples

The `metadata` JSON string carries event-specific context that doesn't fit a standard column.

| `event_type` | `metadata` example |
|---|---|
| `code_error` | `{"error":"NameError","line":3,"message":"name 'x' is not defined"}` |
| `hint_request` | `{"step":4,"hint_index":1}` |
| `mission_submit` | `{"attempt":2,"passed":true,"duration_sec":840}` |
| `badge_earned` | `{"badge_code":"mission1_complete","xp_bonus":0}` |
| `ai_rec_click` | `{"rec_id":"REC000012","action":"start_mission","mission_id":3}` |

---

## Validation Rules

| Column | Rule |
|--------|------|
| `event_id` | Must match `^EVT\d{6}$`. Unique. Auto-incremented. |
| `student_id` | Must exist in `Students.student_id`. |
| `event_type` | Must be one of the values in the Event Type Catalogue. |
| `mission_id` | If > 0, must exist in `Missions.mission_id`. |
| `step_number` | Integer ≥ 0. If > 0, must not exceed `Missions.total_steps` for that mission. |
| `score_value` | Integer 0–100. |
| `xp_delta` | Integer ≥ 0. |
| `duration_sec` | Integer ≥ 0. Max 86,400 (one day). |
| `device_type` | Must be one of: `desktop`, `tablet`, `mobile`, `unknown`. |
| `metadata` | If provided, must be valid JSON. Max 500 characters. |
| `occurred_at` | Valid ISO 8601 datetime. Must not be in the future (allow 60s clock drift). |

---

## Aggregations Used by Dashboard

The teacher dashboard computes these aggregations from `Analytics` on demand:

| Metric | Query Logic |
|---|---|
| Total time on platform | `SUM(duration_sec)` WHERE `student_id` AND `event_type IN (step_advance, code_run, mission_submit)` |
| Mission completion rate | `COUNT DISTINCT mission_id` WHERE `event_type = mission_complete` / total published missions |
| Hardest step | `step_number` with highest `COUNT` of `event_type = hint_request` or `code_error` |
| Daily active students | `COUNT DISTINCT student_id` WHERE `occurred_at` = today AND `event_type = login` |
| Average attempts per mission | `COUNT(score_id)` / `COUNT DISTINCT student_id` grouped by `mission_id` |

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Belongs to student | `student_id` | `Students.student_id` | `student_id` | Many-to-One |
| References mission | `mission_id` | `Missions.mission_id` | `mission_id` | Many-to-One (optional) |
| References score | `ref_id` | `Scores.score_id` | `score_id` | Many-to-One (conditional) |
| References portfolio | `ref_id` | `Portfolio.portfolio_id` | `portfolio_id` | Many-to-One (conditional) |
| Feeds AI recommendations | `event_type`, `student_id` | `AI_Recs` | (aggregated input) | Source data |

---

## Example Data

| event_id | student_id | event_type | mission_id | step_number | score_value | xp_delta | occurred_at |
|---|---|---|---|---|---|---|---|
| EVT000001 | STD001 | login | 0 | 0 | 0 | 0 | 2026-02-01T08:00:00Z |
| EVT000002 | STD001 | mission_view | 1 | 0 | 0 | 0 | 2026-02-01T08:02:14Z |
| EVT000003 | STD001 | step_advance | 1 | 1 | 0 | 0 | 2026-02-01T08:05:30Z |
| EVT000004 | STD001 | hint_request | 1 | 3 | 0 | 0 | 2026-02-01T08:20:00Z |
| EVT000005 | STD001 | mission_submit | 1 | 5 | 72 | 100 | 2026-02-01T08:45:00Z |
| EVT000006 | STD001 | mission_complete | 1 | 5 | 72 | 100 | 2026-02-01T08:45:01Z |
| EVT000007 | STD001 | badge_earned | 0 | 0 | 0 | 0 | 2026-02-01T08:45:02Z |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `logEvent` | POST | Appends a single analytics event. Called by client after user actions. |
| `logEvents` | POST | Batch-appends multiple events (e.g. on logout, flush buffered events). |
| `getStudentAnalytics` | GET | Returns aggregated analytics for one student |
| `getClassAnalytics` | GET | Returns aggregated analytics for a teacher's class |
| `getMissionHeatmap` | GET | Returns per-step difficulty metrics for a mission |
