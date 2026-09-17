const { sql } = require('../../../lib/db');
const { requireAuth } = require('../../../lib/authGuard');

async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const id = Number(req.query.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ error: "You can't delete your own account while logged in as it." });
  }

  const { rows: existing } = await sql`SELECT id, role FROM users WHERE id = ${id}`;
  if (!existing.length) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (existing[0].role === 'admin') {
    const { rows: countRows } = await sql`SELECT COUNT(*)::int AS n FROM users WHERE role = 'admin'`;
    if (countRows[0].n <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last remaining admin account.' });
    }
  }

  await sql`DELETE FROM users WHERE id = ${id}`;
  return res.status(204).end();
}

module.exports = requireAuth(handler, ['admin']);
