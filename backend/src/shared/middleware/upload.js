import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileTypeFromFile } from 'file-type';
import sharp from 'sharp';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function upload({ folder = 'uploads', maxSize = 5 * 1024 * 1024, mime = [] } = {}) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, folder),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });

  const fileFilter = mime.length > 0
    ? (req, file, cb) => cb(null, mime.includes(file.mimetype))
    : undefined;

  return multer({ storage, limits: { fileSize: maxSize }, fileFilter });
}

// Post-upload middleware: validates magic bytes and re-encodes images.
// Use after multer: router.post('/upload', upload({...}).single('file'), sanitizeFile, handler)
export async function sanitizeFile(req, res, next) {
  const files = req.files
    ? Object.values(req.files).flat()
    : req.file ? [req.file] : [];

  if (!files.length) return next();

  try {
    for (const file of files) {
      const detected = await fileTypeFromFile(file.path);

      if (!detected) {
        await fs.unlink(file.path);
        return res.status(400).json({ ok: false, message: 'Unrecognizable file type' });
      }

      if (file.mimetype !== detected.mime) {
        await fs.unlink(file.path);
        return res.status(400).json({ ok: false, message: 'File type mismatch — extension does not match content' });
      }

      if (IMAGE_TYPES.has(detected.mime)) {
        const sanitized = `${file.path}.sanitized`;
        await sharp(file.path)
          .rotate()           // auto-orient from EXIF, then strip all metadata
          .toFile(sanitized);
        await fs.rename(sanitized, file.path);
      }
    }
    next();
  } catch (err) {
    for (const file of files) {
      await fs.unlink(file.path).catch(() => {});
    }
    return res.status(400).json({ ok: false, message: 'Invalid or corrupt file' });
  }
}
