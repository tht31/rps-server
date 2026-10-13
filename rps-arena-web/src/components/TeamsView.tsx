import React, { useState } from 'react';
import { Search, Shield, CheckCircle, AlertTriangle, Swords, Users } from 'lucide-react';
import { Team } from '../types';

interface TeamsViewProps {
  teams: Team[];
  loading: boolean;
  onChallenge: (team: Team) => void;
  currentTeam: any;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  teams,
  loading,
  onChallenge,
  currentTeam,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = teams.filter((t) => {
    const nameMatch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    let memberMatch = false;
    if (Array.isArray(t.members)) {
      memberMatch = t.members.some(
        (m: any) =>
          m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.studentId?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return nameMatch || memberMatch;
  });

  return (
    <div>
      {/* Hero Header */}
      <div className="hero-banner glass-panel">
        <div className="hero-grid">
          <div>
            <h2 className="hero-title">
              Danh Sách <span>32 Đội Tuyển</span> Tham Gia
            </h2>
            <p className="hero-desc">
              Toàn bộ các đội tranh tài trong Đấu Trường Oẳn Tù Tì AI. Mỗi đội gồm tối đa 3 thành viên, nộp mã nguồn bot Python được sandbox và chấm tự động theo thể thức Thụy Sĩ (Swiss System).
            </p>
            <div className="hero-stats-bar">
              <div className="hero-stat-pill">
                <span>Tổng số đội:</span>
                <strong>{teams.length}</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Bot hợp lệ:</span>
                <strong>{teams.filter(t => t.hasValidBot).length}/{teams.length}</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Trạng thái vòng loại:</span>
                <span className="badge badge-active">SẴN SÀNG</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', maxWidth: '380px', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '42px' }}
            placeholder="Tìm theo tên đội, tên thành viên, MSSV..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Hiển thị <strong>{filtered.length}</strong> / {teams.length} đội
        </div>
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          Đang tải dữ liệu 32 đội...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
          <p style={{ color: 'var(--text-muted)' }}>Không tìm thấy đội nào phù hợp với từ khóa.</p>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((team, idx) => {
            const isMe = currentTeam?.id === team.id;
            let membersList: any[] = [];
            if (Array.isArray(team.members)) {
              membersList = team.members;
            } else if (typeof team.members === 'string') {
              try { membersList = JSON.parse(team.members); } catch {}
            }

            return (
              <div
                key={team.id}
                className="glass-panel"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  borderColor: isMe ? 'rgba(99, 102, 241, 0.6)' : undefined,
                  background: isMe ? 'rgba(30, 27, 75, 0.45)' : undefined,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'var(--accent-cyan)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {team.name}
                        {isMe && <span className="badge badge-active" style={{ fontSize: '0.68rem' }}>ĐỘI BẠN</span>}
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        ID: {team.id.substring(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {team.hasValidBot ? (
                    <span className="badge badge-active" title="Bot hợp lệ đã sẵn sàng thi đấu">
                      <CheckCircle size={12} /> BOT SẴN SÀNG
                    </span>
                  ) : (
                    <span className="badge badge-warning" title="Chưa nộp bot hoặc bot lỗi cú pháp">
                      <AlertTriangle size={12} /> CHƯA NỘP
                    </span>
                  )}
                </div>

                {/* Swiss Stats preview */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    background: 'rgba(2, 6, 23, 0.5)',
                    padding: '10px',
                    borderRadius: '8px',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Điểm</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                      {team.score ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Thắng-Hòa-Bại</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {team.wins ?? 0}-{team.draws ?? 0}-{team.losses ?? 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Buchholz</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--accent-indigo)', fontFamily: 'var(--font-mono)' }}>
                      {team.buchholz ?? 0}
                    </div>
                  </div>
                </div>

                {/* Members list */}
                <div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={12} /> Thành viên ({membersList.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {membersList.map((m: any, mIdx: number) => (
                      <div
                        key={mIdx}
                        style={{
                          fontSize: '0.82rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'var(--text-main)',
                          background: 'rgba(255,255,255,0.02)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        <span>{m.name || 'Thành viên'}</span>
                        <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                          {m.studentId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                  {!isMe ? (
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', gap: '6px' }}
                      onClick={() => onChallenge(team)}
                    >
                      <Swords size={14} />
                      <span>Đấu Tập Với Đội Này</span>
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--accent-indigo)', padding: '6px' }}>
                      (Đội của bạn)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
