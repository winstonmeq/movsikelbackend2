/**
 * Creates (or updates) the first admin account from environment variables.
 *
 *   ADMIN_PHONE=09171234567 ADMIN_PASSWORD=change-me-now ADMIN_NAME="Site Admin" \
 *     npm run seed:admin
 *
 * Reads MONGODB_URI the same way the app does. Run once during setup; safe to
 * re-run — it updates the existing admin's password/name rather than duplicating.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../lib/db';
import { User } from '../models/User';
import { normalizePhone, isValidPhone } from '../lib/phone';

async function main() {
  const rawPhone = process.env.ADMIN_PHONE;
  const password = process.env.ADMIN_PASSWORD;
  const name = (process.env.ADMIN_NAME || 'Administrator').trim();

  if (!rawPhone || !password) {
    throw new Error('Set ADMIN_PHONE and ADMIN_PASSWORD before running this script.');
  }
  if (!isValidPhone(rawPhone)) {
    throw new Error(`ADMIN_PHONE "${rawPhone}" is not a valid PH mobile number (e.g. 09171234567).`);
  }
  if (password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters.');
  }

  const phone = normalizePhone(rawPhone);
  await connectDb();

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await User.findOne({ phone });
  if (existing) {
    existing.name = name;
    existing.role = 'admin';
    existing.status = 'active';
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`Updated existing user ${phone} -> admin (active).`);
  } else {
    await User.create({ name, phone, passwordHash, role: 'admin', status: 'active' });
    console.log(`Created admin ${phone}.`);
  }

  await mongoose.connection.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
