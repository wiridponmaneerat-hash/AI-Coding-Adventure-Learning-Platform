# API Documentation

## Overview

The backend is a **Google Apps Script Web App** deployed as a single HTTPS endpoint.  
All communication is via `GET` or `POST` using `fetch()` from the frontend.

**Base URL**: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`  
(Configured in `config/app-config.js` → `API_BASE_URL`)

---

## CORS Handling

GAS does not support preflight `OPTIONS` requests. To avoid CORS errors:

- **GET** requests: standard query parameters — no special headers needed
- **POST** requests: `Content-Type: text/plain;charset=UTF-8` (not `application/json`)  
  This makes the request a "simple request" that skips the preflight
- GAS reads the JSON body via `e.postData.contents` and calls `JSON.parse()`

---

## Frontend Service

`services/api.js` exposes:

```javascript
ApiService.get(action, params)        // GET  ?action=X&key=val
ApiService.post(action, body)         // POST { action, ...body }
ApiService.put(action, body)          // POST with _method: 'PUT'
ApiService.delete(action, body)       // POST with _method: 'DELETE'
ApiService.beacon(action, body)       // navigator.sendBeacon (fire-and-forget)
ApiService.upload(action, payload)    // XHR with progress events
ApiService.isAvailable()              // true in production mode
```

---

## GET Endpoints

All GET requests add `?action=ENDPOINT_NAME&...params` to the base URL.

### `ping`
Health check.

```
GET ?action=ping
Response: { ok: true, ts: "ISO timestamp" }
```

---

### `getStudentProfile`
Fetch a student's full profile.

```
GET ?action=getStudentProfile&userId=STD001
Response: {
  ok: true,
  data: {
    id, name, class, xp, level, badges: string[],
    completedMissions: number[], avatar, avatarColor,
    nickname, email, bio, theme, subject
  }
}
```

---

### `getMissions`
Fetch all mission definitions.

```
GET ?action=getMissions
Response: {
  ok: true,
  data: [ { id, title, description, difficulty, xpReward, badgeOnComplete, steps[], quiz[] } ]
}
```

---

### `getMissionById`
Fetch one mission.

```
GET ?action=getMissionById&id=1
Response: { ok: true, data: { ...mission } }
```

---

### `getPortfolio`
Fetch a student's portfolio entries.

```
GET ?action=getPortfolio&userId=STD001
Response: {
  ok: true,
  data: [ { id, userId, title, description, missionId, fileUrl, type, fileName, createdAt } ]
}
```

---

### `getLeaderboard`
Fetch class leaderboard.

```
GET ?action=getLeaderboard&classes=ป.5%2F1,ป.5%2F2&limit=50&sortBy=xp
Response: {
  ok: true,
  data: [ { rank, userId, name, xp, level, completedMissions: number[], badges: string[], avatarColor } ]
}
```

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `classes` | string (comma-sep) | all | Filter by class names |
| `limit` | number | 50 | Max rows |
| `sortBy` | `xp` \| `missions` | `xp` | Sort field |

---

### `getClassData`
Fetch full class data for teacher.

```
GET ?action=getClassData&teacherId=TCH001&classes=ป.5%2F1
Response: {
  ok: true,
  data: {
    students: [ { ...student, rank } ],
    stats: {
      total, totalXP, avgXP, totalMissions, avgMissions,
      totalBadges, missionCounts: number[], missionPcts: number[]
    }
  }
}
```

---

### `getClassAnalytics`
Fetch analytics summary for teacher.

```
GET ?action=getClassAnalytics&teacherId=TCH001&from=2026-06-01&to=2026-06-30
Response: {
  ok: true,
  data: {
    stats: { ...classStats },
    activity: [ { date, logins, missions } ]   // 7-day array
  }
}
```

---

### `getBadgeDefinitions`
Fetch all badge metadata.

```
GET ?action=getBadgeDefinitions
Response: {
  ok: true,
  data: [ { id, name, description, icon, color } ]
}
```

---

## POST Endpoints

All POST bodies must include `action` field plus payload.  
Content-Type must be `text/plain;charset=UTF-8`.

---

### `login`
Authenticate a user.

```
POST body: { action: "login", username: "STD001", password: "student123", role: "student" }
Response: {
  ok: true,
  data: {
    id, name, role, avatar, avatarColor, xp, level, badges: string[],
    completedMissions: number[], class, classes, subject, nickname, email, bio, theme
  }
}
Error: { ok: false, error: "Invalid credentials" }
```

`role` must be `"student"` or `"teacher"`. GAS checks the appropriate sheet.

---

### `submitMission`
Submit quiz results and award XP/badges.

```
POST body: {
  action: "submitMission",
  userId: "STD001",
  missionId: 1,
  score: 85,             // 0–100 percentage
  elapsed: 420           // seconds taken
}
Response: {
  ok: true,
  data: {
    xpAwarded: 85,
    newXP: 285,
    newLevel: 1,
    newBadges: ["mission1_complete"],
    firstTime: true
  }
}
```

XP is only awarded on the **first pass**. Badges awarded:
- `missionN_complete` on first pass of mission N
- `perfect_score` if score = 100
- `speed_learner` if elapsed < 900 seconds
- `all_missions` if all 5 missions now completed

---

### `uploadPortfolio`
Upload a portfolio file to Google Drive.

```
POST body: {
  action: "uploadPortfolio",
  userId: "STD001",
  title: "โปรเจกต์ AI",
  description: "...",
  missionId: 5,
  fileName: "project.png",
  mimeType: "image/png",
  fileData: "base64-encoded-string"
}
Response: {
  ok: true,
  data: {
    id: "portfolio-row-id",
    fileId: "google-drive-file-id",
    viewUrl: "https://drive.google.com/file/d/.../view",
    badgeAwarded: true   // true if portfolio_first badge was newly awarded
  }
}
```

---

### `updateProfile`
Update student profile fields.

```
POST body: {
  action: "updateProfile",
  userId: "STD001",
  name: "นภัสสร สุขใจ",
  nickname: "ส้ม",
  email: "nom@school.ac.th",
  bio: "ชอบเขียนโค้ด",
  avatarColor: "#7C3AED",
  theme: "default"
}
Response: { ok: true, data: { ...updatedFields } }
```

---

### `changePassword`
Change user password.

```
POST body: {
  action: "changePassword",
  userId: "STD001",
  role: "student",
  oldPassword: "student123",
  newPassword: "newpass456"
}
Response: { ok: true }
Error: { ok: false, error: "รหัสผ่านเดิมไม่ถูกต้อง" }
```

---

### `logEvents`
Batch-log analytics events (called by AnalyticsService).

```
POST body: {
  action: "logEvents",
  events: [
    {
      eventId: "uuid",
      userId: "STD001",
      sessionId: "session-uuid",
      type: "mission_complete",
      page: "mission-detail.html",
      data: { missionId: 1, score: 85, xpEarned: 85, duration: 420, firstTime: true },
      ts: "2026-06-30T10:00:00.000Z"
    }
  ]
}
Response: { ok: true, data: { logged: 1 } }
```

**Event types**: `login`, `page_view`, `quiz_answer`, `mission_start`, `mission_complete`, `mission_fail`, `portfolio_upload`, `profile_update`, `error`

---

## Error Response Format

All errors return:
```json
{ "ok": false, "error": "Human-readable message" }
```

HTTP status is always 200 (GAS limitation). Check `response.ok` field in JavaScript.

---

## PUT / DELETE via POST

GAS does not support HTTP PUT or DELETE. Emulate them with:

```javascript
// PUT
ApiService.post('updateProfile', { _method: 'PUT', userId: ..., ... })

// DELETE  
ApiService.post('deletePortfolio', { _method: 'DELETE', entryId: ... })
```

GAS router checks `body._method` to dispatch to the correct handler.

---

## Rate Limits

Google Apps Script has execution quotas:
- 6 minutes max execution per request
- 20,000 total URL Fetch calls/day (consumer accounts)
- No built-in rate limiting on the Web App endpoint

For production with many students, consider caching frequently read data (mission list, badge definitions) in GAS `CacheService`.
