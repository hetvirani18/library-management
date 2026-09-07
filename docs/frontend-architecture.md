# LibraryWebApp Frontend — Architecture Guide

**(Angular · Standalone Components · Signals · TanStack Angular Query · REST API · Zod)**

> This document defines **how frontend code MUST be written**. Follow it exactly.
> It is the Angular counterpart of the Next.js guide this project started from — every section
> below answers "what's the Angular equivalent of X?" for a team already fluent in that guide.
> Companion docs: `docs/backend-architecture.md` (the API this frontend talks to),
> `docs/database-design.md` (schema).

---

## 0. Why Angular Isn't a 1:1 Port of the Next.js Guide

Two things are structurally different, not just renamed, and they change several rules below:

1. **No token in `localStorage`.** The backend deliberately issues the JWT as an `HttpOnly`
   cookie (see `backend-architecture.md` §4) so frontend JavaScript can never read or exfiltrate
   it — that decision was made specifically to block XSS token theft. This means the Angular
   `ApiClient` never attaches an `Authorization` header; it just sends `withCredentials: true` on
   every request and lets the browser carry the cookie automatically. There is no `auth_token` in
   `localStorage` anywhere in this app.
2. **Angular's DI *is* the Context mechanism.** React needs `createContext` + `<AuthProvider>`
   because component state doesn't otherwise cross the tree. Angular services registered
   `providedIn: 'root'` are already app-wide singletons — injecting `AuthService` anywhere gives
   you the same instance, no wrapping component needed. So "React Context" in the original guide
   maps to "a plain injectable service holding signals," not to anything resembling a Context
   Provider.

Everything else — the layering (UI → hooks/queries → services → API client → REST API), Zod at
the service boundary, "server state vs. UI state vs. local state" — carries over directly.

---

## 1. Core Principles (NON-NEGOTIABLE)

### 1.1 Architecture Flow

```
UI (components)  →  Queries (injectQuery/injectMutation)  →  Services  →  ApiClient  →  REST API
```

- **Components never call `ApiClient` or a feature service directly** — always through a query/mutation
- **Query/mutation functions never render UI**
- **Services are plain injectable classes with no template, no signals of their own** — call
  `ApiClient`, Zod-parse the response, return
- **API responses are always validated with Zod at the service layer** — never trust the network

### 1.2 State Ownership

| State type | Tool | Example |
|---|---|---|
| Server data (from API) | TanStack Angular Query (`injectQuery`/`injectMutation`) | Books, borrow records, members |
| Auth session | Signal-based `AuthService` (DI singleton) | Logged-in user, role |
| Global UI state | Signal-based store service | Sidebar open, active dialog |
| Local component state | `signal()` in the component | Input value, dropdown open |
| Form state + validation | Angular Reactive Forms (`FormGroup`) | Form fields, validation errors |

**Never put API data in a UI store service. Never use TanStack Query for UI-only state.**
(Same rule as the Next.js guide — only the tool names changed: Redux → a signal store, TanStack
Query stays TanStack Query.)

---

## 2. Folder Structure

```
src/app/
├── app.config.ts                  # Providers: HttpClient, Router, TanStack Query, auth bootstrap
├── app.routes.ts                  # Top-level route table (equivalent of Next's app/ router)
├── app.ts / app.html              # Root shell — just <router-outlet />
│
├── core/                          # Singleton, app-wide — analogous to Next's lib/ + the
│   │                              # AuthProvider, but as plain injectable services
│   ├── api/
│   │   ├── api-client.ts          # ApiClient — HttpClient wrapper, matches ApiResponse<T>
│   │   └── api-response.types.ts  # ApiResponse<T>, Paginated<T>, Pagination, RequestError
│   └── auth/
│       ├── auth.service.ts        # Signal-based current user/session (the "AuthProvider")
│       ├── auth.guard.ts          # Functional route guards (authed / role-based)
│       └── auth.types.ts          # AuthUser, LoginCredentials, RegisterInput (Zod schemas)
│
├── shared/                        # Reusable, not feature-specific
│   ├── ui/                        # Atoms — Button, Input, Card, Badge... (own folder each)
│   └── components/                # Molecules — header, footer, loading, pagination-controls...
│
├── features/                      # Feature modules — own everything about one domain
│   └── books/
│       ├── data/
│       │   ├── book.types.ts      # Zod schemas + z.infer types (feature-owned)
│       │   └── book.service.ts    # Injectable — calls ApiClient, Zod-parses the response
│       ├── queries/
│       │   └── book.queries.ts    # injectQuery/injectMutation wrappers around the service
│       └── ui/
│           ├── book-card/
│           ├── book-list/
│           └── book-form/
│   (borrow/, members/, dashboard/, auth/ follow the same three-folder shape)
│
├── pages/                         # Routed components — compose features, stay thin
│   ├── home/                      # Public landing page
│   ├── login/, register/
│   ├── librarian/                 # Librarian-only routed pages (dashboard, books, members)
│   └── member/                    # Member-only routed pages (catalog, my-history)
│
└── types/                         # Shared types used by 2+ features
    ├── constants.ts               # API_BASE_URL
    └── common.types.ts            # anything genuinely cross-feature
```

