import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db';
import { LIMITS } from '../utils/constants';
import { logger } from '../utils/logger';

// POST /api/teams/register
export async function registerTeam(req: Request, res: Response) {
  const { teamName, members, password } = req.body;

  if (!teamName || !members || !password) {
    return res.status(400).json({ error: 'teamName, members, and password are required' });
  }
  if (!Array.isArray(members) || members.length < LIMITS.TEAM_MIN_MEMBERS || members.length > LIMITS.TEAM_MAX_MEMBERS) {
    return res.status(400).json({ error: `Team must have ${LIMITS.TEAM_MIN_MEMBERS}-${LIMITS.TEAM_MAX_MEMBERS} members` });
  }

  // Validate tung thanh vien co studentId va name
  for (const m of members) {
    if (!m.studentId || !m.name) {
      return res.status(400).json({ error: 'Each member must have studentId and name' });
    }
  }

  try {
    // Kiem tra ten doi trung
    const existing = await queryOne('SELECT id FROM teams WHERE name = $1', [teamName]);
    if (existing) {
      return res.status(409).json({ error: 'Team name already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const leaderId = members[0].studentId;

    const rows = await query(
      `INSERT INTO teams (name, leader_id, members, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, name, leader_id, created_at`,
      [teamName, leaderId, JSON.stringify(members), passwordHash]
    );

    const team = rows[0];

    // Khoi tao bang xep hang Swiss cho doi nay
    await query(
      `INSERT INTO swiss_standings (team_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [team.id]
    );

    const token = jwt.sign(
      { teamId: team.id, teamName: team.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    logger.info(`Team registered: ${team.name} (${team.id})`);
    return res.status(201).json({ team, token });
  } catch (err) {
    logger.error('registerTeam error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST /api/teams/login
export async function loginTeam(req: Request, res: Response) {
  const { teamName, password } = req.body;
  if (!teamName || !password) {
    return res.status(400).json({ error: 'teamName and password are required' });
  }

  try {
    const team = await queryOne<any>(
      'SELECT id, name, password_hash, status FROM teams WHERE name = $1',
      [teamName]
    );

    if (!team) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (team.status === 'DISQUALIFIED') {
      return res.status(403).json({ error: 'This team has been disqualified' });
    }

    const valid = await bcrypt.compare(password, team.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { teamId: team.id, teamName: team.name },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    );

    return res.json({ teamId: team.id, teamName: team.name, token });
  } catch (err) {
    logger.error('loginTeam error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/teams/:id
export async function getTeam(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const team = await queryOne<any>(
      `SELECT t.id, t.name, t.leader_id, t.members, t.status, t.created_at,
              s.score, s.wins, s.draws, s.losses, s.played, s.buchholz
       FROM teams t
       LEFT JOIN swiss_standings s ON s.team_id = t.id
       WHERE t.id = $1`,
      [id]
    );
    if (!team) return res.status(404).json({ error: 'Team not found' });
    return res.json(team);
  } catch (err) {
    logger.error('getTeam error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/teams - Lay danh sach tat ca cac doi
export async function getAllTeams(_req: Request, res: Response) {
  try {
    const teams = await query<any>(
      `SELECT t.id, t.name, t.leader_id, t.members, t.status, t.created_at,
              COALESCE(s.score, 0) as score,
              COALESCE(s.wins, 0) as wins,
              COALESCE(s.draws, 0) as draws,
              COALESCE(s.losses, 0) as losses,
              COALESCE(s.played, 0) as played,
              COALESCE(s.buchholz, 0) as buchholz,
              EXISTS(
                SELECT 1 FROM bot_submissions b
                WHERE b.team_id = t.id AND b.is_valid = TRUE
              ) as "hasValidBot"
       FROM teams t
       LEFT JOIN swiss_standings s ON s.team_id = t.id
       WHERE t.status != 'WITHDRAWN'
       ORDER BY score DESC, buchholz DESC, t.name ASC`
    );
    return res.json(teams);
  } catch (err) {
    logger.error('getAllTeams error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
