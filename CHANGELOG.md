# Changelog

All notable changes to AI Coding Adventure are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.0] — 2026-06-30

### Added
- Full Gamified Learning Platform for ป.5 students
- 5 learning missions (เริ่มต้นเขียนโค้ด → โปรเจกต์ AI สุดท้าย)
- XP + Level system (มือใหม่ → AI Master, 5 levels)
- Badge collection system (9 badge types including speed_learner, perfect_score, all_missions)
- Digital Portfolio with file upload (PNG, JPG, GIF, PDF up to 10 MB)
- Class Leaderboard with real-time rankings
- Student Profile with avatar color picker and bio editing
- Teacher Dashboard with student ranking table and Chart.js analytics
- Google Apps Script backend (services/apps-script.js) with full CRUD
- Google Sheets integration for Students, Teachers, Scores, Portfolio, Analytics, Badges
- Google Drive integration for portfolio file storage
- Analytics service with event batching, sessionStorage queue, sendBeacon flush
- Authentication with SHA-256 password hashing in GAS
- Session management with sessionStorage (AuthService)
- PWA: manifest.json + Service Worker (sw.js) with cache-first strategy
- SEO: OG tags, Twitter Card, JSON-LD structured data on landing page
- Favicon (SVG robot icon, 192px and 512px variants)
- robots.txt and sitemap.xml
- 404 page with GitHub Pages SPA redirect
- GitHub Actions workflow for automated Pages deployment
- Full documentation: README, INSTALL, USER_GUIDE, API_DOCUMENTATION, DATABASE_DOCUMENTATION

### Technical
- All `<script>` tags use `defer` — no render-blocking JavaScript
- GSAP moved to deferred scripts (previously render-blocking in `<head>`)
- CORS fix for GAS: `Content-Type: text/plain;charset=UTF-8` on all POST requests
- Analytics events: `login`, `page_view`, `quiz_answer`, `mission_start`, `mission_complete`, `mission_fail`, `portfolio_upload`, `profile_update`
- Service Worker pre-caches landing page, login, and all core CSS/JS
- `noindex, nofollow` on all auth-protected pages; `index, follow` only on landing + login
