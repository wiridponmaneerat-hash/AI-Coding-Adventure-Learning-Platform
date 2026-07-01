# Leaderboard Table

**Sheet Name:** `Leaderboard`  
**Primary Key:** `rank_id`  
**Row Limit (Design):** Students × Snapshot Periods = ~120 × 52 weeks = ~6,240 rows/year  

---

## Purpose

Stores **pre-computed ranking snapshots** for the class leaderboard displayed on the student home dashboard. Rather than computing rankings on every page load (which would be too slow for Google Sheets), a scheduled Apps Script trigger rebuilds the leaderboard on a defined schedule (daily or weekly) and writes the results here.

Each row represents one student's rank at a specific snapshot time within a specific scope (class, year, or global).

---

## Column Definitions

| # | Column Name         | Data Type  | Required | Default     | Description |
|---|---------------------|------------|:--------:|-------------|-------------|
| 1 | `rank_id`           | STRING     | ✅ Yes   | —           | Unique identifier. Format: `RNK` + 6-digit number (e.g. `RNK000001`). |
| 2 | `snapshot_date`     | DATE       | ✅ Yes   | —           | Date this snapshot was computed. Format: `YYYY-MM-DD`. The latest row per scope is the "current" leaderboard. |
| 3 | `scope`             | ENUM       | ✅ Yes   | `class`     | Ranking scope. Allowed: `class`, `year_level`, `school`. |
| 4 | `scope_id`          | STRING     | ✅ Yes   | —           | Identifier for the scope group. e.g. `ป.5/1` for `class`, `ป.5` for `year_level`, `school` for school-wide. |
| 5 | `student_id`        | STRING     | ✅ Yes   | —           | Foreign key → `Students.student_id`. |
| 6 | `student_name`      | STRING     | ✅ Yes   | —           | Snapshot of `Students.name_th` at time of computation. Denormalised for read performance. |
| 7 | `avatar_initial`    | STRING     | ✅ Yes   | —           | Snapshot of `Students.avatar_initial`. |
| 8 | `rank_position`     | INTEGER    | ✅ Yes   | —           | 1-based rank in this scope on this date. Lower = better. |
| 9 | `rank_previous`     | INTEGER    | ❌ No    | `0`         | Rank position from the previous snapshot. `0` if this is the student's first appearance. Used to compute rank change direction. |
| 10| `rank_change`       | INTEGER    | ✅ Yes   | `0`         | `rank_previous - rank_position`. Positive = moved up, negative = moved down, 0 = unchanged. |
| 11| `xp_total`          | INTEGER    | ✅ Yes   | `0`         | Snapshot of `Students.xp_total` at computation time. |
| 12| `missions_completed`| INTEGER    | ✅ Yes   | `0`         | Count of completed missions at snapshot time. |
| 13| `avg_score`         | DECIMAL    | ✅ Yes   | `0.00`      | Average score across all submitted missions (passing and non-passing). Rounded to 2 decimal places. |
| 14| `badges_count`      | INTEGER    | ✅ Yes   | `0`         | Number of earned badges at snapshot time. |
| 15| `streak_days`       | INTEGER    | ✅ Yes   | `0`         | Login streak days at snapshot time. |
| 16| `level`             | INTEGER    | ✅ Yes   | `1`         | Snapshot of `Students.level`. |
| 17| `level_name`        | STRING     | ✅ Yes   | `มือใหม่`   | Snapshot of `Students.level_name`. |
| 18| `is_active`         | BOOLEAN    | ✅ Yes   | `TRUE`      | Soft-delete flag. |
| 19| `created_at`        | DATETIME   | ✅ Yes   | Now (UTC)   | Timestamp of snapshot computation. |

---

## Ranking Algorithm

Rankings are computed by an Apps Script time trigger. The sort priority is:

```
1. xp_total            DESC  (primary — highest XP first)
2. missions_completed  DESC  (tiebreaker — more missions completed)
3. avg_score           DESC  (tiebreaker — higher average score)
4. streak_days         DESC  (tiebreaker — longest streak)
5. name_th             ASC   (final tiebreaker — alphabetical)
```

---

## Scope Definitions

| `scope` | `scope_id` example | Who sees it |
|---|---|---|
| `class` | `ป.5/1` | Students and teachers of that class |
| `year_level` | `ป.5` | All classes in year 5 |
| `school` | `school` | Admin only (or opt-in school-wide display) |

---

## Refresh Schedule

| Trigger | Frequency | Time |
|---|---|---|
| Apps Script Time Trigger | Daily | 00:01 AM school timezone (ICT = UTC+7) |
| Manual re-compute | On demand | Admin action via Apps Script function |

The trigger function:
1. Reads all active students.
2. Aggregates their `xp_total`, `missions_completed`, `avg_score`, `badges_count`, `streak_days` from `Students` and `Scores`.
3. Sorts by ranking algorithm.
4. Writes a new row per student with today's `snapshot_date`.
5. Does **not** delete old snapshots — historical data is retained for trend analysis.

---

## Rank Change Display Logic

The UI reads the two most recent snapshots for each student and computes:

| `rank_change` | Display |
|---|---|
| > 0 | ↑ Green arrow (moved up) |
| < 0 | ↓ Red arrow (moved down) |
| = 0 | — Grey dash (unchanged) |
| First appearance | ★ New entry |

---

## Validation Rules

| Column | Rule |
|--------|------|
| `rank_id` | Must match `^RNK\d{6}$`. Unique. Auto-incremented. |
| `snapshot_date` | Valid ISO date. Must not be in the future. |
| `scope` | Must be one of: `class`, `year_level`, `school`. |
| `scope_id` | Non-empty. |
| `student_id` | Must exist in `Students.student_id`. |
| `rank_position` | Integer ≥ 1. |
| `xp_total` | Integer ≥ 0. |
| `missions_completed` | Integer 0–total published missions. |
| `avg_score` | Decimal 0.00–100.00. |
| `badges_count` | Integer ≥ 0. |
| `level` | Integer 1–5. |
| `(student_id, scope, scope_id, snapshot_date)` | Composite unique key — one row per student per scope per day. |

---

## Relationships

| Relationship | This Column | References Table | References Column | Type |
|---|---|---|---|---|
| Snapshots student | `student_id` | `Students.student_id` | `student_id` | Many-to-One |

---

## Example Data

| rank_id | snapshot_date | scope | scope_id | student_id | student_name | rank_position | rank_previous | rank_change | xp_total | missions_completed | avg_score |
|---|---|---|---|---|---|---|---|---|---|---|---|
| RNK000001 | 2026-06-30 | class | ป.5/1 | STD003 | มาริสา นาคทอง | 1 | 1 | 0 | 1200 | 3 | 91.33 |
| RNK000002 | 2026-06-30 | class | ป.5/1 | STD001 | นภัสสร สุขใจ | 2 | 3 | +1 | 850 | 2 | 83.50 |
| RNK000003 | 2026-06-30 | class | ป.5/1 | STD002 | ปภัสรา คงดี | 3 | 2 | -1 | 650 | 1 | 72.00 |

---

## API Actions

| Action Name | Method | Description |
|---|---|---|
| `getLeaderboard` | GET | Returns the latest snapshot for a given `scope` and `scope_id` |
| `getLeaderboardHistory` | GET | Returns rank history for one student across multiple snapshots |
| `rebuildLeaderboard` | POST | Admin/trigger manually rebuilds the leaderboard for all scopes |
