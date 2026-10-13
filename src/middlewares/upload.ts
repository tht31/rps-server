import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { LIMITS } from '../utils/constants';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const storagePath = process.env.BOT_STORAGE_PATH || './storage/bots';
    const { teamId } = req as any;
    const teamDir = path.join(storagePath, teamId || 'unknown');
    // Thu muc duoc tao truoc do boi controller
    cb(null, teamDir);
  },
  filename: (req, file, cb) => {
    // Dat ten file: <timestamp>_<random>.py
    const timestamp = Date.now();
    const rand = crypto.randomBytes(4).toString('hex');
    cb(null, `bot_${timestamp}_${rand}.py`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file.originalname.endsWith('.py')) {
    return cb(new Error('Only .py files are accepted'));
  }
  cb(null, true);
}

export const botUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: LIMITS.BOT_FILE_SIZE_BYTES, // 1 MB
    files: 1,
  },
});
