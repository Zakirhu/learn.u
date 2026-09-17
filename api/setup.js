const bcrypt = require('bcryptjs');
const { sql } = require('../lib/db');

// One-time setup, triggered by visiting this URL in a browser instead of
// running a script locally (local scripts can't read "Sensitive" env vars
// like POSTGRES_URL back out — Vercel hides their real value from the CLI
// on purpose). Protected by requiring ?key=<JWT_SECRET> so a stranger can't
// trigger it, and it refuses to run again once an admin account exists.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.JWT_SECRET || req.query.key !== process.env.JWT_SECRET) {
    return res.status(401).json({ error: 'Missing or incorrect key.' });
  }

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
      branch        TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
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
    )
  `;

  const { rows: existingAdmins } = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (existingAdmins.length) {
    return res.status(200).json({
      message: 'Tables already exist and an admin account already exists. Nothing to do.',
    });
  }

  const name = process.env.SEED_ADMIN_NAME || 'Portal Administrator';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@dipsinstitutions.edu').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'change-this-password';
  const passwordHash = bcrypt.hashSync(password, 10);

  await sql`
    INSERT INTO users (name, email, password_hash, role, branch)
    VALUES (${name}, ${email}, ${passwordHash}, 'admin', NULL)
  `;

  return res.status(200).json({
    message: 'Tables created and admin account seeded successfully.',
    adminEmail: email,
  });
};
