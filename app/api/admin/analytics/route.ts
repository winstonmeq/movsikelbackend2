import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDb } from '@/lib/db';
import { ok } from '@/lib/http';
import { withAdmin } from '@/lib/admin';
import { withLogger } from '@/lib/logger';
import { User } from '@/models/User';
import { Ride } from '@/models/Ride';
import { DriverSession } from '@/models/DriverSession';
import { onlineDriverFilter } from '@/lib/account';

export const GET = withLogger(async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    await connectDb();

    const url = new URL(req.url);
    const period = url.searchParams.get('period') || 'today'; // 'today' | '7d' | '30d' | 'all'
    const now = new Date();

    let startDate: Date;
    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(0); // all time
    }

    // 1. Fetch all drivers
    const drivers = await User.find({ role: 'driver' })
      .select('_id name phone plateNumber tricycleNumber online lastSeenAt status')
      .lean();

    const driverIds = drivers.map((d) => d._id);

    // 2. Aggregate Driver Sessions for the selected time window
    const sessions = await DriverSession.find({
      driverId: { $in: driverIds },
      $or: [
        { startedAt: { $gte: startDate } },
        { endedAt: null } // Include active ongoing sessions
      ]
    }).lean();

    // Group session duration by driverId (in seconds)
    const driverOnlineSecondsMap = new Map<string, number>();
    for (const s of sessions) {
      const dId = String(s.driverId);
      let sec = s.durationSeconds || 0;
      if (!s.endedAt) {
        // Active ongoing session: calculate time up to now
        sec = Math.max(0, Math.round((now.getTime() - new Date(s.startedAt).getTime()) / 1000));
      }
      driverOnlineSecondsMap.set(dId, (driverOnlineSecondsMap.get(dId) || 0) + sec);
    }

    // 3. Aggregate Ride metrics by driver in the selected period
    const driverRidesAgg = await Ride.aggregate([
      {
        $match: {
          driverId: { $in: driverIds },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$driverId',
          totalRides: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledRides: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalEarnings: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$offeredFare', '$fareEstimate'] },
                0
              ]
            }
          },
          totalRatings: {
            $sum: { $cond: [{ $gt: ['$rating', 0] }, '$rating', 0] }
          },
          ratingsCount: {
            $sum: { $cond: [{ $gt: ['$rating', 0] }, 1, 0] }
          }
        }
      }
    ]);

    const driverRidesMap = new Map(driverRidesAgg.map((r) => [String(r._id), r]));

    // Format driver analytics rows
    const driverStats = drivers.map((d) => {
      const dId = String(d._id);
      const rideData = driverRidesMap.get(dId);
      const onlineSec = driverOnlineSecondsMap.get(dId) || 0;
      const totalHours = Math.round((onlineSec / 3600) * 10) / 10;
      const completed = rideData?.completedRides || 0;
      const totalRides = rideData?.totalRides || 0;
      const completionRate = totalRides > 0 ? Math.round((completed / totalRides) * 100) : 0;
      const avgRating =
        rideData?.ratingsCount > 0
          ? Math.round((rideData.totalRatings / rideData.ratingsCount) * 10) / 10
          : null;

      return {
        id: dId,
        name: d.name,
        phone: d.phone,
        plateNumber: d.plateNumber || '',
        tricycleNumber: d.tricycleNumber || '',
        status: d.status,
        isOnline: Boolean(d.online),
        onlineSeconds: onlineSec,
        onlineHours: totalHours,
        totalRides,
        completedRides: completed,
        cancelledRides: rideData?.cancelledRides || 0,
        completionRate,
        totalEarnings: Math.round(rideData?.totalEarnings || 0),
        rating: avgRating
      };
    });

    // Sort drivers by online hours descending, then completed rides
    driverStats.sort((a, b) => b.onlineHours - a.onlineHours || b.completedRides - a.completedRides);

    // 4. Passenger Analytics: Top passengers in the period
    const passengerRidesAgg = await Ride.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$passengerId',
          totalRequested: { $sum: 1 },
          completedRides: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledRides: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'completed'] },
                { $ifNull: ['$offeredFare', '$fareEstimate'] },
                0
              ]
            }
          }
        }
      },
      { $sort: { totalRequested: -1 } },
      { $limit: 30 }
    ]);

    const passengerIds = passengerRidesAgg.map((p) => p._id);
    const passengerUsers = await User.find({ _id: { $in: passengerIds } })
      .select('_id name phone homeBarangay')
      .lean();
    const passengerMap = new Map(passengerUsers.map((u) => [String(u._id), u]));

    const passengerStats = passengerRidesAgg.map((p) => {
      const u = passengerMap.get(String(p._id));
      return {
        id: String(p._id),
        name: u?.name || 'Unknown',
        phone: u?.phone || '',
        homeBarangay: u?.homeBarangay || '',
        totalRequested: p.totalRequested,
        completedRides: p.completedRides,
        cancelledRides: p.cancelledRides,
        totalSpent: Math.round(p.totalSpent || 0)
      };
    });

    // 5. Hourly Demand Distribution (Peak Hours: 0 to 23)
    const hourlyRidesAgg = await Ride.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $project: {
          hour: { $hour: { date: '$createdAt', timezone: '+08:00' } } // Philippine Standard Time UTC+8
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const hourlyDistribution: { hour: number; label: string; count: number }[] = [];
    const hourlyMap = new Map(hourlyRidesAgg.map((h) => [h._id, h.count]));
    let maxHourCount = 0;
    let peakHourLabel = 'None';

    for (let h = 0; h < 24; h++) {
      const count = hourlyMap.get(h) || 0;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const label = `${displayHour} ${ampm}`;
      hourlyDistribution.push({ hour: h, label, count });

      if (count > maxHourCount) {
        maxHourCount = count;
        peakHourLabel = `${label} (${count} rides)`;
      }
    }

    // 6. Overall KPI Summary
    const totalDriverHours = Math.round(
      driverStats.reduce((sum, d) => sum + d.onlineHours, 0) * 10
    ) / 10;
    const activeDriverCount = driverStats.filter((d) => d.onlineHours > 0 || d.totalRides > 0).length;
    const onlineDriversNow = await User.countDocuments({ role: 'driver', ...onlineDriverFilter() });
    const totalBookings = driverStats.reduce((sum, d) => sum + d.totalRides, 0);
    const totalCompleted = driverStats.reduce((sum, d) => sum + d.completedRides, 0);
    const overallCompletionRate = totalBookings > 0 ? Math.round((totalCompleted / totalBookings) * 100) : 0;
    const totalRevenue = driverStats.reduce((sum, d) => sum + d.totalEarnings, 0);

    return ok({
      period,
      summary: {
        totalDriverHours,
        activeDriverCount,
        onlineDriversNow,
        totalBookings,
        totalCompleted,
        overallCompletionRate,
        totalRevenue,
        peakHour: peakHourLabel
      },
      drivers: driverStats,
      passengers: passengerStats,
      hourlyDistribution
    });
  });
});
