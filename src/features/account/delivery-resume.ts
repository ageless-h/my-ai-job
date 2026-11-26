import { extractPdfText } from '@/core/ai/resume-parser';

export type DeliveryResume = { name: string; source: 'local' | 'boss'; text: string };
export type BossAttachment = { resumeId: string; name: string };
export function sameDeliveryText(left: string, right: string): boolean {
  const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();
  return normalize(left) === normalize(right);
}

export const maxResumeBytes = 20 * 1024 * 1024;

export function listAttachments(payload: unknown): BossAttachment[] {
  const response = payload as { code?: number; zpData?: { attachmentList?: unknown[] } } | null;
  if (response?.code !== 0 || !Array.isArray(response.zpData?.attachmentList)) {
    throw new Error('无法读取 BOSS 附件列表，请确认账号已登录');
  }
  return response.zpData.attachmentList.flatMap(item => {
    const row = item as { resumeId?: unknown; fileName?: unknown; showName?: unknown; suffixName?: unknown } | null;
    if (!row || !['number', 'string'].includes(typeof row.resumeId) || !String(row.resumeId).trim()) return [];
    const base = [row.showName, row.fileName].find((v): v is string => typeof v === 'string' && !!v.trim())?.trim() || '简历附件';
    const suffix = typeof row.suffixName === 'string' ? row.suffixName.trim().replace(/^\./, '') : '';
    const name = /^\w{1,8}$/.test(suffix) && !base.toLowerCase().endsWith(`.${suffix.toLowerCase()}`) ? `${base}.${suffix}` : base;
    return [{ resumeId: String(row.resumeId), name }];
  });
}

export async function parseDeliveryResume(name: string, source: DeliveryResume['source'], bytes: ArrayBuffer): Promise<DeliveryResume> {
  if (!bytes.byteLength || bytes.byteLength > maxResumeBytes) throw new Error('请选择非空且小于 20 MB 的文件');
  const prefix = new TextDecoder('latin1').decode(bytes.slice(0, 1024));
  let text: string;
  if (prefix.includes('%PDF-')) {
    text = await extractPdfText(bytes);
  } else if (/\.txt$/i.test(name) && !prefix.includes('\0') && !/^\s*(?:<html|<!doctype html)/i.test(prefix)) {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } else {
    throw new Error('请使用可复制文字的 PDF 或 UTF-8 TXT 文件');
  }
  if (!text.trim()) throw new Error('未能提取正文，请将扫描件转换为文本 PDF 或 TXT 后重试');
  return { name, source, text: text.trim() };
}
