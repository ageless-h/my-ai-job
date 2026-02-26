<script setup lang="ts">
// @ts-nocheck
import * as Vue from "vue";
import * as ElementPlus from "element-plus";
import * as Icons from "@element-plus/icons-vue";
import axios from "axios";
import { request, ElMessage, isProdEnv } from "@/services/request";
import { Tools } from "@/utils/tools";
import { UserStore } from "@/stores/user";
import { LoginStore } from "@/stores/login";
import { pushResultCount } from "@/stores/push-result";
import { ProductStore } from "@/stores/product";
import { LogRecorder, PushStatus } from "@/services/push-engine";
import { loginInterceptor, silentlyLogin, fetchWithGM_request } from "@/services/auth";
import { AiPower } from "@/services/ai-power";
import { Message } from "@/protocol/message";
import AiJob from "./AiJob.vue";
import Preference from "./Preference.vue";
import RunRecord from "./RunRecord.vue";
import AiConfig from "./AiConfig.vue";

const VueAny = Vue as any;
const ElementAny = ElementPlus as any;
const IconsAny = Icons as any;

const {
  defineComponent, computed, watch, provide, reactive, toRefs,
  openBlock, createElementBlock, normalizeClass, unref, renderSlot,
  inject, ref, onMounted, onBeforeUnmount, onUpdated, createVNode,
  Fragment, useSlots, withCtx, createBlock, resolveDynamicComponent,
  normalizeStyle, createTextVNode, toDisplayString, createCommentVNode,
  createElementVNode, TransitionGroup, useAttrs, nextTick, mergeProps,
  withModifiers, Transition, toHandlers, withKeys, withDirectives,
  vShow, getCurrentInstance, h, watchEffect, toRef, renderList,
  shallowRef, createSlots, toRaw, resolveComponent, resolveDirective,
  vModelText, onUnmounted, isRef
} = VueAny;

const pushScopeId = VueAny.pushScopeId || (() => undefined);
const popScopeId = VueAny.popScopeId || (() => undefined);

const {
  ElMenu, ElMenuItem, ElText, ElIcon, ElButton, ElTableColumn,
  ElTag, ElTable, ElInput, ElLink, ElImage, ElDialog, ElInputNumber,
  ElSwitch, ElTooltip, ElEmpty, ElForm, ElFormItem, ElCheckbox,
  ElOption, ElSelect, ElUpload, ElRow, ElCol, ElTimePicker,
  ElPagination, ElCollapse, ElCollapseItem, ElMessageBox,
  ElNotification, vLoading
} = ElementAny;

const {
  CircleCloseFilled, Upload, Promotion, Collection, Service,
  Shop, Wallet, PriceTag
} = IconsAny;

const STORAGE_KEY = "ai-job-panel-collapsed";
const WIDTH_STORAGE_KEY = "ai-job-panel-width";

// Optimized SVG Icons
const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/></svg>';
const SVG_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const SVG_MINIMIZE = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';

