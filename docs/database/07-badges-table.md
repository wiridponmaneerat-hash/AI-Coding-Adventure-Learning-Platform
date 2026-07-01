# Badges Table

**Sheet Name:** `Badges`  
**Primary Keys:** `badge_id` (definitions) · `award_id` (award records)  
**Design Note:** This sheet uses **two logical sections**: Badge Definitions (rows 1–50) and Badge Award Records (rows 51+). In practice these may be split into `Badges` and `Badge_Awards` sheets for clarity.

---

## Purpose

Manages the badge/achievement system in two parts:

1. **Badge Definitions** — the master catalogue of all available badges, their criteria, and display properties.
2. **Badge Award Records** — a log of every badge awarded to every student, including when and why it was granted.

Badges motivate students through visible recognition of milestones and are displayed prominently on the student dashboard.

---

## Part A: Badge Definitions

**Sheet Tab:** `Badges`

### Column Definitions

| # | Column Name       | Data Type  | Required | Default  | Description |
|---|-------------------|------------|:--------:|----------|-------------|
| 1 | `badge_id`        | STRING     | ✅ Yes   | —        | Unique identifier. Format: `BDG` + 3-digit number (e.g. `BDG001`). Used in `Students.badges_earned` and `Missions.badge_on_complete`. |
| 2 | `badge_code`      | STRING     | ✅ Yes   | —        | Short programmatic key used in application code. e.g. `first_login`, `mission1_complete`. Snake_case. Max 50 characters. |
| 3 | `name_th`         | STRING     | ✅ Yes   | —        | Badge name in Thai. Displayed to students. Max 60 characters. |
| 4 | `name_en`         | STRING     | ❌ No    | `""`     | Badge name in English. Max 60 characters. |
| 5 | `description_th`  | STRING     | ✅ Yes   | —        | Thai description of how to earn this badge. Shown in badge detail tooltip. Max 200 characters. |
| 6 | `icon`            | STRING     | ✅ Yes   | `military_tech` | Material Symbols icon name. Max 50 characters. |
| 7 | `color_hex`       | STRING     | ✅ Yes   | `#2563EB` | Badge primary colour. Must be valid hex `#RRGGBB`. |
| 8 | `category`        | ENUM       | ✅ Yes   | `achievement` | Allowed: `achievement`, `mission`, `streak`, `skill`, `special`. |
| 9 | `trigger`         | ENUM       | ✅ Yes   | `manual` | What grants this badge. See Trigger Values below. |
| 10| `trigger_value`   | STRING     | ❌ No    | `""`     | Trigger-specific parameter. e.g. mission ID for `mission_complete`, streak count for `streak`. |
| 11| `xp_bonus`        | INTEGER    | ✅ Yes   | `0`      | Bonus XP awarded alongside the badge. Must be ≥ 0. |
| 12| `is_secret`       | BOOLEAN    | ✅ Yes   | `FALSE`  | `TRUE` = badge is hidden from students until earned (surprise achievement). |
| 13| `sort_order`      | INTEGER    | ✅ Yes   | —        | Display order in badge gallery. |
| 14| `is_active`       | BOOLEAN    | ✅ Yes   | `TRUE`   | Soft-delete flag. Inactive badges are not evaluated. |
| 15| `created_at`      | DATETIME   | ✅ Yes   | Now (UTC)| Row creation timestamp. |
| 16| `updated_at`      | DATETIME   | ✅ Yes   | Now (UTC)| Last modified timestamp. |

### Trigger Values

| `trigger` | Meaning | `trigger_value` example |
|---|---|---|
| `login_first` | Awarded on first-ever login | — |
| `mission_complete` | Awarded when a specific mission is first completed | `"1"` (mission_id) |
| `all_missions` | Awarded when all missions are completed | — |
| `streak` | Awarded at a login streak milestone | `"7"` (days) |
| `score_perfect` | Awarded for scoring 100 on any mission | — |
| `top_class` | Awarded by teacher for class ranking | — |
| `manual` | Awarded manually by teacher or admin | — |

---

## Badge Catalogue (Version 1.0)

