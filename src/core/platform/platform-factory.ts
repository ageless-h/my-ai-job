// -*- coding: utf-8 -*-
import { PlatformError } from "@/shared/errors";
import { userRemoteLoad } from "@/core/auth/auth";
import { BossPlatform } from "@/core/platform/boss-platform";
import { bindPlatformRuntime } from "@/core/engine/push-engine";
import { usePushResultStore } from "@/state/push-result";
import { useUserStore } from "@/state/user";

const platformList = [BossPlatform];

export class PlatformFactory {
  static getInstance(url: string): BossPlatform {
    for (const PlatformClass of platformList) {
      const platformInstance = new PlatformClass(url);
      if (platformInstance.urlList.some((platformUrl) => url.includes(platformUrl))) {
        const pushResultCounter = usePushResultStore();
        const runtimeUserStore = useUserStore();
        runtimeUserStore.platformType = platformInstance.getPlatformType();
        bindPlatformRuntime(pushResultCounter, runtimeUserStore);
        userRemoteLoad();
        return platformInstance;
      }
    }

    throw new PlatformError(2, "错误的平台");
  }
}
