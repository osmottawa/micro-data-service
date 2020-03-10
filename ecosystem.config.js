module.exports = {
  apps: [
    {
      name: "micro-data-service",
      script: 'index.ts',
      args: [],
      autorestart: true,
      log_date_format : "YYYY-MM-DD HH:mm"
    }
  ]
};