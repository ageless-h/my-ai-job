#!/usr/bin/env node
/**
 * 验证所有test-coverage标签的Issues是否已关闭
 * 并检查覆盖率是否达标
 * 
 * 使用方法:
 * node scripts/verify-issues-closed.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COVERAGE_THRESHOLD = 80;
const COVERAGE_SUMMARY_PATH = path.join(__dirname, '../coverage/coverage-summary.json');
const REPO = process.env.GITHUB_REPOSITORY || 'ageless-h/my-ai-job';

/**
 * 获取所有test-coverage标签的Issues
 */
function getTestCoverageIssues() {
  try {
    const result = execSync(
      `gh issue list --repo ${REPO} --label test-coverage --state all --json number,title,state,closedAt --limit 1000`,
      { encoding: 'utf-8' }
    );
    
    return JSON.parse(result);
  } catch (error) {
    console.error('❌ 获取Issues失败:', error.message);
    process.exit(1);
  }
}

/**
 * 检查覆盖率是否达标
 */
function checkCoverageThreshold() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    console.error(`❌ 覆盖率报告不存在: ${COVERAGE_SUMMARY_PATH}`);
    console.error('请先运行: npm run test:coverage');
    return null;
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf-8'));
  const total = coverage.total;

  return {
    lines: total.lines.pct,
    functions: total.functions.pct,
    branches: total.branches.pct,
    statements: total.statements.pct,
    passed: total.lines.pct >= COVERAGE_THRESHOLD && 
            total.functions.pct >= 75 &&
            total.branches.pct >= 75 &&
            total.statements.pct >= COVERAGE_THRESHOLD
  };
}

/**
 * 主函数
 */
function main() {
  console.log('🔍 验证测试覆盖率Issues状态...\n');

  // 检查gh CLI
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ 未安装GitHub CLI (gh)');
    process.exit(1);
  }

  // 获取Issues
  console.log('📋 获取所有test-coverage标签的Issues...');
  const issues = getTestCoverageIssues();
  
  if (issues.length === 0) {
    console.log('✅ 没有test-coverage标签的Issues');
  } else {
    const openIssues = issues.filter(i => i.state === 'OPEN');
    const closedIssues = issues.filter(i => i.state === 'CLOSED');

    console.log(`\n📊 Issues统计:`);
    console.log(`   - 总计: ${issues.length} 个`);
    console.log(`   - 已关闭: ${closedIssues.length} 个`);
    console.log(`   - 未关闭: ${openIssues.length} 个\n`);

    if (openIssues.length > 0) {
      console.log('⚠️  以下Issues仍未关闭:\n');
      openIssues.forEach(issue => {
        console.log(`   #${issue.number}: ${issue.title}`);
      });
      console.log();
    }
  }

  // 检查覆盖率
  console.log('📊 检查当前覆盖率...');
  const coverageResult = checkCoverageThreshold();

  if (!coverageResult) {
    console.log('⚠️  无法验证覆盖率（报告不存在）\n');
    process.exit(1);
  }

  console.log('\n当前覆盖率:');
  console.log(`   - Lines: ${coverageResult.lines.toFixed(2)}% ${coverageResult.lines >= COVERAGE_THRESHOLD ? '✅' : '❌'}`);
  console.log(`   - Functions: ${coverageResult.functions.toFixed(2)}% ${coverageResult.functions >= 75 ? '✅' : '❌'}`);
  console.log(`   - Branches: ${coverageResult.branches.toFixed(2)}% ${coverageResult.branches >= 75 ? '✅' : '❌'}`);
  console.log(`   - Statements: ${coverageResult.statements.toFixed(2)}% ${coverageResult.statements >= COVERAGE_THRESHOLD ? '✅' : '❌'}\n`);

  // 最终验证
  const openIssues = issues.filter(i => i.state === 'OPEN');
  const allIssuesClosed = openIssues.length === 0;
  const coveragePassed = coverageResult.passed;

  console.log('='.repeat(60));
  console.log('🎯 最终验证结果');
  console.log('='.repeat(60));
  console.log(`${allIssuesClosed ? '✅' : '❌'} 所有Issues已关闭: ${allIssuesClosed ? 'YES' : 'NO'}`);
  console.log(`${coveragePassed ? '✅' : '❌'} 覆盖率达标: ${coveragePassed ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));

  if (allIssuesClosed && coveragePassed) {
    console.log('\n🎉 恭喜！所有测试覆盖率目标已达成！');
    process.exit(0);
  } else {
    console.log('\n⚠️  仍有未完成的工作:');
    if (!allIssuesClosed) {
      console.log(`   - 还有 ${openIssues.length} 个Issues未关闭`);
    }
    if (!coveragePassed) {
      console.log('   - 覆盖率未达标');
    }
    process.exit(1);
  }
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { getTestCoverageIssues, checkCoverageThreshold };
