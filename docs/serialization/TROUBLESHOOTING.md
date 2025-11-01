# Troubleshooting Guide: Serialization System

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Database Issues](#database-issues)
4. [API Issues](#api-issues)
5. [Serial Generation Issues](#serial-generation-issues)
6. [Performance Issues](#performance-issues)
7. [Data Integrity Issues](#data-integrity-issues)
8. [Logging & Debugging](#logging--debugging)
9. [Emergency Procedures](#emergency-procedures)

---

## Quick Diagnostics

### System Health Check

```bash
#!/bin/bash
# health-check.sh - Comprehensive system diagnostics

echo "=== MachShop Serialization System Health Check ==="
echo ""

# 1. Service Status
echo "1. Service Status:"
sudo systemctl status machshop-serialization --no-pager
echo ""

# 2. API Health
echo "2. API Health:"
curl -s http://localhost:4000/health | jq . || echo "FAILED: Cannot reach API"
echo ""

# 3. Database Connection
echo "3. Database Connection:"
curl -s http://localhost:4000/api/v1/health/db | jq . || echo "FAILED: Database check"
echo ""

# 4. Redis Connection
echo "4. Redis Connection:"
redis-cli ping || echo "FAILED: Redis unavailable"
echo ""

# 5. Disk Space
echo "5. Disk Space:"
df -h | grep -E "^/dev|Used|Avail"
echo ""

# 6. Memory Usage
echo "6. Memory Usage:"
free -h
echo ""

# 7. Network Connectivity
echo "7. Network Connectivity:"
netstat -tulpn 2>/dev/null | grep -E ":4000|:5432|:6379" || echo "Port check skipped (requires root)"
echo ""

# 8. Recent Errors
echo "8. Recent Errors (last 20 lines):"
sudo journalctl -u machshop-serialization -n 20 --no-pager
```

### Quick Status Command

```bash
# One-line health status
curl -s http://localhost:4000/health && echo "✓ System is healthy"
```

---

## Common Issues & Solutions

### Issue: Service Won't Start

**Symptoms:**
```
systemctl: Unit machshop-serialization.service has failed
```

**Diagnostic Steps:**

```bash
# 1. Check service status
sudo systemctl status machshop-serialization -l

# 2. View detailed logs
sudo journalctl -u machshop-serialization -n 50 -p err

# 3. Verify Node.js is installed
node --version

# 4. Check environment variables
cat /home/machshop/MachShop/.env.production

# 5. Test npm installation
cd /home/machshop/MachShop
npm list

# 6. Verify file permissions
ls -la /home/machshop/MachShop/dist/
```

**Solutions:**

| Error | Fix |
|-------|-----|
| `Cannot find module` | Run `npm install` and `npm run build` |
| `EACCES: permission denied` | Check file ownership: `sudo chown -R machshop:machshop /home/machshop/MachShop` |
| `Port 4000 already in use` | Kill existing process: `lsof -i :4000 \| grep -v PID \| awk '{print $2}' \| xargs kill -9` |
| `Out of memory` | Increase heap size in systemd service file |
| `DATABASE_URL not set` | Verify `.env.production` file exists and has correct path |

---

### Issue: Database Connection Errors

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: timeout of 5000ms exceeded
```

**Diagnostic Steps:**

```bash
# 1. Check PostgreSQL status
sudo systemctl status postgresql

# 2. Verify connection string
echo $DATABASE_URL
# Expected format: postgresql://user:password@host:port/database

# 3. Test connection manually
psql $DATABASE_URL -c "SELECT 1;"

# 4. Check database exists
psql -h localhost -U postgres -c "\l" | grep mes_prod_db

# 5. Verify user permissions
psql -h localhost -U postgres -c "\du" | grep serialization_user

# 6. Check network connectivity
telnet db-host 5432

# 7. Review connection pool settings
cat /home/machshop/MachShop/.env.production | grep DB_
```

**Solutions:**

```bash
# Solution 1: Restart PostgreSQL
sudo systemctl restart postgresql

# Solution 2: Fix connection string
# Update .env.production with correct credentials
export DATABASE_URL="postgresql://serialization_user:password@db-host:5432/mes_prod_db"

# Solution 3: Increase connection timeout
# In .env.production:
DATABASE_TIMEOUT=10000

# Solution 4: Reset connection pool
# The pool will automatically reset after restart

# Solution 5: Check firewall rules
sudo ufw status
sudo ufw allow 5432/tcp from any to any
```

---

### Issue: High Memory Usage

**Symptoms:**
```
Virtual memory (VIRT) > 2GB
Application crashes with OutOfMemory
```

**Diagnostic Steps:**

```bash
# 1. Check current memory usage
ps aux | grep "node.*server.js"

# 2. Monitor memory over time
watch -n 1 'ps aux | grep "node.*server.js"'

# 3. Check heap size configuration
grep "max-old-space-size" /etc/systemd/system/machshop-serialization.service

# 4. Analyze memory leaks
npm run debug:heap

# 5. Check database pool size
echo "DB_POOL_SIZE=$(grep DB_POOL_SIZE .env.production)"

# 6. Check cache TTL settings
grep "CACHE_TTL\|TTL" .env.production
```

**Solutions:**

```bash
# Solution 1: Increase Node.js heap size
# Edit systemd service:
sudo nano /etc/systemd/system/machshop-serialization.service

# Change:
ExecStart=/usr/bin/node --max-old-space-size=4096 dist/server.js

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart machshop-serialization

# Solution 2: Reduce database connection pool
# In .env.production:
DB_POOL_SIZE=10  # Reduce from 20 to 10

# Solution 3: Enable aggressive garbage collection
NODE_OPTIONS="--expose-gc"

# Solution 4: Implement Redis caching
# Ensure REDIS_URL is configured in .env.production

# Solution 5: Monitor for memory leaks
npm run test:memory-leak
```

---

### Issue: Slow API Responses

**Symptoms:**
```
Response time > 5000ms
Timeout errors on client side
```

**Diagnostic Steps:**

```bash
# 1. Measure response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:4000/health

# 2. Check database query performance
curl -s http://localhost:4000/api/v1/health/db | jq '.diagnostics'

# 3. Review slow query logs
tail -100 /var/log/postgresql/postgresql.log | grep "duration:"

# 4. Analyze database indexes
npm run db:analyze-performance

# 5. Check Redis hit rate
redis-cli INFO stats | grep hit

# 6. Monitor system resources
top -b -n 1 | head -20

# 7. Check application logs for bottlenecks
journalctl -u machshop-serialization -S "10 minutes ago" | grep "duration\|slow\|timeout"
```

**Solutions:**

```bash
# Solution 1: Add missing database indexes
npm run db:create-indexes

# Solution 2: Enable Redis caching
# In .env.production:
REDIS_ENABLED=true
SERIAL_UNIQUENESS_CACHE_TTL=3600

# Solution 3: Optimize database queries
npm run db:analyze-queries

# Solution 4: Increase connection pool
DB_POOL_SIZE=30  # Increase concurrent connections

# Solution 5: Enable query result pagination
# Use limit/offset in API requests
curl "http://localhost:4000/api/v1/serialization/audit/events?limit=50&offset=0"

# Solution 6: Scale horizontally
# Start multiple application instances
PORT=4001 npm start &
PORT=4002 npm start &

# Solution 7: Reduce query scope
# Filter by date range instead of fetching all records
curl "http://localhost:4000/api/v1/serialization/audit/events?startDate=2024-11-01&endDate=2024-11-02"
```

---

## Database Issues

### Issue: Serial Number Uniqueness Constraint Violations

**Symptoms:**
```
Error: duplicate key value violates unique constraint "vendor_serials_pkey"
Error: Uniqueness check failed for serial across scopes
```

**Solutions:**

```bash
# 1. Check for duplicate entries
psql $DATABASE_URL << EOF
SELECT serial_number, COUNT(*)
FROM vendor_serials
GROUP BY serial_number
HAVING COUNT(*) > 1;
EOF

# 2. Find conflicting records
psql $DATABASE_URL << EOF
SELECT id, serial_number, part_id, status, created_at
FROM vendor_serials
WHERE serial_number = 'DUPLICATE-SERIAL-001'
ORDER BY created_at;
EOF

# 3. Resolve conflicts using API
curl -X POST http://localhost:4000/api/v1/serialization/uniqueness/conflict/resolve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "serialNumber": "DUPLICATE-SERIAL-001",
    "partId": "PART-001",
    "resolutionStrategy": "KEEP",
    "keepSerialId": "serial-id-to-keep"
  }'

# 4. Clear uniqueness cache
redis-cli FLUSHDB

# 5. Re-register serials
npm run db:resync-uniqueness
```

---

### Issue: Migration Failed

**Symptoms:**
```
Error: Migration failed. Cannot continue
Error: The following constraints are not met for this migration
```

**Solutions:**

```bash
# 1. Check migration status
npx prisma migrate status

# 2. View failed migration details
npx prisma migrate resolve --preview

# 3. Rollback to previous migration
npx prisma migrate resolve --rolled-back "migration_name"

# 4. Manual rollback (if needed)
psql $DATABASE_URL << EOF
SELECT * FROM _prisma_migrations;
DELETE FROM _prisma_migrations WHERE id = 'migration_id';
EOF

# 5. Retry migration
npx prisma migrate deploy

# 6. Validate schema
npx prisma db validate
```

---

### Issue: Connection Pool Exhaustion

**Symptoms:**
```
Error: no more connections available
Error: sorry, too many clients already
```

**Solutions:**

```bash
# 1. Check active connections
psql $DATABASE_URL << EOF
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
EOF

# 2. Kill idle connections
psql $DATABASE_URL << EOF
SELECT pid, usename, state, query
FROM pg_stat_activity
WHERE datname = 'mes_prod_db' AND state = 'idle';

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mes_prod_db' AND state = 'idle' AND state_change < now() - interval '10 minutes';
EOF

# 3. Reduce pool size if overprovisioned
# In .env.production:
DB_POOL_SIZE=15

# 4. Increase PostgreSQL max_connections
# Edit postgresql.conf:
sudo nano /var/lib/postgresql/14/main/postgresql.conf
# Change: max_connections = 200 (from 100)
# Restart PostgreSQL
sudo systemctl restart postgresql

# 5. Implement connection pooling with PgBouncer
sudo apt-get install pgbouncer
```

---

## API Issues

### Issue: Authentication Failures

**Symptoms:**
```
401 Unauthorized: Invalid token
401 Unauthorized: Token expired
```

**Solutions:**

```bash
# 1. Verify JWT secret is configured
echo $JWT_SECRET

# 2. Check token validity
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/v1/serialization/triggers/statistics/PART-001

# 3. Generate new token (if applicable)
npm run auth:generate-token

# 4. Check token expiration
# Decode JWT (install jq first)
echo "YOUR_TOKEN" | cut -d'.' -f2 | base64 -d | jq .

# 5. Verify JWT secret matches between requests
# Ensure all requests use same JWT_SECRET from .env.production
```

---

### Issue: CORS Errors

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solutions:**

```bash
# 1. Check CORS configuration
echo $CORS_ORIGINS

# 2. Update CORS settings in .env.production
CORS_ORIGINS="https://app.example.com,https://admin.example.com"

# 3. Verify request origin matches allowed origins
curl -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: GET" \
  http://localhost:4000/api/v1/serialization/triggers

# 4. Test preflight request
curl -X OPTIONS http://localhost:4000/api/v1/serialization/triggers \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v

# 5. Restart service after changes
sudo systemctl restart machshop-serialization
```

---

### Issue: Request Validation Errors

**Symptoms:**
```
400 Bad Request: Invalid request body
400 Bad Request: Field validation failed
```

**Solutions:**

```bash
# 1. Validate request payload format
curl -X POST http://localhost:4000/api/v1/serialization/vendor/receive \
  -H "Content-Type: application/json" \
  -d '{
    "vendorSerialNumber": "SERIAL-001",
    "vendorName": "Vendor ABC",
    "partId": "PART-001",
    "receivedDate": "2024-11-01"
  }'

# 2. Check error message for field names
# Response will indicate which fields are invalid

# 3. Review API schema documentation
cat docs/serialization/API_REFERENCE.md | grep -A 20 "vendor/receive"

# 4. Validate date formats (must be ISO 8601)
# Correct: 2024-11-01 or 2024-11-01T10:00:00Z
# Incorrect: 11/01/2024 or Nov 1, 2024

# 5. Validate required fields
# Check API reference for which fields are mandatory
```

---

## Serial Generation Issues

### Issue: Serial Numbers Not Being Generated

**Symptoms:**
```
Trigger configured but serials not generating
Serial generation returns empty list
```

**Diagnostic Steps:**

```bash
# 1. Check if triggers are enabled
curl http://localhost:4000/api/v1/serialization/triggers/statistics/PART-001

# 2. Verify trigger configuration
curl http://localhost:4000/api/v1/serialization/triggers/part/PART-001

# 3. Check generated serials
curl http://localhost:4000/api/v1/serialization/system-generated/part/PART-001

# 4. Review application logs
journalctl -u machshop-serialization -S "1 hour ago" | grep -i "serial\|trigger\|generate"

# 5. Check trigger execution
psql $DATABASE_URL << EOF
SELECT * FROM serial_assignment_triggers
WHERE part_id = 'PART-001' AND enabled = true;
EOF

# 6. Verify part exists
psql $DATABASE_URL << EOF
SELECT * FROM parts WHERE id = 'PART-001';
EOF
```

**Solutions:**

```bash
# Solution 1: Verify pattern template is valid
curl -X POST http://localhost:4000/api/v1/serialization/system-generated/generate \
  -H "Content-Type: application/json" \
  -d '{
    "partId": "PART-001",
    "pattern": "{YYYY}{MM}{DD}-{SEQ:5}",
    "quantity": 1
  }'

# Solution 2: Check trigger conditions
# Ensure contextual conditions match (e.g., operation_code matches)

# Solution 3: Manually trigger generation
curl -X POST http://localhost:4000/api/v1/serialization/system-generated/trigger \
  -H "Content-Type: application/json" \
  -d '{
    "triggerId": "trigger-id",
    "context": {
      "operation_code": "OP-001",
      "work_order_id": "WO-12345"
    }
  }'

# Solution 4: Reset trigger statistics
psql $DATABASE_URL << EOF
UPDATE serial_assignment_triggers SET execution_count = 0 WHERE id = 'trigger-id';
EOF

# Solution 5: Validate pattern syntax
# Supported tokens: {YYYY}, {MM}, {DD}, {SEQ:n}, {CHECK:luhn}, {RANDOM:type}
```

---

### Issue: Invalid Pattern Template

**Symptoms:**
```
Error: Invalid pattern token
Error: Pattern validation failed
Serial generated with incorrect format
```

**Solutions:**

```bash
# 1. Review valid pattern tokens
cat docs/serialization/USER_GUIDE.md | grep -A 30 "Pattern Templates"

# 2. Validate pattern syntax
curl -X POST http://localhost:4000/api/v1/serialization/system-generated/generate \
  -H "Content-Type: application/json" \
  -d '{
    "partId": "PART-001",
    "pattern": "{YYYY}-{MM}-{DD}-{SEQ:5}-{CHECK:luhn}",
    "quantity": 1
  }'

# 3. Test pattern generation without checksum
pattern="{YYYY}-{MM}-{DD}-{SEQ:5}"

# 4. Verify sequence counter
psql $DATABASE_URL << EOF
SELECT * FROM system_generated_serials
WHERE part_id = 'PART-001'
ORDER BY created_at DESC LIMIT 10;
EOF

# 5. Reset sequence counter if needed
psql $DATABASE_URL << EOF
UPDATE system_generated_serials
SET sequence_number = 1000
WHERE part_id = 'PART-001';
EOF
```

---

## Performance Issues

### Issue: Audit Trail Queries Slow

**Symptoms:**
```
Audit trail queries take > 10 seconds
Large result sets timeout
```

**Solutions:**

```bash
# 1. Create indexes if missing
npm run db:create-indexes

# 2. Use pagination
curl "http://localhost:4000/api/v1/serialization/audit/events?limit=50&offset=0"

# 3. Filter by date range
curl "http://localhost:4000/api/v1/serialization/audit/events?startDate=2024-11-01&endDate=2024-11-02"

# 4. Filter by event type
curl "http://localhost:4000/api/v1/serialization/audit/events?eventType=VENDOR_RECEIVED"

# 5. Archive old audit records
npm run db:archive-audit-events --older-than=365

# 6. Analyze query performance
psql $DATABASE_URL << EOF
EXPLAIN ANALYZE
SELECT * FROM audit_events
WHERE part_id = 'PART-001' AND performed_at > now() - interval '30 days'
LIMIT 50;
EOF
```

---

### Issue: Uniqueness Check Timeout

**Symptoms:**
```
Error: Uniqueness check timeout
Error: No response from uniqueness validation
```

**Solutions:**

```bash
# 1. Check Redis connectivity
redis-cli ping

# 2. Verify cache configuration
echo $SERIAL_UNIQUENESS_CACHE_TTL

# 3. Monitor Redis memory
redis-cli INFO memory | grep used_memory

# 4. Clear stale cache entries
redis-cli FLUSHDB

# 5. Reduce scope complexity
# Use SITE scope instead of ENTERPRISE if performance critical

# 6. Pre-warm cache for frequently checked serials
npm run cache:warm-uniqueness

# 7. Optimize uniqueness check query
psql $DATABASE_URL << EOF
EXPLAIN ANALYZE
SELECT COUNT(*) FROM serial_uniqueness_checks
WHERE serial_number = 'SERIAL-001'
AND scope = 'SITE'
AND site_id = 'SITE-001';
EOF
```

---

## Data Integrity Issues

### Issue: Orphaned Serial Records

**Symptoms:**
```
Serial references non-existent parent
Propagation chain broken
```

**Solutions:**

```bash
# 1. Find orphaned records
psql $DATABASE_URL << EOF
SELECT sp.* FROM serial_propagations sp
LEFT JOIN vendor_serials vs ON sp.parent_serial_id = vs.id
WHERE sp.parent_serial_id IS NOT NULL AND vs.id IS NULL;
EOF

# 2. Clean orphaned records
psql $DATABASE_URL << EOF
DELETE FROM serial_propagations
WHERE parent_serial_id NOT IN (SELECT id FROM vendor_serials)
AND child_serial_id NOT IN (SELECT id FROM system_generated_serials);
EOF

# 3. Verify referential integrity
npm run db:validate-integrity

# 4. Rebuild serial lineage
npm run db:rebuild-lineage --part-id=PART-001
```

---

### Issue: Audit Trail Gaps

**Symptoms:**
```
Missing audit events
Event timestamps out of order
```

**Solutions:**

```bash
# 1. Check for missing events
psql $DATABASE_URL << EOF
SELECT COUNT(*) FROM audit_events
WHERE event_type IS NULL OR performed_by IS NULL;
EOF

# 2. Verify event continuity
psql $DATABASE_URL << EOF
SELECT id, event_type, performed_at
FROM audit_events
WHERE serial_id = 'serial-id'
ORDER BY performed_at;
EOF

# 3. Check database transaction logs
sudo tail -1000 /var/log/postgresql/postgresql.log | grep "ERROR"

# 4. Resync audit trail
npm run db:resync-audit-events --serial-id=serial-id

# 5. Validate timestamps
npm run db:validate-audit-timestamps
```

---

## Logging & Debugging

### Enable Debug Logging

```bash
# Set log level to debug
echo "LOG_LEVEL=debug" >> /home/machshop/MachShop/.env.production

# Restart service
sudo systemctl restart machshop-serialization

# View debug logs
journalctl -u machshop-serialization -f -p debug
```

### Debug Serial Generation

```bash
# Enable generation debug mode
DEBUG=machshop:serial npm start

# View detailed generation logs
journalctl -u machshop-serialization -S "10 minutes ago" | grep "generation\|pattern\|sequence"
```

### Debug Database Queries

```bash
# Enable query logging in PostgreSQL
psql $DATABASE_URL << EOF
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();
EOF

# View slow queries
tail -100 /var/log/postgresql/postgresql.log | grep "duration"
```

### Debug Network Issues

```bash
# Enable network tracing
sudo tcpdump -i any -w /tmp/network.pcap port 5432 or port 6379

# Analyze captured traffic
sudo wireshark /tmp/network.pcap

# Check for packet loss
netstat -s | grep -E "packet|drop"
```

---

## Emergency Procedures

### Complete Service Restart

```bash
# Stop service
sudo systemctl stop machshop-serialization

# Wait for graceful shutdown
sleep 5

# Clear cache if needed
redis-cli FLUSHDB

# Start service
sudo systemctl start machshop-serialization

# Verify startup
sleep 10
curl http://localhost:4000/health
```

### Emergency Database Recovery

```bash
# 1. Stop application immediately
sudo systemctl stop machshop-serialization

# 2. Backup current database
pg_dump $DATABASE_URL > /tmp/emergency_backup.sql

# 3. Restore from latest known-good backup
psql $DATABASE_URL < /backups/machshop/mes_prod_db_BACKUP_DATE.sql

# 4. Restart application
sudo systemctl start machshop-serialization

# 5. Verify recovery
curl http://localhost:4000/health
```

### Disable Service Temporarily

```bash
# Disable service from autostart
sudo systemctl disable machshop-serialization

# Stop running service
sudo systemctl stop machshop-serialization

# Re-enable when ready
sudo systemctl enable machshop-serialization
sudo systemctl start machshop-serialization
```

### Emergency Contact Escalation

1. Service Down (Critical): Page on-call engineer immediately
2. Data Loss Risk (High): Contact database administrator
3. Performance Degradation (Medium): Create incident ticket
4. API Errors (Low): Create support ticket

---

## Support Resources

- **API Reference**: [docs/serialization/API_REFERENCE.md](./API_REFERENCE.md)
- **User Guide**: [docs/serialization/USER_GUIDE.md](./USER_GUIDE.md)
- **Deployment Guide**: [docs/serialization/DEPLOYMENT.md](./DEPLOYMENT.md)
- **GitHub Issues**: https://github.com/steiner385/MachShop/issues
- **Team Slack**: #serialization-support

For additional help, collect the following information:
- Service logs (last 100 lines)
- Database state (query output)
- Network diagnostics
- .env.production (sanitized, credentials removed)
- Steps to reproduce
