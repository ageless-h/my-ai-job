<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, onUpdated, ref, shallowRef, watch } from "vue";
import AiConfig from "@/features/ai-config/components/AiConfig.vue";
import Account from "@/features/account/components/Account.vue";
import AiDeliveryJudge from "@/features/ai-delivery-judge/components/AiDeliveryJudge.vue";
import AiJob from "@/features/job-assistant/components/AiJob.vue";
import MemorySession from "@/features/memory-session/components/MemorySession.vue";
import Preference from "@/features/preference/components/Preference.vue";
import RunRecord from "@/features/run-record/components/RunRecord.vue";

const STORAGE_KEY = "ai-job-panel-collapsed";
const WIDTH_STORAGE_KEY = "ai-job-panel-width";

const Z_INDEX_SIDEBAR_EXPANDED = 99999;
const Z_INDEX_SIDEBAR_COLLAPSED = 99997;
const Z_INDEX_FAB_EXPANDED = 99998;
const Z_INDEX_FAB_COLLAPSED = 100000;

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/></svg>';
const SVG_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const SVG_MINIMIZE = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

const FAB_SIZE = 46;
const FAB_SAFE_GAP = 14;
const FAB_BASE_DESKTOP = { right: 24, bottom: 108 };
const FAB_BASE_MOBILE = { right: 16, bottom: 88 };
const FAB_ANCHOR_RIGHT_SHIFT_PX = 15;
const FAB_ANCHOR_TOP_OFFSET_PX = 70;
const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 800;

const FAB_COLLISION_SELECTORS = [
  ".zp-side-entry-jobs",
  ".zp-side-entry-question",
  ".side-entry.side-entry-jobs",
  ".side-entry.side-entry-question",
  ".c-job-tools.job-tools",
  ".vip-guide.sider-box",
  ".job-tools-banners",
  ".banner-item.template-banner"
] as const;

const FAB_ANCHOR_SELECTORS = [
  ".zp-side-entry-jobs",
  ".zp-side-entry-question",
  ".side-entry.side-entry-jobs",
  ".side-entry.side-entry-question"
] as const;

const tabs = [
  {
    key: "1",
    name: "工作台",
    component: AiJob,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>'
  },
  {
    key: "2",
    name: "AI 配置",
    component: AiConfig,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>'
  },
  {
    key: "3",
    name: "投递判定",
    component: AiDeliveryJudge,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>'
  },
  {
    key: "4",
    name: "传统投递",
    component: Preference,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>'
  },
  {
    key: "5",
    name: "对话通知",
    component: MemorySession,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'
  },
  {
    key: "6",
    name: "运行记录",
    component: RunRecord,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>'
  },
  {
    key: "7",
    name: "账户",
    component: Account,
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
  },
  
] as const;

type Position = { right: number; bottom: number };

const showComponent = shallowRef(AiJob);
const activeMenuKey = ref("1");
const collapsed = ref(false);
const panelWidth = ref(480);
const isResizing = ref(false);
const isTransitioning = ref(false);
const fabDynamicStyle = ref({
  right: `${FAB_BASE_DESKTOP.right}px`,
  bottom: `${FAB_BASE_DESKTOP.bottom}px`
});
const sidebarZIndex = ref(Z_INDEX_SIDEBAR_COLLAPSED);
const fabZIndex = ref(Z_INDEX_FAB_COLLAPSED);

let fabRepositionRaf = 0;
let fabDebounceTimer = 0;
let mouseMoveHandler: ((e: MouseEvent) => void) | null = null;
let mouseUpHandler: (() => void) | null = null;
let visibilityChangeHandler: (() => void) | null = null;

function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 忽略受限环境下的 localStorage 写入异常
  }
}

function getFabBasePosition(): Position {
  if (window.innerWidth <= 900) {
    return { ...FAB_BASE_MOBILE };
  }
  return { ...FAB_BASE_DESKTOP };
}