// Tab Icons
const SVG_TAB_AI = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
const SVG_TAB_PREF = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
const SVG_TAB_RECORD = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
const SVG_TAB_CONFIG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "Panel",
  setup(__props) {
    const showComponent = shallowRef(AiJob);
    const activeMenuKey = ref("1");
    const collapsed = ref(false);
    const panelWidth = ref(480);
    const isResizing = ref(false);

    onMounted(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "true") collapsed.value = true;
        const savedWidth = localStorage.getItem(WIDTH_STORAGE_KEY);
        if (savedWidth) {
          const w = parseInt(savedWidth);
          if (w >= 380 && w <= 800) panelWidth.value = w;
        }
      } catch (_e) {}
    });

    const toggleCollapse = () => {
      collapsed.value = !collapsed.value;
      try { localStorage.setItem(STORAGE_KEY, String(collapsed.value)); } catch (_e) {}
    };

    const componentMap = /* @__PURE__ */ new Map();
    componentMap.set("1", { component: AiJob, name: "AI 助手", icon: SVG_TAB_AI });
    componentMap.set("2", { component: Preference, name: "偏好设置", icon: SVG_TAB_PREF });
    componentMap.set("3", { component: RunRecord, name: "运行记录", icon: SVG_TAB_RECORD });
    componentMap.set("4", { component: AiConfig, name: "AI 配置", icon: SVG_TAB_CONFIG });

    const cleanupPreference = () => {
      nextTick(() => {
        // Clean label text: remove nbsp
        document.querySelectorAll('.form-preference .el-form-item__label, .ai-config .el-form-item__label').forEach((label: Element) => {
          const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
          let node: Text | null;
          while ((node = walker.nextNode() as Text | null)) {
            const cleaned = node.textContent!.replace(/[\u00a0]/g, ' ').replace(/^\s+/, '').replace(/\s+$/, '');
            if (cleaned !== node.textContent) node.textContent = cleaned;
          }
        });
      });
    };

    const handleSelect = (key: string) => {
      activeMenuKey.value = key;
      const item = componentMap.get(key);
      if (item) showComponent.value = item.component;
      cleanupPreference();
    };

    const startResize = (e: MouseEvent) => {
      e.preventDefault();
      isResizing.value = true;
      const startX = e.clientX;
      const startWidth = panelWidth.value;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        let newWidth = startWidth + delta;
        if (newWidth < 380) newWidth = 380;
        if (newWidth > 800) newWidth = 800;
        panelWidth.value = newWidth;
      };

      const onMouseUp = () => {
        isResizing.value = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        try { localStorage.setItem(WIDTH_STORAGE_KEY, String(panelWidth.value)); } catch (_e) {}
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    };

    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", { class: "ai-job-root" }, [
        // FAB Button
        createElementVNode("div", {
          class: normalizeClass(["ai-fab", { "ai-fab--close": !collapsed.value }]),
          onClick: toggleCollapse,
          title: collapsed.value ? "展开 AI 助手面板" : "收起面板",
          innerHTML: collapsed.value ? SVG_OPEN : SVG_CLOSE
        }, null, 10 /* CLASS, PROPS */, ["title", "innerHTML"]),

        // Sidebar (CSS class controls visibility, no vShow/Transition)
        createElementVNode("div", {
          class: normalizeClass(["ai-sidebar", {
            "is-resizing": isResizing.value,
            "is-collapsed": collapsed.value
          }]),
          style: normalizeStyle({ width: panelWidth.value + 'px' })
        }, [
          // Resize Handle
          createElementVNode("div", {
            class: "ai-resize-handle",
            onMousedown: startResize
          }),
          // Header
          createElementVNode("div", { class: "ai-sidebar-header" }, [
            createElementVNode("div", { class: "ai-sidebar-title" }, "AI 工作猎手"),
            createElementVNode("div", {
              class: "ai-sidebar-minimize",
              onClick: toggleCollapse,
              title: "收起面板",
              innerHTML: SVG_MINIMIZE
            })
          ]),
          // Nav Tabs (plain HTML, no ElMenu)
          createElementVNode("div", { class: "ai-sidebar-nav" },
            renderList(Array.from(componentMap.entries()), ([key, value]) => {
              return createElementVNode("div", {
                class: normalizeClass(["ai-nav-tab", { "is-active": activeMenuKey.value === key }]),
                onClick: () => handleSelect(key),
                innerHTML: value.icon + '<span>' + value.name + '</span>'
              }, null, 10 /* CLASS, PROPS */, ["innerHTML"]);
            })
          ),
          // Body
          createElementVNode("div", { class: "ai-sidebar-body" }, [
            (openBlock(), createBlock(resolveDynamicComponent(showComponent.value)))
          ])
        ], 6 /* CLASS, STYLE */)
      ]);
    };
  }
});

const RenderComponent = _sfc_main$1;
</script>

<template>
  <RenderComponent />
</template>

<style scoped>
.ai-job-root {
  --ai-primary: #409eff;
  --ai-primary-light: rgba(64, 158, 255, 0.1);
  --ai-text-main: #303133;
  --ai-text-sub: #909399;
  --ai-bg: rgba(255, 255, 255, 0.96);
  --ai-border: #f0f2f5;
  --ai-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  --ai-radius: 12px;
  --ai-radius-lg: 24px;
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
  z-index: 99998;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.5);
  border-top-left-radius: var(--ai-radius-lg);
  border-bottom-left-radius: var(--ai-radius-lg);
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1), width 0.3s ease;
  will-change: transform, width;
  transform: translateX(0);
}

