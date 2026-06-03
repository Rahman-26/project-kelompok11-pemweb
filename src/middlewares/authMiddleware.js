const jwt = require('jsonwebtoken');

const User = require('../features/auth/authModel');

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string' || !header.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

async function protect(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Authentication required',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Authentication is not configured',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid or expired token',
      });
    }

    const userId = decoded.sub;
    if (!userId) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid or expired token',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'User no longer exists',
      });
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'You do not have permission to perform this action',
      });
    }

    return next();
  };
}

module.exports = {
  protect,
  authorize,
};