function hasIntersection(a: DOMRect | ReturnType<typeof getFabRect>, b: DOMRect, gap = 0): boolean {
  return !(
    a.right < b.left - gap ||
    b.right < a.left - gap ||
    a.bottom < b.top - gap ||
    b.bottom < a.top - gap
  );
}

function getFabRect(position: Position): { left: number; top: number; right: number; bottom: number } {
  const left = window.innerWidth - position.right - FAB_SIZE;
  const top = window.innerHeight - position.bottom - FAB_SIZE;
  return {
    left,
    top,
    right: left + FAB_SIZE,
    bottom: top + FAB_SIZE
  };
}

function clampFabPosition(position: Position): Position {
  const minInset = 12;
  const maxRight = Math.max(minInset, window.innerWidth - FAB_SIZE - minInset);
  const maxBottom = Math.max(minInset, window.innerHeight - FAB_SIZE - minInset);
  return {
    right: Math.max(minInset, Math.min(position.right, maxRight)),
    bottom: Math.max(minInset, Math.min(position.bottom, maxBottom))
  };
}

function getRectsBySelectors(selectors: readonly string[]): DOMRect[] {
  return selectors
    .flatMap((selector) => Array.from(document.querySelectorAll(selector)))
    .map((element) => element.getBoundingClientRect())
    .filter(
      (rect) =>
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < window.innerHeight &&
        rect.left < window.innerWidth
    );
}

function resolveFabCollisionPosition(): Position {
  const base = getFabBasePosition();
  const collisionRects = getRectsBySelectors(FAB_COLLISION_SELECTORS);
  if (!collisionRects.length) {
    return clampFabPosition(base);
  }

  const sideEntryRect = getRectsBySelectors(FAB_ANCHOR_SELECTORS)
    .slice()
    .sort((a, b) => b.top + b.height / 2 - (a.top + a.height / 2))[0];

  if (sideEntryRect) {
    const right =
      window.innerWidth -
      sideEntryRect.right +
      Math.max(0, (sideEntryRect.width - FAB_SIZE) / 2) -
      FAB_ANCHOR_RIGHT_SHIFT_PX;
    const bottom = window.innerHeight - sideEntryRect.top + FAB_ANCHOR_TOP_OFFSET_PX;
    return clampFabPosition({ right, bottom });
  }

  let raisedBottom = base.bottom;
  let rounds = 0;
  while (rounds < 6) {
    rounds += 1;
    const currentRect = getFabRect({ right: base.right, bottom: raisedBottom });
    let nextBottom = raisedBottom;
    collisionRects.forEach((rect) => {
      if (!hasIntersection(currentRect, rect, FAB_SAFE_GAP)) {
        return;
      }
      nextBottom = Math.max(nextBottom, window.innerHeight - rect.top + FAB_SAFE_GAP);
    });
    if (nextBottom === raisedBottom) {
      break;
    }
    raisedBottom = nextBottom;
  }

  const candidates = [
    { right: base.right, bottom: raisedBottom },
    { right: base.right + 220, bottom: raisedBottom }
  ].map(clampFabPosition);

  const best = candidates.find((position) => {
    const fabRect = getFabRect(position);
    return !collisionRects.some((rect) => hasIntersection(fabRect, rect, FAB_SAFE_GAP));
  });

  return best || clampFabPosition({ right: base.right + 220, bottom: raisedBottom });
}

function applyFabPosition(): void {
  const resolved = resolveFabCollisionPosition();
  fabDynamicStyle.value = {
    right: `${Math.round(resolved.right)}px`,
    bottom: `${Math.round(resolved.bottom)}px`
  };
}

