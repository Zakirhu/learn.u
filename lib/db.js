// When you attach a Vercel Postgres database to this project, Vercel sets
// POSTGRES_URL (and friends) automatically — @vercel/postgres reads it with
// no extra setup, in both local dev (via `vercel env pull`) and production.
const { sql } = require('@vercel/postgres');

module.exports = { sql };
