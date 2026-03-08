/**
 * Geofencing Utilities
 * Contains point-in-polygon algorithms and geofence checking logic
 */

// Coordinate type: [longitude, latitude]
export type Coordinate = [number, number];

// Point with latitude and longitude
export interface Point {
  lat: number;
  lng: number;
}

// Geofence data from database
export interface GeofenceData {
  id: string;
  name: string;
  coordinates: string; // JSON string
  type: string;
  alertOnEntry: boolean;
  alertOnExit: boolean;
}

// Result of geofence check
export interface GeofenceCheckResult {
  isInside: boolean;
  geofenceId: string;
  geofenceName: string;
  geofenceType: string;
  shouldAlert: boolean;
  alertType: 'entry' | 'exit' | null;
}

/**
 * Check if a point is inside a polygon using Ray Casting algorithm
 * 
 * Algorithm explanation:
 * 1. Cast a ray from the point to infinity (typically horizontal)
 * 2. Count how many times the ray crosses polygon edges
 * 3. If odd number of crossings, point is inside; if even, outside
 * 
 * Time complexity: O(n) where n is the number of polygon vertices
 */
export function isPointInPolygon(point: Point, polygon: Coordinate[]): boolean {
  try {
    if (!polygon || polygon.length < 3) {
      console.warn('Invalid polygon: must have at least 3 vertices');
      return false;
    }

    const { lat, lng } = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]; // longitude
      const yi = polygon[i][1]; // latitude
      const xj = polygon[j][0]; // longitude
      const yj = polygon[j][1]; // latitude

      // Check if ray crosses this edge
      const intersect =
        yi > lat !== yj > lat && // Point is between edge's y-coordinates
        lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi; // Point is to the left of edge

      if (intersect) {
        inside = !inside; // Toggle inside flag
      }
    }

    return inside;
  } catch (error) {
    console.error('Error in point-in-polygon calculation:', error);
    return false;
  }
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(point1: Point, point2: Point): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = (point1.lat * Math.PI) / 180;
  const lat2 = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Parse geofence coordinates from JSON string
 */
export function parseGeofenceCoordinates(coordinatesJson: string): Coordinate[] | null {
  try {
    const coordinates = JSON.parse(coordinatesJson);
    
    if (!Array.isArray(coordinates) || coordinates.length < 3) {
      console.warn('Invalid geofence coordinates: must be array with at least 3 points');
      return null;
    }

    // Validate each coordinate
    for (const coord of coordinates) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        console.warn('Invalid coordinate format: expected [lng, lat]');
        return null;
      }
      if (typeof coord[0] !== 'number' || typeof coord[1] !== 'number') {
        console.warn('Invalid coordinate values: expected numbers');
        return null;
      }
    }

    return coordinates as Coordinate[];
  } catch (error) {
    console.error('Error parsing geofence coordinates:', error);
    return null;
  }
}

/**
 * Check if a point is inside any safe geofence
 * Returns the first geofence that contains the point, or null if outside all
 */
export function findContainingGeofence(
  point: Point,
  geofences: GeofenceData[]
): GeofenceCheckResult | null {
  try {
    for (const geofence of geofences) {
      const coordinates = parseGeofenceCoordinates(geofence.coordinates);
      if (!coordinates) continue;

      const isInside = isPointInPolygon(point, coordinates);
      
      if (isInside) {
        // Point is inside this geofence
        return {
          isInside: true,
          geofenceId: geofence.id,
          geofenceName: geofence.name,
          geofenceType: geofence.type,
          shouldAlert: geofence.alertOnEntry,
          alertType: 'entry',
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding containing geofence:', error);
    return null;
  }
}

/**
 * Check all geofences for a vehicle position
 * Returns array of check results for all applicable geofences
 */
export function checkAllGeofences(
  point: Point,
  geofences: GeofenceData[]
): GeofenceCheckResult[] {
  const results: GeofenceCheckResult[] = [];

  try {
    for (const geofence of geofences) {
      const coordinates = parseGeofenceCoordinates(geofence.coordinates);
      if (!coordinates) continue;

      const isInside = isPointInPolygon(point, coordinates);

      results.push({
        isInside,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        geofenceType: geofence.type,
        shouldAlert: isInside ? geofence.alertOnEntry : geofence.alertOnExit,
        alertType: isInside ? 'entry' : 'exit',
      });
    }

    return results;
  } catch (error) {
    console.error('Error checking all geofences:', error);
    return results;
  }
}
