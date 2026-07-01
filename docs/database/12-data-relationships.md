# Data Relationships & Entity Overview

**Version:** 1.0.0  
**Last Updated:** 2026-06-30  

---

## 1. Entity Relationship Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI Coding Adventure                         │
│                          Data Relationships                         │
└─────────────────────────────────────────────────────────────────────┘

TEACHERS ──────────────────────────────────── (manages classes)
  │ teacher_id                                        │
  │                                                   ▼
  │                                           STUDENTS ─────────── LEADERBOARD
  │ created_by                                  │ student_id            ▲
  ▼                                             │                       │ snapshot
MISSIONS ◄────────────────────────────────────►│ (many-to-many)        │
  │ mission_id              mission_id          │                       │
  │                                             ├──────► PROGRESS       │
  │ badge_on_complete                           │         │             │
  ▼                                             │         │             │
BADGES ◄─────────────────────────────────── award│         │ triggers    │
  │ badge_id                                   │         │             │
  │                                             │         ▼             │
  └─────────────────────────────────────────► SCORES ───────────────────
                                               │ score_id
                                               │
                                        ┌──────┤
                                        │      │
                                        ▼      ▼
                                   ANALYTICS  PORTFOLIO
                                        │
                                        ▼
                                     AI_RECS
                                        │
                                        ▼
                                  SYSTEM_LOGS
```

---

## 2. All Foreign Key Relationships

| Child Table | Child Column | Parent Table | Parent Column | On Delete | Cardinality |
|---|---|---|---|---|---|
| `Students` | `class_id` | `Teachers.classes_taught` | (array member) | Restrict | N:1 |
| `Missions` | `created_by` | `Teachers` | `teacher_id` | Restrict | N:1 |
| `Missions` | `badge_on_complete` | `Badges` | `badge_id` | Set NULL | N:1 |
| `Missions` | `prerequisite_id` | `Missions` | `mission_id` | Restrict | Self N:1 |
| `Progress` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `Progress` | `mission_id` | `Missions` | `mission_id` | Restrict | N:1 |
| `Scores` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `Scores` | `mission_id` | `Missions` | `mission_id` | Restrict | N:1 |
| `Badge_Awards` | `badge_id` | `Badges` | `badge_id` | Restrict | N:1 |
| `Badge_Awards` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `Badge_Awards` | `awarded_by` | `Teachers` | `teacher_id` | Set NULL | N:1 optional |
| `Portfolio` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `Portfolio` | `mission_id` | `Missions` | `mission_id` | Restrict | N:1 |
| `Portfolio` | `score_ref_id` | `Scores` | `score_id` | Set NULL | N:1 optional |
| `Analytics` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `Analytics` | `mission_id` | `Missions` | `mission_id` | Set NULL | N:1 optional |
| `Leaderboard` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `AI_Recs` | `student_id` | `Students` | `student_id` | Cascade | N:1 |
| `AI_Recs` | `mission_id` | `Missions` | `mission_id` | Set NULL | N:1 optional |
| `System_Logs` | `actor_id` | `Students` | `student_id` | Set NULL | N:1 optional |
| `System_Logs` | `actor_id` | `Teachers` | `teacher_id` | Set NULL | N:1 optional |

> **Note:** Google Sheets does not enforce foreign key constraints automatically. The Apps Script validation layer enforces all referential integrity before writing any row.

---

## 3. Core Data Flows

### 3.1 Student Login Flow

```
Browser
  │
  ├─ POST action=login { userId, password, role }
  │
  └─► Apps Script
        ├─ Look up Students/Teachers sheet by userId
        ├─ Validate password hash
        ├─ Build session payload { userId, name, xp, level, … }
        ├─ Write System_Logs row (INFO / ERROR)
        └─► Return session JSON to browser
