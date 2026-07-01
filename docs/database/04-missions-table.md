# Missions Table

**Sheet Name:** `Missions`  
**Primary Key:** `mission_id`  
**Row Limit (Design):** 50 missions  

---

## Purpose

Stores the authoritative definition of every learning mission in the platform. Missions are the core content unit — each represents a structured coding lesson with learning objectives, difficulty, XP reward, and curriculum alignment. This table is managed by teachers and administrators, not students.

---

## Column Definitions

| # | Column Name          | Data Type  | Required | Default    | Description |
|---|----------------------|------------|:--------:|------------|-------------|
| 1 | `mission_id`         | INTEGER    | ✅ Yes   | —          | Unique sequential mission number. Starts at 1. Used in URLs and progress records. |
| 2 | `mission_code`       | STRING     | ✅ Yes   | —          | Human-readable identifier. Format: `MSN` + 3-digit number (e.g. `MSN001`). Unique. |
| 3 | `title_th`           | STRING     | ✅ Yes   | —          | Mission title in Thai. Max 150 characters. Displayed to students. |
| 4 | `title_en`           | STRING     | ❌ No    | `""`       | Mission title in English. Max 150 characters. |
| 5 | `description`        | STRING     | ✅ Yes   | —          | Student-facing description of the mission. Max 500 characters. |
| 6 | `difficulty`         | ENUM       | ✅ Yes   | `beginner` | Allowed: `beginner`, `intermediate`, `advanced`. |
| 7 | `difficulty_label_th`| STRING     | ✅ Yes   | `ง่าย`    | Thai display label for difficulty (ง่าย / ปานกลาง / ยาก). |
| 8 | `xp_reward`          | INTEGER    | ✅ Yes   | —          | XP awarded on successful completion (score ≥ 60). Must be > 0. |
| 9 | `estimated_minutes`  | INTEGER    | ✅ Yes   | —          | Expected time to complete in minutes. Must be > 0. |
| 10| `topics`             | JSON_ARRAY | ✅ Yes   | `[]`       | Ordered list of programming concepts covered. e.g. `["print()","ตัวแปร"]`. |
| 11| `total_steps`        | INTEGER    | ✅ Yes   | —          | Number of instructional steps / sub-tasks. Must be ≥ 1. |
| 12| `icon`               | STRING     | ✅ Yes   | `code`     | Material Symbols icon name. Used in UI. Max 50 characters. |
| 13| `color_hex`          | STRING     | ✅ Yes   | `#2563EB`  | Primary brand colour for this mission card. Must be valid hex `#RRGGBB`. |
| 14| `badge_on_complete`  | STRING     | ❌ No    | `""`       | `badge_id` (e.g. `BDG001`) awarded automatically on first completion. |
| 15| `prerequisite_id`    | INTEGER    | ❌ No    | `0`        | `mission_id` that must be completed first. `0` = no prerequisite. |
| 16| `curriculum_ref`     | STRING     | ❌ No    | `""`       | Thai basic education curriculum standard reference code. |
| 17| `content_url`        | STRING     | ❌ No    | `""`       | Google Drive link to teacher's content document for this mission. |
| 18| `sort_order`         | INTEGER    | ✅ Yes   | —          | Display order in the mission list. Sequential with no gaps. |
| 19| `is_published`       | BOOLEAN    | ✅ Yes   | `FALSE`    | `FALSE` = draft, hidden from students. `TRUE` = live. |
| 20| `created_by`         | STRING     | ✅ Yes   | —          | `teacher_id` or `admin_id` who created this mission record. |
| 21| `is_active`          | BOOLEAN    | ✅ Yes   | `TRUE`     | Soft-delete flag. |
| 22| `created_at`         | DATETIME   | ✅ Yes   | Now (UTC)  | Row creation timestamp. |
| 23| `updated_at`         | DATETIME   | ✅ Yes   | Now (UTC)  | Last updated timestamp. |

---

## Difficulty Mapping

| `difficulty` | `difficulty_label_th` | Typical `xp_reward` | Typical `estimated_minutes` |
|---|---|---:|---:|
| `beginner`     | ง่าย        | 100–150 | 15–25 |
| `intermediate` | ปานกลาง    | 175–250 | 25–35 |
| `advanced`     | ยาก         | 300–400 | 35–60 |

---

## XP Partial Credit Rule

When a student submits a mission with a score below 60, they receive partial XP:

```
partial_xp = FLOOR(xp_reward × (score / 100))
```

A score of exactly 0 yields 0 XP. This is computed by the Apps Script submission handler, not stored in this table.

---

## Validation Rules

| Column | Rule |
|--------|------|
| `mission_id` | Positive integer. Unique. Auto-incremented by Apps Script on insert. |
| `mission_code` | Must match `^MSN\d{3}$`. Unique. |
| `title_th` | Non-empty. Max 150 characters. |
| `difficulty` | Must be one of: `beginner`, `intermediate`, `advanced`. |
| `xp_reward` | Integer > 0. |
| `estimated_minutes` | Integer > 0. |
| `total_steps` | Integer ≥ 1. |
| `color_hex` | Must match `^#[0-9A-Fa-f]{6}$`. |
| `badge_on_complete` | If non-empty, must exist in `Badges.badge_id`. |
| `prerequisite_id` | Integer ≥ 0. If > 0, must exist as a `mission_id`. |
| `sort_order` | Positive integer. No two missions may share the same `sort_order`. |
| `created_by` | Must exist in `Teachers.teacher_id`. |

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Completes prerequisite | `prerequisite_id` | `Missions.mission_id` | `mission_id` | Self-referential |
| Awards badge | `badge_on_complete` | `Badges.badge_id` | `badge_id` | Many-to-One |
| Has many progress records | `mission_id` | `Progress.mission_id` | `mission_id` | One-to-Many |
| Has many score records | `mission_id` | `Scores.mission_id` | `mission_id` | One-to-Many |
| Has many portfolio entries | `mission_id` | `Portfolio.mission_id` | `mission_id` | One-to-Many |
| Created by teacher | `created_by` | `Teachers.teacher_id` | `teacher_id` | Many-to-One |

---

## Current Mission Catalogue (Version 1.0)

| mission_id | mission_code | title_th | difficulty | xp_reward | estimated_minutes | sort_order |
|---|---|---|---|---|---|---|
| 1 | MSN001 | สวัสดีโลก! Hello, World! | beginner | 100 | 20 | 1 |
| 2 | MSN002 | เงื่อนไขและการตัดสินใจ | beginner | 150 | 25 | 2 |
| 3 | MSN003 | วนซ้ำกับ Loop | intermediate | 200 | 30 | 3 |
| 4 | MSN004 | ฟังก์ชั่น — สร้างเครื่องมือของตัวเอง | intermediate | 250 | 35 | 4 |
| 5 | MSN005 | AI สร้างได้! — Mini Project | advanced | 350 | 45 | 5 |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `getMissions` | GET | Returns all published missions, annotated with student progress if `userId` provided |
| `getMission` | GET | Returns single mission by `mission_id` |
| `createMission` | POST | Admin/teacher creates a new mission draft |
| `updateMission` | POST (_method: PUT) | Admin/teacher updates mission content or settings |
| `publishMission` | POST (_method: PUT) | Sets `is_published = TRUE` to make mission visible to students |
