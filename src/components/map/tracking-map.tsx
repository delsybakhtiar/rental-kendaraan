'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Vehicle, Geofence, TrackingLog } from '@/types';

// Fix for default marker icons in Leaflet with Next.js
const createIcon = (color: string, isOutsideZone: boolean = false, isEmergency: boolean = false) => {
  const alertRing = (isOutsideZone || isEmergency) ? `
    <div style="
      position: absolute;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid ${isEmergency ? '#dc2626' : '#ef4444'};
      animation: pulse 1.5s ease-in-out infinite;
      top: -4px;
      left: -4px;
    "></div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.4; }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  ` : '';

  // Emergency vehicle shows lock icon
  const vehicleIcon = isEmergency ? '🔒' : '🚗';
  const emergencyOverlay = isEmergency ? `
    <div style="
      position: absolute;
      top: -8px;
      right: -8px;
      background: #dc2626;
      color: white;
      font-size: 8px;
      padding: 2px 4px;
      border-radius: 4px;
      font-weight: bold;
      animation: pulse 1s ease-in-out infinite;
    ">STOPPED</div>
  ` : '';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative;">
        ${alertRing}
        <div style="
          width: 32px;
          height: 32px;
          background: ${isEmergency ? '#1f2937' : color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid ${isEmergency ? '#dc2626' : isOutsideZone ? '#ef4444' : 'white'};
          box-shadow: ${isEmergency ? '0 0 20px rgba(220, 38, 38, 0.8)' : isOutsideZone ? '0 0 15px rgba(239, 68, 68, 0.7)' : '0 2px 8px rgba(0,0,0,0.3)'};
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            transform: rotate(45deg);
            color: white;
            font-weight: bold;
            font-size: 10px;
          ">${vehicleIcon}</div>
        </div>
        ${emergencyOverlay}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const vehicleStatusColors: Record<string, string> = {
  available: '#22c55e',
  rented: '#3b82f6',
  maintenance: '#f59e0b',
  emergency: '#dc2626', // Red for emergency
};

// Bintan Island boundary (approximate)
const BINTAN_BOUNDS = {
  minLat: 0.75,
  maxLat: 1.35,
  minLng: 104.1,
  maxLng: 104.95,
};

// Check if a point is inside Bintan Island
function isInsideBintan(lat: number, lng: number): boolean {
  return lat >= BINTAN_BOUNDS.minLat && 
         lat <= BINTAN_BOUNDS.maxLat && 
         lng >= BINTAN_BOUNDS.minLng && 
         lng <= BINTAN_BOUNDS.maxLng;
}

interface TrackingMapProps {
  vehicles: Vehicle[];
  geofences: Geofence[];
  selectedVehicle?: Vehicle | null;
  trackingPath?: TrackingLog[];
  center?: [number, number];
  zoom?: number;
  onVehicleClick?: (vehicle: Vehicle) => void;
}

// Component to handle map updates when selected vehicle changes
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.5 });
  }, [center, zoom, map]);
  
  return null;
}

export default function TrackingMap({
  vehicles,
  geofences,
  selectedVehicle,
  trackingPath = [],
  center = [1.05, 104.45], // Bintan Island center
  zoom = 11,
  onVehicleClick,
}: TrackingMapProps) {
  // Calculate map center based on selected vehicle
  const mapCenter = useMemo<[number, number]>(() => {
    if (selectedVehicle?.latitude && selectedVehicle?.longitude) {
      return [selectedVehicle.latitude, selectedVehicle.longitude];
    }
    return center;
  }, [selectedVehicle, center]);

  // Convert tracking path to Leaflet format [lat, lng]
  const pathCoordinates = useMemo(() => {
    return trackingPath
      .filter((log) => log.latitude && log.longitude)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
      .map((log) => [log.latitude, log.longitude] as [number, number]);
  }, [trackingPath]);

  // Convert geofence coordinates to Leaflet format
  const geofencePolygons = useMemo(() => {
    return geofences.map((gf) => ({
      ...gf,
      positions: gf.coordinates.map((coord) => [coord[1], coord[0]] as [number, number]),
    }));
  }, [geofences]);

  // Check vehicle zone status
  const getVehicleZoneStatus = (vehicle: Vehicle): { isOutside: boolean; label: string } => {
    if (!vehicle.latitude || !vehicle.longitude) {
      return { isOutside: false, label: 'No Location' };
    }
    
    const inside = isInsideBintan(vehicle.latitude, vehicle.longitude);
    return {
      isOutside: !inside,
      label: inside ? 'In Bintan' : 'OUT OF BINTAN!',
    };
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={mapCenter} zoom={selectedVehicle ? 15 : zoom} />

        {/* Render Geofences */}
        {geofencePolygons.map((gf) => (
          <Polygon
            key={gf.id}
            positions={gf.positions}
            pathOptions={{
              color: gf.color,
              fillColor: gf.color,
              fillOpacity: 0.2,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{gf.name}</h3>
                <p className="text-sm text-gray-600">{gf.description}</p>
                <p className="text-xs mt-1">
                  <span
                    className="px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: gf.color }}
                  >
                    {gf.type}
                  </span>
                </p>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Render Tracking Path */}
        {pathCoordinates.length > 1 && (
          <Polyline
            positions={pathCoordinates}
            pathOptions={{
              color: '#3b82f6',
              weight: 3,
              opacity: 0.8,
              dashArray: '5, 10',
            }}
          />
        )}

        {/* Render Vehicles */}
        {vehicles
          .filter((v) => v.latitude && v.longitude)
          .map((vehicle) => {
            const zoneStatus = getVehicleZoneStatus(vehicle);
            const isEmergency = vehicle.status === 'emergency' || vehicle.engineEnabled === false;
            const markerColor = isEmergency 
              ? vehicleStatusColors.emergency 
              : zoneStatus.isOutside 
                ? '#ef4444' 
                : vehicleStatusColors[vehicle.status] || '#6b7280';
            const dailyRate = vehicle.dailyRate ?? 0;
            
            return (
              <Marker
                key={vehicle.id}
                position={[vehicle.latitude!, vehicle.longitude!]}
                icon={createIcon(markerColor, zoneStatus.isOutside, isEmergency)}
                eventHandlers={{
                  click: () => onVehicleClick?.(vehicle),
                }}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <h3 className="font-bold text-lg">{vehicle.plateNumber}</h3>
                      {isEmergency && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
                          🔒 ENGINE KILLED
                        </span>
                      )}
                      {zoneStatus.isOutside && !isEmergency && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded animate-pulse">
                          ⚠️ OUT OF BINTAN
                        </span>
                      )}
                    </div>
                    <p className="text-sm">
                      {vehicle.brand} {vehicle.model} ({vehicle.year})
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: vehicleStatusColors[vehicle.status] || '#6b7280' }}
                        />
                        {vehicle.status === 'emergency' ? '🚨 EMERGENCY' : vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tarif: Rp {dailyRate.toLocaleString()}/hari
                      </p>
                      <p className={`text-xs font-medium ${isEmergency ? 'text-red-600' : zoneStatus.isOutside ? 'text-red-600' : 'text-green-600'}`}>
                        {isEmergency ? '🔒 MESin DIMATIKAN!' : `📍 ${zoneStatus.label}`}
                      </p>
                      {isEmergency && vehicle.engineKillReason && (
                        <p className="text-xs text-red-600 font-medium mt-1 p-1 bg-red-50 rounded">
                          Alasan: {vehicle.engineKillReason}
                        </p>
                      )}
                    </div>
                    {selectedVehicle?.id === vehicle.id && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        Sedang dipilih
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
}
