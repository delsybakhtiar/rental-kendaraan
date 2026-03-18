// Types for the Bintan Island Car Rental & Tracking System

export interface Vehicle {
  id: string;
  plateNumber: string;
  model: string;
  brand: string;
  year: number;
  color: string;
  status: 'available' | 'rented' | 'maintenance' | 'emergency';
  latitude: number | null;
  longitude: number | null;
  lastLocationAt: Date | null;
  lastTrackedAt: Date | null;
  gpsStatus: string | null;
  deviceId: string | null;
  currentSpeed: number | null;
  currentHeading: number | null;
  ignitionStatus: boolean | null;
  dailyRate: number; // Always serialized to number
  imageUrl: string | null;
  // Engine Control
  engineEnabled: boolean;
  engineKilledAt: Date | null;
  engineKillReason: string | null;
  engineKilledBy: string | null;
  // Stationary Tracking
  stationarySince: Date | null;
  stationaryLat: number | null;
  stationaryLng: number | null;
  stationaryAlertSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  rentals?: Rental[];
  _count?: { trackingLogs: number };
}

export interface TrackingLog {
  id: string;
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  recordedAt: Date;
  ignition: boolean | null;
  fuel: number | null;
  externalSyncStatus?: string | null;
  externalSyncAttempts?: number;
  externalSyncAttemptedAt?: Date | null;
  externalSyncedAt?: Date | null;
  externalSyncError?: string | null;
  vehicle?: {
    plateNumber: string;
    model: string;
    brand: string;
  };
}

export interface Geofence {
  id: string;
  name: string;
  description: string | null;
  coordinates: [number, number][]; // [lng, lat] pairs
  isActive: boolean;
  color: string;
  type: 'safe' | 'restricted' | 'alert' | 'island_boundary' | 'port_watch';
  alertOnEntry: boolean;
  alertOnExit: boolean;
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  stationaryThresholdMinutes: number | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { alerts: number };
}

export interface GeofenceAlert {
  id: string;
  geofenceId: string | null;
  vehicleId: string | null;
  alertType: 'entry' | 'exit' | 'stationary' | 'engine_kill';
  alertLevel: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  locationLat: number | null;
  locationLng: number | null;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: string | null;
  createdAt: Date;
  geofence?: Geofence | null;
  vehicle?: {
    id: string;
    plateNumber: string;
    model: string;
    brand: string;
    engineEnabled: boolean;
  } | null;
}

export interface Rental {
  id: string;
  vehicleId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  actualEndDate: Date | null;
  totalAmount: number; // Always serialized to number
  deposit: number; // Always serialized to number
  status: 'active' | 'completed' | 'cancelled';
  startOdometer: number | null;
  endOdometer: number | null;
  notes: string | null;
  user?: User;
  vehicle?: Vehicle;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  createdAt: Date;
}

export interface DashboardStats {
  vehicleStats: {
    total: number;
    available: number;
    rented: number;
    maintenance: number;
  };
  activeRentals: number;
  unresolvedAlerts: number;
  recentTracking: number;
  activeGeofences: number;
  recentAlerts: GeofenceAlert[];
  vehiclesWithLocation: Vehicle[];
  geofences: Geofence[];
  revenueStats: {
    totalPotentialRevenue: number;
    totalDeposit: number;
    avgDailyRate: number;
  };
  gpsIntegrationMode?: 'demo' | 'production';
}

// Tracking Status from API
export interface TrackingStatus {
  vehicles: {
    total: number;
    withLocation: number;
    outsideOperationalArea: number;
    engineKilled: number;
  };
  gps: {
    online: number;
    stale: number;
    offline: number;
  };
  tracking: {
    recentPointsLastHour: number;
  };
  sync: {
    pending: number;
    exhausted: number;
    oldestPendingMinutes: number;
  };
  externalService: {
    configuredUrl: string;
    status: 'healthy' | 'degraded' | 'offline' | 'unknown';
    reachable: boolean;
    httpStatus: number | null;
    details: unknown;
  };
}