```

---

### 3.2 Mission Submission Flow

```
Student submits mission code
  │
  ├─ POST action=submitMission { userId, missionId, score, codeSnapshot, durationSec }
  │
  └─► Apps Script
        ├─ 1. Validate input (score 0-100, userId exists, missionId exists)
        ├─ 2. Compute xpEarned (full if score≥60 and first-time, else partial)
        ├─ 3. INSERT into Scores (new row)
        ├─ 4. UPSERT Progress row:
        │       status ← completed (if score≥60, else submitted)
        │       best_score ← MAX(best_score, score)
        │       attempts ← attempts + 1
        │       xp_awarded ← xpEarned (only on first completion)
        ├─ 5. If first completion:
        │       UPDATE Students.xp_total += xpEarned
        │       Recompute Students.level + level_name
        │       If Missions.badge_on_complete → run badge award logic
        ├─ 6. Badge award logic:
        │       Check if badge already earned (Students.badges_earned)
        │       If not: INSERT Badge_Awards row
        │               UPDATE Students.badges_earned array
        │               UPDATE Students.xp_total += badge.xp_bonus
        ├─ 7. INSERT Analytics events:
        │       event_type=mission_submit (score, xpEarned, duration)
        │       event_type=mission_complete (if first completion)
        │       event_type=badge_earned (if badge awarded)
        ├─ 8. Write System_Logs row (INFO)
        └─► Return { success, xpEarned, totalXp, level, newBadges, completedMissions }
```

---

### 3.3 Portfolio Upload Flow

```
Student uploads work
  │
  ├─ POST action=uploadPortfolio { userId, missionId, title, fileData(Base64), … }
  │
  └─► Apps Script
        ├─ 1. Validate metadata (userId, missionId, title required)
        ├─ 2. Validate file (type in allowed list, size ≤ 10 MB)
        ├─ 3. Decode Base64 → binary blob
        ├─ 4. DriveApp.getFolderById(FOLDER_ID).createFile(blob, fileName, mimeType)
        ├─ 5. Set Drive sharing: "Anyone with link can view"
        ├─ 6. INSERT Portfolio row with driveFileId, driveUrl
        ├─ 7. INSERT Analytics event (event_type=portfolio_upload)
        ├─ 8. Write System_Logs row (INFO)
        └─► Return { portfolioId, driveUrl, title }
```

---

### 3.4 Leaderboard Rebuild Flow (Scheduled Trigger)

```
Apps Script Daily Trigger (00:01 ICT)
  │
  └─► rebuildLeaderboard()
        ├─ 1. Read all active Students rows
        ├─ 2. For each student:
        │       Read SUM(Scores.xp_earned) → verify matches Students.xp_total
        │       Read COUNT(Progress rows WHERE status=completed) → missions_completed
        │       Read AVG(Scores.score) → avg_score
        │       Read COUNT(Badge_Awards rows) → badges_count
        ├─ 3. Sort by ranking algorithm (xp DESC, missions DESC, avg_score DESC)
        ├─ 4. INSERT one Leaderboard row per student per scope (class, year, school)
        │       with today's snapshot_date
        ├─ 5. Compute rank_change vs previous snapshot
        └─► Done — front-end reads latest snapshot rows on next load