function scheduleFabPosition(): void {
  // 清除之前的防抖定时器
  if (fabDebounceTimer) {
    clearTimeout(fabDebounceTimer);
    fabDebounceTimer = 0;
  }
  
  // 清除之前的RAF
  if (fabRepositionRaf) {
    cancelAnimationFrame(fabRepositionRaf);
    fabRepositionRaf = 0;
  }
  
  // 使用防抖：100ms内的连续调用只执行最后一次
  fabDebounceTimer = window.setTimeout(() => {
    fabDebounceTimer = 0;
    fabRepositionRaf = requestAnimationFrame(() => {
      fabRepositionRaf = 0;
      applyFabPosition();
    });
  }, 100);
}



function cleanupPreference(): void {
  nextTick(() => {
    document
      .querySelectorAll(".form-preference .el-form-item__label, .ai-config .el-form-item__label")
      .forEach((label) => {
        const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode() as Text | null;
        while (node) {
          const currentText = node.textContent ?? "";
          const cleanedText = currentText.replace(/[\u00a0]/g, " ").trim();
          if (cleanedText !== currentText) {
            node.textContent = cleanedText;
          }
          node = walker.nextNode() as Text | null;
        }
      });
  });
}

function toggleCollapse(): void {
  isTransitioning.value = true;
  collapsed.value = !collapsed.value;
  
  // 更新z-index：展开时侧边栏在上，收起时FAB在上
  if (collapsed.value) {
    sidebarZIndex.value = Z_INDEX_SIDEBAR_COLLAPSED;
    fabZIndex.value = Z_INDEX_FAB_COLLAPSED;
  } else {
    sidebarZIndex.value = Z_INDEX_SIDEBAR_EXPANDED;
    fabZIndex.value = Z_INDEX_FAB_EXPANDED;
  }
  
  safeSetItem(STORAGE_KEY, String(collapsed.value));
  nextTick(() => {
    scheduleFabPosition();
  });
}

function handleSelect(key: string): void {
  activeMenuKey.value = key;
  const tab = tabs.find((item) => item.key === key);
  if (tab) {
    showComponent.value = tab.component;
  }
  cleanupPreference();
}

function startResize(event: MouseEvent): void {
  event.preventDefault();
  isResizing.value = true;
  const startX = event.clientX;
  const startWidth = panelWidth.value;

  mouseMoveHandler = (moveEvent: MouseEvent) => {
    const delta = startX - moveEvent.clientX;
    panelWidth.value = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startWidth + delta));
  };

  mouseUpHandler = () => {
    isResizing.value = false;
    if (mouseMoveHandler) {
      document.removeEventListener("mousemove", mouseMoveHandler);
      mouseMoveHandler = null;
    }
    if (mouseUpHandler) {
      document.removeEventListener("mouseup", mouseUpHandler);
      mouseUpHandler = null;
    }
    if (visibilityChangeHandler) {
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
      visibilityChangeHandler = null;
    }
    safeSetItem(WIDTH_STORAGE_KEY, String(panelWidth.value));
  };

  visibilityChangeHandler = () => {
    if (document.hidden && isResizing.value) {
      mouseUpHandler?.();
    }
  };

  document.addEventListener("mousemove", mouseMoveHandler);
  document.addEventListener("mouseup", mouseUpHandler);
  document.addEventListener("visibilitychange", visibilityChangeHandler);
}

