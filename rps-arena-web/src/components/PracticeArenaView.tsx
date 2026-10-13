import React, { useState } from 'react';
import { Swords, Bot, Users, PlayCircle, Clock, Zap, CheckCircle } from 'lucide-react';
import { Team } from '../types';
import { api, wsClient } from '../api';

interface PracticeArenaViewProps {
  currentTeam: any;
  teams: Team[];
  onOpenAuth: () => void;
  onWatchMatch: (matchId: string) => void;
}

export const PracticeArenaView: React.FC<PracticeArenaViewProps> = ({
  currentTeam,
  teams,
  onOpenAuth,
  onWatchMatch,
}) => {
  const [selectedOpponent, setSelectedOpponent] = useState<string>('starter_random');
  const [rounds, setRounds] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const otherTeams = teams.filter((t) => t.id !== currentTeam?.id);

  const handleStartPractice = async () => {
    if (!currentTeam) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setError('');
    setActiveMatchId(null);
    setMatchStatus('Đang đẩy trận vào hàng đợi Redis BullMQ...');

    try {
      const res = await api.requestPracticeMatch(selectedOpponent, rounds);
      const matchId = res.matchId;
      setActiveMatchId(matchId);
      setMatchStatus('Trọng tài Umpire đang khởi động 2 bot Python subprocess...');

      // Subscribe WebSocket event
      wsClient.subscribeMatch(matchId);

      const unsubscribe = wsClient.onMessage((event) => {
        if (event.matchId === matchId && event.type === 'MATCH_DONE') {
          setMatchStatus('Trận đấu đã hoàn thành!');
          setLoading(false);
          // Launch viewer automatically
          onWatchMatch(matchId);
          unsubscribe();
        }
      });

      // Fallback check after 3 seconds in case WS was already done
      setTimeout(async () => {
        try {
          const m = await api.getMatch(matchId);
          if (m.status === 'DONE') {
            setMatchStatus('Trận đấu đã hoàn tất!');
            setLoading(false);
            onWatchMatch(matchId);
          }
        } catch {}
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi yêu cầu trận luyện tập');
      setLoading(false);
    }
  };

  if (!currentTeam) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Swords size={48} style={{ color: 'var(--accent-pink)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
          Đăng Nhập Đội Để Tham Gia Đấu Tập
        </h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
          Mỗi đội được cấp quota 20 trận đấu tập mỗi ngày. Bạn có thể thử nghiệm bot của mình đối đầu với bot mẫu của BTC hoặc bot các đội khác.
        </p>
        <button className="btn btn-primary" onClick={onOpenAuth}>
          Đăng Nhập Đội Ngay
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Header */}
      <div className="hero-banner glass-panel">
        <div className="hero-grid">
          <div>
            <h2 className="hero-title">
              Đấu Trường <span>Luyện Tập Thử Nghiệm</span>
            </h2>
            <p className="hero-desc">
              Thử nghiệm bot của bạn với Bot Mẫu của Ban Tổ Chức hoặc bot của các đối thủ khác trong giải đấu. Trận đấu được xử lý song song với timeout chuẩn 100ms/nước đi.
            </p>
            <div className="hero-stats-bar">
              <div className="hero-stat-pill">
                <span>Giới hạn trận/ngày:</span>
                <strong>20 trận</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Thời gian tối đa/nước:</span>
                <strong>100ms CPU</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Ưu tiên hàng đợi:</span>
                <span className="badge badge-round">PRIORITY 10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Setup Sparring Match */}
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>Thiết Lập Trận Đấu Tập</span>
          </h3>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '18px',
                fontSize: '0.88rem',
              }}
            >
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Chọn Đối Thủ</label>
            <select
              className="form-select"
              value={selectedOpponent}
              onChange={(e) => setSelectedOpponent(e.target.value)}
              disabled={loading}
            >
              <optgroup label="Bot Mẫu Của Ban Tổ Chức">
                <option value="starter_random">🎲 Bot Ngẫu Nhiên (Random Bot - BTC)</option>
              </optgroup>
              <optgroup label="Các Đội Trong Giải Đấu (Đã Nộp Bot)">
                {otherTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    🤖 {t.name} ({t.hasValidBot ? 'Bot Sẵn Sàng' : 'Chưa Nộp'})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Số Lượt Đấu (Rounds)</label>
            <select
              className="form-select"
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              disabled={loading}
            >
              <option value={20}>20 lượt (Khởi động nhanh)</option>
              <option value={50}>50 lượt (Chuẩn vòng Swiss)</option>
              <option value={100}>100 lượt (Chuẩn Chung Kết)</option>
            </select>
          </div>

          <div style={{ marginTop: '28px' }}>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
              onClick={handleStartPractice}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Clock className="spin" size={18} />
                  <span>Đang Thi Đấu...</span>
                </>
              ) : (
                <>
                  <PlayCircle size={18} />
                  <span>Khởi Tranh Trận Đấu Tập</span>
                </>
              )}
            </button>
          </div>

          {/* Running progress status */}
          {loading && (
            <div
              style={{
                marginTop: '18px',
                padding: '14px',
                background: 'rgba(2, 6, 23, 0.6)',
                borderRadius: '8px',
                border: '1px solid var(--border-glow)',
                textAlign: 'center',
              }}
            >
              <div className="pulse-dot" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: '0.86rem', color: 'var(--accent-cyan)' }}>{matchStatus}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Hệ thống sẽ tự động bật màn hình Replay ngay khi trận hoàn tất!
              </div>
            </div>
          )}
        </div>

        {/* Rule guide & arena rules */}
        <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={20} style={{ color: 'var(--accent-indigo)' }} />
            <span>Quy Trình Trọng Tài Umpire</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>1.</span>
              <span><strong>Mỗi lượt:</strong> Trọng tài chuyển JSON lịch sử nước đi qua STDIN của subprocess Python của mỗi bot.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>2.</span>
              <span><strong>Phản hồi:</strong> Bot in ra STDOUT: <code>ROCK</code>, <code>PAPER</code>, <code>SCISSORS</code>, <code>LIZARD</code>, <code>SPOCK</code>.</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>3.</span>
              <span><strong>Timeout:</strong> Nếu bot chạy quá 100ms CPU hoặc in sai định dạng, nước đi được tính là <code>INVALID</code> và xử thua lượt đó (hoặc bị truất quyền thi đấu).</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>4.</span>
              <span><strong>Replay:</strong> Kết quả từng lượt được lưu thành file JSON <code>storage/logs/&lt;matchId&gt;.json</code> để chiếu lại cho khán giả.</span>
            </div>
          </div>

          {activeMatchId && !loading && (
            <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
              <button
                className="btn btn-secondary"
                style={{ width: '100%' }}
                onClick={() => onWatchMatch(activeMatchId)}
              >
                <span>Xem Lại Replay Trận Vừa Đấu</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
