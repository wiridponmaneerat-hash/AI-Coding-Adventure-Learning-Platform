You are a Senior Software Architect.

Continue the existing project.

IMPORTANT

Read the entire ai-context folder before making changes.

Do NOT redesign the UI.

Maintain all existing styles and components.

==================================================
OBJECTIVE
==================================================

Prepare the frontend architecture for Google Apps Script backend integration.

Do NOT connect to Google Apps Script yet.

Create reusable service modules and API abstraction.

==================================================
PROJECT STRUCTURE
==================================================

services/
    api.js
    auth-service.js
    student-service.js
    mission-service.js
    portfolio-service.js

config/
    app-config.js

==================================================
CONFIG
==================================================

Create a central configuration file.

Include placeholders for

API_BASE_URL

APP_NAME

VERSION

ENVIRONMENT

==================================================
API SERVICE
==================================================

Create reusable fetch wrapper.

Support

GET

POST

PUT

DELETE

JSON Response

Timeout

Retry

Error Handling

==================================================
AUTH SERVICE

Functions

login()

logout()

getCurrentUser()

saveSession()

clearSession()

==================================================
STUDENT SERVICE

Functions

getProfile()

updateProfile()

getDashboard()

==================================================
MISSION SERVICE

Functions

getMissions()

getMission()

submitMission()

==================================================
PORTFOLIO SERVICE

Functions

uploadPortfolio()

getPortfolio()

==================================================
CODE STYLE

Vanilla JavaScript

ES Modules

Reusable

Well documented

==================================================
OUTPUT

Generate only

config/app-config.js

services/api.js

services/auth-service.js

services/student-service.js

services/mission-service.js

services/portfolio-service.js

Do not explain.