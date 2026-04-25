# Online Course Platform Backend

A RESTful Node.js and Express backend for managing an online learning platform with role-based access for students and instructors. It supports course authoring, enrollments, lecture progress tracking, quizzes with grading, certificate generation, and public certificate verification. The backend uses Prisma ORM with PostgreSQL and follows a service-route architecture for clean separation of concerns.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js | Server-side JavaScript runtime |
| Framework | Express.js | HTTP API and middleware pipeline |
| Database | PostgreSQL | Persistent relational data store |
| ORM | Prisma | Type-safe DB access and migrations |
| Auth | JWT (`jsonwebtoken`) | Access token based authentication |
| Password Security | `bcryptjs` | Password hashing and verification |
| File Uploads | `multer` | Local multipart file upload handling |
| PDF Generation | `pdfkit` | Server-side certificate PDF generation |
| Environment | `dotenv` | Environment variable management |
| Dev Tooling | `nodemon` | Auto-restart in development |

## Project Setup

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/online-course-platform.git
```

2. Move into backend folder:

```bash
cd online-course-platform/backend
```

3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file in `backend/` (see variables below).

5. Run Prisma migrations:

```bash
npx prisma migrate dev --name init
```

6. Generate Prisma client:

```bash
npx prisma generate
```

7. Start the server:

```bash
npm run dev
```

Use `npm start` to run without file watching (production-style: `node src/server.js`).

8. API should now be available at:

```text
http://localhost:5000
```

## Environment Variables

Create a `.env` file in `backend/` with the following values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB_NAME"
JWT_SECRET="your_super_secret_jwt_key"
PORT=5000
```

### Optional / Production Notes

- `BASE_URL`: in development, file URLs are currently constructed dynamically from `req.protocol + req.get('host')`.
- In production, use your public domain/proxy configuration consistently (for example via `BASE_URL`) so generated file and download links point to the correct host.

## API Documentation

HTTP routes are mounted under **`/api`**. The app also serves uploaded files from **`/uploads`** (static).

All **successful** JSON responses use a `data` wrapper, for example:

```json
{ "data": { "...": "..." } }
```

Error responses use **`{ "error": "message" }`** (no `data` field) with an appropriate HTTP status code (e.g. `400`, `401`, `403`, `404`).

Send `Authorization: Bearer <token>` for protected routes.

### Auth (`/api/auth`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new user. Body: `name`, `email`, `password`, `role` (`STUDENT` or `INSTRUCTOR`) |
| POST | `/api/auth/login` | No | Login. Body: `email`, `password`. Returns `user` and `token` inside `data` |

### Courses (`/api/courses`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/courses` | No | List **published** courses. Optional query params: `search`, `category`, `difficulty` (see notes below) |
| GET | `/api/courses/my` | Yes (Instructor) | List courses created by logged-in instructor |
| GET | `/api/courses/:id` | Optional | Get course details with full syllabus (modules, lectures, resources, module quizzes). **Published** courses are public. **Draft** courses return `404` unless the caller is the **owning instructor** (use `Authorization: Bearer`) |
| POST | `/api/courses` | Yes (Instructor) | Create a new course (default status `DRAFT`) |
| PUT | `/api/courses/:id` | Yes (Instructor) | Update an instructor-owned course |
| DELETE | `/api/courses/:id` | Yes (Instructor) | Delete an instructor-owned course |
| PUT | `/api/courses/:id/publish` | Yes (Instructor) | Publish course if structure requirements are met |

### Modules (`/api/modules`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/modules/course/:courseId` | No | List modules for a course |
| GET | `/api/modules/:id` | No | Get module details with lectures |
| POST | `/api/modules` | Yes (Instructor) | Create module |
| PUT | `/api/modules/:id` | Yes (Instructor) | Update module |
| DELETE | `/api/modules/:id` | Yes (Instructor) | Delete module |

