import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { fail, ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { withLogger } from '@/lib/logger';
import { Ride } from '@/models/Ride';
import { User } from '@/models/User';
void User;

/**
 * GET /api/admin/ratings
 * Returns completed booking rides that have been rated, with aggregated
 * per-driver stats. Supports filtering by driverId.
 */
export const GET = withLogger(async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const url = new URL(req.url);
    const driverId = url.searchParams.get('driverId');
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
    const limit = Math.min(100, Number(url.searchParams.get('limit') ?? 30));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { rating: { $exists: true } };
    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
      filter.driverId = new mongoose.Types.ObjectId(driverId);
    }

    const [rides, total] = await Promise.all([
      Ride.find(filter)
        .sort({ ratedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('driverId', 'name phone plateNumber')
        .populate('passengerId', 'name phone')
        .lean(),
      Ride.countDocuments(filter),
    ]);

    // Per-driver aggregated stats
    const driverStats = await Ride.aggregate([
      { $match: { rating: { $exists: true }, driverId: { $exists: true } } },
      {
        $group: {
          _id: '$driverId',
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        },
      },
      { $sort: { averageRating: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: { path: '$driver', preserveNullAndEmptyArrays: true } },
    ]);

    return ok({
      rides: rides.map(r => ({
        id: String(r._id),
        driver: {
          id: String((r as any).driverId?._id ?? r.driverId),
          name: (r as any).driverId?.name ?? '—',
          phone: (r as any).driverId?.phone ?? '—',
          plateNumber: (r as any).driverId?.plateNumber ?? '—',
        },
        passenger: {
          id: String((r as any).passengerId?._id ?? r.passengerId),
          name: (r as any).passengerId?.name ?? '—',
        },
        rating: (r as any).rating,
        comment: (r as any).ratingComment ?? '',
        ratedAt: (r as any).ratedAt,
        fare: (r as any).offeredFare ?? (r as any).fareEstimate,
        completedAt: (r as any).completedAt,
      })),
      page, limit, total,
      pages: Math.ceil(total / limit),
      driverStats: driverStats.map(s => ({
        driverId: String(s._id),
        name: s.driver?.name ?? '—',
        phone: s.driver?.phone ?? '—',
        averageRating: Math.round(s.averageRating * 10) / 10,
        totalRatings: s.totalRatings,
        breakdown: { 5: s.rating5, 4: s.rating4, 3: s.rating3, 2: s.rating2, 1: s.rating1 },
      })),
    });
  });
});
