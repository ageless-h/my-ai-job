// -*- coding: utf-8 -*-
import { usePushResultStore } from "@/state/push-result";
import { useUserStore } from "@/state/user";
import type { PlatformRuntimeDeps } from "@/core/runtime/runtime-contracts";

export function createStoreRuntimeAdapter(): PlatformRuntimeDeps {
  const counter = usePushResultStore();
  const userStore = useUserStore();
  return {
    counter,
    userStore
  };
}
