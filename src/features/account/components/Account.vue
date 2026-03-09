<template>
  <div class="account-tab">
    <div class="header-title">账户与数据</div>

    <div class="boss-card">
      <div class="card-title">基本信息</div>
      <el-form class="boss-form mt-16" label-width="80px" label-position="left">
        <el-row :gutter="40">
          <el-col :span="12">
            <el-form-item label="手机号码" prop="phone">
              <el-input v-model="userStore.user.phone" placeholder="用于异常通知短信提醒" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="通知邮箱" prop="email">
              <el-input v-model="userStore.user.email" placeholder="用于接收每日总结及高意向提醒" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <div class="boss-card mt-16">
      <div class="card-title">
        在线简历库
        <el-tag size="small" type="primary" class="ml-8" effect="plain" v-if="hasResume">已就绪</el-tag>
      </div>

      <div class="resume-manage-box">
        <div class="resume-type-group">
          <div class="group-header">
            <div class="group-title">个人主页简历 (文本)</div>
            <div class="group-desc">导入在线个人主页简历信息，用于 AI 职位匹配与定制化对话回复。</div>
          </div>

          <div class="resume-actions">
            <el-tooltip content="将前往 BOSS 个人主页后台抓取最新的简历数据" placement="top" :show-after="300">
              <el-button type="primary" :loading="importResumeLoading" @click="handlerImportResume">
                <el-icon class="mr-4"><Refresh /></el-icon>直接从 BOSS 导入
              </el-button>
            </el-tooltip>

            <el-button plain @click="handleViewResumeContent" :disabled="!hasResume">
              <el-icon class="mr-4"><View /></el-icon>查看内容文本
            </el-button>
          </div>
        </div>

        <div class="judge-divider"></div>

        <div class="resume-type-group">
          <div class="group-header">
            <div class="group-title">附件简历 (图像)</div>
            <div class="group-desc">部分 HR 要求直接发送图片附件简历，上传后可作为快捷项发送。</div>
          </div>

          <div class="resume-actions-col">
            <el-checkbox v-model="userStore.user.preference.cIE" border>启用图片简历发送</el-checkbox>

            <div class="resume-btn-row">
              <el-upload
                action="https://www.zhipin.com/wapi/zpupload/image/uploadSingle"
                :before-upload="beforeUpload"
                :on-success="handleUploadSuccess"
                :show-file-list="false"
                :data="uploadData"
                :headers="{ Zp_token: Tools.getCookieValue('bst') }"
              >
                <el-button type="primary" plain size="small" :disabled="!userStore.user.preference.cIE">
                  <el-icon class="mr-4"><Upload /></el-icon>上传简历图片
                </el-button>
              </el-upload>

              <el-button plain size="small" @click="handleViewResumeImage" :disabled="!hasImageResume">
                <el-icon class="mr-4"><Picture /></el-icon>预览当前图片
              </el-button>

              <el-tag v-if="hasImageResume" type="success" effect="light" size="small" class="border-none">已有图片记录</el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="boss-card mt-16 mb-24">
      <div class="card-title">投递配置备份</div>
      <div class="sub-desc mb-16">可以导出您多年精心调教的投递偏好设置、提示词和参数，随时更换设备或分享给朋友。</div>

      <div class="data-actions">
        <el-button type="warning" plain size="small" class="shadow-sm" @click="exportSetting">
          <el-icon class="mr-4"><Download /></el-icon>导出所有配置文件
        </el-button>
        <el-button type="info" plain size="small" class="shadow-sm" @click="importSetting">
          <el-icon class="mr-4"><UploadFilled /></el-icon>导入外部设置
        </el-button>
      </div>
    </div>

    <div class="boss-card mt-16 mb-24">
      <div class="card-title">敏感数据管理</div>
      <div class="sub-desc mb-16">清除本地存储的简历内容和 API 密钥，保护您的隐私安全。</div>

      <div class="data-actions">
        <el-button type="danger" plain size="small" class="shadow-sm" @click="handleClearSensitiveData">
          <el-icon class="mr-4"><Delete /></el-icon>清除所有敏感数据
        </el-button>
      </div>
    </div>

    <div class="action-footer">
      <div class="buttons">
        <el-button type="primary" class="save-btn shadow-sm" @click="handleSave">保存变更</el-button>
      </div>
    </div>

    <el-dialog v-model="resumeTextPreviewVisible" title="简历全量文本预览" width="760px" class="boss-dialog">
      <el-input v-model="resumeTextPreviewContent" type="textarea" :rows="18" readonly class="preview-textarea" />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resumeTextPreviewVisible = false">关闭预览</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { computed, ref, inject } from 'vue';
