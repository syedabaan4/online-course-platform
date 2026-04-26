# Coursly - Online Course Platform

A full-stack web application where instructors build structured courses (modules, video lectures, file resources, and graded quizzes) and students browse the catalog, enroll, track progress, complete module assessments, and earn verifiable certificates of completion.

The project implements the three workflows defined in the course specification: student learning and enrollment, instructor authoring and course management, and quiz-based grading with certificate issuance.



## Table of contents

- [Project overview](#project-overview)
- [Features](#features)
- [Frameworks and libraries](#frameworks-and-libraries)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Demo data (optional seed)](#demo-data-optional-seed)
- [Running in production](#running-in-production)
- [Validation, routing, and error handling](#validation-routing-and-error-handling)
- [Team contributions](#team-contributions)



## Project overview

**Coursly** is an online learning platform with role-based access. Instructors work from a dedicated dashboard to create and publish courses, organize content by module, attach downloads to lectures, and configure multiple-choice quizzes with passing thresholds. Students use a catalog with search and filters, enroll in published courses, watch lectures (including embedded video where supported), mark completion, download resources, take quizzes with immediate feedback, and-when lectures and quizzes are satisfied-generate a PDF certificate backed by a public verification URL.

The frontend is a React single-page application that communicates with a REST API. The backend persists data in PostgreSQL via Prisma and issues JWTs for authenticated routes.



## Features

### Workflow 1 - Course browsing, enrollment, and learning

- Public **course catalog** with search, category filter, and difficulty filter
- **Course detail** pages with syllabus, instructor information, and enrollment actions
- **My Courses** for enrolled students with progress summaries
- **Course player** with module/lecture sidebar, video area, lecture completion, and resource downloads
- **Progress** persisted server-side and surfaced as completion percentage

### Workflow 2 - Instructor authoring and management

- **Instructor dashboard** listing owned courses and key status (draft vs published)
- **Course CRUD**: create and edit course metadata; **publish** with validation (minimum structure required)
- **Course builder**: modules, lectures (title, description, video URL), ordering, and **resource** uploads (multipart) per lecture
- **Quiz builder** per module: questions, options, correct answers, passing score; **publish quiz** when ready
- **Delete** course (with confirmations in the UI where destructive actions apply)

### Workflow 3 - Quizzes, grading, and certificates

- **Quiz player**: answer all questions, submit for automatic grading, pass/fail against instructor threshold
- **Retakes** for failed attempts; results include per-question breakdown
- **Course completion** logic: all lectures complete and all published module quizzes passed
- **Certificate generation** (idempotent per student/course), on-screen certificate view, **PDF download**
- **My Certificates** for signed-in students
- **Public certificate verification** at `/verify/:certificateId` (no login), backed by `GET /api/certificates/:certificateId`

### Authentication and accounts

- **Registration** with role selection (student or instructor)
- **Login** and **logout**; JWT stored client-side for API calls
- **Route guards**: protected student routes and instructor-only routes
- Password reset / recovery is **not** implemented (credentials are managed at registration and login only)



## Frameworks and libraries

| Area | Technology |
|||
| Frontend UI | **React 19** |
| Frontend tooling | **Vite** |
| Client routing | **React Router** |
| HTTP client | **Axios** |
| Notifications / confirm flows | **SweetAlert2** (toasts); custom modal for confirm dialogs |
| Styling | **Vanilla CSS** (global design tokens and component-oriented classes; no CSS-in-JS framework) |
| Backend runtime | **Node.js** |
| HTTP API | **Express 5** |
| ORM / migrations | **Prisma** |
| Database | **PostgreSQL** |
| Authentication | **JWT** (`jsonwebtoken`), **bcryptjs** for password hashing |
| Uploads | **multer** (local storage under `/uploads`) |
| Certificate PDFs | **pdfkit** |



## Repository layout

```text
online-course-platform/
├── frontend/          # React (Vite) SPA - src/pages, components, api clients
├── backend/           # Express API - src/routes, services, Prisma schema
│   └── prisma/        # schema, migrations, seed script
└── README.md          # This file (root documentation for the repository)
```

API route reference and additional backend notes live in [`backend/README.md`](backend/README.md).



## Prerequisites

- **Node.js** (LTS recommended) and **npm**
- **PostgreSQL** running locally or reachable from your machine
- A empty database (or one you are allowed to migrate) for development



## Local setup

### 1. Database

Create a PostgreSQL database and note the connection string (used as `DATABASE_URL` below).

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (see [Environment variables](#environment-variables)).

Apply migrations and generate the Prisma client:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the API (default port **5000**):

```bash
npm run dev
```

Static uploads are served from the same server (e.g. `http://localhost:5000/uploads/...`).

### 3. Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server defaults to **http://localhost:5173**. Open that URL in a browser.

### 4. Verify integration

- Register a new account or use seeded demo accounts (after [seeding](#demo-data-optional-seed)).
- Confirm the browser can reach the API (no CORS errors in the console for normal flows).
- Instructor flows require logging in as a user with the **INSTRUCTOR** role.



## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|-||
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing access tokens |
| `PORT` | Optional; defaults to `5000` |

Optional: `BASE_URL` for consistent absolute URLs in production (see backend README).

### Frontend

The API base URL is configured in `frontend/src/api/axios.js` (defaults to `http://localhost:5000/api`). For deployment, point this at your hosted API (or introduce a `VITE_` variable and wire it through Vite’s `import.meta.env` if you prefer build-time configuration).



## Demo data (optional seed)

The repository includes a development seed that **wipes existing application data** and inserts sample instructors, students, multi-module courses, YouTube-based lecture URLs, published quizzes, and sample resource links.

From `backend/`:

```bash
npm run db:seed
```

Or:

```bash
npx prisma db seed
```

After seeding, example accounts include:

- `instructor@test.com` / `pass123` (instructor)
- `student@test.com` / `pass123` (student)

Use these only in local development; change or remove seed credentials before any real deployment.



## Running in production

- Build the frontend: `cd frontend && npm run build`, then serve the `dist` output with any static host or reverse proxy.
- Run the backend with `npm start` (or a process manager) and ensure `DATABASE_URL`, `JWT_SECRET`, and file upload paths are set for your environment.
- Configure CORS and `BASE_URL` / HTTPS as appropriate for your domain.



## Validation, routing, and error handling

- **Forms**: Login and registration perform client-side checks (required fields, basic email shape); the API enforces rules and returns clear error messages for invalid input.
- **Routing**: React Router defines public routes (home, auth, catalog, course detail, certificate verification), student-protected routes (learning, quizzes, certificates), instructor-only routes (dashboard, course editor, quiz builder), and a **404** fallback for unknown paths.
- **API errors**: Axios interceptors clear invalid sessions on **401** and redirect to login; other failures surface via inline messages or toast notifications.
- **Loading states**: Lazy-loaded routes use a global suspense fallback; key mutations show loading/disabled controls where implemented.
- **Destructive actions**: Confirmations are used for operations such as deleting a course or unenrolling, to reduce accidental data loss.



## Team contributions

| Name | ID / role | Responsibilities |
||--||
| Syed Abaan | 22984 - Group lead | End-to-end delivery per project specification: **Workflow 1** (catalog, enrollment, course player, progress, resources); **Workflow 2** (instructor dashboard, course CRUD, content builder, quiz authoring, publishing); **Workflow 3** (quiz attempts, grading UI, completion rules, certificates, PDF generation, public verification). Frontend structure (routing, auth context, UI consistency), backend REST design, Prisma schema and migrations, integration testing during development, and documentation. |




## License

This project was developed for academic submission. Use and redistribution terms are at the discretion of the authors and the institution.
