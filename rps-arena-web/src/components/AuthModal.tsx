import React, { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { api, setAuthToken, setCurrentTeam } from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (team: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [members, setMembers] = useState<{ studentId: string; name: string; email: string }[]>([
    { studentId: '', name: '', email: '' },
  ]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = () => {
    if (members.length < 3) {
      setMembers([...members, { studentId: '', name: '', email: '' }]);
    }
  };

  const handleRemoveMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleMemberChange = (index: number, field: string, val: string) => {
    const updated = [...members];
    updated[index] = { ...updated[index], [field]: val };
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(teamName, password);
        setAuthToken(res.token);
        const teamObj = { id: res.teamId, name: res.teamName, teamName: res.teamName };
        setCurrentTeam(teamObj);
        onSuccess(teamObj);
        onClose();
      } else {
        const res = await api.register(teamName, password, members);
        setAuthToken(res.token);
        const teamObj = { ...res.team, teamName: res.team.name };
        setCurrentTeam(teamObj);
        onSuccess(teamObj);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Xử lý thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>{mode === 'login' ? '🔐' : '🚀'}</span>
            <h3 className="modal-title">
              {mode === 'login' ? 'Đăng Nhập Đội Thi Đấu' : 'Đăng Ký Đội Mới'}
            </h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Tên Đội (Team Name)</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: CyberWolves, AI_Titans..."
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu</label>
              <input
                type="password"
                className="form-input"
                placeholder="Nhập mật khẩu bí mật"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {mode === 'register' && (
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Thành viên đội (Tối đa 3 SV)</label>
                  {members.length < 3 && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddMember}
                      style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    >
                      <Plus size={14} /> Thêm SV
                    </button>
                  )}
                </div>

                {members.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                        {idx === 0 ? 'Trưởng đội (Leader)' : `Thành viên #${idx + 1}`}
                      </span>
                      {members.length > 1 && (
                        <button
                          type="button"
                          className="modal-close-btn"
                          onClick={() => handleRemoveMember(idx)}
                          style={{ color: '#f87171' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="MSSV (2601xxx)"
                        value={m.studentId}
                        onChange={(e) => handleMemberChange(idx, 'studentId', e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Họ và tên"
                        value={m.name}
                        onChange={(e) => handleMemberChange(idx, 'name', e.target.value)}
                        required
                      />
                    </div>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="Email trường (tuỳ chọn)"
                      value={m.email}
                      onChange={(e) => handleMemberChange(idx, 'email', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-indigo)',
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {mode === 'login' ? 'Chưa có tài khoản? Đăng ký đội ngay' : 'Đã có tài khoản? Quay lại đăng nhập'}
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng Nhập' : 'Tạo Đội Thi Đấu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
