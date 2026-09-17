function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    branch: row.branch,
    createdAt: row.created_at,
  };
}

module.exports = { toPublicUser };
