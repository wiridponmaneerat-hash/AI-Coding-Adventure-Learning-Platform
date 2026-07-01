# Scores Table

**Sheet Name:** `Scores`  
**Primary Key:** `score_id`  
**Row Limit (Design):** ~5,000 rows / year (multiple attempts per student per mission)  

---

## Purpose

Records every individual mission submission attempt with its score and related metadata. Unlike the `Progress` table (which stores the best/current state per student–mission pair), this table is an immutable append-only ledger — one row per submission attempt. It enables teachers to review attempt history, track improvement over time, and spot students who are struggling.

---

## Column Definitions

| # | Column Name         | Data Type  | Required | Default    | Description |
|---|---------------------|------------|:--------:|------------|-------------|
| 1 | `score_id`          | STRING     | ✅ Yes   | —          | Unique identifier. Format: `SCR` + 6-digit number (e.g. `SCR000001`). |
| 2 | `student_id`        | STRING     | ✅ Yes   | —          | Foreign key → `Students.student_id`. |
| 3 | `mission_id`        | INTEGER    | ✅ Yes   | —          | Foreign key → `Missions.mission_id`. |
| 4 | `attempt_number`    | INTEGER    | ✅ Yes   | —          | Sequential attempt count for this student–mission pair (1, 2, 3 …). Derived from `Progress.attempts + 1` at time of submission. |
| 5 | `score`             | INTEGER    | ✅ Yes   | —          | Raw score for this attempt. Range: 0–100. |
| 6 | `passed`            | BOOLEAN    | ✅ Yes   | —          | `TRUE` if `score ≥ 60`. Computed on insert; never updated. |
| 7 | `xp_earned`         | INTEGER    | ✅ Yes   | `0`        | XP granted for this specific attempt. `0` if student has already completed this mission. Full or partial XP on first completion. |
| 8 | `code_snapshot`     | STRING     | ❌ No    | `""`       | Student's code at time of submission. Max 5,000 characters. Used for teacher review and Portfolio. |
| 9 | `duration_sec`      | INTEGER    | ❌ No    | `0`        | Seconds spent on this attempt (from last `start_mission` or `advanceStep`). |
| 10| `error_count`       | INTEGER    | ❌ No    | `0`        | Number of syntax/runtime errors encountered during this attempt (logged by the code editor). |
| 11| `hint_used`         | BOOLEAN    | ✅ Yes   | `FALSE`    | `TRUE` if the student requested a hint at any point during this attempt. |
| 12| `ai_feedback`       | STRING     | ❌ No    | `""`       | AI-generated feedback message shown to student after submission. Max 1,000 characters. |
| 13| `teacher_comment`   | STRING     | ❌ No    | `""`       | Teacher's written comment on this submission. Max 500 characters. |
| 14| `submitted_at`      | DATETIME   | ✅ Yes   | Now (UTC)  | UTC timestamp of submission. Immutable after insert. |
| 15| `is_active`         | BOOLEAN    | ✅ Yes   | `TRUE`     | Soft-delete flag. Admins may hide a row from reports without deleting it. |
| 16| `created_at`        | DATETIME   | ✅ Yes   | Now (UTC)  | Same as `submitted_at` for score records. |
| 17| `updated_at`        | DATETIME   | ✅ Yes   | Now (UTC)  | Only changes if `teacher_comment` or `ai_feedback` is added later. |

---

## Score Grade Bands

| Score Range | Grade | Meaning |
|---|---|---|
| 90–100 | ยอดเยี่ยม | Excellent — full XP reward |
| 75–89 | ดีมาก | Very Good — full XP reward |
| 60–74 | ผ่าน | Pass — full XP reward |
| 40–59 | ต้องปรับปรุง | Needs improvement — partial XP, mission not marked complete |
| 0–39 | ไม่ผ่าน | Fail — partial XP, recommend retry |

> The pass threshold is **60**. Below this, `passed = FALSE` and the student's `Progress.status` remains `submitted`, not `completed`.

---

## Validation Rules

| Column | Rule |
|--------|------|
| `score_id` | Must match `^SCR\d{6}$`. Unique. Auto-incremented. |
| `student_id` | Must exist in `Students.student_id`. |
| `mission_id` | Must exist in `Missions.mission_id`. |
| `attempt_number` | Integer ≥ 1. Must equal current `Progress.attempts` + 1 at insert time. |
| `score` | Integer 0–100. |
| `passed` | Must equal `score >= 60`. Not user-supplied; computed by API. |
| `xp_earned` | Integer ≥ 0. Must not exceed `Missions.xp_reward` for this mission. |
| `code_snapshot` | Max 5,000 characters. |
| `duration_sec` | Integer ≥ 0. |
| `error_count` | Integer ≥ 0. |
| `ai_feedback` | Max 1,000 characters. |
| `teacher_comment` | Max 500 characters. |
| `submitted_at` | Valid ISO 8601 datetime. Cannot be in the future. |

---

## Immutability Rules

This table is **append-only** for the core columns. After insert:

- `score`, `passed`, `xp_earned`, `submitted_at`, `attempt_number` are **read-only**.
- Only `teacher_comment`, `ai_feedback`, and `is_active` may be updated.

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Belongs to student | `student_id` | `Students.student_id` | `student_id` | Many-to-One |
| Belongs to mission | `mission_id` | `Missions.mission_id` | `mission_id` | Many-to-One |
| Updates progress | `(student_id, mission_id)` | `Progress` | `(student_id, mission_id)` | Triggers update |
| May generate badge | `passed = TRUE` | `Badges` | (badge award event) | Triggers award |
| May generate analytics | `score_id` | `Analytics.ref_id` | `ref_id` | One-to-One |

---

## Example Data

| score_id | student_id | mission_id | attempt_number | score | passed | xp_earned | hint_used | submitted_at |
|---|---|---|---|---|---|---|---|---|
| SCR000001 | STD001 | 1 | 1 | 72 | TRUE | 100 | FALSE | 2026-02-01T09:14:22Z |
| SCR000002 | STD001 | 2 | 1 | 95 | TRUE | 150 | FALSE | 2026-02-08T10:30:00Z |
| SCR000003 | STD002 | 1 | 1 | 45 | FALSE | 45 | TRUE | 2026-02-03T11:00:00Z |
| SCR000004 | STD002 | 1 | 2 | 72 | TRUE | 0 | FALSE | 2026-02-04T08:45:00Z |

> Row `SCR000004` has `xp_earned = 0` because `STD002` already passed mission 1 on attempt 2 — XP was already awarded on the first pass (none awarded here because `passed = TRUE` only on attempt 2 but mission was marked complete and XP handled via Progress).

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `submitMission` | POST | Creates a score row; triggers Progress update, XP, badge, analytics |
| `getScoreHistory` | GET | Returns all score rows for a `student_id`, optionally filtered by `mission_id` |
| `addTeacherComment` | POST (_method: PUT) | Teacher adds `teacher_comment` to a score row |
| `getClassScores` | GET | Returns all scores for teacher's classes, optionally filtered by mission |