| badge_id | badge_code | name_th | category | trigger | xp_bonus | is_secret |
|---|---|---|---|---|---|---|
| BDG001 | first_login | นักผจญภัยใหม่ | achievement | login_first | 50 | FALSE |
| BDG002 | mission1_complete | Hello World | mission | mission_complete | 0 | FALSE |
| BDG003 | mission2_complete | นักตัดสินใจ | mission | mission_complete | 0 | FALSE |
| BDG004 | mission3_complete | ราชา Loop | mission | mission_complete | 0 | FALSE |
| BDG005 | mission4_complete | นักสร้างฟังก์ชั่น | mission | mission_complete | 0 | FALSE |
| BDG006 | mission5_complete | สร้าง AI แล้ว! | mission | mission_complete | 100 | FALSE |
| BDG007 | top_student | นักเรียนดีเด่น | special | manual | 200 | FALSE |
| BDG008 | streak_7 | สตรีค 7 วัน | streak | streak | 75 | FALSE |
| BDG009 | perfect_score | 100 คะแนน! | skill | score_perfect | 100 | TRUE |
| BDG010 | all_complete | AI Master | achievement | all_missions | 500 | FALSE |

---

## Part B: Badge Award Records

**Sheet Tab:** `Badge_Awards` (or rows 51+ in `Badges` sheet)

### Column Definitions

| # | Column Name    | Data Type  | Required | Default   | Description |
|---|----------------|------------|:--------:|-----------|-------------|
| 1 | `award_id`     | STRING     | ✅ Yes   | —         | Unique identifier. Format: `AWD` + 6-digit number. |
| 2 | `badge_id`     | STRING     | ✅ Yes   | —         | Foreign key → `Badges.badge_id`. |
| 3 | `student_id`   | STRING     | ✅ Yes   | —         | Foreign key → `Students.student_id`. |
| 4 | `awarded_by`   | STRING     | ✅ Yes   | `system`  | `system` for automatic awards; `teacher_id` / `admin_id` for manual awards. |
| 5 | `reason`       | STRING     | ❌ No    | `""`      | Human-readable reason note (for manual awards). Max 200 characters. |
| 6 | `xp_granted`   | INTEGER    | ✅ Yes   | `0`       | XP actually credited. Mirrors `Badges.xp_bonus` at time of award. |
| 7 | `awarded_at`   | DATETIME   | ✅ Yes   | Now (UTC) | UTC timestamp when the badge was awarded. Immutable. |
| 8 | `is_active`    | BOOLEAN    | ✅ Yes   | `TRUE`    | Soft-delete flag. |
| 9 | `created_at`   | DATETIME   | ✅ Yes   | Now (UTC) | Same as `awarded_at` for badge records. |

### Validation Rules (Award Records)

| Column | Rule |
|--------|------|
| `award_id` | Must match `^AWD\d{6}$`. Unique. |
| `badge_id` | Must exist in `Badges.badge_id`. |
| `student_id` | Must exist in `Students.student_id`. |
| `(student_id, badge_id)` | **Composite unique key.** A student cannot be awarded the same badge twice. |
| `awarded_by` | Must be `system`, or exist in `Teachers.teacher_id`. |
| `xp_granted` | Integer ≥ 0. |

---

## Relationships (Definitions)

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Linked to mission | `trigger_value` | `Missions.mission_id` | `mission_id` | Many-to-One (conditional) |
| Awarded to students | `badge_id` | `Badge_Awards.badge_id` | `badge_id` | One-to-Many |

## Relationships (Award Records)

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Belongs to student | `student_id` | `Students.student_id` | `student_id` | Many-to-One |
| Describes badge | `badge_id` | `Badges.badge_id` | `badge_id` | Many-to-One |
| Granted by | `awarded_by` | `Teachers.teacher_id` | `teacher_id` | Many-to-One (optional) |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `getBadges` | GET | Returns all badge definitions |
| `getStudentBadges` | GET | Returns earned badges for a student with `awarded_at` timestamps |
| `awardBadge` | POST | System or teacher manually awards a badge; updates `Students.badges_earned` |
| `checkBadgeTriggers` | POST | Called after submission; evaluates all trigger rules for the student |
