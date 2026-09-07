# LibraryWebApp Backend — Architecture

> Companion to **`README.md`** (setup, how to run, secrets). That file gets you running; this
> document defines **what** the backend is: the full folder tree, every module and endpoint
> (built and planned), the error-code catalog, the auth mechanism, and the remaining build order.
> Schema source of truth: `docs/database-design.md`.

---

## 1. Stack

ASP.NET Core Web API (.NET 8, controller-based) · PostgreSQL · Entity Framework Core (code-first,
migrations) · ASP.NET Core Identity (password hashing, user store) · JWT (`System.IdentityModel.Tokens.Jwt`),
delivered as an `HttpOnly` cookie, not a bearer header · no Result/wrapper type — `throw AppException`
+ a single global error-handling middleware, same shape as GlobeTrotter's `AppError`/`asyncHandler`
pattern, adapted to ASP.NET Core's own exception-propagation model (no `asyncHandler` needed —
unhandled exceptions in a controller already propagate to middleware automatically).

---

## 2. Folder Structure

```
backend/
├── Program.cs                              # Bootstrap: DB + Identity + JWT + CORS + Swagger
│                                            # registration, runs pending migrations + seeding,
│                                            # builds the middleware pipeline
├── Controllers/
│   ├── AuthController.cs                   # register, login, logout, me
│   ├── BooksController.cs                  # catalog CRUD
│   ├── BorrowController.cs                 # borrow, return, overdue report, history
│   └── MembersController.cs                # Librarian: list/edit/deactivate/activate members
├── Models/                                 # EF Core entities — define the DB schema
│   ├── ApplicationUser.cs                  # extends IdentityUser: FullName, MembershipDate,
│   │                                        # IsActive, Role
│   ├── Book.cs
│   └── BorrowRecord.cs
├── DTOs/
│   ├── AuthDtos.cs                         # RegisterRequest, LoginRequest, AuthResponse
│   ├── BookDtos.cs                         # CreateBookRequest, UpdateBookRequest, BookResponse
│   ├── BorrowDtos.cs                       # BorrowBookRequest, ReturnBookRequest, BorrowRecordResponse
│   └── MemberDtos.cs                       # UpdateMemberRequest, MemberResponse
├── Data/
│   ├── ApplicationDbContext.cs             # DbSets + relationship configuration
│   └── DbSeeder.cs                         # seeds the default librarian account on startup
├── Repositories/                           # data-access layer for Book/BorrowRecord.
│   │                                        # AuthController still talks directly to Identity's
│   │                                        # UserManager instead of a repository, since
│   │                                        # UserManager already *is* the data-access
│   │                                        # abstraction for AspNetUsers.
│   ├── IBookRepository.cs / BookRepository.cs
│   └── IBorrowRecordRepository.cs / BorrowRecordRepository.cs
├── Common/
│   ├── AppException.cs                     # AppException class + the Errors catalog
│   └── ApiResponse.cs                      # success/error JSON envelope every endpoint returns
├── Middleware/
│   └── ErrorHandlingMiddleware.cs          # global catch — AppException → typed JSON error;
│                                            # anything else → generic 500
├── Services/
│   ├── TokenService.cs                     # builds and signs the JWT issued on login/register
│   └── BorrowService.cs                    # borrow/return business rules — see §4a for the
│                                            # transaction + row-locking strategy that prevents
│                                            # two people borrowing the last copy of a book at once
├── Migrations/                             # EF Core's generated migration history
└── appsettings*.json                       # non-secret config only — see README "Secrets"
```

---

## 3. Module Inventory & API Endpoints

