import { Router, Request, Response } from 'express';
import { prisma } from '../utils/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler, ApiError } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { 
  parseGeofenceCoordinates, 
  isPointInPolygon,
  type Point 
} from '../utils/geofencing';

const router = Router();

// Constants for stationary detection
const STATIONARY_SPEED_THRESHOLD = 5; // km/h - considered stationary if speed < this
const STATIONARY_DISTANCE_THRESHOLD = 0.001; // degrees (~100m) - movement threshold

/**
 * Calculate distance between two points in meters (Haversine formula)
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * @route   POST /tracking/update
 * @desc    Update vehicle GPS location with Bintan Island geofencing
 * @access  Private (requires JWT)
 * 
 * Features:
 * - Island Boundary Exit Detection (CRITICAL alert)
 * - Port Watch Stationary Detection (HIGH alert)
 * - Engine Kill Status Check
 */
router.post(
  '/update',
  authenticate,
  validateBody({
    vehicle_id: { required: true, type: 'string' },
    lat: { required: true, type: 'number', min: -90, max: 90 },
    lng: { required: true, type: 'number', min: -180, max: 180 },
    speed: { required: false, type: 'number', min: 0, max: 500 },
    heading: { required: false, type: 'number', min: 0, max: 360 },
    ignition: { required: false, type: 'boolean' },
    fuel: { required: false, type: 'number', min: 0, max: 100 },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { vehicle_id, lat, lng, speed, heading, ignition, fuel } = req.body;
    const userId = req.user?.userId;

    // ============================================
    // Step 1: Validate vehicle exists and get current state
    // ============================================
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id },
      select: {
        id: true,
        plateNumber: true,
        status: true,
        latitude: true,
        longitude: true,
        engineEnabled: true,
        stationarySince: true,
        stationaryLat: true,
        stationaryLng: true,
        stationaryAlertSent: true,
      },
    });

    if (!vehicle) {
      throw new ApiError(404, `Vehicle with ID ${vehicle_id} not found`);
    }

    // ============================================
    // Step 2: Create tracking log entry
    // ============================================
    const trackingLog = await prisma.trackingLog.create({
      data: {
        vehicleId: vehicle_id,
        latitude: lat,
        longitude: lng,
        speed: speed ?? null,
        heading: heading ?? null,
        ignition: ignition ?? false,
        fuel: fuel ?? null,
        userId: userId ?? null,
      },
    });

    // ============================================
    // Step 3: Get all active geofences
    // ============================================
    const geofences = await prisma.geofence.findMany({
      where: { isActive: true },
    });

    // ============================================
    // Step 4: Prepare data structures
    // ============================================
    const currentPoint: Point = { lat, lng };
    const alerts: Array<{
      geofenceId: string;
      geofenceName: string;
      alertType: string;
      alertLevel: string;
      message: string;
    }> = [];
    const warnings: string[] = [];

    const previousLat = vehicle.latitude;
    const previousLng = vehicle.longitude;
    const hadPreviousLocation = previousLat !== null && previousLng !== null;

    // Track if vehicle is inside island boundary
    let isInsideIslandBoundary = false;
    let islandBoundaryGeofence = null;

    // Track port watch zones
    const portWatchZones: Array<{
      geofence: typeof geofences[0];
      isInside: boolean;
    }> = [];

    // ============================================
    // Step 5: Check each geofence
    // ============================================
    for (const geofence of geofences) {
      try {
        const coordinates = parseGeofenceCoordinates(geofence.coordinates);
        if (!coordinates) continue;

        const isCurrentlyInside = isPointInPolygon(currentPoint, coordinates);
        
        // Check previous location
        let wasPreviouslyInside = false;
        if (hadPreviousLocation) {
          const previousPoint: Point = { lat: previousLat, lng: previousLng };
          wasPreviouslyInside = isPointInPolygon(previousPoint, coordinates);
        }

        // Handle ISLAND BOUNDARY (critical alert on exit)
        if (geofence.type === 'island_boundary') {
          islandBoundaryGeofence = geofence;
          isInsideIslandBoundary = isCurrentlyInside;

          const isExitEvent = wasPreviouslyInside && !isCurrentlyInside;

          if (isExitEvent && geofence.alertOnExit) {
            // 🚨 CRITICAL ALERT - Vehicle leaving Bintan Island!
            const alertMessage = `🚨 KRITIS: Kendaraan ${vehicle.plateNumber} KELUAR dari Pulau Bintan!
Posisi: ${lat.toFixed(4)}, ${lng.toFixed(4)}
Waktu: ${new Date().toLocaleString('id-ID')}
TINDAKAN: Segera hubungi penyewa atau aktifkan Engine Kill!`;

            await prisma.geofenceAlert.create({
              data: {
                geofenceId: geofence.id,
                vehicleId: vehicle_id,
                alertType: 'exit',
                alertLevel: 'critical',
                message: alertMessage,
                locationLat: lat,
                locationLng: lng,
                isResolved: false,
              },
            });

            alerts.push({
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              alertType: 'exit',
              alertLevel: 'critical',
              message: alertMessage,
            });

            warnings.push(alertMessage);
          }
        }

        // Handle PORT WATCH zones (stationary detection)
        if (geofence.type === 'port_watch') {
          portWatchZones.push({ geofence, isInside: isCurrentlyInside });

          if (isCurrentlyInside && geofence.stationaryThresholdMinutes) {
            // Check if vehicle is stationary
            const currentSpeed = speed ?? 0;
            const isStationary = currentSpeed < STATIONARY_SPEED_THRESHOLD;

            if (isStationary) {
              // Check if this is a new stationary event
              if (!vehicle.stationarySince) {
                // Start tracking stationary time
                await prisma.vehicle.update({
                  where: { id: vehicle_id },
                  data: {
                    stationarySince: new Date(),
                    stationaryLat: lat,
                    stationaryLng: lng,
                    stationaryAlertSent: false,
                  },
                });
              } else {
                // Calculate stationary duration
                const stationaryMinutes = 
                  (Date.now() - vehicle.stationarySince.getTime()) / (1000 * 60);
                const threshold = geofence.stationaryThresholdMinutes;

                if (stationaryMinutes >= threshold && !vehicle.stationaryAlertSent) {
                  // ⚠️ HIGH ALERT - Vehicle stationary at port too long
                  const alertMessage = `⚠️ PORT WATCH: Kendaraan ${vehicle.plateNumber} diam selama ${Math.round(stationaryMinutes)} menit di ${geofence.name}!
Posisi: ${lat.toFixed(4)}, ${lng.toFixed(4)}
Waktu mulai diam: ${vehicle.stationarySince.toLocaleString('id-ID')}
INDIKASI: Kemungkinan akan menyeberang ke Batam/Singapura.`;

                  await prisma.geofenceAlert.create({
                    data: {
                      geofenceId: geofence.id,
                      vehicleId: vehicle_id,
                      alertType: 'stationary',
                      alertLevel: 'high',
                      message: alertMessage,
                      locationLat: lat,
                      locationLng: lng,
                      isResolved: false,
                    },
                  });

                  await prisma.vehicle.update({
                    where: { id: vehicle_id },
                    data: { stationaryAlertSent: true },
                  });

                  alerts.push({
                    geofenceId: geofence.id,
                    geofenceName: geofence.name,
                    alertType: 'stationary',
                    alertLevel: 'high',
                    message: alertMessage,
                  });

                  warnings.push(alertMessage);
                }
              }
            } else {
              // Vehicle is moving - reset stationary tracking
              if (vehicle.stationarySince) {
                await prisma.vehicle.update({
                  where: { id: vehicle_id },
                  data: {
                    stationarySince: null,
                    stationaryLat: null,
                    stationaryLng: null,
                    stationaryAlertSent: false,
                  },
                });
              }
            }
          }
        }

        // Handle SAFE zone exit (medium alert)
        if (geofence.type === 'safe' && geofence.alertOnExit) {
          const isExitEvent = wasPreviouslyInside && !isCurrentlyInside;

          if (isExitEvent) {
            const alertMessage = `Kendaraan ${vehicle.plateNumber} keluar dari zona ${geofence.name}`;

            await prisma.geofenceAlert.create({
              data: {
                geofenceId: geofence.id,
                vehicleId: vehicle_id,
                alertType: 'exit',
                alertLevel: geofence.alertLevel || 'medium',
                message: alertMessage,
                locationLat: lat,
                locationLng: lng,
                isResolved: false,
              },
            });

            alerts.push({
              geofenceId: geofence.id,
              geofenceName: geofence.name,
              alertType: 'exit',
              alertLevel: geofence.alertLevel || 'medium',
              message: alertMessage,
            });
          }
        }

      } catch (error) {
        console.error(`Error checking geofence ${geofence.id}:`, error);
      }
    }

    // ============================================
    // Step 6: Check if vehicle is outside island boundary
    // ============================================
    if (islandBoundaryGeofence && !isInsideIslandBoundary) {
      warnings.push(`⚠️ PERINGATAN KRITIS: Kendaraan ${vehicle.plateNumber} berada DI LUAR Pulau Bintan!`);
    }

    // ============================================
    // Step 7: Update vehicle's current location
    // ============================================
    const updateData: Record<string, unknown> = {
      latitude: lat,
      longitude: lng,
      lastLocationAt: new Date(),
    };

    // If vehicle moved significantly, reset stationary tracking
    if (vehicle.stationarySince && vehicle.stationaryLat && vehicle.stationaryLng) {
      const distance = calculateDistance(lat, lng, vehicle.stationaryLat, vehicle.stationaryLng);
      if (distance > 200) { // Moved more than 200m
        updateData.stationarySince = null;
        updateData.stationaryLat = null;
        updateData.stationaryLng = null;
        updateData.stationaryAlertSent = false;
      }
    }

    await prisma.vehicle.update({
      where: { id: vehicle_id },
      data: updateData,
    });

    // ============================================
    // Step 8: Check engine kill status
    // ============================================
    let engineStatus = 'normal';
    if (!vehicle.engineEnabled) {
      engineStatus = 'disabled';
      warnings.push(`🔒 Mesin kendaraan ${vehicle.plateNumber} sedang DINONAKTIFKAN (Engine Kill aktif)`);
    }

    // ============================================
    // Step 9: Return response
    // ============================================
    return res.status(200).json({
      success: true,
      message: alerts.length > 0 
        ? 'GPS updated with geofence alerts' 
        : 'GPS location updated successfully',
      data: {
        tracking_log: {
          id: trackingLog.id,
          vehicle_id: trackingLog.vehicleId,
          latitude: trackingLog.latitude,
          longitude: trackingLog.longitude,
          speed: trackingLog.speed,
          heading: trackingLog.heading,
          recorded_at: trackingLog.recordedAt,
        },
        vehicle: {
          id: vehicle.id,
          plate_number: vehicle.plateNumber,
          status: vehicle.status,
          engine_enabled: vehicle.engineEnabled,
        },
        geofence_alerts: alerts,
        warnings: warnings.length > 0 ? warnings : undefined,
        location_status: {
          is_inside_island: isInsideIslandBoundary,
          inside_port_watch: portWatchZones.filter(z => z.isInside).map(z => z.geofence.name),
        },
        engine_status: engineStatus,
      },
    });
  })
);