import { showAppMessage } from '@/core/http/request';
import { Tools } from '@/shared/utils/tools';
import {
  extractResumeTextFromHtml,
  extractResumeTextFromDocument,
  extractBossResumeProfileFromDocument,
  extractBossResumeProfileFromHtml,
} from '@/shared/utils/resume';
import { UserStore } from '@/state/user';
import { loginInterceptor } from '@/core/auth/auth';
import { ElNotification, ElMessageBox } from 'element-plus';
import { Refresh, View, Upload, Picture, Download, UploadFilled } from '@element-plus/icons-vue';
import axios from 'axios';

const userStore = UserStore();
const axios2 = inject('$axios') as any;
const platform = inject('$platform') as any;
const PREFERENCE_SAVE_TIMEOUT_MS = 30_000;
const RESUME_FETCH_TIMEOUT_MS = 20_000;
const RESUME_IMPORT_MAX_RETRY = 2;

// ---- Resume import (migrated from Preference) ----
const importResumeLoading = ref(false);
const resumeTextPreviewVisible = ref(false);
const resumeTextPreviewContent = ref('');
const viewResumeContentLoading = ref(false);
const hasResume = computed(() => {
  return Boolean(`${userStore.user?.resumeId || ''}`.trim() || getResumeTextForPreview());
});
const hasImageResume = computed(() => Boolean(`${userStore.user?.preference?.cI || ''}`.trim()));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableNetworkError = (error: any): boolean => {
  const code = `${error?.code || ''}`;
  if (code === 'ECONNABORTED' || code === 'ERR_NETWORK') {
    return true;
  }
  const msg = `${error?.message || error?.response?.data?.message || ''}`.toLowerCase();
  return msg.includes('timeout') || msg.includes('time out') || msg.includes('network');
};

const getErrorText = (error: any): string => {
  return `${error?.response?.data?.message || error?.message || ''}`.trim();
};

const getResumeFetchFailureReason = (error: any): string => {
  if (!error) {
    return '';
  }
  if (isRetryableNetworkError(error)) {
    return '网络超时或网络异常';
  }
  const status = Number(error?.response?.status ?? 0);
  if (status === 401 || status === 403) {
    return '登录态失效或无权限访问';
  }
  const text = getErrorText(error).toLowerCase();
  if (text.includes('token') || text.includes('login') || text.includes('未登录')) {
    return '登录态失效，请刷新页面后重试';
  }
  if (text.includes('code=')) {
    return getErrorText(error);
  }
  return getErrorText(error) || '请求失败';
};

const runWithRetry = async <T>(requestFn: () => Promise<T>, maxRetry = RESUME_IMPORT_MAX_RETRY): Promise<T> => {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      if (!isRetryableNetworkError(error) || attempt === maxRetry) {
        throw error;
      }
      await sleep(1200 * attempt);
    }
  }
  throw lastError;
};

const toPlainRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const pickFirstNonEmptyText = (sources: Array<Record<string, unknown>>, keys: string[], maxLength = 8000): string => {
  for (const source of sources) {
    for (const key of keys) {
      const text = `${source?.[key] ?? ''}`.replace(/\s+/g, ' ').trim();
      if (text) {
        return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
      }
    }
  }
  return '';
};

