import mongoose from 'mongoose';

declare global {
  // eslint-disable-next-line no-var
  var mongooseConnection: Promise<typeof mongoose> | undefined;
}

export async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Missing MONGODB_URI');

  if (!global.mongooseConnection) {
    global.mongooseConnection = mongoose.connect(uri, {
      dbName: 'movsikel'
    });
  }

  return global.mongooseConnection;
}
