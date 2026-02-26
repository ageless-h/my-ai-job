// -*- coding: utf-8 -*-
import { PlatformError } from "@/errors";
import { userRemoteLoad } from "@/services/auth";
import { BossPlatform } from "@/services/boss-platform";
import { bindPlatformRuntime } from "@/services/push-engine";
import { pushResultCount } from "@/stores/push-result";
import { UserStore } from "@/stores/user";

const platformList = [BossPlatform];

export class PlatformFactory {
  static getInstance(url: string): BossPlatform {
    for (const PlatformClass of platformList) {
      const platformInstance = new PlatformClass(url);
      if (platformInstance.urlList.some((platformUrl) => url.includes(platformUrl))) {
        const pushResultCounter = pushResultCount();
        const userStore = UserStore();
        userStore.platformType = platformInstance.getPlatformType();
        bindPlatformRuntime(pushResultCounter, userStore);
        userRemoteLoad();
        return platformInstance;
      }
    }

    throw new PlatformError(2, "错误的平台");
  }
}
