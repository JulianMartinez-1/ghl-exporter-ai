// PM2 process manager config — used on Hostinger VPS
// Start:                pm2 start ecosystem.config.js --env production
// Save process list:    pm2 save
// Auto-start on boot:   pm2 startup

module.exports = {
  apps: [
    {
      name: "ghl-exporter-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/ghl-exporter",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
