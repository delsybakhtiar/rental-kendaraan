# Deployment & SSL Documentation

## 📁 File Structure

```
deploy/
├── nginx/
│   └── car-rental.conf        # Nginx reverse proxy configuration
├── scripts/
│   ├── install-certbot.sh     # Certbot installation script
│   └── health-check.sh        # Health monitoring script
└── README.md
```

## 🔒 1. Nginx Reverse Proxy Configuration

### Location
`/etc/nginx/sites-available/car-rental`

### Features
- **HTTPS Redirect**: All HTTP traffic redirects to HTTPS
- **Rate Limiting**: 10 req/s general, 5 req/min for auth endpoints
- **Security Headers**: XSS protection, clickjacking prevention, HSTS
- **WebSocket Support**: For real-time tracking updates
- **Static File Caching**: 1 year cache for Next.js static assets
- **Health Check Bypass**: No rate limiting for health endpoints

### Installation Steps
```bash
# 1. Copy configuration
sudo cp deploy/nginx/car-rental.conf /etc/nginx/sites-available/car-rental

# 2. Create symlink
sudo ln -s /etc/nginx/sites-available/car-rental /etc/nginx/sites-enabled/

# 3. Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# 4. Test configuration
sudo nginx -t

# 5. Reload Nginx
sudo systemctl reload nginx
```

## 🌐 2. Certbot (Let's Encrypt) SSL Installation

### Quick Install
```bash
# Run the installation script
sudo bash deploy/scripts/install-certbot.sh yourdomain.com
```

### Manual Installation Steps
```bash
# 1. Update and install dependencies
sudo apt update
sudo apt install -y software-properties-common certbot python3-certbot-nginx

# 2. Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 3. Test auto-renewal
sudo certbot renew --dry-run

# 4. Check certificate status
sudo certbot certificates
```

### Certificate Locations
- **Certificate**: `/etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- **Private Key**: `/etc/letsencrypt/live/yourdomain.com/privkey.pem`
- **Chain**: `/etc/letsencrypt/live/yourdomain.com/chain.pem`

### Auto-Renewal
Certbot sets up auto-renewal via systemd timer:
```bash
# Check timer status
sudo systemctl status certbot.timer

# Force renewal
sudo certbot renew --force-renewal
```

## 🔐 3. Secure Cookie Configuration

### Implementation
Cookies and sessions are configured with security flags:

| Flag | Purpose |
|------|---------|
| **Secure** | Only sent over HTTPS |
| **HttpOnly** | Not accessible via JavaScript (XSS protection) |
| **SameSite=Strict** | Prevents CSRF attacks |

### Middleware Configuration
File: `src/middleware.ts`

```typescript
// Example secure cookie setting
response.cookies.set('session', token, {
  httpOnly: true,      // Not accessible via JavaScript
  secure: true,        // Only sent over HTTPS (set false in dev)
  sameSite: 'strict',  // Prevent CSRF
  path: '/',
  maxAge: 60 * 60 * 24, // 24 hours
});
```

### Security Headers
Automatically added by middleware:

```http
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## 🏥 4. Health Check Endpoints

### Main Application
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 86400,
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "vehicles": { "status": "healthy", "message": "5 vehicles registered" },
    "geofences": { "status": "healthy", "message": "3 active geofences" },
    "tracking": { "status": "healthy", "message": "150 tracking points in last hour" },
    "alerts": { "status": "healthy", "message": "2 unresolved alerts" },
    "memory": { "status": "healthy", "message": "Heap: 120MB / 256MB (47%)" }
  }
}
```

### Tracking Service
```
GET /health              # Full health check
GET /health/live         # Liveness probe (Kubernetes)
GET /health/ready        # Readiness probe (Kubernetes)
```

### Health Check Script
```bash
# Run manually
bash deploy/scripts/health-check.sh

# Set up cron job (every 5 minutes)
*/5 * * * * /home/z/my-project/deploy/scripts/health-check.sh >> /var/log/car-rental-health.log 2>&1
```

### Kubernetes Probes
```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## 🚀 Quick Deployment Checklist

- [ ] Copy Nginx config to `/etc/nginx/sites-available/`
- [ ] Create symlink to `sites-enabled/`
- [ ] Install Certbot and obtain SSL certificate
- [ ] Update `.env` with production values
- [ ] Set `NODE_ENV=production`
- [ ] Configure `JWT_SECRET` with strong secret
- [ ] Enable auto-renewal for SSL
- [ ] Set up health monitoring cron job
- [ ] Configure firewall (UFW)
- [ ] Test HTTPS redirect

## 🔥 Firewall Configuration (UFW)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

## 📊 Monitoring

### Health Check Endpoints
- **Main App**: `https://yourdomain.com/api/health`
- **Tracking Service**: `https://yourdomain.com/tracking-service/health`

### Status Codes
| Code | Status |
|------|--------|
| 200 | Healthy / Degraded |
| 503 | Unhealthy |

### Alerts
Configure webhook in `health-check.sh`:
```bash
export ALERT_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```
