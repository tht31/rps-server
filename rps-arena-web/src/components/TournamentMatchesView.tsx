import React, { useState } from 'react';
import { Radio, Eye, CheckCircle, Clock, AlertTriangle, Swords, Filter } from 'lucide-react';
import { MatchSummary } from '../types';

interface TournamentMatchesViewProps {
  matches: MatchSummary[];
  loading: boolean;
  onWatchMatch: (matchId: string) => void;
  selectedRound: string;
  setSelectedRound: (round: string) => void;
}

export const TournamentMatchesView: React.FC<TournamentMatchesViewProps> = ({
  matches,
  loading,
  onWatchMatch,
  selectedRound,
  setSelectedRound,
}) => {
  return (
    <div>
      {/* Hero Header */}
      <div className="hero-banner glass-panel">
        <div className="hero-grid">
          <div>
            <h2 className="hero-title">
              Lịch Trình & Kết Quả <span>Các Trận Đấu</span>
            </h2>
            <p className="hero-desc">
              Theo dõi kết quả các cặp đấu vòng Swiss và luyện tập. Bạn có thể nhấp vào bất kỳ trận nào để xem Replay trực quan từng lượt đi và phân tích hiệu năng của bot.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginRight: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Filter size={14} /> Giai đoạn:
        </span>
        {['ALL', 'SWISS_1', 'SWISS_2', 'SWISS_3', 'PRACTICE'].map((r) => (
          <button
            key={r}
            className={`btn btn-secondary ${selectedRound === r ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              background: selectedRound === r ? 'linear-gradient(135deg, #4f46e5, #06b6d4)' : undefined,
              borderColor: selectedRound === r ? 'transparent' : undefined,
            }}
            onClick={() => setSelectedRound(r)}
          >
            {r === 'ALL' ? 'Tất cả' : r}
          </button>
        ))}
      </div>

      {/* Matches List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>Danh Sách Trận Đấu ({matches.length})</span>
          </h3>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            Đang tải danh sách trận đấu...
          </div>
        ) : matches.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
            Chưa có trận đấu nào trong vòng này.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vòng</th>
                  <th>Cặp Đấu (Đội 1 vs Đội 2)</th>
                  <th style={{ textAlign: 'center' }}>Tỉ Số</th>
                  <th style={{ textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ textAlign: 'center' }}>Người Thắng</th>
                  <th style={{ textAlign: 'right' }}>Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const isDone = m.status === 'DONE';
                  const isRunning = m.status === 'RUNNING';

                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="badge badge-round">{m.round_type}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: m.winner_id === m.team1_id ? 'var(--accent-cyan)' : 'inherit' }}>
                            {m.team1_name}
                          </span>
                          <span style={{ color: 'var(--accent-pink)', fontStyle: 'italic', fontSize: '0.78rem' }}>VS</span>
                          <span style={{ fontWeight: 600, color: m.winner_id === m.team2_id ? 'var(--accent-pink)' : 'inherit' }}>
                            {m.team2_name}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                        {isDone ? (
                          <span>
                            <strong style={{ color: 'var(--accent-cyan)' }}>{m.team1_wins}</strong>
                            {' - '}
                            <strong style={{ color: 'var(--accent-pink)' }}>{m.team2_wins}</strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                              ({m.draws} hòa)
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-- : --</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isDone ? (
                          <span className="badge badge-active">
                            <CheckCircle size={12} /> HOÀN TẤT
                          </span>
                        ) : isRunning ? (
                          <span className="badge badge-warning">
                            <span className="pulse-dot" style={{ width: '6px', height: '6px' }} /> ĐANG ĐẤU
                          </span>
                        ) : (
                          <span className="badge badge-round">
                            <Clock size={12} /> HÀNG ĐỢI
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isDone ? (
                          m.winner_id ? (
                            <strong style={{ color: '#fbbf24', fontSize: '0.88rem' }}>
                              {m.winner_id === m.team1_id ? m.team1_name : m.team2_name}
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Hòa</span>
                          )
                        ) : (
                          <span style={{ color: 'var(--text-dim)' }}>-</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isDone ? (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                            onClick={() => onWatchMatch(m.id)}
                          >
                            <Eye size={13} /> Xem Replay
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Chờ kết quả</span>
                        )}
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
