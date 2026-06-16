import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { withAdmin, publicUserForAdmin } from '@/lib/admin';
import { isValidPhone, normalizePhone } from '@/lib/phone';
import { User } from '@/models/User';
import { Ride } from '@/models/Ride';

const patchSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  homeBarangay: z.string().trim().max(120).optional(),
  homeAddress: z.string().trim().max(240).optional(),
  vehicleType: z.string().trim().max(60).optional(),
  plateNumber: z.string().trim().max(30).optional(),
  tricycleNumber: z.string().trim().max(30).optional(),
  status: z.enum(['active', 'suspended', 'banned']).optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters.').optional()
});

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async () => {
    await connectDb();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid user id', 400);

    const user = await User.findById(id).lean();
    if (!user) return fail('User not found', 404);

    // Recent rides this user was involved in (as passenger or driver).
    const rides = await Ride.find({ $or: [{ passengerId: id }, { driverId: id }] })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return ok({ user: publicUserForAdmin(user), rides });
  });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async (admin) => {
    await connectDb();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid user id', 400);

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail('Invalid request body', 400);

    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(parsed.error.issues.map((i) => i.message).join(' '), 400);
    }
    const data = parsed.data;

    const target = await User.findById(id);
    if (!target) return fail('User not found', 404);

    // Guard: an admin cannot suspend/ban/delete themselves out of access.
    if (String(target._id) === admin.sub && data.status && data.status !== 'active') {
      return fail('You cannot change your own account status.', 409);
    }

    if (data.name !== undefined) target.name = data.name;
    if (data.homeBarangay !== undefined) target.homeBarangay = data.homeBarangay;
    if (data.homeAddress !== undefined) target.homeAddress = data.homeAddress;
    if (data.vehicleType !== undefined) target.vehicleType = data.vehicleType;
    if (data.plateNumber !== undefined) target.plateNumber = data.plateNumber;
    if (data.tricycleNumber !== undefined) target.tricycleNumber = data.tricycleNumber;
    if (data.status !== undefined) target.status = data.status;

    if (data.phone !== undefined) {
      const phone = normalizePhone(data.phone);
      if (!isValidPhone(phone)) return fail('Please provide a valid PH mobile number.', 400);
      const clash = await User.findOne({ phone, _id: { $ne: target._id } }).select('_id').lean();
      if (clash) return fail('Another account already uses that phone number.', 409);
      target.phone = phone;
    }

    if (data.newPassword !== undefined) {
      target.passwordHash = await bcrypt.hash(data.newPassword, 12);
    }

    await target.save();
    return ok({ user: publicUserForAdmin(target.toObject()) });
  });
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return withAdmin(req, async (admin) => {
    await connectDb();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return fail('Invalid user id', 400);

    if (id === admin.sub) return fail('You cannot delete your own admin account.', 409);

    const deleted = await User.findByIdAndDelete(id).lean();
    if (!deleted) return fail('User not found', 404);

    return ok({ deleted: true, id });
  });
}
