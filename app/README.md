# CSGTest — Hello World App

Next.js application for the PagerDuty CSG Innovation Team DevOps take-home exercise. A greeting board where visitors leave their name and the app records who said hello, when, from where, and their IP address.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, standalone output) |
| Language | TypeScript (strict mode) |
| Database | PostgreSQL 15 |
| ORM | Prisma (with auto-migrations on startup) |
| Styling | Tailwind CSS 4 + custom CSS variables |
| Anti-bot | Google reCAPTCHA v2 |
| Runtime | Node.js 20 Alpine |

## Project Structure

```
app/
├── prisma/
│   ├── schema.prisma          # Prisma data model
│   └── migrations/            # SQL migration history
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout (DM Sans + Geist Mono fonts)
│   │   ├── page.tsx           # Landing page — "Hello, World!"
│   │   ├── actions.ts         # Server Actions — getGreetings / createGreeting
│   │   ├── globals.css        # Theme variables, animations, global styles
│   │   └── __tests__/         # Unit tests for server actions
│   ├── components/
│   │   ├── greeting-form.tsx  # Client component — form, reCAPTCHA, greetings table
│   │   └── __tests__/         # Unit tests for components
│   ├── lib/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── recaptcha.ts       # Server-side reCAPTCHA verification
│   │   └── __tests__/         # Unit tests for lib utilities
│   └── generated/prisma/      # Auto-generated Prisma client (gitignored)
├── Dockerfile                 # Production — multi-stage, hardened, non-root
├── Dockerfile.dev             # Development — hot-reload with volumes
├── jest.config.js             # Jest config (server + client projects)
├── eslint.config.mjs          # ESLint config (Next.js + Jest + Testing Library)
├── package.json
├── tsconfig.json
└── next.config.ts             # Standalone output mode
```

## Data Model

```
Greeting
├── id          Int       @id @autoincrement
├── name        String    — who said hello (max 255 chars)
├── ipAddress   String    — visitor's IP address
├── location    String?   — geographic location (derived from IP)
└── createdAt   DateTime  — timestamp with timezone
```

Mapped to the `greetings` table in PostgreSQL via Prisma.

## Server Actions

The app uses Next.js Server Actions (RPC over HTTP) instead of REST API routes. Defined in `src/app/actions.ts`:

### `getGreetings()`

Returns all greetings ordered by most recent first.

```ts
const greetings: Greeting[] = await getGreetings();
// [{ name, createdAt, ipAddress, location }]
```

### `createGreeting(name, recaptchaToken)`

Creates a new greeting. Validates input, verifies reCAPTCHA (when configured), extracts the visitor's IP and geolocation, then stores the record.

```ts
const result: ActionResult = await createGreeting("Oscar", captchaToken);
// { greetings: [...] } on success
// { error: "Name is required", greetings: [] } on failure
```

| Validation | Error |
|------------|-------|
| Empty or whitespace name | `"Name is required"` |
| Name exceeds 255 characters | `"Name is too long"` |
| reCAPTCHA token invalid | `"reCAPTCHA verification failed"` |

## Local Development

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### Quick Start

```bash
# From the repo root — installs deps, runs lint & tests, starts containers
./setup.sh

# Or manually:
docker compose up --build

# App available at http://localhost:3000
```

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `app` | Built from `./app` (Dockerfile.dev) | 3000 | Next.js dev server with hot-reload |
| `db` | `postgres:15-alpine` | 5432 | PostgreSQL database |

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string or Secrets Manager JSON | Yes |
| `RECAPTCHA_SITE_KEY` | Google reCAPTCHA v2 site key (public) | No |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v2 secret key | No |
| `NODE_ENV` | `development` or `production` | No |
| `PORT` | Server port (default: 3000) | No |

When `RECAPTCHA_SITE_KEY` is not set, the captcha widget is hidden and verification is bypassed.

### Database Migrations

Prisma migrations run automatically when the container starts. To manage them manually:

```bash
# Generate a new migration after editing schema.prisma
npx prisma migrate dev --name describe_your_change

# Apply pending migrations (production)
npx prisma migrate deploy

# Reset database (development only — destroys all data)
npx prisma migrate reset

# Open Prisma Studio (visual DB editor)
npx prisma studio
```

## Testing

Unit tests use Jest with ts-jest, split into two projects:

| Project | Environment | Scope |
|---------|-------------|-------|
| `server` | Node | Server actions (`actions.ts`), utilities (`recaptcha.ts`) |
| `client` | jsdom | React components (`greeting-form.tsx`) |

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Run lint
pnpm lint
```

### Test coverage

- **recaptcha.ts** — bypass when no secret, success/failure responses
- **actions.ts** — input validation, reCAPTCHA integration, IP extraction, local IP detection (7 variants), geolocation lookup, name trimming
- **greeting-form.tsx** — render, fetch on mount, form submission, error handling, captcha gating, avatar rendering

### Git hooks (Husky)

A `pre-push` hook runs `pnpm lint && pnpm test` from the `app/` directory before every push. If either fails, the push is blocked.

## Production Docker Image

Multi-stage build with security hardening:

- **Stage 1 (deps):** Install dependencies
- **Stage 2 (builder):** Generate Prisma client, build Next.js
- **Stage 3 (runner):** Minimal Alpine image
  - Non-root user (`nextjs:nodejs`, UID 1001)
  - `dumb-init` as PID 1 for signal handling
  - Standalone output — no `node_modules` bloat
  - Read-only filesystem support (only `.next/cache` writable)
  - Prisma migrations run before the server starts

## Design

Light theme with a professional blue palette:

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#F0F5FB` | Page background |
| `--foreground` | `#1A2535` | Primary text |
| `--primary` | `#4A7EC0` | Main blue — buttons, links |
| `--accent` | `#D4846A` | Warm terracotta — errors, highlights |
| `--surface` | `#FFFFFF` | Card/panel backgrounds |
| `--border` | `#DDE5EF` | Borders, dividers |
| `--sage` | `#5A6B7D` | Secondary/muted text |

Fonts: **DM Sans** (headings, UI) and **Geist Mono** (code, data).

## Secrets Flow

```
GitHub Secrets → Terraform (TF_VAR_*) → AWS Secrets Manager → ECS env vars → App runtime
```

- `DATABASE_URL` — injected from Secrets Manager as JSON, parsed at runtime
- `RECAPTCHA_*` — passed as plain env vars via ECS task definition
- No secrets are baked into the Docker image