### Lectures (`/api/lectures`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/lectures/module/:moduleId` | No | List lectures for a module |
| GET | `/api/lectures/:id` | No | Get lecture details with resources |
| POST | `/api/lectures` | Yes (Instructor) | Create lecture |
| PUT | `/api/lectures/:id` | Yes (Instructor) | Update lecture |
| DELETE | `/api/lectures/:id` | Yes (Instructor) | Delete lecture |

### Resources (`/api/resources`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/resources/lecture/:lectureId` | No | List lecture resources |
| POST | `/api/resources` | Yes (Instructor) | Create resource: `multipart/form-data` with `file` (required) plus `lectureId` and `title` (form fields) |
| DELETE | `/api/resources/:id` | Yes (Instructor) | Delete resource |

### Enrollments (`/api/enrollments`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/enrollments/my` | Yes | Get student enrollments with progress metrics |
| GET | `/api/enrollments/check/:courseId` | Yes | Check if current user is enrolled in course |
| POST | `/api/enrollments` | Yes | Enroll current user in a published course |
| DELETE | `/api/enrollments/:courseId` | Yes | Unenroll current user from course |

### Progress (`/api/progress`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/progress/course/:courseId` | Yes | Course progress summary |
| GET | `/api/progress/course/:courseId/details` | Yes | Per-lecture completion map |
| GET | `/api/progress/course/:courseId/next` | Yes | Next incomplete lecture (see response shape in Notes) |
| POST | `/api/progress` | Yes | Mark lecture completion. Body: `lectureId` (required), `isComplete` (optional, default `true`) |
| PUT | `/api/progress/:lectureId` | Yes | Update lecture completion. Body: `isComplete` |

### Quizzes (`/api/quizzes`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/quizzes/module/:moduleId` | No | Get module quiz with questions/options |
| GET | `/api/quizzes/:id` | No | Get quiz by ID |
| POST | `/api/quizzes` | Yes (Instructor) | Create quiz for module |
| PUT | `/api/quizzes/:id` | Yes (Instructor) | Update quiz |
| DELETE | `/api/quizzes/:id` | Yes (Instructor) | Delete quiz |
| POST | `/api/quizzes/:id/questions` | Yes (Instructor) | Add quiz question and options |
| PUT | `/api/quizzes/questions/:questionId` | Yes (Instructor) | Update question |
| DELETE | `/api/quizzes/questions/:questionId` | Yes (Instructor) | Delete question |
| POST | `/api/quizzes/:id/attempt` | Yes | Submit quiz attempt for grading |
| GET | `/api/quizzes/:id/attempts/my` | Yes | Get current user attempts for quiz |
| POST | `/api/quizzes/:id/publish` | Yes (Instructor) | Publish a quiz (owner instructor only) |

### Certificates (`/api/certificates`)

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| GET | `/api/certificates/my` | Yes | Get current user certificates |
| GET | `/api/certificates/check/:courseId` | Yes | Check if course completion requirements are met |
| POST | `/api/certificates/generate` | Yes | Generate (or return existing) certificate |
| GET | `/api/certificates/:certificateId` | No | Public certificate verification lookup |
| GET | `/api/certificates/:certificateId/download` | No | Download certificate PDF |

## Example Requests and Responses

### 1) Login

**Request**

`POST /api/auth/login`

```json
{
  "email": "student@test.com",
  "password": "pass123"
}
```

**Response (200)**

