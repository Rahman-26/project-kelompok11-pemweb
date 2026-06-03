const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 8;

function validationError(message) {
  return { valid: false, message, data: null };
}

function validationSuccess(data) {
  return { valid: true, message: '', data };
}

function validateRegister(body) {
  if (!body || typeof body !== 'object') {
    return validationError('Request body is required');
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) {
    return validationError('Name is required');
  }
  if (name.length > 100) {
    return validationError('Name cannot exceed 100 characters');
  }
  if (!email) {
    return validationError('Email is required');
  }
  if (!EMAIL_PATTERN.test(email)) {
    return validationError('Please provide a valid email address');
  }
  if (!password) {
    return validationError('Password is required');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return validationError('Password must be at least 8 characters');
  }

  return validationSuccess({ name, email, password, role: 'user' });
}

function validateLogin(body) {
  if (!body || typeof body !== 'object') {
    return validationError('Request body is required');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) {
    return validationError('Email is required');
  }
  if (!EMAIL_PATTERN.test(email)) {
    return validationError('Please provide a valid email address');
  }
  if (!password) {
    return validationError('Password is required');
  }

  return validationSuccess({ email, password });
}

module.exports = {
  validateRegister,
  validateLogin,
};
