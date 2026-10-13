# RPS Arena Server

> Server chinh thuc cho cuoc thi **Bot Oan Tu Ti (Rock-Paper-Scissors) sinh vien**
> Quy mo: 250 - 500 doi · 2.500 tran Swiss · Top 32 Playoff · Quy thuong 19.000.000d

---

## Kien Truc He Thong

```
Internet
    |
 [Nginx Reverse Proxy]  <- Rate limiter, cache leaderboard 3s
    |
 [API Server (Node.js/Express)]  <- Port 4000
    |           |              |
 [PostgreSQL]  [Redis]  [Bot Storage /storage/bots/]
                  |
           [BullMQ Queue]
                  |
           [Worker Daemon]  <- Chay tren may rieng (8 vCPU)
                  |
       [subprocess Python Bot]  <- Chay qua umpire_entrypoint.py
```

---

## Cai Dat Nhanh (Dev)

### Dieu Kien Tien Quyet
- Node.js >= 20
- Python 3.11+
- PostgreSQL 16
- Redis 7+

### Buoc 1: Cai dependencies

```bash
npm install
```

### Buoc 2: Cau hinh moi truong

```bash
cp .env.example .env
# Sua .env voi thong tin DB, Redis, JWT Secret
```

### Buoc 3: Khoi tao database

```bash
# Dam bao PostgreSQL dang chay voi DB rps_arena
node scripts/migrate.js
```

### Buoc 4: Chay API Server

```bash
npm run dev
# -> http://localhost:4000
# -> ws://localhost:4000/ws
```

### Buoc 5: Chay Worker (terminal rieng)

```bash
npm run worker
```

---

## Chay voi Docker Compose (Khuyen Dung)

```bash
cd deploy/
docker-compose up -d

# Xem logs
docker-compose logs -f api
docker-compose logs -f worker
```

---

## API Endpoints

| Method | Path | Mo ta |
|--------|------|-------|
| POST | /api/teams/register | Dang ky doi thi (1-3 thanh vien) |
| POST | /api/teams/login | Dang nhap lay JWT token |
| GET  | /api/teams/:id | Xem thong tin doi |
| POST | /api/bots/submit | Nop file bot .py (toi da 1MB) |
| GET  | /api/bots/my-submissions | Xem lich su nop bai |
| GET  | /api/tournaments/swiss/standings | Bang xep hang Swiss thoi gian thuc |
| POST | /api/tournaments/swiss/start-round | [Admin] Khoi dong vong Swiss |
| POST | /api/arena/practice-match | Yeu cau tran luyen tap (20 tran/ngay) |
| GET  | /api/matches/:matchId | Xem ket qua tran dau |
| POST | /api/certificates/issue | [Admin] Cap chung chi dien tu |
| GET  | /api/verify-certificate/:certId | Tra cuu chung chi cho CV |
| GET  | /health | Health check |

---

## Giao Thuc Bot (Python API)

File bot cua sinh vien phai co ham:

```python
def make_move(my_moves: list[str], opponent_moves: list[str]) -> str:
    """
    my_moves: Danh sach nuoc di cua ban (cu nhat truoc) - vd: ["ROCK", "PAPER"]
    opponent_moves: Danh sach nuoc di cua doi thu

    Tra ve mot trong: "ROCK" | "PAPER" | "SCISSORS"
    Vong chung ket them: "LIZARD" | "SPOCK"
    """
    import random
    return random.choice(["ROCK", "PAPER", "SCISSORS"])
```

### Gioi Han Ky Thuat
- File size: toi da **1 MB**
- RAM: toi da **256 MB**
- CPU/luot: toi da **100 ms**
- Khoi dong: toi da **3 giay**
- Ket noi mang: **Cam hoan toan** (--network none tren Docker)

---

## WebSocket Live Feed

Ket noi tai `ws://localhost:4000/ws`:

```js
const ws = new WebSocket('ws://localhost:4000/ws');

// Theo doi tran cu the
ws.send(JSON.stringify({ type: 'SUBSCRIBE_MATCH', matchId: 'abc-123' }));

// Theo doi bang xep hang thoi gian thuc
ws.send(JSON.stringify({ type: 'SUBSCRIBE_LEADERBOARD' }));

// Nhan su kien
ws.onmessage = (msg) => {
  const event = JSON.parse(msg.data);
  // { type: 'MATCH_DONE', matchId, team1Wins, team2Wins, draws, winnerId }
  // { type: 'LEADERBOARD_UPDATE' }
};
```

---

## Cau Truc Thu Muc

```
rps-arena-server/
  src/
    index.ts              # API Server entrypoint
    types.ts              # Kieu du lieu dung chung
    db/index.ts           # Ket noi PostgreSQL pool
    routes/index.ts       # Tat ca API routes
    controllers/
      teams.ts            # Dang ky, dang nhap doi thi
      bots.ts             # Nop va quan ly bot
      tournament.ts       # Swiss, Practice, Match
      certificates.ts     # Cap va tra cuu chung chi
    middlewares/
      auth.ts             # JWT authentication
      rateLimiter.ts      # Rate limiting
      upload.ts           # Multer file upload
    services/
      swiss.ts            # Logic he Swiss (boc tham, tinh diem, Buchholz)
    queues/index.ts       # BullMQ Redis queue
    ws/index.ts           # WebSocket live broadcast
    worker/
      index.ts            # BullMQ Worker daemon
      umpire.ts           # Chay 2 bot Python, tinh ket qua tran
    utils/
      logger.ts           # Winston logger
      constants.ts        # Gioi han he thong
  bot-runner/
    umpire_entrypoint.py  # Giao tiep stdin/stdout voi bot Python
    starter_bots/
      random_bot.py       # Bot mau ngau nhien
      frequency_bot.py    # Bot mau dem tan suat
      markov_bot.py       # Bot mau chuoi Markov
  scripts/
    schema.sql            # PostgreSQL DDL day du
    migrate.js            # Chay migration
  deploy/
    docker-compose.yml    # Toan bo stack
    api.Dockerfile        # Image API
    worker.Dockerfile     # Image Worker (co Python)
    nginx.conf            # Reverse proxy + rate limiting
```
