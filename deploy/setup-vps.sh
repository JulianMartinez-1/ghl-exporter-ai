#!/bin/bash
# GHL Exporter AI — Hostinger VPS setup script
# Run as root on a fresh Ubuntu 22.04 VPS
# Usage: bash setup-vps.sh

set -e

APP_DIR="/var/www/ghl-exporter"
REPO_URL="https://github.com/JulianMartinez-1/ghl-exporter-ai.git"

echo "=== 1. Updating system ==="
apt-get update -y && apt-get upgrade -y

echo "=== 2. Installing Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== 3. Installing build tools, Redis, Nginx ==="
apt-get install -y build-essential git nginx redis-server

echo "=== 4. Installing PM2 ==="
npm install -g pm2

echo "=== 5. Installing Playwright browser dependencies ==="
npx playwright install-deps chromium

echo "=== 6. Cloning repository ==="
mkdir -p /var/www
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo "=== 7. Installing dependencies ==="
npm install --production=false

echo "=== 8. IMPORTANT: Create .env.production before continuing ==="
echo "Copy your environment variables to: $APP_DIR/.env.production"
echo "Required vars: DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,"
echo "  CLERK_SECRET_KEY, CLERK_WEBHOOK_SECRET, GHL_CLIENT_ID, GHL_CLIENT_SECRET,"
echo "  REDIS_URL, GITHUB_TOKEN, GITHUB_ORG, VERCEL_TOKEN, ENCRYPTION_KEY,"
echo "  NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "After creating .env.production, run:"
echo "  cd $APP_DIR && npx prisma generate && npm run db:push"
echo "  npm run build"
echo "  pm2 start ecosystem.config.js --env production"
echo "  pm2 save && pm2 startup"
echo ""
echo "Then configure Nginx:"
echo "  cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/ghl-exporter"
echo "  ln -s /etc/nginx/sites-available/ghl-exporter /etc/nginx/sites-enabled/"
echo "  nginx -t && systemctl reload nginx"
echo ""
echo "For HTTPS (after pointing your domain to this server's IP):"
echo "  apt-get install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d tudominio.com"
