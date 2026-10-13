const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('rps_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('rps_token', token);
}

export function removeAuthToken() {
  localStorage.removeItem('rps_token');
  localStorage.removeItem('rps_team');
}

export function getCurrentTeam(): any | null {
  const data = localStorage.getItem('rps_team');
  return data ? JSON.parse(data) : null;
}

export function setCurrentTeam(team: any) {
  localStorage.setItem('rps_team', JSON.stringify(team));
}

async function request(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  }

  return data;
}

export const api = {
  // Teams
  login: (teamName: string, password: string) =>
    request('/teams/login', {
      method: 'POST',
      body: JSON.stringify({ teamName, password }),
    }),

  register: (teamName: string, password: string, members: any[]) =>
    request('/teams/register', {
      method: 'POST',
      body: JSON.stringify({ teamName, password, members }),
    }),

  getAllTeams: () => request('/teams'),

  getTeam: (id: string) => request(`/teams/${id}`),

  // Bots
  submitBot: (file: File, phase: string = 'SWISS') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phase', phase);
    return request('/bots/submit', {
      method: 'POST',
      body: formData,
    });
  },

  getMySubmissions: () => request('/bots/my-submissions'),

  getMyCode: () => request('/bots/my-code'),

  getLockStatus: () => request('/bots/lock-status'),

  setLockStatus: (isLocked: boolean, roundPhase: string = 'SWISS') =>
    request('/bots/lock', {
      method: 'POST',
      body: JSON.stringify({ isLocked, roundPhase }),
    }),

  // Tournament
  getStandings: () => request('/tournaments/swiss/standings'),

  getMatches: (params?: { roundType?: string; status?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.roundType) query.set('roundType', params.roundType);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return request(`/tournaments/swiss/matches${qs ? '?' + qs : ''}`);
  },

  startSwissRound: (roundNumber: number) =>
    request('/tournaments/swiss/start-round', {
      method: 'POST',
      body: JSON.stringify({ roundNumber }),
    }),

  // Arena & Matches
  requestPracticeMatch: (opponentBotId?: string, rounds: number = 50) =>
    request('/arena/practice-match', {
      method: 'POST',
      body: JSON.stringify({ opponentBotId, rounds }),
    }),

  getMatch: (matchId: string) => request(`/matches/${matchId}`),

  getMatchLog: (matchId: string) => request(`/matches/${matchId}/log`),
};

// WebSocket Service
export class WSClient {
  private ws: WebSocket | null = null;
  private messageHandlers: ((event: any) => void)[] = [];
  private reconnectTimer: any = null;

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Auto subscribe to leaderboard
      this.send({ type: 'SUBSCRIBE_LEADERBOARD' });
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.messageHandlers.forEach(h => h(data));
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    this.ws.onclose = () => {
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 3000);
      }
    };
  }

  send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  subscribeMatch(matchId: string) {
    this.send({ type: 'SUBSCRIBE_MATCH', matchId });
  }

  onMessage(handler: (event: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }
}

export const wsClient = new WSClient();
