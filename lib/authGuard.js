const { verifyToken } = require('./jwt');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/** Returns the decoded user from the request's token, or null if absent/invalid. */
function authenticate(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Wraps a handler so it 401s with no token, 403s if the role doesn't match,
 * and otherwise attaches req.user and calls through.
 *   module.exports = requireAuth(handler);                 // any logged-in user
 *   module.exports = requireAuth(handler, ['admin']);       // admin only
 */
function requireAuth(handler, roles = null) {
  return async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return res.status(401).json({ error: 'Missing or invalid token.' });
    }
    if (roles && !roles.includes(user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that.' });
    }
    req.user = user;
    return handler(req, res);
  };
}

module.exports = { authenticate, requireAuth };
