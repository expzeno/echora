// Centralise all Redis key construction.
// DEPLOY_ENV is injected by the pipeline (sandbox/production). Falls back to 'dev' locally.
// Every Redis key must be prefixed with PFX so dev/sandbox/production never share state.
const ENV = process.env.DEPLOY_ENV || 'dev';
export const PFX = `ec-${ENV}`;

export const keys = {
  jwt: (token)               => `${PFX}:jwt:${token}`,
  profile: (type, id)        => `${PFX}:profile:${type}:${id}`,
  rateLimit: (identity)      => `${PFX}:rl:${identity}`,
};
