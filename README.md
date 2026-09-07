# LibraryWebApp

A full-stack Library Management System: a librarian manages the book catalog and members; a
member browses books, borrows and returns them, and sees their own history. This repo currently
holds the **backend** (`backend/`) — an authenticated REST API. An Angular frontend will live
alongside it in a `frontend/` folder once built.

- **This file** — what the project is, how to set it up and run it.
- **`docs/backend-architecture.md`** — the full backend design: every module, every endpoint (built
  and planned), the error-code catalog, the auth mechanism, and the remaining build order.
- **`docs/database-design.md`** — the database schema, ER diagram, and the reasoning behind each
  design decision.

---

## Tech stack

| Layer | Choice |
|---|---|
| Language / runtime | C# / .NET 8 |
| Web framework | ASP.NET Core Web API (controller-based) |
| Database | PostgreSQL |
| ORM | Entity Framework Core (code-first, migrations) |
| Auth | ASP.NET Core Identity (password hashing, user management) + JWT, delivered as an `HttpOnly` cookie |
| API docs | Swagger / OpenAPI (auto-generated, dev-only) |

---

## How the backend is put together

Request flow, top to bottom, for something like `POST /api/auth/login`:

```
Client (curl / Angular / Swagger UI)
   │  sends request, browser auto-attaches the access_token cookie if present
   ▼
Program.cs middleware pipeline
   │  ErrorHandlingMiddleware → CORS → Authentication → Authorization → routing
   ▼
Controller  (Controllers/*.cs)
   │  reads the request, validates ModelState, calls into Identity's UserManager
   │  or (once added) a repository — throws a typed AppException on any business error
   ▼
AppException → caught by ErrorHandlingMiddleware
   │  turned into a consistent JSON envelope: { success, message, data, error, timestamp }
   ▼
Response sent back — on success, ApiResponse<T>.SuccessResponse(...) with the same envelope shape
```

Key architectural decisions (matching the conventions from the GlobeTrotter backend guide, adapted
to idiomatic ASP.NET Core):

- **No separate `routes/` files.** ASP.NET Core attaches routes directly to controller methods via
  attributes (`[HttpPost("login")]`, `[Route("api/[controller]")]`) — the controller *is* the route
  definition, there's nothing to split into a second file.
- **Consistent response envelope.** Every endpoint returns the same JSON shape via
  `Common/ApiResponse.cs` — `{ success, message, data, error, timestamp }` — instead of ad-hoc
  `BadRequest(new {...})` calls scattered around.
- **One error catalog, not inline errors.** Every expected failure (`EmailAlreadyExists`,
  `InvalidCredentials`, `BookNotFound`, etc.) is a pre-defined `AppException` in
  `Common/AppException.cs`'s `Errors` catalog, with a numbered code (`1xxxx` common, `2xxxx` auth,
  `3xxxx` library domain). Controllers `throw Errors.SomeError;` — they never construct an error
  inline. `Middleware/ErrorHandlingMiddleware.cs` is the single place that catches these and turns
  them into the JSON envelope, so no controller action needs its own try/catch.
- **Code-first EF Core, not a hand-written schema.sql.** The C# classes in `Models/` are the source
  of truth for the database schema. Running `dotnet ef migrations add <Name>` diffs your model
  changes into a new file under `Migrations/`, and `dotnet ef database update` applies it. See
  `docs/database-design.md` for the full schema, ER diagram, and the reasoning behind each design
  choice.