**Rule, same as the Next.js guide:** feature-specific types live in `features/*/data/*.types.ts`.
Something used by 2+ features moves to `types/`. Never import one feature's types into another
feature's folder — if two features need it, it wasn't feature-specific to begin with.

---

## 3. Atomic Design Rules — Angular Terms

### 3.1 Atoms — `shared/ui/`

Pure presentational standalone components. No injected services, no signals beyond `input()`s.

```ts
// shared/ui/button/button.ts — an atom, no business meaning
@Component({
  selector: 'app-button',
  standalone: true,
  template: `<button [type]="type()" [class]="classes()"><ng-content /></button>`,
})
export class ButtonComponent {
  variant = input<'primary' | 'outline' | 'ghost'>('primary');
  type = input<'button' | 'submit'>('button');
}
```

Rules: no injected services, no domain meaning (`Button`, not `BorrowConfirmButton`), reusable
anywhere.

### 3.2 Molecules — `shared/components/` and `features/*/ui/`

One meaningful domain thing, composed of atoms, driven entirely by `input()`s. No injected
services.

```ts
// features/books/ui/book-card/book-card.ts
@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './book-card.html',
})
export class BookCardComponent {
  book = input.required<Book>();
}
```

Rules: no `injectQuery`, no `ApiClient`, no feature service — just `input()`s and template logic.
Can have local `signal()` for pure UI state (an "expanded" toggle, etc.).

> **No injected query/service → Molecule**

### 3.3 Organisms — feature components that inject a query

A component that calls `injectQuery`/`injectMutation` or a feature service directly.

```ts
// features/books/ui/book-list/book-list.ts
@Component({
  selector: 'app-book-list',
  standalone: true,
  imports: [BookCardComponent],
  templateUrl: './book-list.html',
})
export class BookListComponent {
  private readonly booksQuery = injectQuery(() => bookListQueryOptions());
  readonly books = computed(() => this.booksQuery.data()?.data ?? []);
  readonly isLoading = this.booksQuery.isPending;
}
```

Rules: owns loading/empty/error states, loops over query data, never talks to `ApiClient`
directly — always through the feature's `queries/` file.

> **Injects a query or service → Organism**

### 3.4 Pages — `pages/**`

Routed components. Compose organisms, read route params, apply guards. No reusable UI logic of
their own.

```ts
// pages/librarian/books/books-page.ts
@Component({
  selector: 'app-books-page',
  standalone: true,
  imports: [BookListComponent],
  template: `<app-book-list />`,
})
export class BooksPageComponent {}
```

---

## 4. API Client — `core/api/api-client.ts`

The single typed HTTP client for the entire app — every request goes through it.

```ts
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(endpoint: string) { return this.request<T>('GET', endpoint); }
  post<T>(endpoint: string, body: unknown) { return this.request<T>('POST', endpoint, body); }
  // ...put, patch, delete follow the same shape

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const request$ = this.http.request<ApiResponse<T>>(method, url, { body, withCredentials: true })
      .pipe(catchError((error: HttpErrorResponse) => {
        const apiError = (error.error as ApiResponse<T> | null)?.error;
        return throwError(() => new RequestError(apiError?.message ?? 'Request failed', apiError?.code ?? 0, error.status));
      }));
    return firstValueFrom(request$);
  }
}
```

Notes that differ from the Next.js example on purpose:

