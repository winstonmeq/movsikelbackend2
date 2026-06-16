import { NextRequest } from 'next/server';
import { connectDb } from '@/lib/db';
import { ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { onlineDriverFilter } from '@/lib/account';
import { User } from '@/models/User';
import { Ride } from '@/models/Ride';

export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const [
      passengers,
      drivers,
      onlineDrivers,
      suspended,
      banned,
      totalRides,
      completedRides,
      activeRides,
      sharedRideRequests,
      bookingRideRequests
    ] = await Promise.all([
      User.countDocuments({ role: 'passenger' }),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'driver', ...onlineDriverFilter() }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' }),
      Ride.countDocuments({}),
      Ride.countDocuments({ status: 'completed' }),
      Ride.countDocuments({ status: { $in: ['requested', 'accepted', 'arrived', 'in_progress'] } }),
      Ride.countDocuments({ rideType: 'shared' }),
      Ride.countDocuments({ rideType: 'book' })
    ]);

    // Revenue proxy: sum of offeredFare (falling back to fareEstimate) over
    // completed rides. This is an estimate, not settled payment data.
    const revenueAgg = await Ride.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ['$offeredFare', '$fareEstimate'] } }
        }
      }
    ]);
    const estimatedRevenue = Math.round(((revenueAgg[0]?.revenue as number) || 0) * 100) / 100;

    return ok({
      stats: {
        passengers,
        drivers,
        onlineDrivers,
        suspended,
        banned,
        totalRides,
        completedRides,
        activeRides,
        sharedRideRequests,
        bookingRideRequests,
        estimatedRevenue
      }
    });
  });
}