const normalizePreviewMultiline = (value: unknown, maxLength = 20000): string => {
  const text = `${value ?? ''}`
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
  if (!text) {
    return '';
  }
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const pickFirstNonEmptyMultiline = (sources: Array<Record<string, unknown>>, keys: string[], maxLength = 20000): string => {
  for (const source of sources) {
    for (const key of keys) {
      const text = normalizePreviewMultiline(source?.[key], maxLength);
      if (text) {
        return text;
      }
    }
  }
  return '';
};

const getResumeTextForPreview = (): string => {
  const userRecord = toPlainRecord(userStore.user);
  const importedResume = toPlainRecord(userStore.user.importedResume);
  const nestedResume = toPlainRecord(importedResume.resume);
  const rootResume = toPlainRecord(userRecord.resume);
  const rootResumeInfo = toPlainRecord(userRecord.resumeInfo);
  const rootParsedResume = toPlainRecord(userRecord.parsedResume);
  return pickFirstNonEmptyMultiline(
    [importedResume, nestedResume, rootResume, rootResumeInfo, rootParsedResume, userRecord],
    [
      'resumeText',
      'resumePlainText',
      'resumeBodyText',
      'resumePageText',
      'runtimeResumeText',
      'resumeContent',
      'attachmentResumeText',
      'parsedResumeText',
      'resumeNarrative',
      'text',
      'content'
    ],
    20000
  );
};

const getResumeImagePreview = (): { originImage: string; tinyImage: string } => {
  const imageSet = `${userStore.user?.preference?.cI || ''}`.trim();
  if (!imageSet) {
    return { originImage: '', tinyImage: '' };
  }
  const [originImage, tinyImage] = imageSet.split('===');
  return {
    originImage: `${originImage || ''}`.trim(),
    tinyImage: `${tinyImage || ''}`.trim(),
  };
};

const isBossResumePage = (): boolean => {
  const pathname = `${window.location?.pathname || ''}`.toLowerCase();
  return /^\/web\/geek\/resume(?:\/|$)/.test(pathname);
};

const isLikelyResumeTypoPath = (): boolean => {
  const pathname = `${window.location?.pathname || ''}`.toLowerCase();
  return pathname.includes('/web/geek/resumee');
};

type BossTokenSource = 'bst-cookie' | 'page-token' | 'window-page-token' | 'none';

const getBossTokenDetail = (): { token: string; source: BossTokenSource } => {
  const bstToken = `${Tools.getCookieValue('bst') || ''}`.trim();
  if (bstToken) {
    return { token: bstToken, source: 'bst-cookie' };
  }

  const pageToken = `${Tools.getPageToken() || ''}`.trim();
  if (pageToken) {
    return { token: pageToken, source: 'page-token' };
  }

  const windowPageToken = `${Tools.window?._PAGE?.token || ''}`.trim();
  if (windowPageToken) {
    return { token: windowPageToken, source: 'window-page-token' };
  }

  return { token: '', source: 'none' };
};

const getBossToken = (): string => {
  return getBossTokenDetail().token;
};

const getBossUid = (): string => {
  const rawUid = Tools.getPageUidString() || `${Tools.window?._PAGE?.uid || ''}`;
  return `${rawUid}`.trim();
};

const getResumeProfileFromCurrentPage = () => {
  if (!isBossResumePage()) {
    return {
      resumeText: '',
      resumeTextSource: '',
      fullName: '',
      infoLabels: '',
      profileSummary: '',
      expectedJob: '',
      workYears: '',
      education: '',
    };
  }
  const resumeText = extractResumeTextFromDocument(document, 12000);
  const profile = extractBossResumeProfileFromDocument(document);
  return {
    resumeText,
    resumeTextSource: 'resume-page-dom',
    ...profile,
  };
};

const buildResumeTextFromPreviewData = (rawData: unknown, maxLength = 12000): string => {
  const data = toPlainRecord(rawData);
  const baseInfo = toPlainRecord(data.baseInfo);
  const expectList = Array.isArray(data.expectList) ? data.expectList : [];
  const workExpList = Array.isArray(data.workExpList) ? data.workExpList : [];
  const projectExpList = Array.isArray(data.projectExpList) ? data.projectExpList : [];
  const educationExpList = Array.isArray(data.educationExpList) ? data.educationExpList : [];
  const certificationList = Array.isArray(data.certificationList) ? data.certificationList : [];
  const volunteerExpList = Array.isArray(data.volunteerExpList) ? data.volunteerExpList : [];

  const sections: string[] = [];

  const basicLines = [
    `姓名：${`${baseInfo.nickName || ''}`.trim()}`,
    `工作年限：${`${baseInfo.workYearDesc || ''}`.trim()}`,
    `学历：${`${baseInfo.degreeCategory || ''}`.trim()}`,
    `求职状态：${`${data.applyStatusDesc || ''}`.trim()}`,
  ].filter((line) => line.split('：')[1]);
  if (basicLines.length) {
    sections.push(`基本信息\n${basicLines.join('\n')}`);
  }

  const expectRows = expectList
    .filter((item: any) => Number(item?.positionType ?? 0) === 0)
    .map((item: any) => {
      const position = `${item?.positionName || ''}`.trim();
      const city = `${item?.cityName || item?.locationName || ''}`.trim();
      const salary = `${item?.salaryDesc || ''}`.trim();
      return [position, city, salary].filter(Boolean).join(' / ');
    })
    .filter(Boolean);
  if (expectRows.length) {
    sections.push(`期望职位\n${expectRows.map((row) => `- ${row}`).join('\n')}`);
  }

  const userDesc = `${data.userDesc || data.selfIntroduction || ''}`.trim();
  if (userDesc) {
    sections.push(`个人优势\n${userDesc}`);
  }

  const workRows = workExpList
    .map((item: any) => {
      const company = `${item?.companyName || ''}`.trim();
      const position = `${item?.positionName || ''}`.trim();
      const start = `${item?.startDate || item?.startYear || ''}`.trim();
      const end = `${item?.endDate || item?.endYear || ''}`.trim();
      const content = `${item?.workContent || ''}`.trim();
      const performance = `${item?.workPerformance || ''}`.trim();
      const title = [company, position].filter(Boolean).join(' - ');
      const period = [start, end].filter(Boolean).join(' ~ ');
      const block = [title, period, content, performance].filter(Boolean).join('\n');
      return block ? `- ${block}` : '';
    })
    .filter(Boolean);
  if (workRows.length) {
    sections.push(`工作经历\n${workRows.join('\n\n')}`);
  }

  const projectRows = projectExpList
    .map((item: any) => {
      const name = `${item?.name || ''}`.trim();
      const role = `${item?.roleName || ''}`.trim();
      const start = `${item?.startDate || ''}`.trim();
      const end = `${item?.endDate || ''}`.trim();
      const desc = `${item?.projectDesc || ''}`.trim();
      const performance = `${item?.performance || ''}`.trim();
      const title = [name, role].filter(Boolean).join(' - ');
      const period = [start, end].filter(Boolean).join(' ~ ');
      const block = [title, period, desc, performance].filter(Boolean).join('\n');
      return block ? `- ${block}` : '';
    })
    .filter(Boolean);
  if (projectRows.length) {
    sections.push(`项目经历\n${projectRows.join('\n\n')}`);
  }

  const eduRows = educationExpList
    .map((item: any) => {
      const school = `${item?.school || item?.schoolName || ''}`.trim();
      const major = `${item?.major || item?.majorName || ''}`.trim();
      const degree = `${item?.degreeName || ''}`.trim();
      const start = `${item?.startYear || item?.startDate || ''}`.trim();
      const end = `${item?.endYear || item?.endDate || ''}`.trim();
      return [school, major, degree, [start, end].filter(Boolean).join(' ~ ')].filter(Boolean).join(' / ');
    })
    .filter(Boolean);
  if (eduRows.length) {
    sections.push(`教育经历\n${eduRows.map((row) => `- ${row}`).join('\n')}`);
  }

  const certRows = certificationList
    .map((item: any) => `${item?.certName || item?.name || ''}`.trim())
    .filter(Boolean);
  if (certRows.length) {
    sections.push(`资格证书\n${certRows.map((row) => `- ${row}`).join('\n')}`);
  }

  const volunteerRows = volunteerExpList
    .map((item: any) => {
      const name = `${item?.name || ''}`.trim();
      const length = `${item?.serviceLength || ''}`.trim();
      const desc = `${item?.volunteerDesc || item?.volunteerDescription || ''}`.trim();
      return [name, length, desc].filter(Boolean).join(' / ');
    })
    .filter(Boolean);
  if (volunteerRows.length) {
    sections.push(`志愿者经历\n${volunteerRows.map((row) => `- ${row}`).join('\n')}`);
  }

  const finalText = sections.join('\n\n').trim();
  if (!finalText) {
    return '';
  }
  return finalText.length > maxLength ? `${finalText.slice(0, maxLength)}...` : finalText;
};

const fetchResumePreviewProfile = async (token: string) => {
  const resp = await axios.get('https://www.zhipin.com/wapi/zpgeek/resume/geek/preview/data.json', {
    headers: { Zp_token: token },
    params: { _: Date.now() },
    timeout: RESUME_FETCH_TIMEOUT_MS,
  });
  const code = Number(resp?.data?.code ?? -1);
  if (code !== 0) {
    const message = `${resp?.data?.message || ''}`.trim() || `resume preview api code=${code}`;
    throw new Error(message);
  }
  const zpData = toPlainRecord(resp?.data?.zpData);
  const baseInfo = toPlainRecord(zpData.baseInfo);
  const expectList = Array.isArray(zpData.expectList) ? zpData.expectList : [];
  const firstExpect = toPlainRecord(expectList.find((item: any) => Number(item?.positionType ?? 0) === 0) || expectList[0]);
  const workYears = `${baseInfo.workYearDesc || ''}`.trim();
  const education = `${baseInfo.degreeCategory || ''}`.trim();
  const fullName = `${baseInfo.nickName || ''}`.trim();
  const expectedJob = [`${firstExpect.positionName || ''}`.trim(), `${firstExpect.salaryDesc || ''}`.trim()]
    .filter(Boolean)
    .join(' / ');
  const profileSummary = `${zpData.userDesc || zpData.selfIntroduction || ''}`.trim();
  const infoLabels = [workYears, education].filter(Boolean).join(' · ');
  const resumeText = buildResumeTextFromPreviewData(zpData, 12000);
  return {
    resumeText,
    resumeTextSource: 'resume-preview-api',
    fullName,
    infoLabels,
    profileSummary,
    expectedJob,
    workYears,
    education,
  };
};

const fetchResumePageProfile = async (token: string) => {
  const resp = await axios.get('https://www.zhipin.com/web/geek/resume', {
    headers: { Zp_token: token },
    timeout: RESUME_FETCH_TIMEOUT_MS,
  });
  const html = `${resp?.data || ''}`;
  const resumeText = extractResumeTextFromHtml(html, 12000);
  const profile = extractBossResumeProfileFromHtml(html);
  return {
    resumeText,
    resumeTextSource: 'resume-page-html',
    ...profile,
  };
};

const fetchResumeTextForPreview = async (): Promise<string> => {
  const pageProfile = getResumeProfileFromCurrentPage();
  if (pageProfile.resumeText) {
    return pageProfile.resumeText;
  }
  const token = getBossToken();
  if (!token) {
    return '';
  }
  const previewProfile = await runWithRetry(() => fetchResumePreviewProfile(token), 2).catch(() => null);
  if (`${previewProfile?.resumeText || ''}`.trim()) {
    return `${previewProfile?.resumeText || ''}`.trim();
  }
  const remoteProfile = await runWithRetry(() => fetchResumePageProfile(token), 2).catch(() => null);
  return `${remoteProfile?.resumeText || ''}`.trim();
};

const handleViewResumeContent = async () => {
  if (viewResumeContentLoading.value) {
    return;
  }
  viewResumeContentLoading.value = true;
  try {
    let resumeText = getResumeTextForPreview();
    if (!resumeText) {
      const pageResumeText = await fetchResumeTextForPreview().catch(() => '');
      if (pageResumeText) {
        const importedResume = toPlainRecord(userStore.user.importedResume);
        userStore.user.importedResume = {
          ...importedResume,
          resumeText: pageResumeText,
          resumeTextSource: 'resume-preview-api',
          importedAt: new Date().toISOString(),
        };
        Tools.saveStoredUserProfile(userStore.user);
        resumeText = pageResumeText;
      }
    }
    if (!resumeText) {
      const tokenDetail = getBossTokenDetail();
      const token = tokenDetail.token;
      const reason = !token
        ? `未获取到登录 token（来源：${tokenDetail.source}）`
        : (isBossResumePage() ? '简历页未识别到正文内容' : '当前不在简历页，且在线拉取未返回正文');
      showAppMessage({ type: 'warning', message: `[AI助理] 暂无可查看的个人简历内容：${reason}` });
      return;
    }
    resumeTextPreviewContent.value = resumeText;
    resumeTextPreviewVisible.value = true;
  } finally {
    viewResumeContentLoading.value = false;
  }
};

const handleViewResumeImage = () => {
  const { originImage, tinyImage } = getResumeImagePreview();
  const targetUrl = originImage || tinyImage;
  if (!targetUrl) {
    showAppMessage({ type: 'warning', message: '暂无可查看的图片简历，请先上传图片简历' });
    return;
  }
  const opened = window.open(targetUrl, '_blank');
  if (!opened) {
    showAppMessage({ type: 'warning', message: '浏览器拦截了新窗口，请允许弹窗后重试' });
  }
};

const writeImportedResumeToUser = (resumeId: string, importDataInput: unknown, fallbackResumeText = '') => {
  const importData = toPlainRecord(importDataInput);
  const nestedResume = toPlainRecord(importData.resume);
  const nestedResumeInfo = toPlainRecord(importData.resumeInfo);
  const nestedParsedResume = toPlainRecord(importData.parsedResume);
  const sources = [importData, nestedResume, nestedResumeInfo, nestedParsedResume];

  const resumeText = pickFirstNonEmptyText(
    sources,
    [
      'resumeText',
      'resumeContent',
      'attachmentResumeText',
      'parsedResumeText',
      'ocrText',
      'content',
      'text',
      'resumeRawText'
    ],
    12000
  );

  const stableResumeText = resumeText || `${fallbackResumeText || ''}`.trim();

  const importedResume = {
    resumeId,
    resumeText: stableResumeText,
    resumeTextSource: `${importData.resumeTextSource || ''}` || (resumeText ? 'import-api' : (stableResumeText ? 'resume-page-html' : '')),
    fullName: pickFirstNonEmptyText(sources, ['realName', 'name', 'fullName', 'userName'], 80),
    workYears: pickFirstNonEmptyText(sources, ['workYear', 'workYears', 'workExperience'], 40),
    education: pickFirstNonEmptyText(sources, ['education', 'degree', 'highestDegree'], 40),
    school: pickFirstNonEmptyText(sources, ['school', 'schoolName', 'college', 'university'], 80),
    major: pickFirstNonEmptyText(sources, ['major', 'majorName', 'speciality', 'specialty'], 80),
    expectedJob: pickFirstNonEmptyText(sources, ['expectJob', 'expectedJob', 'expectPosition', 'desiredPosition'], 80),
    expectedCity: pickFirstNonEmptyText(sources, ['expectCity', 'expectedCity', 'city', 'cityName'], 60),
    expectedSalary: pickFirstNonEmptyText(sources, ['expectSalary', 'expectedSalary', 'salaryExpectation'], 60),
    profileSummary: pickFirstNonEmptyText(
      sources,
      ['selfIntroduction', 'introduction', 'summary', 'personalSummary', 'advantage', 'resumeSummary'],
      800
    ),
    importedAt: new Date().toISOString(),
  };

  userStore.user.resumeId = resumeId;
  userStore.user.importedResume = importedResume;
  Tools.saveStoredUserProfile(userStore.user);
};

const handlerImportResume = async () => {
  if (!loginInterceptor()) return;
  
  // ✅ 新增：检查用户是否授权存储简历
  const { requestResumeStorageConsent } = await import('@/shared/utils/sensitive-data-consent');
  const hasConsent = await requestResumeStorageConsent();
  if (!hasConsent) {
    showAppMessage({ type: 'warning', message: '您拒绝了简历存储授权，无法导入简历' });
    return;
  }
  
  const tokenDetail = getBossTokenDetail();
  const token = tokenDetail.token;
  const bossUserId = getBossUid();
  if (!token) {
    showAppMessage({ type: 'error', message: `未获取到 Boss 登录 token（来源：${tokenDetail.source}），请刷新页面后重试` });
    return;
  }
  importResumeLoading.value = true;
  try {
    const localPageProfile = getResumeProfileFromCurrentPage();
    let previewApiError: any = null;
    let remotePageError: any = null;
    const previewApiProfile = await runWithRetry(() => fetchResumePreviewProfile(token), 2).catch((error) => {
      previewApiError = error;
      return null;
    });
    const remotePageProfile = await runWithRetry(() => fetchResumePageProfile(token), 2).catch((error) => {
      remotePageError = error;
      return null;
    });
    const pageProfile = [localPageProfile, previewApiProfile, remotePageProfile].find((item: any) => `${item?.resumeText || ''}`.trim()) || localPageProfile;
    const resumePageText = `${pageProfile?.resumeText || ''}`.trim();
    if (!resumePageText) {
      const reasons: string[] = [];
      if (isLikelyResumeTypoPath()) {
        reasons.push('当前地址疑似拼写错误，请使用 /web/geek/resume');
      }
      if (!isBossResumePage()) {
        reasons.push('当前页面不是简历页');
      }
      if (previewApiError) {
        reasons.push(`预览接口失败: ${getResumeFetchFailureReason(previewApiError)}（token来源: ${tokenDetail.source}）`);
      } else if (!`${previewApiProfile?.resumeText || ''}`.trim()) {
        reasons.push('预览接口未返回简历正文');
      }
      if (remotePageError) {
        reasons.push(`简历页HTML抓取失败: ${getResumeFetchFailureReason(remotePageError)}`);
      } else if (!`${remotePageProfile?.resumeText || ''}`.trim()) {
        reasons.push('简历页HTML未识别到正文');
      }
      const reasonText = reasons.filter(Boolean).join('；');
      showAppMessage({ type: 'error', message: reasonText ? `未识别到BOSS个人简历页内容（${reasonText}）` : '未识别到BOSS个人简历页内容，请稍后重试' });
      return;
    }

    let resumeId = `${userStore.user.resumeId || ''}`.trim() || (bossUserId ? `online-${bossUserId}` : `online-${Date.now()}`);
    try {
      const resumeInfoResp = await runWithRetry(() => axios.get(
        'https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json',
        {
          headers: { Zp_token: token },
          timeout: RESUME_FETCH_TIMEOUT_MS,
        }
      ));
      const attachmentList = resumeInfoResp?.data?.zpData?.attachmentList || [];
      if (attachmentList.length && attachmentList[0]?.resumeId) {
        resumeId = `${attachmentList[0].resumeId}`;
      }
    } catch (_e) {
      // ignore sidebar fetch failures, online profile import still works
    }

    const importData = {
      ...pageProfile,
      resumeText: resumePageText,
      resumeTextSource: `${pageProfile?.resumeTextSource || ''}` || 'resume-preview-api',
    };
    writeImportedResumeToUser(resumeId, importData, resumePageText);

    showAppMessage({ type: 'success', message: '导入个人简历主页信息成功' });
  } catch (e: any) {
    const msg = isRetryableNetworkError(e)
      ? '网络超时，请稍后重试（已自动重试）'
      : getResumeFetchFailureReason(e);
    showAppMessage({ type: 'error', message: `导入简历失败: ${msg}` });
  } finally {
    importResumeLoading.value = false;
  }
};

// ---- Image resume upload ----
const firstFile = ref(null);
let jobDetail = platform?.getFistJobDetail?.();
const uploadData = {
  securityId: jobDetail?.securityId,
  source: 'chat_file',
};
const beforeUpload = (file: any) => {
  firstFile.value = file;
  return true;
};
const handleUploadSuccess = async (response: any) => {
  userStore.user.preference.cI = response.zpData.url + '===' + response.zpData.tinyUrl;
  showAppMessage({ message: '图片简历上传成功；点击保存账户信息可持久保存', type: 'success', duration: 3000 });
};

// ---- Export / Import settings (migrated from Preference) ----
const exportSetting = async () => {
  const preference = { ...userStore.user.preference };
  const exportData = JSON.stringify(preference, null, 2);
  try {
    await navigator.clipboard.writeText(exportData);
    ElNotification({ title: '导出成功', message: '投递设置已复制到剪贴板', type: 'success', duration: 2000 });
  } catch {
    ElNotification({ title: '导出失败', message: '复制到剪贴板时出错', type: 'error', duration: 2000 });
  }
};

const importSetting = async () => {
  ElMessageBox.prompt('请粘贴导出的投递设置', '导入投递设置', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '在此粘贴配置内容',
  })
    .then(({ value }: any) => {
      try {
        const importedPreference = JSON.parse(value);
        userStore.user.preference = { ...importedPreference };
        ElNotification({
          title: '导入成功',
          message: '投递设置已导入，请点击保存以持久化保存',
          type: 'success',
          duration: 3000,
        });
      } catch {
        ElNotification({ title: '导入失败', message: '配置格式错误，请检查后重试', type: 'error', duration: 2000 });
      }
    })
    .catch(() => undefined);
};