All routes mount under `/api/...` via controller attribute routing (`[Route("api/[controller]")]`
+ `[HttpGet]`/`[HttpPost]`/etc. per action — no separate routes files, see README §"How the backend
is put together"). Every response uses the `ApiResponse<T>` envelope.

### 3.1 Auth — `/api/auth` — ✅ built

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | public | Create account (name, email, password) → always assigned `Member` role → sets `access_token` cookie |
| POST | `/login` | public | Verify credentials → sets `access_token` cookie |
| POST | `/logout` | public | Clears the `access_token` cookie |
| GET | `/me` | authed | Returns the logged-in user's own info, read from the JWT's `sub` claim |

### 3.2 Books — `/api/books` — ✅ built

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/` | authed | List the catalog (any logged-in user — Librarian or Member) |
| GET | `/:id` | authed | Single book detail |
| GET | `/available` | authed | Books with `AvailableCopies > 0` |
| GET | `/genre/:genre` | authed | Filter by genre |
| POST | `/` | Librarian only | Add a book |
| PUT | `/:id` | Librarian only | Edit a book's details |
| DELETE | `/:id` | Librarian only | Remove a book — blocked (`BookHasActiveBorrows`) if it has any borrow history, active or returned (the DB FK is RESTRICT, not just an app-level check) |

### 3.3 Borrowing — `/api/borrow` — ✅ built

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/` | authed | Borrow a book (bookId) — the member is always the caller (from the JWT), never a body param, so a Member can't borrow on someone else's behalf |
| POST | `/return` | authed | Return a book (bookId) — matches the caller's own active borrow record |
| GET | `/my-history` | authed | The caller's own borrow history (past + active) |
| GET | `/overdue` | Librarian only | Every overdue record, system-wide |
| GET | `/all` | Librarian only | Every borrow record, system-wide |
| GET | `/history/:userId` | Librarian only | Any specific member's borrow history |

### 3.4 Members — `/api/members` — ✅ built

The Librarian-facing "list/manage members" screen — endpoints beyond what `AuthController` covers
(`register`/`login` only manage the *caller's own* account). Deliberately **no delete endpoint**:
members are deactivated, never removed — same "never destroy historical data" reasoning as the
`Books` delete-block (§3.2), and it preserves their borrow history intact. A deactivated member is
blocked from logging in (`Errors.AccountDeactivated`) and from borrowing (`BorrowService` checks
`IsActive`), but can still return books they already have out.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/members` | Librarian only | List every member (`Role == "Member"`) |
| GET | `/api/members/:id` | Librarian only | Single member detail |
| PUT | `/api/members/:id` | Librarian only | Edit a member's `FullName`/`Email` |
| PATCH | `/api/members/:id/deactivate` | Librarian only | Sets `IsActive = false` |
| PATCH | `/api/members/:id/activate` | Librarian only | Sets `IsActive = true` |

---

## 4. Auth

**Access token only, no refresh token** — same as GlobeTrotter's pattern. One JWT, set by the
backend as an `HttpOnly` cookie on register/login, read by ASP.NET Core's JWT bearer middleware on
every subsequent request via a custom `OnMessageReceived` hook (it reads `Request.Cookies["access_token"]`
instead of an `Authorization` header). The token is never included in the JSON response body — the
frontend never sees or handles it directly, it's just carried automatically by the browser as a
cookie. Logout clears the cookie (`Response.Cookies.Delete("access_token")`); there is no
token-rotation or refresh endpoint.

```
// JWT claims
sub          → user.Id
email        → user.Email
fullName     → user.FullName
role         → user.Role   ("Librarian" | "Member")
```

- `POST /api/auth/register` — checks email uniqueness (`Errors.EmailAlreadyExists`), Identity's
  `UserManager.CreateAsync` hashes the password, always assigns `Role = "Member"`, sets the cookie,
  returns `{ userId, fullName, email, role }` (no token in the body).
- `POST /api/auth/login` — `UserManager.CheckPasswordAsync` verifies credentials, throws
  `Errors.InvalidCredentials` on any mismatch (same error whether the email doesn't exist or the
  password is wrong — never leak which one), throws `Errors.AccountDeactivated` if `IsActive` is
  false, sets the cookie.
- `POST /api/auth/logout` — clears the cookie, no body needed.
- `[Authorize]` on a controller action requires a valid, non-expired JWT (from the cookie).
  `[Authorize(Roles = "Librarian")]` additionally requires the JWT's role claim to match — reads
  straight off the token, no extra DB lookup, since `Role` is baked into the JWT at login time.
- Ownership checks (e.g. "is this borrow record the caller's own") happen in the **controller**,
  reading the user's ID from `User.FindFirst(ClaimTypes.NameIdentifier)` — not the database, not
  middleware.
- Cookie flags: `HttpOnly = true` (frontend JS can never read it — mitigates XSS token theft),
  `SameSite = Lax`, `Secure` set dynamically from `Request.IsHttps` (true once behind HTTPS),
  8-hour expiry matching the JWT's own `exp` claim.

---

## 4a. Concurrency Safety — Borrow/Return

The obvious naive implementation of "borrow a book" — read `AvailableCopies`, check it's `> 0` in
C#, then write `AvailableCopies - 1` — has a race condition: two concurrent requests can both read
`AvailableCopies == 1`, both pass the check, and both decrement, leaving the count at `-1` and two
people holding a "borrowed" record for a book with zero real copies. `BorrowService` avoids this
with a single atomic conditional `UPDATE`, executed via `ExecuteSqlInterpolatedAsync` in
`BookRepository.TryDecrementAvailableCopiesAsync`:

```sql
UPDATE "Books" SET "AvailableCopies" = "AvailableCopies" - 1
WHERE "BookId" = @bookId AND "AvailableCopies" > 0
```

PostgreSQL takes a row lock on the matched `Books` row for the statement's duration. If two
requests hit this at the same moment, the second blocks until the first's transaction commits (or
rolls back), then re-evaluates `WHERE "AvailableCopies" > 0` against the now-updated row — so if
the first request took the last copy, the second's `WHERE` clause fails and the statement affects
**0 rows**. `BorrowService.BorrowBookAsync` checks that rows-affected count and throws
`Errors.NoAvailableCopies` when it's 0. No separate `SELECT ... FOR UPDATE` is needed — the
conditional `UPDATE` *is* the lock.

This runs inside an explicit `_context.Database.BeginTransactionAsync()`, alongside the
`BorrowRecord` insert, so a failure partway through (e.g. the insert fails after a successful
decrement) rolls back both together rather than leaving `AvailableCopies` decremented with no
matching record. `ReturnBookAsync` uses the identical pattern in reverse — a conditional `UPDATE`
on `BorrowRecords` (`SET "ReturnedAt" = now() WHERE "RecordId" = @id AND "ReturnedAt" IS NULL`) so
two concurrent "return" calls for the same borrow can't both succeed and double-increment
`AvailableCopies`.

Verified under real concurrency, not just reasoned about: two members were registered, a book was
seeded with `TotalCopies = 1`, and two genuinely parallel `POST /api/borrow` requests were fired
at once. One received `200` and the borrow record; the other received `409 NoAvailableCopies`; the
book's `AvailableCopies` landed at exactly `0`, never `-1`.

---

## 5. Error Catalog

`1xxxx` common, `2xxxx` auth, `3xxxx` library domain — same numbering convention as GlobeTrotter's
`ERRORS`, defined once in `Common/AppException.cs`'s `Errors` static class. Controllers `throw
Errors.SomeError;` — never construct an `AppException` inline.

| Code | Name | HTTP | Meaning |
|---|---|---|---|
| 10002 | `ValidationFailed` | 422 | Request failed data-annotation validation |
| 10003 | `ResourceNotFound` | 404 | Generic not-found fallback |
| 10004 | `RouteNotFound` | 404 | No matching route |
| 20001 | `NoTokenProvided` | 401 | Protected route hit with no `access_token` cookie |
| 20002 | `InvalidAuthToken` | 401 | Token present but invalid/expired/tampered |
| 20003 | `EmailAlreadyExists` | 409 | Register with an email already in use |
| 20004 | `InvalidCredentials` | 401 | Login with a wrong email/password combination |
| 20005 | `AccountDeactivated` | 401 | Login attempt on an `IsActive = false` account |
| 20006 | `AdminOnlyRoute` | 403 | Member hit a Librarian-only endpoint |
| 30001 | `BookNotFound` | 404 | Invalid `BookId` |
| 30002 | `MemberNotFound` | 404 | Invalid member/user ID |
| 30003 | `NoAvailableCopies` | 409 | Borrow attempted with `AvailableCopies == 0` |
| 30004 | `BookNotBorrowed` | 409 | Return attempted with no matching active borrow record |
| 30005 | `BookHasActiveBorrows` | 409 | Delete-book attempted on a book with any borrow history (RESTRICT FK, not just active borrows) |

Every code above already exists in `Common/AppException.cs`, whether or not the endpoint that
throws it has been built yet (`30001`–`30005` are ready and waiting for `BooksController`/
`BorrowController`).

---

## 6. What This Project Deliberately Doesn't Have

Unlike GlobeTrotter, this backend has no external API integrations (no city/activity/pricing
providers, no email service) — the Library domain doesn't need any. If a "notify member their book
is overdue" email feature is ever added, it would follow GlobeTrotter's `email.service.js` pattern
exactly: a single-provider service, no fallback, failure logged but never blocking the calling
endpoint's success response.

---

## 7. Build Order

1. ~~Skeleton~~ — Program.cs, Common/ (AppException + ApiResponse), Middleware/ErrorHandlingMiddleware — **done**
2. ~~Database + migrations~~ — Models/, ApplicationDbContext, InitialCreate + SwitchToRoleColumn migrations — **done**
3. ~~Auth~~ — register/login/logout/me, JWT as an `HttpOnly` cookie, role claim, CORS for the future frontend — **done**
4. ~~Repositories~~ — `IBookRepository`/`BookRepository`, `IBorrowRecordRepository`/`BorrowRecordRepository` — **done**
5. ~~Books~~ — `BooksController` (§3.2), Librarian-only writes via `[Authorize(Roles = "Librarian")]` — **done**
6. ~~Borrowing~~ — `BorrowController` (§3.3) + `BorrowService`: borrow/return with transaction + row-locking (§4a), overdue report, history — **done**
7. ~~Members~~ — `/api/members` (§3.4) for Librarian member management — **done**
8. **Frontend** — Angular app in `frontend/`, wired against everything above — backend v1 is functionally complete
