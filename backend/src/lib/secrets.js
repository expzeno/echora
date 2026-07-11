import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

// DEPLOY_ENV distinguishes sandbox from production.
// NODE_ENV is 'production' on BOTH (for Node.js optimization, PM2 cluster, etc.)
// In dev: NODE_ENV is unset or 'development' — dotenv handles everything, skip GCP.
export async function loadSecrets() {
  const deployEnv = process.env.DEPLOY_ENV;
  if (!deployEnv) return;

  const manifestPath = path.join(PROJECT_ROOT, 'secrets.manifest.json');
  if (!fs.existsSync(manifestPath)) return;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  if (manifest.provider !== 'gcp-secret-manager') return;

  const gcpProject = manifest.project.replaceAll('${ENV}', deployEnv);

  // GCP auth: GOOGLE_APPLICATION_CREDENTIALS file (set by PipeZeno) → ./gcp-sa.json fallback
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const fallback = path.join(PROJECT_ROOT, 'gcp-sa.json');
    if (fs.existsSync(fallback)) process.env.GOOGLE_APPLICATION_CREDENTIALS = fallback;
  }

  let SecretManagerServiceClient;
  try {
    ({ SecretManagerServiceClient } = await import('@google-cloud/secret-manager'));
  } catch {
    console.warn(`[secrets] @google-cloud/secret-manager not installed — skipping GCP fetch for ${deployEnv}`);
    return;
  }

  const client = new SecretManagerServiceClient();
  const results = await Promise.allSettled(
    manifest.secrets.map(async (entry) => {
      const secretId = entry.secretId.replaceAll('${ENV}', deployEnv);
      const name = `projects/${gcpProject}/secrets/${secretId}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      const value = version.payload.data.toString('utf-8');
      process.env[entry.name] = value;
      return entry.name;
    }),
  );

  const loaded = [];
  const failed = [];
  for (const r of results) {
    if (r.status === 'fulfilled') loaded.push(r.value);
    else failed.push(r.reason?.message || 'unknown');
  }

  console.log(`[secrets] ${deployEnv}: loaded ${loaded.length}/${manifest.secrets.length} secrets from GCP`);
  if (failed.length > 0) {
    console.error(`[secrets] failed to load ${failed.length} secrets:`, failed);
  }
}
