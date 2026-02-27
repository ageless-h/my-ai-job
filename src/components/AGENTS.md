# COMPONENTS KNOWLEDGE BASE

## OVERVIEW

7 个 Vue 组件，全部使用 compiled render functions（非标准 SFC template）。Panel 为主容器，其余为 tab 页或弹窗。

## COMPONENT MAP

| Component | Lines | Role | Complexity |
|-----------|-------|------|------------|
| Panel.vue | 966 | 主容器：侧边栏 + tab 导航 + KeepAlive | High |
| AiConfig.vue | 1667 | AI 配置：多 Key 管理 + 提示词预设 + 记忆策略 + 调试 | Very High |
| Preference.vue | 1142 | 用户偏好：30+ 表单字段，岗位过滤条件 | Very High |
| AiJob.vue | 966 | 核心业务：投递/收藏/暂停，实时日志 | High |
| Product.vue | 543 | 产品购买弹窗：订单 + 支付轮询 | Medium |
| RunRecord.vue | 340 | 运行日志：可过滤分页表格 | Medium |
| BossMessage.vue | 339 | 批量消息：注入页面 DOM，非组件树内 | Low |

## DEPENDENCY GRAPH

```
App.vue → Panel.vue (shallowRef 动态切换)
              ├─ AiJob.vue      (tab: AI助手)
              ├─ Preference.vue (tab: 偏好设置)
              ├─ RunRecord.vue  (tab: 运行日志)
              ├─ AiConfig.vue   (tab: AI配置)
              └─ Product.vue    (modal 弹窗)

BossMessage.vue → 独立注入页面 DOM
```

## RENDER FUNCTION PATTERN

所有组件遵循相同模式：
```javascript
// 1. 顶部解构 Vue API
const { createVNode, createElementVNode, withCtx, ... } = VueAny;
const { ElButton, ElForm, ... } = ElementAny;

// 2. defineComponent + setup 返回 render function
const _sfc_main = defineComponent({
  setup(__props) {
    // refs, computed, functions...
    return (_ctx, _cache) => {
      // render function body
      return openBlock(), createElementBlock("div", ...);
    };
  }
});
```

## COMMUNICATION

- 组件间无 props 传递（各 tab 独立）
- 共享状态通过 Pinia stores（UserStore, LoginStore, pushResultCount）
- `$axios`、`$platform` 通过 provide/inject 注入
- Panel 通过 `shallowRef` + `resolveDynamicComponent` 切换子组件

## CSS PATTERN

- Panel.vue 定义全局 CSS 变量（`--ai-primary`, `--ai-bg`, `--ai-border` 等）
- 所有组件使用 `<style scoped>` + `:deep()` 穿透 Element Plus
- 滑动面板模式：`*-view-wrapper` + `*-view-panels` + `is-edit` class + `transform: translateX(-50%)`
- 卡片模式：`*-card` + `*-card__meta` + `*-card__actions`

## EDITING RULES

- 修改 render function 时保持 `_cache[N]` 索引不变
- 新增 ref/computed/function 放在相关功能区域附近
- CSS 新增样式追加到 `<style scoped>` 末尾，使用 `:deep()` 前缀
- 构建验证：`npm run build`（工作目录 `ai-job-hunting/`）
