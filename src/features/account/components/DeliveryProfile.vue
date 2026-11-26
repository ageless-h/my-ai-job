<template>
  <section class="profile">
    <h3>AI 投递资料</h3>
    <p class="hint">作品优先、拓展机会、广泛尝试使用当前投递简历全文和能力与项目。原版比对按配置读取在线简历匹配卡。启用 AI 投递时，所选模式的资料会发送给配置的模型服务。</p>
    <p v-if="savedResume"><strong>{{ savedResume.name }}</strong> · {{ savedResume.source === 'boss' ? 'BOSS 附件' : '本地文件' }} · {{ savedResume.text.length }} 字</p>
    <div class="actions">
      <el-button v-if="ready && !consented" :disabled="busy" @click="authorizeExisting">确认 AI 投递资料授权</el-button>
      <el-button @click="loadAttachments" :disabled="!ready || busy">从 BOSS 附件导入</el-button>
      <el-button @click="fileInput?.click()" :disabled="!ready || busy">选择本地文件</el-button>
      <el-button v-if="savedResume" @click="preview = { ...savedResume }" :disabled="busy">查看或校正正文</el-button>
      <input ref="fileInput" hidden type="file" accept=".pdf,.txt" @change="selectFile" />
    </div>
    <p class="hint">支持文本 PDF、UTF-8 TXT，最大 20 MB。</p>
    <div v-if="attachments.length" class="actions">
      <el-select v-model="selectedId" aria-label="选择 BOSS 附件简历" placeholder="选择附件">
        <el-option v-for="a in attachments" :key="a.resumeId" :value="a.resumeId" :label="a.name" />
      </el-select>
      <el-button :disabled="busy || !selectedId" @click="downloadSelected">读取所选附件</el-button>
    </div>
    <template v-if="preview">
      <h4>核对导入正文 · {{ preview.name }}</h4>
      <p v-if="savedResume" class="hint">{{ sameDeliveryText(savedResume.text, preview.text) ? '正文与当前版本相同，可直接复用。' : `正文与当前版本「${savedResume.name}」不同，请确认保留或替换。` }}</p>
      <el-input v-model="preview.text" type="textarea" :rows="8" aria-label="待确认的简历正文" />
      <div class="actions">
        <el-button type="primary" :disabled="busy || !preview.text.trim()" @click="confirmResume">{{ savedResume ? (sameDeliveryText(savedResume.text, preview.text) ? '复用当前简历' : '确认替换当前简历') : '确认使用这份简历' }}</el-button>
        <el-button :disabled="busy" @click="preview = null">{{ savedResume ? '保留当前简历' : '取消导入' }}</el-button>
      </div>
    </template>
    <h4>我的能力与项目</h4>
    <el-input v-model="projects" type="textarea" :rows="4" :disabled="!savedResume || !ready" placeholder="写下你具体负责的工作、用过的工具和交付成果" aria-label="我的能力与项目" />
    <div class="actions"><el-button :disabled="!savedResume || !ready || busy || projects.trim() === savedProjects" @click="saveProjects">保存能力与项目</el-button></div>
    <p role="status">{{ status }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import axios from 'axios';
import { hasResumeStorageConsent, requestResumeStorageConsent } from '@/shared/utils/sensitive-data-consent';
import { UserStore } from '@/state/user';
import { Tools } from '@/shared/utils/tools';
import { SecureLocalDB } from '@/core/storage';
import { fetchWithGM_request } from '@/shared/utils/fetch';
import { listAttachments, maxResumeBytes, parseDeliveryResume, sameDeliveryText, type BossAttachment, type DeliveryResume } from '../delivery-resume';

const store = UserStore();
const owner = computed(() => String(store.user.id || ''));
const ready = computed(() => Boolean(owner.value) && store.preferenceLoadStatus === 'success');
const savedResume = computed(() => store.user.preference.deliveryResume as DeliveryResume | undefined);
const savedProjects = computed(() => String(store.user.preference.deliveryProjects || ''));
const fileInput = ref<HTMLInputElement>();
const attachments = ref<BossAttachment[]>([]);
const selectedId = ref('');
const projects = ref('');
const preview = ref<DeliveryResume | null>(null);
const status = ref('');
const busy = ref(false);
const consented = ref(false);
let generation = 0;
watch([owner, ready], () => {
  generation++;
  preview.value = null;
  attachments.value = [];
  selectedId.value = '';
  projects.value = savedProjects.value;
  consented.value = ready.value && hasResumeStorageConsent(owner.value);
  status.value = '';
  busy.value = false;
}, { immediate: true, flush: 'sync' });
watch(savedProjects, next => { projects.value = next; });
onBeforeUnmount(() => { generation++; });

// A completed download can belong to a previous account or a closed panel.
async function run(task: (current: () => boolean, id: string) => Promise<void>) {
  if (busy.value || !ready.value) return;
  const serial = ++generation;
  const id = owner.value;
  const current = () => serial === generation && owner.value === id && ready.value;
  busy.value = true;
  status.value = '';
  try { await task(current, id); }
  catch (error) { if (current()) status.value = error instanceof Error ? error.message : '操作失败，请重试'; }
  finally { if (current()) busy.value = false; }
}
async function loadAttachments() {
  await run(async current => {
    const { data } = await axios.get('https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json', {headers: {Zp_token: Tools.getCookieValue('bst')}, timeout: 20000});
    if (!current()) return;
    attachments.value = listAttachments(data);
    selectedId.value = attachments.value[0]?.resumeId || '';
    if (!selectedId.value) status.value = '当前账号没有可读取的附件简历，可以从本地导入';
  });
}
async function downloadSelected() {
  const item = attachments.value.find(a => a.resumeId === selectedId.value);
  if (!item) return;
  await run(async current => {
    const url = new URL('https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek');
    url.searchParams.set('resumeId', item.resumeId);
    const token = Tools.getCookieValue('bst');
    if (!token) throw new Error('请登录 BOSS 后重新读取附件');
    const { response } = await fetchWithGM_request<ArrayBuffer>(url.toString(), {headers: {Zp_token: token}, responseType: 'arraybuffer'});
    if (!current()) return;
    const parsed = await parseDeliveryResume(item.name, 'boss', response);
    if (current()) preview.value = parsed;
  });
}
async function selectFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  await run(async current => {
    if (file.size > maxResumeBytes) throw new Error('文件超过 20 MB');
    const parsed = await parseDeliveryResume(file.name, 'local', await file.arrayBuffer());
    if (current()) preview.value = parsed;
  });
}
async function ensureConsent(current: () => boolean, id: string) {
  const granted = await requestResumeStorageConsent(id);
  if (!current()) return false;
  consented.value = granted;
  if (!granted) status.value = '已取消授权，当前资料未更改';
  return granted;
}
async function authorizeExisting() {
  await run(async (current, id) => {
    if (await ensureConsent(current, id)) status.value = '已确认本账号的 AI 投递资料授权';
  });
}
async function saveFields(fields: {deliveryResume?: DeliveryResume; deliveryProjects?: string}, message: string) {
  await run(async (current, id) => {
    if (!await ensureConsent(current, id) || !current()) return;
    await SecureLocalDB.savePreferences(id, {...store.user.preference, ...fields});
    if (!current()) return;
    Object.assign(store.user.preference, fields);
    if (fields.deliveryResume) preview.value = null;
    status.value = message;
  });
}
function confirmResume() {
  const draft = preview.value;
  if (!draft?.text.trim()) return;
  if (savedResume.value && sameDeliveryText(savedResume.value.text, draft.text)) {
    preview.value = null;
    status.value = '正文与当前版本相同，已复用当前简历';
    return;
  }
  return saveFields({deliveryResume: {...draft, text: draft.text.trim()}}, '投递简历已保存');
}
function saveProjects() { return saveFields({deliveryProjects: projects.value.trim()}, '能力与项目已保存'); }
</script>

<style scoped>
.profile { padding: var(--spacing-2xl); border: 1px solid var(--boss-border-color); border-radius: var(--radius-card); margin: 16px 0; background: var(--boss-bg-white); }
.profile h3 { margin: 0; font-size: var(--text-xl); }
.profile h4 { margin: 16px 0 8px; }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.actions :deep(.el-button) { margin-left: 0; }
.actions :deep(.el-select) { min-width: 220px; }
.hint, [role=status] { color: var(--boss-text-secondary); font-size: 13px; margin: 8px 0; }
</style>
