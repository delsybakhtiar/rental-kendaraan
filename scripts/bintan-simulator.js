#!/usr/bin/env node
/**
 * Bintan Island Vehicle Movement Simulator
 * 
 * Simulasi pergerakan kendaraan untuk menguji sistem geofencing Bintan Island.
 * Script akan mengirimkan data GPS secara bertahap untuk:
 * - Test Island Boundary Exit (CRITICAL alert)
 * - Test Port Watch Stationary Detection (HIGH alert)
 * - Test Engine Kill functionality
 */

import http from 'http';

// Configuration
const CONFIG = {
  host: 'localhost',
  port: 3003,
  trackingEndpoint: '/tracking/update',
  loginEndpoint: '/auth/login',
  updateInterval: 2000, // 2 seconds
  vehicleId: 'cmmeki4320003pqti6tjox9kk', // Default to first seeded vehicle (BP 1234 AA - Avanza)
};

// Credentials
const CREDENTIALS = {
  email: 'admin@bintanrental.com',
  password: 'admin123',
};

// Bintan Island Routes
const ROUTES = {
  // Route 1: Exit Bintan Island (CRITICAL alert)
  exitBintanIsland: [
    // Start inside Bintan (Tanjung Pinang area)
    { lat: 1.05, lng: 104.35, label: 'Start: Tanjung Pinang City Center', speed: 30, heading: 225 },
    { lat: 1.02, lng: 104.30, label: 'Moving southwest toward coast...', speed: 40, heading: 230 },
    { lat: 0.95, lng: 104.25, label: 'Approaching west coast of Bintan...', speed: 45, heading: 235 },
    { lat: 0.88, lng: 104.20, label: 'Near coast line...', speed: 35, heading: 240 },
    { lat: 0.82, lng: 104.15, label: '>>> EXITING BINTAN ISLAND BOUNDARY! <<<', speed: 25, heading: 250 },
    { lat: 0.78, lng: 104.10, label: 'OUTSIDE BINTAN - In the sea!', speed: 15, heading: 260 },
    { lat: 0.75, lng: 104.05, label: 'Moving toward Batam direction...', speed: 20, heading: 270 },
  ],
  
  // Route 2: Stationary at Tanjung Uban Port (HIGH alert)
  stationaryAtTanjungUban: [
    { lat: 1.06, lng: 104.30, label: 'Start: North Bintan', speed: 40, heading: 300 },
    { lat: 1.07, lng: 104.26, label: 'Approaching Tanjung Uban...', speed: 30, heading: 290 },
    { lat: 1.08, lng: 104.24, label: 'Entering Tanjung Uban Port area...', speed: 20, heading: 280 },
    // Stationary points - same location, different time (speed = 0)
    { lat: 1.08, lng: 104.24, label: 'STOPPED at Tanjung Uban Port (0 min)', speed: 0, heading: 280 },
    { lat: 1.08, lng: 104.24, label: 'Still stationary (2 min)...', speed: 0, heading: 280 },
    { lat: 1.08, lng: 104.24, label: 'Still stationary (4 min)...', speed: 0, heading: 280 },
    { lat: 1.08, lng: 104.24, label: 'Still stationary (6 min)...', speed: 0, heading: 280 },
    { lat: 1.08, lng: 104.24, label: '>>> STATIONARY > 30 MIN - PORT WATCH ALERT! <<<', speed: 0, heading: 280 },
  ],
  
  // Route 3: Stationary at Sri Bintan Pura Port (HIGH alert)
  stationaryAtSriBintanPura: [
    { lat: 1.00, lng: 104.40, label: 'Start: Central Bintan', speed: 35, heading: 200 },
    { lat: 0.95, lng: 104.44, label: 'Approaching Tanjung Pinang port...', speed: 25, heading: 210 },
    { lat: 0.92, lng: 104.46, label: 'Entering Sri Bintan Pura Port area...', speed: 15, heading: 220 },
    // Stationary points
    { lat: 0.91, lng: 104.46, label: 'STOPPED at Sri Bintan Pura Port (0 min)', speed: 0, heading: 220 },
    { lat: 0.91, lng: 104.46, label: 'Still stationary (2 min)...', speed: 0, heading: 220 },
    { lat: 0.91, lng: 104.46, label: 'Still stationary (4 min)...', speed: 0, heading: 220 },
    { lat: 0.91, lng: 104.46, label: '>>> STATIONARY > 30 MIN - PORT WATCH ALERT! <<<', speed: 0, heading: 220 },
  ],
  
  // Route 4: Normal driving within Bintan (no alerts)
  normalDrivingInBintan: [
    { lat: 1.05, lng: 104.35, label: 'Start: Tanjung Pinang', speed: 30, heading: 45 },
    { lat: 1.08, lng: 104.40, label: 'Driving north...', speed: 40, heading: 30 },
    { lat: 1.12, lng: 104.45, label: 'Continuing north...', speed: 45, heading: 45 },
    { lat: 1.15, lng: 104.50, label: 'Turning east...', speed: 35, heading: 90 },
    { lat: 1.15, lng: 104.55, label: 'Driving east...', speed: 40, heading: 100 },
    { lat: 1.12, lng: 104.60, label: 'Turning south...', speed: 35, heading: 150 },
    { lat: 1.08, lng: 104.55, label: 'Driving back...', speed: 40, heading: 200 },
    { lat: 1.05, lng: 104.45, label: 'Back to Tanjung Pinang area', speed: 30, heading: 240 },
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

// Login
async function login() {
  console.log('\n[AUTH] Logging in to Bintan Island Tracking Service...');
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
  const data = {
    vehicle_id: vehicleId,
    lat: waypoint.lat,
    lng: waypoint.lng,
    speed: waypoint.speed,
    heading: waypoint.heading,
    ignition: waypoint.speed > 0,
    fuel: 75,
  };
  
  console.log(`\n  [WAYPOINT] ${waypoint.label}`);
  console.log(`             Coords: ${waypoint.lat.toFixed(4)}, ${waypoint.lng.toFixed(4)}`);
  console.log(`             Speed: ${waypoint.speed} km/h, Heading: ${waypoint.heading} deg`);
  
  const response = await makeRequest('POST', CONFIG.trackingEndpoint, data, token);
  
  if (response.status === 200 && response.data.success) {
    console.log('  [OK] Tracking update sent');
    
    // Check for alerts
    if (response.data.data?.geofence_alerts?.length > 0) {
      console.log('\n  ' + '='.repeat(50));
      console.log('  [ALERT] GEOFENCE VIOLATION DETECTED!');
      console.log('  ' + '='.repeat(50));
      response.data.data.geofence_alerts.forEach(alert => {
        const level = alert.alertLevel || alert.alert_level || 'ALERT';
        const type = alert.alertType || alert.alert_type || 'unknown';
        console.log(`  [${level.toUpperCase()}] ${type.toUpperCase()}`);
        console.log(`  ${alert.message.split('\n')[0]}`);
      });
      console.log('  ' + '='.repeat(50) + '\n');
    }
    
    // Check warnings
    if (response.data.data?.warnings?.length > 0) {
      console.log('  [WARNINGS]:');
      response.data.data.warnings.forEach(w => {
        console.log(`    - ${w}`);
      });
    }
    
    // Location status
    if (response.data.data?.location_status) {
      const status = response.data.data.location_status;
      console.log(`  [STATUS] Inside Bintan Island: ${status.is_inside_island ? 'YES' : 'NO'}`);
      if (status.inside_port_watch?.length > 0) {
        console.log(`  [STATUS] Inside Port Watch Zone: ${status.inside_port_watch.join(', ')}`);
      }
    }
    
    // Engine status
    if (response.data.data?.engine_status) {
      console.log(`  [ENGINE] Status: ${response.data.data.engine_status}`);
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
    
    if (i < waypoints.length - 1) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.updateInterval));
    }
  }
  
  console.log('\n[ROUTE] Completed!');
}

