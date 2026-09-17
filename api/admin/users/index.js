const bcrypt = require('bcryptjs');
const { sql } = require('../../../lib/db');
const { requireAuth } = require('../../../lib/authGuard');
const { toPublicUser } = require('../../../lib/userHelpers');
const { isValidEmail, isValidPassword, missingFields } = require('../../../lib/validate');

const ALLOWED_ROLES = ['admin', 'teacher', 'student'];

async function handler(req, res) {
  if (req.method === 'GET') {
    const { role } = req.query;
    let rows;
    if (role) {
      if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
      }
      ({ rows } = await sql`SELECT * FROM users WHERE role = ${role} ORDER BY created_at DESC`);
    } else {
      ({ rows } = await sql`SELECT * FROM users ORDER BY created_at DESC`);
    }
    return res.status(200).json({ users: rows.map(toPublicUser) });
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    const missing = missingFields(body, ['name', 'email', 'password', 'role']);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
    }

    const { name, email, password, role, branch } = body;

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { rows: existing } = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.length) {
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);

    const { rows } = await sql`
      INSERT INTO users (name, email, password_hash, role, branch)
      VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash}, ${role}, ${branch ? branch.trim() : null})
      RETURNING *
    `;
    return res.status(201).json({ user: toPublicUser(rows[0]) });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
}

module.exports = requireAuth(handler, ['admin']);