- **`withCredentials: true`**, not an `Authorization` header built from `localStorage` — see §0.
- **Response shape matches our real backend exactly** (`ApiResponse<T>` = `{ success, message,
  data, error, timestamp }`, not the `{ data, message, code }` shape from the pasted Next.js
  example — that was a different backend's contract). See `backend-architecture.md`.
- **`firstValueFrom`** turns Angular's native `Observable` return into a `Promise`, so services and
  TanStack Query's `queryFn`/`mutationFn` (which are Promise-based) can use it directly without any
  RxJS knowledge leaking into the feature layer.

---

## 5. Types with Zod

Identical philosophy to the Next.js guide — Zod is framework-agnostic, so this section barely
changes. **All API data types are Zod schemas with `z.infer<>` — never a hand-written
`interface` for something that comes over the network.**

```ts
// features/books/data/book.types.ts
export const BookSchema = z.object({
  bookId: z.number(),
  title: z.string(),
  isbn: z.string(),
  genre: z.string(),
  authorName: z.string(),
  totalCopies: z.number(),
  availableCopies: z.number(),
});
export type Book = z.infer<typeof BookSchema>;

export interface CreateBookInput {
  title: string;
  isbn: string;
  genre: string;
  authorName: string;
  totalCopies: number;
}
```

### Pagination — matches the backend's real cursor shape exactly

```ts
// core/api/api-response.types.ts
export interface Pagination {
  hasNext: boolean;
  nextCursor: number | null;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export function withPagination<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    data: z.array(schema),
    pagination: z.object({ hasNext: z.boolean(), nextCursor: z.number().nullable() }),
  });
}
```

`nextCursor` is `number | null` (an **offset**, not an entity ID — see `backend-architecture.md`
§3's pagination note for why). Every paginated list in the UI passes the last response's
`nextCursor` back as the next request's `cursor` — this is what makes an infinite-scroll /
"load more" UI trivial to build against this API.

---

## 6. Services — `features/*/data/*.service.ts`

Plain injectable classes. Call `ApiClient`, Zod-parse, return. No signals, no state, no UI.

```ts
// features/books/data/book.service.ts
@Injectable({ providedIn: 'root' })
export class BookService {
  private readonly api = inject(ApiClient);

  async list(cursor: number, limit: number): Promise<Paginated<Book>> {
    const result = await this.api.get<unknown>(`/books?cursor=${cursor}&limit=${limit}`);
    return withPagination(BookSchema).parse(result.data);
  }

  async search(query: string, cursor: number, limit: number): Promise<Paginated<Book>> {
    const result = await this.api.get<unknown>(`/books/search?q=${encodeURIComponent(query)}&cursor=${cursor}&limit=${limit}`);
    return withPagination(BookSchema).parse(result.data);
  }

  async create(input: CreateBookInput): Promise<Book> {
    const result = await this.api.post<unknown>('/books', input);
    return BookSchema.parse(result.data);
  }

  async remove(bookId: number): Promise<void> {
    await this.api.delete(`/books/${bookId}`);
  }
}
```

---

## 7. TanStack Angular Query — `features/*/queries/*.queries.ts`

The Angular port of TanStack Query (`@tanstack/angular-query-experimental`) — `injectQuery` and
`injectMutation` are the direct equivalents of `useQuery`/`useMutation`. Query functions still
live in a dedicated `queries/` file per feature, exactly mirroring the Next.js guide's
`hooks/index.ts` convention — just renamed since Angular doesn't call these "hooks."

### 7.1 Provider Setup — `app.config.ts`

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideTanStackQuery(new QueryClient({
      defaultOptions: {
        queries: { staleTime: 1000 * 60 * 5, gcTime: 1000 * 60 * 30, retry: 1 },
      },
    })),
    { provide: APP_INITIALIZER, useFactory: initializeAuth, multi: true },
  ],
};
```

`APP_INITIALIZER` calls `AuthService.bootstrap()` — a `GET /api/auth/me` — before the app renders,
so a page refresh correctly restores the logged-in state from the `HttpOnly` cookie (there's no
token in `localStorage` to check for presence; the only way to know "am I logged in" is to ask
the server).

### 7.2 Query Functions

```ts
// features/books/queries/book.queries.ts
export function bookListQueryOptions(cursor = 0, limit = 20) {
  const bookService = inject(BookService);
  return {
    queryKey: ['books', 'list', cursor, limit] as const,
    queryFn: () => bookService.list(cursor, limit),
  };
}
```

```ts
// in an organism component
private readonly booksQuery = injectQuery(() => bookListQueryOptions(this.cursor()));
readonly books = computed(() => this.booksQuery.data()?.data ?? []);
readonly hasNext = computed(() => this.booksQuery.data()?.pagination.hasNext ?? false);
```

### 7.3 Mutations — update the cache directly, same as the Next.js guide

```ts
export function useCreateBookMutation() {
  const bookService = inject(BookService);
  const queryClient = injectQueryClient();

  return injectMutation(() => ({
    mutationFn: (input: CreateBookInput) => bookService.create(input),
    onSuccess: (newBook) => {
      queryClient.setQueryData(['books', 'list'], (old?: Paginated<Book>) =>
        old ? { ...old, data: [newBook, ...old.data] } : old,
      );
    },
  }));
}
```

### 7.4 Rules

- Same as the Next.js guide: `?? []` for arrays (`computed(() => query.data()?.data ?? [])`),
  always expose `isPending`/`isError` alongside data, name mutation triggers as verbs
- `staleTime` by data volatility: overdue reports `0` (always fresh), book catalog
  `5 * 60 * 1000` (5 min), dashboard stats `1 * 60 * 1000` (1 min)
- Prefer `setQueryData` over `invalidateQueries` when you already have the server's response —
  avoids a redundant round-trip

---

## 8. Auth — Signal-Based Service (Angular's "Context")

```ts
// core/auth/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);
  private readonly currentUserSignal = signal<AuthUser | null>(null);
  private readonly isLoadingSignal = signal(true);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUserSignal() !== null);
  readonly isLibrarian = computed(() => this.currentUserSignal()?.role === 'Librarian');
  readonly isMember = computed(() => this.currentUserSignal()?.role === 'Member');

  async bootstrap() {
    try {
      const response = await this.api.get<AuthUser>('/auth/me');
      this.currentUserSignal.set(response.data ? AuthUserSchema.parse(response.data) : null);
    } catch {
      this.currentUserSignal.set(null);
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  async login(credentials: LoginCredentials) {
    const response = await this.api.post<AuthUser>('/auth/login', credentials);
    const user = AuthUserSchema.parse(response.data);
    this.currentUserSignal.set(user);
    return user;
  }

  async logout() {
    await this.api.post('/auth/logout', {});
    this.currentUserSignal.set(null);
  }
}
```

No `<AuthProvider>` wrapper component exists or is needed — `providedIn: 'root'` already makes
this one instance, shared everywhere, injectable from any component or guard.

### Route Guards — `core/auth/auth.guard.ts`

```ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/login']);
};

