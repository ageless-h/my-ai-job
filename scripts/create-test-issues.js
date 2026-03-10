#!/usr/bin/env node
/**
 * 根据测试覆盖率报告自动创建GitHub Issues
 * 
 * 使用方法:
 * 1. 运行 npm run test:coverage 生成覆盖率报告
 * 2. 运行 node scripts/create-test-issues.js
 * 
 * 需要环境变量:
 * - GITHUB_TOKEN: GitHub Personal Access Token (或使用 gh CLI 已登录)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const COVERAGE_THRESHOLD = 80; // 覆盖率阈值
const COVERAGE_SUMMARY_PATH = path.join(__dirname, '../coverage/coverage-summary.json');
const REPO = process.env.GITHUB_REPOSITORY || 'ageless-h/my-ai-job';

// 优先级映射
const PRIORITY_MAP = {
  'src/core/': 'high',
  'src/shared/utils/': 'high',
  'src/state/': 'medium',
  'src/features/': 'medium',
  'src/app/': 'low'
};

/**
 * 获取文件优先级
 */
function getFilePriority(filePath) {
  for (const [prefix, priority] of Object.entries(PRIORITY_MAP)) {
    if (filePath.startsWith(prefix)) {
      return priority;
    }
  }
  return 'low';
}

/**
 * 解析覆盖率报告
 */
function parseCoverageReport() {
  if (!fs.existsSync(COVERAGE_SUMMARY_PATH)) {
    console.error(`❌ 覆盖率报告不存在: ${COVERAGE_SUMMARY_PATH}`);
    console.error('请先运行: npm run test:coverage');
    process.exit(1);
  }

  const coverage = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY_PATH, 'utf-8'));
  const lowCoverageFiles = [];

  for (const [file, data] of Object.entries(coverage)) {
    // 跳过总计行和非源文件
    if (file === 'total' || !file.endsWith('.ts') && !file.endsWith('.vue')) {
      continue;
    }

    const lineCoverage = data.lines.pct;
    
    if (lineCoverage < COVERAGE_THRESHOLD) {
      lowCoverageFiles.push({
        file: file.replace(/\\/g, '/'), // 统一路径分隔符
        coverage: lineCoverage.toFixed(2),
        lines: {
          covered: data.lines.covered,
          total: data.lines.total,
          pct: lineCoverage
        },
        functions: {
          covered: data.functions.covered,
          total: data.functions.total,
          pct: data.functions.pct
        },
        branches: {
          covered: data.branches.covered,
          total: data.branches.total,
          pct: data.branches.pct
        },
        statements: {
          covered: data.statements.covered,
          total: data.statements.total,
          pct: data.statements.pct
        },
        priority: getFilePriority(file)
      });
    }
  }

  // 按优先级和覆盖率排序
  lowCoverageFiles.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.coverage - b.coverage; // 覆盖率低的优先
  });

  return lowCoverageFiles;
}

/**
 * 创建Issue标题
 */
function createIssueTitle(item) {
  const fileName = path.basename(item.file);
  return `[Test Coverage] ${fileName} - 覆盖率 ${item.coverage}% (目标 ${COVERAGE_THRESHOLD}%)`;
}

/**
 * 创建Issue内容
 */
function createIssueBody(item) {
  return `## 📊 覆盖率不足

**文件**: \`${item.file}\`

### 当前覆盖率

| 指标 | 覆盖 | 总计 | 百分比 |
|------|------|------|--------|
| Lines | ${item.lines.covered} | ${item.lines.total} | ${item.lines.pct.toFixed(2)}% |
| Functions | ${item.functions.covered} | ${item.functions.total} | ${item.functions.pct.toFixed(2)}% |
| Branches | ${item.branches.covered} | ${item.branches.total} | ${item.branches.pct.toFixed(2)}% |
| Statements | ${item.statements.covered} | ${item.statements.total} | ${item.statements.pct.toFixed(2)}% |

### 目标

- **Lines**: ≥ ${COVERAGE_THRESHOLD}%
- **Functions**: ≥ 75%
- **Branches**: ≥ 75%
- **Statements**: ≥ ${COVERAGE_THRESHOLD}%

### 建议

1. 为未覆盖的函数添加单元测试
2. 测试边界情况和错误处理
3. 确保所有分支都被测试覆盖

### 优先级

**${item.priority.toUpperCase()}** - ${item.priority === 'high' ? '核心业务逻辑，必须优先处理' : item.priority === 'medium' ? '重要功能模块' : '辅助功能'}

---

> 🤖 此Issue由自动化脚本创建
> 📅 创建时间: ${new Date().toISOString()}
`;
}

