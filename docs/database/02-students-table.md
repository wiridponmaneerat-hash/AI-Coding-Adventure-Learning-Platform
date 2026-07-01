# Students Table

**Sheet Name:** `Students`  
**Primary Key:** `student_id`  
**Row Limit (Design):** 500 students  

---

## Purpose

Stores all student accounts including credentials, profile information, learning progress aggregates, and preferences. This is the central identity record for every student in the platform. All other student-related tables reference this sheet via `student_id`.

---

## Column Definitions

| # | Column Name          | Data Type    | Required | Default        | Description |
|---|----------------------|--------------|:--------:|----------------|-------------|
| 1 | `student_id`         | STRING       | ✅ Yes   | —              | Unique student identifier. Format: `STD` + 3-digit zero-padded number (e.g. `STD001`). Assigned by admin at enrollment. |
| 2 | `name_th`            | STRING       | ✅ Yes   | —              | Full name in Thai script (ชื่อ-นามสกุล). Max 100 characters. |
| 3 | `name_en`            | STRING       | ❌ No    | `""`           | Full name in English (optional). Max 100 characters. |
| 4 | `password_hash`      | STRING       | ✅ Yes   | —              | Hashed password. Use SHA-256 or bcrypt. **Never store plain text.** |
| 5 | `avatar_initial`     | STRING       | ✅ Yes   | First char of `name_th` | Single Thai character used as avatar fallback. |
| 6 | `class_id`           | STRING       | ✅ Yes   | —              | Class assignment. Format: `ป.X/Y` (e.g. `ป.5/1`). References class grouping managed by teacher. |
| 7 | `role`               | ENUM         | ✅ Yes   | `student`      | Always `student` for this table. Validated on insert. |
| 8 | `xp_total`           | INTEGER      | ✅ Yes   | `0`            | Total accumulated experience points. Updated after each mission submission. Must be ≥ 0. |
| 9 | `level`              | INTEGER      | ✅ Yes   | `1`            | Computed level derived from `xp_total`. Range: 1–5. See Level Table below. |
| 10| `level_name`         | STRING       | ✅ Yes   | `มือใหม่`      | Display name for current level. See Level Table below. |
| 11| `badges_earned`      | JSON_ARRAY   | ✅ Yes   | `[]`           | JSON array of badge IDs the student has earned. e.g. `["BDG001","BDG002"]`. |
| 12| `missions_completed` | JSON_ARRAY   | ✅ Yes   | `[]`           | JSON array of mission IDs completed. e.g. `[1,2,3]`. |
| 13| `streak_days`        | INTEGER      | ✅ Yes   | `0`            | Number of consecutive days the student has logged in and completed activity. Reset on miss. |
| 14| `last_login_at`      | DATETIME     | ❌ No    | `""`           | UTC ISO 8601 timestamp of most recent login. |
| 15| `theme`              | ENUM         | ✅ Yes   | `default`      | UI theme preference. Allowed: `default`, `dark`, `ocean`. |
| 16| `join_date`          | DATE         | ✅ Yes   | Today          | Enrollment date. Format: `YYYY-MM-DD`. |
| 17| `is_active`          | BOOLEAN      | ✅ Yes   | `TRUE`         | `FALSE` = soft-deleted / suspended account. Excluded from all queries. |
| 18| `notes`              | STRING       | ❌ No    | `""`           | Admin or teacher notes. Not visible to student. Max 500 characters. |
| 19| `created_at`         | DATETIME     | ✅ Yes   | Now (UTC)      | Row creation timestamp. Set once, never updated. |
| 20| `updated_at`         | DATETIME     | ✅ Yes   | Now (UTC)      | Updated on every write. |

---

## Level Table (XP Thresholds)

| Level | Name          | Min XP | Max XP |
|-------|---------------|-------:|-------:|
| 1     | มือใหม่        | 0      | 299    |
| 2     | ผู้เรียนรู้    | 300    | 599    |
| 3     | นักสำรวจ      | 600    | 999    |
| 4     | นักพัฒนา      | 1,000  | 1,499  |
| 5     | AI Master     | 1,500  | ∞      |

> `level` and `level_name` are **derived columns** — they must be recomputed by the Apps Script layer every time `xp_total` changes.

---

## Validation Rules

| Column | Rule |
|--------|------|
| `student_id` | Must match regex `^STD\d{3}$`. Must be unique across all rows. |
| `name_th` | Non-empty. Must contain at least one Thai character. Max 100 chars. |
| `password_hash` | Non-empty. Min 8 characters after hashing. |
| `class_id` | Must match pattern `ป\.\d\/\d+` (e.g. `ป.5/1`). |
| `role` | Must be exactly `student`. |
| `xp_total` | Integer ≥ 0. |
| `level` | Integer between 1 and 5 inclusive. |
| `streak_days` | Integer ≥ 0. |
| `theme` | Must be one of: `default`, `dark`, `ocean`. |
| `join_date` | Valid ISO date. Cannot be in the future. |
| `badges_earned` | Valid JSON array. Each element must exist in `Badges.badge_id`. |
| `missions_completed` | Valid JSON array of integers. Each must exist in `Missions.mission_id`. |

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Belongs to class (teacher) | `class_id` | `Teachers.classes_taught` | (denormalised) | Many-to-One |
| Has many progress records | `student_id` | `Progress.student_id` | `student_id` | One-to-Many |
| Has many score records | `student_id` | `Scores.student_id` | `student_id` | One-to-Many |
| Has many portfolio entries | `student_id` | `Portfolio.student_id` | `student_id` | One-to-Many |
| Generates analytics events | `student_id` | `Analytics.student_id` | `student_id` | One-to-Many |
| Appears in leaderboard | `student_id` | `Leaderboard.student_id` | `student_id` | One-to-One (snapshot) |
| Receives AI recommendations | `student_id` | `AI_Recs.student_id` | `student_id` | One-to-Many |

---

## Example Data

| student_id | name_th | class_id | role | xp_total | level | level_name | streak_days | theme | join_date | is_active |
|---|---|---|---|---|---|---|---|---|---|---|
| STD001 | นภัสสร สุขใจ | ป.5/1 | student | 850 | 4 | นักพัฒนา | 5 | default | 2026-01-15 | TRUE |
| STD002 | ปภัสรา คงดี | ป.5/1 | student | 650 | 3 | นักสำรวจ | 2 | default | 2026-01-15 | TRUE |
| STD003 | มาริสา นาคทอง | ป.5/1 | student | 1200 | 4 | นักพัฒนา | 12 | default | 2026-01-15 | TRUE |
| STD004 | ธัญชนก วงศ์ดี | ป.5/2 | student | 0 | 1 | มือใหม่ | 0 | default | 2026-01-15 | TRUE |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `getStudentProfile` | GET | Returns full profile for one student by `student_id` |
| `updateStudentProfile` | POST (_method: PUT) | Updates `name_th`, `theme`, `avatar_initial` |
| `getStudentDashboard` | GET | Returns aggregated dashboard data (profile + stats) |
| `updateStudentXP` | POST (_method: PUT) | Recalculates and updates `xp_total`, `level`, `level_name` |
| `updateStreak` | POST (_method: PUT) | Updates `streak_days` and `last_login_at` on login |
