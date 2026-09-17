-- Run once against your Vercel Postgres database — either by running
-- `npm run setup-db` locally (recommended, also seeds the first admin),
-- or by pasting these statements one at a time into the Query tab of your
-- database in the Vercel dashboard.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
  branch        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS resources (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  subject      TEXT,
  class_name   TEXT,
  branch       TEXT,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  uploaded_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
