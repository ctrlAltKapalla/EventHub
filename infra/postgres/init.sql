-- EventHub PostgreSQL init
-- Extensions und Schema-Grundlage
-- Migrations werden danach via Prisma verwaltet.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