// ---- Clear Sensitive Data ----
const handleClearSensitiveData = async () => {
  ElMessageBox.confirm(
    '此操作将清除本地存储的简历内容和所有 API 密钥，且无法恢复。是否继续？',
    '清除敏感数据',
    {
      confirmButtonText: '确认清除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        const { clearAllSensitiveData } = await import('@/shared/utils/sensitive-data-consent');
        clearAllSensitiveData();
        ElNotification({
          title: '清除成功',
          message: '已清除所有敏感数据并撤销授权',
          type: 'success',
          duration: 3000,
        });
        // 刷新页面以重新加载数据
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        ElNotification({
          title: '清除失败',
          message: `操作失败：${error?.message || '未知错误'}`,
          type: 'error',
          duration: 3000,
        });
      }
    })
    .catch(() => undefined);
};

// ---- Save ----
const handleSave = async () => {
  if (!loginInterceptor()) return;
  if (!userStore.user.phone || !userStore.user.email) {
    showAppMessage({ message: '请填写手机号或邮箱', type: 'error', duration: 2000 });
    return;
  }
  await axios2
    .post('/api/user/save/preference', {
      ...userStore.user,
      aiSeatStatus: userStore.user.aiSeatStatus ? 1 : 0,
    }, {
      timeout: PREFERENCE_SAVE_TIMEOUT_MS,
    })
    .then(() => {
      showAppMessage({ message: '账户信息保存成功', type: 'success', duration: 2000 });
    });
};
</script>