onMounted(() => {
  const savedCollapsed = safeGetItem(STORAGE_KEY);
  if (savedCollapsed === "true") {
    collapsed.value = true;
    sidebarZIndex.value = Z_INDEX_SIDEBAR_COLLAPSED;
    fabZIndex.value = Z_INDEX_FAB_COLLAPSED;
  } else {
    sidebarZIndex.value = Z_INDEX_SIDEBAR_EXPANDED;
    fabZIndex.value = Z_INDEX_FAB_EXPANDED;
  }

  const savedWidth = safeGetItem(WIDTH_STORAGE_KEY);
  if (savedWidth) {
    const width = Number.parseInt(savedWidth, 10);
    if (Number.isFinite(width) && width >= MIN_PANEL_WIDTH && width <= MAX_PANEL_WIDTH) {
      panelWidth.value = width;
    }
  }

  nextTick(() => {
    applyFabPosition();
    // 使用IntersectionObserver监听动态内容变化
    const observer = new IntersectionObserver(() => {
      scheduleFabPosition();
    }, { threshold: [0, 0.5, 1] });
    
    FAB_COLLISION_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        observer.observe(el);
      });
    });
  });

  window.addEventListener("resize", scheduleFabPosition);
  window.addEventListener("scroll", scheduleFabPosition, true);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", scheduleFabPosition);
  window.removeEventListener("scroll", scheduleFabPosition, true);
  
  // 清理resize事件监听器
  if (mouseMoveHandler) {
    document.removeEventListener("mousemove", mouseMoveHandler);
    mouseMoveHandler = null;
  }
  if (mouseUpHandler) {
    document.removeEventListener("mouseup", mouseUpHandler);
    mouseUpHandler = null;
  }
  if (visibilityChangeHandler) {
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
    visibilityChangeHandler = null;
  }
  
  // 清理FAB定位相关的定时器和RAF
  if (fabDebounceTimer) {
    clearTimeout(fabDebounceTimer);
    fabDebounceTimer = 0;
  }
  if (fabRepositionRaf) {
    cancelAnimationFrame(fabRepositionRaf);
    fabRepositionRaf = 0;
  }
});

watch([collapsed, panelWidth], () => {
  scheduleFabPosition();
});

onUpdated(() => {
  scheduleFabPosition();
});
</script>

<template>
  <div class="ai-job-root">
    <div
      class="ai-fab"
      :class="{ 'ai-fab--close': !collapsed }"
      :style="{ ...fabDynamicStyle, zIndex: fabZIndex, pointerEvents: isTransitioning ? 'none' : 'auto' }"
      :title="collapsed ? '展开 AI 助手面板' : '收起面板'"
      @click="toggleCollapse"
      data-testid="fab-button"
    >
      <div style="pointer-events: none; display: flex; align-items: center; justify-content: center;" v-html="collapsed ? SVG_OPEN : SVG_CLOSE" />
    </div>

    <div
      class="ai-sidebar"
      :class="{ 'is-resizing': isResizing, 'is-collapsed': collapsed }"
      :style="{ width: `${panelWidth}px`, zIndex: sidebarZIndex, pointerEvents: isTransitioning || collapsed ? 'none' : 'auto' }"
      @transitionend="isTransitioning = false"
      data-testid="panel-container"
    >
      <div class="ai-resize-handle" @mousedown="startResize" data-testid="panel-resize-handle" />

      <div class="ai-sidebar-header">
        <div class="ai-sidebar-title">AI 工作猎手</div>
        <div class="ai-sidebar-minimize" title="收起面板" @click="toggleCollapse" data-testid="panel-minimize">
          <div style="pointer-events: none; display: flex; align-items: center; justify-content: center;" v-html="SVG_MINIMIZE" />
        </div>
      </div>

      <div class="ai-sidebar-nav ai-sidebar-nav-vertical">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="ai-nav-tab"
          :class="{ 'is-active': activeMenuKey === tab.key }"
          @click="handleSelect(tab.key)"
          :data-testid="`tab-${tab.name}`"
        >
          <div style="pointer-events: none;" v-html="tab.icon" />
          <span style="pointer-events: none;">{{ tab.name }}</span>
        </div>
      </div>

      <div class="ai-sidebar-body boss-panel-body">
        <KeepAlive>
          <component :is="showComponent" />
        </KeepAlive>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-job-root {
  --ai-primary: var(--boss-primary, #00bebd);
  --ai-primary-light: var(--boss-primary-light, rgba(0, 190, 189, 0.12));
  --ai-primary-hover: var(--boss-primary-hover, #00a8a7);
  --ai-header-height: 54px;
  --ai-nav-width: 96px;
  --ai-text-main: #303133;
  --ai-text-sub: #909399;
  --ai-text-muted: #c0c4cc;
  --ai-bg: rgba(255, 255, 255, 0.96);
  --ai-bg-subtle: #f5f7fa;
  --ai-border: #f0f2f5;
  --ai-border-light: #f5f7fa;
  --ai-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  --ai-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --ai-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --ai-radius: 12px;
  --ai-radius-sm: 6px;
  --ai-radius-lg: 24px;
  --ai-success: #67c23a;
  --ai-warning: #e6a23c;
  --ai-danger: #f56c6c;
}

/* Drawer Sidebar */
:deep(.ai-sidebar) {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: var(--ai-bg);
  backdrop-filter: blur(16px);
  box-shadow: var(--ai-shadow);
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.5);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1), width 0.3s ease;
  will-change: transform, width;
  transform: translateX(0);
}

