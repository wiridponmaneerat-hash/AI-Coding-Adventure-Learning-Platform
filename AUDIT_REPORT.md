# Project Audit Report — AI Coding Adventure v1.0.0
**Date**: 2026-06-30  
**Auditor**: Principal Software Engineer review (automated)  
**Scope**: Full codebase — folder structure, architecture, HTML, CSS, JavaScript, services, GAS integration, accessibility, performance, responsive design, security, code duplication, dead code, unused assets, broken links, missing files, naming consistency

---

## Executive Summary

The project is a well-structured Vanilla JS + Google Apps Script platform targeting ป.5 students. The architecture is sound and the production preparation work is complete. However, the audit identified **1 Critical**, **3 High**, and **6 Medium** issues. All fixable issues were resolved automatically (see *Fixes Applied* section). No UI redesign was performed.

---

## Audit Scope

| Area | Status |
|------|--------|
| Folder structure | ✅ Reviewed |
| Architecture (JS services, GAS integration) | ✅ Reviewed |
| HTML (all 14 pages) | ✅ Reviewed |
| CSS (13 stylesheets) | ✅ Reviewed |
| JavaScript (10 scripts) | ✅ Reviewed |
| Services (api, auth, analytics, mission, student, portfolio, google-sheet, google-drive) | ✅ Reviewed |
| Google Apps Script backend | ✅ Reviewed (apps-script.js) |
| Security | ✅ Reviewed |
| Dead code / unused assets | ✅ Reviewed |
| Data files (missions.json, badges.json, users.json, students.json) | ✅ Reviewed |
| Config (app-config.js) | ✅ Reviewed |

---

## Issues List

### CRITICAL

#### C1 — `data/users.json` exposes plaintext credentials
- **File**: `data/users.json`
- **Description**: File contained plaintext usernames and passwords for 5 accounts (3 students, 1 teacher, 1 admin). The file is served by GitHub Pages and publicly accessible at `<repo-url>/data/users.json`. Any visitor can enumerate credentials.
- **Impact**: Complete account compromise for all predefined accounts.
- **Fix**: ✅ **AUTO-FIXED** — replaced with an empty JSON array `[]`.

---

### HIGH

#### H1 — `AuthService.requireRole()` returns boolean instead of user object
- **File**: `services/auth-service.js`
- **Files affected**: `scripts/missions-page.js`, `scripts/portfolio-page.js`, `scripts/profile-page.js`, `scripts/leaderboard-page.js`, `scripts/mission-detail.js`
- **Description**: `requireRole()` returned `true` on success, but all 5 protected page scripts assign the return value to a `session` variable and subsequently use `session.name`, `session.userId`, `session.xp`, `session.completedMissions`, etc. With `session = true`, all of these read `undefined`, causing:
  - Navigation avatar displays `?` instead of the student's initial
  - XP and mission completion tracking fails (treats every mission as first-time)
  - Badges can be incorrectly re-awarded
  - `session.userId` is `undefined`, breaking any API calls that need the user ID
- **Fix**: ✅ **AUTO-FIXED** — `requireRole()` now returns the user session object on success (still returns `false` on failure, so `if (!session) return` guards continue to work). `getSession` added as an alias for `getCurrentUser`.

#### H2 — `AuthService.getSession()` called but does not exist
- **Files**: `scripts/mission-detail.js:610`, `scripts/profile-page.js:303,340`, `scripts/portfolio-page.js:319`
- **Description**: Three page scripts call `AuthService.getSession()` after `AuthService.updateSession()` to re-read the updated session into the local `session` variable. The method `getSession` was never defined in auth-service.js (only `getCurrentUser` exists). This causes a `TypeError: AuthService.getSession is not a function` at:
  - After first-time mission completion — the success overlay never renders
  - After avatar color change in profile — UI update breaks mid-function
  - After portfolio badge award — stats render is skipped
- **Fix**: ✅ **AUTO-FIXED** — All 4 call sites changed to `AuthService.getCurrentUser()`.

#### H3 — Mission 5 XP reward mismatch between landing page and data
- **File**: `index.html:407`
- **Description**: The landing page marketing section displays "500 XP" for Mission 5. The actual reward defined in `data/missions.json`, `services/mission-service.js`, and `styles/leaderboard.css` is **350 XP**. Students completing Mission 5 would receive 350 XP despite being advertised 500 XP.
- **Fix**: ✅ **AUTO-FIXED** — Changed to "350 XP".