/**
 * 检查Issue是否已存在
 */
function checkIssueExists(fileName) {
  try {
    const result = execSync(
      `gh issue list --repo ${REPO} --search "${fileName} coverage in:title" --state all --json number,title,state --limit 100`,
      { encoding: 'utf-8' }
    );
    
    const issues = JSON.parse(result);
    return issues.find(issue => 
      issue.title.includes(fileName) && 
      issue.title.includes('覆盖率') &&
      issue.state === 'OPEN'
    );
  } catch (error) {
    console.error(`⚠️  检查Issue失败: ${error.message}`);
    return null;
  }
}

/**
 * 创建GitHub Issue
 */
function createGitHubIssue(item) {
  const fileName = path.basename(item.file);
  
  // 检查是否已存在
  const existing = checkIssueExists(fileName);
  if (existing) {
    console.log(`⏭️  跳过已存在的Issue: ${existing.title} (#${existing.number})`);
    return null;
  }

  const title = createIssueTitle(item);
  const body = createIssueBody(item);
  const labels = ['test-coverage', 'automated', `priority-${item.priority}`];

  try {
    // 使用 gh CLI 创建Issue
    const result = execSync(
      `gh issue create --repo ${REPO} --title "${title}" --body "${body.replace(/"/g, '\\"')}" --label "${labels.join(',')}"`,
      { encoding: 'utf-8' }
    );
    
    const issueUrl = result.trim();
    const issueNumber = issueUrl.match(/#(\d+)$/)?.[0] || '';
    
    console.log(`✅ 已创建Issue ${issueNumber}: ${title}`);
    return issueUrl;
  } catch (error) {
    console.error(`❌ 创建Issue失败: ${title}`);
    console.error(error.message);
    return null;
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🚀 开始创建测试覆盖率Issues...\n');

  // 检查gh CLI
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ 未安装GitHub CLI (gh)');
    console.error('请访问: https://cli.github.com/');
    process.exit(1);
  }

  // 检查gh认证
  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ GitHub CLI未登录');
    console.error('请运行: gh auth login');
    process.exit(1);
  }

  // 解析覆盖率报告
  console.log('📊 解析覆盖率报告...');
  const lowCoverageFiles = parseCoverageReport();
  
  if (lowCoverageFiles.length === 0) {
    console.log('🎉 所有文件覆盖率均达标！');
    return;
  }

  console.log(`\n发现 ${lowCoverageFiles.length} 个文件覆盖率低于 ${COVERAGE_THRESHOLD}%\n`);

  // 按优先级分组统计
  const stats = {
    high: lowCoverageFiles.filter(f => f.priority === 'high').length,
    medium: lowCoverageFiles.filter(f => f.priority === 'medium').length,
    low: lowCoverageFiles.filter(f => f.priority === 'low').length
  };

  console.log('📈 优先级分布:');
  console.log(`   - High: ${stats.high} 个文件`);
  console.log(`   - Medium: ${stats.medium} 个文件`);
  console.log(`   - Low: ${stats.low} 个文件\n`);

  // 创建Issues
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of lowCoverageFiles) {
    const result = createGitHubIssue(item);
    
    if (result) {
      created++;
    } else if (result === null && checkIssueExists(path.basename(item.file))) {
      skipped++;
    } else {
      failed++;
    }

    // 避免API限流
    if (created > 0 && created % 10 === 0) {
      console.log('\n⏸️  暂停1秒以避免API限流...\n');
      execSync('timeout /t 1 /nobreak > nul 2>&1 || sleep 1', { stdio: 'ignore' });
    }
  }

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 执行总结');
  console.log('='.repeat(60));
  console.log(`✅ 成功创建: ${created} 个Issues`);
  console.log(`⏭️  跳过已存在: ${skipped} 个Issues`);
  console.log(`❌ 创建失败: ${failed} 个Issues`);
  console.log('='.repeat(60));

  if (created > 0) {
    console.log(`\n🔗 查看所有Issues: https://github.com/${REPO}/issues?q=is:issue+label:test-coverage`);
  }
}

// 执行
if (require.main === module) {
  main();
}

module.exports = { parseCoverageReport, createIssueTitle, createIssueBody };
