import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { query, queryOne } from '../db';
import { logger } from '../utils/logger';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { execSync } from 'child_process';
import { LIMITS } from '../utils/constants';

// Compute SHA-256 cua noi dung file
function sha256File(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Kiem tra cu phap Python don gian bang "python3 -m py_compile"
function validatePythonSyntax(filePath: string): { valid: boolean; log: string } {
  const pythonBin = process.env.PYTHON_BIN || 'python3';
  try {
    execSync(`${pythonBin} -m py_compile "${filePath}"`, {
      timeout: 5000,
      stdio: 'pipe',
    });
    return { valid: true, log: 'Syntax OK' };
  } catch (err: any) {
    const log = err.stderr?.toString() || err.message;
    return { valid: false, log };
  }
}

// POST /api/bots/submit
export async function submitBot(req: AuthRequest, res: Response) {
  if (!req.teamId) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No bot file uploaded' });

  const { phase } = req.body; // PRACTICE | SWISS | PLAYOFF | FINALS

  try {
    // Kiem tra doi co bi khoa khong
    const locked = await queryOne<any>(
      `SELECT id FROM bot_submissions WHERE team_id = $1 AND is_locked = TRUE AND round_phase = $2`,
      [req.teamId, phase || 'SWISS']
    );
    if (locked) {
      // Xoa file da upload (khong can giu)
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Bot submissions are locked for this phase' });
    }

    // Tinh version moi
    const lastVersion = await queryOne<any>(
      'SELECT MAX(version) as v FROM bot_submissions WHERE team_id = $1',
      [req.teamId]
    );
    const version = (lastVersion?.v || 0) + 1;

    // Tinh SHA-256
    const fileHash = sha256File(req.file.path);

    // Kiem tra trung file (chong nop lai y het)
    const duplicate = await queryOne<any>(
      'SELECT id FROM bot_submissions WHERE team_id = $1 AND file_hash = $2',
      [req.teamId, fileHash]
    );
    if (duplicate) {
      fs.unlinkSync(req.file.path);
      return res.status(409).json({ error: 'Identical bot already submitted' });
    }

    // Kiem tra cu phap Python
    const { valid, log: syntaxLog } = validatePythonSyntax(req.file.path);

    // Luu vao DB
    const rows = await query<any>(
      `INSERT INTO bot_submissions (team_id, version, file_hash, storage_path, round_phase, is_valid, syntax_log)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, version, is_valid, syntax_log, created_at`,
      [req.teamId, version, fileHash, req.file.path, phase || 'PRACTICE', valid, syntaxLog]
    );

    logger.info(`Bot submitted: team=${req.teamId} version=v${version} valid=${valid}`);

    return res.status(201).json({
      submissionId: rows[0].id,
      version: rows[0].version,
      isValid: rows[0].is_valid,
      syntaxLog: rows[0].syntax_log,
    });
  } catch (err) {
    logger.error('submitBot error', { err });
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/bots/my-submissions
export async function getMySubmissions(req: AuthRequest, res: Response) {
  if (!req.teamId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const rows = await query<any>(
      `SELECT id, version, file_hash, round_phase, is_valid, is_locked, syntax_log, created_at
       FROM bot_submissions WHERE team_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.teamId]
    );
    return res.json(rows);
  } catch (err) {
    logger.error('getMySubmissions error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/bots/my-code - Xem ma nguon bot hien tai
export async function getMyBotCode(req: AuthRequest, res: Response) {
  if (!req.teamId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const latest = await queryOne<any>(
      `SELECT version, storage_path, file_hash, is_valid, created_at
       FROM bot_submissions
       WHERE team_id = $1 AND is_valid = TRUE
       ORDER BY created_at DESC LIMIT 1`,
      [req.teamId]
    );
    if (!latest) {
      return res.json({ hasCode: false, code: '' });
    }
    let code = '';
    if (fs.existsSync(latest.storage_path)) {
      code = fs.readFileSync(latest.storage_path, 'utf-8');
    }
    return res.json({
      hasCode: true,
      version: latest.version,
      fileHash: latest.file_hash,
      isValid: latest.is_valid,
      createdAt: latest.created_at,
      code,
    });
  } catch (err) {
    logger.error('getMyBotCode error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/bots/lock - Khoa/mo khoa nop bot
export async function setBotLockStatus(req: Request, res: Response) {
  const { isLocked, roundPhase } = req.body;
  try {
    const phase = roundPhase || 'SWISS';
    await query(
      `UPDATE bot_submissions SET is_locked = $1 WHERE round_phase = $2`,
      [Boolean(isLocked), phase]
    );
    logger.info(`Bot lock status updated: phase=${phase}, isLocked=${Boolean(isLocked)}`);
    return res.json({ success: true, isLocked: Boolean(isLocked), roundPhase: phase });
  } catch (err) {
    logger.error('setBotLockStatus error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/bots/lock-status
export async function getBotLockStatus(_req: Request, res: Response) {
  try {
    const row = await queryOne<any>(
      `SELECT is_locked FROM bot_submissions WHERE is_locked = TRUE LIMIT 1`
    );
    return res.json({ isLocked: Boolean(row?.is_locked) });
  } catch (err) {
    logger.error('getBotLockStatus error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
