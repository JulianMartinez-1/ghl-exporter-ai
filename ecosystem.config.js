// PM2 process manager config — used on Hostinger VPS
// Start both processes: pm2 start ecosystem.config.js
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
    {
      name: "ghl-exporter-worker",
      script: "node_modules/.bin/tsx",
      args: "src/modules/jobs/worker.ts",
      cwd: "/var/www/ghl-exporter",
      env_production: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