```json
{
  "data": {
    "user": {
      "id": 2,
      "name": "Test Student",
      "email": "student@test.com",
      "role": "STUDENT",
      "createdAt": "2026-04-04T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2) Create Course

**Request**

`POST /api/courses`

Headers:

```text
Authorization: Bearer <instructorToken>
Content-Type: application/json
```

Body:

```json
{
  "title": "JavaScript Basics",
  "description": "Learn JS fundamentals from scratch",
  "category": "Programming",
  "difficulty": "BEGINNER",
  "thumbnailUrl": "https://example.com/thumb.jpg"
}
```

**Response (201)**

```json
{
  "data": {
    "id": 1,
    "title": "JavaScript Basics",
    "description": "Learn JS fundamentals from scratch",
    "category": "Programming",
    "difficulty": "BEGINNER",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "status": "DRAFT",
    "instructorId": 1,
    "createdAt": "2026-04-04T10:20:00.000Z",
    "updatedAt": "2026-04-04T10:20:00.000Z"
  }
}
```

### 3) Submit Quiz Attempt

**Request**

`POST /api/quizzes/1/attempt`

Headers:

```text
Authorization: Bearer <studentToken>
Content-Type: application/json
```

Body:

```json
{
  "answers": [
    {
      "questionId": 1,
      "selectedOptionId": 2
    }
  ]
}
```

**Response (201)**

```json
{
  "data": {
    "score": 100,
    "passed": true,
    "correctCount": 1,
    "totalQuestions": 1,
    "attempt": {
      "id": 10,
      "score": 100,
      "passed": true,
      "studentId": 2,
      "quizId": 1,
      "answers": [
        {
          "id": 40,
          "attemptId": 10,
          "questionId": 1,
          "selectedOptionId": 2
        }
      ]
    },
    "breakdown": [
      {
        "questionId": 1,
        "questionText": "What does JS stand for?",
        "selectedOptionId": 2,
        "correctOptionId": 2,
        "isCorrect": true
      }
    ]
  }
}
```

### 4) Generate Certificate

**Request**

`POST /api/certificates/generate`

Headers:

```text
Authorization: Bearer <studentToken>
Content-Type: application/json
```

Body:

```json
{
  "courseId": 1
}
```

**Response (201)**

```json
{
  "data": {
    "id": 5,
    "certificateId": "CERT-202604-U2-C1",
    "issuedAt": "2026-04-04T12:00:00.000Z",
    "studentId": 2,
    "courseId": 1,
    "student": {
      "name": "Test Student"
    },
    "course": {
      "title": "JavaScript Basics"
    }
  }
}
```

## Notes

### Published course list (`GET /api/courses`)

- Query parameters (all optional):
  - **`search`** – matches course title, description, category (substring, case-insensitive), or instructor name.
  - **`category`** – case-insensitive **exact** match on the course `category` string (as stored in the database).
  - **`difficulty`** – one of `BEGINNER`, `INTERMEDIATE`, `ADVANCED` (must match the stored enum value).

### Progress

- `GET /api/progress/course/:courseId` returns a summary including **`totalLectures`**, **`completedLectures`**, **`percentage`**, and **`completedLectureIds`**.
- `GET /api/progress/course/:courseId/details` returns an array of `{ "lectureId", "isComplete" }` for every lecture in the course.
- **`GET /api/progress/course/:courseId/next`** response: `{ "data": { "lecture": { ... } | null } }`. If every lecture is complete, `lecture` is `null`.

### Enrollments

- `POST /api/enrollments` body: `{ "courseId": <number> }` (must be a **published** course the user is not already enrolled in). Returns `409` if already enrolled.
- `GET /api/enrollments/check/:courseId` returns `{ "data": { "enrolled": true | false } }`.
- `GET /api/enrollments/my` returns each enrollment with **`totalLectures`**, **`completedLectures`**, and **`completionPercentage`** (computed server-side).

### Quizzes

- `GET /api/quizzes/module/:moduleId` and `GET /api/quizzes/:id` are unauthenticated; use them to load quiz content for display.
- `POST /api/quizzes/:id/attempt` requires **authentication** (`Authorization: Bearer`). Body: `{ "answers": [ { "questionId": <number>, "selectedOptionId": <number> }, ... ] }`.

### Static files and CORS

- Resource upload endpoint expects `multipart/form-data` with a `file` field, not JSON; additional fields such as `lectureId` and `title` are sent as form fields (see `resource.routes.js`).
- Uploaded files are served from **`/uploads`** (URL prefix on the same host as the API, e.g. `http://localhost:5000/uploads/...`).
- The API uses **CORS** with a permissive default for development; tighten for production as needed.

### Certificates

- Certificate IDs follow this format:

```text
CERT-YYYYMM-U{studentId}-C{courseId}
```