export function roleGuard(role: Role): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.currentUser()?.role === role || router.createUrlTree(['/']);
  };
}
```

Used in `app.routes.ts`:

```ts
{ path: 'librarian', canActivate: [authGuard, roleGuard('Librarian')], loadChildren: () => ... }
```

---

## 9. Global UI State — Signal Store, Not NgRx

For UI-only state that isn't server data (sidebar open, active dialog) — a plain injectable
service with signals is enough at this app's scale. No NgRx/Redux needed; adding one would be
pure ceremony for a feature list this size.

```ts
// core/ui/ui-store.service.ts
@Injectable({ providedIn: 'root' })
export class UiStore {
  private readonly sidebarOpenSignal = signal(true);
  private readonly activeDialogSignal = signal<string | null>(null);

  readonly sidebarOpen = this.sidebarOpenSignal.asReadonly();
  readonly activeDialog = this.activeDialogSignal.asReadonly();

  toggleSidebar() { this.sidebarOpenSignal.update((v) => !v); }
  openDialog(id: string) { this.activeDialogSignal.set(id); }
  closeDialog() { this.activeDialogSignal.set(null); }
}
```

If this app ever needs NgRx-grade tooling (time-travel debugging, complex derived state graphs
across many stores), swap this file for `@ngrx/signals`' `signalStore` — same consuming code
shape, more machinery underneath. Not needed yet.

---

## 10. Styling Rules (STRICT) — Same Rules, Tailwind Stays Tailwind

Identical rules to the Next.js guide, unchanged, because Tailwind's discipline doesn't care what
framework renders the HTML:

- No inline `[style]` bindings
- No hardcoded colors (`text-[#3b82f6]`) — everything through `@theme` tokens in `styles.css`
- No arbitrary text sizes (`text-[13px]`) — use the standard scale (`text-xs`/`text-sm`/etc.)
- `cn()`-equivalent for conditional classes — Angular's `[class]="cn(...)"` binding, same
  `clsx`/`tailwind-merge` combo

Design tokens live in `src/styles.css`, using Tailwind v4's `@theme` directive (v4 doesn't need a
separate `tailwind.config.js` for simple token definitions — CSS variables *are* the config). One
extra layer of indirection makes dark mode work: `@theme` doesn't hold literal values — it maps
Tailwind's color names onto plain CSS custom properties, which are what actually get redefined per
theme:

