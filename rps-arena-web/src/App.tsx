import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LeaderboardView } from './components/LeaderboardView';
import { TeamsView } from './components/TeamsView';
import { TournamentMatchesView } from './components/TournamentMatchesView';
import { PracticeArenaView } from './components/PracticeArenaView';
import { BotStudioView } from './components/BotStudioView';
import { MatchViewerModal } from './components/MatchViewerModal';
import { AuthModal } from './components/AuthModal';
import { AdminControlModal } from './components/AdminControlModal';
import { api, wsClient, getCurrentTeam, removeAuthToken } from './api';
import { Team, Standing, MatchSummary } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('leaderboard');
  const [currentTeam, setCurrentTeam] = useState<any>(getCurrentTeam());
  const [isWsConnected, setIsWsConnected] = useState<boolean>(true);

  // Tournament Data State
  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [selectedMatchRound, setSelectedMatchRound] = useState<string>('ALL');

  // Loading States
  const [loadingTeams, setLoadingTeams] = useState<boolean>(false);
  const [loadingStandings, setLoadingStandings] = useState<boolean>(false);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(false);

  // Modals
  const [viewingMatchId, setViewingMatchId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Initial Load & WS connection
  useEffect(() => {
    wsClient.connect();

    // Listen for WebSocket live updates
    const unsubscribe = wsClient.onMessage((msg) => {
      if (msg.type === 'LEADERBOARD_UPDATE') {
        loadStandings();
      } else if (msg.type === 'MATCH_DONE') {
        loadStandings();
        loadMatches();
      }
    });

    loadInitialData();

    return () => {
      unsubscribe();
    };
  }, []);

  const loadInitialData = async () => {
    await Promise.all([loadTeams(), loadStandings(), loadMatches()]);
  };

  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const data = await api.getAllTeams();
      setTeams(data || []);
    } catch (err) {
      console.error('Failed to load teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  const loadStandings = async () => {
    setLoadingStandings(true);
    try {
      const data = await api.getStandings();
      setStandings(data.rankings || []);
      setCurrentRound(data.round || 1);
    } catch (err) {
      console.error('Failed to load standings:', err);
    } finally {
      setLoadingStandings(false);
    }
  };

  const loadMatches = async (roundTypeFilter?: string) => {
    setLoadingMatches(true);
    try {
      const filter = roundTypeFilter ?? (selectedMatchRound === 'ALL' ? undefined : selectedMatchRound);
      const data = await api.getMatches({ roundType: filter });
      setMatches(data || []);
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Watch selectedMatchRound change
  useEffect(() => {
    loadMatches(selectedMatchRound === 'ALL' ? undefined : selectedMatchRound);
  }, [selectedMatchRound]);

  const handleLogout = () => {
    removeAuthToken();
    setCurrentTeam(null);
  };

  const handleChallenge = (targetTeam: Team) => {
    setActiveTab('practice');
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentTeam={currentTeam}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isWsConnected={isWsConnected}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            standings={standings}
            round={currentRound}
            loading={loadingStandings}
            onSelectTeam={(teamId) => {
              setActiveTab('teams');
            }}
          />
        )}

        {activeTab === 'teams' && (
          <TeamsView
            teams={teams}
            loading={loadingTeams}
            onChallenge={handleChallenge}
            currentTeam={currentTeam}
          />
        )}

        {activeTab === 'matches' && (
          <TournamentMatchesView
            matches={matches}
            loading={loadingMatches}
            onWatchMatch={(id) => setViewingMatchId(id)}
            selectedRound={selectedMatchRound}
            setSelectedRound={setSelectedMatchRound}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeArenaView
            currentTeam={currentTeam}
            teams={teams}
            onOpenAuth={() => setIsAuthOpen(true)}
            onWatchMatch={(id) => setViewingMatchId(id)}
          />
        )}

        {activeTab === 'bot-studio' && (
          <BotStudioView
            currentTeam={currentTeam}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}
      </main>

      {/* Global Modals */}
      <MatchViewerModal
        matchId={viewingMatchId}
        onClose={() => setViewingMatchId(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(team) => {
          setCurrentTeam(team);
          loadTeams();
        }}
      />

      <AdminControlModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        teams={teams}
        onRoundStarted={() => {
          loadStandings();
          loadMatches();
        }}
      />

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'rgba(6, 9, 19, 0.95)', padding: '24px 20px', marginTop: 'auto' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          <div>
            <strong style={{ color: 'var(--text-muted)' }}>RPS BOT ARENA 2026</strong> — Hệ Thống Đấu Trường AI 32 Đội Tuyển Sinh Viên
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Thể thức Swiss 50 Lượt</span>
            <span>Umpire Subprocess Sandbox</span>
            <span>Timeout 100ms CPU</span>
            <span>BullMQ & Redis Pub/Sub</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
