import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, FileCode, History, Lock, ShieldCheck, Copy, Terminal } from 'lucide-react';
import { api } from '../api';
import { BotSubmission } from '../types';

interface BotStudioViewProps {
  currentTeam: any;
  onOpenAuth: () => void;
}

const STARTER_BOT_TEMPLATE = `# RPS Arena - Template Bot Tham Gia Cuoc Thi
# Quy tac:
# Moi luot, bot nhan vao:
#   my_moves: danh sach nuoc di truoc do cua ban (VD: ['ROCK', 'PAPER'])
#   opp_moves: danh sach nuoc di truoc do cua doi thu (VD: ['SCISSORS', 'ROCK'])
#   turn: so luot hien tai (1..50)
#
# Tra ve mot trong cac chuoi:
#   'ROCK' | 'PAPER' | 'SCISSORS' | 'LIZARD' | 'SPOCK'
#
# Gioi han thoi gian: 100ms CPU / luot.

import random

def get_move(my_moves, opp_moves, turn):
    # Luot 1: Ra ngau nhien
    if not opp_moves:
        return random.choice(['ROCK', 'PAPER', 'SCISSORS'])
    
    # Chien thuat phan tich nuoc di vua roi cua doi thu
    last_opp = opp_moves[-1]
    counter = {
        'ROCK': 'PAPER',
        'PAPER': 'SCISSORS',
        'SCISSORS': 'ROCK'
    }
    return counter.get(last_opp, 'ROCK')
`;