```css
@import "tailwindcss";

:root {
  --background: oklch(98.2% 0.006 85);
  --foreground: oklch(21% 0.02 60);
  --primary: oklch(62% 0.15 55);
  /* ...every token, light values */
}

:root[data-theme="dark"] {
  --background: oklch(19% 0.014 60);
  --foreground: oklch(95% 0.01 80);
  --primary: oklch(72% 0.15 58);
  /* ...same token names, dark values */
}

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  /* ... */
  --font-serif: "Newsreader", ui-serif, Georgia, serif;
  --font-sans: "Manrope", ui-sans-serif, system-ui, sans-serif;
}
```

Colors are defined in **OKLCH**, not hex — same hue/chroma carried between the light and dark
value of each token (only lightness shifts), so the two themes read as the same palette rather
than an unrelated dark-mode reskin. A `@media (prefers-color-scheme: dark)` block (guarded with
`:not([data-theme="light"])`) mirrors the dark values, so a first-time visitor who hasn't toggled
anything still gets their OS preference honored — see `core/theme/theme.service.ts` for the
signal-based service that flips `data-theme` and persists the choice to `localStorage` (a
per-viewer UI preference, not sensitive data — unlike auth, this is exactly the kind of thing
`localStorage` is fine for).

**Fonts are self-hosted via `@fontsource/*` packages, not a Google Fonts `<link>`.** Same visual
result, but the page doesn't depend on a third-party CDN being reachable at render time, and the
font files ship in the app's own bundle.

---

## 11. Animations — Library-Driven, Not Hand-Written

Same principle as the Next.js guide's Image rules (§11 there): **use a library's declarative API,
never hand-write keyframes/timing curves.** This project uses **AOS (Animate On Scroll)** for
scroll-reveal effects — attribute-driven, zero custom CSS:

```html
<h1 data-aos="fade-up">Your library, organized</h1>
<div data-aos="fade-up" data-aos-delay="100">...</div>
```

```ts
constructor() {
  afterNextRender(() => {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
  });
}
```

`afterNextRender` (not `ngOnInit`) is the Angular-idiomatic place for browser-only side effects
like this — it's guaranteed to run after the DOM exists, and (unlike `ngOnInit`) would be skipped
correctly on a server-rendered pass if SSR is ever added later.

If a future screen needs more than scroll-reveal (drag interactions, complex sequenced
timelines), reach for a library there too rather than hand-authoring it — GSAP is the natural
next tool, same "config in, animation out" philosophy.

---

## 12. TypeScript Patterns

Unchanged from the Next.js guide — none of these rules are React-specific:

- Zod-inferred types only for API data, never a duplicate hand-written `interface`
- `array.at(0)` over `array[0] as T | undefined`
- Every query/signal that exposes a list guarantees `?? []` — components never null-check
- Enums enforced at both type level and runtime via `z.enum(...)`
- `unknown` + narrowing, never `any`

---

## 13. Form Handling — Angular Reactive Forms Replace "Form Hooks"

The Next.js guide's `useCreateArticleForm()` pattern (state + validation + handlers bundled in a
hook) doesn't need reinventing in Angular — **Reactive Forms already are that pattern**, built
into the framework:

