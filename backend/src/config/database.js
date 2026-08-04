import mongoose from 'mongoose';
import Payment from '../models/Payment.js';

const migratePaymentIndexes = async () => {
  const collection = mongoose.connection.collection('payments');
  const indexes = await collection.indexes();
  const paymentIdIndex = indexes.find((index) => index.name === 'paymentId_1');

  // Replace legacy unique index with a partial unique index that ignores null/missing values.
  if (paymentIdIndex) {
    await collection.dropIndex('paymentId_1');
  }

  await collection.createIndex(
    { paymentId: 1 },
    {
      name: 'paymentId_1',
      unique: true,
      partialFilterExpression: { paymentId: { $type: 'string' } },
    }
  );
};

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is required');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Payment.syncIndexes();
    await migratePaymentIndexes();

    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
  }
};
