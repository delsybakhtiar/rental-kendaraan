import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * @route   GET /api/health
 * @desc    Health check endpoint for monitoring
 * @access  Public (no auth required for monitoring systems)
 */
export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latency?: number; message?: string }> = {};

  try {
    // ============================================
    // Database Health Check
    // ============================================
    try {
      const dbStart = Date.now();
      await db.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      
      checks.database = {
        status: 'healthy',
        latency: dbLatency,
        message: 'Database connection OK',
      };
    } catch (dbError) {
      checks.database = {
        status: 'unhealthy',
        message: dbError instanceof Error ? dbError.message : 'Database connection failed',
      };
    }

    // ============================================
    // Vehicle Count Check
    // ============================================
    try {
      const vehicleCount = await db.vehicle.count();
      checks.vehicles = {
        status: 'healthy',
        message: `${vehicleCount} vehicles registered`,
      };
    } catch {
      checks.vehicles = {
        status: 'degraded',
        message: 'Could not fetch vehicle count',
      };
    }

    // ============================================
    // Geofence Count Check
    // ============================================
    try {
      const geofenceCount = await db.geofence.count({ where: { isActive: true } });
      checks.geofences = {
        status: 'healthy',
        message: `${geofenceCount} active geofences`,
      };
    } catch {
      checks.geofences = {
        status: 'degraded',
        message: 'Could not fetch geofence count',
      };
    }

    // ============================================
    // Recent Tracking Data Check
    // ============================================
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLogs = await db.trackingLog.count({
        where: { recordedAt: { gte: oneHourAgo } },
      });
      checks.tracking = {
        status: 'healthy',
        message: `${recentLogs} tracking points in last hour`,
      };
    } catch {
      checks.tracking = {
        status: 'degraded',
        message: 'Could not fetch tracking data',
      };
    }

    try {
      const [failedSyncs, exhaustedSyncs, oldestFailedSync] = await Promise.all([
        db.trackingLog.count({
          where: { externalSyncStatus: 'failed' },
        }),
        db.trackingLog.count({
          where: { externalSyncStatus: 'exhausted' },
        }),
        db.trackingLog.findFirst({
          where: { externalSyncStatus: 'failed' },
          select: { externalSyncAttemptedAt: true, recordedAt: true },
          orderBy: { externalSyncAttemptedAt: 'asc' },
        }),
      ]);

      const oldestPendingAgeMinutes = oldestFailedSync
        ? Math.floor(
            (Date.now() - new Date(oldestFailedSync.externalSyncAttemptedAt ?? oldestFailedSync.recordedAt).getTime()) /
            (1000 * 60),
          )
        : 0;

      checks.trackingSync = {
        status: exhaustedSyncs > 0 ? 'critical' : failedSyncs > 0 ? 'warning' : 'healthy',
        message: `${failedSyncs} pending, ${exhaustedSyncs} exhausted, oldest pending ${oldestPendingAgeMinutes} minutes`,
      };
    } catch {
      checks.trackingSync = {
        status: 'degraded',
        message: 'Could not fetch tracking sync status',
      };
    }

    // ============================================
    // Unresolved Alerts Check
    // ============================================
    try {
      const unresolvedAlerts = await db.geofenceAlert.count({
        where: { isResolved: false },
      });
      checks.alerts = {
        status: unresolvedAlerts > 0 ? 'warning' : 'healthy',
        message: `${unresolvedAlerts} unresolved alerts`,
      };
    } catch {
      checks.alerts = {
        status: 'degraded',
        message: 'Could not fetch alerts',
      };
    }

    // ============================================
    // Memory Usage Check
    // ============================================
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

    checks.memory = {
      status: memoryPercent > 90 ? 'critical' : memoryPercent > 75 ? 'warning' : 'healthy',
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${memoryPercent}%)`,
    };

    // ============================================
    // Determine Overall Status
    // ============================================
    const statuses = Object.values(checks).map(c => c.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('unhealthy') || statuses.includes('critical')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded') || statuses.includes('warning')) {
      overallStatus = 'degraded';
    }

    const totalLatency = Date.now() - startTime;

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(
      {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        latency: {
          total: totalLatency,
          unit: 'ms',
        },
        checks,
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: {
            heapUsed: heapUsedMB,
            heapTotal: heapTotalMB,
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
          },
        },
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
