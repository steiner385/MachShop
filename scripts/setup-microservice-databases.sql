-- ============================================================================
-- Microservice Database Setup Script
-- Phase 2, Task 2.3: Database Per Service Pattern
-- ============================================================================
--
-- This script creates 8 PostgreSQL databases and users for the MES microservices
-- Execute as postgres superuser: psql -U postgres -f setup-microservice-databases.sql
--
-- Created: October 18, 2025
-- ============================================================================

-- 1. AUTH SERVICE DATABASE
-- ============================================================================
CREATE DATABASE mes_auth_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_auth_user WITH ENCRYPTED PASSWORD 'mes_auth_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_auth_db TO mes_auth_user;

-- Connect to mes_auth_db to grant schema permissions
\c mes_auth_db
GRANT ALL ON SCHEMA public TO mes_auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_auth_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_auth_user;

-- 2. WORK ORDER SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_work_order_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_wo_user WITH ENCRYPTED PASSWORD 'mes_wo_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_work_order_db TO mes_wo_user;

\c mes_work_order_db
GRANT ALL ON SCHEMA public TO mes_wo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_wo_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_wo_user;

-- 3. QUALITY SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_quality_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_quality_user WITH ENCRYPTED PASSWORD 'mes_quality_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_quality_db TO mes_quality_user;

\c mes_quality_db
GRANT ALL ON SCHEMA public TO mes_quality_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_quality_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_quality_user;

-- 4. MATERIAL SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_material_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_material_user WITH ENCRYPTED PASSWORD 'mes_material_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_material_db TO mes_material_user;

\c mes_material_db
GRANT ALL ON SCHEMA public TO mes_material_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_material_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_material_user;

-- 5. TRACEABILITY SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_traceability_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_trace_user WITH ENCRYPTED PASSWORD 'mes_trace_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_traceability_db TO mes_trace_user;

\c mes_traceability_db
GRANT ALL ON SCHEMA public TO mes_trace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_trace_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_trace_user;

-- 6. RESOURCE SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_resource_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_resource_user WITH ENCRYPTED PASSWORD 'mes_resource_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_resource_db TO mes_resource_user;

\c mes_resource_db
GRANT ALL ON SCHEMA public TO mes_resource_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_resource_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_resource_user;

-- 7. REPORTING SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_reporting_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_reporting_user WITH ENCRYPTED PASSWORD 'mes_reporting_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_reporting_db TO mes_reporting_user;

\c mes_reporting_db
GRANT ALL ON SCHEMA public TO mes_reporting_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_reporting_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_reporting_user;

-- 8. INTEGRATION SERVICE DATABASE
-- ============================================================================
\c postgres
CREATE DATABASE mes_integration_db
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0;

CREATE USER mes_integration_user WITH ENCRYPTED PASSWORD 'mes_integration_password_dev';
GRANT ALL PRIVILEGES ON DATABASE mes_integration_db TO mes_integration_user;

\c mes_integration_db
GRANT ALL ON SCHEMA public TO mes_integration_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mes_integration_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mes_integration_user;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
\c postgres
\l+ mes_*

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Created 8 databases:
--   1. mes_auth_db          (User: mes_auth_user)
--   2. mes_work_order_db    (User: mes_wo_user)
--   3. mes_quality_db       (User: mes_quality_user)
--   4. mes_material_db      (User: mes_material_user)
--   5. mes_traceability_db  (User: mes_trace_user)
--   6. mes_resource_db      (User: mes_resource_user)
--   7. mes_reporting_db     (User: mes_reporting_user)
--   8. mes_integration_db   (User: mes_integration_user)
--
-- Next Steps:
--   1. Update .env file with database URLs
--   2. Run Prisma migrations for each service
--   3. Create seed data scripts
-- ============================================================================
