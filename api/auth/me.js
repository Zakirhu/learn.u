const { sql } = require('../../lib/db');
const { requireAuth } = require('../../lib/authGuard');
const { toPublicUser } = require('../../lib/userHelpers');

async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { rows } = await sql`SELECT * FROM users WHERE id = ${req.user.id}`;
  if (!rows.length) {
    return res.status(404).json({ error: 'User no longer exists.' });
  }
  return res.status(200).json({ user: toPublicUser(rows[0]) });
}

module.exports = requireAuth(handler);
