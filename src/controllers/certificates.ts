import { Request, Response } from 'express';
import { query, queryOne } from '../db';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Tao ma chung chi duy nhat: RPS2026-XXXXXX
function generateCertId(studentId: string, teamId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${studentId}:${teamId}:${Date.now()}`)
    .digest('hex')
    .substring(0, 6)
    .toUpperCase();
  return `RPS2026-${hash}`;
}

// POST /api/certificates/issue - Admin goi sau khi ket thuc cuoc thi
export async function issueCertificates(req: Request, res: Response) {
  try {
    // Lay danh sach tat ca doi da co bot hop le va da thi dau
    const teams = await query<any>(
      `SELECT t.id, t.name, t.members, s.score, s.wins, s.played,
              CASE
                WHEN s.score >= 21 THEN 'Quan Quan Giai Nhat'
                WHEN s.score >= 18 THEN 'Giai Nhi'
                WHEN s.score >= 15 THEN 'Giai Ba Ban Ket'
                WHEN s.played >= 3 THEN 'Hoan Thanh So Loai Hop Le'
                ELSE NULL
              END as achievement
       FROM teams t
       JOIN swiss_standings s ON s.team_id = t.id
       WHERE t.status = 'ACTIVE' AND s.played > 0`
    );

    const issued: any[] = [];

    for (const team of teams) {
      if (!team.achievement) continue;
      const members = Array.isArray(team.members) ? team.members : JSON.parse(team.members);

      for (const member of members) {
        const certId = generateCertId(member.studentId, team.id);
        const verifyUrl = `https://arena.university.edu.vn/verify/${certId}`;

        await query(
          `INSERT INTO certificates (id, student_id, student_name, team_id, achievement, verify_url)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [certId, member.studentId, member.name, team.id, team.achievement, verifyUrl]
        );

        issued.push({ certId, studentName: member.name, teamName: team.name, achievement: team.achievement });
      }
    }

    logger.info(`Issued ${issued.length} certificates`);
    return res.json({ issued: issued.length, certificates: issued });
  } catch (err) {
    logger.error('issueCertificates error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/verify-certificate/:certId - Public endpoint cho sinh vien tra cuu CV
export async function verifyCertificate(req: Request, res: Response) {
  const { certId } = req.params;
  try {
    const cert = await queryOne<any>(
      `SELECT c.id, c.student_id, c.student_name, c.achievement, c.issued_at,
              t.name as team_name
       FROM certificates c
       JOIN teams t ON t.id = c.team_id
       WHERE c.id = $1`,
      [certId]
    );

    if (!cert) {
      return res.status(404).json({
        valid: false,
        error: 'Certificate not found. This certificate ID is invalid or has not been issued.',
      });
    }

    return res.json({
      valid: true,
      certId: cert.id,
      studentId: cert.student_id,
      studentName: cert.student_name,
      teamName: cert.team_name,
      achievement: cert.achievement,
      issuedAt: cert.issued_at,
      event: 'RPS Bot Arena 2026 - Cuoc Thi Bot Oan Tu Ti Sinh Vien',
    });
  } catch (err) {
    logger.error('verifyCertificate error', { err });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
