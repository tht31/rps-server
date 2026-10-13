-- ============================================================
-- rps_arena_schema.sql
-- PostgreSQL schema cho cuoc thi Bot Oan Tu Ti sinh vien
-- Quy mo: 250-500 doi, 2.500 tran Swiss, Top 32 Playoff
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nen dung gen_random_uuid() tren PG 13+
-- Neu < PG 13 dung uuid_generate_v4()

-- Doi thi
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    leader_id VARCHAR(20) NOT NULL,
    members JSONB NOT NULL DEFAULT '[]',
    -- members: [{ "studentId": "2601001", "name": "Nguyen Van A", "email": "a@hcmut.edu.vn" }]
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    -- status: ACTIVE | DISQUALIFIED | WITHDRAWN
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cac lan nop bot
CREATE TABLE IF NOT EXISTS bot_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    file_hash CHAR(64) NOT NULL,
    -- SHA-256 cua noi dung file
    storage_path TEXT NOT NULL,
    -- Duong dan tuyet doi tren disk: /storage/bots/<team_id>/v<version>.py
    round_phase VARCHAR(20) NOT NULL DEFAULT 'PRACTICE',
    -- PRACTICE | SWISS | PLAYOFF | FINALS
    is_valid BOOLEAN NOT NULL DEFAULT FALSE,
    syntax_log TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    -- Khoa truoc gio thi, khong cho nop ban moi
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tran dau
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_type VARCHAR(30) NOT NULL,
    -- PRACTICE | SWISS_1..SWISS_10 | ROUND_32 | ROUND_16 | QUARTER | SEMI | FINAL
    team1_id UUID NOT NULL REFERENCES teams(id),
    team2_id UUID NOT NULL REFERENCES teams(id),
    team1_wins INT NOT NULL DEFAULT 0,
    team2_wins INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    total_turns INT NOT NULL DEFAULT 0,
    winner_id UUID REFERENCES teams(id),
    -- NULL = hoa hoac chua co ket qua
    disqualified_bot SMALLINT,
    -- 1 hoac 2 = bot nao bi disqualify
    disqualification_reason TEXT,
    log_file_path TEXT,
    -- Duong dan file log tran dau (toi da 1MB)
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- PENDING | RUNNING | DONE | ERROR
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Bang xep hang Swiss
CREATE TABLE IF NOT EXISTS swiss_standings (
    team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
    swiss_round INT NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    -- 3 diem/tran thang, 1 diem/hoa, 0 thua
    wins INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    played INT NOT NULL DEFAULT 0,
    buchholz FLOAT NOT NULL DEFAULT 0,
    -- Tong diem cua tat ca doi da gap
    opponents UUID[] NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chung chi dien tu
CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(32) PRIMARY KEY,
    -- Format: RPS2026-XXXXXX
    student_id VARCHAR(20) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    team_id UUID NOT NULL REFERENCES teams(id),
    achievement VARCHAR(100) NOT NULL,
    -- "Hoan Thanh So Loai", "Top 32", "Giai Nhat"...
    verify_url TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Practice match limit tracker
CREATE TABLE IF NOT EXISTS practice_limits (
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    match_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (team_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bot_submissions_team ON bot_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_round_type ON matches(round_type);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_team1 ON matches(team1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team2 ON matches(team2_id);
CREATE INDEX IF NOT EXISTS idx_swiss_standings_score ON swiss_standings(score DESC, buchholz DESC);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
