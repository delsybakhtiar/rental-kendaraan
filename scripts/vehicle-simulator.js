#!/usr/bin/env node
/**
 * Vehicle Movement Simulator for Geofencing Testing
 * 
 * Simulasi pergerakan kendaraan untuk menguji sistem geofencing.
 * Script akan mengirimkan data GPS secara bertahap dari:
 * - Titik A (dalam zona CBD) → Titik B (luar zona) → Airport (restricted zone)
 */

import http from 'http';

// Configuration - Using tracking service directly for geofencing
const CONFIG = {
  host: 'localhost',
  port: 3003,
  trackingEndpoint: '/tracking/update',
  loginEndpoint: '/auth/login',
  updateInterval: 2000, // 2 detik antar update
  vehicleId: 'cmmeg09100006pqgn8ni9t4ot', // Vehicle ID: B 1234 ABC (Avanza)
};

// Credentials
const CREDENTIALS = {
  email: 'admin@rental.com',
  password: 'admin123',
};

// Route definitions (waypoints)
// Format: { lat, lng, label, speed, heading }
const ROUTES = {
  // Route 1: Dari dalam CBD ke luar CBD (exit alert)
  exitFromCbd: [
    { lat: -6.1850, lng: 106.8400, label: 'Start: Dalam CBD Zone', speed: 20, heading: 180 },
    { lat: -6.1950, lng: 106.8400, label: 'Moving south...', speed: 30, heading: 180 },
    { lat: -6.2050, lng: 106.8400, label: 'Approaching boundary...', speed: 35, heading: 180 },
    { lat: -6.2120, lng: 106.8400, label: '>>> EXITING CBD ZONE! <<<', speed: 40, heading: 180 },
    { lat: -6.2200, lng: 106.8400, label: 'Outside CBD Zone', speed: 45, heading: 180 },
    { lat: -6.2300, lng: 106.8450, label: 'Continuing south...', speed: 50, heading: 200 },
    { lat: -6.2500, lng: 106.8500, label: 'End: Far from CBD', speed: 55, heading: 200 },
  ],
  
  // Route 2: Menuju Airport Restricted Zone (entry alert)
  toAirport: [
    { lat: -6.2500, lng: 106.8500, label: 'Start: South Jakarta', speed: 40, heading: 300 },
    { lat: -6.2200, lng: 106.8000, label: 'Moving northwest...', speed: 45, heading: 310 },
    { lat: -6.1900, lng: 106.7500, label: 'Approaching city...', speed: 50, heading: 290 },
    { lat: -6.1600, lng: 106.7000, label: 'Getting closer to airport...', speed: 55, heading: 290 },
    { lat: -6.1300, lng: 106.6700, label: 'Near airport perimeter!', speed: 50, heading: 280 },
    { lat: -6.1200, lng: 106.6600, label: '>>> ENTERING AIRPORT RESTRICTED ZONE! <<<', speed: 40, heading: 270 },
    { lat: -6.1150, lng: 106.6500, label: 'Inside Restricted Zone!', speed: 30, heading: 260 },
    { lat: -6.1100, lng: 106.6450, label: 'Deep inside restricted area', speed: 20, heading: 250 },
  ],

  // Route 3: Return to CBD (re-entry)
  returnToCbd: [
    { lat: -6.1100, lng: 106.6450, label: 'Start: Leaving airport', speed: 30, heading: 70 },
    { lat: -6.1200, lng: 106.6700, label: 'Exiting restricted zone...', speed: 40, heading: 80 },
    { lat: -6.1400, lng: 106.7000, label: 'Left restricted zone', speed: 50, heading: 90 },
    { lat: -6.1600, lng: 106.7500, label: 'Heading back to city...', speed: 55, heading: 100 },
    { lat: -6.1700, lng: 106.8000, label: 'Approaching CBD...', speed: 50, heading: 90 },
    { lat: -6.1800, lng: 106.8300, label: 'Entering CBD Zone!', speed: 40, heading: 100 },
    { lat: -6.1850, lng: 106.8400, label: 'Back in CBD Zone', speed: 30, heading: 110 },
  ],
};

// HTTP request helper
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      hostname: CONFIG.host,
      port: CONFIG.port,
      path: path,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Login and get JWT token
async function login() {
  console.log('\n[AUTH] Logging in to tracking service...');
  const response = await makeRequest('POST', CONFIG.loginEndpoint, CREDENTIALS);
  
  if (response.status === 200 && response.data.success && response.data.data?.token) {
    console.log('[AUTH] Login successful!');
    console.log(`[AUTH] User: ${response.data.data.user.email} (${response.data.data.user.role})`);
    return response.data.data.token;
  } else {
    throw new Error(`Login failed: ${JSON.stringify(response)}`);
  }
}

