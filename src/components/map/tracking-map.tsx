'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Vehicle, Geofence, TrackingLog } from '@/types';
import { isInsideOperationalArea } from '@/lib/operational-area';

// Fix for default marker icons in Leaflet with Next.js
const createIcon = (
  color: string,
  plateNumber: string,
  isOutsideZone: boolean = false,
  isEmergency: boolean = false,
) => {
  const alertRing = (isOutsideZone || isEmergency) ? `
    <div style="
      position: absolute;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 3px solid ${isEmergency ? '#dc2626' : '#ef4444'};
      animation: pulse 1.5s ease-in-out infinite;
      top: -10px;
      left: 4px;
    "></div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.4; }
        100% { transform: scale(1); opacity: 1; }
      }
    </style>
  ` : '';

  const emergencyOverlay = isEmergency ? `
    <div style="
      position: absolute;
      top: -12px;
      right: -6px;
      background: #dc2626;
      color: white;
      font-size: 8px;
      padding: 2px 4px;
      border-radius: 4px;
      font-weight: bold;
      animation: pulse 1s ease-in-out infinite;
    ">STOPPED</div>
  ` : '';

  const carBodyColor = isEmergency ? '#111827' : color;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 64px; height: 68px;">
        ${alertRing}
        <div style="
          position: absolute;
          top: 8px;
          left: 8px;
          width: 48px;
          height: 28px;
          background: ${carBodyColor};
          border-radius: 10px 12px 10px 10px;
          border: 2px solid ${isEmergency ? '#dc2626' : isOutsideZone ? '#ef4444' : 'rgba(255,255,255,0.85)'};
          box-shadow: ${isEmergency ? '0 0 20px rgba(220, 38, 38, 0.8)' : isOutsideZone ? '0 0 16px rgba(239, 68, 68, 0.65)' : '0 8px 18px rgba(0,0,0,0.35)'};
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        ">
          <svg width="34" height="18" viewBox="0 0 68 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M14 9C15.2 5.8 18.3 4 21.7 4H45.4C48.6 4 51.6 5.7 53 8.6L57.7 18H61C64.3 18 67 20.7 67 24V25C67 28.3 64.3 31 61 31H58.2C57.5 33.9 55 36 52 36C49 36 46.5 33.9 45.8 31H22.2C21.5 33.9 19 36 16 36C13 36 10.5 33.9 9.8 31H7C3.7 31 1 28.3 1 25V23.8C1 20.5 3.7 17.8 7 17.8H10.5L14 9Z" fill="white" fill-opacity="0.92"/>
            <path d="M20 9.5H46.2C47.8 9.5 49.2 10.4 49.9 11.8L52.1 16H15.1L17.1 11.8C17.8 10.4 19.3 9.5 20.9 9.5H20Z" fill="${carBodyColor}"/>
            <circle cx="16" cy="30" r="4.5" fill="#0F172A"/>
            <circle cx="52" cy="30" r="4.5" fill="#0F172A"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          top: 40px;
          left: 50%;
          transform: translateX(-50%);
          min-width: 58px;
          max-width: 78px;
          padding: 3px 6px;
          border-radius: 999px;
          background: rgba(10, 10, 15, 0.9);
          border: 1px solid ${isEmergency ? 'rgba(220, 38, 38, 0.6)' : isOutsideZone ? 'rgba(239, 68, 68, 0.45)' : 'rgba(255,255,255,0.18)'};
          color: white;
          font-size: 9px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: 0.04em;
          text-align: center;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          backdrop-filter: blur(8px);
        ">${plateNumber}</div>
        </div>
        ${emergencyOverlay}
      </div>
    `,
    iconSize: [64, 68],
    iconAnchor: [32, 46],
    popupAnchor: [0, -42],
  });
};

const vehicleStatusColors: Record<string, string> = {
  available: '#22c55e',
  rented: '#3b82f6',
  maintenance: '#f59e0b',
  emergency: '#dc2626', // Red for emergency
};

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
    
    const inside = isInsideOperationalArea(vehicle.latitude, vehicle.longitude);
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
                icon={createIcon(markerColor, vehicle.plateNumber, zoneStatus.isOutside, isEmergency)}
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
