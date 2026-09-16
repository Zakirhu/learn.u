# DIPS Portal — Vercel-native backend

This is the frontend (`index.html`) plus a real backend, built to deploy as
**one Vercel project**: the API lives in `/api` as Vercel Serverless
Functions, right alongside the static homepage. No separate host, no CORS
setup — the frontend just calls `/api/...` on the same domain.

Two pieces of storage, both attached from the Vercel dashboard:

- **Vercel Postgres** — user accounts (admin/teacher/student) and resource metadata
- **Vercel Blob** — the actual uploaded files (PDFs, PPTs, etc.)

## 1. Push this to GitHub

Replace the contents of your `learn.u` repo (the one already connected to
Vercel) with everything in this folder, and push.

## 2. Attach storage, in the Vercel dashboard

Open your project → **Storage** tab:

1. **Create Database → Postgres** (Neon-backed, has a free tier). Accept the
   defaults. This automatically adds `POSTGRES_URL` and related env vars to
   your project — you don't type these in yourself.
2. **Create Database → Blob**. This automatically adds
   `BLOB_READ_WRITE_TOKEN`.

## 3. Set the remaining environment variables

Project → **Settings → Environment Variables** → add:

| Name | Value |
|---|---|
| `JWT_SECRET` | any long random string |
| `SEED_ADMIN_EMAIL` | the admin login you want |
| `SEED_ADMIN_PASSWORD` | a real password |

(`JWT_EXPIRES_IN` and `SEED_ADMIN_NAME` are optional — see `.env.example`.)

Redeploy after adding these (Vercel doesn't apply new env vars to an
already-running deployment).

## 4. Create the database tables + first admin

This is the one step that needs your local machine, since it's a one-time
setup script rather than something that should run on every request:

```bash
npm install -g vercel        # if you don't have it
vercel link                  # connect this folder to your Vercel project
vercel env pull .env.local   # pulls POSTGRES_URL etc. down locally
npm install
npm run setup-db
```

You'll see the tables get created and, if no admin exists yet, a default
admin account printed once to the console. Log in with that, then create
real teacher/admin accounts from the API (see below) and forget the seeded
one if you like.

## 5. API reference

All bodies are JSON except where noted.

### Public

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/health` | — | Liveness check |
| POST | `/api/auth/register` | `{ name, email, password, branch? }` | Always creates a `student` |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| GET | `/api/resources` | — | Lists uploaded resources; optional `?subject=&class=&branch=` filters |

### Authenticated — send `Authorization: Bearer <token>`

| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/me` | Current user's profile |

### Teacher or Admin

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/resources` | `{ title, fileName, fileBase64, subject?, className?, branch? }` | Uploads a file (base64, ~4MB max — see note below) and saves it to the library |

### Admin only

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/admin/users` | — | Optional `?role=teacher` filter |
| POST | `/api/admin/users` | `{ name, email, password, role, branch? }` | Create a teacher/admin/student account directly |
| DELETE | `/api/admin/users/:id` | — | Remove a user |

## 6. Try it with curl (after deploying)

```bash
# Log in as the seeded admin
curl -X POST https://your-project.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dipsinstitutions.edu","password":"change-this-password"}'

# Create a teacher account (use the token from above)
curl -X POST https://your-project.vercel.app/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Rohit Verma","email":"rohit@example.com","password":"teacherpass123","role":"teacher","branch":"DIPS Jalandhar"}'
```

## 7. Connecting the frontend

The login buttons on `index.html` are currently just links. To wire them up,
add a small login form/modal that calls:

```js
const res = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { token, user } = await res.json();
// store token (e.g. sessionStorage) and use it on future requests:
// headers: { Authorization: `Bearer ${token}` }
```

Since everything's on the same domain, no CORS configuration is needed. I'm
happy to build this login form into `index.html` next if you want it wired
up rather than just available.

## 8. A note on file size

The `/api/resources` upload endpoint accepts files as base64 in a JSON body,
capped around 4MB (a Vercel serverless function request-size limit). That
comfortably covers PDFs, worksheets, and slide decks. For larger files
(recorded video lessons, etc.), the right approach is a **direct-to-Blob
client upload** — the browser uploads straight to Vercel Blob using a
short-lived token from the server, bypassing the function size limit
entirely. That's a bit more moving parts, so it's left out here; ask if you
want it added once basic uploads are working.

## 9. Project structure

```
index.html              the homepage (static, served as-is)
api/
  health.js
  auth/
    register.js
    login.js
    me.js
  admin/
    users/
      index.js           GET list / POST create
      [id].js             DELETE
  resources/
    index.js              GET list / POST upload
lib/
  db.js                  Postgres connection
  jwt.js
  validate.js
  authGuard.js            requireAuth() wrapper used by protected routes
  userHelpers.js
scripts/
  setup-db.js             one-time: create tables + seed admin
sql/
  schema.sql               reference copy of the table definitions
```