export const BotStudioView: React.FC<BotStudioViewProps> = ({ currentTeam, onOpenAuth }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState<BotSubmission[]>([]);
  const [activeCode, setActiveCode] = useState<string>('');
  const [hasCode, setHasCode] = useState<boolean>(false);
  const [activeVersion, setActiveVersion] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentTeam) {
      loadSubmissionsAndCode();
    }
    checkLockStatus();
  }, [currentTeam]);

  const checkLockStatus = async () => {
    try {
      const res = await api.getLockStatus();
      setIsLocked(res.isLocked);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSubmissionsAndCode = async () => {
    try {
      const subs = await api.getMySubmissions();
      setSubmissions(subs || []);

      const codeRes = await api.getMyCode();
      if (codeRes && codeRes.hasCode) {
        setHasCode(true);
        setActiveCode(codeRes.code || '');
        setActiveVersion(codeRes.version);
      }
    } catch (err: any) {
      console.error('Error loading bot submissions:', err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.name.endsWith('.py')) {
        setMessage({ type: 'error', text: 'Chỉ chấp nhận file mã nguồn Python (.py)!' });
        return;
      }
      setFile(selected);
      setMessage(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const res = await api.submitBot(file, 'SWISS');
      if (res.isValid) {
        setMessage({
          type: 'success',
          text: `Nộp thành công phiên bản v${res.version}! Kiểm tra cú pháp hợp lệ (Syntax OK).`,
        });
      } else {
        setMessage({
          type: 'error',
          text: `Mã nguồn phiên bản v${res.version} có lỗi cú pháp: ${res.syntaxLog}`,
        });
      }
      setFile(null);
      await loadSubmissionsAndCode();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi khi nộp bot' });
    } finally {
      setUploading(false);
    }
  };

  const handleCopyStarter = () => {
    navigator.clipboard.writeText(STARTER_BOT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!currentTeam) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <FileCode size={48} style={{ color: 'var(--accent-indigo)', marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>
          Đăng Nhập Đội Để Quản Lý & Nộp Mã Nguồn Bot
        </h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 24px' }}>
          Mỗi đội cần đăng nhập để tải lên tệp bot Python, kiểm tra cú pháp, xem lại lịch sử các phiên bản và kiểm soát việc khóa mã nguồn trước giờ thi đấu.
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
              Studio Nộp & Quản Lý <span>Mã Nguồn Bot</span>
            </h2>
            <p className="hero-desc">
              Đội <strong>{currentTeam.teamName || currentTeam.name}</strong> nộp bot Python (.py) cho vòng Swiss. Hệ thống tự động tính SHA-256 bảo toàn tính toàn vẹn, biên dịch kiểm tra lỗi cú pháp và lưu trữ độc lập trên hệ thống.
            </p>
            <div className="hero-stats-bar">
              <div className="hero-stat-pill">
                <span>Phiên bản hiện tại:</span>
                <strong>{activeVersion ? `v${activeVersion}` : 'Chưa có'}</strong>
              </div>
              <div className="hero-stat-pill">
                <span>Trạng thái khóa:</span>
                {isLocked ? (
                  <span className="badge badge-locked"><Lock size={12} /> ĐÃ KHÓA THI ĐẤU</span>
                ) : (
                  <span className="badge badge-active"><ShieldCheck size={12} /> CHO PHÉP NỘP</span>
                )}
              </div>
              <div className="hero-stat-pill">
                <span>Lần nộp gần nhất:</span>
                <strong>{submissions.length > 0 ? new Date(submissions[0].created_at).toLocaleTimeString() : 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lock notification banner if locked */}
      {isLocked && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#fca5a5',
          }}
        >
          <Lock size={20} />
          <div>
            <strong>Ban Tổ Chức đã khóa nộp mã nguồn cho vòng thi đấu chính thức.</strong>
            <div style={{ fontSize: '0.85rem', color: '#f87171' }}>
              Mọi đội không thể nộp phiên bản mới cho đến khi mở khóa. Phiên bản hợp lệ cuối cùng sẽ được đưa vào trọng tài Umpire.
            </div>
          </div>
        </div>
      )}

      {/* Message notification */}
      {message && (
        <div
          style={{
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            borderRadius: '12px',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: message.type === 'success' ? '#6ee7b7' : '#fca5a5',
          }}
        >
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Upload Box + Current Code Viewer */}
      <div className="grid-2" style={{ marginBottom: '28px' }}>
        {/* Upload Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={20} style={{ color: 'var(--accent-cyan)' }} />
            <span>Tải Lên Bot Mới (.py)</span>
          </h3>

          <form onSubmit={handleUpload}>
            <div
              style={{
                border: '2px dashed var(--border-subtle)',
                borderRadius: '12px',
                padding: '36px 20px',
                textAlign: 'center',
                background: 'rgba(2, 6, 23, 0.4)',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                marginBottom: '16px',
                transition: 'all 0.2s',
              }}
              onClick={() => !isLocked && document.getElementById('bot-file-input')?.click()}
            >
              <input
                id="bot-file-input"
                type="file"
                accept=".py"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isLocked}
              />
              <FileCode size={40} style={{ color: file ? 'var(--accent-emerald)' : 'var(--text-dim)', margin: '0 auto 12px' }} />
              {file ? (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {(file.size / 1024).toFixed(1)} KB — Nhấp để đổi file khác
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                    {isLocked ? 'Hệ thống đang khóa nộp bot' : 'Nhấp hoặc Kéo thả file bot .py vào đây'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Giới hạn: Tệp .py, tối đa 1MB, timeout CPU 100ms
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={!file || uploading || isLocked}
            >
              {uploading ? 'Đang tải lên & kiểm tra cú pháp...' : isLocked ? 'Đang Khóa Nộp Bot' : 'Xác Nhận & Nộp Bot'}
            </button>
          </form>

          {/* Starter Template Helper */}
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mã nguồn mẫu Python:</span>
              <button
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '0.76rem' }}
                onClick={handleCopyStarter}
              >
                <Copy size={12} /> {copied ? 'Đã sao chép!' : 'Copy Code Mẫu'}
              </button>
            </div>
          </div>
        </div>

        {/* Current Active Code Preview */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={18} style={{ color: 'var(--accent-indigo)' }} />
              <span>Mã Nguồn Đang Áp Dụng {activeVersion ? `(v${activeVersion})` : ''}</span>
            </h3>
            {hasCode && <span className="badge badge-active">ĐANG SỬ DỤNG</span>}
          </div>

          <div
            style={{
              flex: 1,
              background: '#040711',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: '#cbd5e1',
              overflowY: 'auto',
              maxHeight: '320px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {hasCode ? activeCode : '# Chưa có mã nguồn bot nào được nộp cho đội này.\n# Vui lòng tải lên tệp .py ở bên trái.'}
          </div>
        </div>
      </div>

      {/* Submissions History Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} style={{ color: 'var(--accent-purple)' }} />
          <span>Lịch Sử Các Lần Nộp Bot Của Đội ({submissions.length})</span>
        </h3>

        {submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Chưa có lần nộp nào.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Phiên bản</th>
                  <th>Giai đoạn</th>
                  <th>Trạng thái Cú pháp</th>
                  <th>Mã SHA-256</th>
                  <th>Thời gian nộp</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        v{s.version}
                      </strong>
                    </td>
                    <td>
                      <span className="badge badge-round">{s.round_phase}</span>
                    </td>
                    <td>
                      {s.is_valid ? (
                        <span className="badge badge-active">
                          <CheckCircle size={12} /> HỢP LỆ
                        </span>
                      ) : (
                        <span className="badge badge-locked" title={s.syntax_log || 'Lỗi cú pháp'}>
                          <AlertTriangle size={12} /> LỖI SYNTAX
                        </span>
                      )}
                    </td>
                    <td>
                      <code style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        {s.file_hash.substring(0, 16)}...
                      </code>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {new Date(s.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
