import { describe, expect, it, vi } from 'vitest';
vi.stubGlobal('window', {});
const { listAttachments, parseDeliveryResume, sameDeliveryText } = await import('./delivery-resume');

const bytes = (text: string) => new TextEncoder().encode(text).buffer;

describe('actual delivery resume imports', () => {
  it('lists only real attachments and preserves selection ids', () => {
    expect(listAttachments({code: 0, zpData: {resumeText: 'online', attachmentList: [{resumeId: 'one', fileName: 'actual.pdf'}, {fileName: 'broken.pdf'}]}})).toEqual([{resumeId: 'one', name: 'actual.pdf'}]);
    expect(() => listAttachments({code: 0, zpData: {resumeText: 'online'}})).toThrow();
  });
  it('uses showName and suffixName from the BOSS sidebar response', () => {
    const attachmentList = [{ resumeId: 'a', showName: '作品简历', suffixName: 'pdf' }, { resumeId: 'b', showName: '备用.PDF', suffixName: '.pdf' }];
    expect(listAttachments({code: 0, zpData: {attachmentList}}).map(item => item.name)).toEqual(['作品简历.pdf', '备用.PDF']);
  });
  it('reuses unchanged content across sources but detects substantive edits', () => {
    expect(sameDeliveryText('工作\n项目：视频', '工作  项目：视频')).toBe(true);
    expect(sameDeliveryText('导演', '美术')).toBe(false);
  });
  it('keeps multiline UTF-8 text with its name and source', async () => {
    const text = '分镜设计\n完成三集成片';
    await expect(parseDeliveryResume('本人.txt', 'local', bytes(text))).resolves.toEqual({name: '本人.txt', source: 'local', text});
  });
  it('parses attachment PDFs by signature and rejects empty scanned pages', async () => {
    vi.stubGlobal('pdfjsLib', { GlobalWorkerOptions: {}, getDocument: () => ({promise: Promise.resolve({numPages: 1, getPage: async () => ({getTextContent: async () => ({items: []})})})}) });
    try {
      await expect(parseDeliveryResume('我的附件', 'boss', bytes('%PDF-test'))).rejects.toThrow('未能提取正文');
    } finally {vi.unstubAllGlobals();}
  });
  it('rejects HTML, unsupported formats and blank files', async () => {
    await expect(parseDeliveryResume('wrong.pdf', 'boss', bytes('<html>private</html>'))).rejects.toThrow();
    await expect(parseDeliveryResume('broken.txt', 'local', bytes('    '))).rejects.toThrow();
    await expect(parseDeliveryResume('cv.doc', 'local', bytes('binary'))).rejects.toThrow();
  });
});
