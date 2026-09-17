const bcrypt = require('bcryptjs');
const { sql } = require('../../lib/db');
const { signToken } = require('../../lib/jwt');
const { isValidEmail, isValidPassword, missingFields } = require('../../lib/validate');
const { toPublicUser } = require('../../lib/userHelpers');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const missing = missingFields(body, ['name', 'email', 'password']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  const { name, email, password, branch } = body;

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
    VALUES (${name.trim()}, ${normalizedEmail}, ${passwordHash}, 'student', ${branch ? branch.trim() : null})
    RETURNING *
  `;

  const user = rows[0];
  const token = signToken(user);
  return res.status(201).json({ token, user: toPublicUser(user) });
};
