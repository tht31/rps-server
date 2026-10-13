import React from 'react';
import { Trophy, Users, Swords, Code2, ShieldAlert, LogIn, LogOut, Radio } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentTeam: any;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAdmin: () => void;
  isWsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentTeam,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  isWsConnected,
}) => {
  return (
    <header className="header-bar">
      <div className="header-inner">
        <div className="brand-logo" onClick={() => setActiveTab('leaderboard')}>
          <div className="logo-badge">⚔️</div>
          <div className="brand-text">
            <h1>RPS BOT ARENA</h1>
            <p>Hệ Thống Đấu Trường AI 32 Đội</p>
          </div>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('leaderboard')}
          >
            <Trophy size={16} />
            <span>Bảng Điểm</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'teams' ? 'active' : ''}`}
            onClick={() => setActiveTab('teams')}
          >
            <Users size={16} />
            <span>32 Đội Thi</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            <Radio size={16} />
            <span>Trận Đấu</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('practice')}
          >
            <Swords size={16} />
            <span>Đấu Luyện Tập</span>
          </button>

          <button
            className={`nav-tab-btn ${activeTab === 'bot-studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('bot-studio')}
          >
            <Code2 size={16} />
            <span>Nộp Bot & Code</span>
          </button>
        </nav>

        <div className="header-actions">
          {/* Live indicator */}
          <div className="hero-stat-pill" title={isWsConnected ? 'WebSocket kết nối ổn định' : 'Mất kết nối WebSocket'}>
            <span className={isWsConnected ? 'pulse-dot' : ''} style={{ background: isWsConnected ? '#10b981' : '#ef4444' }} />
            <span style={{ fontSize: '0.78rem', color: isWsConnected ? '#34d399' : '#f87171' }}>
              {isWsConnected ? 'LIVE FEED' : 'OFFLINE'}
            </span>
          </div>

          {/* Admin Control trigger */}
          <button className="btn btn-secondary" onClick={onOpenAdmin} title="Bảng điều khiển Ban Tổ Chức">
            <ShieldAlert size={16} />
            <span>BTC Admin</span>
          </button>

          {/* Team auth */}
          {currentTeam ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveTab('bot-studio')}
                style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}
              >
                <span>Đội: <strong>{currentTeam.teamName || currentTeam.name}</strong></span>
              </button>
              <button className="btn btn-danger" onClick={onLogout} title="Đăng xuất">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenAuth}>
              <LogIn size={16} />
              <span>Đăng Nhập Đội</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
