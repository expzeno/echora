import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BadRequest } from '../../shared/utils/httpErrors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// FEEDBACK_ROOT env var takes precedence — set this when backend is not in a
// named subdirectory (backend/, ZENO_NODE_V3/, etc.) one level below the project root.
// Default: 4 levels up from src/modules/feedback/ = project root when backend/ is a subdir.
const PROJECT_ROOT = process.env.FEEDBACK_ROOT || path.resolve(__dirname, '../../../..');
const FEEDBACK_FILE = path.join(PROJECT_ROOT, 'feedback.json');
const SCREENSHOT_DIR = path.join(PROJECT_ROOT, 'feedback-screenshots');

const VALID_STATUSES = ['pending', 'progressing', 'approval-needed', 'resolved'];

const normalizeCategory = (raw) => {
  const x = String(raw || '').toLowerCase().trim();
  if (x === 'bug') return 'Bug';
  if (x === 'ui' || x === 'ui issue' || x === 'uiissue') return 'UI Issue';
  if (x === 'feature' || x === 'feature request') return 'Feature Request';
  if (x === 'question') return 'Question';
  return 'General';
};

async function readEntries() {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeEntries(entries) {
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2));
}

export class FeedbackService {
  static async submit(querier, data) {
    if (!data?.message && !data?.screenshot) throw new BadRequest('Message or screenshot is required');

    const entries = await readEntries();
    const maxId = entries.reduce((m, e) => (typeof e.id === 'number' && e.id > m ? e.id : m), 0);

    const entry = {
      id: maxId + 1,
      category: normalizeCategory(data.category),
      message: String(data.message).slice(0, 5000),
      pageUrl: data.pageUrl || data.page || '',
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    if (querier?.profileType && querier?.profileId) {
      entry.submittedBy = { profileType: querier.profileType, profileId: querier.profileId };
    }

    if (data.screenshot) {
      try {
        await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
        const base64 = String(data.screenshot).replace(/^data:image\/\w+;base64,/, '');
        const rawBuffer = Buffer.from(base64, 'base64');
        // sharp validates magic bytes, strips EXIF, resizes, re-encodes — blocks image-based attacks
        const sanitized = await sharp(rawBuffer)
          .resize({ width: 800, withoutEnlargement: true })
          .png({ quality: 80 })
          .toBuffer();
        const filename = `feedback-${entry.id}-${Date.now()}.png`;
        await fs.writeFile(path.join(SCREENSHOT_DIR, filename), sanitized);
        entry.screenshot = filename;
      } catch (imgErr) {
        // Screenshot is optional — don't block feedback submission on image failures
        // Screenshot is best-effort; don't block on image processing failures
      }
    }

    entries.push(entry);
    await writeEntries(entries);

    return { ok: true, detail: entry };
  }

  static async list(querier) {
    const entries = await readEntries();
    return { ok: true, list: entries };
  }

  static async updateStatus(querier, id, data) {
    if (!VALID_STATUSES.includes(data?.status)) {
      throw new BadRequest(`status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
    const entries = await readEntries();
    const entry = entries.find(e => e.id === Number(id));
    if (!entry) throw new BadRequest('Feedback entry not found');

    entry.status = data.status;
    if (data.resolution) entry.resolution = String(data.resolution).slice(0, 5000);
    entry.updatedAt = new Date().toISOString();

    await writeEntries(entries);
    return { ok: true, detail: entry };
  }
}