:deep(.ai-sidebar.is-collapsed) {
  transform: translateX(100%);
}

:deep(.ai-sidebar.is-resizing) {
  transition: none;
}

/* Resize Handle */
:deep(.ai-resize-handle) {
  position: absolute;
  left: 0;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  z-index: 10;
  transition: background 0.2s;
}

:deep(.ai-resize-handle:hover),
:deep(.ai-sidebar.is-resizing .ai-resize-handle) {
  background: var(--ai-primary);
}

:deep(.ai-resize-handle:hover::after) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-shadow: 0 0 15px var(--ai-primary);
}

/* Header */
:deep(.ai-sidebar-header) {
  height: var(--ai-header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--ai-border);
  flex-shrink: 0;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

:deep(.ai-sidebar-title) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ai-text-main);
  white-space: nowrap;
}

:deep(.ai-sidebar-title::before) {
  content: "";
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 4px;
  background: url("https://z.zhipin.com/web/v2/favicon.ico") center / cover no-repeat;
}

:deep(.ai-sidebar-minimize) {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  color: var(--ai-text-sub);
  transition: all 0.2s;
}

:deep(.ai-sidebar-minimize:hover) {
  background: var(--ai-bg-subtle);
  color: var(--ai-text-main);
}

/* Navigation Tabs */
:deep(.ai-sidebar-nav) {
  position: absolute;
  top: var(--ai-header-height);
  bottom: 0;
  left: 0;
  width: var(--ai-nav-width);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  border-right: 1px solid var(--ai-border);
  background: var(--boss-bg-color, #f8f8f8);
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 8px;
}

:deep(.ai-nav-tab) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 64px;
  min-width: 0;
  max-width: none;
  height: 64px;
  flex-direction: column;
  font-size: 14px;
  font-weight: 500;
  color: var(--ai-text-sub);
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
  user-select: none;
  gap: 6px;
  overflow: hidden;
  padding: 8px 6px;
  text-align: center;
  border-left: 3px solid transparent;
}

:deep(.ai-nav-tab span) {
  display: block;
  position: relative;
  z-index: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  font-size: 12px;
}

:deep(.ai-nav-tab.is-active) {
  flex: 0 0 64px;
  max-width: none;
  gap: 6px;
  background: #ffffff;
  border-left-color: var(--ai-primary);
}

:deep(.ai-nav-tab.is-active span) {
  display: block;
}

:deep(.ai-nav-tab:hover) {
  background-color: #f0f2f5;
  color: var(--ai-text-main);
}

:deep(.ai-nav-tab.is-active) {
  font-weight: 700;
  color: var(--ai-primary);
}

:deep(.ai-nav-tab::after) {
  display: none;
}

:deep(.ai-nav-tab.is-active::after) {
  width: 0;
}

:deep(.ai-nav-tab svg) {
  flex-shrink: 0;
  margin-right: 0;
  margin-bottom: 2px;
}

