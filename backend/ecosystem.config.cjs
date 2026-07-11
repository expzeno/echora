module.exports = {
  apps: [
    {
      name: 'dev-echora-api',
      script: 'src/server.js',
      cwd: '/home/server_tridentity_me/projects/echora/backend',
      instances: process.env.PM2_INSTANCES || (process.env.NODE_ENV === 'production' ? 'max' : 1),
      exec_mode: process.env.NODE_ENV === 'production' ? 'cluster' : 'fork',
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 10000,
      env: {
        NODE_ENV: 'development',
        DEPLOY_ENV: 'dev',
        PORT: 37600,
        INLINE_WORKER: 'true',
        // Required for the backend to boot
        DATABASE_URL: 'postgresql://server_tridentity_me@localhost:5432/echora_db?connection_limit=20',
        LOGS_DATABASE_URL: 'postgresql://server_tridentity_me@localhost:5432/echora_db_logs?connection_limit=5',
        JWT_PRIVATE_KEY_PATH: '/home/server_tridentity_me/projects/echora/backend/keys/private.pem',
        JWT_PUBLIC_KEY_PATH: '/home/server_tridentity_me/projects/echora/backend/keys/public.pem',
      },
      env_production: {
        NODE_ENV: 'production',
        DEPLOY_ENV: 'production',
        PORT: '37600',
        PRISMA_POOL_SIZE: 20,
        PRISMA_POOL_TIMEOUT: 15,
        INLINE_WORKER: 'false',
      },
    },
    {
      name: 'dev-echora-log-worker',
      script: 'src/workers/logWorker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        DEPLOY_ENV: 'dev',
      },
    },
  ],
};
