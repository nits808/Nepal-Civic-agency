// ═══════════════════════════════════════════════════════════════
// NCIG Backend — PM2 Ecosystem Config
// Run:     pm2 start ecosystem.config.cjs --env production
// Monitor: pm2 monit
// Logs:    pm2 logs ncig-backend
// Stop:    pm2 stop ncig-backend
// Restart: pm2 restart ncig-backend
// Save:    pm2 save  (persists across reboots)
// Startup: pm2 startup  (auto-start on system boot)
// ═══════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      name: 'ncig-backend',
      script: './server.js',

      // Working directory
      cwd: './',

      // Environment — Production
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        FRONTEND_ORIGIN: 'http://localhost:5173',
      },

      // Environment — Development
      env_development: {
        NODE_ENV: 'development',
        PORT: 4000,
        FRONTEND_ORIGIN: 'http://localhost:5173',
      },

      // Restart strategy
      watch: false,              // don't restart on file changes in prod
      max_memory_restart: '300M',
      restart_delay: 4000,       // wait 4s before restarting on crash
      max_restarts: 10,          // give up after 10 consecutive crashes
      min_uptime: '10s',

      // Logging
      out_file: './logs/ncig-out.log',
      error_file: './logs/ncig-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,

      // Single instance (SQLite is not multi-process safe)
      instances: 1,
      exec_mode: 'fork',

      // Auto-start on server reboot after pm2 startup + pm2 save
      autorestart: true,

      // Graceful shutdown timeout (ms)
      kill_timeout: 5000,
    }
  ]
};
