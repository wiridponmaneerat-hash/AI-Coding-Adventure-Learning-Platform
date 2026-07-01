# Progress Table

**Sheet Name:** `Progress`  
**Primary Key:** `progress_id`  
**Row Limit (Design):** 1 row per student per mission = (students × missions) rows  

---

## Purpose

Tracks each student's detailed progress through every mission. One row exists for each student–mission pair, created the first time a student opens or attempts a mission. The row is updated as the student advances through steps, and marked complete when the mission is submitted successfully.

This table is the authoritative source for unlock logic: a mission is available only when its prerequisite's `Progress` row has `status = completed`.

---

## Column Definitions

| # | Column Name        | Data Type  | Required | Default       | Description |
|---|--------------------|------------|:--------:|---------------|-------------|
| 1 | `progress_id`      | STRING     | ✅ Yes   | —             | Unique identifier. Format: `PRG` + 6-digit zero-padded number (e.g. `PRG000001`). |
| 2 | `student_id`       | STRING     | ✅ Yes   | —             | Foreign key → `Students.student_id`. |
| 3 | `mission_id`       | INTEGER    | ✅ Yes   | —             | Foreign key → `Missions.mission_id`. |
| 4 | `status`           | ENUM       | ✅ Yes   | `not_started` | Current state of this student–mission pair. See Status Values below. |
| 5 | `current_step`     | INTEGER    | ✅ Yes   | `0`           | Last step the student reached. Range: 0 to `Missions.total_steps`. |
| 6 | `total_steps`      | INTEGER    | ✅ Yes   | —             | Snapshot of `Missions.total_steps` at the time the progress row was created. Prevents orphan data if mission is edited. |
| 7 | `attempts`         | INTEGER    | ✅ Yes   | `0`           | Number of times the student has submitted this mission. Incremented on each submission. |
| 8 | `best_score`       | INTEGER    | ✅ Yes   | `0`           | Highest score achieved across all attempts. Range: 0–100. |
| 9 | `xp_awarded`       | INTEGER    | ✅ Yes   | `0`           | Total XP awarded for this mission. XP is awarded only once (first completion). |
| 10| `time_spent_sec`   | INTEGER    | ✅ Yes   | `0`           | Cumulative seconds spent on this mission across all sessions. |
| 11| `started_at`       | DATETIME   | ❌ No    | `""`          | UTC timestamp when the student first opened this mission. |
| 12| `completed_at`     | DATETIME   | ❌ No    | `""`          | UTC timestamp of first successful completion (score ≥ 60). Null if not yet completed. |
| 13| `last_activity_at` | DATETIME   | ❌ No    | `""`          | UTC timestamp of most recent interaction (step advance or submission). |
| 14| `is_active`        | BOOLEAN    | ✅ Yes   | `TRUE`        | Soft-delete flag. |
| 15| `created_at`       | DATETIME   | ✅ Yes   | Now (UTC)     | Row creation timestamp. |
| 16| `updated_at`       | DATETIME   | ✅ Yes   | Now (UTC)     | Updated on every state change. |

---

## Status Values

| `status` | Meaning |
|---|---|
| `not_started` | Row created but student has not opened the mission yet |
| `in_progress` | Student has opened the mission and advanced at least one step |
| `submitted` | Student has submitted but score is below 60 (not yet completed) |
| `completed` | Student achieved score ≥ 60 at least once |

> **State Transition Rules:**
> - `not_started` → `in_progress` on first step advance
> - `in_progress` → `submitted` on any submission
> - `submitted` → `completed` if score ≥ 60 on any attempt
> - `completed` is a terminal state — it never reverts

---

## Validation Rules

| Column | Rule |
|--------|------|
| `progress_id` | Must match `^PRG\d{6}$`. Unique. Auto-incremented. |
| `student_id` | Must exist in `Students.student_id`. |
| `mission_id` | Must exist in `Missions.mission_id`. |
| `(student_id, mission_id)` | **Composite unique key.** Only one progress row per student–mission pair is allowed. |
| `status` | Must be one of: `not_started`, `in_progress`, `submitted`, `completed`. |
| `current_step` | Integer ≥ 0. Must not exceed `total_steps`. |
| `attempts` | Integer ≥ 0. |
| `best_score` | Integer 0–100. |
| `xp_awarded` | Integer ≥ 0. Cannot exceed `Missions.xp_reward` for that mission. |
| `time_spent_sec` | Integer ≥ 0. |

---

## Step Advance Logic

When a student clicks "Next" on a mission step, the API:

1. Reads the current `Progress` row for `(student_id, mission_id)`.
2. If row does not exist, creates it with `status = in_progress`, `current_step = 1`.
3. If row exists and `current_step < total_steps`, increments `current_step` by 1.
4. Updates `last_activity_at` and `time_spent_sec`.
5. Appends an `Analytics` event of type `step_advance`.

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Belongs to student | `student_id` | `Students.student_id` | `student_id` | Many-to-One |
| Tracks mission | `mission_id` | `Missions.mission_id` | `mission_id` | Many-to-One |
| Has score records | `(student_id, mission_id)` | `Scores` | `(student_id, mission_id)` | One-to-Many |

---

## Example Data

| progress_id | student_id | mission_id | status | current_step | total_steps | attempts | best_score | xp_awarded |
|---|---|---|---|---|---|---|---|---|
| PRG000001 | STD001 | 1 | completed | 5 | 5 | 2 | 88 | 100 |
| PRG000002 | STD001 | 2 | completed | 6 | 6 | 1 | 95 | 150 |
| PRG000003 | STD001 | 3 | in_progress | 3 | 7 | 0 | 0 | 0 |
| PRG000004 | STD002 | 1 | completed | 5 | 5 | 1 | 72 | 100 |
| PRG000005 | STD002 | 2 | not_started | 0 | 6 | 0 | 0 | 0 |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `getProgress` | GET | Returns progress row(s) for a student, optionally filtered by `mission_id` |
| `startMission` | POST | Creates a progress row with `status = in_progress` if one does not exist |
| `advanceStep` | POST | Increments `current_step`, updates `last_activity_at` |
| `submitMission` | POST | Updates `attempts`, `best_score`, `status`, triggers XP / badge logic |
| `getClassProgress` | GET | Returns all progress rows for a teacher's class (teacher auth required) |
