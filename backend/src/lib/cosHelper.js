import COS from 'cos-nodejs-sdk-v5';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { logger } from './logger.js';

const bucket = process.env.COS_BUCKET;
const region = process.env.COS_REGION || 'ap-singapore';

const folder = process.env.NODE_ENV === 'production'
  ? 'ec/prod'
  : 'ec/sand';

let cos;
function getClient() {
  if (cos) return cos;
  const id = process.env.COS_SECRET_ID;
  const key = process.env.COS_SECRET_KEY;
  if (!id || !key) throw new Error('COS_SECRET_ID and COS_SECRET_KEY are required');
  cos = new COS({ SecretId: id, SecretKey: key });
  return cos;
}

// Upload a multer file to COS.
// visibility: 'public' (direct URL access) or 'private' (presigned URL only).
// Returns { ok, key, url } — url is direct for public, signed for private.
export async function uploadFile(file, { visibility = 'public', subfolder = '' } = {}) {
  const prefix = subfolder ? `${folder}/${subfolder}` : folder;
  const key = `${prefix}/${file.filename}`;
  const acl = visibility === 'public' ? 'public-read' : 'private';

  const result = await getClient().putObject({
    Bucket: bucket,
    Region: region,
    Key: key,
    Body: fs.createReadStream(file.path),
    ACL: acl,
  });

  // Clean up local file after successful upload
  await fsp.unlink(file.path).catch(() => {});

  if (result.statusCode !== 200) {
    logger.error({ statusCode: result.statusCode, key }, 'COS upload failed');
    return { ok: false };
  }

  const url = visibility === 'public'
    ? `https://${bucket}.cos.${region}.myqcloud.com/${key}`
    : await getSignedUrl(key);

  return { ok: true, key, url };
}

// Generate a presigned URL for a private COS object. Returns empty string on failure.
export function getSignedUrl(key, expiresSec = 3600) {
  if (!key) return Promise.resolve('');
  return new Promise((resolve) => {
    getClient().getObjectUrl(
      { Bucket: bucket, Region: region, Key: decodeURIComponent(key), Sign: true, Expires: expiresSec },
      (err, data) => {
        if (err) {
          logger.error({ err: err.message, key }, 'COS signed URL error');
          resolve('');
          return;
        }
        resolve(data.Url);
      },
    );
  });
}

// Build a direct public URL (no signing). Only works if the object has public-read ACL.
export function getPublicUrl(key) {
  if (!key) return '';
  return `https://${bucket}.cos.${region}.myqcloud.com/${key}`;
}

// Attach a `url` field to an object based on its media key.
// For public keys (under */prod/ or */sand/), returns direct URL.
// For private keys, generates a presigned URL.
export async function attachUrl(item, { field = 'filename', forcePrivate = false } = {}) {
  if (!item) return item;
  const key = item[field];
  if (!key) return item;
  item.url = forcePrivate ? await getSignedUrl(key) : getPublicUrl(key);
  return item;
}

// Attach URLs to an array of items. Same options as attachUrl.
export async function attachUrls(items, opts = {}) {
  if (!Array.isArray(items)) return items;
  return Promise.all(items.map((item) => attachUrl(item, opts)));
}

// Delete an object from COS.
export async function deleteFile(key) {
  if (!key) return;
  try {
    await getClient().deleteObject({ Bucket: bucket, Region: region, Key: key });
  } catch (err) {
    logger.error({ err: err.message, key }, 'COS delete failed');
  }
}

export { bucket, region, folder };
