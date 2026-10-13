import React from 'react';
import { Trophy, Medal, Award, Flame, Users, Swords } from 'lucide-react';
import { Standing } from '../types';

interface LeaderboardViewProps {
  standings: Standing[];
  round: number;
  loading: boolean;
  onSelectTeam: (teamId: string) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  standings,
  round,
  loading,
  onSelectTeam,
}) => {
  return (
    <div>
      {/* Hero Banner */}
      <div className="hero-banner glass-panel">
        <div className="hero-grid">
          <div>
            <h2 className="hero-title">
              Bảng Xếp Hạng <span>Hệ Thụy Sĩ (Swiss System)</span>
            </h2>
            <p className="hero-desc">
              Bảng điểm trực tiếp của 32 đội tranh tài qua các vòng Swiss. Hệ thống tự động tính điểm theo công thức: Thắng 3 điểm, Hòa 1 điểm, Thua 0 điểm; hệ số phụ Buchholz ưu tiên xếp hạng.
            </p>
            <div className="hero-stats-bar">
              <div className="hero-stat-pill">
                <span>Vòng đấu hiện tại:</span>
                <strong>Vòng #{round || 1}</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Số đội tham gia:</span>
                <strong>{standings.length} Đội</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Vòng Playoff:</span>
                <span className="badge badge-round">TOP 32 ĐỘI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={20} style={{ color: '#fbbf24' }} />
            <span>Xếp Hạng Trực Tiếp ({standings.length} Đội)</span>
          </h3>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Tự động cập nhật qua WebSocket
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Đang tải dữ liệu bảng xếp hạng...
          </div>
        ) : standings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
            Chưa có vòng đấu Swiss nào được khởi tranh.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px', textAlign: 'center' }}>Hạng</th>
                  <th>Đội Tuyển</th>
                  <th style={{ textAlign: 'center' }}>Điểm Số</th>
                  <th style={{ textAlign: 'center' }}>Hệ Số Buchholz</th>
                  <th style={{ textAlign: 'center' }}>Thắng - Hòa - Thua</th>
                  <th style={{ textAlign: 'center' }}>Số Trận Đã Đấu</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr
                      key={s.teamId}
                      style={{
                        background:
                          rank === 1
                            ? 'rgba(251, 191, 36, 0.05)'
                            : rank <= 3
                            ? 'rgba(99, 102, 241, 0.04)'
                            : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        {rank === 1 ? (
                          <span style={{ fontSize: '1.2rem' }} title="Hạng 1">🥇</span>
                        ) : rank === 2 ? (
                          <span style={{ fontSize: '1.2rem' }} title="Hạng 2">🥈</span>
                        ) : rank === 3 ? (
                          <span style={{ fontSize: '1.2rem' }} title="Hạng 3">🥉</span>
                        ) : (
                          <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                            #{rank}
                          </strong>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.96rem' }}>{s.teamName}</span>
                          {rank <= 3 && (
                            <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>
                              TOP {rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <strong
                          style={{
                            fontSize: '1.15rem',
                            color: 'var(--accent-cyan)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {s.score}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            color: 'var(--accent-indigo)',
                            fontWeight: 600,
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {s.buchholz}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        <span style={{ color: '#34d399' }}>{s.wins}</span>
                        <span style={{ color: 'var(--text-dim)' }}> - </span>
                        <span style={{ color: '#fbbf24' }}>{s.draws}</span>
                        <span style={{ color: 'var(--text-dim)' }}> - </span>
                        <span style={{ color: '#f87171' }}>{s.losses}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {s.played}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
