const { put } = require('@vercel/blob');
const { sql } = require('../../lib/db');
const { authenticate, requireAuth } = require('../../lib/authGuard');
const { missingFields } = require('../../lib/validate');

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // ~4MB — see README for larger files

async function listResources(req, res) {
  const { subject, class: className, branch } = req.query;

  const filters = [];
  const values = [];
  if (subject) { values.push(subject); filters.push(`subject = $${values.length}`); }
  if (className) { values.push(className); filters.push(`class_name = $${values.length}`); }
  if (branch) { values.push(branch); filters.push(`branch = $${values.length}`); }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const query = `SELECT * FROM resources ${where} ORDER BY created_at DESC LIMIT 200`;

  const { rows } = await sql.query(query, values);
  return res.status(200).json({ resources: rows });
}

async function uploadResource(req, res) {
  const body = req.body || {};
  const missing = missingFields(body, ['title', 'fileName', 'fileBase64']);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required field(s): ${missing.join(', ')}` });
  }

  const { title, subject, className, branch, fileName, fileBase64 } = body;

  let buffer;
  try {
    buffer = Buffer.from(fileBase64, 'base64');
  } catch {
    return res.status(400).json({ error: 'fileBase64 is not valid base64 data.' });
  }

  if (buffer.length === 0) {
    return res.status(400).json({ error: 'File appears to be empty.' });
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return res.status(413).json({
      error: `File is too large for this endpoint (max ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB). See README for direct-to-Blob uploads for bigger files.`,
    });
  }

  const blob = await put(fileName, buffer, { access: 'public', addRandomSuffix: true });

  const { rows } = await sql`
    INSERT INTO resources (title, subject, class_name, branch, file_url, file_type, uploaded_by)
    VALUES (
      ${title.trim()},
      ${subject ? subject.trim() : null},
      ${className ? className.trim() : null},
      ${branch ? branch.trim() : null},
      ${blob.url},
      ${blob.contentType || null},
      ${req.user.id}
    )
    RETURNING *
  `;

  return res.status(201).json({ resource: rows[0] });
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Listing is open to anyone (matches the public "Recent Resources" feed
    // on the homepage). Switch this to requireAuth(listResources) if you'd
    // rather keep the library logged-in-only.
    return listResources(req, res);
  }

  if (req.method === 'POST') {
    return requireAuth(uploadResource, ['teacher', 'admin'])(req, res);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed.' });
};
