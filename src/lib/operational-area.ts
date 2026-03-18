export const OPERATIONAL_AREA_BINTAN_BOUNDS = {
  minLat: 0.75,
  maxLat: 1.35,
  minLng: 104.1,
  maxLng: 104.95,
};

export function isInsideOperationalArea(lat: number, lng: number): boolean {
  return lat >= OPERATIONAL_AREA_BINTAN_BOUNDS.minLat &&
    lat <= OPERATIONAL_AREA_BINTAN_BOUNDS.maxLat &&
    lng >= OPERATIONAL_AREA_BINTAN_BOUNDS.minLng &&
    lng <= OPERATIONAL_AREA_BINTAN_BOUNDS.maxLng;
}