<style scoped>
.account-tab {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  background-color: #f8f9fa;
  padding-bottom: 80px;
}

.header-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 16px;
  border-left: 3px solid var(--boss-primary, #00bebd);
  padding-left: 8px;
  line-height: 1;
}

.boss-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid #eef0f5;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.card-title::before {
  content: '';
  display: inline-block;
  width: 3px;
  height: 14px;
  background-color: var(--boss-primary, #00bebd);
  margin-right: 8px;
  border-radius: 2px;
}

.mt-16 {
  margin-top: 16px;
}

.mb-16 {
  margin-bottom: 16px;
}

.mb-24 {
  margin-bottom: 24px;
}

.ml-8 {
  margin-left: 8px;
}

.mr-4 {
  margin-right: 4px;
}

.sub-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.border-none {
  border: none !important;
}

:deep(.boss-form .el-form-item__label) {
  font-weight: 500;
  color: #555;
}

.resume-manage-box {
  background: #fdfdfd;
  border: 1px dashed #dcdfe6;
  border-radius: 6px;
  padding: 16px;
}

.judge-divider {
  height: 1px;
  background-color: #ebeef5;
  margin: 16px 0;
}

.group-header {
  margin-bottom: 12px;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.group-desc {
  font-size: 12px;
  color: #888;
}

.resume-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.resume-actions-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resume-btn-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.data-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 4px 0;
}