---

### MEDIUM

#### M1 — Non-existent badge `top_student` in auth-service.js fallback data
- **File**: `services/auth-service.js` (STD003 fallback user)
- **Description**: The development-mode fallback user STD003 has `'top_student'` in their badges array. This badge ID does not exist in `data/badges.json` or anywhere in the badge system. The badge would silently render as an unknown/broken badge on the home and profile pages.
- **Fix**: ✅ **AUTO-FIXED** — `'top_student'` removed from STD003's badges array.

#### M2 — 5 empty dead script files (1-line stubs)
- **Files**: `scripts/gsap.js`, `scripts/missions.js`, `scripts/portfolio.js`, `scripts/dashboard.js`, `scripts/utils.js`
- **Description**: Five script files contain only a single blank line with no content. None are referenced from any HTML page. They appear to be scaffolded stubs that were never populated.
- **Fix**: ✅ **AUTO-FIXED** — All 5 files deleted.

#### M3 — 4 empty dead CSS files (1-line stubs)
- **Files**: `styles/variables.css`, `styles/components.css`, `styles/animations.css`, `styles/responsive.css`
- **Description**: Four CSS files contain only a single blank line. None are referenced from any HTML page or other CSS file. Scaffolded stubs never populated.
- **Fix**: ✅ **AUTO-FIXED** — All 4 files deleted.

#### M4 — 2 empty dead HTML pages
- **Files**: `pages/about.html`, `pages/dashboard.html`
- **Description**: Both files contain only a single blank line. Neither is linked from any navigation or HTML page.
- **Fix**: ✅ **AUTO-FIXED** — Both files deleted.

#### M5 — `data/students.json` is an empty file (invalid JSON)
- **File**: `data/students.json`
- **Description**: The file exists but contains only a blank line — not valid JSON. Any code that tries to `fetch()` and `JSON.parse()` this file would throw a parse error.
- **Fix**: ✅ **AUTO-FIXED** — Replaced with a valid empty JSON array `[]`.

#### M6 — XP formula inconsistency between mission-service.js and mission-detail.js
- **File**: `services/mission-service.js:229`
- **Description**: The development-mode XP calculation in `submitMission()` gives the **full** `xpReward` for any passing score (≥60%). In contrast, `mission-detail.js` (which handles the actual client-side flow) uses a **proportional** formula: `Math.round(xpReward * score/100)`. If `MissionService.submitMission()` is ever called directly, it would return a different XP value than what the student sees on the completion overlay.
- **Fix**: ✅ **AUTO-FIXED** — `mission-service.js` now uses the same proportional formula as `mission-detail.js`.

---

### LOW (No Auto-Fix — Architectural / Non-Critical)

#### L1 — `mission-detail.js` does not call `MissionService.submitMission()` in production
- **File**: `scripts/mission-detail.js`
- **Description**: In production mode, mission scores are computed and stored client-side only (session storage). `MissionService.submitMission()` — which POSTs to the GAS backend and persists scores to the Scores sheet — is never called. This means the teacher dashboard and leaderboard would show stale or no data in production.
- **Recommendation**: Add a fire-and-forget `MissionService.submitMission()` call in `_showCompletion()` when `ENVIRONMENT === 'production'`. This is a non-trivial UX change (async call + reconciliation with server response) deferred to a follow-up.

#### L2 — `pages/mission1.html` through `pages/mission5.html` are undocumented redirect stubs
- **Files**: `pages/mission1.html`, `pages/mission2.html`, `pages/mission3.html`, `pages/mission4.html`, `pages/mission5.html`
- **Description**: Each file is a `<meta http-equiv="refresh">` redirect to `mission-detail.html?id=N`. They are not linked from the application navigation. They may be useful as bookmarkable shortcuts but are not actively maintained.
- **Recommendation**: Document in README or leave as-is. No change needed.

