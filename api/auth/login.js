const bcrypt = require('bcryptjs');
const { sql } = require('../../lib/db');
const { signToken } = require('../../lib/jwt');
const { missingFields } = require('../../lib/validate');
const { toPublicUser } = require('../../lib/userHelpers');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const missing = missingFields(body, ['email', 'password']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  const normalizedEmail = body.email.trim().toLowerCase();

  const { rows } = await sql`SELECT * FROM users WHERE email = ${normalizedEmail}`;
  const user = rows[0];

  // Same error for "no such user" and "wrong password" — don't leak which one it was.
  if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = signToken(user);
  return res.status(200).json({ token, user: toPublicUser(user) });
};
