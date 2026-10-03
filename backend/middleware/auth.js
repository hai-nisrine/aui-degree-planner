// middleware/auth.js
const jwt = require('jsonwebtoken');

// Rejects the request with 401 unless it carries a valid auth cookie.
// On success, req.user holds the token payload ({ userId, email, role }).
function authRequired(req, res, next) {
  const cookieName = process.env.COOKIE_NAME || 'auth_token';
  const token = req.cookies[cookieName];

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = authRequired;
