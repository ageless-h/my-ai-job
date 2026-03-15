// -*- coding: utf-8 -*-
import { AbsPlatform } from '@/core/engine/push-engine';
import { MOCK_JOB_LIST, MOCK_CONFIG } from './mock-data';

export class MockPlatform extends AbsPlatform {
  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 必须实现的抽象方法（来自 AbsPlatform）
  getJobList(): any[] {
    console.log('[MockPlatform] getJobList: 返回', MOCK_JOB_LIST.length, '条职位');
    return MOCK_JOB_LIST;
  }

  hasNext(): boolean {
    console.log('[MockPlatform] hasNext: false (开发模式不需要分页)');
    return false; // 开发模式不需要分页
  }

  async acquireDataPre(): Promise<void> {
    await this.delay(MOCK_CONFIG.networkDelay);
    console.log('[MockPlatform] acquireDataPre: 数据预加载完成');
  }

  startPreHandler(): void {
    console.log('[MockPlatform] startPreHandler: 开始前置处理');
  }

  async matchJob(jobDetail: any): Promise<boolean> {
    await this.delay(200);
    console.log('[MockPlatform] matchJob:', jobDetail.id, jobDetail.jobName);
    return true; // 开发模式默认匹配所有职位
  }

  async pushAfterHandler(pushResult: any, jobDetail: any): Promise<any> {
    console.log('[MockPlatform] pushAfterHandler:', jobDetail.id, pushResult);
    return pushResult;
  }

  pushPreHandler(jobDetail: any): any {
    console.log('[MockPlatform] pushPreHandler:', jobDetail.id);
    return jobDetail;
  }

  getJobKey(jobDetail: any): string {
    return jobDetail.id || jobDetail.encryptJobId || '';
  }

  async doPush(jobDetail: any): Promise<any> {
    await this.delay(MOCK_CONFIG.networkDelay);

    // 模拟错误场景
    if (MOCK_CONFIG.simulateError && Math.random() < MOCK_CONFIG.errorRate) {
      console.error('[MockPlatform] doPush: 模拟投递失败', jobDetail.id);
      throw new Error('模拟投递失败');
    }

    console.log('[MockPlatform] doPush: 投递成功', jobDetail.id, jobDetail.jobName);
    return { success: true, message: '投递成功' };
  }

  // 其他平台特定方法（如果需要）
  async doCollect(jobDetail: any): Promise<any> {
    await this.delay(200);

    // 模拟错误场景
    if (MOCK_CONFIG.simulateError && Math.random() < MOCK_CONFIG.errorRate) {
      console.error('[MockPlatform] doCollect: 模拟收藏失败', jobDetail.id);
      throw new Error('模拟收藏失败');
    }

    console.log('[MockPlatform] doCollect: 收藏成功', jobDetail.id, jobDetail.jobName);
    return { success: true };
  }
}
