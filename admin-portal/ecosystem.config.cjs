// PM2 sandbox config — serves the built Angular admin portal as static files
// Usage: npm run build:prod && pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'echora-admin',
      script: 'npx',
      args: 'serve www -l 39510 -s --no-clipboard',
      cwd: __dirname,
      env: {
        NODE_ENV: 'sandbox',
      },
    },
  ],
};
