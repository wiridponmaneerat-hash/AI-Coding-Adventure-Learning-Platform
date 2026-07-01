# AI Coding Adventure

> แพลตฟอร์มเรียนวิทยาการคำนวณผ่านการผจญภัยด้วย AI สำหรับนักเรียนชั้น ป.5

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-deployed-brightgreen)](https://YOUR_GITHUB_USERNAME.github.io/AI-Coding-Adventure/)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## ภาพรวม

**AI Coding Adventure** คือระบบ Gamified Learning Platform ที่ออกแบบมาเพื่อช่วยให้นักเรียนชั้นประถมศึกษาปีที่ 5 เรียนรู้วิทยาการคำนวณ (Computational Thinking + Coding) ผ่านระบบภารกิจ (Mission), การสะสม XP และ Badge และ Digital Portfolio

| ผู้พัฒนา | นายวิริทธิ์พล แก้วดวงจันทร์ |
|-----------|-------------------------------|
| โรงเรียน | โรงเรียนชุมชนบ้านปากชม |
| เวอร์ชัน | 1.0.0 |
| ปีที่พัฒนา | 2026 |

---

## คุณสมบัติหลัก

### สำหรับนักเรียน
- **5 Mission** เรียนรู้การเขียนโปรแกรมตั้งแต่พื้นฐานถึง AI Project
- **ระบบ XP และ Level** สะสมแต้มและเลื่อนระดับ มือใหม่ → AI Master
- **Badge Collection** รางวัลพิเศษจากความสำเร็จต่าง ๆ
- **Digital Portfolio** อัปโหลดและแสดงผลงาน
- **Class Leaderboard** อันดับแข่งขันในห้องเรียน
- **โปรไฟล์ส่วนตัว** แก้ไขข้อมูลและเปลี่ยน Avatar

### สำหรับครู
- **Teacher Dashboard** ภาพรวมความก้าวหน้าของนักเรียนทุกคน
- **Mission Analytics** กราฟและสถิติการผ่านภารกิจ
- **Student Ranking** ตารางอันดับแบบ Real-time
- **Learning Analytics** วิเคราะห์พฤติกรรมการเรียนรู้

---

## สถาปัตยกรรม

```
┌─────────────────────────────┐
│   GitHub Pages (Frontend)   │
│  HTML · CSS · Vanilla JS    │
└──────────────┬──────────────┘
               │ HTTPS / GAS API
┌──────────────▼──────────────┐
│  Google Apps Script (GAS)   │
│    Web App (REST-like)      │
└──────────────┬──────────────┘
               │
┌──────────────▼──────────────┐
│       Google Sheets         │
│  Students · Teachers ·      │
│  Scores · Portfolio ·       │
│  Analytics · Badges         │
└──────────────┬──────────────┘
               │ File storage
┌──────────────▼──────────────┐
│       Google Drive          │
│   Portfolio file uploads    │
└─────────────────────────────┘
```

---

## โครงสร้างโฟลเดอร์

```
AI-Coding-Adventure/
├── index.html              # Landing page (public)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker
├── robots.txt
├── sitemap.xml
├── 404.html
│
├── pages/                  # App pages (auth-protected)
│   ├── login.html
│   ├── home.html
│   ├── missions.html
│   ├── mission-detail.html
│   ├── portfolio.html
│   ├── leaderboard.html
│   └── profile.html
│
├── dashboard/              # Teacher dashboard
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── config/
│   └── app-config.js       # Central config (edit before deploy)
│
├── services/               # Frontend service layer
│   ├── api.js              # HTTP client (GAS CORS-safe)
│   ├── auth-service.js     # Session management
│   ├── analytics-service.js
│   ├── mission-service.js
│   ├── student-service.js
│   ├── portfolio-service.js
│   ├── google-sheet.js     # Leaderboard + class data
│   ├── google-drive.js     # Drive URL helpers + upload
│   └── apps-script.js      # GAS backend (deploy separately)
│
├── scripts/                # Page-specific scripts
│   ├── auth.js
│   ├── home.js
│   ├── missions-page.js
│   ├── mission-detail.js
│   ├── portfolio-page.js
│   ├── leaderboard-page.js
│   ├── profile-page.js
│   └── app.js              # Landing page
│
├── styles/                 # CSS modules
│   ├── globals.css
│   ├── variables.css
│   ├── auth.css
│   ├── home.css
│   ├── missions.css
│   ├── mission-detail.css
│   ├── portfolio.css
│   ├── leaderboard.css
│   ├── profile.css
│   └── responsive.css
│
├── data/                   # Static JSON (dev/seed data)
│   ├── missions.json
│   └── badges.json
│
└── assets/
    ├── favicon.svg
    ├── icon-192.svg
    ├── icon-512.svg
    └── img/
```

---

## เริ่มต้นอย่างรวดเร็ว

ดูรายละเอียดการติดตั้งและ Deploy ได้ที่ [INSTALL.md](INSTALL.md)

---

## เทคโนโลยีที่ใช้

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5 / CSS3 / JavaScript (ES6+) |
| Animation | GSAP 3.12.5 |
| Chart | Chart.js 4.4.4 |
| Icons | Google Material Symbols Rounded |
| Fonts | Google Fonts (Prompt, Nunito, Poppins) |
| Backend | Google Apps Script Web App |
| Database | Google Sheets |
| Storage | Google Drive |
| Hosting | GitHub Pages |
| PWA | Service Worker + Web App Manifest |

---

## ใบอนุญาต

โปรเจกต์นี้พัฒนาเพื่อการศึกษา — สงวนลิขสิทธิ์ © 2026 นายวิริทธิ์พล แก้วดวงจันทร์
