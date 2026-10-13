import { Router } from 'express';
import { registerTeam, loginTeam, getTeam, getAllTeams } from '../controllers/teams';
import { submitBot, getMySubmissions, getMyBotCode, setBotLockStatus, getBotLockStatus } from '../controllers/bots';
import { getStandings, startSwissRound, requestPracticeMatch, getMatch, getMatchLog, getTournamentMatches } from '../controllers/tournament';
import { issueCertificates, verifyCertificate } from '../controllers/certificates';
import { authenticateTeam } from '../middlewares/auth';
import { uploadLimiter, registerLimiter } from '../middlewares/rateLimiter';
import { botUpload } from '../middlewares/upload';
import path from 'path';
import fs from 'fs';

const router = Router();

// ============================================================
// Teams
// ============================================================
router.post('/teams/register', registerLimiter, registerTeam);
router.post('/teams/login', loginTeam);
router.get('/teams', getAllTeams);
router.get('/teams/:id', getTeam);

// ============================================================
// Bots - Nop ma nguon
// ============================================================
router.post(
  '/bots/submit',
  authenticateTeam,
  uploadLimiter,
  (req: any, res, next) => {
    // Dam bao thu muc ton tai truoc khi multer xu ly
    const storagePath = process.env.BOT_STORAGE_PATH || './storage/bots';
    const teamDir = path.join(storagePath, req.teamId || 'unknown');
    fs.mkdirSync(teamDir, { recursive: true });
    next();
  },
  botUpload.single('file'),
  submitBot
);
router.get('/bots/my-submissions', authenticateTeam, getMySubmissions);
router.get('/bots/my-code', authenticateTeam, getMyBotCode);
router.post('/bots/lock', setBotLockStatus);
router.get('/bots/lock-status', getBotLockStatus);

// ============================================================
// Tournament
// ============================================================
router.get('/tournaments/swiss/standings', getStandings);
router.get('/tournaments/swiss/matches', getTournamentMatches);
router.post('/tournaments/swiss/start-round', authenticateTeam, startSwissRound);

// ============================================================
// Arena & Matches
// ============================================================
router.post('/arena/practice-match', authenticateTeam, requestPracticeMatch);
router.get('/matches/:matchId', getMatch);
router.get('/matches/:matchId/log', getMatchLog);

// ============================================================
// Certificates
// ============================================================
router.post('/certificates/issue', authenticateTeam, issueCertificates);
router.get('/verify-certificate/:certId', verifyCertificate);

export default router;
