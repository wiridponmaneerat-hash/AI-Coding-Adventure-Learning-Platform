# Teachers Table

**Sheet Name:** `Teachers`  
**Primary Key:** `teacher_id`  
**Row Limit (Design):** 50 teachers  

---

## Purpose

Stores teacher and administrator accounts. Teachers own one or more class groups and can view all students within those classes. Administrators have `role = admin` and are stored in the same table with elevated permissions. This table is also used for authentication routing.

---

## Column Definitions

| # | Column Name        | Data Type  | Required | Default      | Description |
|---|--------------------|------------|:--------:|--------------|-------------|
| 1 | `teacher_id`       | STRING     | ✅ Yes   | —            | Unique identifier. Format: `TCH` + 3-digit zero-padded number (e.g. `TCH001`). Admins use `ADM` prefix. |
| 2 | `name_th`          | STRING     | ✅ Yes   | —            | Full name in Thai. Max 100 characters. |
| 3 | `name_en`          | STRING     | ❌ No    | `""`         | Full name in English. Max 100 characters. |
| 4 | `password_hash`    | STRING     | ✅ Yes   | —            | Hashed password. **Never store plain text.** |
| 5 | `avatar_initial`   | STRING     | ✅ Yes   | First char of `name_th` | Single character for avatar display. |
| 6 | `email`            | STRING     | ❌ No    | `""`         | School Google account email. Used for Google Drive integration. Max 100 chars. |
| 7 | `role`             | ENUM       | ✅ Yes   | `teacher`    | Allowed values: `teacher`, `admin`. |
| 8 | `subject`          | STRING     | ❌ No    | `วิทยาการคำนวณ` | Subject(s) taught. Max 200 characters. |
| 9 | `classes_taught`   | JSON_ARRAY | ✅ Yes   | `[]`         | JSON array of class IDs this teacher is responsible for. e.g. `["ป.5/1","ป.5/2"]`. |
| 10| `permissions`      | JSON_ARRAY | ✅ Yes   | `[]`         | Admin-only: list of permission tokens. e.g. `["all"]` or `["manage_students","view_analytics"]`. Empty for regular teachers. |
| 11| `theme`            | ENUM       | ✅ Yes   | `default`    | UI theme preference. Allowed: `default`, `dark`. |
| 12| `last_login_at`    | DATETIME   | ❌ No    | `""`         | UTC ISO 8601 timestamp of most recent login. |
| 13| `join_date`        | DATE       | ✅ Yes   | Today        | Hire / activation date. Format: `YYYY-MM-DD`. |
| 14| `is_active`        | BOOLEAN    | ✅ Yes   | `TRUE`       | `FALSE` = account disabled. Excluded from login queries. |
| 15| `notes`            | STRING     | ❌ No    | `""`         | Internal admin notes. Max 500 characters. |
| 16| `created_at`       | DATETIME   | ✅ Yes   | Now (UTC)    | Row creation timestamp. |
| 17| `updated_at`       | DATETIME   | ✅ Yes   | Now (UTC)    | Updated on every write. |

---

## Validation Rules

| Column | Rule |
|--------|------|
| `teacher_id` | Must match regex `^(TCH|ADM)\d{3}$`. Must be unique across all rows. |
| `name_th` | Non-empty. Max 100 characters. |
| `password_hash` | Non-empty. |
| `email` | If provided, must match standard email format. |
| `role` | Must be exactly `teacher` or `admin`. |
| `classes_taught` | Valid JSON array. Each element must match `ป\.\d\/\d+` pattern. |
| `permissions` | Valid JSON array. Only non-empty for `admin` role. |
| `theme` | Must be one of: `default`, `dark`. |
| `join_date` | Valid ISO date. Cannot be in the future. |

---

## Role Permissions Matrix

| Permission Token | Description |
|---|---|
| `all` | Full access to all data and admin functions |
| `manage_students` | Create, edit, deactivate student accounts |
| `manage_missions` | Create and edit mission content |
| `view_analytics` | Access Analytics and Leaderboard data |
| `manage_badges` | Create and assign badge definitions |
| `export_data` | Export any sheet as CSV |

> Regular `teacher` accounts do not use the `permissions` field. Their access is scoped to `classes_taught` automatically by the API.

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Teaches students in classes | `classes_taught` | `Students.class_id` | `class_id` | One-to-Many |
| Manages mission content | `teacher_id` | `Missions.created_by` | `created_by` | One-to-Many |
| Views student analytics | `teacher_id` | `Analytics.viewed_by` | (permission-based) | Many-to-Many |

---

## Example Data

| teacher_id | name_th | role | subject | classes_taught | join_date | is_active |
|---|---|---|---|---|---|---|
| TCH001 | ครูวิริยา สมใจ | teacher | วิทยาการคำนวณ | `["ป.5/1","ป.5/2"]` | 2026-01-10 | TRUE |
| TCH002 | ครูสมศักดิ์ ใจดี | teacher | วิทยาการคำนวณ | `["ป.5/3"]` | 2026-01-10 | TRUE |
| ADM001 | ผู้ดูแลระบบ | admin | — | `[]` | 2026-01-01 | TRUE |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `login` | POST | Authenticate student, teacher, or admin; returns session payload |
| `getTeacherProfile` | GET | Returns teacher profile by `teacher_id` |
| `updateTeacherProfile` | POST (_method: PUT) | Updates `name_th`, `email`, `theme` |
| `getClassRoster` | GET | Returns all students in a teacher's `classes_taught` |
| `getClassAnalytics` | GET | Returns aggregated analytics for teacher's classes |
