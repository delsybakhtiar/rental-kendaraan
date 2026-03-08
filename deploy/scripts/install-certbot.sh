#!/bin/bash
# ===========================================================
# Certbot (Let's Encrypt) SSL Installation Script
# Ubuntu 20.04 / 22.04 / 24.04
# ===========================================================
#
# Usage: sudo bash install-certbot.sh yourdomain.com
#
# ===========================================================

set -e

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (sudo)"
    exit 1
fi

# Check domain argument
if [ -z "$1" ]; then
    echo "❌ Usage: sudo bash install-certbot.sh yourdomain.com"
    exit 1
fi

DOMAIN="$1"

echo "=========================================="
echo "🔒 Certbot SSL Installation"
echo "=========================================="
echo "Domain: $DOMAIN"
echo ""

# Step 1: Update package list
echo "📦 Step 1: Updating package list..."
apt update -y

# Step 2: Install dependencies
echo "📦 Step 2: Installing dependencies..."
apt install -y software-properties-common curl

# Step 3: Add Certbot PPA (for Ubuntu)
echo "📦 Step 3: Adding Certbot repository..."
if ! grep -q "ppa:certbot/certbot" /etc/apt/sources.list.d/*.list 2>/dev/null; then
    add-apt-repository -y ppa:certbot/certbot || true
    apt update -y
fi

# Step 4: Install Certbot and Nginx plugin
echo "📦 Step 4: Installing Certbot..."
apt install -y certbot python3-certbot-nginx

# Step 5: Check if Nginx is running
echo "🔍 Step 5: Checking Nginx status..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "⚠️  Nginx is not running. Starting Nginx..."
    systemctl start nginx
    systemctl enable nginx
fi

# Step 6: Create webroot for ACME challenge
echo "📁 Step 6: Creating ACME challenge directory..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot
chmod -R 755 /var/www/certbot

# Step 7: Obtain SSL Certificate
echo ""
echo "=========================================="
echo "🔐 Step 7: Obtaining SSL Certificate"
echo "=========================================="
echo ""
echo "Choose certificate type:"
echo "1) Single Domain (yourdomain.com)"
echo "2) Domain + WWW (yourdomain.com + www.yourdomain.com)"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        DOMAINS="$DOMAIN"
        ;;
    2)
        DOMAINS="$DOMAIN,www.$DOMAIN"
        ;;
    *)
        echo "Invalid choice. Using single domain."
        DOMAINS="$DOMAIN"
        ;;
esac

echo ""
echo "Requesting certificate for: $DOMAINS"
echo ""

# Use certbot with nginx plugin
certbot --nginx -d "$DOMAINS" \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --redirect || {
        echo ""
        echo "⚠️  Automatic configuration failed."
        echo "Trying manual method with webroot..."
        
        certbot certonly --webroot \
            -w /var/www/certbot \
            -d "$DOMAINS" \
            --non-interactive \
            --agree-tos \
            --register-unsafely-without-email
    }

# Step 8: Set up auto-renewal
echo ""
echo "🔄 Step 8: Setting up auto-renewal..."
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

# Test renewal
echo "Testing renewal process..."
certbot renew --dry-run || true

# Step 9: Reload Nginx
echo ""
echo "🔄 Step 9: Reloading Nginx..."
nginx -t && systemctl reload nginx

echo ""
echo "=========================================="
echo "✅ SSL Installation Complete!"
echo "=========================================="
echo ""
echo "Certificate Location:"
echo "  - Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "  - Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo "  - Chain: /etc/letsencrypt/live/$DOMAIN/chain.pem"
echo ""
echo "Renewal Commands:"
echo "  - Test renewal: sudo certbot renew --dry-run"
echo "  - Force renewal: sudo certbot renew --force-renewal"
echo "  - Auto-renewal is enabled via systemd timer"
echo ""
echo "Next Steps:"
echo "  1. Update Nginx config with the certificate paths"
echo "  2. Restart Nginx: sudo systemctl restart nginx"
echo "  3. Test HTTPS: https://$DOMAIN"
echo ""
