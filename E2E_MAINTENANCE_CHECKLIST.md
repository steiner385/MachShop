# E2E Infrastructure Maintenance Checklist

## Daily Monitoring (5 minutes)

### Test Health Check
- [ ] Check for EPIPE errors in latest test runs
  ```bash
  grep -r "EPIPE" test-results/ | head -5
  ```
- [ ] Verify dynamic allocation is working (no hardcoded port failures)
  ```bash
  grep -r "EADDRINUSE.*3101\|5278" test-results/ | head -5
  ```
- [ ] Check authentication flow stability
  ```bash
  grep -r "Max retries reached\|infinite loop" test-results/ | head -5
  ```

### Resource Status
- [ ] Current allocated ports (should be reasonable number)
  ```bash
  cat test-results/allocated-ports.json | jq length
  ```
- [ ] Current allocated databases (should auto-cleanup after 2 hours)
  ```bash
  cat test-results/allocated-databases.json | jq length
  ```

## Weekly Deep Dive (15 minutes)

### Database Cleanup Verification
- [ ] Check for orphaned test databases
  ```bash
  psql -U mes_user -h localhost -l | grep mes_e2e_db
  ```
- [ ] Verify stale cleanup is working (should be < 5 databases)
  ```bash
  psql -U mes_user -h localhost -c "SELECT COUNT(*) FROM pg_database WHERE datname LIKE 'mes_e2e_db_%';"
  ```

### Performance Review
- [ ] Test execution times trending normally
- [ ] No memory leaks in long-running test suites
- [ ] Database migration times reasonable (< 30s)

### Infrastructure Integrity
- [ ] All test projects using dynamic allocation
  ```bash
  grep -r "3101\|5278" playwright.config.ts src/tests/e2e/ | grep -v "comment\|example"
  ```
- [ ] No global mocks causing issues
  ```bash
  grep -r "Date.now.*=" src/tests/ | grep -v "comment"
  ```

## Monthly Infrastructure Review (30 minutes)

### Architecture Health
- [ ] Review `E2E_INFRASTRUCTURE_GUIDE.md` for accuracy
- [ ] Check for new race conditions or timing issues
- [ ] Validate worker-aware unique identifier effectiveness
- [ ] Confirm SiteContext infinite loop prevention still working

### Optimization Opportunities
- [ ] Database allocation cache hit rate
- [ ] Port allocation efficiency
- [ ] Test parallelization effectiveness
- [ ] Resource cleanup timing optimization

### Documentation Updates
- [ ] Update troubleshooting guide with new issues discovered
- [ ] Add any new best practices learned
- [ ] Review emergency recovery procedures

## Quarterly Infrastructure Audit (1 hour)

### Full System Validation
- [ ] Run complete test suite in isolation
- [ ] Run complete test suite in parallel (all projects)
- [ ] Verify no infrastructure regressions
- [ ] Test emergency recovery procedures

### Capacity Planning
- [ ] Review maximum concurrent project limits
- [ ] Database server capacity utilization
- [ ] CI/CD resource allocation effectiveness
- [ ] Network port range sufficiency

### Security Review
- [ ] Database credentials rotation if needed
- [ ] Test data cleanup verification
- [ ] Resource isolation validation
- [ ] Access control review

## Incident Response Checklist

### When Infrastructure Failures Occur

#### Immediate Response (< 5 minutes)
- [ ] Stop all running tests
  ```bash
  pkill -f "playwright"
  ```
- [ ] Check system resources (disk, memory, database connections)
- [ ] Review recent changes to infrastructure files

#### Investigation (< 15 minutes)
- [ ] Check allocation files for corruption
  ```bash
  cat test-results/allocated-*.json | jq .
  ```
- [ ] Verify database connectivity
  ```bash
  psql -U mes_user -h localhost -c "SELECT 1;"
  ```
- [ ] Check for port conflicts
  ```bash
  netstat -tulpn | grep -E "3101|3103|3104|5278"
  ```

#### Recovery (< 10 minutes)
- [ ] Clean slate recovery if needed
  ```bash
  rm -rf test-results/
  psql -U mes_user -h localhost -c "DROP DATABASE IF EXISTS mes_e2e_db_*;"
  ```
- [ ] Restart with single project to verify fix
- [ ] Gradually scale back to full parallel execution

#### Post-Incident
- [ ] Document root cause in troubleshooting guide
- [ ] Update infrastructure if systemic issue found
- [ ] Review and improve monitoring for similar issues

## Success Metrics Tracking

### Infrastructure Health KPIs
| Metric | Target | Command |
|--------|--------|---------|
| EPIPE Error Rate | 0% | `grep -c EPIPE test-results/ \|\| echo 0` |
| Port Conflict Rate | 0% | `grep -c EADDRINUSE test-results/ \|\| echo 0` |
| Database Creation Success | 100% | Check databaseAllocator logs |
| Authentication Success Rate | >95% | Check SiteContext retry logs |
| Test Startup Time | <30s | Monitor global-setup.ts timestamps |

### Monthly Trend Analysis
- [ ] Track test execution time trends
- [ ] Monitor infrastructure error rates
- [ ] Review resource utilization patterns
- [ ] Analyze parallel execution efficiency

## Contact Information

### Infrastructure Owners
- **E2E Infrastructure**: Development Team
- **Database Issues**: Database Team
- **CI/CD Integration**: DevOps Team
- **Emergency Contact**: On-call rotation

### Key Documentation
- `E2E_INFRASTRUCTURE_GUIDE.md` - Complete architecture guide
- `E2E_QUICK_REFERENCE.md` - Developer quick reference
- `src/tests/helpers/` - Core infrastructure implementation
- `playwright.config.ts` - Test project configurations

## Escalation Path

1. **Level 1**: Check this maintenance checklist
2. **Level 2**: Review infrastructure guide troubleshooting section
3. **Level 3**: Check recent git history for infrastructure changes
4. **Level 4**: Contact development team for infrastructure support
5. **Level 5**: Emergency clean slate recovery and escalation

---

**Last Updated**: October 2024
**Next Review**: Monthly
**Owner**: E2E Infrastructure Team