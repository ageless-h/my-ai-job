<template>
  <div class="account-page">
    <!-- 账号信息 -->
    <div class="acc-section">
      <div class="acc-section__title">账号信息</div>
      <div class="acc-section__body">
        <el-form label-width="auto" label-position="top" size="default">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="userStore.user.phone" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item label="通知邮箱" prop="email">
            <el-input v-model="userStore.user.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 简历管理 -->
    <div class="acc-section">
      <div class="acc-section__title">简历管理</div>
      <div class="acc-section__body">
        <div class="acc-resume-row">
          <el-tooltip
            effect="dark"
            raw-content
            content="导入BOSS个人简历主页信息（非PDF附件）<p/>- 用于AI对话定制化回复"
            placement="bottom"
          >
            <el-button type="primary" :loading="importResumeLoading" @click="handlerImportResume">
              导入个人页简历
            </el-button>
          </el-tooltip>
          <el-button @click="handleViewResumeContent">查看简历内容</el-button>
          <el-button @click="handleViewResumeImage">查看简历图像</el-button>
        </div>
        <div class="acc-resume-row">
          <el-checkbox v-model="userStore.user.preference.cIE" label="" size="large" />
          <span class="acc-label">发送图片简历</span>
          <el-upload
            action="https://www.zhipin.com/wapi/zpupload/image/uploadSingle"
            :before-upload="beforeUpload"
            :on-success="handleUploadSuccess"
            :show-file-list="false"
            :data="uploadData"
            :headers="{ Zp_token: Tools.getCookieValue('bst') }"
          >
            <el-button size="small" type="primary">选择图片简历</el-button>
          </el-upload>
          <el-tag v-if="userStore.user.preference.cI" type="success" size="small" style="margin-left: 5px">
            已上传
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 导入导出 -->
    <div class="acc-section">
      <div class="acc-section__title">偏好数据</div>
      <div class="acc-section__body acc-action-row">
        <el-button @click="exportSetting">导出偏好设置</el-button>
        <el-button @click="importSetting">导入偏好设置</el-button>
      </div>
    </div>

    <!-- 保存 -->
    <div class="acc-section">
      <el-button type="primary" @click="handleSave">保存账户信息</el-button>
    </div>

    <el-dialog v-model="resumeTextPreviewVisible" title="个人简历内容" width="760px">
      <el-input v-model="resumeTextPreviewContent" type="textarea" :rows="18" readonly />
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, inject } from 'vue';
import { ElMessage } from '@/core/http/request';
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
      ElMessage({ type: 'warning', message: `[AI助理] 暂无可查看的个人简历内容：${reason}` });
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
    ElMessage({ type: 'warning', message: '暂无可查看的图片简历，请先上传图片简历' });
    return;
  }
  const opened = window.open(targetUrl, '_blank');
  if (!opened) {
    ElMessage({ type: 'warning', message: '浏览器拦截了新窗口，请允许弹窗后重试' });
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
  const tokenDetail = getBossTokenDetail();
  const token = tokenDetail.token;
  const bossUserId = getBossUid();
  if (!token) {
    ElMessage({ type: 'error', message: `未获取到 Boss 登录 token（来源：${tokenDetail.source}），请刷新页面后重试` });
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
      ElMessage({ type: 'error', message: reasonText ? `未识别到BOSS个人简历页内容（${reasonText}）` : '未识别到BOSS个人简历页内容，请稍后重试' });
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

    ElMessage({ type: 'success', message: '导入个人简历主页信息成功' });
  } catch (e: any) {
    const msg = isRetryableNetworkError(e)
      ? '网络超时，请稍后重试（已自动重试）'
      : getResumeFetchFailureReason(e);
    ElMessage({ type: 'error', message: `导入简历失败: ${msg}` });
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
  ElMessage({ message: '图片简历上传成功；点击保存账户信息可持久保存', type: 'success', duration: 3000 });
};

// ---- Export / Import settings (migrated from Preference) ----
const exportSetting = async () => {
  const preference = { ...userStore.user.preference };
  const exportData = JSON.stringify(preference, null, 2);
  try {
    await navigator.clipboard.writeText(exportData);
    ElNotification({ title: '导出成功', message: '偏好设置已复制到剪贴板', type: 'success', duration: 2000 });
  } catch {
    ElNotification({ title: '导出失败', message: '复制到剪贴板时出错', type: 'error', duration: 2000 });
  }
};

const importSetting = async () => {
  ElMessageBox.prompt('请粘贴导出的偏好设置配置', '导入偏好设置', {
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
          message: '偏好设置已导入，请点击保存以持久化保存',
          type: 'success',
          duration: 3000,
        });
      } catch {
        ElNotification({ title: '导入失败', message: '配置格式错误，请检查后重试', type: 'error', duration: 2000 });
      }
    })
    .catch(() => undefined);
};

// ---- Save ----
const handleSave = async () => {
  if (!loginInterceptor()) return;
  if (!userStore.user.phone || !userStore.user.email) {
    ElMessage({ message: '请填写手机号或邮箱', type: 'error', duration: 2000 });
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
      ElMessage({ message: '账户信息保存成功', type: 'success', duration: 2000 });
    });
};
</script>

<style scoped>
.account-page {
  width: 100%;
}
.acc-section {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.acc-section__title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
}
.acc-section__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.acc-resume-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.acc-label {
  font-size: 13px;
  color: #606266;
}
.acc-action-row {
  flex-direction: row;
  flex-wrap: wrap;
}
:deep(.el-form-item) {
  margin-bottom: 12px;
}
:deep(.el-form-item__label) {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
</style>