// Show help
function showHelp() {
  console.log(`
Bintan Island Vehicle Movement Simulator
========================================

Usage: bun scripts/bintan-simulator.js [vehicleId] [options]

Arguments:
  vehicleId       Vehicle ID to simulate (will use first available if not specified)

Options:
  --exit          Simulate EXIT from Bintan Island (CRITICAL alert)
  --port-uban     Simulate STATIONARY at Tanjung Uban Port (HIGH alert)
  --port-sbp      Simulate STATIONARY at Sri Bintan Pura Port (HIGH alert)
  --normal        Simulate NORMAL driving within Bintan (no alerts)
  --all           Run ALL test scenarios sequentially
  --help, -h      Show this help message

Examples:
  bun scripts/bintan-simulator.js                    # Full demo
  bun scripts/bintan-simulator.js --exit             # Test island exit only
  bun scripts/bintan-simulator.js --port-uban        # Test port watch only

Geofence Zones:
  [ISLAND BOUNDARY] Bintan Island
     Alert Level: CRITICAL
     Alert on EXIT - Vehicle leaving Bintan Island

  [PORT WATCH] Tanjung Uban Port
     Alert Level: HIGH
     Alert on STATIONARY > 30 minutes

  [PORT WATCH] Sri Bintan Pura Port (Tanjung Pinang)
     Alert Level: HIGH
     Alert on STATIONARY > 30 minutes
`);
}