- **JWT lives in an `HttpOnly` cookie, never in the response body.** On login/register, the backend
  sets `access_token` as an `HttpOnly` + `SameSite=Lax` cookie — frontend JavaScript can never read
  it (so an XSS bug can't steal it), and the browser attaches it automatically on every request.
  There is no refresh token — the cookie is valid for 8 hours, then the user has to log in again.

---

## Folder structure

```
backend/
├── Program.cs              App startup: registers DB, Identity, JWT auth, CORS, Swagger,
│                            runs pending migrations + seeding, builds the middleware pipeline
├── Controllers/             HTTP endpoints — one file per resource (routing lives here via
│                            attributes, ASP.NET Core convention, no separate routes/ folder)
├── Models/                  EF Core entities — these classes define the database schema
├── DTOs/                    Request/response shapes (what a client actually sends/receives —
│                            kept separate from the EF Core entities in Models/)
├── Data/
│   ├── ApplicationDbContext.cs   The DbContext — DbSets + relationship configuration
│   └── DbSeeder.cs               Seeds the default librarian account on startup
├── Common/
│   ├── AppException.cs           Custom exception type + the full catalog of named,
│   │                              numbered application errors
│   └── ApiResponse.cs            The success/error JSON envelope every endpoint returns
├── Middleware/
│   └── ErrorHandlingMiddleware.cs   Global try/catch — turns any AppException (or unexpected
│                                     exception) into a consistent JSON error response
├── Services/
│   ├── TokenService.cs           Builds and signs the JWT issued on login/register
│   └── BorrowService.cs          Borrow/return logic — transaction + row-locking, see
│                                   docs/backend-architecture.md §4a
├── Repositories/             Data-access layer for Book/BorrowRecord
├── Migrations/                EF Core's generated migration history (do not hand-edit)
└── appsettings*.json          Non-secret config only (logging levels etc.) — see "Secrets" below
```

---

## Prerequisites

- .NET 8 SDK
- PostgreSQL running locally, with a database created for this project (e.g. `librarydb`)
- `dotnet-ef` CLI tool: `dotnet tool install --global dotnet-ef`

## Required secrets (local dev)

This project has no `.env` file — .NET keeps local secrets outside the repo entirely, in
`dotnet user-secrets`, so they can never accidentally get committed. Anyone setting this project up
needs to run these once, from `backend/`, with their own values:

```bash
cd backend
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:LibraryDb" "Host=localhost;Port=5432;Database=librarydb;Username=<your-postgres-user>;Password=<your-postgres-password>"
dotnet user-secrets set "Jwt:Key" "<any long random string, e.g. output of: openssl rand -base64 48>"
dotnet user-secrets set "Jwt:Issuer" "LibraryWebApi"
dotnet user-secrets set "Jwt:Audience" "LibraryWebApp"
```

Optional, only if the Angular frontend runs somewhere other than `http://localhost:4200`:

```bash
dotnet user-secrets set "Frontend:Origin" "http://localhost:<your-port>"
```

Optional — overrides the seeded default librarian account's email/password (falls back to
`librarian@library.local` / `Librarian@123` if not set, so the app works without these too):

```bash
dotnet user-secrets set "Seed:LibrarianEmail" "<your-choice>"
dotnet user-secrets set "Seed:LibrarianPassword" "<your-choice>"
```

In production, the same keys would be set as real environment variables instead
(`Jwt__Key`, `ConnectionStrings__LibraryDb`, double underscore for the nesting) — no code changes
needed, `IConfiguration` reads from whichever source is present.

## Setup & run

```bash
cd backend
dotnet restore
dotnet ef database update    # applies all migrations, creates every table
dotnet run
```

Watch the console output for the exact URL (e.g. `http://localhost:5xxx`). On startup the app also
seeds one default librarian account if none exists yet, using `Seed:LibrarianEmail` /
`Seed:LibrarianPassword` from configuration (defaults to `librarian@library.local` /
`Librarian@123` if you didn't set those secrets).

Once running, open `http://localhost:<port>/swagger` for interactive API docs, or use curl/Postman.

---

## API reference (current)

All responses share this envelope:
```json
{ "success": true, "message": "...", "data": { ... }, "error": null, "timestamp": "..." }
```
On failure, `success` is `false`, `data` is `null`, and `error` holds `{ code, message }`.

| Method | Route | Auth required | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | No | Create a new account (always assigned the `Member` role) |
| POST | `/api/auth/login` | No | Log in — sets the `access_token` cookie |
| POST | `/api/auth/logout` | No | Clears the `access_token` cookie |
| GET | `/api/auth/me` | Yes | Returns the currently logged-in user's info |
| GET | `/api/books`, `/api/books/{id}`, `/api/books/available`, `/api/books/genre/{genre}` | Yes | Browse the catalog |
| POST/PUT/DELETE | `/api/books`, `/api/books/{id}` | Librarian only | Manage the catalog |
| POST | `/api/borrow`, `/api/borrow/return` | Yes | Borrow / return a book (concurrency-safe, see `docs/backend-architecture.md` §4a) |
| GET | `/api/borrow/my-history` | Yes | The caller's own borrow history |
| GET | `/api/borrow/overdue`, `/api/borrow/all`, `/api/borrow/history/{userId}` | Librarian only | System-wide borrow reporting |
| GET | `/api/members`, `/api/members/{id}` | Librarian only | List/view members |
| PUT | `/api/members/{id}` | Librarian only | Edit a member's details |
| PATCH | `/api/members/{id}/deactivate`, `/api/members/{id}/activate` | Librarian only | Block/restore a member's ability to log in and borrow — no delete endpoint, history is preserved |

## Roles

Every user has a single `Role` on `AspNetUsers`: `"Librarian"` or `"Member"`. It's embedded as a
claim in the JWT, so `[Authorize(Roles = "Librarian")]` on any future controller action works
without any extra lookup.

See `docs/backend-architecture.md` for the full endpoint list and build order, and
`docs/database-design.md` for the schema, ER diagram, and design rationale.