:deep(.ai-sidebar.is-collapsed) {
  transform: translateX(100%);
  pointer-events: none;
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
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid var(--ai-border);
  flex-shrink: 0;
  background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

:deep(.ai-sidebar-title) {
  font-size: 19px;
  font-weight: 800;
  color: var(--ai-text-main);
  letter-spacing: -0.02em;
  background: linear-gradient(120deg, var(--ai-primary), #67c23a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

:deep(.ai-sidebar-minimize) {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 10px;
  color: var(--ai-text-sub);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.ai-sidebar-minimize:hover) {
  background: #fff1f0;
  color: #ff4d4f;
  transform: rotate(90deg);
}

/* Navigation Tabs */
:deep(.ai-sidebar-nav) {
  display: flex;
  height: 48px;
  border-bottom: 1px solid var(--ai-border);
  flex-shrink: 0;
  background: transparent;
}

:deep(.ai-nav-tab) {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  height: 48px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ai-text-sub);
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
  user-select: none;
  gap: 6px;
}

:deep(.ai-nav-tab span) {
  position: relative;
  z-index: 1;
}

:deep(.ai-nav-tab:hover) {
  background-color: var(--ai-primary-light);
  color: var(--ai-primary);
}

:deep(.ai-nav-tab.is-active) {
  font-weight: 700;
  color: var(--ai-primary);
}

:deep(.ai-nav-tab::after) {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 3px;
  background: var(--ai-primary);
  border-radius: 3px 3px 0 0;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

:deep(.ai-nav-tab.is-active::after) {
  width: 40%;
}

:deep(.ai-nav-tab svg) {
  flex-shrink: 0;
}

/* Content Body */
:deep(.ai-sidebar-body) {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
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

/* ===== Layout: AI助手 Tab (flat elements, no wrapper) ===== */

/* Body as flex-wrap container for flat content */
:deep(.ai-sidebar-body) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

/* Form/div containers take full width (偏好设置/运行记录/AI配置) */
:deep(.ai-sidebar-body > form),
:deep(.ai-sidebar-body > div),
:deep(.ai-sidebar-body > .ai-config) {
  width: 100%;
  flex-shrink: 0;
}

/* Hide br tags */
:deep(.ai-sidebar-body > br) {
  display: none;
}

/* ===== Stats Row: 投递成功/失败 as inline cards ===== */
:deep(.ai-sidebar-body > .el-text) {
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  background: #f8fafc;
  border-radius: var(--ai-radius);
  border: 1px solid var(--ai-border);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  margin: 0;
}

:deep(.ai-sidebar-body > .el-text.el-text--primary) {
  background: rgba(64, 158, 255, 0.06);
  border-color: rgba(64, 158, 255, 0.15);
  color: var(--ai-primary);
}

:deep(.ai-sidebar-body > .el-text.el-text--danger) {
  background: rgba(245, 108, 108, 0.06);
  border-color: rgba(245, 108, 108, 0.15);
  color: #f56c6c;
}

/* 清理投递记录 button - same row as stats */
:deep(.ai-sidebar-body > .el-button--info.el-button--small) {
  margin: 0 !important;
  height: 32px;
}

/* ===== Control Row: 单次处理限制 + input-number on SAME row ===== */
/* Label "单次处理限制数量" — inline, NOT full width */
:deep(.ai-sidebar-body > .el-text.el-text--large:not(.el-text--primary):not(.el-text--danger)) {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-radius: var(--ai-radius);
  border: 1px solid var(--ai-border);
  font-size: 14px;
  font-weight: 500;
  color: var(--ai-text-main);
  margin-top: 4px;
  white-space: nowrap;
}

/* Input number — shares row with label, fills remaining space */
:deep(.ai-sidebar-body > .el-input-number) {
  margin: 0;
  flex: 1;
  min-width: 100px;
}

/* 按条件收藏 span with switch — own row */
:deep(.ai-sidebar-body > span:not(.el-text)) {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ai-text-main);
  margin: 0 !important;
  width: 100%;
  padding: 6px 0;
}

/* ===== Action Buttons Row ===== */
/* Full-width separator before action buttons */
:deep(.ai-sidebar-body > .el-button--primary.el-tooltip__trigger:first-of-type) {
  margin-top: 6px;
}

:deep(.ai-sidebar-body > .el-button) {
  margin: 0 !important;
  height: 36px;
  font-size: 14px;
}

/* Button内的p标签 */
:deep(.el-button p) {
  margin: 0;
  font-size: 14px !important;
  line-height: 1;
}

/* Link */
:deep(.ai-sidebar-body > .el-link) {
  width: 100%;
  justify-content: flex-start;
  margin: 0 !important;
  font-size: 13px;
}

/* ===== Sub-component Styles (Element Plus) ===== */
:deep(.el-button) {
  border-radius: var(--ai-radius);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-weight: 500;
}

:deep(.el-button--primary) {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

:deep(.el-button--primary:hover) {
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.3);
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

/* ===== 偏好设置 Tab: Form layout ===== */
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
/* ===== 偏好设置 Tab: Top-label layout ===== */

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

/* ===== 偏好设置: 投递间隔/翻页间隔排版 ===== */
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


/* ===== 偏好设置: 图片简历按钮UI统一 ===== */
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

/* ===== 运行记录 Tab ===== */
/* Filter bar: vertical stack */
:deep(.filter-bar.el-row) {
  flex-direction: column !important;
  flex-wrap: nowrap !important;
  gap: 10px;
  margin: 0 !important;
}
:deep(.filter-bar .el-col) {
  max-width: 100% !important;
  flex: none !important;
  width: 100% !important;
  padding: 0 !important;
}
/* Filter bar button full width */
:deep(.filter-bar .el-button) {
  width: 100%;
}
/* Time range picker */
:deep(.filter-bar .el-date-editor) {
  width: 100% !important;
}
/* Table: full width, auto layout */
:deep(.el-table) {
  width: 100% !important;
  border-radius: var(--ai-radius);
  overflow: hidden;
  border: 1px solid var(--ai-border);
  margin-top: 12px;
}
:deep(.el-table__header),
:deep(.el-table__body) {
  width: 100% !important;
  table-layout: auto !important;
}
:deep(.el-table th.el-table__cell) {
  background-color: #f8fafc;
  color: var(--ai-text-main);
  font-weight: 600;
  font-size: 13px;
  padding: 8px 6px;
}
:deep(.el-table td.el-table__cell) {
  font-size: 12px;
  padding: 6px;
  word-break: break-all;
}
/* Pagination */
:deep(.el-pagination) {
  justify-content: center;
  margin-top: 12px;
  flex-wrap: wrap;
}

/* ===== AI配置 Tab: Collapse ===== */
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
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  background: var(--ai-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4);
  z-index: 99999;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  user-select: none;
  color: #fff;
  animation: ai-pulse 2s ease-out 3;
}

@keyframes ai-pulse {
  0% { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(64, 158, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(64, 158, 255, 0); }
}

:deep(.ai-fab:hover) {
  transform: scale(1.1) rotate(15deg);
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.5);
  animation: none;
}

:deep(.ai-fab--close) {
  bottom: 30px;
  right: 20px;
  width: 44px;
  height: 44px;
  background: #303133;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: none;
}

:deep(.ai-fab--close:hover) {
  background: #000;
  transform: scale(1.1) rotate(-90deg);
}

/* Tooltip Label */
:deep(.ai-fab::after) {
  content: attr(title);
  position: absolute;
  right: 70px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 6px 12px;
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
  width: 26px;
  height: 26px;
  stroke: currentColor;
}

/* Responsive adaptation */
@media (max-width: 1200px) {
  :deep(.ai-sidebar) {
    max-width: 380px !important;
  }
}

@media (max-width: 900px) {
  :deep(.ai-sidebar) {
    width: 100% !important;
    border-radius: 0;
  }
  :deep(.ai-fab) {
    right: 50%;
    transform: translateX(50%);
    bottom: 20px;
  }
  :deep(.ai-fab:hover) {
    transform: translateX(50%) scale(1.1);
  }
}
</style>

