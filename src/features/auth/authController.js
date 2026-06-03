const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./authModel');
const { validateRegister, validateLogin } = require('./authValidator');

const BCRYPT_ROUNDS = 12;
const DEFAULT_JWT_EXPIRES_IN = '7d';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_JWT_EXPIRES_IN },
  );
}

function formatUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function isDuplicateKeyError(err) {
  return err && (err.code === 11000 || err.code === 11001);
}

async function register(req, res, next) {
  try {
    const validation = validateRegister(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    const { name, email, password, role } = validation.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Email is already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    const token = signAccessToken(user);

    return res.status(201).json({
      success: true,
      data: {
        user: formatUser(user),
        token,
      },
      message: 'Registration successful',
    });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Email is already registered',
      });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const validation = validateLogin(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        data: null,
        message: validation.message,
      });
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'Invalid email or password',
      });
    }

    user.password = undefined;
    const token = signAccessToken(user);

    return res.status(200).json({
      success: true,
      data: {
        user: formatUser(user),
        token,
      },
      message: 'Login successful',
    });
  } catch (err) {
    return next(err);
  }
}

async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: formatUser(req.user) },
    message: 'Profile retrieved',
  });
}

module.exports = {
  register,
  login,
  getMe,
};
