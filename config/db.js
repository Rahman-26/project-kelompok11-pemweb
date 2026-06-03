const mongoose = require('mongoose');

/**
 * Establishes a single shared Mongoose connection using DATABASE_URL from the environment.
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB() {
  const uri = process.env.DATABASE_URL;
  if (!uri || typeof uri !== 'string' || uri.trim() === '') {
    throw new Error('DATABASE_URL must be set to a non-empty connection string');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  return mongoose;
}

module.exports = connectDB;
