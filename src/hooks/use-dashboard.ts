import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DashboardStats, Vehicle, TrackingLog, Geofence, GeofenceAlert, TrackingStatus } from '@/types';

function getAuthHeaders(init?: HeadersInit): HeadersInit {
  if (typeof window === 'undefined') {
    return init || {};
  }

  const token = window.localStorage.getItem('token');

  if (!token) {
    return init || {};
  }

  return {
    ...init,
    Authorization: `Bearer ${token}`,
  };
}

// Dashboard data hook
export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    staleTime: 2000, // Consider data stale after 2 seconds
  });
}

// Vehicles hooks
export function useVehicles(status?: string) {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles', status],
    queryFn: async () => {
      const url = status ? `/api/vehicles?status=${status}` : '/api/vehicles';
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch vehicles');
      const json = await res.json();
      // Handle both array response and {success, data} response format
      return Array.isArray(json) ? json : (json.data || []);
    },
  });
}

export function useVehicle(id: string) {
  return useQuery<Vehicle & { trackingLogs: TrackingLog[] }>({
    queryKey: ['vehicle', id],
    queryFn: async () => {
      const res = await fetch(`/api/vehicles/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch vehicle');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Vehicle>) => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Vehicle> }) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete vehicle');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Tracking hooks
export function useTrackingLogs(vehicleId?: string, hours = 24) {
  return useQuery<{
    vehicle: Partial<Vehicle>;
    logs: TrackingLog[];
    totalPoints: number;
  }>({
    queryKey: ['tracking', vehicleId, hours],
    queryFn: async () => {
      const res = await fetch(`/api/tracking/${vehicleId}?hours=${hours}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch tracking logs');
      return res.json();
    },
    enabled: !!vehicleId,
  });
}

export function useTrackingStatus() {
  return useQuery<TrackingStatus>({
    queryKey: ['tracking-status'],
    queryFn: async () => {
      const res = await fetch('/api/tracking/status', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch tracking logs');
      return res.json();
    },
  });
}

export function useCreateTrackingLog() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<TrackingLog>) => {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create tracking log');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Geofences hooks
export function useGeofences(isActive?: boolean) {
  return useQuery<Geofence[]>({
    queryKey: ['geofences', isActive],
    queryFn: async () => {
      const url = isActive !== undefined ? `/api/geofences?isActive=${isActive}` : '/api/geofences';
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch geofences');
      const json = await res.json();
      // Handle both array response and {success, data} response format
      return Array.isArray(json) ? json : (json.data || []);
    },
  });
}

export function useCreateGeofence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<Geofence>) => {
      const res = await fetch('/api/geofences', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create geofence');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateGeofence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Geofence> }) => {
      const res = await fetch(`/api/geofences/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update geofence');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteGeofence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/geofences/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete geofence');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

// Alerts hooks
export function useAlerts(isResolved?: boolean) {
  return useQuery<GeofenceAlert[]>({
    queryKey: ['alerts', isResolved],
    queryFn: async () => {
      const url = isResolved !== undefined ? `/api/geofences/alerts?isResolved=${isResolved}` : '/api/geofences/alerts';
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch alerts');
      const json = await res.json();
      // Handle both array response and {success, data} response format
      return Array.isArray(json) ? json : (json.data || []);
    },
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alertId: string) => {
      const res = await fetch('/api/geofences/alerts', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) throw new Error('Failed to resolve alert');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
