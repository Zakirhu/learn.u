// Run this once, locally, against your Vercel Postgres database:
//   vercel env pull .env.local     (pulls POSTGRES_URL etc. from your project)
//   npm run setup-db
//
// Safe to run again later — table creation is idempotent, and the admin
// seed is skipped once any admin account exists.
require('dotenv').config({ path: '.env.local' });
const bcrypt = require('bcryptjs');
const { sql } = require('@vercel/postgres');

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL is not set. Run `vercel env pull .env.local` first.');
    process.exit(1);
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

  console.log('Tables ready (users, resources).');

  const { rows } = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  if (rows.length) {
    console.log('An admin account already exists — skipping seed.');
    return;
  }

  const name = process.env.SEED_ADMIN_NAME || 'Portal Administrator';
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@dipsinstitutions.edu').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'change-this-password';
  const passwordHash = bcrypt.hashSync(password, 10);

  await sql`
    INSERT INTO users (name, email, password_hash, role, branch)
    VALUES (${name}, ${email}, ${passwordHash}, 'admin', NULL)
  `;

  console.log('----------------------------------------------------');
  console.log('Seeded default admin account:');
  console.log(`  email:    ${email}`);
  console.log(`  password: ${password}`);
  console.log('Log in, then create real accounts from /api/admin/users.');
  console.log('----------------------------------------------------');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