/* Content Body */
:deep(.ai-sidebar-body) {
  position: absolute;
  top: var(--ai-header-height);
  left: var(--ai-nav-width);
  right: 0;
  bottom: 0;
  width: auto;
  overflow: hidden;
  padding: 0;
  animation: ai-fade-in 0.4s ease-out;
}

@keyframes ai-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar */
:deep(.ai-sidebar-body::-webkit-scrollbar) {
  width: 6px;
}
:deep(.ai-sidebar-body::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
  transition: background 0.3s;
}
:deep(.ai-sidebar-body:hover::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.12);
}
:deep(.ai-sidebar-body::-webkit-scrollbar-thumb:hover) {
  background: var(--ai-primary);
}
:deep(.ai-sidebar-body::-webkit-scrollbar-track) {
  background: transparent;
}

/* Button内的p标签 */
:deep(.ai-sidebar .el-button p) {
  margin: 0;
  font-size: 14px;
  line-height: 1;
}

/* ===== Sub-component Styles (Element Plus) ===== */
:deep(.el-button) {
  border-radius: var(--ai-radius);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

:deep(.el-button--primary:not(.is-plain):not(.is-link):not(.is-text)) {
  box-shadow: 0 4px 12px rgba(0, 190, 189, 0.2);
}

:deep(.el-button--primary:not(.is-plain):not(.is-link):not(.is-text):hover) {
  box-shadow: 0 6px 16px rgba(0, 190, 189, 0.3);
  transform: translateY(-1px);
}

:deep(.el-input .el-input__wrapper) {
  border-radius: var(--ai-radius);
  transition: all 0.3s;
}

:deep(.el-input .el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--ai-primary) inset, 0 0 0 3px var(--ai-primary-light) !important;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: var(--ai-primary);
}

/* ===== 传统投递 Tab: Form layout ===== */
/* Section titles */
:deep(.form-preference .top-title) {
  display: block !important;
  width: 100%;
  font-size: 15px;
  font-weight: 700;
  color: var(--ai-primary);
  padding: 10px 0 6px;
  margin-top: 12px;
  border-bottom: 2px solid var(--ai-primary-light);
  margin-bottom: 4px;
}
:deep(.form-preference .top-title:first-child) {
  margin-top: 0;
}
/* ===== 传统投递 Tab: Top-label layout ===== */

/* --- Core: all flex pair containers wrap --- */
:deep(.form-preference > div > div[style*="display: flex"]) {
  flex-wrap: wrap !important;
  gap: 0 !important;
}

/* --- Core: form-items → top-label mode, kill ALL inline margin hacks --- */
:deep(.form-preference .el-form-item) {
  flex-direction: column !important;
  align-items: flex-start !important;
  width: 100% !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  margin-bottom: 12px;
}
:deep(.form-preference .el-form-item__label-wrap) {
  margin-left: 0 !important;
  width: 100% !important;
  max-height: none;
}
:deep(.form-preference .el-form-item__label) {
  width: auto !important;
  text-align: left !important;
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-main);
  padding: 0 0 4px 0 !important;
  justify-content: flex-start !important;
  height: auto !important;
  line-height: 1.6;
}
:deep(.form-preference .el-form-item__content) {
  width: 100% !important;
  margin-left: 0 !important;
}

/* --- Form items in flex containers: full width for vertical stacking --- */
:deep(.form-preference > div > div[style*="display: flex"] > .el-form-item) {
  flex: 0 0 100% !important;
}


/* --- DEFAULT: checkboxes in flex containers → full width (vertical) --- */
/* This covers items 14 (高意向) and 17 (邮件通知) */
:deep(.form-preference > div > div[style*="display: flex"] > label.el-checkbox) {
  width: 100% !important;
  flex: 0 0 100% !important;
}