```

---

## 4. AI Recommendation Table (AI_Recs)

The AI Recommendations table stores the history of all recommendations generated for students. It is referenced here because it sits at the intersection of multiple tables.

**Sheet Name:** `AI_Recs`  
**Primary Key:** `rec_id`

| # | Column Name      | Data Type  | Required | Default   | Description |
|---|------------------|------------|:--------:|-----------|-------------|
| 1 | `rec_id`         | STRING     | ✅       | —         | Format: `REC` + 6-digit number. |
| 2 | `student_id`     | STRING     | ✅       | —         | FK → `Students.student_id`. |
| 3 | `rec_type`       | ENUM       | ✅       | —         | `next_mission`, `review_mission`, `practice_topic`, `encouragement`. |
| 4 | `mission_id`     | INTEGER    | ❌       | `0`       | FK → `Missions.mission_id`. The recommended mission (0 if not mission-specific). |
| 5 | `title`          | STRING     | ✅       | —         | Short recommendation title. Max 80 characters. |
| 6 | `message`        | STRING     | ✅       | —         | Full recommendation message in Thai. Max 500 characters. |
| 7 | `action_label`   | STRING     | ✅       | —         | CTA button label. Max 40 characters. |
| 8 | `basis`          | STRING     | ❌       | `""`      | JSON summary of the data that generated this recommendation. Max 300 characters. |
| 9 | `was_clicked`    | BOOLEAN    | ✅       | `FALSE`   | `TRUE` if student clicked the action button. Updated via `ai_rec_click` analytics event. |
| 10| `generated_at`   | DATETIME   | ✅       | Now (UTC) | When the recommendation was computed. |
| 11| `clicked_at`     | DATETIME   | ❌       | `""`      | When student clicked it. |
| 12| `is_active`      | BOOLEAN    | ✅       | `TRUE`    | Soft-delete flag. |
| 13| `created_at`     | DATETIME   | ✅       | Now (UTC) | Row creation. |

### Recommendation Generation Rules

| Student State | `rec_type` | Logic |
|---|---|---|
| 0 missions completed | `next_mission` | Always recommend Mission 1 |
| Last attempt score < 60 | `review_mission` | Recommend retrying the failed mission |
| Last attempt score 60–79 | `practice_topic` | Recommend reviewing a specific topic from that mission |
| Last attempt score ≥ 80 | `next_mission` | Recommend the next unlocked mission |
| All missions complete | `encouragement` | Congratulatory message + portfolio prompt |
| Streak = 0 (no activity 3+ days) | `encouragement` | Re-engagement message |

---

## 5. Composite Unique Keys Summary

These enforce data integrity at the Apps Script level:

| Table | Unique Key Columns | Purpose |
|---|---|---|
| `Students` | `student_id` | One profile per student |
| `Teachers` | `teacher_id` | One profile per teacher |
| `Missions` | `mission_id`, `mission_code` | One definition per mission |
| `Progress` | `(student_id, mission_id)` | One progress record per student per mission |
| `Badge_Awards` | `(student_id, badge_id)` | Badge awarded only once per student |
| `Leaderboard` | `(student_id, scope, scope_id, snapshot_date)` | One rank per student per scope per day |

---

## 6. Data Lifecycle Summary

| Table | Write Pattern | Update? | Delete? | Archive? |
|---|---|:---:|:---:|:---:|
| `Students` | On enrollment | ✅ (profile, XP, badges) | Soft only | ❌ |
| `Teachers` | On hire | ✅ (profile) | Soft only | ❌ |
| `Missions` | On curriculum design | ✅ (content) | Soft only | ❌ |
| `Progress` | Upsert per student-mission | ✅ (status, step, score) | Soft only | ❌ |
| `Scores` | Append on submit | Limited (teacher comment) | Soft only | ✅ Per term |
| `Badges` | On curriculum design | ✅ (definition only) | Soft only | ❌ |
| `Badge_Awards` | Append on award | ❌ Immutable | Soft only | ❌ |
| `Portfolio` | On student upload | ✅ (description, feedback) | Soft only | ❌ |
| `Analytics` | Append only | ❌ Immutable | Soft only | ✅ Per term |
| `Leaderboard` | Append on rebuild | ❌ Immutable | Soft only | ✅ Monthly |
| `AI_Recs` | Append on generation | `was_clicked` only | Soft only | ✅ Monthly |
| `System_Logs` | Append only | ❌ Immutable | ❌ Never | ✅ Monthly |

---

## 7. Google Sheets Tab Order (Recommended)

Organise the workbook with tabs in this order for maintainability:

```
📋 README          (instructions for spreadsheet administrators)
👥 Students        (core user data)
👨‍🏫 Teachers        (staff accounts)
🎯 Missions        (content catalogue)
📈 Progress        (student-mission progress)
🏆 Scores          (submission ledger)
🥇 Badges          (badge definitions)
🏅 Badge_Awards    (award records)
🗂️ Portfolio       (portfolio metadata)
📊 Analytics       (event stream)
📉 Leaderboard     (ranking snapshots)
🤖 AI_Recs         (recommendation history)
📝 System_Logs     (API audit trail)
```