/**
 * @route   POST /tracking/engine-kill
 * @desc    Kill vehicle engine remotely (security feature)
 * @access  Private (requires JWT, admin only)
 */
router.post(
  '/engine-kill',
  authenticate,
  validateBody({
    vehicle_id: { required: true, type: 'string' },
    reason: { required: false, type: 'string' },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { vehicle_id, reason } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    // Only admin can kill engine
    if (userRole !== 'admin') {
      throw new ApiError(403, 'Only administrators can activate Engine Kill');
    }

    // Get vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id },
      select: {
        id: true,
        plateNumber: true,
        engineEnabled: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!vehicle) {
      throw new ApiError(404, `Vehicle with ID ${vehicle_id} not found`);
    }

    if (!vehicle.engineEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Engine is already disabled',
      });
    }

    // Kill engine
    await prisma.vehicle.update({
      where: { id: vehicle_id },
      data: {
        engineEnabled: false,
        engineKilledAt: new Date(),
        engineKillReason: reason || 'Manual activation by admin',
        engineKilledBy: userId,
      },
    });

    // Create alert for engine kill
    await prisma.geofenceAlert.create({
      data: {
        geofenceId: '', // No geofence for engine kill
        vehicleId: vehicle_id,
        alertType: 'engine_kill',
        alertLevel: 'critical',
        message: `🔒 ENGINE KILL: Mesin kendaraan ${vehicle.plateNumber} telah DINONAKTIFKAN.
Alasan: ${reason || 'Manual activation by admin'}
Lokasi: ${vehicle.latitude?.toFixed(4)}, ${vehicle.longitude?.toFixed(4)}
Waktu: ${new Date().toLocaleString('id-ID')}`,
        locationLat: vehicle.latitude,
        locationLng: vehicle.longitude,
        isResolved: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Engine kill activated for vehicle ${vehicle.plateNumber}`,
      data: {
        vehicle_id,
        plate_number: vehicle.plateNumber,
        engine_enabled: false,
        engine_killed_at: new Date(),
        reason: reason || 'Manual activation by admin',
      },
    });
  })
);

/**
 * @route   POST /tracking/engine-restore
 * @desc    Restore vehicle engine (undo engine kill)
 * @access  Private (requires JWT, admin only)
 */
router.post(
  '/engine-restore',
  authenticate,
  validateBody({
    vehicle_id: { required: true, type: 'string' },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { vehicle_id } = req.body;
    const userRole = req.user?.role;

    // Only admin can restore engine
    if (userRole !== 'admin') {
      throw new ApiError(403, 'Only administrators can restore engine');
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id },
      select: { id: true, plateNumber: true, engineEnabled: true },
    });

    if (!vehicle) {
      throw new ApiError(404, `Vehicle with ID ${vehicle_id} not found`);
    }

    if (vehicle.engineEnabled) {
      return res.status(400).json({
        success: false,
        message: 'Engine is already enabled',
      });
    }

    // Restore engine
    await prisma.vehicle.update({
      where: { id: vehicle_id },
      data: {
        engineEnabled: true,
        engineKilledAt: null,
        engineKillReason: null,
        engineKilledBy: null,
      },
    });

    return res.status(200).json({
      success: true,
      message: `Engine restored for vehicle ${vehicle.plateNumber}`,
      data: {
        vehicle_id,
        plate_number: vehicle.plateNumber,
        engine_enabled: true,
      },
    });
  })
);

/**
 * @route   GET /tracking/history/:vehicle_id
 * @desc    Get tracking history for a vehicle
 * @access  Private (requires JWT)
 */
router.get(
  '/history/:vehicle_id',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { vehicle_id } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicle_id },
      select: { id: true, plateNumber: true, model: true, brand: true },
    });

    if (!vehicle) {
      throw new ApiError(404, `Vehicle with ID ${vehicle_id} not found`);
    }

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const logs = await prisma.trackingLog.findMany({
      where: {
        vehicleId: vehicle_id,
        recordedAt: { gte: cutoff },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return res.status(200).json({
      success: true,
      data: {
        vehicle,
        logs: logs.map((log) => ({
          id: log.id,
          latitude: log.latitude,
          longitude: log.longitude,
          speed: log.speed,
          heading: log.heading,
          ignition: log.ignition,
          fuel: log.fuel,
          recorded_at: log.recordedAt,
        })),
        total_points: logs.length,
        time_range: {
          hours,
          from: cutoff,
          to: new Date(),
        },
      },
    });
  })
);

/**
 * @route   GET /tracking/alerts
 * @desc    Get geofence alerts with alert level filtering
 * @access  Private (requires JWT)
 */
router.get(
  '/alerts',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const resolved = req.query.resolved === 'true';
    const level = req.query.level as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    const where: Record<string, unknown> = {};
    if (!resolved) where.isResolved = false;
    if (level && ['low', 'medium', 'high', 'critical'].includes(level)) {
      where.alertLevel = level;
    }

    const alerts = await prisma.geofenceAlert.findMany({
      where,
      include: {
        geofence: {
          select: { name: true, type: true, color: true, alertLevel: true },
        },
      },
      orderBy: [
        { alertLevel: 'desc' }, // critical first
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    const vehicleIds = [...new Set(alerts.map((a) => a.vehicleId).filter(Boolean))];
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { 
        id: true, 
        plateNumber: true, 
        model: true, 
        brand: true,
        engineEnabled: true,
      },
    });
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    return res.status(200).json({
      success: true,
      data: alerts.map((alert) => ({
        id: alert.id,
        vehicle: vehicleMap.get(alert.vehicleId),
        geofence: alert.geofence,
        alert_type: alert.alertType,
        alert_level: alert.alertLevel,
        message: alert.message,
        location: {
          lat: alert.locationLat,
          lng: alert.locationLng,
        },
        is_resolved: alert.isResolved,
        resolved_at: alert.resolvedAt,
        created_at: alert.createdAt,
      })),
      total: alerts.length,
    });
  })
);

/**
 * @route   PUT /tracking/alerts/:alert_id/resolve
 * @desc    Resolve a geofence alert
 * @access  Private (requires JWT)
 */
router.put(
  '/alerts/:alert_id/resolve',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { alert_id } = req.params;
    const userId = req.user?.userId;

    const alert = await prisma.geofenceAlert.update({
      where: { id: alert_id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
      include: {
        geofence: { select: { name: true } },
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Alert resolved successfully',
      data: {
        id: alert.id,
        message: alert.message,
        resolved_at: alert.resolvedAt,
      },
    });
  })
);

/**
 * @route   GET /tracking/status
 * @desc    Get overall system status (for dashboard)
 * @access  Private (requires JWT)
 */
router.get(
  '/status',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // Get critical alerts count
    const criticalAlerts = await prisma.geofenceAlert.count({
      where: { isResolved: false, alertLevel: 'critical' },
    });

    // Get high alerts count
    const highAlerts = await prisma.geofenceAlert.count({
      where: { isResolved: false, alertLevel: 'high' },
    });

    // Get vehicles outside island
    const vehicles = await prisma.vehicle.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      select: { id: true, latitude: true, longitude: true },
    });

    // Get island boundary geofence
    const islandGeofence = await prisma.geofence.findFirst({
      where: { type: 'island_boundary', isActive: true },
    });

    let outsideIslandCount = 0;
    if (islandGeofence) {
      const islandCoords = parseGeofenceCoordinates(islandGeofence.coordinates);
      if (islandCoords) {
        outsideIslandCount = vehicles.filter(v => {
          if (!v.latitude || !v.longitude) return false;
          return !isPointInPolygon({ lat: v.latitude, lng: v.longitude }, islandCoords);
        }).length;
      }
    }

    // Get vehicles with engine killed
    const engineKilledCount = await prisma.vehicle.count({
      where: { engineEnabled: false },
    });

    return res.status(200).json({
      success: true,
      data: {
        alerts: {
          critical: criticalAlerts,
          high: highAlerts,
        },
        vehicles: {
          total: vehicles.length,
          outside_island: outsideIslandCount,
          engine_killed: engineKilledCount,
        },
      },
    });
  })
);

export default router;