/* --- OVERRIDE: item 10 (margin-bottom container) — wrap layout, each logical group on own row --- */
:deep(.form-preference > div > div[style*="margin-bottom"]) {
  flex-wrap: wrap !important;
  flex-direction: row !important;
  align-items: center !important;
  gap: 6px 8px !important;
}
/* Each checkbox: full width = own row */
:deep(.form-preference > div > div[style*="margin-bottom"] > label.el-checkbox) {
  width: 100% !important;
  flex: 0 0 100% !important;
}

/* --- 高意向 area: clean up negative margin hacks --- */
:deep(.form-preference > div > div[style*="display: flex"] > span[style*="margin-top"]) {
  margin-top: -4px !important;
  width: 100%;
  font-weight: 600;
  font-size: 13px;
  color: var(--ai-primary);
}

/* Selects: fill width — only direct children of form-item content */
:deep(.form-preference .el-form-item__content > .el-select) {
  width: 100% !important;
}
/* Input: fill width */
:deep(.form-preference .el-form-item__content > .el-input) {
  width: 100%;
}
/* Checkbox: tighter margin */
:deep(.form-preference .el-checkbox) {
  margin-right: 4px;
}
/* Tags in select: smaller */
:deep(.form-preference .el-tag) {
  max-width: 120px !important;
}
/* Time pickers */
:deep(.form-preference .el-time-picker) {
  width: 100% !important;
}
:deep(.form-preference .el-date-editor) {
  width: 100% !important;
}
/* Save/reset buttons: kill Element Plus default margin-left between buttons */
:deep(.form-preference .el-button + .el-button) {
  margin-left: 0 !important;
}
:deep(.form-preference .el-form-item__content) {
  gap: 8px;
}

/* ===== 传统投递: 投递间隔/翻页间隔排版 ===== */
/* 间隔组元素保持 inline，与前面的 checkbox 分开 */
:deep(.form-preference > div > div[style*="margin-bottom"] > p.time-interval) {
  font-size: 13px;
  font-weight: 500;
  color: var(--ai-text-main);
  margin: 0;
  line-height: 34px;
  white-space: nowrap;
}
:deep(.form-preference > div > div[style*="margin-bottom"] > .el-input-number) {
  flex: 0 0 auto;
}


/* ===== 传统投递: 图片简历按钮 UI 统一 ===== */
:deep(.form-preference .form-item-upload .el-upload .el-button) {
  border-radius: var(--ai-radius) !important;
  height: 36px !important;
  font-size: 14px !important;
  font-weight: 500;
  padding: 0 16px !important;
}
/* 已上传 tag 统一风格 */
:deep(.form-preference .form-item-upload .el-tag) {
  border-radius: 8px;
  height: 28px;
  line-height: 28px;
  padding: 0 10px;
  font-size: 12px;
  margin-left: 8px !important;
}

