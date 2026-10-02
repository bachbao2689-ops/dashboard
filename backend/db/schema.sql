-- =====================================================
-- WORKSPACES & USERS
-- =====================================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    avatar_url TEXT,
    initials VARCHAR(5),
    role VARCHAR(20) DEFAULT 'member',
    department_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ
);
-- ... (rest of schema omitted here for brevity, I will respond to user first)
