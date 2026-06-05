function notFound(req, res) {
  return res.status(404).json({
    success: false,
    data: null,
    message: 'Route not found',
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = Number(err.statusCode) || 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource identifier';
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((item) => item.message)
      .join(', ');
  }

  if (statusCode >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Internal server error';
    }
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    message,
  });
}

module.exports = {
  notFound,
  errorHandler,
};
