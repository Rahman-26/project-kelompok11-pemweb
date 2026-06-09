const path = require('path');

const express = require('express');
const mongoSanitize = require('express-mongo-sanitize');

const authRoutes = require('./features/auth/authRoutes');
const taskRoutes = require('./features/tasks/taskRoutes');
const workspaceRoutes = require('./features/workspaces/workspaceRoutes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Parse common request bodies first; sanitizer must run after parsers per library guidance.
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

// Mitigate NoSQL injection: remove keys that start with "$" or contain "." from req bodies, query, params, headers.
/*app.use(
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Sanitized prohibited key "${key}" on ${req.method} ${req.originalUrl}`);
      }
    },
  }),
);
*/

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' },
    message: 'Service running',
  });
});

app.use(express.static(path.resolve(__dirname, '../public')));

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