```ts
// features/books/ui/book-form/book-form.ts
@Component({ ... })
export class BookFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly createBook = useCreateBookMutation();

  form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    isbn: ['', Validators.required],
    genre: ['', Validators.required],
    authorName: ['', Validators.required],
    totalCopies: [1, [Validators.required, Validators.min(0)]],
  });

  async submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    await this.createBook.mutateAsync(this.form.getRawValue());
  }
}
```

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <label>Title</label>
  <input formControlName="title" [class.border-destructive]="form.controls.title.invalid && form.controls.title.touched" />
  @if (form.controls.title.invalid && form.controls.title.touched) {
    <p class="text-sm text-destructive">Title is required</p>
  }
  ...
</form>
```

`FormGroup`'s own `.invalid`/`.touched`/`.errors` replace the hand-rolled `ArticleFormErrors`
type and `validate()` function from the Next.js guide — the validation state is already there,
no extra bookkeeping needed.

---

## 14. Loading States

Same convention as the Next.js guide — one shared skeleton component, never raw spinner markup
inlined in an organism.

```ts
// shared/components/loading-card/loading-card.ts
@Component({
  selector: 'app-loading-card',
  standalone: true,
  template: `
    <div class="overflow-hidden rounded-lg bg-card p-4">
      <div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
      <div class="mt-2 h-3 w-1/4 animate-pulse rounded bg-muted"></div>
    </div>
  `,
})
export class LoadingCardComponent {}
```

```html
@if (isLoading()) {
  @for (i of [1,2,3,4,5,6]; track i) { <app-loading-card /> }
} @else if (!books().length) {
  <app-empty-state message="No books found." />
} @else {
  @for (book of books(); track book.bookId) { <app-book-card [book]="book" /> }
}
```

---

## 15. Decision Cheatsheet

| Question | Answer |
|---|---|
| One domain item UI, no injected service? | Molecule |
| Injects a query or feature service? | Organism |
| Pure UI primitive (Button, Input)? | Atom (`shared/ui/`) |
| Fetches or mutates data? | Query/mutation function + Service |
| Routed view? | Page (`pages/`) |
| Server data (API response)? | TanStack Angular Query |
| Auth session, logged-in user? | `AuthService` (signal-based DI singleton) |
| Sidebar open, active dialog? | Signal store service |
| Local component toggle/value? | `signal()` in the component |
| Types for API data? | Zod schema + `z.infer<>` |
| Scroll/entrance animation? | AOS attribute, not hand-written CSS |

---

## 16. What NOT to Do

**Architecture**
- `ApiClient` or a feature service called directly from a component template/class — always
  through a query/mutation
- A query function that touches the DOM or returns a template
- Business logic duplicated across Librarian/Member pages — branch on `authService.isLibrarian()`
  once, share the rest
- API data living in `UiStore` / a signal store meant for UI-only state

**Types**
- Importing a type from one feature into another feature's folder
- A hand-written `interface` for anything that comes from the API — Zod schema + `z.infer<>` only
- `array[0] as T | undefined` — use `.at(0)`
- A query/signal returning `undefined` for a list — always `?? []`
- `any` — use `unknown` and narrow it

**Auth**
- Reading a token out of `localStorage`/`sessionStorage` — there isn't one; the cookie is
  `HttpOnly` on purpose (§0)
- Attaching a manual `Authorization` header — `withCredentials: true` is the entire story

**Styling**
- `[style]` inline bindings
- Hardcoded color values instead of `@theme` tokens
- Arbitrary text sizes (`text-[13px]`) — use the Tailwind scale

**Animations**
- Hand-written `@keyframes` / manual `requestAnimationFrame` loops for entrance/scroll effects —
  use AOS (or GSAP for anything more complex) instead

**TanStack Query**
- Calling a feature service directly from a component — always through `queries/`
- Skipping Zod parsing in the service — that's the one place a backend shape change gets caught
  immediately instead of silently breaking the UI
- `invalidateQueries` when `setQueryData` already has everything needed — the extra round-trip is
  wasted

---

## 17. Final Rule

> **Feature types live with the feature — shared types live in `types/`**
> **Network calls live in Services**
> **Server state lives in TanStack Angular Query**
> **Auth lives in a signal-based `AuthService`, injected — not a Context Provider**
> **UI-only state lives in a signal store service**
> **Local state lives in `signal()`**
> **Meaning lives in Molecules**
> **Logic lives in Organisms**
> **Animation lives in a library, never hand-authored**

Follow these rules and the codebase stays exactly as clean and predictable in Angular as the
original guide made it in Next.js — the tools changed, the discipline didn't.