.data-actions .el-button {
  width: 100% !important;
  margin-left: 0 !important;
}

.shadow-sm {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.action-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 8px;
  border: 1px solid #ebeef5;
  margin-bottom: 40px;
}

.buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.save-btn {
  padding: 0 40px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

:deep(.boss-dialog .el-dialog__header) {
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
}

:deep(.boss-dialog .el-dialog__title) {
  font-weight: 600;
  color: #333;
}

:deep(.boss-dialog .el-dialog__footer) {
  border-top: 1px solid #ebeef5;
  padding-top: 16px;
}

:deep(.preview-textarea .el-textarea__inner) {
  background-color: #f8f9fa;
  border-color: #ebeef5;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
}

:deep(.el-button--primary:not(.is-plain):not(.is-link):not(.is-text)) {
  --el-button-bg-color: var(--boss-primary, #00bebd);
  --el-button-border-color: var(--boss-primary, #00bebd);
  --el-button-hover-bg-color: var(--boss-primary-hover, #00a8a7);
  --el-button-hover-border-color: var(--boss-primary-hover, #00a8a7);
}

@media (max-width: 860px) {
  .data-actions {
    grid-template-columns: 1fr;
  }

  .action-footer {
    position: static;
    padding-top: 12px;
  }

  .save-btn {
    width: 100%;
  }

  :deep(.el-row) {
    display: block;
  }

  :deep(.el-col) {
    max-width: 100%;
    width: 100%;
  }

  :deep(.boss-dialog) {
    width: 95% !important;
    max-width: 95vw !important;
    margin: 0 auto !important;
  }

  :deep(.boss-dialog .el-dialog__body) {
    padding: 12px;
  }

  :deep(.preview-textarea .el-textarea__inner) {
    font-size: 12px;
  }
}

@media (max-width: 600px) {
  :deep(.boss-dialog) {
    width: 100% !important;
    max-width: 100vw !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }

  :deep(.boss-dialog .el-dialog__header) {
    padding: 12px;
  }

  :deep(.boss-dialog .el-dialog__footer) {
    padding: 12px;
  }
}
</style>
