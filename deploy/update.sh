#!/bin/bash
# Pull latest code from GitHub and restart the app
# Run from the VPS: bash /var/www/ghl-exporter/deploy/update.sh

set -e
cd /var/www/ghl-exporter

echo "Pulling latest changes..."
git pull origin main

echo "Installing dependencies..."
npm install --production=false

echo "Generating Prisma client..."
npx prisma generate

echo "Building..."
npm run build

echo "Restarting processes..."
pm2 restart ghl-exporter-web

echo "Done. App updated."
pm2 list
