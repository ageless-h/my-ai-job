import { LogRecorder } from '@/core/engine/push-engine';
import { createBridgeSync } from './bridge-sync';

let instance: ReturnType<typeof createBridgeSync> | undefined;
export function getBridgeSync() {
  return (instance ??= createBridgeSync(new LogRecorder()));
}