#### L3 — `mission-detail.js` reads `data/missions.json` directly instead of via `MissionService`
- **File**: `scripts/mission-detail.js:29`
- **Description**: The page fetches missions via `fetch('../data/missions.json')` rather than calling `MissionService.getMission()`. This bypasses the service layer and hardcodes the data file path, meaning this page always uses static JSON regardless of `ENVIRONMENT` setting.
- **Recommendation**: Refactor to use `MissionService.getMission()` in a future iteration. Not an immediate blocker since the static JSON is the canonical mission data source.

#### L4 — Dual `mousemove` event listeners in `scripts/app.js`
- **File**: `scripts/app.js`
- **Description**: Two separate `addEventListener('mousemove', ...)` handlers are attached to `document` — one for parallax orbs, one for robot eye tracking. Both fire on every mouse move. Slightly inefficient but functionally correct; could be consolidated into one handler.
- **Recommendation**: Merge into a single listener in a future pass. Low impact.

---

## Positive Findings

- **Architecture**: Clean IIFE pattern throughout, all services expose `window.ServiceName`, all dependencies declared in file headers.
- **Security**: No secrets in client-side code (API URL placeholder only), GAS uses Script Properties for credentials, CORS handled correctly via `text/plain` content-type.
- **Accessibility**: `aria-label`, `aria-hidden`, `role="alert"`, keyboard navigation wired in `app.js` and `missions-page.js`.
- **Performance**: All GSAP and page scripts use `defer`, Google Fonts use `preconnect`, Service Worker pre-caches critical assets.
- **PWA**: `manifest.json`, `sw.js`, SVG icons all present and correct.
- **SEO**: OG tags, Twitter Card, JSON-LD on landing page; `noindex` on all auth-protected pages.
- **Data integrity**: `data/missions.json` (433 lines, 5 missions) and `data/badges.json` (10 badges) are complete and internally consistent.
- **Analytics**: All 9 event types wired correctly with proper guards (`typeof AnalyticsService !== 'undefined'`).
- **Naming consistency**: All files, classes, and IDs follow consistent kebab-case / camelCase conventions throughout.

---

## Fixes Applied Summary

| # | Severity | File | Change |
|---|----------|------|--------|
| 1 | CRITICAL | `data/users.json` | Replaced plaintext credentials with `[]` |
| 2 | HIGH | `services/auth-service.js` | `requireRole()` now returns user object; `getSession` alias added |
| 3 | HIGH | `scripts/mission-detail.js:610` | `getSession()` → `getCurrentUser()` |
| 4 | HIGH | `scripts/profile-page.js:303,340` | `getSession()` → `getCurrentUser()` (×2) |
| 5 | HIGH | `scripts/portfolio-page.js:319` | `getSession()` → `getCurrentUser()` |
| 6 | HIGH | `index.html:407` | Mission 5 XP: "500 XP" → "350 XP" |
| 7 | MEDIUM | `services/auth-service.js` | Removed `'top_student'` from STD003 fallback badges |
| 8 | MEDIUM | `scripts/gsap.js` | Deleted (empty dead file) |
| 9 | MEDIUM | `scripts/missions.js` | Deleted (empty dead file) |
| 10 | MEDIUM | `scripts/portfolio.js` | Deleted (empty dead file) |
| 11 | MEDIUM | `scripts/dashboard.js` | Deleted (empty dead file) |
| 12 | MEDIUM | `scripts/utils.js` | Deleted (empty dead file) |
| 13 | MEDIUM | `styles/variables.css` | Deleted (empty dead file) |
| 14 | MEDIUM | `styles/components.css` | Deleted (empty dead file) |
| 15 | MEDIUM | `styles/animations.css` | Deleted (empty dead file) |
| 16 | MEDIUM | `styles/responsive.css` | Deleted (empty dead file) |
| 17 | MEDIUM | `pages/about.html` | Deleted (empty dead file) |
| 18 | MEDIUM | `pages/dashboard.html` | Deleted (empty dead file) |
| 19 | MEDIUM | `data/students.json` | Replaced empty file with `[]` |
| 20 | MEDIUM | `services/mission-service.js:229` | XP formula aligned with mission-detail.js |

**Total issues**: 10 (1 Critical, 3 High, 6 Medium, 4 Low)  
**Auto-fixed**: 10 Critical + High + Medium (all fixable issues resolved)  
**Deferred**: 4 Low (architectural / follow-up work)
