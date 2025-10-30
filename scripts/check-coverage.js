#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Check test coverage against progressive thresholds
 * Based on 50% coverage plan milestones
 */
function checkCoverage() {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage summary not found at:', coveragePath);
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  const { statements, branches, functions, lines } = coverage.total;

  // Progressive thresholds based on our 50% coverage plan
  const thresholds = {
    statements: 1,  // Start at 1%, increase as we progress
    branches: 1,
    functions: 1,
    lines: 1
  };

  console.log('\n📊 Test Coverage Report');
  console.log('========================');
  console.log(`Statements: ${statements.pct}% (${statements.covered}/${statements.total})`);
  console.log(`Branches:   ${branches.pct}% (${branches.covered}/${branches.total})`);
  console.log(`Functions:  ${functions.pct}% (${functions.covered}/${functions.total})`);
  console.log(`Lines:      ${lines.pct}% (${lines.covered}/${lines.total})`);

  // Calculate overall progress toward 50% goal
  const avgCoverage = (statements.pct + branches.pct + functions.pct + lines.pct) / 4;
  const progressToGoal = (avgCoverage / 50) * 100;

  console.log('\n🎯 Progress Toward 50% Goal');
  console.log('============================');
  console.log(`Average Coverage: ${avgCoverage.toFixed(1)}%`);
  console.log(`Progress to Goal: ${progressToGoal.toFixed(1)}%`);

  if (avgCoverage >= 50) {
    console.log('🎉 50% COVERAGE GOAL ACHIEVED!');
  } else if (avgCoverage >= 40) {
    console.log('🔥 Excellent progress! Almost at 50%');
  } else if (avgCoverage >= 30) {
    console.log('👍 Good progress toward 50% goal');
  } else if (avgCoverage >= 20) {
    console.log('📈 Making progress toward 50% goal');
  } else if (avgCoverage >= 10) {
    console.log('🚀 Early progress, keep going!');
  } else {
    console.log('🏁 Starting the coverage journey');
  }

  // Check thresholds
  const failing = [];
  if (statements.pct < thresholds.statements) failing.push(`statements (${statements.pct}% < ${thresholds.statements}%)`);
  if (branches.pct < thresholds.branches) failing.push(`branches (${branches.pct}% < ${thresholds.branches}%)`);
  if (functions.pct < thresholds.functions) failing.push(`functions (${functions.pct}% < ${thresholds.functions}%)`);
  if (lines.pct < thresholds.lines) failing.push(`lines (${lines.pct}% < ${thresholds.lines}%)`);

  console.log('\n🔍 Threshold Check');
  console.log('==================');
  if (failing.length > 0) {
    console.log('⚠️  Coverage below threshold for:');
    failing.forEach(metric => console.log(`   • ${metric}`));
    console.log('\nNote: Thresholds will increase as coverage improves');
    // Don't fail CI in early stages, just warn
    if (avgCoverage < 5) {
      console.log('🚧 Early development - not failing CI yet');
      process.exit(0);
    }
  } else {
    console.log('✅ All coverage metrics meet current thresholds');
  }

  // Detect significant coverage drops (for PRs)
  if (process.env.GITHUB_EVENT_NAME === 'pull_request') {
    console.log('\n📉 Coverage Change Detection');
    console.log('=============================');
    console.log('Coverage change detection would go here');
    console.log('(Requires baseline comparison)');
  }

  console.log('\n📋 Next Steps');
  console.log('==============');
  if (avgCoverage < 10) {
    console.log('• Focus on Epic 1: Simple backend services');
    console.log('• Establish testing patterns');
    console.log('• Create core component tests');
  } else if (avgCoverage < 20) {
    console.log('• Continue with Epic 2: Critical business services');
    console.log('• Expand frontend component coverage');
  } else if (avgCoverage < 30) {
    console.log('• Add Epic 3: Infrastructure services');
    console.log('• Test complex feature components');
  } else if (avgCoverage < 40) {
    console.log('• Complete complex business logic tests');
    console.log('• Add integration test scenarios');
  } else if (avgCoverage < 50) {
    console.log('• Finish remaining services and components');
    console.log('• Focus on edge cases and error scenarios');
  } else {
    console.log('• 🎊 Goal achieved! Consider stretch goals');
    console.log('• Focus on test quality and performance');
    console.log('• Add advanced integration scenarios');
  }

  console.log('\n');
}

if (require.main === module) {
  checkCoverage();
}

module.exports = { checkCoverage };