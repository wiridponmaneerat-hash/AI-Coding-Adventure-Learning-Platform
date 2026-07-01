# Production Checklist — AI Coding Adventure v1.0.0

Complete each item before going live. Check ✅ when done.

---

## Backend Setup

- [ ] Google Spreadsheet created and ID noted
- [ ] Google Drive folder created, set to "Anyone with link can view", folder ID noted
- [ ] `services/apps-script.js` pasted into GAS editor
- [ ] Script Properties set: `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`
- [ ] `initializeSpreadsheet()` run — all 7 sheets created with headers
- [ ] Student accounts added to Students sheet
- [ ] Teacher accounts added to Teachers sheet
- [ ] `migratePasswordsToHash()` run — passwords hashed
- [ ] GAS deployed as Web App: Execute as **Me**, access **Anyone**
- [ ] Web App URL copied and tested with `?action=ping`

---

## Frontend Configuration

- [ ] `config/app-config.js` updated:
  - [ ] `ENVIRONMENT: 'production'`
  - [ ] `API_BASE_URL` set to GAS Web App URL
  - [ ] `DRIVE.FOLDER_ID` set to Drive folder ID
- [ ] `robots.txt` — `YOUR_GITHUB_USERNAME` replaced with real username
- [ ] `sitemap.xml` — `YOUR_GITHUB_USERNAME` replaced with real username
- [ ] `manifest.json` — `start_url` and `scope` updated to real repo name if different from `AI-Coding-Adventure`
- [ ] `index.html` canonical URL updated (replace `YOUR_GITHUB_USERNAME`)
- [ ] `pages/login.html` canonical URL updated
- [ ] `sw.js` — paths verified to match actual deployment URL

---

## GitHub Repository

- [ ] Repository created: `AI-Coding-Adventure` (or same name used in manifest.json)
- [ ] Code pushed to `main` branch
- [ ] Repository Settings → Pages → Source set to **GitHub Actions**
- [ ] First GitHub Actions workflow run completed successfully
- [ ] Live URL confirmed: `https://USERNAME.github.io/AI-Coding-Adventure/`

---

## Functional Testing

### Landing Page
- [ ] Page loads with correct fonts, animations, and robot illustration
- [ ] "Start Learning" button links to `pages/login.html`
- [ ] All 5 Mission cards display correctly
- [ ] Statistics counter animation works
- [ ] Footer links not broken

### Authentication
- [ ] Student login succeeds → redirects to `home.html`
- [ ] Teacher login succeeds → redirects to `dashboard/index.html`
- [ ] Invalid credentials shows error message
- [ ] Session persists on page refresh

### Student Flow
- [ ] Home page shows correct XP, level, completed missions
- [ ] Mission list page loads all 5 missions
- [ ] Mission detail loads steps and quiz
- [ ] Completing a mission updates XP and completedMissions
- [ ] Badge awarded on first pass
- [ ] perfect_score badge awarded on 100%
- [ ] speed_learner badge awarded under 15 min
- [ ] Failed mission (< 60%) shows retry screen — no XP awarded
- [ ] Portfolio upload completes — file visible in Google Drive
- [ ] Leaderboard shows correct ranking
- [ ] Profile save updates session

### Teacher Flow
- [ ] Dashboard stats show real data from Sheets
- [ ] Student table renders with correct names and XP
- [ ] Chart renders mission completion percentages
- [ ] Logout redirects to `index.html`

### Analytics
- [ ] Open DevTools → Network — verify events are batched and sent to GAS
- [ ] GAS Analytics sheet receives events (check after page interaction)

---

## PWA

- [ ] Chrome DevTools → Application → Manifest valid (no errors)
- [ ] Chrome DevTools → Application → Service Worker active
- [ ] Offline: disconnect network, reload — landing page still shows (cached)
- [ ] "Add to Home Screen" prompt appears on mobile (or can be triggered)

---

## SEO

- [ ] Landing page title, description correct
- [ ] OG tags set (verify with [opengraph.xyz](https://opengraph.xyz))
- [ ] `robots.txt` accessible: `YOUR_DOMAIN/robots.txt`
- [ ] `sitemap.xml` accessible: `YOUR_DOMAIN/sitemap.xml`
- [ ] Auth-protected pages have `noindex` meta tag

---

## Performance

- [ ] No render-blocking scripts in `<head>` (all GSAP and app scripts use `defer`)
- [ ] Google Fonts use `preconnect` hints
- [ ] Images use appropriate formats (SVG for icons)
- [ ] Service Worker pre-caches critical assets

---

## Security

- [ ] No API keys or secrets committed to the repository
- [ ] `data/users.json` does not contain real student credentials
- [ ] Student passwords are SHA-256 hashed in Google Sheets
- [ ] Google Spreadsheet access restricted (not public)
- [ ] GAS Web App URL is not embedded in HTML (only in `app-config.js`)
- [ ] `ENVIRONMENT: 'production'` — demo login panel disabled (`FEATURES.DEMO_PANEL: false` optional)

---

## Accessibility

- [ ] All interactive elements reachable by keyboard (Tab)
- [ ] All images and icons have `aria-hidden="true"` or appropriate `aria-label`
- [ ] Tables have `scope` attributes on header cells
- [ ] Error/success messages use `role="alert"` or `role="status"` with `aria-live`
- [ ] Color contrast passes WCAG AA (blue `#2563EB` on white)
- [ ] Focus visible on all interactive elements

---

## Browser Compatibility

- [ ] Chrome (latest)
- [ ] Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (iOS 15+)
- [ ] Mobile Chrome (Android)

---

## Post-Deploy

- [ ] Share URL with students and teacher
- [ ] Confirm teacher can log in and see dashboard
- [ ] One student completes Mission 1 — verify XP in Sheets
- [ ] Portfolio upload from student — verify file in Drive
- [ ] Analytics events appear in Analytics sheet
