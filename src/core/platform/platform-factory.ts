// -*- coding: utf-8 -*-
import { PlatformError } from '@/shared/errors';
import { userRemoteLoad } from '@/core/auth/auth';
import { BossPlatform } from '@/core/platform/boss-platform';
import { bindPlatformRuntime } from '@/core/engine/push-engine';
import type { PlatformRuntimeDeps } from '@/core/runtime/runtime-contracts';

const platformList = [BossPlatform];

export class PlatformFactory {
  constructor(private readonly runtimeDeps?: PlatformRuntimeDeps) {}

  static getInstance(url: string, runtimeDeps?: PlatformRuntimeDeps): BossPlatform {
    return new PlatformFactory(runtimeDeps).resolve(url);
  }

  resolve(url: string): BossPlatform {
    for (const PlatformClass of platformList) {
      const platformInstance = new PlatformClass(url);
      if (platformInstance.urlList.some((platformUrl) => url.includes(platformUrl))) {
        if (this.runtimeDeps) {
          this.runtimeDeps.userStore.platformType = platformInstance.getPlatformType();
          bindPlatformRuntime(this.runtimeDeps.counter, this.runtimeDeps.userStore);
        }
        userRemoteLoad();
        return platformInstance;
      }
    }

    throw new PlatformError(2, '错误的平台');
  }
}
