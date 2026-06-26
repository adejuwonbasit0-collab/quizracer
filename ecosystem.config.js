module.exports = {
  apps: [
    {
      name: 'quizracer-api',
      script: 'apps/api/dist/main.js',
      cwd: '/app',
      instances: 'max',         // One per CPU core
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Log rotation
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file:  '/app/logs/api-error.log',
      out_file:    '/app/logs/api-out.log',
      merge_logs:  true,

      // Graceful restart
      kill_timeout: 10000,
      wait_ready:   true,
      listen_timeout: 30000,

      // Health check
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
};
