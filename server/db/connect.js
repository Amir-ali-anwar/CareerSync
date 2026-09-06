import mongoose from 'mongoose';

const connectDB = async (url) => {
  if (!url) {
    console.error('MongoDB connection URL is not provided');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(url);
    console.log('MongoDB connected...');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
