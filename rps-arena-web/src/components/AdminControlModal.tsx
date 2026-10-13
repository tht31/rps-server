import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Lock, Unlock, PlayCircle, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { api } from '../api';
import { Team } from '../types';

interface AdminControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onRoundStarted: () => void;
}

export const AdminControlModal: React.FC<AdminControlModalProps> = ({
  isOpen,
  onClose,
  teams,
  onRoundStarted,
}) => {
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLockStatus();
    }
  }, [isOpen]);

  const loadLockStatus = async () => {
    try {
      const res = await api.getLockStatus();
      setIsLocked(res.isLocked);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleToggleLock = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const newStatus = !isLocked;
      await api.setLockStatus(newStatus, 'SWISS');
      setIsLocked(newStatus);
      setMessage({
        type: 'success',
        text: newStatus
          ? 'Đã KHÓA toàn bộ nộp mã nguồn bot! Các đội không thể nộp file mới.'
          : 'Đã MỞ KHÓA nộp mã nguồn bot. Các đội có thể tiếp tục nộp cập nhật.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi cập nhật trạng thái khóa' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartRound = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn khởi tranh Vòng Swiss #${roundNumber}? Hệ thống sẽ tự động bốc thăm xếp cặp và đẩy các trận vào hàng đợi thi đấu.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await api.startSwissRound(roundNumber);
      setMessage({
        type: 'success',
        text: `Đã khởi tranh thành công Vòng #${res.roundNumber}! Tổng cộng ${res.matchesQueued} cặp trận đã được tạo và đẩy vào Redis BullMQ.`,
      });
      onRoundStarted();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi khởi tranh vòng đấu' });
    } finally {
      setLoading(false);
    }
  };

  const validBotCount = teams.filter((t) => t.hasValidBot).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={22} style={{ color: 'var(--accent-amber)' }} />
            <h3 className="modal-title">Ban Tổ Chức — Bảng Điều Khiển Giải Đấu</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {message && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '0.86rem',
                marginBottom: '18px',
              }}
            >
              {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Tournament Overview Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              background: 'rgba(2, 6, 23, 0.6)',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '22px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tổng Đội Đăng Ký</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {teams.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Bot Hợp Lệ</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
                {validBotCount} / {teams.length}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Chưa Nộp Bot</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                {teams.length - validBotCount}
              </div>
            </div>
          </div>

          {/* Action 1: Lock Submissions */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '18px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.96rem', fontWeight: 700 }}>Chốt & Khóa Nộp Mã Nguồn Bot</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Trước khi bắt đầu các vòng đấu chính thức, khóa nộp mã nguồn để cố định version của các đội.
                </p>
              </div>
              <button
                className={`btn ${isLocked ? 'btn-danger' : 'btn-success'}`}
                style={{ minWidth: '130px' }}
                onClick={handleToggleLock}
                disabled={loading}
              >
                {isLocked ? (
                  <>
                    <Lock size={15} /> Đang Khóa
                  </>
                ) : (
                  <>
                    <Unlock size={15} /> Đang Mở
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action 2: Start Swiss Round */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '10px',
              padding: '18px',
            }}
          >
            <h4 style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: '6px' }}>
              Khởi Tranh Vòng Swiss Tiếp Theo
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Hệ thống sẽ ghép cặp tự động dựa trên bảng điểm và hệ số Buchholz hiện tại của 32 đội, kiểm tra tính hợp lệ của bot, và đẩy vào hàng đợi thực thi.
            </p>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ width: '160px' }}
                value={roundNumber}
                onChange={(e) => setRoundNumber(Number(e.target.value))}
                disabled={loading}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Vòng Swiss #{n}
                  </option>
                ))}
              </select>

              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleStartRound}
                disabled={loading}
              >
                <PlayCircle size={16} />
                <span>Bắt Đầu Vòng #{roundNumber}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
