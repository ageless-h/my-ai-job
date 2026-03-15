// 模拟职位列表数据
export const MOCK_JOB_LIST = [
  {
    id: 'job-001',
    encryptJobId: 'job-001',
    jobName: '前端开发工程师',
    brandName: '某科技公司',
    salaryDesc: '20-30K',
    cityName: '北京',
    areaDistrict: '朝阳区',
    jobExperience: '3-5年',
    jobDegree: '本科',
    skills: ['Vue', 'React', 'TypeScript'],
    positionDetail: '负责公司核心产品的前端开发，参与技术选型和架构设计。',
    bossName: '张经理',
    bossTitle: '技术总监',
    activeTimeDesc: '刚刚活跃',
  },
  {
    id: 'job-002',
    encryptJobId: 'job-002',
    jobName: 'Vue.js 高级工程师',
    brandName: '互联网公司',
    salaryDesc: '25-40K',
    cityName: '北京',
    areaDistrict: '海淀区',
    jobExperience: '5-10年',
    jobDegree: '本科',
    skills: ['Vue3', 'Vite', 'Pinia'],
    positionDetail: '负责前端架构设计和技术选型，带领团队完成核心业务开发。',
    bossName: '李总监',
    bossTitle: 'CTO',
    activeTimeDesc: '1小时内活跃',
  },
  {
    id: 'job-003',
    encryptJobId: 'job-003',
    jobName: 'TypeScript 开发工程师',
    brandName: '创业公司',
    salaryDesc: '18-25K',
    cityName: '北京',
    areaDistrict: '中关村',
    jobExperience: '1-3年',
    jobDegree: '本科',
    skills: ['TypeScript', 'Node.js', 'Express'],
    positionDetail: '负责后端服务开发，参与 API 设计和数据库优化。',
    bossName: '王经理',
    bossTitle: '技术负责人',
    activeTimeDesc: '3小时内活跃',
  },
  {
    id: 'job-004',
    encryptJobId: 'job-004',
    jobName: '全栈开发工程师',
    brandName: '外企',
    salaryDesc: '30-50K',
    cityName: '上海',
    areaDistrict: '浦东新区',
    jobExperience: '5-10年',
    jobDegree: '硕士',
    skills: ['Vue', 'Node.js', 'MongoDB'],
    positionDetail: '负责全栈开发，包括前端、后端和数据库设计。',
    bossName: 'John',
    bossTitle: 'Engineering Manager',
    activeTimeDesc: '今日活跃',
  },
  {
    id: 'job-005',
    encryptJobId: 'job-005',
    jobName: '前端架构师',
    brandName: '大厂',
    salaryDesc: '40-60K',
    cityName: '深圳',
    areaDistrict: '南山区',
    jobExperience: '10年以上',
    jobDegree: '本科',
    skills: ['Vue', 'React', 'Webpack', 'Vite'],
    positionDetail: '负责前端架构设计、技术选型和团队建设。',
    bossName: '陈总',
    bossTitle: '技术VP',
    activeTimeDesc: '本周活跃',
  },
];

// 模拟用户信息
export const MOCK_GEEK_INFO = {
  name: '测试用户',
  expectSalary: '20-30K',
  expectCity: '北京',
  workYears: 5,
};

// 错误模拟配置（可选）
export const MOCK_CONFIG = {
  simulateError: false, // 是否模拟错误
  errorRate: 0.1, // 错误率 10%
  networkDelay: 300, // 网络延迟（毫秒）
};