// Main function
async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('    BINTAN ISLAND VEHICLE SIMULATOR');
    console.log('    Testing Geofencing & Security Features');
    console.log('='.repeat(60));
    
    // Check for help
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      showHelp();
      return;
    }
    
    // Login
    const token = await login();
    
    // Get vehicle ID
    const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
    const vehicleId = args[0] || CONFIG.vehicleId;
    
    console.log(`\n[CONFIG] Vehicle ID: ${vehicleId}`);
    console.log(`[CONFIG] Tracking Service: ${CONFIG.host}:${CONFIG.port}`);
    console.log(`[CONFIG] Update Interval: ${CONFIG.updateInterval}ms`);
    
    // Parse options
    const options = process.argv.slice(2);
    
    if (options.includes('--exit')) {
      await simulateRoute(token, 'EXIT BINTAN ISLAND (CRITICAL)', ROUTES.exitBintanIsland, vehicleId);
    } else if (options.includes('--port-uban')) {
      await simulateRoute(token, 'STATIONARY AT TANJUNG UBAN PORT (HIGH)', ROUTES.stationaryAtTanjungUban, vehicleId);
    } else if (options.includes('--port-sbp')) {
      await simulateRoute(token, 'STATIONARY AT SRI BINTAN PURA PORT (HIGH)', ROUTES.stationaryAtSriBintanPura, vehicleId);
    } else if (options.includes('--normal')) {
      await simulateRoute(token, 'NORMAL DRIVING IN BINTAN', ROUTES.normalDrivingInBintan, vehicleId);
    } else if (options.includes('--all')) {
      // Run all scenarios
      await simulateRoute(token, 'NORMAL DRIVING IN BINTAN', ROUTES.normalDrivingInBintan, vehicleId);
      await new Promise(resolve => setTimeout(resolve, 3000));
      await simulateRoute(token, 'EXIT BINTAN ISLAND (CRITICAL)', ROUTES.exitBintanIsland, vehicleId);
    } else {
      // Default: run exit scenario for demo
      console.log('\n[MODE] Running island exit demo...');
      await simulateRoute(token, 'EXIT BINTAN ISLAND (CRITICAL)', ROUTES.exitBintanIsland, vehicleId);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('    SIMULATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n[TIPS]');
    console.log('  - Check the Dashboard to see alerts');
    console.log('  - Use --exit for critical island exit alert');
    console.log('  - Use --port-uban for port watch stationary alert');
    console.log('  - Run with --help for more options\n');
    
  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  }
}

// Run main
main();
