# System Logs Table

**Sheet Name:** `System_Logs`  
**Primary Key:** `log_id`  
**Row Limit (Design):** ~100,000 rows/year — archive monthly  

---

## Purpose

Provides a complete audit trail of every request the Google Apps Script backend receives, including successful operations, validation failures, authentication events, and unexpected errors. System Logs serve three distinct functions:

1. **Debugging** — trace the exact request that caused an error.
2. **Security auditing** — detect suspicious login patterns or unauthorised access attempts.
3. **Performance monitoring** — track response times and identify slow operations.

This table is **append-only** and should **never** be modified after insert. Archive rows older than 90 days to a separate `System_Logs_Archive_YYYY_MM` sheet.

---

## Column Definitions

| # | Column Name       | Data Type  | Required | Default     | Description |
|---|-------------------|------------|:--------:|-------------|-------------|
| 1 | `log_id`          | STRING     | ✅ Yes   | —           | Unique identifier. Format: `LOG` + 6-digit number (e.g. `LOG000001`). |
| 2 | `log_level`       | ENUM       | ✅ Yes   | `INFO`      | Severity. Allowed: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`. |
| 3 | `action`          | STRING     | ✅ Yes   | —           | The API action name that generated this log. e.g. `login`, `submitMission`, `getLeaderboard`. Max 60 characters. |
| 4 | `method`          | ENUM       | ✅ Yes   | `GET`       | HTTP method used. Allowed: `GET`, `POST`. (Apps Script limitation — see Architecture Overview). |
| 5 | `actor_id`        | STRING     | ❌ No    | `""`        | `student_id`, `teacher_id`, or `admin_id` of the user who made the request. Empty for anonymous/unauthenticated requests. |
| 6 | `actor_role`      | ENUM       | ❌ No    | `""`        | Role of the actor. Allowed: `student`, `teacher`, `admin`, `system`, `""`(anonymous). |
| 7 | `status`          | ENUM       | ✅ Yes   | —           | Result of the request. Allowed: `success`, `failure`, `error`. |
| 8 | `http_status`     | INTEGER    | ✅ Yes   | `200`       | HTTP status code returned to client. e.g. `200`, `400`, `401`, `403`, `500`. |
| 9 | `error_code`      | STRING     | ❌ No    | `""`        | Machine-readable error key. e.g. `invalid_credentials`, `mission_not_found`. Max 60 characters. |
| 10| `error_message`   | STRING     | ❌ No    | `""`        | Human-readable error description. Max 500 characters. Never include passwords or tokens. |
| 11| `request_params`  | STRING     | ❌ No    | `""`        | Sanitised JSON of incoming parameters (passwords and file data stripped). Max 500 characters. |
| 12| `response_size_b` | INTEGER    | ❌ No    | `0`         | Size of JSON response body in bytes. Useful for bandwidth monitoring. |
| 13| `duration_ms`     | INTEGER    | ❌ No    | `0`         | Time in milliseconds from request receipt to response. |
| 14| `ip_hint`         | STRING     | ❌ No    | `""`        | First 3 octets of client IP (e.g. `192.168.1.*`) for geographic clustering. **Do not store full IP** (privacy compliance). |
| 15| `user_agent`      | STRING     | ❌ No    | `""`        | Client user-agent string. Truncated to 200 characters. |
| 16| `session_id`      | STRING     | ❌ No    | `""`        | Client-provided session ID. Links log entries to a user session. |
| 17| `occurred_at`     | DATETIME   | ✅ Yes   | Now (UTC)   | UTC timestamp when the request was received by Apps Script. |
| 18| `is_active`       | BOOLEAN    | ✅ Yes   | `TRUE`      | Immutable — always `TRUE`. Never soft-delete log entries; archive instead. |
| 19| `created_at`      | DATETIME   | ✅ Yes   | Now (UTC)   | Same as `occurred_at`. |

---

## Log Level Definitions

| `log_level` | When to Use | Alert? |
|---|---|:---:|
| `DEBUG` | Verbose tracing during development (disabled in production) | ❌ |
| `INFO` | Normal successful operations | ❌ |
| `WARN` | Non-critical issue — request succeeded but something was unexpected (e.g. slow query, deprecated action) | ❌ |
| `ERROR` | Request failed due to a recoverable error (validation failure, auth failure, not found) | ❌ |
| `FATAL` | Unhandled exception, data corruption, Apps Script quota exceeded | ✅ Admin email alert |

---

## Status Values

| `status` | `http_status` range | Meaning |
|---|---|---|
| `success` | 200–299 | Request completed as expected |
| `failure` | 400–499 | Request rejected due to client error (bad input, auth failure) |
| `error` | 500–599 | Server-side error in Apps Script |

---

## Security Monitoring Patterns

The following patterns in this table indicate potential security issues. Admin should review when detected:

| Pattern | Threshold | Concern |
|---|---|---|
| `action = login` AND `status = failure` AND same `ip_hint` | ≥ 5 in 10 minutes | Brute-force attempt |
| `action = login` AND `status = failure` AND same `actor_id` | ≥ 10 in 1 hour | Credential stuffing |
| `log_level = FATAL` | Any | Requires immediate investigation |
| `http_status = 403` | ≥ 3 from same `actor_id` in 1 hour | Privilege escalation attempt |
| `duration_ms` > 10,000 | Frequent | Apps Script performance degradation |

---

## Request Parameter Sanitisation Rules

Before writing `request_params`, the Apps Script handler **must** strip:

- Any field named `password`, `password_hash`, `token`, `secret`.
- Any field containing Base64-encoded file data (`fileData`, `file`, `content`).
- Any field with value length > 200 characters (replace with `"[truncated]"`).

---

## Validation Rules

| Column | Rule |
|--------|------|
| `log_id` | Must match `^LOG\d{6}$`. Unique. Auto-incremented. |
| `log_level` | Must be one of: `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`. |
| `action` | Non-empty. Max 60 characters. |
| `method` | Must be `GET` or `POST`. |
| `actor_role` | If provided, must be one of: `student`, `teacher`, `admin`, `system`. |
| `status` | Must be one of: `success`, `failure`, `error`. |
| `http_status` | Integer 100–599. |
| `error_code` | Max 60 characters. Snake_case. |
| `request_params` | If provided, must be valid JSON. Max 500 characters. Must not contain passwords. |
| `duration_ms` | Integer ≥ 0. |

---

## Archiving Policy

| Condition | Action |
|---|---|
| Rows older than 90 days | Move to `System_Logs_Archive_YYYY_MM` sheet |
| Archive sheet exceeds 100,000 rows | Create new archive sheet for next month |
| Total workbook cells approach 8M | Delete or export DEBUG rows older than 30 days |

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Actor is student | `actor_id` | `Students.student_id` | `student_id` | Many-to-One (optional) |
| Actor is teacher | `actor_id` | `Teachers.teacher_id` | `teacher_id` | Many-to-One (optional) |

---

## Example Data

| log_id | log_level | action | method | actor_id | status | http_status | error_code | duration_ms | occurred_at |
|---|---|---|---|---|---|---|---|---|---|
| LOG000001 | INFO | login | POST | STD001 | success | 200 | | 312 | 2026-06-30T01:00:04Z |
| LOG000002 | INFO | getStudentDashboard | GET | STD001 | success | 200 | | 187 | 2026-06-30T01:00:09Z |
| LOG000003 | ERROR | login | POST | | failure | 401 | invalid_credentials | 95 | 2026-06-30T01:05:22Z |
| LOG000004 | ERROR | submitMission | POST | STD002 | failure | 400 | invalid_score | 44 | 2026-06-30T02:14:00Z |
| LOG000005 | FATAL | rebuildLeaderboard | POST | ADM001 | error | 500 | quota_exceeded | 30001 | 2026-06-30T00:01:07Z |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `getSystemLogs` | GET | Admin: returns recent log entries with optional filters (`log_level`, `action`, `actor_id`, date range) |
| `getErrorSummary` | GET | Admin: returns count of ERROR/FATAL events grouped by `action` and date |
| `archiveLogs` | POST | Admin/trigger: moves old rows to archive sheet |
