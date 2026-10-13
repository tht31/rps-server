import React, { useState, useEffect } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, RotateCcw, AlertTriangle, Trophy } from 'lucide-react';
import { MatchResult, MatchTurnResult, Move } from '../types';
import { api } from '../api';

interface MatchViewerModalProps {
  matchId: string | null;
  onClose: () => void;
}

const MOVE_ICONS: Record<Move, { icon: string; label: string; color: string }> = {
  ROCK: { icon: '🪨', label: 'BÚA (ROCK)', color: '#94a3b8' },
  PAPER: { icon: '📄', label: 'BAO (PAPER)', color: '#38bdf8' },
  SCISSORS: { icon: '✂️', label: 'KÉO (SCISSORS)', color: '#f43f5e' },
  LIZARD: { icon: '🦎', label: 'THẰN LẰN (LIZARD)', color: '#34d399' },
  SPOCK: { icon: '🖖', label: 'SPOCK', color: '#a78bfa' },
  INVALID: { icon: '⚠️', label: 'PHẠM QUY / TIMEOUT', color: '#ef4444' },
};

export const MatchViewerModal: React.FC<MatchViewerModalProps> = ({ matchId, onClose }) => {
  const [matchData, setMatchData] = useState<MatchResult | null>(null);
  const [matchSummary, setMatchSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTurnIdx, setCurrentTurnIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(300); // ms per turn

  useEffect(() => {
    if (!matchId) return;
    loadMatchAndLog();
  }, [matchId]);

  const loadMatchAndLog = async () => {
    if (!matchId) return;
    setLoading(true);
    setError('');
    try {
      const summary = await api.getMatch(matchId);
      setMatchSummary(summary);

      try {
        const log = await api.getMatchLog(matchId);
        setMatchData(log);
        setCurrentTurnIdx(0);
        setIsPlaying(true);
      } catch {
        // Log might not exist yet if match is PENDING or RUNNING
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin trận đấu');
    } finally {
      setLoading(false);
    }
  };

  // Playback timer
  useEffect(() => {
    if (!isPlaying || !matchData?.turns || matchData.turns.length === 0) return;

    const timer = setInterval(() => {
      setCurrentTurnIdx((prev) => {
        if (prev < matchData.turns.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, matchData]);

  if (!matchId) return null;

  const turns = matchData?.turns || [];
  const currentTurn: MatchTurnResult | undefined = turns[currentTurnIdx];

  // Cumulative score up to current turn
  let bot1Score = 0;
  let bot2Score = 0;
  let drawsScore = 0;

  for (let i = 0; i <= currentTurnIdx && i < turns.length; i++) {
    if (turns[i].winner === 1) bot1Score++;
    else if (turns[i].winner === 2) bot2Score++;
    else drawsScore++;
  }

  const team1Name = matchSummary?.team1?.name || 'Đội 1';
  const team2Name = matchSummary?.team2?.name || 'Đội 2';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '95%' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              ĐẤU TRƯỜNG TRỰC TIẾP & REPLAY • ID: {matchId.substring(0, 8)}...
            </span>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{team1Name}</span>
              <span style={{ color: 'var(--accent-pink)', fontStyle: 'italic', fontSize: '1rem' }}>VS</span>
              <span>{team2Name}</span>
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Đang tải dữ liệu trận đấu và file replay...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#f87171' }}>
              {error}
            </div>
          ) : !matchData?.turns || matchData.turns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Trận đấu đang ở trạng thái <strong>{matchSummary?.status || 'PENDING'}</strong>. File replay sẽ hiển thị ngay khi trọng tài hoàn tất 50 lượt đấu!
            </div>
          ) : (
            <div className="stadium-container">
              {/* Versus Board */}
              <div className="versus-board">
                {/* Bot 1 */}
                <div className={`bot-card ${matchData.winnerId === matchData.team1Id ? 'winner' : ''}`}>
                  <div className="bot-avatar">🤖</div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{team1Name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      Bot 1
                    </span>
                  </div>

                  {/* Current Move */}
                  {currentTurn && (
                    <div className="hand-icon-box bounce" style={{ borderColor: MOVE_ICONS[currentTurn.bot1Move]?.color }}>
                      <span>{MOVE_ICONS[currentTurn.bot1Move]?.icon}</span>
                    </div>
                  )}

                  {currentTurn && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Thời gian: <strong>{currentTurn.bot1TimeMs}ms</strong>
                    </div>
                  )}
                </div>

                {/* Center score & versus */}
                <div className="versus-center">
                  <div className="vs-badge">ROUND {currentTurnIdx + 1} / {turns.length}</div>
                  <div className="score-display">
                    <span className="score-bot1">{bot1Score}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '1.5rem' }}>-</span>
                    <span className="score-bot2">{bot2Score}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                    Hòa: {drawsScore} lượt
                  </div>

                  {/* Turn outcome badge */}
                  {currentTurn && (
                    <div style={{ marginTop: '8px' }}>
                      {currentTurn.winner === 1 ? (
                        <span className="badge badge-active" style={{ fontSize: '0.82rem' }}>
                          🏆 {team1Name} THẮNG LƯỢT NÀY
                        </span>
                      ) : currentTurn.winner === 2 ? (
                        <span className="badge badge-active" style={{ fontSize: '0.82rem', borderColor: 'rgba(236,72,153,0.4)', color: '#f472b6' }}>
                          🏆 {team2Name} THẮNG LƯỢT NÀY
                        </span>
                      ) : (
                        <span className="badge badge-warning" style={{ fontSize: '0.82rem' }}>
                          🤝 LƯỢT HÒA
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Bot 2 */}
                <div className={`bot-card ${matchData.winnerId === matchData.team2Id ? 'winner' : ''}`}>
                  <div className="bot-avatar" style={{ borderColor: 'var(--accent-pink)' }}>👾</div>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{team2Name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', fontFamily: 'var(--font-mono)' }}>
                      Bot 2
                    </span>
                  </div>

                  {/* Current Move */}
                  {currentTurn && (
                    <div className="hand-icon-box bounce" style={{ borderColor: MOVE_ICONS[currentTurn.bot2Move]?.color }}>
                      <span>{MOVE_ICONS[currentTurn.bot2Move]?.icon}</span>
                    </div>
                  )}

                  {currentTurn && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Thời gian: <strong>{currentTurn.bot2TimeMs}ms</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Foul / Disqualification banner */}
              {matchData.disqualifiedBot && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#f87171',
                    fontSize: '0.88rem',
                  }}
                >
                  <AlertTriangle size={18} />
                  <span>
                    <strong>Phạt phạm quy:</strong> {matchData.disqualificationReason}
                  </span>
                </div>
              )}

              {/* Controls & Scrubber */}
              <div className="timeline-bar">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={() => setCurrentTurnIdx(0)}
                  title="Về lượt đầu"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={() => setCurrentTurnIdx(Math.max(0, currentTurnIdx - 1))}
                  title="Lượt trước"
                >
                  <SkipBack size={16} />
                </button>

                <button
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? 'Tạm Dừng' : 'Phát Replay'}</span>
                </button>

                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={() => setCurrentTurnIdx(Math.min(turns.length - 1, currentTurnIdx + 1))}
                  title="Lượt tiếp"
                >
                  <SkipForward size={16} />
                </button>

                <input
                  type="range"
                  min="0"
                  max={turns.length - 1}
                  value={currentTurnIdx}
                  onChange={(e) => {
                    setCurrentTurnIdx(parseInt(e.target.value));
                    setIsPlaying(false);
                  }}
                  className="timeline-scrubber"
                />

                <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', minWidth: '70px', textAlign: 'right' }}>
                  #{currentTurnIdx + 1} / {turns.length}
                </span>

                {/* Speed selector */}
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="form-select"
                  style={{ width: '85px', padding: '6px 8px', fontSize: '0.8rem' }}
                >
                  <option value={600}>0.5x</option>
                  <option value={300}>1x</option>
                  <option value={150}>2x</option>
                  <option value={60}>5x</option>
                </select>
              </div>

              {/* Final Winner Summary */}
              {currentTurnIdx === turns.length - 1 && (
                <div
                  className="glass-panel"
                  style={{
                    padding: '16px 20px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}
                >
                  <Trophy size={28} style={{ color: '#fbbf24', margin: '0 auto 6px' }} />
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                    KẾT QUẢ CHUNG CUỘC:{' '}
                    {matchData.winnerId === matchData.team1Id
                      ? `${team1Name} CHIẾN THẮNG!`
                      : matchData.winnerId === matchData.team2Id
                      ? `${team2Name} CHIẾN THẮNG!`
                      : 'KẾT QUẢ HÒA!'}
                  </h4>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: '4px' }}>
                    Tỉ số: {matchData.team1Wins} thắng — {matchData.draws} hòa — {matchData.team2Wins} thắng
                    (Tổng thời gian: {matchData.durationMs}ms)
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