// Send tracking update
async function sendTrackingUpdate(token, waypoint, vehicleId) {
  // Tracking service expects snake_case fields
  const data = {
    vehicle_id: vehicleId,
    lat: waypoint.lat,
    lng: waypoint.lng,
    speed: waypoint.speed,
    heading: waypoint.heading,
    ignition: true,
    fuel: 75,
  };
  
  console.log(`\n  [WAYPOINT] ${waypoint.label}`);
  console.log(`             Coords: ${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}`);
  console.log(`             Speed: ${waypoint.speed} km/h, Heading: ${waypoint.heading} deg`);
  
  const response = await makeRequest('POST', CONFIG.trackingEndpoint, data, token);
  
  if (response.status === 200 && response.data.success) {
    console.log('  [OK] Tracking update sent');
    
    // Check for geofence alerts
    if (response.data.data?.geofence_alerts?.length > 0) {
      console.log('\n  ==========================================');
      console.log('  [ALERT] GEOFENCE VIOLATION DETECTED!');
      console.log('  ==========================================');
      response.data.data.geofence_alerts.forEach(alert => {
        console.log(`  [${alert.alert_type.toUpperCase()}] ${alert.message}`);
      });
      console.log('  ==========================================\n');
    }
    
    // Check for warnings
    if (response.data.data?.warnings?.length > 0) {
      console.log('  [WARNINGS]:');
      response.data.data.warnings.forEach(w => {
        console.log(`    - ${w}`);
      });
    }
    
    // Location status
    if (response.data.data?.location_status) {
      const status = response.data.data.location_status;
      console.log(`  [STATUS] Inside safe zone: ${status.is_inside_safe_zone ? 'YES' : 'NO'}`);
    }
  } else {
    console.log(`  [ERROR] ${JSON.stringify(response.data)}`);
  }
  
  return response;
}

// Simulate route
async function simulateRoute(token, routeName, waypoints, vehicleId) {
  console.log('\n' + '='.repeat(60));
  console.log(`[ROUTE] ${routeName}`);
  console.log('='.repeat(60));
  console.log(`Waypoints: ${waypoints.length}`);
  console.log(`Vehicle ID: ${vehicleId}`);
  
  for (let i = 0; i < waypoints.length; i++) {
    console.log(`\n[Progress ${i + 1}/${waypoints.length}]`);
    await sendTrackingUpdate(token, waypoints[i], vehicleId);
    
    // Wait before next update (except for last waypoint)
    if (i < waypoints.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.updateInterval));
    }
  }
  
  console.log('\n[ROUTE] Completed!');
}

// Main function
async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('    VEHICLE MOVEMENT SIMULATOR');
    console.log('    Testing Geofencing Alerts');
    console.log('='.repeat(60));
    
    // Login first
    const token = await login();
    
    // Get vehicle ID from command line or use default
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const vehicleId = args[0] || CONFIG.vehicleId;
    console.log(`\n[CONFIG] Vehicle ID: ${vehicleId}`);
    console.log(`[CONFIG] Tracking Service: ${CONFIG.host}:${CONFIG.port}`);
    console.log(`[CONFIG] Update Interval: ${CONFIG.updateInterval}ms`);
    
    // Parse command line options
    const options = process.argv.slice(2);
    
    if (options.includes('--help') || options.includes('-h')) {
      showHelp();
      return;
    }
    
    if (options.includes('--all') || options.includes('-a')) {
      // Run all routes sequentially
      await simulateRoute(token, 'EXIT FROM CBD', ROUTES.exitFromCbd, vehicleId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await simulateRoute(token, 'TO AIRPORT', ROUTES.toAirport, vehicleId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await simulateRoute(token, 'RETURN TO CBD', ROUTES.returnToCbd, vehicleId);
    } else if (options.includes('--exit')) {
      await simulateRoute(token, 'EXIT FROM CBD', ROUTES.exitFromCbd, vehicleId);
    } else if (options.includes('--airport')) {
      await simulateRoute(token, 'TO AIRPORT', ROUTES.toAirport, vehicleId);
    } else if (options.includes('--return')) {
      await simulateRoute(token, 'RETURN TO CBD', ROUTES.returnToCbd, vehicleId);
    } else {
      // Default: run full demo
      console.log('\n[MODE] Running full demo (all routes)...');
      await simulateRoute(token, 'EXIT FROM CBD', ROUTES.exitFromCbd, vehicleId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await simulateRoute(token, 'TO AIRPORT', ROUTES.toAirport, vehicleId);
      await new Promise(resolve => setTimeout(resolve, 2000));
      await simulateRoute(token, 'RETURN TO CBD', ROUTES.returnToCbd, vehicleId);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('    SIMULATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n[TIPS]');
    console.log('  - Check the Alerts page in the app to see triggered alerts');
    console.log('  - Check the Map page to see vehicle movement');
    console.log('  - Run with --help for more options\n');
    
  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  }
}

// Help text
function showHelp() {
  console.log(`
Vehicle Movement Simulator
==========================

Usage: node scripts/vehicle-simulator.js [vehicleId] [options]

Arguments:
  vehicleId       Vehicle ID to simulate 
                  (default: cmmeg09100006pqgn8ni9t4ot - Avanza)

Options:
  --all, -a       Run all routes sequentially (full demo)
  --exit          Simulate exit from CBD zone only
  --airport       Simulate going to airport only
  --return        Simulate returning to CBD only
  --help, -h      Show this help message

Examples:
  bun scripts/vehicle-simulator.js                      # Full demo
  bun scripts/vehicle-simulator.js --exit               # Exit CBD only
  bun scripts/vehicle-simulator.js --airport            # To airport only

Geofence Zones:
  [SAFE] Jakarta CBD Zone (alert on exit)
     Lat: -6.1600 to -6.2100
     Lng: 106.8200 to 106.8600

  [RESTRICTED] Airport Zone (alert on entry)
     Lat: -6.1000 to -6.1400
     Lng: 106.6400 to 106.6800
`);
}

// Run main
main();