/* ===== AI 配置 Tab: Collapse ===== */
:deep(.ai-config) {
  width: 100%;
}
:deep(.el-collapse) {
  border: none;
}
:deep(.el-collapse-item__header) {
  padding: 0 14px;
  height: 44px;
  line-height: 44px;
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: var(--ai-radius);
  margin-bottom: 8px;
  border: 1px solid var(--ai-border);
  font-size: 14px;
  font-weight: 600;
  color: var(--ai-text-main);
  transition: all 0.3s;
}
:deep(.el-collapse-item__header.is-active) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  margin-bottom: 0;
  background: linear-gradient(135deg, #eef2ff, #e8f0fe);
  color: var(--ai-primary);
}
:deep(.el-collapse-item__wrap) {
  border: 1px solid var(--ai-border);
  border-top: none;
  border-bottom-left-radius: var(--ai-radius);
  border-bottom-right-radius: var(--ai-radius);
  padding: 16px;
  margin-bottom: 12px;
}
/* AI config form: top-aligned labels for narrow sidebar */
:deep(.ai-config .el-form-item) {
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 16px;
}
:deep(.ai-config .el-form-item__label) {
  width: auto !important;
  font-size: 13px;
  font-weight: 600;
  color: var(--ai-text-main);
  padding-bottom: 6px;
  text-align: left;
}
:deep(.ai-config .el-form-item__content) {
  width: 100%;
  margin-left: 0 !important;
}
/* Textarea full width */
:deep(.ai-config .el-textarea) {
  width: 100%;
}
:deep(.ai-config .el-textarea__inner) {
  min-height: 100px !important;
  font-size: 13px;
  line-height: 1.6;
}
/* Select in AI config */
:deep(.ai-config .el-select) {
  width: 100% !important;
  max-width: 100% !important;
}
/* Button group: wrap properly */
:deep(.ai-config .el-form-item__content > div[style]) {
  width: 100% !important;
}
:deep(.ai-config .el-form-item__content .el-button) {
  margin-bottom: 6px;
}
/* Input number in AI config */
:deep(.ai-config .el-input-number) {
  width: 100%;
}
/* Memory strategy row: wrap switch + select + number cleanly */
:deep(.ai-config .el-form-item__content > div[style*="flex"]) {
  flex-wrap: wrap !important;
  gap: 8px !important;
  width: 100%;
}
:deep(.ai-config .el-form-item__content > div[style*="flex"] > .el-select) {
  flex: 1;
  min-width: 120px;
}
:deep(.ai-config .el-form-item__content > div[style*="flex"] > .el-input-number) {
  flex: 0 0 auto;
}

/* FAB Button Styles */
:deep(.ai-fab) {
  position: fixed;
  bottom: 108px;
  right: 24px;
  width: 46px;
  height: 46px;
  background: #ffffff;
  border: none;
  border-radius: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: none;
  transition: all 0.22s ease;
  user-select: none;
  color: var(--ai-primary);
}

:deep(.ai-fab:hover) {
  transform: translateY(-1px) scale(1.02);
  background-color: #f5fffe;
  box-shadow: none;
}

:deep(.ai-fab--close) {
  bottom: 108px;
  right: 24px;
  width: 46px;
  height: 46px;
  background: #ffffff;
  border: none;
  border-radius: 100%;
  box-shadow: none;
}

:deep(.ai-fab--close:hover) {
  background: #f5fffe;
  transform: translateY(-1px) scale(1.02);
}

/* Tooltip Label */
:deep(.ai-fab::after) {
  content: attr(title);
  position: absolute;
  right: 64px;
  background: rgba(17, 24, 39, 0.92);
  color: white;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s;
  transform: translateX(10px);
}

:deep(.ai-fab:hover::after) {
  opacity: 1;
  transform: translateX(0);
}

:deep(.ai-fab svg) {
  width: 22px;
  height: 22px;
  stroke: currentColor;
}

/* Responsive adaptation */
@media (max-width: 1200px) {
  :deep(.ai-sidebar) {
    max-width: min(480px, 90vw) !important;
  }
}

@media (max-width: 900px) {
  :deep(.ai-sidebar) {
    width: min(100%, 90vw) !important;
    border-radius: 0;
  }
  .ai-job-root {
    --ai-nav-width: 82px;
  }
  :deep(.ai-nav-tab) {
    height: 58px;
    flex-basis: 58px;
    padding: 6px 4px;
  }
  :deep(.ai-fab) {
    right: 16px;
    bottom: 120px;
  }
  :deep(.ai-fab:hover) {
    transform: translateY(-1px);
  }
}

@media (max-width: 768px) {
  :deep(.ai-sidebar) {
    width: 100% !important;
    max-width: 100% !important;
  }
  :deep(.ai-fab) {
    right: 12px;
    bottom: 140px;
  }
}

@media (orientation: landscape) and (max-height: 600px) {
  :deep(.ai-sidebar) {
    height: 100vh;
    overflow-y: auto;
  }
  :deep(.ai-sidebar-body) {
    max-height: calc(100vh - var(--ai-header-height) - 20px);
    overflow-y: auto;
  }
}
</style>

