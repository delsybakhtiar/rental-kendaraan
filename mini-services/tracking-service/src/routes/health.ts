import { Router, Request, Response } from 'express';
import { prisma } from '../utils/database';

const router = Router();

/**
 * @route   GET /health
 * @desc    Comprehensive health check for tracking service
 * @access  Public
 */
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const checks: Record<string, { status: string; latency?: number; message?: string }> = {};

  try {
    // Database check
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'healthy',
        latency: Date.now() - dbStart,
        message: 'Database connection OK',
      };
    } catch (dbError) {
      checks.database = {
        status: 'unhealthy',
        message: dbError instanceof Error ? dbError.message : 'Database connection failed',
      };
    }

    // Vehicles check
    try {
      const vehicleCount = await prisma.vehicle.count();
      checks.vehicles = {
        status: 'healthy',
        message: `${vehicleCount} vehicles in database`,
      };
    } catch {
      checks.vehicles = {
        status: 'degraded',
        message: 'Could not fetch vehicles',
      };
    }

    // Geofences check
    try {
      const activeGeofences = await prisma.geofence.count({
        where: { isActive: true },
      });
      checks.geofences = {
        status: 'healthy',
        message: `${activeGeofences} active geofences`,
      };
    } catch {
      checks.geofences = {
        status: 'degraded',
        message: 'Could not fetch geofences',
      };
    }

    // Recent tracking logs
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentLogs = await prisma.trackingLog.count({
        where: { recordedAt: { gte: oneHourAgo } },
      });
      checks.tracking = {
        status: 'healthy',
        message: `${recentLogs} logs in last hour`,
      };
    } catch {
      checks.tracking = {
        status: 'degraded',
        message: 'Could not fetch tracking logs',
      };
    }

    // Unresolved alerts
    try {
      const unresolvedAlerts = await prisma.geofenceAlert.count({
        where: { isResolved: false },
      });
      checks.alerts = {
        status: unresolvedAlerts > 10 ? 'warning' : 'healthy',
        message: `${unresolvedAlerts} unresolved alerts`,
      };
    } catch {
      checks.alerts = {
        status: 'degraded',
        message: 'Could not fetch alerts',
      };
    }

    // Memory check
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryPercent = Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100);

    checks.memory = {
      status: memoryPercent > 90 ? 'critical' : memoryPercent > 75 ? 'warning' : 'healthy',
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${memoryPercent}%)`,
    };

    // Determine overall status
    const statuses = Object.values(checks).map(c => c.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('unhealthy') || statuses.includes('critical')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('degraded') || statuses.includes('warning')) {
      overallStatus = 'degraded';
    }

    const totalLatency = Date.now() - startTime;
    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      status: overallStatus,
      service: 'tracking-service',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
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
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'tracking-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      latency: Date.now() - startTime,
    });
  }
});

/**
 * @route   GET /health/live
 * @desc    Liveness probe for Kubernetes
 * @access  Public
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /health/ready
 * @desc    Readiness probe for Kubernetes
 * @access  Public
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      reason: 'Database not available',
    });
  }
});

export default router;
