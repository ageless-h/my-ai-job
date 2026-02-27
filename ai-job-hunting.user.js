// ==UserScript==
// @name         AI工作猎手-让ai帮您找工作！
// @namespace    https://github.com/yangfeng20
// @version      0.0.23-beta
// @author       maple.
// @description  找工作，用AI工作猎手！让AI帮您找工作！ai坐席：【DeepSeek+ChatGpt】赋能，ai助理作为您的求职者分身24小时 * 7在线找工作，并结合您的简历信息定制化回复。批量投递，自动发送简历，交换联系方式。hr拒绝挽留。高意向邮件通知，让您不错过每一份工作机会。BOSS直聘
// @license      Apache License 2.0
// @icon         https://gitee.com/yangfeng20/ai-job/raw/master/file/icon.png
// @match        https://www.zhipin.com/web/geek/*
// @match        https://www.zhipin.com/overseas/*
// @require      https://cdn.jsdelivr.net/npm/vue@3.4.21/dist/vue.global.prod.js
// @require      https://unpkg.com/vue-demi@latest/lib/index.iife.js
// @require      data:application/javascript,window.Vue%3DVue%3B
// @require      https://cdn.jsdelivr.net/npm/pinia@2.1.7/dist/pinia.iife.prod.js
// @require      https://cdn.jsdelivr.net/npm/element-plus@2.7.0/dist/index.full.min.js
// @require      https://cdn.jsdelivr.net/npm/protobufjs@7.2.6/dist/protobuf.min.js
// @require      https://cdn.jsdelivr.net/npm/systemjs@6.15.1/dist/system.min.js
// @require      https://cdn.jsdelivr.net/npm/systemjs@6.15.1/dist/extras/named-register.min.js
// @require      data:application/javascript,%3B(typeof%20System!%3D'undefined')%26%26(System%3Dnew%20System.constructor())%3B
// @resource     element-plus/dist/index.css  https://cdn.jsdelivr.net/npm/element-plus@2.7.0/dist/index.css
// @connect      docdownload.zhipin.com
// @connect      *
// @grant        GM_addStyle
// @grant        GM_addValueChangeListener
// @grant        GM_getResourceText
// @grant        GM_getValue
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

(a=>{if(typeof GM_addStyle=="function"){GM_addStyle(a);return}const e=document.createElement("style");e.textContent=a,document.head.append(e)})(' .cleaner-wrapper[data-v-e91f45f7]{padding:0}.cleaner-toolbar[data-v-e91f45f7]{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.cleaner-result[data-v-e91f45f7]{font-size:12px;color:#67c23a}.cleaner-list[data-v-e91f45f7]{margin-top:10px;max-height:400px;overflow-y:auto}.cleaner-list-header[data-v-e91f45f7]{display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--ai-border,#ebeef5)}.cleaner-list-count[data-v-e91f45f7]{font-size:12px;color:#909399}.cleaner-card[data-v-e91f45f7]{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--ai-border,#ebeef5)}.cleaner-card__check[data-v-e91f45f7]{flex-shrink:0;margin-top:2px}.cleaner-card__info[data-v-e91f45f7]{flex:1;min-width:0}.cleaner-card__name[data-v-e91f45f7]{font-size:13px;font-weight:500;color:var(--ai-text,#303133)}.cleaner-card__detail[data-v-e91f45f7]{display:flex;align-items:center;gap:6px;margin-top:4px}.cleaner-card__reason[data-v-e91f45f7]{font-size:12px;color:#606266;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cleaner-card__meta[data-v-e91f45f7]{font-size:11px;color:#909399;margin-top:3px}.cleaner-empty[data-v-e91f45f7]{text-align:center;padding:20px;color:#909399;font-size:13px}[data-v-92c42cef] .my-header{display:flex;flex-direction:row;justify-content:space-between;gap:16px}[data-v-92c42cef] .fixed-stop-button{position:fixed;right:80px;bottom:80px;z-index:9999;background:#fffffff2;padding:8px;border-radius:8px;box-shadow:0 4px 12px #0003;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.3)}[data-v-92c42cef] .fixed-stop-button:hover{background:#fff;box-shadow:0 6px 16px #0000004d}[data-v-92c42cef] .push-records-container{margin-bottom:12px;background:#ffffffe6;border-radius:6px;border:1px solid rgba(0,0,0,.1);overflow:hidden;max-width:400px}[data-v-92c42cef] .push-records-header{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:8px 12px;font-size:14px;font-weight:500;text-align:center}[data-v-92c42cef] .push-records-content{max-height:200px;overflow-y:auto;padding:8px}[data-v-92c42cef] .push-record-item{display:flex;flex-direction:column;margin-bottom:8px;padding:6px 8px;background:#f8fafccc;border-radius:4px;border-left:3px solid #e2e8f0;font-size:12px;line-height:1.4}[data-v-92c42cef] .push-record-item:last-child{margin-bottom:0}[data-v-92c42cef] .record-time{color:#64748b;font-size:11px;margin-bottom:2px}[data-v-92c42cef] .record-message{color:#334155;word-break:break-word}[data-v-92c42cef] .record-error{color:#dc2626;border-left-color:#dc2626}[data-v-92c42cef] .record-warn{color:#d97706;border-left-color:#d97706}[data-v-92c42cef] .record-info{color:#2563eb;border-left-color:#2563eb}[data-v-92c42cef] .record-debug{color:#059669;border-left-color:#059669}[data-v-92c42cef] .record-trace{color:#7c3aed;border-left-color:#7c3aed}[data-v-92c42cef] .no-records{text-align:center;color:#94a3b8;font-size:12px;padding:20px 0}[data-v-92c42cef] .push-records-content::-webkit-scrollbar{width:4px}[data-v-92c42cef] .push-records-content::-webkit-scrollbar-track{background:#0000000d;border-radius:2px}[data-v-92c42cef] .push-records-content::-webkit-scrollbar-thumb{background:#0003;border-radius:2px}[data-v-92c42cef] .push-records-content::-webkit-scrollbar-thumb:hover{background:#0000004d}[data-v-92c42cef] .aj-section{margin-bottom:12px;padding:10px 12px;background:#fff;border-radius:6px;border:1px solid rgba(0,0,0,.08)}[data-v-92c42cef] .aj-section__title{font-size:13px;font-weight:600;color:#303133;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #ebeef5}[data-v-92c42cef] .aj-section__body{display:flex;flex-wrap:wrap;align-items:center;gap:8px}[data-v-92c42cef] .aj-stats-row .mx-1{margin-right:6px}[data-v-92c42cef] .aj-settings-row{gap:12px}[data-v-92c42cef] .aj-setting-item{display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#606266}[data-v-92c42cef] .aj-action-row{gap:8px}[data-v-92c42cef] .cleaner-section{margin-top:0;padding:10px 12px;background:#fff;border-radius:6px;border:1px solid rgba(0,0,0,.08)}[data-v-92c42cef] .cleaner-section__title{font-size:13px;font-weight:600;color:#303133;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #ebeef5}[data-v-b61b2d43] .input-opt>:first-child{width:100px}[data-v-b61b2d43] .form-item-upload>:first-child{margin-left:0}[data-v-b61b2d43] .el-input-number--small{line-height:22px;width:80px}[data-v-b61b2d43] .time-interval{margin-top:10px;margin-right:1px;margin-left:1px}[data-v-0c4932dc] .filter-bar{margin-bottom:20px}[data-v-0c4932dc] .trend-chart-wrapper{margin-bottom:16px;padding:12px;background:#fafafa;border:1px solid #eee;border-radius:6px}[data-v-0c4932dc] .trend-chart-title{font-size:13px;font-weight:600;color:#303133;margin-bottom:8px}[data-v-0c4932dc] .trend-chart-svg{width:100%;max-width:420px;height:auto}.api-view-wrapper[data-v-d31aa50b]{position:relative;overflow:hidden}.api-view-panels[data-v-d31aa50b]{display:flex;width:200%;transition:transform .28s ease}.api-view-wrapper.is-edit .api-view-panels[data-v-d31aa50b]{transform:translate(-50%)}.api-view-list[data-v-d31aa50b],.api-view-edit[data-v-d31aa50b]{width:50%;flex-shrink:0}.api-view-edit[data-v-d31aa50b]{visibility:hidden;max-height:0;overflow:hidden}.api-view-wrapper.is-edit .api-view-edit[data-v-d31aa50b]{visibility:visible;max-height:none;overflow:visible}.api-view-wrapper.is-edit .api-view-list[data-v-d31aa50b]{visibility:hidden;max-height:0;overflow:hidden}.api-config-list[data-v-d31aa50b]{padding-right:2px}.api-list-header[data-v-d31aa50b]{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.api-list-tip[data-v-d31aa50b]{font-size:12px;color:#909399}.api-config-card[data-v-d31aa50b]{border:1px solid var(--ai-border,#f0f2f5);border-radius:var(--ai-radius-sm,6px);padding:10px 12px;margin-bottom:10px;background:var(--ai-bg-subtle,#f5f7fa);box-shadow:var(--ai-shadow-sm,0 1px 2px rgba(0,0,0,.05))}.api-config-card__meta[data-v-d31aa50b]{display:flex;flex-direction:column;gap:6px}.api-config-card__line[data-v-d31aa50b]{display:flex;justify-content:space-between;gap:8px;font-size:12px}.api-config-card__label[data-v-d31aa50b]{color:#909399}.api-config-card__value[data-v-d31aa50b]{color:#303133;word-break:break-all;text-align:right}.api-config-card__actions[data-v-d31aa50b]{margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px}.api-config-card__buttons[data-v-d31aa50b]{display:flex;align-items:center;gap:8px}.api-view-edit[data-v-d31aa50b]{padding-left:4px}.api-edit-header[data-v-d31aa50b]{display:flex;align-items:center;gap:10px;margin-bottom:6px}.api-edit-title[data-v-d31aa50b]{font-size:13px;font-weight:600;color:#303133}.api-config-form[data-v-d31aa50b]{padding-right:2px}.preset-view-wrapper[data-v-865ef1d4]{position:relative;overflow:hidden}.preset-view-panels[data-v-865ef1d4]{display:flex;width:200%;transition:transform .28s ease}.preset-view-wrapper.is-edit .preset-view-panels[data-v-865ef1d4]{transform:translate(-50%)}.preset-view-list[data-v-865ef1d4],.preset-view-edit[data-v-865ef1d4]{width:50%;flex-shrink:0}.preset-view-edit[data-v-865ef1d4]{visibility:hidden;max-height:0;overflow:hidden}.preset-view-wrapper.is-edit .preset-view-edit[data-v-865ef1d4]{visibility:visible;max-height:none;overflow:visible}.preset-view-wrapper.is-edit .preset-view-list[data-v-865ef1d4]{visibility:hidden;max-height:0;overflow:hidden}.preset-list-header[data-v-865ef1d4]{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.preset-list-tip[data-v-865ef1d4]{font-size:12px;color:#909399}.preset-card[data-v-865ef1d4]{border:1px solid var(--ai-border,#f0f2f5);border-radius:var(--ai-radius-sm,6px);padding:10px 12px;margin-bottom:10px;background:var(--ai-bg-subtle,#f5f7fa);box-shadow:var(--ai-shadow-sm,0 1px 2px rgba(0,0,0,.05))}.preset-card__header[data-v-865ef1d4]{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.preset-card__name[data-v-865ef1d4]{font-size:13px;font-weight:600;color:#303133}.preset-card__content[data-v-865ef1d4]{font-size:12px;color:#606266;line-height:1.5;margin-bottom:8px;word-break:break-all}.preset-card__actions[data-v-865ef1d4]{display:flex;align-items:center;justify-content:space-between;gap:8px}.preset-card__buttons[data-v-865ef1d4]{display:flex;align-items:center;gap:8px}.preset-view-edit[data-v-865ef1d4]{padding-left:4px}.preset-edit-header[data-v-865ef1d4]{display:flex;align-items:center;gap:10px;margin-bottom:6px}.preset-edit-title[data-v-865ef1d4]{font-size:13px;font-weight:600;color:#303133}.variable-hint[data-v-865ef1d4]{margin-top:4px;padding:8px 10px;background:#fafafa;border:1px dashed #dcdfe6;border-radius:4px}.variable-hint__title[data-v-865ef1d4]{font-size:12px;color:#909399;margin-bottom:6px}.variable-hint__tags[data-v-865ef1d4]{display:flex;flex-wrap:wrap;gap:6px}.variable-tag[data-v-865ef1d4]{cursor:pointer}.variable-tag[data-v-865ef1d4]:hover{color:var(--ai-primary,#409eff);border-color:var(--ai-primary,#409eff)}[data-v-5871d477] .chat-history{max-height:420px;overflow-y:auto;padding:8px 4px;background:#fafafa;border:1px solid #eee;border-radius:6px}[data-v-5871d477] .chat-composer{display:flex;gap:10px;margin-top:10px}[data-v-5871d477] .composer-input{position:relative;width:100%}[data-v-5871d477] .composer-input .el-textarea__inner{padding-right:84px;padding-bottom:50px}[data-v-5871d477] .composer-input .el-input__count{bottom:40px;right:8px}[data-v-5871d477] .send-btn{position:absolute;right:8px;bottom:8px}[data-v-5871d477] .chat-row{display:flex;margin:8px 0}[data-v-5871d477] .chat-row.from-user{justify-content:flex-start}[data-v-5871d477] .chat-row.from-ai{justify-content:flex-end}[data-v-5871d477] .bubble{max-width:80%;padding:8px 10px;border-radius:8px;background:#fff;box-shadow:0 1px 2px #0000000f}[data-v-5871d477] .from-user .bubble{background:#f5f7fa}[data-v-5871d477] .from-ai .bubble{background:#e8f6f3}[data-v-5871d477] .bubble .content{white-space:pre-wrap;word-break:break-word;font-size:13px}[data-v-5871d477] .bubble .meta{font-size:12px;color:#909399;margin-bottom:4px}[data-v-5871d477] .bubble .tags{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap}[data-v-34555a92] .ai-config{padding:15px 1px 1px;background:#fff}[data-v-34555a92] .ai-section-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}[data-v-34555a92] .config-form{margin:0}[data-v-34555a92] .tune-form{margin-bottom:10px;padding:0 10px;font-weight:700}.ai-job-root[data-v-128e536d]{--ai-primary: #409eff;--ai-primary-light: rgba(64, 158, 255, .1);--ai-primary-hover: #337ecc;--ai-text-main: #303133;--ai-text-sub: #909399;--ai-text-muted: #c0c4cc;--ai-bg: rgba(255, 255, 255, .96);--ai-bg-subtle: #f5f7fa;--ai-border: #f0f2f5;--ai-border-light: #f5f7fa;--ai-shadow: -8px 0 32px rgba(0, 0, 0, .12);--ai-shadow-sm: 0 1px 2px rgba(0, 0, 0, .05);--ai-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, .1);--ai-radius: 12px;--ai-radius-sm: 6px;--ai-radius-lg: 24px;--ai-success: #67c23a;--ai-warning: #e6a23c;--ai-danger: #f56c6c}[data-v-128e536d] .ai-sidebar{position:fixed;top:0;right:0;height:100vh;background:var(--ai-bg);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--ai-shadow);z-index:99998;display:flex;flex-direction:column;border-left:1px solid rgba(255,255,255,.5);border-top-left-radius:var(--ai-radius-lg);border-bottom-left-radius:var(--ai-radius-lg);overflow:hidden;transition:transform .4s cubic-bezier(.19,1,.22,1),width .3s ease;will-change:transform,width;transform:translate(0)}[data-v-128e536d] .ai-sidebar.is-collapsed{transform:translate(100%);pointer-events:none}[data-v-128e536d] .ai-sidebar.is-resizing{transition:none}[data-v-128e536d] .ai-resize-handle{position:absolute;left:0;top:0;width:4px;height:100%;cursor:col-resize;background:transparent;z-index:10;transition:background .2s}[data-v-128e536d] .ai-resize-handle:hover,[data-v-128e536d] .ai-sidebar.is-resizing .ai-resize-handle{background:var(--ai-primary)}[data-v-128e536d] .ai-resize-handle:hover:after{content:"";position:absolute;top:0;left:0;width:100%;height:100%;box-shadow:0 0 15px var(--ai-primary)}[data-v-128e536d] .ai-sidebar-header{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--ai-border);flex-shrink:0;background:linear-gradient(135deg,#fff,#f9fafb);box-shadow:0 2px 8px #00000005}[data-v-128e536d] .ai-sidebar-title{font-size:19px;font-weight:800;color:var(--ai-text-main);letter-spacing:-.02em;background:linear-gradient(120deg,var(--ai-primary),#67c23a);-webkit-background-clip:text;-webkit-text-fill-color:transparent}[data-v-128e536d] .ai-sidebar-minimize{width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;border-radius:10px;color:var(--ai-text-sub);transition:all .3s cubic-bezier(.4,0,.2,1)}[data-v-128e536d] .ai-sidebar-minimize:hover{background:#fff1f0;color:#ff4d4f;transform:rotate(90deg)}[data-v-128e536d] .ai-sidebar-nav{display:flex;height:48px;border-bottom:1px solid var(--ai-border);flex-shrink:0;background:transparent}[data-v-128e536d] .ai-nav-tab{display:flex;align-items:center;justify-content:center;flex:1;height:48px;font-size:14px;font-weight:500;color:var(--ai-text-sub);cursor:pointer;position:relative;transition:all .3s;-webkit-user-select:none;user-select:none;gap:6px}[data-v-128e536d] .ai-nav-tab span{position:relative;z-index:1}[data-v-128e536d] .ai-nav-tab:hover{background-color:var(--ai-primary-light);color:var(--ai-primary)}[data-v-128e536d] .ai-nav-tab.is-active{font-weight:700;color:var(--ai-primary)}[data-v-128e536d] .ai-nav-tab:after{content:"";position:absolute;bottom:0;left:50%;width:0;height:3px;background:var(--ai-primary);border-radius:3px 3px 0 0;transition:all .3s ease;transform:translate(-50%)}[data-v-128e536d] .ai-nav-tab.is-active:after{width:40%}[data-v-128e536d] .ai-nav-tab svg{flex-shrink:0}[data-v-128e536d] .ai-sidebar-body{flex:1;overflow-y:auto;padding:24px;animation:ai-fade-in-128e536d .4s ease-out}@keyframes ai-fade-in-128e536d{0%{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}[data-v-128e536d] .ai-sidebar-body::-webkit-scrollbar{width:6px}[data-v-128e536d] .ai-sidebar-body::-webkit-scrollbar-thumb{background:#0000000d;border-radius:10px;transition:background .3s}[data-v-128e536d] .ai-sidebar-body:hover::-webkit-scrollbar-thumb{background:#0000001f}[data-v-128e536d] .ai-sidebar-body::-webkit-scrollbar-thumb:hover{background:var(--ai-primary)}[data-v-128e536d] .ai-sidebar-body::-webkit-scrollbar-track{background:transparent}[data-v-128e536d] .ai-sidebar-body{display:flex;flex-wrap:wrap;align-items:center;gap:10px}[data-v-128e536d] .ai-sidebar-body>form,[data-v-128e536d] .ai-sidebar-body>div,[data-v-128e536d] .ai-sidebar-body>.ai-config{width:100%;flex-shrink:0}[data-v-128e536d] .ai-sidebar-body>br{display:none}[data-v-128e536d] .ai-sidebar-body>.el-text{display:inline-flex;align-items:center;padding:8px 14px;background:#f8fafc;border-radius:var(--ai-radius);border:1px solid var(--ai-border);font-size:14px;font-weight:600;line-height:1.4;margin:0}[data-v-128e536d] .ai-sidebar-body>.el-text.el-text--primary{background:#409eff0f;border-color:#409eff26;color:var(--ai-primary)}[data-v-128e536d] .ai-sidebar-body>.el-text.el-text--danger{background:#f56c6c0f;border-color:#f56c6c26;color:#f56c6c}[data-v-128e536d] .ai-sidebar-body>.el-button--info.el-button--small{margin:0!important;height:32px}[data-v-128e536d] .ai-sidebar-body>.el-text.el-text--large:not(.el-text--primary):not(.el-text--danger){display:inline-flex;align-items:center;padding:8px 12px;background:#f8fafc;border-radius:var(--ai-radius);border:1px solid var(--ai-border);font-size:14px;font-weight:500;color:var(--ai-text-main);margin-top:4px;white-space:nowrap}[data-v-128e536d] .ai-sidebar-body>.el-input-number{margin:0;flex:1;min-width:100px}[data-v-128e536d] .ai-sidebar-body>span:not(.el-text){display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ai-text-main);margin:0!important;width:100%;padding:6px 0}[data-v-128e536d] .ai-sidebar-body>.el-button--primary.el-tooltip__trigger:first-of-type{margin-top:6px}[data-v-128e536d] .ai-sidebar-body>.el-button{margin:0!important;height:36px;font-size:14px}[data-v-128e536d] .el-button p{margin:0;font-size:14px!important;line-height:1}[data-v-128e536d] .ai-sidebar-body>.el-link{width:100%;justify-content:flex-start;margin:0!important;font-size:13px}[data-v-128e536d] .el-button{border-radius:var(--ai-radius);transition:all .3s cubic-bezier(.4,0,.2,1);font-weight:500}[data-v-128e536d] .el-button--primary{box-shadow:0 4px 12px #409eff33}[data-v-128e536d] .el-button--primary:hover{box-shadow:0 6px 16px #409eff4d;transform:translateY(-1px)}[data-v-128e536d] .el-input .el-input__wrapper{border-radius:var(--ai-radius);transition:all .3s}[data-v-128e536d] .el-input .el-input__wrapper.is-focus{box-shadow:0 0 0 1px var(--ai-primary) inset,0 0 0 3px var(--ai-primary-light)!important}[data-v-128e536d] .el-switch.is-checked .el-switch__core{background-color:var(--ai-primary)}[data-v-128e536d] .form-preference .top-title{display:block!important;width:100%;font-size:15px;font-weight:700;color:var(--ai-primary);padding:10px 0 6px;margin-top:12px;border-bottom:2px solid var(--ai-primary-light);margin-bottom:4px}[data-v-128e536d] .form-preference .top-title:first-child{margin-top:0}[data-v-128e536d] .form-preference>div>div[style*="display: flex"]{flex-wrap:wrap!important;gap:0!important}[data-v-128e536d] .form-preference .el-form-item{flex-direction:column!important;align-items:flex-start!important;width:100%!important;margin-left:0!important;margin-right:0!important;margin-bottom:12px}[data-v-128e536d] .form-preference .el-form-item__label-wrap{margin-left:0!important;width:100%!important;max-height:none}[data-v-128e536d] .form-preference .el-form-item__label{width:auto!important;text-align:left!important;font-size:13px;font-weight:600;color:var(--ai-text-main);padding:0 0 4px!important;justify-content:flex-start!important;height:auto!important;line-height:1.6}[data-v-128e536d] .form-preference .el-form-item__content{width:100%!important;margin-left:0!important}[data-v-128e536d] .form-preference>div>div[style*="display: flex"]>.el-form-item{flex:0 0 100%!important}[data-v-128e536d] .form-preference>div>div[style*="display: flex"]>label.el-checkbox{width:100%!important;flex:0 0 100%!important}[data-v-128e536d] .form-preference>div>div[style*=margin-bottom]{flex-wrap:wrap!important;flex-direction:row!important;align-items:center!important;gap:6px 8px!important}[data-v-128e536d] .form-preference>div>div[style*=margin-bottom]>label.el-checkbox{width:100%!important;flex:0 0 100%!important}[data-v-128e536d] .form-preference>div>div[style*="display: flex"]>span[style*=margin-top]{margin-top:-4px!important;width:100%;font-weight:600;font-size:13px;color:var(--ai-primary)}[data-v-128e536d] .form-preference .el-form-item__content>.el-select{width:100%!important}[data-v-128e536d] .form-preference .el-form-item__content>.el-input{width:100%}[data-v-128e536d] .form-preference .el-checkbox{margin-right:4px}[data-v-128e536d] .form-preference .el-tag{max-width:120px!important}[data-v-128e536d] .form-preference .el-time-picker,[data-v-128e536d] .form-preference .el-date-editor{width:100%!important}[data-v-128e536d] .form-preference .el-button+.el-button{margin-left:0!important}[data-v-128e536d] .form-preference .el-form-item__content{gap:8px}[data-v-128e536d] .form-preference>div>div[style*=margin-bottom]>p.time-interval{font-size:13px;font-weight:500;color:var(--ai-text-main);margin:0;line-height:34px;white-space:nowrap}[data-v-128e536d] .form-preference>div>div[style*=margin-bottom]>.el-input-number{flex:0 0 auto}[data-v-128e536d] .form-preference .form-item-upload .el-upload .el-button{border-radius:var(--ai-radius)!important;height:36px!important;font-size:14px!important;font-weight:500;padding:0 16px!important}[data-v-128e536d] .form-preference .form-item-upload .el-tag{border-radius:8px;height:28px;line-height:28px;padding:0 10px;font-size:12px;margin-left:8px!important}[data-v-128e536d] .filter-bar.el-row{flex-direction:column!important;flex-wrap:nowrap!important;gap:10px;margin:0!important}[data-v-128e536d] .filter-bar .el-col{max-width:100%!important;flex:none!important;width:100%!important;padding:0!important}[data-v-128e536d] .filter-bar .el-button{width:100%}[data-v-128e536d] .filter-bar .el-date-editor{width:100%!important}[data-v-128e536d] .el-table{width:100%!important;border-radius:var(--ai-radius);overflow:hidden;border:1px solid var(--ai-border);margin-top:12px}[data-v-128e536d] .el-table__header,[data-v-128e536d] .el-table__body{width:100%!important;table-layout:auto!important}[data-v-128e536d] .el-table th.el-table__cell{background-color:#f8fafc;color:var(--ai-text-main);font-weight:600;font-size:13px;padding:8px 6px}[data-v-128e536d] .el-table td.el-table__cell{font-size:12px;padding:6px;word-break:break-all}[data-v-128e536d] .el-pagination{justify-content:center;margin-top:12px;flex-wrap:wrap}[data-v-128e536d] .ai-config{width:100%}[data-v-128e536d] .el-collapse{border:none}[data-v-128e536d] .el-collapse-item__header{padding:0 14px;height:44px;line-height:44px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:var(--ai-radius);margin-bottom:8px;border:1px solid var(--ai-border);font-size:14px;font-weight:600;color:var(--ai-text-main);transition:all .3s}[data-v-128e536d] .el-collapse-item__header.is-active{border-bottom-left-radius:0;border-bottom-right-radius:0;margin-bottom:0;background:linear-gradient(135deg,#eef2ff,#e8f0fe);color:var(--ai-primary)}[data-v-128e536d] .el-collapse-item__wrap{border:1px solid var(--ai-border);border-top:none;border-bottom-left-radius:var(--ai-radius);border-bottom-right-radius:var(--ai-radius);padding:16px;margin-bottom:12px}[data-v-128e536d] .ai-config .el-form-item{flex-direction:column;align-items:flex-start;margin-bottom:16px}[data-v-128e536d] .ai-config .el-form-item__label{width:auto!important;font-size:13px;font-weight:600;color:var(--ai-text-main);padding-bottom:6px;text-align:left}[data-v-128e536d] .ai-config .el-form-item__content{width:100%;margin-left:0!important}[data-v-128e536d] .ai-config .el-textarea{width:100%}[data-v-128e536d] .ai-config .el-textarea__inner{min-height:100px!important;font-size:13px;line-height:1.6}[data-v-128e536d] .ai-config .el-select{width:100%!important;max-width:100%!important}[data-v-128e536d] .ai-config .el-form-item__content>div[style]{width:100%!important}[data-v-128e536d] .ai-config .el-form-item__content .el-button{margin-bottom:6px}[data-v-128e536d] .ai-config .el-input-number{width:100%}[data-v-128e536d] .ai-config .el-form-item__content>div[style*=flex]{flex-wrap:wrap!important;gap:8px!important;width:100%}[data-v-128e536d] .ai-config .el-form-item__content>div[style*=flex]>.el-select{flex:1;min-width:120px}[data-v-128e536d] .ai-config .el-form-item__content>div[style*=flex]>.el-input-number{flex:0 0 auto}[data-v-128e536d] .ai-fab{position:fixed;bottom:24px;right:24px;width:56px;height:56px;background:var(--ai-primary);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px #409eff66;z-index:99999;transition:all .4s cubic-bezier(.175,.885,.32,1.275);-webkit-user-select:none;user-select:none;color:#fff;animation:ai-pulse-128e536d 2s ease-out 3}@keyframes ai-pulse-128e536d{0%{box-shadow:0 0 #409effb3}70%{box-shadow:0 0 0 15px #409eff00}to{box-shadow:0 0 #409eff00}}[data-v-128e536d] .ai-fab:hover{transform:scale(1.1) rotate(15deg);box-shadow:0 12px 32px #409eff80;animation:none}[data-v-128e536d] .ai-fab--close{bottom:30px;right:20px;width:44px;height:44px;background:#303133;box-shadow:0 4px 12px #0000004d;animation:none}[data-v-128e536d] .ai-fab--close:hover{background:#000;transform:scale(1.1) rotate(-90deg)}[data-v-128e536d] .ai-fab:after{content:attr(title);position:absolute;right:70px;background:#000c;color:#fff;padding:6px 12px;border-radius:6px;font-size:12px;white-space:nowrap;opacity:0;pointer-events:none;transition:all .3s;transform:translate(10px)}[data-v-128e536d] .ai-fab:hover:after{opacity:1;transform:translate(0)}[data-v-128e536d] .ai-fab svg{width:26px;height:26px;stroke:currentColor}@media(max-width:1200px){[data-v-128e536d] .ai-sidebar{max-width:380px!important}}@media(max-width:900px){[data-v-128e536d] .ai-sidebar{width:100%!important;border-radius:0}[data-v-128e536d] .ai-fab{right:50%;transform:translate(50%);bottom:20px}[data-v-128e536d] .ai-fab:hover{transform:translate(50%) scale(1.1)}}[data-v-56b7eb89] .batch-send-btn:hover{background-color:#337ecc!important}[data-v-56b7eb89] .batch-checkbox{margin-right:8px;transform:scale(1.2)}[data-v-56b7eb89] .batch-send-item{background-color:#f0f9ff!important;border:2px solid #409eff!important}[data-v-56b7eb89] .batch-send-float{position:fixed;right:24px;bottom:24px;width:480px;padding:16px;background:#fff;box-shadow:0 6px 16px #00000026;border-radius:8px;z-index:9999} ');

System.addImportMap({ imports: {"vue":"user:vue","pinia":"user:pinia","element-plus":"user:element-plus","protobufjs":"user:protobufjs"} });
System.set("user:vue", (()=>{const _=Vue;('default' in _)||(_.default=_);return _})());
System.set("user:pinia", (()=>{const _=Pinia;('default' in _)||(_.default=_);return _})());
System.set("user:element-plus", (()=>{const _=ElementPlus;('default' in _)||(_.default=_);return _})());
System.set("user:protobufjs", (()=>{const _=protobuf;('default' in _)||(_.default=_);return _})());

System.register("./__entry.js", ['./__monkey.entry-bLmTlXtK.js'], (function (exports, module) {
	'use strict';
	return {
		setters: [null],
		execute: (function () {



		})
	};
}));

System.register("./__monkey.entry-bLmTlXtK.js", ['vue', 'pinia', 'element-plus', 'protobufjs'], (function (exports, module) {
  'use strict';
  var ref, reactive, createApp, defineComponent, openBlock, createBlock, unref, Vue, createElementBlock, createVNode, createElementVNode, computed, watch, provide, onMounted, resolveComponent, withCtx, Fragment, renderList, createTextVNode, pushScopeId, popScopeId, toDisplayString, createCommentVNode, inject, normalizeClass, withDirectives, vShow, defineStore, createPinia, ElMessage$1, ElementPlus__default, ElMessageBox, ElementPlus, protobuf;
  return {
    setters: [module => {
      ref = module.ref;
      reactive = module.reactive;
      createApp = module.createApp;
      defineComponent = module.defineComponent;
      openBlock = module.openBlock;
      createBlock = module.createBlock;
      unref = module.unref;
      Vue = module;
      createElementBlock = module.createElementBlock;
      createVNode = module.createVNode;
      createElementVNode = module.createElementVNode;
      computed = module.computed;
      watch = module.watch;
      provide = module.provide;
      onMounted = module.onMounted;
      resolveComponent = module.resolveComponent;
      withCtx = module.withCtx;
      Fragment = module.Fragment;
      renderList = module.renderList;
      createTextVNode = module.createTextVNode;
      pushScopeId = module.pushScopeId;
      popScopeId = module.popScopeId;
      toDisplayString = module.toDisplayString;
      createCommentVNode = module.createCommentVNode;
      inject = module.inject;
      normalizeClass = module.normalizeClass;
      withDirectives = module.withDirectives;
      vShow = module.vShow;
    }, module => {
      defineStore = module.defineStore;
      createPinia = module.createPinia;
    }, module => {
      ElMessage$1 = module.ElMessage;
      ElementPlus__default = module.default;
      ElMessageBox = module.ElMessageBox;
      ElementPlus = module;
    }, module => {
      protobuf = module.default;
    }],
    execute: (function () {

      var __defProp = Object.defineProperty;
      var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
      var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
      var zhCn = {
        name: "zh-cn",
        el: {
          breadcrumb: {
            label: "面包屑"
          },
          colorpicker: {
            confirm: "确定",
            clear: "清空"
          },
          datepicker: {
            now: "此刻",
            today: "今天",
            cancel: "取消",
            clear: "清空",
            confirm: "确定",
            selectDate: "选择日期",
            selectTime: "选择时间",
            startDate: "开始日期",
            startTime: "开始时间",
            endDate: "结束日期",
            endTime: "结束时间",
            prevYear: "前一年",
            nextYear: "后一年",
            prevMonth: "上个月",
            nextMonth: "下个月",
            year: "年",
            month1: "1 月",
            month2: "2 月",
            month3: "3 月",
            month4: "4 月",
            month5: "5 月",
            month6: "6 月",
            month7: "7 月",
            month8: "8 月",
            month9: "9 月",
            month10: "10 月",
            month11: "11 月",
            month12: "12 月",
            weeks: {
              sun: "日",
              mon: "一",
              tue: "二",
              wed: "三",
              thu: "四",
              fri: "五",
              sat: "六"
            },
            months: {
              jan: "一月",
              feb: "二月",
              mar: "三月",
              apr: "四月",
              may: "五月",
              jun: "六月",
              jul: "七月",
              aug: "八月",
              sep: "九月",
              oct: "十月",
              nov: "十一月",
              dec: "十二月"
            }
          },
          select: {
            loading: "加载中",
            noMatch: "无匹配数据",
            noData: "无数据",
            placeholder: "请选择"
          },
          cascader: {
            noMatch: "无匹配数据",
            loading: "加载中",
            placeholder: "请选择",
            noData: "暂无数据"
          },
          pagination: {
            goto: "前往",
            pagesize: "条/页",
            total: "共 {total} 条",
            pageClassifier: "页",
            page: "页",
            prev: "上一页",
            next: "下一页",
            currentPage: "第 {pager} 页",
            prevPages: "向前 {pager} 页",
            nextPages: "向后 {pager} 页",
            deprecationWarning: "你使用了一些已被废弃的用法，请参考 el-pagination 的官方文档"
          },
          messagebox: {
            title: "提示",
            confirm: "确定",
            cancel: "取消",
            error: "输入的数据不合法!"
          },
          upload: {
            deleteTip: "按 delete 键可删除",
            delete: "删除",
            preview: "查看图片",
            continue: "继续上传"
          },
          table: {
            emptyText: "暂无数据",
            confirmFilter: "筛选",
            resetFilter: "重置",
            clearFilter: "全部",
            sumText: "合计"
          },
          tour: {
            next: "下一步",
            previous: "上一步",
            finish: "结束导览"
          },
          tree: {
            emptyText: "暂无数据"
          },
          transfer: {
            noMatch: "无匹配数据",
            noData: "无数据",
            titles: ["列表 1", "列表 2"],
            filterPlaceholder: "请输入搜索内容",
            noCheckedFormat: "共 {total} 项",
            hasCheckedFormat: "已选 {checked}/{total} 项"
          },
          image: {
            error: "加载失败"
          },
          pageHeader: {
            title: "返回"
          },
          popconfirm: {
            confirmButtonText: "确定",
            cancelButtonText: "取消"
          },
          carousel: {
            leftArrow: "上一张幻灯片",
            rightArrow: "下一张幻灯片",
            indicator: "幻灯片切换至索引 {index}"
          }
        }
      };
      const cssLoader = (e) => {
        const t = GM_getResourceText(e);
        return GM_addStyle(t), t;
      };
      cssLoader("element-plus/dist/index.css");
      /*! Element Plus Icons Vue v2.3.2 */
      var _sfc_main50 = /* @__PURE__ */ defineComponent({
        name: "CircleCloseFilled",
        __name: "circle-close-filled",
        setup(__props) {
          return (_ctx, _cache) => (openBlock(), createElementBlock("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 1024 1024"
          }, [
            createElementVNode("path", {
              fill: "currentColor",
              d: "M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896m0 393.664L407.936 353.6a38.4 38.4 0 1 0-54.336 54.336L457.664 512 353.6 616.064a38.4 38.4 0 1 0 54.336 54.336L512 566.336 616.064 670.4a38.4 38.4 0 1 0 54.336-54.336L566.336 512 670.4 407.936a38.4 38.4 0 1 0-54.336-54.336z"
            })
          ]));
        }
      }), circle_close_filled_default = _sfc_main50;
      var _sfc_main207 = /* @__PURE__ */ defineComponent({
        name: "PriceTag",
        __name: "price-tag",
        setup(__props) {
          return (_ctx, _cache) => (openBlock(), createElementBlock("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 1024 1024"
          }, [
            createElementVNode("path", {
              fill: "currentColor",
              d: "M224 318.336V896h576V318.336L552.512 115.84a64 64 0 0 0-81.024 0zM593.024 66.304l259.2 212.096A32 32 0 0 1 864 303.168V928a32 32 0 0 1-32 32H192a32 32 0 0 1-32-32V303.168a32 32 0 0 1 11.712-24.768l259.2-212.096a128 128 0 0 1 162.112 0"
            }),
            createElementVNode("path", {
              fill: "currentColor",
              d: "M512 448a64 64 0 1 0 0-128 64 64 0 0 0 0 128m0 64a128 128 0 1 1 0-256 128 128 0 0 1 0 256"
            })
          ]));
        }
      }), price_tag_default = _sfc_main207;
      var _sfc_main209 = /* @__PURE__ */ defineComponent({
        name: "Promotion",
        __name: "promotion",
        setup(__props) {
          return (_ctx, _cache) => (openBlock(), createElementBlock("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 1024 1024"
          }, [
            createElementVNode("path", {
              fill: "currentColor",
              d: "m64 448 832-320-128 704-446.08-243.328L832 192 242.816 545.472zm256 512V657.024L512 768z"
            })
          ]));
        }
      }), promotion_default = _sfc_main209;
      var _sfc_main229 = /* @__PURE__ */ defineComponent({
        name: "Service",
        __name: "service",
        setup(__props) {
          return (_ctx, _cache) => (openBlock(), createElementBlock("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 1024 1024"
          }, [
            createElementVNode("path", {
              fill: "currentColor",
              d: "M864 409.6a192 192 0 0 1-37.888 349.44A256.064 256.064 0 0 1 576 960h-96a32 32 0 1 1 0-64h96a192.06 192.06 0 0 0 181.12-128H736a32 32 0 0 1-32-32V416a32 32 0 0 1 32-32h32c10.368 0 20.544.832 30.528 2.432a288 288 0 0 0-573.056 0A193 193 0 0 1 256 384h32a32 32 0 0 1 32 32v320a32 32 0 0 1-32 32h-32a192 192 0 0 1-96-358.4 352 352 0 0 1 704 0M256 448a128 128 0 1 0 0 256zm640 128a128 128 0 0 0-128-128v256a128 128 0 0 0 128-128"
            })
          ]));
        }
      }), service_default = _sfc_main229;
      var _sfc_main234 = /* @__PURE__ */ defineComponent({
        name: "Shop",
        __name: "shop",
        setup(__props) {
          return (_ctx, _cache) => (openBlock(), createElementBlock("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 1024 1024"
          }, [
            createElementVNode("path", {
              fill: "currentColor",
              d: "M704 704h64v192H256V704h64v64h384zm188.544-152.192C894.528 559.616 896 567.616 896 576a96 96 0 1 1-192 0 96 96 0 1 1-192 0 96 96 0 1 1-192 0 96 96 0 1 1-192 0c0-8.384 1.408-16.384 3.392-24.192L192 128h640z"
            })
          ]));
        }
      }), shop_default = _sfc_main234;
      var _sfc_main285 = /* @__PURE__ */ defineComponent({
        name: "Wallet",
        __name: "wallet",
        setup(__props) {
          return (_ctx, _cache) => (openBlock(), createElementBlock("svg", {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 1024 1024"
          }, [
            createElementVNode("path", {
              fill: "currentColor",
              d: "M640 288h-64V128H128v704h384v32a32 32 0 0 0 32 32H96a32 32 0 0 1-32-32V96a32 32 0 0 1 32-32h512a32 32 0 0 1 32 32z"
            }),
            createElementVNode("path", {
              fill: "currentColor",
              d: "M128 320v512h768V320zm-32-64h832a32 32 0 0 1 32 32v576a32 32 0 0 1-32 32H96a32 32 0 0 1-32-32V288a32 32 0 0 1 32-32"
            }),
            createElementVNode("path", {
              fill: "currentColor",
              d: "M704 640a64 64 0 1 1 0-128 64 64 0 0 1 0 128"
            })
          ]));
        }
      }), wallet_default = _sfc_main285;
      const Icons = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
        __proto__: null,
        CircleCloseFilled: circle_close_filled_default,
        PriceTag: price_tag_default,
        Promotion: promotion_default,
        Service: service_default,
        Shop: shop_default,
        Wallet: wallet_default
      }, Symbol.toStringTag, { value: "Module" }));
      function bind(fn, thisArg) {
        return function wrap() {
          return fn.apply(thisArg, arguments);
        };
      }
      const { toString } = Object.prototype;
      const { getPrototypeOf } = Object;
      const { iterator, toStringTag } = Symbol;
      const kindOf = /* @__PURE__ */ ((cache) => (thing) => {
        const str2 = toString.call(thing);
        return cache[str2] || (cache[str2] = str2.slice(8, -1).toLowerCase());
      })(/* @__PURE__ */ Object.create(null));
      const kindOfTest = (type) => {
        type = type.toLowerCase();
        return (thing) => kindOf(thing) === type;
      };
      const typeOfTest = (type) => (thing) => typeof thing === type;
      const { isArray } = Array;
      const isUndefined = typeOfTest("undefined");
      function isBuffer(val) {
        return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
      }
      const isArrayBuffer = kindOfTest("ArrayBuffer");
      function isArrayBufferView(val) {
        let result;
        if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
          result = ArrayBuffer.isView(val);
        } else {
          result = val && val.buffer && isArrayBuffer(val.buffer);
        }
        return result;
      }
      const isString = typeOfTest("string");
      const isFunction$1 = typeOfTest("function");
      const isNumber = typeOfTest("number");
      const isObject = (thing) => thing !== null && typeof thing === "object";
      const isBoolean = (thing) => thing === true || thing === false;
      const isPlainObject = (val) => {
        if (kindOf(val) !== "object") {
          return false;
        }
        const prototype2 = getPrototypeOf(val);
        return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
      };
      const isEmptyObject = (val) => {
        if (!isObject(val) || isBuffer(val)) {
          return false;
        }
        try {
          return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
        } catch (e) {
          return false;
        }
      };
      const isDate = kindOfTest("Date");
      const isFile = kindOfTest("File");
      const isBlob = kindOfTest("Blob");
      const isFileList = kindOfTest("FileList");
      const isStream = (val) => isObject(val) && isFunction$1(val.pipe);
      const isFormData = (thing) => {
        let kind;
        return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction$1(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
        kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]"));
      };
      const isURLSearchParams = kindOfTest("URLSearchParams");
      const [isReadableStream, isRequest, isResponse, isHeaders] = [
        "ReadableStream",
        "Request",
        "Response",
        "Headers"
      ].map(kindOfTest);
      const trim = (str2) => str2.trim ? str2.trim() : str2.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
      function forEach(obj, fn, { allOwnKeys = false } = {}) {
        if (obj === null || typeof obj === "undefined") {
          return;
        }
        let i;
        let l;
        if (typeof obj !== "object") {
          obj = [obj];
        }
        if (isArray(obj)) {
          for (i = 0, l = obj.length; i < l; i++) {
            fn.call(null, obj[i], i, obj);
          }
        } else {
          if (isBuffer(obj)) {
            return;
          }
          const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
          const len = keys.length;
          let key;
          for (i = 0; i < len; i++) {
            key = keys[i];
            fn.call(null, obj[key], key, obj);
          }
        }
      }
      function findKey(obj, key) {
        if (isBuffer(obj)) {
          return null;
        }
        key = key.toLowerCase();
        const keys = Object.keys(obj);
        let i = keys.length;
        let _key;
        while (i-- > 0) {
          _key = keys[i];
          if (key === _key.toLowerCase()) {
            return _key;
          }
        }
        return null;
      }
      const _global = (() => {
        if (typeof globalThis !== "undefined") return globalThis;
        return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
      })();
      const isContextDefined = (context) => !isUndefined(context) && context !== _global;
      function merge() {
        const { caseless, skipUndefined } = isContextDefined(this) && this || {};
        const result = {};
        const assignValue = (val, key) => {
          if (key === "__proto__" || key === "constructor" || key === "prototype") {
            return;
          }
          const targetKey = caseless && findKey(result, key) || key;
          if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
            result[targetKey] = merge(result[targetKey], val);
          } else if (isPlainObject(val)) {
            result[targetKey] = merge({}, val);
          } else if (isArray(val)) {
            result[targetKey] = val.slice();
          } else if (!skipUndefined || !isUndefined(val)) {
            result[targetKey] = val;
          }
        };
        for (let i = 0, l = arguments.length; i < l; i++) {
          arguments[i] && forEach(arguments[i], assignValue);
        }
        return result;
      }
      const extend = (a, b, thisArg, { allOwnKeys } = {}) => {
        forEach(
          b,
          (val, key) => {
            if (thisArg && isFunction$1(val)) {
              Object.defineProperty(a, key, {
                value: bind(val, thisArg),
                writable: true,
                enumerable: true,
                configurable: true
              });
            } else {
              Object.defineProperty(a, key, {
                value: val,
                writable: true,
                enumerable: true,
                configurable: true
              });
            }
          },
          { allOwnKeys }
        );
        return a;
      };
      const stripBOM = (content) => {
        if (content.charCodeAt(0) === 65279) {
          content = content.slice(1);
        }
        return content;
      };
      const inherits = (constructor, superConstructor, props, descriptors) => {
        constructor.prototype = Object.create(
          superConstructor.prototype,
          descriptors
        );
        Object.defineProperty(constructor.prototype, "constructor", {
          value: constructor,
          writable: true,
          enumerable: false,
          configurable: true
        });
        Object.defineProperty(constructor, "super", {
          value: superConstructor.prototype
        });
        props && Object.assign(constructor.prototype, props);
      };
      const toFlatObject = (sourceObj, destObj, filter2, propFilter) => {
        let props;
        let i;
        let prop;
        const merged = {};
        destObj = destObj || {};
        if (sourceObj == null) return destObj;
        do {
          props = Object.getOwnPropertyNames(sourceObj);
          i = props.length;
          while (i-- > 0) {
            prop = props[i];
            if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
              destObj[prop] = sourceObj[prop];
              merged[prop] = true;
            }
          }
          sourceObj = filter2 !== false && getPrototypeOf(sourceObj);
        } while (sourceObj && (!filter2 || filter2(sourceObj, destObj)) && sourceObj !== Object.prototype);
        return destObj;
      };
      const endsWith = (str2, searchString, position) => {
        str2 = String(str2);
        if (position === void 0 || position > str2.length) {
          position = str2.length;
        }
        position -= searchString.length;
        const lastIndex = str2.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
      };
      const toArray = (thing) => {
        if (!thing) return null;
        if (isArray(thing)) return thing;
        let i = thing.length;
        if (!isNumber(i)) return null;
        const arr = new Array(i);
        while (i-- > 0) {
          arr[i] = thing[i];
        }
        return arr;
      };
      const isTypedArray = /* @__PURE__ */ ((TypedArray) => {
        return (thing) => {
          return TypedArray && thing instanceof TypedArray;
        };
      })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
      const forEachEntry = (obj, fn) => {
        const generator = obj && obj[iterator];
        const _iterator = generator.call(obj);
        let result;
        while ((result = _iterator.next()) && !result.done) {
          const pair = result.value;
          fn.call(obj, pair[0], pair[1]);
        }
      };
      const matchAll = (regExp, str2) => {
        let matches;
        const arr = [];
        while ((matches = regExp.exec(str2)) !== null) {
          arr.push(matches);
        }
        return arr;
      };
      const isHTMLForm = kindOfTest("HTMLFormElement");
      const toCamelCase = (str2) => {
        return str2.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g, function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
        });
      };
      const hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
      const isRegExp = kindOfTest("RegExp");
      const reduceDescriptors = (obj, reducer) => {
        const descriptors = Object.getOwnPropertyDescriptors(obj);
        const reducedDescriptors = {};
        forEach(descriptors, (descriptor, name) => {
          let ret;
          if ((ret = reducer(descriptor, name, obj)) !== false) {
            reducedDescriptors[name] = ret || descriptor;
          }
        });
        Object.defineProperties(obj, reducedDescriptors);
      };
      const freezeMethods = (obj) => {
        reduceDescriptors(obj, (descriptor, name) => {
          if (isFunction$1(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
            return false;
          }
          const value = obj[name];
          if (!isFunction$1(value)) return;
          descriptor.enumerable = false;
          if ("writable" in descriptor) {
            descriptor.writable = false;
            return;
          }
          if (!descriptor.set) {
            descriptor.set = () => {
              throw Error("Can not rewrite read-only method '" + name + "'");
            };
          }
        });
      };
      const toObjectSet = (arrayOrString, delimiter) => {
        const obj = {};
        const define = (arr) => {
          arr.forEach((value) => {
            obj[value] = true;
          });
        };
        isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
        return obj;
      };
      const noop = () => {
      };
      const toFiniteNumber = (value, defaultValue) => {
        return value != null && Number.isFinite(value = +value) ? value : defaultValue;
      };
      function isSpecCompliantForm(thing) {
        return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
      }
      const toJSONObject = (obj) => {
        const stack = new Array(10);
        const visit = (source, i) => {
          if (isObject(source)) {
            if (stack.indexOf(source) >= 0) {
              return;
            }
            if (isBuffer(source)) {
              return source;
            }
            if (!("toJSON" in source)) {
              stack[i] = source;
              const target = isArray(source) ? [] : {};
              forEach(source, (value, key) => {
                const reducedValue = visit(value, i + 1);
                !isUndefined(reducedValue) && (target[key] = reducedValue);
              });
              stack[i] = void 0;
              return target;
            }
          }
          return source;
        };
        return visit(obj, 0);
      };
      const isAsyncFn = kindOfTest("AsyncFunction");
      const isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
      const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
        if (setImmediateSupported) {
          return setImmediate;
        }
        return postMessageSupported ? ((token, callbacks) => {
          _global.addEventListener(
            "message",
            ({ source, data }) => {
              if (source === _global && data === token) {
                callbacks.length && callbacks.shift()();
              }
            },
            false
          );
          return (cb) => {
            callbacks.push(cb);
            _global.postMessage(token, "*");
          };
        })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
      })(typeof setImmediate === "function", isFunction$1(_global.postMessage));
      const asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
      const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
      const utils$1 = {
        isArray,
        isArrayBuffer,
        isBuffer,
        isFormData,
        isArrayBufferView,
        isString,
        isNumber,
        isBoolean,
        isObject,
        isPlainObject,
        isEmptyObject,
        isReadableStream,
        isRequest,
        isResponse,
        isHeaders,
        isUndefined,
        isDate,
        isFile,
        isBlob,
        isRegExp,
        isFunction: isFunction$1,
        isStream,
        isURLSearchParams,
        isTypedArray,
        isFileList,
        forEach,
        merge,
        extend,
        trim,
        stripBOM,
        inherits,
        toFlatObject,
        kindOf,
        kindOfTest,
        endsWith,
        toArray,
        forEachEntry,
        matchAll,
        isHTMLForm,
        hasOwnProperty,
        hasOwnProp: hasOwnProperty,
        // an alias to avoid ESLint no-prototype-builtins detection
        reduceDescriptors,
        freezeMethods,
        toObjectSet,
        toCamelCase,
        noop,
        toFiniteNumber,
        findKey,
        global: _global,
        isContextDefined,
        isSpecCompliantForm,
        toJSONObject,
        isAsyncFn,
        isThenable,
        setImmediate: _setImmediate,
        asap,
        isIterable
      };
      let AxiosError$1 = class AxiosError2 extends Error {
        static from(error, code2, config, request2, response, customProps) {
          const axiosError = new AxiosError2(error.message, code2 || error.code, config, request2, response);
          axiosError.cause = error;
          axiosError.name = error.name;
          customProps && Object.assign(axiosError, customProps);
          return axiosError;
        }
        /**
         * Create an Error with the specified message, config, error code, request and response.
         *
         * @param {string} message The error message.
         * @param {string} [code] The error code (for example, 'ECONNABORTED').
         * @param {Object} [config] The config.
         * @param {Object} [request] The request.
         * @param {Object} [response] The response.
         *
         * @returns {Error} The created error.
         */
        constructor(message, code2, config, request2, response) {
          super(message);
          this.name = "AxiosError";
          this.isAxiosError = true;
          code2 && (this.code = code2);
          config && (this.config = config);
          request2 && (this.request = request2);
          if (response) {
            this.response = response;
            this.status = response.status;
          }
        }
        toJSON() {
          return {
            // Standard
            message: this.message,
            name: this.name,
            // Microsoft
            description: this.description,
            number: this.number,
            // Mozilla
            fileName: this.fileName,
            lineNumber: this.lineNumber,
            columnNumber: this.columnNumber,
            stack: this.stack,
            // Axios
            config: utils$1.toJSONObject(this.config),
            code: this.code,
            status: this.status
          };
        }
      };
      AxiosError$1.ERR_BAD_OPTION_VALUE = "ERR_BAD_OPTION_VALUE";
      AxiosError$1.ERR_BAD_OPTION = "ERR_BAD_OPTION";
      AxiosError$1.ECONNABORTED = "ECONNABORTED";
      AxiosError$1.ETIMEDOUT = "ETIMEDOUT";
      AxiosError$1.ERR_NETWORK = "ERR_NETWORK";
      AxiosError$1.ERR_FR_TOO_MANY_REDIRECTS = "ERR_FR_TOO_MANY_REDIRECTS";
      AxiosError$1.ERR_DEPRECATED = "ERR_DEPRECATED";
      AxiosError$1.ERR_BAD_RESPONSE = "ERR_BAD_RESPONSE";
      AxiosError$1.ERR_BAD_REQUEST = "ERR_BAD_REQUEST";
      AxiosError$1.ERR_CANCELED = "ERR_CANCELED";
      AxiosError$1.ERR_NOT_SUPPORT = "ERR_NOT_SUPPORT";
      AxiosError$1.ERR_INVALID_URL = "ERR_INVALID_URL";
      const httpAdapter = null;
      function isVisitable(thing) {
        return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
      }
      function removeBrackets(key) {
        return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
      }
      function renderKey(path, key, dots) {
        if (!path) return key;
        return path.concat(key).map(function each(token, i) {
          token = removeBrackets(token);
          return !dots && i ? "[" + token + "]" : token;
        }).join(dots ? "." : "");
      }
      function isFlatArray(arr) {
        return utils$1.isArray(arr) && !arr.some(isVisitable);
      }
      const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
        return /^is[A-Z]/.test(prop);
      });
      function toFormData$1(obj, formData, options) {
        if (!utils$1.isObject(obj)) {
          throw new TypeError("target must be an object");
        }
        formData = formData || new FormData();
        options = utils$1.toFlatObject(options, {
          metaTokens: true,
          dots: false,
          indexes: false
        }, false, function defined(option, source) {
          return !utils$1.isUndefined(source[option]);
        });
        const metaTokens = options.metaTokens;
        const visitor = options.visitor || defaultVisitor;
        const dots = options.dots;
        const indexes = options.indexes;
        const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
        const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
        if (!utils$1.isFunction(visitor)) {
          throw new TypeError("visitor must be a function");
        }
        function convertValue(value) {
          if (value === null) return "";
          if (utils$1.isDate(value)) {
            return value.toISOString();
          }
          if (utils$1.isBoolean(value)) {
            return value.toString();
          }
          if (!useBlob && utils$1.isBlob(value)) {
            throw new AxiosError$1("Blob is not supported. Use a Buffer instead.");
          }
          if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
            return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
          }
          return value;
        }
        function defaultVisitor(value, key, path) {
          let arr = value;
          if (value && !path && typeof value === "object") {
            if (utils$1.endsWith(key, "{}")) {
              key = metaTokens ? key : key.slice(0, -2);
              value = JSON.stringify(value);
            } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
              key = removeBrackets(key);
              arr.forEach(function each(el, index) {
                !(utils$1.isUndefined(el) || el === null) && formData.append(
                  // eslint-disable-next-line no-nested-ternary
                  indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
                  convertValue(el)
                );
              });
              return false;
            }
          }
          if (isVisitable(value)) {
            return true;
          }
          formData.append(renderKey(path, key, dots), convertValue(value));
          return false;
        }
        const stack = [];
        const exposedHelpers = Object.assign(predicates, {
          defaultVisitor,
          convertValue,
          isVisitable
        });
        function build(value, path) {
          if (utils$1.isUndefined(value)) return;
          if (stack.indexOf(value) !== -1) {
            throw Error("Circular reference detected in " + path.join("."));
          }
          stack.push(value);
          utils$1.forEach(value, function each(el, key) {
            const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
              formData,
              el,
              utils$1.isString(key) ? key.trim() : key,
              path,
              exposedHelpers
            );
            if (result === true) {
              build(el, path ? path.concat(key) : [key]);
            }
          });
          stack.pop();
        }
        if (!utils$1.isObject(obj)) {
          throw new TypeError("data must be an object");
        }
        build(obj);
        return formData;
      }
      function encode$1(str2) {
        const charMap = {
          "!": "%21",
          "'": "%27",
          "(": "%28",
          ")": "%29",
          "~": "%7E",
          "%20": "+",
          "%00": "\0"
        };
        return encodeURIComponent(str2).replace(/[!'()~]|%20|%00/g, function replacer(match) {
          return charMap[match];
        });
      }
      function AxiosURLSearchParams(params, options) {
        this._pairs = [];
        params && toFormData$1(params, this, options);
      }
      const prototype = AxiosURLSearchParams.prototype;
      prototype.append = function append(name, value) {
        this._pairs.push([name, value]);
      };
      prototype.toString = function toString2(encoder) {
        const _encode = encoder ? function(value) {
          return encoder.call(this, value, encode$1);
        } : encode$1;
        return this._pairs.map(function each(pair) {
          return _encode(pair[0]) + "=" + _encode(pair[1]);
        }, "").join("&");
      };
      function encode(val) {
        return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
      }
      function buildURL(url, params, options) {
        if (!params) {
          return url;
        }
        const _encode = options && options.encode || encode;
        const _options = utils$1.isFunction(options) ? {
          serialize: options
        } : options;
        const serializeFn = _options && _options.serialize;
        let serializedParams;
        if (serializeFn) {
          serializedParams = serializeFn(params, _options);
        } else {
          serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, _options).toString(_encode);
        }
        if (serializedParams) {
          const hashmarkIndex = url.indexOf("#");
          if (hashmarkIndex !== -1) {
            url = url.slice(0, hashmarkIndex);
          }
          url += (url.indexOf("?") === -1 ? "?" : "&") + serializedParams;
        }
        return url;
      }
      class InterceptorManager {
        constructor() {
          this.handlers = [];
        }
        /**
         * Add a new interceptor to the stack
         *
         * @param {Function} fulfilled The function to handle `then` for a `Promise`
         * @param {Function} rejected The function to handle `reject` for a `Promise`
         * @param {Object} options The options for the interceptor, synchronous and runWhen
         *
         * @return {Number} An ID used to remove interceptor later
         */
        use(fulfilled, rejected, options) {
          this.handlers.push({
            fulfilled,
            rejected,
            synchronous: options ? options.synchronous : false,
            runWhen: options ? options.runWhen : null
          });
          return this.handlers.length - 1;
        }
        /**
         * Remove an interceptor from the stack
         *
         * @param {Number} id The ID that was returned by `use`
         *
         * @returns {void}
         */
        eject(id) {
          if (this.handlers[id]) {
            this.handlers[id] = null;
          }
        }
        /**
         * Clear all interceptors from the stack
         *
         * @returns {void}
         */
        clear() {
          if (this.handlers) {
            this.handlers = [];
          }
        }
        /**
         * Iterate over all the registered interceptors
         *
         * This method is particularly useful for skipping over any
         * interceptors that may have become `null` calling `eject`.
         *
         * @param {Function} fn The function to call for each interceptor
         *
         * @returns {void}
         */
        forEach(fn) {
          utils$1.forEach(this.handlers, function forEachHandler(h) {
            if (h !== null) {
              fn(h);
            }
          });
        }
      }
      const transitionalDefaults = {
        silentJSONParsing: true,
        forcedJSONParsing: true,
        clarifyTimeoutError: false,
        legacyInterceptorReqResOrdering: true
      };
      const URLSearchParams$1 = typeof URLSearchParams !== "undefined" ? URLSearchParams : AxiosURLSearchParams;
      const FormData$1 = typeof FormData !== "undefined" ? FormData : null;
      const Blob$1 = typeof Blob !== "undefined" ? Blob : null;
      const platform$2 = {
        isBrowser: true,
        classes: {
          URLSearchParams: URLSearchParams$1,
          FormData: FormData$1,
          Blob: Blob$1
        },
        protocols: ["http", "https", "file", "blob", "url", "data"]
      };
      const hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
      const _navigator = typeof navigator === "object" && navigator || void 0;
      const hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
      const hasStandardBrowserWebWorkerEnv = (() => {
        return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
        self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
      })();
      const origin = hasBrowserEnv && window.location.href || "http://localhost";
      const utils = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
        __proto__: null,
        hasBrowserEnv,
        hasStandardBrowserEnv,
        hasStandardBrowserWebWorkerEnv,
        navigator: _navigator,
        origin
      }, Symbol.toStringTag, { value: "Module" }));
      const platform$1 = {
        ...utils,
        ...platform$2
      };
      function toURLEncodedForm(data, options) {
        return toFormData$1(data, new platform$1.classes.URLSearchParams(), {
          visitor: function(value, key, path, helpers) {
            if (platform$1.isNode && utils$1.isBuffer(value)) {
              this.append(key, value.toString("base64"));
              return false;
            }
            return helpers.defaultVisitor.apply(this, arguments);
          },
          ...options
        });
      }
      function parsePropPath(name) {
        return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
          return match[0] === "[]" ? "" : match[1] || match[0];
        });
      }
      function arrayToObject(arr) {
        const obj = {};
        const keys = Object.keys(arr);
        let i;
        const len = keys.length;
        let key;
        for (i = 0; i < len; i++) {
          key = keys[i];
          obj[key] = arr[key];
        }
        return obj;
      }
      function formDataToJSON(formData) {
        function buildPath(path, value, target, index) {
          let name = path[index++];
          if (name === "__proto__") return true;
          const isNumericKey = Number.isFinite(+name);
          const isLast = index >= path.length;
          name = !name && utils$1.isArray(target) ? target.length : name;
          if (isLast) {
            if (utils$1.hasOwnProp(target, name)) {
              target[name] = [target[name], value];
            } else {
              target[name] = value;
            }
            return !isNumericKey;
          }
          if (!target[name] || !utils$1.isObject(target[name])) {
            target[name] = [];
          }
          const result = buildPath(path, value, target[name], index);
          if (result && utils$1.isArray(target[name])) {
            target[name] = arrayToObject(target[name]);
          }
          return !isNumericKey;
        }
        if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
          const obj = {};
          utils$1.forEachEntry(formData, (name, value) => {
            buildPath(parsePropPath(name), value, obj, 0);
          });
          return obj;
        }
        return null;
      }
      function stringifySafely(rawValue, parser, encoder) {
        if (utils$1.isString(rawValue)) {
          try {
            (parser || JSON.parse)(rawValue);
            return utils$1.trim(rawValue);
          } catch (e) {
            if (e.name !== "SyntaxError") {
              throw e;
            }
          }
        }
        return (encoder || JSON.stringify)(rawValue);
      }
      const defaults = {
        transitional: transitionalDefaults,
        adapter: ["xhr", "http", "fetch"],
        transformRequest: [function transformRequest(data, headers) {
          const contentType = headers.getContentType() || "";
          const hasJSONContentType = contentType.indexOf("application/json") > -1;
          const isObjectPayload = utils$1.isObject(data);
          if (isObjectPayload && utils$1.isHTMLForm(data)) {
            data = new FormData(data);
          }
          const isFormData2 = utils$1.isFormData(data);
          if (isFormData2) {
            return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
          }
          if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
            return data;
          }
          if (utils$1.isArrayBufferView(data)) {
            return data.buffer;
          }
          if (utils$1.isURLSearchParams(data)) {
            headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
            return data.toString();
          }
          let isFileList2;
          if (isObjectPayload) {
            if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
              return toURLEncodedForm(data, this.formSerializer).toString();
            }
            if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
              const _FormData = this.env && this.env.FormData;
              return toFormData$1(
                isFileList2 ? { "files[]": data } : data,
                _FormData && new _FormData(),
                this.formSerializer
              );
            }
          }
          if (isObjectPayload || hasJSONContentType) {
            headers.setContentType("application/json", false);
            return stringifySafely(data);
          }
          return data;
        }],
        transformResponse: [function transformResponse(data) {
          const transitional2 = this.transitional || defaults.transitional;
          const forcedJSONParsing = transitional2 && transitional2.forcedJSONParsing;
          const JSONRequested = this.responseType === "json";
          if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
            return data;
          }
          if (data && utils$1.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
            const silentJSONParsing = transitional2 && transitional2.silentJSONParsing;
            const strictJSONParsing = !silentJSONParsing && JSONRequested;
            try {
              return JSON.parse(data, this.parseReviver);
            } catch (e) {
              if (strictJSONParsing) {
                if (e.name === "SyntaxError") {
                  throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
                }
                throw e;
              }
            }
          }
          return data;
        }],
        /**
         * A timeout in milliseconds to abort a request. If set to 0 (default) a
         * timeout is not created.
         */
        timeout: 0,
        xsrfCookieName: "XSRF-TOKEN",
        xsrfHeaderName: "X-XSRF-TOKEN",
        maxContentLength: -1,
        maxBodyLength: -1,
        env: {
          FormData: platform$1.classes.FormData,
          Blob: platform$1.classes.Blob
        },
        validateStatus: function validateStatus(status) {
          return status >= 200 && status < 300;
        },
        headers: {
          common: {
            "Accept": "application/json, text/plain, */*",
            "Content-Type": void 0
          }
        }
      };
      utils$1.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
        defaults.headers[method] = {};
      });
      const ignoreDuplicateOf = utils$1.toObjectSet([
        "age",
        "authorization",
        "content-length",
        "content-type",
        "etag",
        "expires",
        "from",
        "host",
        "if-modified-since",
        "if-unmodified-since",
        "last-modified",
        "location",
        "max-forwards",
        "proxy-authorization",
        "referer",
        "retry-after",
        "user-agent"
      ]);
      const parseHeaders = (rawHeaders) => {
        const parsed = {};
        let key;
        let val;
        let i;
        rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
          i = line.indexOf(":");
          key = line.substring(0, i).trim().toLowerCase();
          val = line.substring(i + 1).trim();
          if (!key || parsed[key] && ignoreDuplicateOf[key]) {
            return;
          }
          if (key === "set-cookie") {
            if (parsed[key]) {
              parsed[key].push(val);
            } else {
              parsed[key] = [val];
            }
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
          }
        });
        return parsed;
      };
      const $internals = Symbol("internals");
      function normalizeHeader(header) {
        return header && String(header).trim().toLowerCase();
      }
      function normalizeValue(value) {
        if (value === false || value == null) {
          return value;
        }
        return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
      }
      function parseTokens(str2) {
        const tokens = /* @__PURE__ */ Object.create(null);
        const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
        let match;
        while (match = tokensRE.exec(str2)) {
          tokens[match[1]] = match[2];
        }
        return tokens;
      }
      const isValidHeaderName = (str2) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str2.trim());
      function matchHeaderValue(context, value, header, filter2, isHeaderNameFilter) {
        if (utils$1.isFunction(filter2)) {
          return filter2.call(this, value, header);
        }
        if (isHeaderNameFilter) {
          value = header;
        }
        if (!utils$1.isString(value)) return;
        if (utils$1.isString(filter2)) {
          return value.indexOf(filter2) !== -1;
        }
        if (utils$1.isRegExp(filter2)) {
          return filter2.test(value);
        }
      }
      function formatHeader(header) {
        return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str2) => {
          return char.toUpperCase() + str2;
        });
      }
      function buildAccessors(obj, header) {
        const accessorName = utils$1.toCamelCase(" " + header);
        ["get", "set", "has"].forEach((methodName) => {
          Object.defineProperty(obj, methodName + accessorName, {
            value: function(arg1, arg2, arg3) {
              return this[methodName].call(this, header, arg1, arg2, arg3);
            },
            configurable: true
          });
        });
      }
      let AxiosHeaders$1 = class AxiosHeaders2 {
        constructor(headers) {
          headers && this.set(headers);
        }
        set(header, valueOrRewrite, rewrite) {
          const self2 = this;
          function setHeader(_value, _header, _rewrite) {
            const lHeader = normalizeHeader(_header);
            if (!lHeader) {
              throw new Error("header name must be a non-empty string");
            }
            const key = utils$1.findKey(self2, lHeader);
            if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
              self2[key || _header] = normalizeValue(_value);
            }
          }
          const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
          if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
            setHeaders(header, valueOrRewrite);
          } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
            setHeaders(parseHeaders(header), valueOrRewrite);
          } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
            let obj = {}, dest, key;
            for (const entry of header) {
              if (!utils$1.isArray(entry)) {
                throw TypeError("Object iterator must return a key-value pair");
              }
              obj[key = entry[0]] = (dest = obj[key]) ? utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
            }
            setHeaders(obj, valueOrRewrite);
          } else {
            header != null && setHeader(valueOrRewrite, header, rewrite);
          }
          return this;
        }
        get(header, parser) {
          header = normalizeHeader(header);
          if (header) {
            const key = utils$1.findKey(this, header);
            if (key) {
              const value = this[key];
              if (!parser) {
                return value;
              }
              if (parser === true) {
                return parseTokens(value);
              }
              if (utils$1.isFunction(parser)) {
                return parser.call(this, value, key);
              }
              if (utils$1.isRegExp(parser)) {
                return parser.exec(value);
              }
              throw new TypeError("parser must be boolean|regexp|function");
            }
          }
        }
        has(header, matcher) {
          header = normalizeHeader(header);
          if (header) {
            const key = utils$1.findKey(this, header);
            return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
          }
          return false;
        }
        delete(header, matcher) {
          const self2 = this;
          let deleted = false;
          function deleteHeader(_header) {
            _header = normalizeHeader(_header);
            if (_header) {
              const key = utils$1.findKey(self2, _header);
              if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
                delete self2[key];
                deleted = true;
              }
            }
          }
          if (utils$1.isArray(header)) {
            header.forEach(deleteHeader);
          } else {
            deleteHeader(header);
          }
          return deleted;
        }
        clear(matcher) {
          const keys = Object.keys(this);
          let i = keys.length;
          let deleted = false;
          while (i--) {
            const key = keys[i];
            if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
              delete this[key];
              deleted = true;
            }
          }
          return deleted;
        }
        normalize(format) {
          const self2 = this;
          const headers = {};
          utils$1.forEach(this, (value, header) => {
            const key = utils$1.findKey(headers, header);
            if (key) {
              self2[key] = normalizeValue(value);
              delete self2[header];
              return;
            }
            const normalized = format ? formatHeader(header) : String(header).trim();
            if (normalized !== header) {
              delete self2[header];
            }
            self2[normalized] = normalizeValue(value);
            headers[normalized] = true;
          });
          return this;
        }
        concat(...targets) {
          return this.constructor.concat(this, ...targets);
        }
        toJSON(asStrings) {
          const obj = /* @__PURE__ */ Object.create(null);
          utils$1.forEach(this, (value, header) => {
            value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
          });
          return obj;
        }
        [Symbol.iterator]() {
          return Object.entries(this.toJSON())[Symbol.iterator]();
        }
        toString() {
          return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
        }
        getSetCookie() {
          return this.get("set-cookie") || [];
        }
        get [Symbol.toStringTag]() {
          return "AxiosHeaders";
        }
        static from(thing) {
          return thing instanceof this ? thing : new this(thing);
        }
        static concat(first, ...targets) {
          const computed2 = new this(first);
          targets.forEach((target) => computed2.set(target));
          return computed2;
        }
        static accessor(header) {
          const internals = this[$internals] = this[$internals] = {
            accessors: {}
          };
          const accessors = internals.accessors;
          const prototype2 = this.prototype;
          function defineAccessor(_header) {
            const lHeader = normalizeHeader(_header);
            if (!accessors[lHeader]) {
              buildAccessors(prototype2, _header);
              accessors[lHeader] = true;
            }
          }
          utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
          return this;
        }
      };
      AxiosHeaders$1.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
      utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({ value }, key) => {
        let mapped = key[0].toUpperCase() + key.slice(1);
        return {
          get: () => value,
          set(headerValue) {
            this[mapped] = headerValue;
          }
        };
      });
      utils$1.freezeMethods(AxiosHeaders$1);
      function transformData(fns, response) {
        const config = this || defaults;
        const context = response || config;
        const headers = AxiosHeaders$1.from(context.headers);
        let data = context.data;
        utils$1.forEach(fns, function transform(fn) {
          data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
        });
        headers.normalize();
        return data;
      }
      function isCancel$1(value) {
        return !!(value && value.__CANCEL__);
      }
      let CanceledError$1 = class CanceledError2 extends AxiosError$1 {
        /**
         * A `CanceledError` is an object that is thrown when an operation is canceled.
         *
         * @param {string=} message The message.
         * @param {Object=} config The config.
         * @param {Object=} request The request.
         *
         * @returns {CanceledError} The created error.
         */
        constructor(message, config, request2) {
          super(message == null ? "canceled" : message, AxiosError$1.ERR_CANCELED, config, request2);
          this.name = "CanceledError";
          this.__CANCEL__ = true;
        }
      };
      function settle(resolve, reject, response) {
        const validateStatus2 = response.config.validateStatus;
        if (!response.status || !validateStatus2 || validateStatus2(response.status)) {
          resolve(response);
        } else {
          reject(new AxiosError$1(
            "Request failed with status code " + response.status,
            [AxiosError$1.ERR_BAD_REQUEST, AxiosError$1.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
            response.config,
            response.request,
            response
          ));
        }
      }
      function parseProtocol(url) {
        const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
        return match && match[1] || "";
      }
      function speedometer(samplesCount, min) {
        samplesCount = samplesCount || 10;
        const bytes = new Array(samplesCount);
        const timestamps = new Array(samplesCount);
        let head = 0;
        let tail = 0;
        let firstSampleTS;
        min = min !== void 0 ? min : 1e3;
        return function push(chunkLength) {
          const now = Date.now();
          const startedAt = timestamps[tail];
          if (!firstSampleTS) {
            firstSampleTS = now;
          }
          bytes[head] = chunkLength;
          timestamps[head] = now;
          let i = tail;
          let bytesCount = 0;
          while (i !== head) {
            bytesCount += bytes[i++];
            i = i % samplesCount;
          }
          head = (head + 1) % samplesCount;
          if (head === tail) {
            tail = (tail + 1) % samplesCount;
          }
          if (now - firstSampleTS < min) {
            return;
          }
          const passed = startedAt && now - startedAt;
          return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
        };
      }
      function throttle(fn, freq) {
        let timestamp = 0;
        let threshold = 1e3 / freq;
        let lastArgs;
        let timer;
        const invoke = (args, now = Date.now()) => {
          timestamp = now;
          lastArgs = null;
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          fn(...args);
        };
        const throttled = (...args) => {
          const now = Date.now();
          const passed = now - timestamp;
          if (passed >= threshold) {
            invoke(args, now);
          } else {
            lastArgs = args;
            if (!timer) {
              timer = setTimeout(() => {
                timer = null;
                invoke(lastArgs);
              }, threshold - passed);
            }
          }
        };
        const flush = () => lastArgs && invoke(lastArgs);
        return [throttled, flush];
      }
      const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
        let bytesNotified = 0;
        const _speedometer = speedometer(50, 250);
        return throttle((e) => {
          const loaded = e.loaded;
          const total = e.lengthComputable ? e.total : void 0;
          const progressBytes = loaded - bytesNotified;
          const rate = _speedometer(progressBytes);
          const inRange = loaded <= total;
          bytesNotified = loaded;
          const data = {
            loaded,
            total,
            progress: total ? loaded / total : void 0,
            bytes: progressBytes,
            rate: rate ? rate : void 0,
            estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
            event: e,
            lengthComputable: total != null,
            [isDownloadStream ? "download" : "upload"]: true
          };
          listener(data);
        }, freq);
      };
      const progressEventDecorator = (total, throttled) => {
        const lengthComputable = total != null;
        return [(loaded) => throttled[0]({
          lengthComputable,
          total,
          loaded
        }), throttled[1]];
      };
      const asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));
      const isURLSameOrigin = platform$1.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url) => {
        url = new URL(url, platform$1.origin);
        return origin2.protocol === url.protocol && origin2.host === url.host && (isMSIE || origin2.port === url.port);
      })(
        new URL(platform$1.origin),
        platform$1.navigator && /(msie|trident)/i.test(platform$1.navigator.userAgent)
      ) : () => true;
      const cookies = platform$1.hasStandardBrowserEnv ? (
        // Standard browser envs support document.cookie
        {
          write(name, value, expires, path, domain, secure, sameSite) {
            if (typeof document === "undefined") return;
            const cookie = [`${name}=${encodeURIComponent(value)}`];
            if (utils$1.isNumber(expires)) {
              cookie.push(`expires=${new Date(expires).toUTCString()}`);
            }
            if (utils$1.isString(path)) {
              cookie.push(`path=${path}`);
            }
            if (utils$1.isString(domain)) {
              cookie.push(`domain=${domain}`);
            }
            if (secure === true) {
              cookie.push("secure");
            }
            if (utils$1.isString(sameSite)) {
              cookie.push(`SameSite=${sameSite}`);
            }
            document.cookie = cookie.join("; ");
          },
          read(name) {
            if (typeof document === "undefined") return null;
            const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
            return match ? decodeURIComponent(match[1]) : null;
          },
          remove(name) {
            this.write(name, "", Date.now() - 864e5, "/");
          }
        }
      ) : (
        // Non-standard browser env (web workers, react-native) lack needed support.
        {
          write() {
          },
          read() {
            return null;
          },
          remove() {
          }
        }
      );
      function isAbsoluteURL(url) {
        if (typeof url !== "string") {
          return false;
        }
        return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
      }
      function combineURLs(baseURL, relativeURL) {
        return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
      }
      function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
        let isRelativeUrl = !isAbsoluteURL(requestedURL);
        if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
          return combineURLs(baseURL, requestedURL);
        }
        return requestedURL;
      }
      const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;
      function mergeConfig$1(config1, config2) {
        config2 = config2 || {};
        const config = {};
        function getMergedValue(target, source, prop, caseless) {
          if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
            return utils$1.merge.call({ caseless }, target, source);
          } else if (utils$1.isPlainObject(source)) {
            return utils$1.merge({}, source);
          } else if (utils$1.isArray(source)) {
            return source.slice();
          }
          return source;
        }
        function mergeDeepProperties(a, b, prop, caseless) {
          if (!utils$1.isUndefined(b)) {
            return getMergedValue(a, b, prop, caseless);
          } else if (!utils$1.isUndefined(a)) {
            return getMergedValue(void 0, a, prop, caseless);
          }
        }
        function valueFromConfig2(a, b) {
          if (!utils$1.isUndefined(b)) {
            return getMergedValue(void 0, b);
          }
        }
        function defaultToConfig2(a, b) {
          if (!utils$1.isUndefined(b)) {
            return getMergedValue(void 0, b);
          } else if (!utils$1.isUndefined(a)) {
            return getMergedValue(void 0, a);
          }
        }
        function mergeDirectKeys(a, b, prop) {
          if (prop in config2) {
            return getMergedValue(a, b);
          } else if (prop in config1) {
            return getMergedValue(void 0, a);
          }
        }
        const mergeMap = {
          url: valueFromConfig2,
          method: valueFromConfig2,
          data: valueFromConfig2,
          baseURL: defaultToConfig2,
          transformRequest: defaultToConfig2,
          transformResponse: defaultToConfig2,
          paramsSerializer: defaultToConfig2,
          timeout: defaultToConfig2,
          timeoutMessage: defaultToConfig2,
          withCredentials: defaultToConfig2,
          withXSRFToken: defaultToConfig2,
          adapter: defaultToConfig2,
          responseType: defaultToConfig2,
          xsrfCookieName: defaultToConfig2,
          xsrfHeaderName: defaultToConfig2,
          onUploadProgress: defaultToConfig2,
          onDownloadProgress: defaultToConfig2,
          decompress: defaultToConfig2,
          maxContentLength: defaultToConfig2,
          maxBodyLength: defaultToConfig2,
          beforeRedirect: defaultToConfig2,
          transport: defaultToConfig2,
          httpAgent: defaultToConfig2,
          httpsAgent: defaultToConfig2,
          cancelToken: defaultToConfig2,
          socketPath: defaultToConfig2,
          responseEncoding: defaultToConfig2,
          validateStatus: mergeDirectKeys,
          headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
        };
        utils$1.forEach(
          Object.keys({ ...config1, ...config2 }),
          function computeConfigValue(prop) {
            if (prop === "__proto__" || prop === "constructor" || prop === "prototype")
              return;
            const merge2 = utils$1.hasOwnProp(mergeMap, prop) ? mergeMap[prop] : mergeDeepProperties;
            const configValue = merge2(config1[prop], config2[prop], prop);
            utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
          }
        );
        return config;
      }
      const resolveConfig = (config) => {
        const newConfig = mergeConfig$1({}, config);
        let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
        newConfig.headers = headers = AxiosHeaders$1.from(headers);
        newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
        if (auth) {
          headers.set(
            "Authorization",
            "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
          );
        }
        if (utils$1.isFormData(data)) {
          if (platform$1.hasStandardBrowserEnv || platform$1.hasStandardBrowserWebWorkerEnv) {
            headers.setContentType(void 0);
          } else if (utils$1.isFunction(data.getHeaders)) {
            const formHeaders = data.getHeaders();
            const allowedHeaders = ["content-type", "content-length"];
            Object.entries(formHeaders).forEach(([key, val]) => {
              if (allowedHeaders.includes(key.toLowerCase())) {
                headers.set(key, val);
              }
            });
          }
        }
        if (platform$1.hasStandardBrowserEnv) {
          withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
          if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin(newConfig.url)) {
            const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
            if (xsrfValue) {
              headers.set(xsrfHeaderName, xsrfValue);
            }
          }
        }
        return newConfig;
      };
      const isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
      const xhrAdapter = isXHRAdapterSupported && function(config) {
        return new Promise(function dispatchXhrRequest(resolve, reject) {
          const _config = resolveConfig(config);
          let requestData = _config.data;
          const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
          let { responseType, onUploadProgress, onDownloadProgress } = _config;
          let onCanceled;
          let uploadThrottled, downloadThrottled;
          let flushUpload, flushDownload;
          function done() {
            flushUpload && flushUpload();
            flushDownload && flushDownload();
            _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
            _config.signal && _config.signal.removeEventListener("abort", onCanceled);
          }
          let request2 = new XMLHttpRequest();
          request2.open(_config.method.toUpperCase(), _config.url, true);
          request2.timeout = _config.timeout;
          function onloadend() {
            if (!request2) {
              return;
            }
            const responseHeaders = AxiosHeaders$1.from(
              "getAllResponseHeaders" in request2 && request2.getAllResponseHeaders()
            );
            const responseData = !responseType || responseType === "text" || responseType === "json" ? request2.responseText : request2.response;
            const response = {
              data: responseData,
              status: request2.status,
              statusText: request2.statusText,
              headers: responseHeaders,
              config,
              request: request2
            };
            settle(function _resolve(value) {
              resolve(value);
              done();
            }, function _reject(err) {
              reject(err);
              done();
            }, response);
            request2 = null;
          }
          if ("onloadend" in request2) {
            request2.onloadend = onloadend;
          } else {
            request2.onreadystatechange = function handleLoad() {
              if (!request2 || request2.readyState !== 4) {
                return;
              }
              if (request2.status === 0 && !(request2.responseURL && request2.responseURL.indexOf("file:") === 0)) {
                return;
              }
              setTimeout(onloadend);
            };
          }
          request2.onabort = function handleAbort() {
            if (!request2) {
              return;
            }
            reject(new AxiosError$1("Request aborted", AxiosError$1.ECONNABORTED, config, request2));
            request2 = null;
          };
          request2.onerror = function handleError(event) {
            const msg = event && event.message ? event.message : "Network Error";
            const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request2);
            err.event = event || null;
            reject(err);
            request2 = null;
          };
          request2.ontimeout = function handleTimeout() {
            let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
            const transitional2 = _config.transitional || transitionalDefaults;
            if (_config.timeoutErrorMessage) {
              timeoutErrorMessage = _config.timeoutErrorMessage;
            }
            reject(new AxiosError$1(
              timeoutErrorMessage,
              transitional2.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
              config,
              request2
            ));
            request2 = null;
          };
          requestData === void 0 && requestHeaders.setContentType(null);
          if ("setRequestHeader" in request2) {
            utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
              request2.setRequestHeader(key, val);
            });
          }
          if (!utils$1.isUndefined(_config.withCredentials)) {
            request2.withCredentials = !!_config.withCredentials;
          }
          if (responseType && responseType !== "json") {
            request2.responseType = _config.responseType;
          }
          if (onDownloadProgress) {
            [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
            request2.addEventListener("progress", downloadThrottled);
          }
          if (onUploadProgress && request2.upload) {
            [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
            request2.upload.addEventListener("progress", uploadThrottled);
            request2.upload.addEventListener("loadend", flushUpload);
          }
          if (_config.cancelToken || _config.signal) {
            onCanceled = (cancel) => {
              if (!request2) {
                return;
              }
              reject(!cancel || cancel.type ? new CanceledError$1(null, config, request2) : cancel);
              request2.abort();
              request2 = null;
            };
            _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
            if (_config.signal) {
              _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
            }
          }
          const protocol = parseProtocol(_config.url);
          if (protocol && platform$1.protocols.indexOf(protocol) === -1) {
            reject(new AxiosError$1("Unsupported protocol " + protocol + ":", AxiosError$1.ERR_BAD_REQUEST, config));
            return;
          }
          request2.send(requestData || null);
        });
      };
      const composeSignals = (signals, timeout) => {
        const { length } = signals = signals ? signals.filter(Boolean) : [];
        if (timeout || length) {
          let controller = new AbortController();
          let aborted;
          const onabort = function(reason) {
            if (!aborted) {
              aborted = true;
              unsubscribe();
              const err = reason instanceof Error ? reason : this.reason;
              controller.abort(err instanceof AxiosError$1 ? err : new CanceledError$1(err instanceof Error ? err.message : err));
            }
          };
          let timer = timeout && setTimeout(() => {
            timer = null;
            onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
          }, timeout);
          const unsubscribe = () => {
            if (signals) {
              timer && clearTimeout(timer);
              timer = null;
              signals.forEach((signal2) => {
                signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
              });
              signals = null;
            }
          };
          signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
          const { signal } = controller;
          signal.unsubscribe = () => utils$1.asap(unsubscribe);
          return signal;
        }
      };
      const streamChunk = function* (chunk, chunkSize) {
        let len = chunk.byteLength;
        if (len < chunkSize) {
          yield chunk;
          return;
        }
        let pos = 0;
        let end;
        while (pos < len) {
          end = pos + chunkSize;
          yield chunk.slice(pos, end);
          pos = end;
        }
      };
      const readBytes = async function* (iterable, chunkSize) {
        for await (const chunk of readStream(iterable)) {
          yield* streamChunk(chunk, chunkSize);
        }
      };
      const readStream = async function* (stream) {
        if (stream[Symbol.asyncIterator]) {
          yield* stream;
          return;
        }
        const reader = stream.getReader();
        try {
          for (; ; ) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }
            yield value;
          }
        } finally {
          await reader.cancel();
        }
      };
      const trackStream = (stream, chunkSize, onProgress, onFinish) => {
        const iterator2 = readBytes(stream, chunkSize);
        let bytes = 0;
        let done;
        let _onFinish = (e) => {
          if (!done) {
            done = true;
            onFinish && onFinish(e);
          }
        };
        return new ReadableStream({
          async pull(controller) {
            try {
              const { done: done2, value } = await iterator2.next();
              if (done2) {
                _onFinish();
                controller.close();
                return;
              }
              let len = value.byteLength;
              if (onProgress) {
                let loadedBytes = bytes += len;
                onProgress(loadedBytes);
              }
              controller.enqueue(new Uint8Array(value));
            } catch (err) {
              _onFinish(err);
              throw err;
            }
          },
          cancel(reason) {
            _onFinish(reason);
            return iterator2.return();
          }
        }, {
          highWaterMark: 2
        });
      };
      const DEFAULT_CHUNK_SIZE = 64 * 1024;
      const { isFunction } = utils$1;
      const globalFetchAPI = (({ Request, Response }) => ({
        Request,
        Response
      }))(utils$1.global);
      const {
        ReadableStream: ReadableStream$1,
        TextEncoder
      } = utils$1.global;
      const test = (fn, ...args) => {
        try {
          return !!fn(...args);
        } catch (e) {
          return false;
        }
      };
      const factory = (env) => {
        env = utils$1.merge.call({
          skipUndefined: true
        }, globalFetchAPI, env);
        const { fetch: envFetch, Request, Response } = env;
        const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
        const isRequestSupported = isFunction(Request);
        const isResponseSupported = isFunction(Response);
        if (!isFetchSupported) {
          return false;
        }
        const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream$1);
        const encodeText = isFetchSupported && (typeof TextEncoder === "function" ? /* @__PURE__ */ ((encoder) => (str2) => encoder.encode(str2))(new TextEncoder()) : async (str2) => new Uint8Array(await new Request(str2).arrayBuffer()));
        const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
          let duplexAccessed = false;
          const hasContentType = new Request(platform$1.origin, {
            body: new ReadableStream$1(),
            method: "POST",
            get duplex() {
              duplexAccessed = true;
              return "half";
            }
          }).headers.has("Content-Type");
          return duplexAccessed && !hasContentType;
        });
        const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
        const resolvers = {
          stream: supportsResponseStream && ((res2) => res2.body)
        };
        isFetchSupported && (() => {
          ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
            !resolvers[type] && (resolvers[type] = (res2, config) => {
              let method = res2 && res2[type];
              if (method) {
                return method.call(res2);
              }
              throw new AxiosError$1(`Response type '${type}' is not supported`, AxiosError$1.ERR_NOT_SUPPORT, config);
            });
          });
        })();
        const getBodyLength = async (body) => {
          if (body == null) {
            return 0;
          }
          if (utils$1.isBlob(body)) {
            return body.size;
          }
          if (utils$1.isSpecCompliantForm(body)) {
            const _request = new Request(platform$1.origin, {
              method: "POST",
              body
            });
            return (await _request.arrayBuffer()).byteLength;
          }
          if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
            return body.byteLength;
          }
          if (utils$1.isURLSearchParams(body)) {
            body = body + "";
          }
          if (utils$1.isString(body)) {
            return (await encodeText(body)).byteLength;
          }
        };
        const resolveBodyLength = async (headers, body) => {
          const length = utils$1.toFiniteNumber(headers.getContentLength());
          return length == null ? getBodyLength(body) : length;
        };
        return async (config) => {
          let {
            url,
            method,
            data,
            signal,
            cancelToken,
            timeout,
            onDownloadProgress,
            onUploadProgress,
            responseType,
            headers,
            withCredentials = "same-origin",
            fetchOptions
          } = resolveConfig(config);
          let _fetch = envFetch || fetch;
          responseType = responseType ? (responseType + "").toLowerCase() : "text";
          let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
          let request2 = null;
          const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
            composedSignal.unsubscribe();
          });
          let requestContentLength;
          try {
            if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
              let _request = new Request(url, {
                method: "POST",
                body: data,
                duplex: "half"
              });
              let contentTypeHeader;
              if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
                headers.setContentType(contentTypeHeader);
              }
              if (_request.body) {
                const [onProgress, flush] = progressEventDecorator(
                  requestContentLength,
                  progressEventReducer(asyncDecorator(onUploadProgress))
                );
                data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
              }
            }
            if (!utils$1.isString(withCredentials)) {
              withCredentials = withCredentials ? "include" : "omit";
            }
            const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
            const resolvedOptions = {
              ...fetchOptions,
              signal: composedSignal,
              method: method.toUpperCase(),
              headers: headers.normalize().toJSON(),
              body: data,
              duplex: "half",
              credentials: isCredentialsSupported ? withCredentials : void 0
            };
            request2 = isRequestSupported && new Request(url, resolvedOptions);
            let response = await (isRequestSupported ? _fetch(request2, fetchOptions) : _fetch(url, resolvedOptions));
            const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
            if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
              const options = {};
              ["status", "statusText", "headers"].forEach((prop) => {
                options[prop] = response[prop];
              });
              const responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
              const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
                responseContentLength,
                progressEventReducer(asyncDecorator(onDownloadProgress), true)
              ) || [];
              response = new Response(
                trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
                  flush && flush();
                  unsubscribe && unsubscribe();
                }),
                options
              );
            }
            responseType = responseType || "text";
            let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](response, config);
            !isStreamResponse && unsubscribe && unsubscribe();
            return await new Promise((resolve, reject) => {
              settle(resolve, reject, {
                data: responseData,
                headers: AxiosHeaders$1.from(response.headers),
                status: response.status,
                statusText: response.statusText,
                config,
                request: request2
              });
            });
          } catch (err) {
            unsubscribe && unsubscribe();
            if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
              throw Object.assign(
                new AxiosError$1("Network Error", AxiosError$1.ERR_NETWORK, config, request2, err && err.response),
                {
                  cause: err.cause || err
                }
              );
            }
            throw AxiosError$1.from(err, err && err.code, config, request2, err && err.response);
          }
        };
      };
      const seedCache = /* @__PURE__ */ new Map();
      const getFetch = (config) => {
        let env = config && config.env || {};
        const { fetch: fetch2, Request, Response } = env;
        const seeds = [
          Request,
          Response,
          fetch2
        ];
        let len = seeds.length, i = len, seed, target, map = seedCache;
        while (i--) {
          seed = seeds[i];
          target = map.get(seed);
          target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
          map = target;
        }
        return target;
      };
      getFetch();
      const knownAdapters = {
        http: httpAdapter,
        xhr: xhrAdapter,
        fetch: {
          get: getFetch
        }
      };
      utils$1.forEach(knownAdapters, (fn, value) => {
        if (fn) {
          try {
            Object.defineProperty(fn, "name", { value });
          } catch (e) {
          }
          Object.defineProperty(fn, "adapterName", { value });
        }
      });
      const renderReason = (reason) => `- ${reason}`;
      const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
      function getAdapter$1(adapters2, config) {
        adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
        const { length } = adapters2;
        let nameOrAdapter;
        let adapter;
        const rejectedReasons = {};
        for (let i = 0; i < length; i++) {
          nameOrAdapter = adapters2[i];
          let id;
          adapter = nameOrAdapter;
          if (!isResolvedHandle(nameOrAdapter)) {
            adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
            if (adapter === void 0) {
              throw new AxiosError$1(`Unknown adapter '${id}'`);
            }
          }
          if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
            break;
          }
          rejectedReasons[id || "#" + i] = adapter;
        }
        if (!adapter) {
          const reasons = Object.entries(rejectedReasons).map(
            ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
          );
          let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
          throw new AxiosError$1(
            `There is no suitable adapter to dispatch the request ` + s,
            "ERR_NOT_SUPPORT"
          );
        }
        return adapter;
      }
      const adapters = {
        /**
         * Resolve an adapter from a list of adapter names or functions.
         * @type {Function}
         */
        getAdapter: getAdapter$1,
        /**
         * Exposes all known adapters
         * @type {Object<string, Function|Object>}
         */
        adapters: knownAdapters
      };
      function throwIfCancellationRequested(config) {
        if (config.cancelToken) {
          config.cancelToken.throwIfRequested();
        }
        if (config.signal && config.signal.aborted) {
          throw new CanceledError$1(null, config);
        }
      }
      function dispatchRequest(config) {
        throwIfCancellationRequested(config);
        config.headers = AxiosHeaders$1.from(config.headers);
        config.data = transformData.call(
          config,
          config.transformRequest
        );
        if (["post", "put", "patch"].indexOf(config.method) !== -1) {
          config.headers.setContentType("application/x-www-form-urlencoded", false);
        }
        const adapter = adapters.getAdapter(config.adapter || defaults.adapter, config);
        return adapter(config).then(function onAdapterResolution(response) {
          throwIfCancellationRequested(config);
          response.data = transformData.call(
            config,
            config.transformResponse,
            response
          );
          response.headers = AxiosHeaders$1.from(response.headers);
          return response;
        }, function onAdapterRejection(reason) {
          if (!isCancel$1(reason)) {
            throwIfCancellationRequested(config);
            if (reason && reason.response) {
              reason.response.data = transformData.call(
                config,
                config.transformResponse,
                reason.response
              );
              reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
            }
          }
          return Promise.reject(reason);
        });
      }
      const VERSION$1 = "1.13.5";
      const validators$1 = {};
      ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
        validators$1[type] = function validator2(thing) {
          return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
        };
      });
      const deprecatedWarnings = {};
      validators$1.transitional = function transitional(validator2, version, message) {
        function formatMessage(opt, desc) {
          return "[Axios v" + VERSION$1 + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
        }
        return (value, opt, opts) => {
          if (validator2 === false) {
            throw new AxiosError$1(
              formatMessage(opt, " has been removed" + (version ? " in " + version : "")),
              AxiosError$1.ERR_DEPRECATED
            );
          }
          if (version && !deprecatedWarnings[opt]) {
            deprecatedWarnings[opt] = true;
            console.warn(
              formatMessage(
                opt,
                " has been deprecated since v" + version + " and will be removed in the near future"
              )
            );
          }
          return validator2 ? validator2(value, opt, opts) : true;
        };
      };
      validators$1.spelling = function spelling(correctSpelling) {
        return (value, opt) => {
          console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
          return true;
        };
      };
      function assertOptions(options, schema, allowUnknown) {
        if (typeof options !== "object") {
          throw new AxiosError$1("options must be an object", AxiosError$1.ERR_BAD_OPTION_VALUE);
        }
        const keys = Object.keys(options);
        let i = keys.length;
        while (i-- > 0) {
          const opt = keys[i];
          const validator2 = schema[opt];
          if (validator2) {
            const value = options[opt];
            const result = value === void 0 || validator2(value, opt, options);
            if (result !== true) {
              throw new AxiosError$1("option " + opt + " must be " + result, AxiosError$1.ERR_BAD_OPTION_VALUE);
            }
            continue;
          }
          if (allowUnknown !== true) {
            throw new AxiosError$1("Unknown option " + opt, AxiosError$1.ERR_BAD_OPTION);
          }
        }
      }
      const validator = {
        assertOptions,
        validators: validators$1
      };
      const validators = validator.validators;
      let Axios$1 = class Axios2 {
        constructor(instanceConfig) {
          this.defaults = instanceConfig || {};
          this.interceptors = {
            request: new InterceptorManager(),
            response: new InterceptorManager()
          };
        }
        /**
         * Dispatch a request
         *
         * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
         * @param {?Object} config
         *
         * @returns {Promise} The Promise to be fulfilled
         */
        async request(configOrUrl, config) {
          try {
            return await this._request(configOrUrl, config);
          } catch (err) {
            if (err instanceof Error) {
              let dummy = {};
              Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
              const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
              try {
                if (!err.stack) {
                  err.stack = stack;
                } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
                  err.stack += "\n" + stack;
                }
              } catch (e) {
              }
            }
            throw err;
          }
        }
        _request(configOrUrl, config) {
          if (typeof configOrUrl === "string") {
            config = config || {};
            config.url = configOrUrl;
          } else {
            config = configOrUrl || {};
          }
          config = mergeConfig$1(this.defaults, config);
          const { transitional: transitional2, paramsSerializer, headers } = config;
          if (transitional2 !== void 0) {
            validator.assertOptions(transitional2, {
              silentJSONParsing: validators.transitional(validators.boolean),
              forcedJSONParsing: validators.transitional(validators.boolean),
              clarifyTimeoutError: validators.transitional(validators.boolean),
              legacyInterceptorReqResOrdering: validators.transitional(validators.boolean)
            }, false);
          }
          if (paramsSerializer != null) {
            if (utils$1.isFunction(paramsSerializer)) {
              config.paramsSerializer = {
                serialize: paramsSerializer
              };
            } else {
              validator.assertOptions(paramsSerializer, {
                encode: validators.function,
                serialize: validators.function
              }, true);
            }
          }
          if (config.allowAbsoluteUrls !== void 0) ;
          else if (this.defaults.allowAbsoluteUrls !== void 0) {
            config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
          } else {
            config.allowAbsoluteUrls = true;
          }
          validator.assertOptions(config, {
            baseUrl: validators.spelling("baseURL"),
            withXsrfToken: validators.spelling("withXSRFToken")
          }, true);
          config.method = (config.method || this.defaults.method || "get").toLowerCase();
          let contextHeaders = headers && utils$1.merge(
            headers.common,
            headers[config.method]
          );
          headers && utils$1.forEach(
            ["delete", "get", "head", "post", "put", "patch", "common"],
            (method) => {
              delete headers[method];
            }
          );
          config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
          const requestInterceptorChain = [];
          let synchronousRequestInterceptors = true;
          this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
            if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
              return;
            }
            synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
            const transitional3 = config.transitional || transitionalDefaults;
            const legacyInterceptorReqResOrdering = transitional3 && transitional3.legacyInterceptorReqResOrdering;
            if (legacyInterceptorReqResOrdering) {
              requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
            } else {
              requestInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
            }
          });
          const responseInterceptorChain = [];
          this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
            responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
          });
          let promise;
          let i = 0;
          let len;
          if (!synchronousRequestInterceptors) {
            const chain = [dispatchRequest.bind(this), void 0];
            chain.unshift(...requestInterceptorChain);
            chain.push(...responseInterceptorChain);
            len = chain.length;
            promise = Promise.resolve(config);
            while (i < len) {
              promise = promise.then(chain[i++], chain[i++]);
            }
            return promise;
          }
          len = requestInterceptorChain.length;
          let newConfig = config;
          while (i < len) {
            const onFulfilled = requestInterceptorChain[i++];
            const onRejected = requestInterceptorChain[i++];
            try {
              newConfig = onFulfilled(newConfig);
            } catch (error) {
              onRejected.call(this, error);
              break;
            }
          }
          try {
            promise = dispatchRequest.call(this, newConfig);
          } catch (error) {
            return Promise.reject(error);
          }
          i = 0;
          len = responseInterceptorChain.length;
          while (i < len) {
            promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
          }
          return promise;
        }
        getUri(config) {
          config = mergeConfig$1(this.defaults, config);
          const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
          return buildURL(fullPath, config.params, config.paramsSerializer);
        }
      };
      utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
        Axios$1.prototype[method] = function(url, config) {
          return this.request(mergeConfig$1(config || {}, {
            method,
            url,
            data: (config || {}).data
          }));
        };
      });
      utils$1.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
        function generateHTTPMethod(isForm) {
          return function httpMethod(url, data, config) {
            return this.request(mergeConfig$1(config || {}, {
              method,
              headers: isForm ? {
                "Content-Type": "multipart/form-data"
              } : {},
              url,
              data
            }));
          };
        }
        Axios$1.prototype[method] = generateHTTPMethod();
        Axios$1.prototype[method + "Form"] = generateHTTPMethod(true);
      });
      let CancelToken$1 = class CancelToken2 {
        constructor(executor) {
          if (typeof executor !== "function") {
            throw new TypeError("executor must be a function.");
          }
          let resolvePromise;
          this.promise = new Promise(function promiseExecutor(resolve) {
            resolvePromise = resolve;
          });
          const token = this;
          this.promise.then((cancel) => {
            if (!token._listeners) return;
            let i = token._listeners.length;
            while (i-- > 0) {
              token._listeners[i](cancel);
            }
            token._listeners = null;
          });
          this.promise.then = (onfulfilled) => {
            let _resolve;
            const promise = new Promise((resolve) => {
              token.subscribe(resolve);
              _resolve = resolve;
            }).then(onfulfilled);
            promise.cancel = function reject() {
              token.unsubscribe(_resolve);
            };
            return promise;
          };
          executor(function cancel(message, config, request2) {
            if (token.reason) {
              return;
            }
            token.reason = new CanceledError$1(message, config, request2);
            resolvePromise(token.reason);
          });
        }
        /**
         * Throws a `CanceledError` if cancellation has been requested.
         */
        throwIfRequested() {
          if (this.reason) {
            throw this.reason;
          }
        }
        /**
         * Subscribe to the cancel signal
         */
        subscribe(listener) {
          if (this.reason) {
            listener(this.reason);
            return;
          }
          if (this._listeners) {
            this._listeners.push(listener);
          } else {
            this._listeners = [listener];
          }
        }
        /**
         * Unsubscribe from the cancel signal
         */
        unsubscribe(listener) {
          if (!this._listeners) {
            return;
          }
          const index = this._listeners.indexOf(listener);
          if (index !== -1) {
            this._listeners.splice(index, 1);
          }
        }
        toAbortSignal() {
          const controller = new AbortController();
          const abort = (err) => {
            controller.abort(err);
          };
          this.subscribe(abort);
          controller.signal.unsubscribe = () => this.unsubscribe(abort);
          return controller.signal;
        }
        /**
         * Returns an object that contains a new `CancelToken` and a function that, when called,
         * cancels the `CancelToken`.
         */
        static source() {
          let cancel;
          const token = new CancelToken2(function executor(c) {
            cancel = c;
          });
          return {
            token,
            cancel
          };
        }
      };
      function spread$1(callback) {
        return function wrap(arr) {
          return callback.apply(null, arr);
        };
      }
      function isAxiosError$1(payload) {
        return utils$1.isObject(payload) && payload.isAxiosError === true;
      }
      const HttpStatusCode$1 = {
        Continue: 100,
        SwitchingProtocols: 101,
        Processing: 102,
        EarlyHints: 103,
        Ok: 200,
        Created: 201,
        Accepted: 202,
        NonAuthoritativeInformation: 203,
        NoContent: 204,
        ResetContent: 205,
        PartialContent: 206,
        MultiStatus: 207,
        AlreadyReported: 208,
        ImUsed: 226,
        MultipleChoices: 300,
        MovedPermanently: 301,
        Found: 302,
        SeeOther: 303,
        NotModified: 304,
        UseProxy: 305,
        Unused: 306,
        TemporaryRedirect: 307,
        PermanentRedirect: 308,
        BadRequest: 400,
        Unauthorized: 401,
        PaymentRequired: 402,
        Forbidden: 403,
        NotFound: 404,
        MethodNotAllowed: 405,
        NotAcceptable: 406,
        ProxyAuthenticationRequired: 407,
        RequestTimeout: 408,
        Conflict: 409,
        Gone: 410,
        LengthRequired: 411,
        PreconditionFailed: 412,
        PayloadTooLarge: 413,
        UriTooLong: 414,
        UnsupportedMediaType: 415,
        RangeNotSatisfiable: 416,
        ExpectationFailed: 417,
        ImATeapot: 418,
        MisdirectedRequest: 421,
        UnprocessableEntity: 422,
        Locked: 423,
        FailedDependency: 424,
        TooEarly: 425,
        UpgradeRequired: 426,
        PreconditionRequired: 428,
        TooManyRequests: 429,
        RequestHeaderFieldsTooLarge: 431,
        UnavailableForLegalReasons: 451,
        InternalServerError: 500,
        NotImplemented: 501,
        BadGateway: 502,
        ServiceUnavailable: 503,
        GatewayTimeout: 504,
        HttpVersionNotSupported: 505,
        VariantAlsoNegotiates: 506,
        InsufficientStorage: 507,
        LoopDetected: 508,
        NotExtended: 510,
        NetworkAuthenticationRequired: 511,
        WebServerIsDown: 521,
        ConnectionTimedOut: 522,
        OriginIsUnreachable: 523,
        TimeoutOccurred: 524,
        SslHandshakeFailed: 525,
        InvalidSslCertificate: 526
      };
      Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
        HttpStatusCode$1[value] = key;
      });
      function createInstance(defaultConfig) {
        const context = new Axios$1(defaultConfig);
        const instance = bind(Axios$1.prototype.request, context);
        utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });
        utils$1.extend(instance, context, null, { allOwnKeys: true });
        instance.create = function create(instanceConfig) {
          return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
        };
        return instance;
      }
      const axios = createInstance(defaults);
      axios.Axios = Axios$1;
      axios.CanceledError = CanceledError$1;
      axios.CancelToken = CancelToken$1;
      axios.isCancel = isCancel$1;
      axios.VERSION = VERSION$1;
      axios.toFormData = toFormData$1;
      axios.AxiosError = AxiosError$1;
      axios.Cancel = axios.CanceledError;
      axios.all = function all2(promises) {
        return Promise.all(promises);
      };
      axios.spread = spread$1;
      axios.isAxiosError = isAxiosError$1;
      axios.mergeConfig = mergeConfig$1;
      axios.AxiosHeaders = AxiosHeaders$1;
      axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
      axios.getAdapter = adapters.getAdapter;
      axios.HttpStatusCode = HttpStatusCode$1;
      axios.default = axios;
      const {
        Axios,
        AxiosError,
        CanceledError,
        isCancel,
        CancelToken,
        VERSION,
        all,
        Cancel,
        isAxiosError,
        spread,
        toFormData,
        AxiosHeaders,
        HttpStatusCode,
        formToJSON,
        getAdapter,
        mergeConfig
      } = axios;
      var LogLevel = /* @__PURE__ */ ((LogLevel2) => {
        LogLevel2[LogLevel2["Error"] = 1] = "Error";
        LogLevel2[LogLevel2["Warn"] = 2] = "Warn";
        LogLevel2[LogLevel2["Info"] = 3] = "Info";
        LogLevel2[LogLevel2["Debug"] = 4] = "Debug";
        LogLevel2[LogLevel2["Trace"] = 5] = "Trace";
        LogLevel2[LogLevel2["OriginalTrace"] = 6] = "OriginalTrace";
        return LogLevel2;
      })(LogLevel || {});
      let globalLogLevel = 3;
      const loggerInstances = [];
      const logStyles = {
        error: "\x1B[31m%s\x1B[0m",
        warn: "\x1B[33m%s\x1B[0m",
        info: "\x1B[32m%s\x1B[0m",
        debug: "\x1B[36m%s\x1B[0m",
        trace: "\x1B[34m%s\x1B[0m"
      };
      const _Logger = class _Logger {
        constructor(name = "", logLevel = globalLogLevel) {
          __publicField(this, "name");
          __publicField(this, "logLevel");
          this.name = name;
          this.logLevel = logLevel;
          loggerInstances.push(this);
        }
        static setGlobalLogLevel(logLevel) {
          globalLogLevel = logLevel;
          loggerInstances.forEach((logger2) => logger2.setLogLevel(logLevel));
        }
        setLogLevel(logLevel) {
          this.logLevel = logLevel;
        }
        getLogLevel() {
          return this.logLevel;
        }
        error(...messages) {
          if (this.logLevel >= 1) {
            console.error(logStyles.error, `[${this.name}][ERROR]`, ...messages);
          }
        }
        warn(...messages) {
          if (this.logLevel >= 2) {
            console.warn(logStyles.warn, `[${this.name}][WARN]`, ...messages);
          }
        }
        info(...messages) {
          if (this.logLevel >= 3) {
            console.log(logStyles.info, `[${this.name}][INFO]`, ...messages);
          }
        }
        debug(...messages) {
          if (this.logLevel >= 4) {
            console.debug(logStyles.debug, `[${this.name}][DEBUG]`, ...messages);
          }
        }
        trace(...messages) {
          if (this.logLevel >= 5) {
            console.debug(logStyles.trace, `[${this.name}][TRACE]`, ...messages);
          }
        }
        originalTrace(...messages) {
          if (this.logLevel >= 6) {
            console.trace(logStyles.trace, `[${this.name}][ORIGINAL_TRACE]`, ...messages);
          }
        }
      };
      __publicField(_Logger, "rootLogger", new _Logger("root"));
      let Logger = _Logger;
      const logger$1$3 = Logger.rootLogger;
      const request = axios.create({
        timeout: 1e4,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      });
      request.defaults.baseURL = "https://43.138.246.37/";
      request.interceptors.request.use((req) => {
        const authorization = localStorage.getItem("Authorization");
        if (authorization) {
          req.headers["Authorization"] = authorization;
        }
        return req;
      });
      function handlerErrorCode(result) {
        if (!result || result.code < 5e3) {
          return;
        }
      }
      request.interceptors.response.use(
        (resp) => {
          const result = resp.data;
          if (result.code === 200) {
            return resp;
          }
          if (result.code >= 2e3 && result.code < 5e3) {
            return resp;
          }
          if (result.code === 401) {
            const authorization = localStorage.getItem("Authorization");
            if (authorization) {
              ElMessage({
                type: "error",
                message: "登录过期，请刷新页面重试"
              });
              return;
            }
            return Promise.reject(result.message);
          }
          if (result.code === 5001 || `${result.message || ""}`.includes("不存在AI坐席且试用结束")) {
            logger$1$3.info("AI代聊付费拦截已忽略", result.message);
            return Promise.reject({
              code: result.code,
              message: result.message,
              silent: true
            });
          }
          if (!result.code || result.code === 500 || result.code >= 5e3) {
            ElMessage({
              type: "error",
              message: result.message ? result.message : "系统异常"
            });
            handlerErrorCode(result);
          }
          return Promise.reject(result.message);
        },
        (error) => {
          var _a, _b;
          if ((error == null ? void 0 : error.code) === "ECONNABORTED") {
            ElMessage({
              message: "网络超时",
              type: "error",
              grouping: true,
              duration: 2e3
            });
            return Promise.reject("time out");
          }
          if ((error == null ? void 0 : error.code) === "ERR_NETWORK") {
            ElMessage({
              message: "系统异常,请稍后重试",
              type: "error",
              grouping: true,
              duration: 2e3
            });
            return Promise.reject(() => {
            });
          }
          if ((_a = error == null ? void 0 : error.response) == null ? void 0 : _a.data) {
            error.message = error.response.data.message;
          }
          if (((_b = error == null ? void 0 : error.response) == null ? void 0 : _b.status) === 404) {
            error.message = "资源未找到";
          }
          ElMessage({
            message: error == null ? void 0 : error.message,
            type: "error",
            grouping: true,
            duration: 3e3
          });
          return Promise.reject(error);
        }
      );
      const isProdEnv = () => {
        return true;
      };
      const ElMessage = exports("E", (options) => {
        if (options && options.message) {
          options.message = `[AI助理] ${options.message}`;
        }
        ElMessage$1(options);
      });
      const logger$3 = Logger.rootLogger;
      function getLocalUser() {
        let jsonData = localStorage.getItem("ai-job-user");
        if (jsonData === null) {
          jsonData = '{"phone":"","email":"","preference":{},"preferenceMap":{}}';
        }
        const user = JSON.parse(jsonData);
        logger$3.debug("获取本地用户配置", user);
        return user;
      }
      const UserStore = defineStore("ai-user", () => {
        const platformType = ref();
        const user = reactive(getLocalUser());
        return {
          user,
          platformType
        };
      });
      const LoginStore = defineStore("LoginStore", () => {
        const login = ref();
        const loginFailStatus = ref();
        function loginSuccess() {
          login.value = true;
        }
        function loginFail() {
          loginFailStatus.value = true;
        }
        return {
          login,
          loginSuccess,
          loginFailStatus,
          loginFail
        };
      });
      const logger$2 = Logger.rootLogger;
      const AI_CONFIG_EXT_STORAGE_KEY = "ai-job-ai-config-ext";
      const _GM_getValue$1 = typeof GM_getValue !== "undefined" ? GM_getValue : void 0;
      const _GM_setValue$1 = typeof GM_setValue !== "undefined" ? GM_setValue : void 0;
      const _unsafeWindow = typeof unsafeWindow !== "undefined" ? unsafeWindow : window;
      const _Tools = class _Tools {
        static fuzzyMatch(arr, input, emptyStatus) {
          if (arr.length === 0) {
            return emptyStatus;
          }
          input = input.toLowerCase();
          let emptyEle = false;
          for (let i = 0; i < arr.length; i++) {
            const arrEleStr = arr[i].toLowerCase();
            if (arrEleStr.length === 0) {
              emptyEle = true;
              continue;
            }
            if (arrEleStr.includes(input) || input.includes(arrEleStr)) {
              return true;
            }
          }
          if (emptyEle) {
            return emptyStatus;
          }
          return false;
        }
        static isRangeOverlap(range, input) {
          const parseRange = (str2) => {
            const match = str2.match(/(\d+)(?:\s*-\s*(\d+))?/);
            if (!match) {
              throw new Error("Invalid range format");
            }
            const start = parseFloat(match[1]);
            const end = match[2] ? parseFloat(match[2]) : Number.POSITIVE_INFINITY;
            return [start, end];
          };
          const [rangeStart, rangeEnd] = parseRange(range);
          const [inputStart, inputEnd] = parseRange(input);
          return !(rangeEnd < inputStart || inputEnd < rangeStart);
        }
        static isSalaryRangeMatched(range, input) {
          const parseRange = (str2) => {
            const match = `${str2 || ""}`.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
            if (!match) {
              return null;
            }
            const start = parseFloat(match[1]);
            const end = match[2] ? parseFloat(match[2]) : Number.POSITIVE_INFINITY;
            return [start, end];
          };
          const rangeParsed = parseRange(range);
          const inputParsed = parseRange(input);
          if (!rangeParsed || !inputParsed) {
            return false;
          }
          const [rangeStart, rangeEnd] = rangeParsed;
          const [inputStart] = inputParsed;
          if (inputStart < rangeStart) {
            return false;
          }
          if (Number.isFinite(rangeEnd) && inputStart > rangeEnd) {
            return false;
          }
          return true;
        }
        static getSalaryType(salaryText) {
          const text = `${salaryText || ""}`.toLowerCase();
          if (/\/\s*时|时薪|每小时|小时/.test(text)) {
            return "hour";
          }
          if (/\/\s*天|\/\s*日|日薪|每天/.test(text)) {
            return "day";
          }
          if (/k|月薪|\/\s*月|月/.test(text)) {
            return "month";
          }
          return "month";
        }
        static convertSalaryHourToDayRange(salaryText) {
          const match = `${salaryText || ""}`.match(/(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?/);
          if (!match) {
            return salaryText;
          }
          const start = parseFloat(match[1]);
          const end = match[2] ? parseFloat(match[2]) : null;
          const formatNumber = (num) => Number.isInteger(num) ? `${num}` : `${Math.round(num * 100) / 100}`;
          if (end === null) {
            return `${formatNumber(start * 8)}`;
          }
          return `${formatNumber(start * 8)}-${formatNumber(end * 8)}`;
        }
        static isSalaryTypeSupportedForFilter(salaryText, salaryFilterType) {
          const detectedType = _Tools.getSalaryType(salaryText);
          if (salaryFilterType === "1") {
            return detectedType === "month";
          }
          if (salaryFilterType === "2") {
            return detectedType === "day" || detectedType === "hour";
          }
          return true;
        }
        static getComparableSalaryRange(salaryText, salaryFilterType) {
          const detectedType = _Tools.getSalaryType(salaryText);
          if (salaryFilterType === "2" && detectedType === "hour") {
            return _Tools.convertSalaryHourToDayRange(salaryText);
          }
          return salaryText;
        }
        static buildModelChannelKey(provider, modelName) {
          return `${provider || 0}:${modelName || ""}`;
        }
        static getAiConfigExt() {
          var _a;
          const defaultExt = {
            currentConfig: {
              provider: 1,
              modelName: ""
            },
            memoryProfiles: {},
            promptPresetStore: {
              global: [],
              personal: {}
            },
            uiLayout: {
              style: "dashboard-2col"
            }
          };
          try {
            let raw = (_GM_getValue$1 == null ? void 0 : _GM_getValue$1(AI_CONFIG_EXT_STORAGE_KEY, "")) ?? "";
            if (!raw) {
              const legacyRaw = localStorage.getItem(AI_CONFIG_EXT_STORAGE_KEY);
              if (legacyRaw) {
                _GM_setValue$1 == null ? void 0 : _GM_setValue$1(AI_CONFIG_EXT_STORAGE_KEY, legacyRaw);
                localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
                raw = legacyRaw;
              }
            }
            if (!raw) {
              return defaultExt;
            }
            const parsed = JSON.parse(raw);
            return {
              ...defaultExt,
              ...parsed,
              currentConfig: {
                ...defaultExt.currentConfig,
                ...(parsed == null ? void 0 : parsed.currentConfig) || {}
              },
              promptPresetStore: {
                ...defaultExt.promptPresetStore,
                ...(parsed == null ? void 0 : parsed.promptPresetStore) || {},
                personal: {
                  ...defaultExt.promptPresetStore.personal,
                  ...((_a = parsed == null ? void 0 : parsed.promptPresetStore) == null ? void 0 : _a.personal) || {}
                }
              },
              uiLayout: {
                ...defaultExt.uiLayout,
                ...(parsed == null ? void 0 : parsed.uiLayout) || {}
              }
            };
          } catch (error) {
            logger$2.warn("读取AI扩展配置失败，使用默认配置", error == null ? void 0 : error.message);
            return defaultExt;
          }
        }
        static saveAiConfigExt(ext) {
          const data = {
            ..._Tools.getAiConfigExt(),
            ...ext || {}
          };
          _GM_setValue$1 == null ? void 0 : _GM_setValue$1(AI_CONFIG_EXT_STORAGE_KEY, JSON.stringify(data));
          localStorage.removeItem(AI_CONFIG_EXT_STORAGE_KEY);
          return data;
        }
        static getCurrentAiModelChannelKey() {
          const ext = _Tools.getAiConfigExt();
          const currentConfig = ext.currentConfig || { provider: 1, modelName: "" };
          return _Tools.buildModelChannelKey(currentConfig.provider, currentConfig.modelName);
        }
        static getRandomNumber(startMs, endMs) {
          return Math.floor(Math.random() * (endMs - startMs + 1)) + startMs;
        }
        static getCookieValue(key) {
          const cookies2 = document.cookie.split(";");
          for (const cookie of cookies2) {
            const [cookieKey, cookieValue] = cookie.trim().split("=");
            if (cookieKey === key) {
              return decodeURIComponent(cookieValue);
            }
          }
          return null;
        }
        static parseURL(url) {
          const urlObj = new URL(url);
          const pathSegments = urlObj.pathname.split("/");
          const jobId = pathSegments[2].replace(".html", "");
          const lid = urlObj.searchParams.get("lid");
          const securityId = urlObj.searchParams.get("securityId");
          return {
            securityId,
            jobId,
            lid
          };
        }
        static queryString(baseURL, queryParams) {
          const queryString = Object.entries(queryParams).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join("&");
          return `${baseURL}?${queryString}`;
        }
        static getCurDay() {
          const currentDate = /* @__PURE__ */ new Date();
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, "0");
          const day = String(currentDate.getDate()).padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
        static sleep(ms) {
          return new Promise((resolve) => setTimeout(resolve, ms));
        }
        static getEndChar() {
          return String.fromCharCode(0);
        }
      };
      __publicField(_Tools, "window", _unsafeWindow);
      let Tools = exports("T", _Tools);
      const PROMPT_VARIABLE_DEFS = [
        { key: "岗位名称", label: "{{岗位名称}}", desc: "职位名称，如 前端开发工程师" },
        { key: "公司名称", label: "{{公司名称}}", desc: "公司/品牌名" },
        { key: "薪资范围", label: "{{薪资范围}}", desc: "薪资描述，如 15-25K·14薪" },
        { key: "城市", label: "{{城市}}", desc: "工作城市" },
        { key: "区域", label: "{{区域}}", desc: "行政区" },
        { key: "商圈", label: "{{商圈}}", desc: "商圈/地段" },
        { key: "工作经验", label: "{{工作经验}}", desc: "经验要求，如 3-5年" },
        { key: "学历要求", label: "{{学历要求}}", desc: "学历要求，如 本科" },
        { key: "行业", label: "{{行业}}", desc: "公司所属行业" },
        { key: "公司规模", label: "{{公司规模}}", desc: "公司人数规模" },
        { key: "技能标签", label: "{{技能标签}}", desc: "岗位技能要求" },
        { key: "福利", label: "{{福利}}", desc: "福利待遇列表" }
      ];
      function buildPromptVarsFromJob(jobDetail) {
        if (!jobDetail) return {};
        const arr = (v) => Array.isArray(v) ? v.join(", ") : `${v || ""}`;
        return {
          "岗位名称": `${jobDetail.jobName || ""}`,
          "公司名称": `${jobDetail.brandName || ""}`,
          "薪资范围": `${jobDetail.salaryDesc || ""}`,
          "城市": `${jobDetail.cityName || ""}`,
          "区域": `${jobDetail.areaDistrict || ""}`,
          "商圈": `${jobDetail.businessDistrict || ""}`,
          "工作经验": `${jobDetail.jobExperience || ""}`,
          "学历要求": `${jobDetail.jobDegree || ""}`,
          "行业": `${jobDetail.brandIndustry || ""}`,
          "公司规模": `${jobDetail.brandScaleName || ""}`,
          "技能标签": arr(jobDetail.skills),
          "福利": arr(jobDetail.welfareList)
        };
      }
      function resolvePromptVariables(template, vars) {
        if (!template) return template;
        return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const trimmed = key.trim();
          return trimmed in vars ? vars[trimmed] : match;
        });
      }
      const _GM_addValueChangeListener = typeof GM_addValueChangeListener !== "undefined" ? GM_addValueChangeListener : void 0;
      const _GM_getValue = typeof GM_getValue !== "undefined" ? GM_getValue : void 0;
      const _GM_notification = typeof GM_notification !== "undefined" ? GM_notification : void 0;
      const _GM_setValue = typeof GM_setValue !== "undefined" ? GM_setValue : void 0;
      const _GM_xmlhttpRequest$2 = typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : void 0;
      const _TampermonkeyApi = class _TampermonkeyApi {
        constructor() {
          _TampermonkeyApi.CUR_CK = (_GM_getValue == null ? void 0 : _GM_getValue("ck_cur", "")) ?? "";
        }
        static GmSetValue(key, val) {
          _GM_setValue == null ? void 0 : _GM_setValue(_TampermonkeyApi.CUR_CK + key, val);
        }
        static GmGetValue(key, defVal) {
          return (_GM_getValue == null ? void 0 : _GM_getValue(_TampermonkeyApi.CUR_CK + key, defVal)) ?? defVal;
        }
        static GMXmlHttpRequest(options) {
          if (!_GM_xmlhttpRequest$2) {
            throw new Error("GM_xmlhttpRequest is not available");
          }
          return _GM_xmlhttpRequest$2(options);
        }
        static GmAddValueChangeListener(key, func) {
          return (_GM_addValueChangeListener == null ? void 0 : _GM_addValueChangeListener(_TampermonkeyApi.CUR_CK + key, func)) ?? -1;
        }
        static GmNotification(content) {
          _GM_notification == null ? void 0 : _GM_notification({
            title: "Boss直聘批量投简历",
            image: "https://img.bosszhipin.com/beijin/mcs/banner/3e9d37e9effaa2b6daf43f3f03f7cb15cfcd208495d565ef66e7dff9f98764da.jpg",
            text: content,
            highlight: true,
            silent: true,
            timeout: 1e4,
            onclick: () => {
            },
            ondone: () => {
            }
          });
        }
      };
      __publicField(_TampermonkeyApi, "CUR_CK", "");
      __publicField(_TampermonkeyApi, "LOCAL_CONFIG", "config");
      __publicField(_TampermonkeyApi, "PUSH_SUCCESS_COUNT", "pushSuccessCount:" + Tools.getCurDay());
      __publicField(_TampermonkeyApi, "PUSH_FAIL_COUNT", "pushFailCount:" + Tools.getCurDay());
      __publicField(_TampermonkeyApi, "ACTIVE_ENABLE", "activeEnable");
      __publicField(_TampermonkeyApi, "PUSH_LIMIT", "push_limit" + Tools.getCurDay());
      __publicField(_TampermonkeyApi, "PUSH_LOCK", "push_lock");
      __publicField(_TampermonkeyApi, "cnInKey", "companyNameInclude");
      __publicField(_TampermonkeyApi, "cnExKey", "companyNameExclude");
      __publicField(_TampermonkeyApi, "jnInKey", "jobNameInclude");
      __publicField(_TampermonkeyApi, "jcExKey", "jobContentExclude");
      __publicField(_TampermonkeyApi, "srInKey", "salaryRange");
      __publicField(_TampermonkeyApi, "csrInKey", "companyScaleRange");
      __publicField(_TampermonkeyApi, "sgInKey", "sendSelfGreet");
      __publicField(_TampermonkeyApi, "SEND_SELF_GREET_MEMORY", "sendSelfGreetMemory");
      let TampermonkeyApi = _TampermonkeyApi;
      const pushResultCount = defineStore("pushResultCount", () => {
        const notMatchCount = ref(0);
        const successCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, 0));
        const onceSuccessCount = ref(0);
        const failCount = ref(TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_FAIL_COUNT, 0));
        function notMatchIncr() {
          notMatchCount.value++;
        }
        function successIncr() {
          successCount.value++;
          onceSuccessCount.value++;
          TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, successCount.value);
        }
        function failIncr() {
          failCount.value++;
          TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_FAIL_COUNT, failCount.value);
        }
        function clearOnceSuccessCount() {
          onceSuccessCount.value = 0;
        }
        function clearCounts() {
          notMatchCount.value = 0;
          successCount.value = 0;
          failCount.value = 0;
          onceSuccessCount.value = 0;
          TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_SUCCESS_COUNT, successCount.value);
          TampermonkeyApi.GmSetValue(TampermonkeyApi.PUSH_FAIL_COUNT, failCount.value);
        }
        return {
          notMatchIncr,
          successIncr,
          notMatchCount,
          successCount,
          failCount,
          failIncr,
          onceSuccessCount,
          clearOnceSuccessCount,
          clearCounts
        };
      });
      class AIJobHuntingError extends Error {
        constructor(message) {
          super(message);
        }
      }
      class PlatformError extends AIJobHuntingError {
        constructor(platformType, message) {
          super(message);
          __publicField(this, "platform");
          this.platform = platformType;
        }
      }
      class PushException extends AIJobHuntingError {
      }
      class NotMatchException extends PushException {
        constructor(jobTitle, data, message = "") {
          super(message);
          __publicField(this, "jobTitle");
          __publicField(this, "data");
          this.jobTitle = jobTitle;
          this.data = data;
        }
      }
      class PushReqException extends PushException {
        constructor(jobTitle, message = "") {
          super(message);
          __publicField(this, "jobTitle");
          this.jobTitle = jobTitle;
        }
      }
      class CollectReqException extends PushException {
        constructor(jobTitle, message = "") {
          super(message);
          __publicField(this, "jobTitle");
          this.jobTitle = jobTitle;
        }
      }
      class FetchJobBossFailExp extends PushException {
        constructor(jobTitle, message = "") {
          super(message);
          __publicField(this, "jobTitle");
          this.jobTitle = jobTitle;
        }
      }
      class PublishStopExp extends PushException {
      }
      class PublishLimitExp extends PushException {
      }
      const logger$1$2 = Logger.rootLogger;
      let pushResultCounter = {};
      let userStore$2 = {};
      function bindPlatformRuntime(counter, userStore) {
        pushResultCounter = counter;
        userStore$2 = userStore;
      }
      function runtimeCounter() {
        return pushResultCounter;
      }
      function runtimeUserStore() {
        return userStore$2;
      }
      var PushStatus = /* @__PURE__ */ ((PushStatus2) => {
        PushStatus2[PushStatus2["NOT_START"] = 0] = "NOT_START";
        PushStatus2[PushStatus2["PUSHING"] = 1] = "PUSHING";
        PushStatus2[PushStatus2["PAUSE"] = 2] = "PAUSE";
        PushStatus2[PushStatus2["LIMIT"] = 3] = "LIMIT";
        return PushStatus2;
      })(PushStatus || {});
      var PushResultStatus = /* @__PURE__ */ ((PushResultStatus2) => {
        PushResultStatus2[PushResultStatus2["NOT_START"] = -1] = "NOT_START";
        PushResultStatus2[PushResultStatus2["SUCCESS"] = 0] = "SUCCESS";
        PushResultStatus2[PushResultStatus2["FAIL"] = 1] = "FAIL";
        return PushResultStatus2;
      })(PushResultStatus || {});
      const _LogRecorder = class _LogRecorder extends Logger {
        constructor(name = "") {
          super(name);
          __publicField(this, "persistTimer", null);
          __publicField(this, "maxLogs", 1e3);
          this.loadLogsFromStorage();
          this.startPersistTimer();
        }
        loadLogsFromStorage() {
          const storedLogs = TampermonkeyApi.GmGetValue(_LogRecorder.LOGS_STORAGE_KEY, []);
          const existingTimestamps = new Set(_LogRecorder.logs.map((log) => log.timestamp));
          const uniqueStoredLogs = storedLogs.filter((log) => !existingTimestamps.has(log.timestamp));
          _LogRecorder.logs = [..._LogRecorder.logs, ...uniqueStoredLogs];
        }
        startPersistTimer() {
          this.persistTimer = window.setInterval(() => {
            this.persistLogs();
          }, 1e4);
        }
        persistLogs() {
          TampermonkeyApi.GmSetValue(_LogRecorder.LOGS_STORAGE_KEY, _LogRecorder.logs);
        }
        clearLogs() {
          _LogRecorder.logs = [];
          this.persistLogs();
        }
        addLog(level, message) {
          const timestamp = (/* @__PURE__ */ new Date()).toLocaleTimeString();
          _LogRecorder.logs.push({ level, message, timestamp });
          if (_LogRecorder.logs.length > this.maxLogs) {
            _LogRecorder.logs.shift();
          }
        }
        error(...messages) {
          const msg = messages.join(" ");
          this.addLog("error", msg);
          super.error(msg);
        }
        warn(...messages) {
          const msg = messages.join(" ");
          this.addLog("warn", msg);
          super.warn(msg);
        }
        info(...messages) {
          const msg = messages.join(" ");
          this.addLog("info", msg);
          super.info(msg);
        }
        debug(...messages) {
          const msg = messages.join(" ");
          this.addLog("debug", msg);
          super.debug(msg);
        }
        trace(...messages) {
          const msg = messages.join(" ");
          this.addLog("trace", msg);
          super.trace(msg);
        }
        getLogs(page, pageSize) {
          const start = (page - 1) * pageSize;
          return _LogRecorder.logs.slice(start, start + pageSize);
        }
        getLogCount() {
          return _LogRecorder.logs.length;
        }
      };
      __publicField(_LogRecorder, "LOGS_STORAGE_KEY", "logs_data");
      __publicField(_LogRecorder, "logs", []);
      let LogRecorder = _LogRecorder;
      class AbsPlatform {
        constructor() {
          __publicField(this, "logRecorder", new LogRecorder("recorder"));
          __publicField(this, "pushStatus", 0);
          __publicField(this, "_pushMock", false);
          __publicField(this, "_selfDefPushCountLimit", -1);
          __publicField(this, "_collectMode", false);
          __publicField(this, "next", async () => {
            const next = this.hasNext();
            if (!next) {
              this.logRecorder.info("无下一页数据");
              return false;
            }
            await Tools.sleep(runtimeUserStore().user.preference.npi * 1e3);
            this.acquireDataPre();
            await Tools.sleep(3e3);
            return next;
          });
        }
        set pushMock(value) {
          this._pushMock = value;
        }
        set selfDefPushCountLimit(value) {
          this._selfDefPushCountLimit = value;
        }
        set collectMode(value) {
          this._collectMode = value;
        }
        get selfDefPushCountLimit() {
          return this._selfDefPushCountLimit;
        }
        get collectMode() {
          return this._collectMode;
        }
        async startPush() {
          const actionName = this._collectMode ? "收藏" : "投递";
          this.logRecorder.info(`开始${actionName}`);
          runtimeCounter().clearOnceSuccessCount();
          this.pushStatus = 1;
          this.startPreHandler();
          do {
            const jobList = this.getJobList();
            for (const jobDetail of jobList) {
              try {
                this.preMatchJob();
                await this.matchJob(jobDetail);
                if (this._collectMode) {
                  this.collectPreHandler(jobDetail);
                  const collectResult = await this.collect(jobDetail);
                  await this.collectAfterHandler(collectResult, jobDetail);
                  continue;
                }
                this.pushPreHandler(jobDetail);
                const pushResult = await this.push(jobDetail);
                await this.pushAfterHandler(pushResult, jobDetail);
              } catch (error) {
                switch (true) {
                  case error instanceof NotMatchException:
                    if (this.logRecorder.getLogLevel() === LogLevel.Debug) {
                      this.logRecorder.info(`工作【${error.jobTitle}】被过滤 原因：${error.message} 当前值:${error.data}`);
                    } else {
                      this.logRecorder.info(`工作【${error.jobTitle}】被过滤 原因：${error.message}`);
                    }
                    runtimeCounter().notMatchIncr();
                    break;
                  case error instanceof PushReqException:
                  case error instanceof CollectReqException:
                    this.logRecorder.warn(`工作【${error.jobTitle}】${actionName}失败 原因：${error.message}`);
                    runtimeCounter().failIncr();
                    break;
                  case error instanceof FetchJobBossFailExp:
                    this.logRecorder.warn(`工作【${error.jobTitle}】发送自定义招呼语失败 原因：${error.message}`);
                    break;
                  case error instanceof PublishStopExp:
                    this.logRecorder.info(`手动暂停${actionName} ${error.message}`);
                    return;
                  case error instanceof PublishLimitExp:
                    this.logRecorder.info(`停止${actionName} ${error.message}`);
                    return;
                  default: {
                    const isNetwork = this.isNetworkError(error);
                    if (isNetwork) {
                      const maxRetries = 3;
                      let retried = false;
                      for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        const delayMs = Math.pow(2, attempt) * 1e3;
                        this.logRecorder.warn(`网络异常，${delayMs / 1e3}s 后第 ${attempt}/${maxRetries} 次重试... 原因：${(error == null ? void 0 : error.message) || error}`);
                        await Tools.sleep(delayMs);
                        if (this.pushStatus === 2) {
                          this.logRecorder.info(`重试期间手动暂停`);
                          return;
                        }
                        try {
                          this.preMatchJob();
                          await this.matchJob(jobDetail);
                          if (this._collectMode) {
                            this.collectPreHandler(jobDetail);
                            const collectResult = await this.collect(jobDetail);
                            await this.collectAfterHandler(collectResult, jobDetail);
                          } else {
                            this.pushPreHandler(jobDetail);
                            const pushResult = await this.push(jobDetail);
                            await this.pushAfterHandler(pushResult, jobDetail);
                          }
                          retried = true;
                          break;
                        } catch (retryError) {
                          if (!this.isNetworkError(retryError)) {
                            logger$1$2.error("重试后非网络异常--->", retryError);
                            break;
                          }
                          if (attempt === maxRetries) {
                            this.logRecorder.error(`网络异常重试 ${maxRetries} 次后仍失败，暂停${actionName}`);
                            this.pushStatus = 2;
                            return;
                          }
                        }
                      }
                    } else {
                      logger$1$2.error("未捕获异常--->", error);
                    }
                  }
                }
              }
            }
          } while (await this.next());
          this.logRecorder.info(`结束${actionName}`);
        }
        pausePush() {
        }
        /** 检测是否为网络异常 */
        isNetworkError(error) {
          if (!error) return false;
          const code2 = (error == null ? void 0 : error.code) || "";
          if (["ECONNABORTED", "ERR_NETWORK", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"].includes(code2)) return true;
          const msg = `${(error == null ? void 0 : error.message) || ""}`.toLowerCase();
          return msg.includes("timeout") || msg.includes("network") || msg.includes("econnaborted") || msg.includes("fetch");
        }
        preMatchJob() {
          if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
            throw new PublishLimitExp("自定义投递次数限制");
          }
          if (this.pushStatus === 2) {
            throw new PublishStopExp("手动暂停投递");
          }
        }
        async push(jobDetail) {
          if (this.pushStatus === 2) {
            throw new PublishStopExp("手动暂停投递");
          }
          if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
            throw new PublishLimitExp("自定义投递次数限制");
          }
          const limitResult = this.isLimit(jobDetail);
          if (limitResult.limit) {
            throw new PublishLimitExp(limitResult.msg);
          }
          if (this._pushMock) {
            const jobTitle = this.getJobKey(jobDetail);
            logger$1$2.debug("mock投递 ", jobTitle);
            return {
              message: "Success",
              code: 0
            };
          }
          return await this.doPush(jobDetail);
        }
        collectPreHandler(jobDetail) {
          return jobDetail;
        }
        async collect(jobDetail) {
          if (this.pushStatus === 2) {
            throw new PublishStopExp("手动暂停收藏");
          }
          if (this._selfDefPushCountLimit !== -1 && runtimeCounter().onceSuccessCount >= this._selfDefPushCountLimit) {
            throw new PublishLimitExp("自定义收藏次数限制");
          }
          if (this._pushMock) {
            const jobTitle = this.getJobKey(jobDetail);
            logger$1$2.debug("mock收藏 ", jobTitle);
            return {
              message: "Success",
              code: 0
            };
          }
          return await this.doCollect(jobDetail);
        }
        async collectAfterHandler(collectResult, jobDetail) {
          const jobTitle = this.getJobKey(jobDetail);
          if (collectResult.message === "Success" && collectResult.code === 0 && collectResult.verified !== false) {
            runtimeCounter().successIncr();
            this.logRecorder.info(`工作【${jobTitle}】 收藏成功`);
            return jobDetail;
          }
          throw new CollectReqException(jobTitle, collectResult.message || "收藏未确认成功");
        }
        async doCollect(_jobDetail) {
          return {
            message: "当前平台暂不支持收藏",
            code: 1
          };
        }
        isLimit(jobDetail) {
          return {
            limit: false,
            msg: this.getJobKey(jobDetail)
          };
        }
        getFistJobDetail() {
          return this.getJobList()[0];
        }
      }
      const _GM_xmlhttpRequest$1 = typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : void 0;
      async function fetchWithGM_request(url, options = {}) {
        return new Promise((resolve, reject) => {
          if (!_GM_xmlhttpRequest$1) {
            reject(new Error("GM_xmlhttpRequest is not available"));
            return;
          }
          _GM_xmlhttpRequest$1({
            method: options.method || "GET",
            url,
            headers: options.headers,
            responseType: options.responseType || "json",
            data: options.data,
            onload: (response) => {
              if (response.status === 200) {
                resolve(response);
              } else {
                reject(new Error(`Request failed with status: ${response.status}`));
              }
            },
            onerror: () => {
              reject(new Error("Network error"));
            },
            ontimeout: () => {
              reject(new Error("Request timed out"));
            }
          });
        });
      }
      const logger$1$1 = Logger.rootLogger;
      const logRecorder$2 = new LogRecorder();
      let loginIng = false;
      const silentlyLogin = async (bossUserId) => {
        var _a, _b, _c, _d, _e, _f;
        let loginCount = 0;
        while (loginIng && loginCount < 6) {
          logger$1$1.info("login... ", loginCount);
          await Tools.sleep(500);
          loginCount++;
        }
        loginIng = true;
        const loginStore = LoginStore();
        let token = (_b = (_a = Tools.window) == null ? void 0 : _a._PAGE) == null ? void 0 : _b.token;
        let count = 0;
        while (!token && count < 3) {
          await Tools.sleep(300);
          token = (_d = (_c = Tools.window) == null ? void 0 : _c._PAGE) == null ? void 0 : _d.token;
          count++;
        }
        if (!token) {
          logRecorder$2.info("未登录Boss，静默登录结束");
          return Promise.reject(new Error("未登录Boss，静默登录失败"));
        }
        if (!bossUserId) {
          bossUserId = (_f = (_e = Tools.window) == null ? void 0 : _e._PAGE) == null ? void 0 : _f.uid;
        }
        if (loginStore.login) {
          logger$1$1.info("已经登录，静默登录结束");
          loginIng = false;
          return Promise.resolve();
        }
        return await request.post(`/api/user/silently/login?uniqueId=${bossUserId}`).then(async (resp) => {
          if (resp.data.code === 2e3) {
            logRecorder$2.info("开始自动注册");
            await handlerImport({ value: false });
            loginStore.loginSuccess();
            return;
          }
          localStorage.setItem("Authorization", resp.data.data);
          loginStore.loginSuccess();
          logRecorder$2.info("静默登录成功");
        }).catch((e) => {
          logRecorder$2.error("静默登录失败", e);
          loginStore.loginFail();
          return Promise.reject(e);
        }).finally(() => {
          loginIng = false;
        });
      };
      const loginInterceptor = () => {
        var _a, _b;
        const token = (_b = (_a = Tools.window) == null ? void 0 : _a._PAGE) == null ? void 0 : _b.token;
        if (!token) {
          ElMessage({
            message: "请先登录Boss",
            type: "error",
            duration: 3e3
          });
          return false;
        }
        return true;
      };
      const handlerImport = async (importResumeLoading) => {
        var _a, _b, _c, _d;
        if (!loginInterceptor()) {
          return;
        }
        const token = (_b = (_a = Tools.window) == null ? void 0 : _a._PAGE) == null ? void 0 : _b.token;
        const bossUserId = (_d = (_c = Tools.window) == null ? void 0 : _c._PAGE) == null ? void 0 : _d.uid;
        if (!bossUserId) {
          ElMessage({
            message: "未获取到Boss userId 请刷新页面重试",
            type: "error",
            duration: 3e3
          });
          return;
        }
        importResumeLoading.value = true;
        const resumeInfoResp = await axios.get("https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json", {
          headers: { Zp_token: token }
        });
        const zpData = resumeInfoResp.data.zpData;
        if (!zpData.attachmentList || zpData.attachmentList.length === 0) {
          importResumeLoading.value = false;
          ElMessage({
            message: "请先在BOSS个人中心上传附件简历；作为AI代聊定制化回复的基础",
            type: "error",
            duration: 3e3
          });
          return;
        }
        const resumeId = zpData.attachmentList[0].resumeId;
        const resumeFileResp = await fetchWithGM_request(
          `https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=${resumeId}`,
          { headers: { Zp_token: token }, responseType: "arraybuffer" }
        );
        const fileBlob = new Blob([resumeFileResp.response], { type: "application/pdf" });
        const formData = new FormData();
        formData.append("file", fileBlob);
        formData.append("resumeId", resumeId);
        formData.append("uniqueId", bossUserId);
        const importResp = await request.post("/api/user/import/resume", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        if (importResp.data.code !== 200) {
          ElMessage({
            message: `导入简历失败${importResp.data.data.msg}`,
            type: "error",
            duration: 3e3
          });
          importResumeLoading.value = false;
          return;
        }
        const loginResp = await request.post(`/api/user/silently/login?uniqueId=${bossUserId}`);
        localStorage.setItem("Authorization", loginResp.data.data);
        if (!importResp.data.data.email) {
          importResumeLoading.value = false;
          return;
        }
        ElMessage({
          message: "导入简历成功",
          type: "success",
          duration: 3e3
        });
        importResumeLoading.value = false;
      };
      const logRecorder$1 = new LogRecorder();
      function userRemoteLoad() {
        logRecorder$1.info("加载用户偏好配置");
        const userStore2 = UserStore();
        const loginStore = LoginStore();
        if (loginStore.loginFailStatus) {
          return;
        }
        silentlyLogin("").then(() => {
          logger$1$1.debug("调用接口加载用户偏好配置");
          return request.post("/api/user/userinfo", {});
        }).then((resp) => {
          var _a;
          userStore2.user = (_a = resp == null ? void 0 : resp.data) == null ? void 0 : _a.data;
          if (!(userStore2 == null ? void 0 : userStore2.user)) {
            userStore2.user = {};
            throw new Error("用户偏好配置为空");
          }
          userStore2.user.preference.pi = userStore2.user.preference.pi || 3;
          userStore2.user.preference.npi = userStore2.user.preference.npi || 6;
          logRecorder$1.info("加载用户偏好配置成功");
        }).catch((error) => {
          loginStore.loginFail();
          logRecorder$1.error("加载用户偏好配置失败", error.message);
        }).finally(() => {
          if (!userStore2.user.preference) {
            userStore2.user.preference = {};
          }
        });
      }
      const _GM_xmlhttpRequest = typeof GM_xmlhttpRequest !== "undefined" ? GM_xmlhttpRequest : void 0;
      function getActiveDirectConfig() {
        const ext = Tools.getAiConfigExt();
        const apiConfigs = Array.isArray(ext.apiConfigs) ? ext.apiConfigs : [];
        const activeId = ext.activeApiConfigId || "";
        if (!activeId || !apiConfigs.length) {
          return null;
        }
        const active = apiConfigs.find((c) => c.id === activeId && c.status === 1);
        if (!active || !active.baseUrl || !active.apiKey || !active.modelName) {
          return null;
        }
        return {
          baseUrl: active.baseUrl,
          apiKey: active.apiKey,
          modelName: active.modelName,
          apiFormat: active.apiFormat || "completions",
          timeout: Number(active.timeout || 60)
        };
      }
      async function directAiCall(config, messages) {
        if (!_GM_xmlhttpRequest) {
          throw new Error("GM_xmlhttpRequest 不可用");
        }
        const { baseUrl, apiKey, modelName, apiFormat, timeout } = config;
        const timeoutMs = (timeout || 60) * 1e3;
        if (apiFormat === "responses") {
          return callResponsesApi(baseUrl, apiKey, modelName, messages, timeoutMs);
        }
        return callCompletionsApi(baseUrl, apiKey, modelName, messages, timeoutMs);
      }
      function callCompletionsApi(baseUrl, apiKey, modelName, messages, timeoutMs) {
        const url = `${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
        const body = JSON.stringify({
          model: modelName,
          messages: messages.map((m) => ({ role: m.role, content: m.content }))
        });
        return gmRequest(url, apiKey, body, timeoutMs).then((data) => {
          var _a, _b;
          const choice = (_a = data == null ? void 0 : data.choices) == null ? void 0 : _a[0];
          return ((_b = choice == null ? void 0 : choice.message) == null ? void 0 : _b.content) || "";
        });
      }
      function callResponsesApi(baseUrl, apiKey, modelName, messages, timeoutMs) {
        const url = `${baseUrl.replace(/\/+$/, "")}/v1/responses`;
        const input = messages.map((m) => ({
          type: "message",
          role: m.role === "system" ? "developer" : m.role,
          content: [{ type: "input_text", text: m.content }]
        }));
        const body = JSON.stringify({
          model: modelName,
          input
        });
        return gmRequest(url, apiKey, body, timeoutMs).then((data) => {
          const output = Array.isArray(data == null ? void 0 : data.output) ? data.output : [];
          const msgOutput = output.find((o) => o.type === "message");
          if (!msgOutput) {
            return "";
          }
          const contentArr = Array.isArray(msgOutput.content) ? msgOutput.content : [];
          const textParts = contentArr.filter((c) => c.type === "output_text").map((c) => c.text || "");
          return textParts.join("");
        });
      }
      function gmRequest(url, apiKey, body, timeoutMs) {
        return new Promise((resolve, reject) => {
          if (!_GM_xmlhttpRequest) {
            reject(new Error("GM_xmlhttpRequest 不可用"));
            return;
          }
          _GM_xmlhttpRequest({
            method: "POST",
            url,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`
            },
            data: body,
            responseType: "json",
            timeout: timeoutMs,
            onload: (response) => {
              var _a, _b;
              if (response.status >= 200 && response.status < 300) {
                const data = typeof response.response === "string" ? JSON.parse(response.response) : response.response;
                resolve(data);
              } else {
                const errMsg = typeof response.response === "object" ? ((_b = (_a = response.response) == null ? void 0 : _a.error) == null ? void 0 : _b.message) || JSON.stringify(response.response) : response.responseText || `HTTP ${response.status}`;
                reject(new Error(errMsg));
              }
            },
            onerror: (err) => {
              reject(new Error(`网络错误: 请检查 URL 是否正确，或刷新页面后在油猴弹窗中允许跨域请求 (${url})`));
            },
            ontimeout: () => {
              reject(new Error("请求超时"));
            }
          });
        });
      }
      function wrapAsBackendResponse(answerContent) {
        return {
          data: {
            code: 200,
            data: {
              answerContent,
              answerTypeList: [1],
              // MSG_TEXT
              operationTypeList: []
            }
          }
        };
      }
      async function directAsk(question, systemPrompt, messageHistory, config) {
        const messages = [];
        if (systemPrompt) {
          messages.push({ role: "system", content: systemPrompt });
        }
        if (messageHistory.length) {
          messages.push(...messageHistory);
        }
        messages.push({ role: "user", content: question });
        try {
          const answer = await directAiCall(config, messages);
          return wrapAsBackendResponse(answer || "(AI 未返回内容)");
        } catch (e) {
          return wrapAsBackendResponse(`[AI调用失败] ${(e == null ? void 0 : e.message) || e}`);
        }
      }
      async function directTest(config) {
        const messages = [
          { role: "user", content: "你好，请简短回复确认连接正常。" }
        ];
        return directAiCall(config, messages);
      }
      const DEFAULT_MIN = 2e3;
      const DEFAULT_MAX = 5e3;
      class RequestThrottle {
        constructor(opts) {
          __publicField(this, "queue", []);
          __publicField(this, "running", false);
          __publicField(this, "minDelay");
          __publicField(this, "maxDelay");
          __publicField(this, "_aborted", false);
          __publicField(this, "lastExecTime", 0);
          this.minDelay = (opts == null ? void 0 : opts.minDelay) ?? DEFAULT_MIN;
          this.maxDelay = (opts == null ? void 0 : opts.maxDelay) ?? DEFAULT_MAX;
        }
        /** 入队一个异步请求，返回 Promise */
        enqueue(fn) {
          if (this._aborted) return Promise.reject(new Error("Throttle aborted"));
          return new Promise((resolve, reject) => {
            this.queue.push({ fn, resolve, reject });
            this.drain();
          });
        }
        /** 中止所有排队请求 */
        abort() {
          this._aborted = true;
          const pending = this.queue.splice(0);
          pending.forEach((item) => item.reject(new Error("Throttle aborted")));
        }
        /** 重置中止状态，允许重新使用 */
        reset() {
          this._aborted = false;
        }
        /** 当前队列长度 */
        get pending() {
          return this.queue.length;
        }
        async drain() {
          if (this.running) return;
          this.running = true;
          while (this.queue.length > 0 && !this._aborted) {
            const item = this.queue.shift();
            const elapsed = Date.now() - this.lastExecTime;
            const targetDelay = this.minDelay + Tools.getRandomNumber(0, this.maxDelay - this.minDelay);
            const waitTime = Math.max(0, targetDelay - elapsed);
            if (waitTime > 0 && this.lastExecTime > 0) {
              await Tools.sleep(waitTime);
            }
            if (this._aborted) {
              item.reject(new Error("Throttle aborted"));
              break;
            }
            try {
              this.lastExecTime = Date.now();
              const result = await item.fn();
              item.resolve(result);
            } catch (e) {
              this.lastExecTime = Date.now();
              item.reject(e);
            }
          }
          this.running = false;
        }
      }
      const bossThrottle = new RequestThrottle({
        minDelay: DEFAULT_MIN,
        maxDelay: DEFAULT_MAX
      });
      const STALE_DAYS = 14;
      const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1e3;
      const HISTORY_MSG_COUNT = 10;
      function getZpToken() {
        return Tools.getCookieValue("bst") || "";
      }
      async function fetchFriendList() {
        var _a, _b, _c;
        const resp = await axios.get(
          "https://www.zhipin.com/wapi/zprelation/friend/geekFilterByLabel?labelId=0"
        );
        if (((_a = resp.data) == null ? void 0 : _a.message) === "当前登录状态已失效") {
          throw new Error("未登录 BOSS 直聘");
        }
        const list = (_c = (_b = resp.data) == null ? void 0 : _b.zpData) == null ? void 0 : _c.friendList;
        if (!Array.isArray(list)) return [];
        return list.map((f) => ({
          friendId: f.friendId,
          encryptFriendId: f.encryptFriendId || "",
          name: f.name || "",
          updateTime: f.updateTime || 0,
          brandName: f.brandName || ""
        }));
      }
      async function fetchFriendDetails(friendIds) {
        var _a, _b;
        if (!friendIds.length) return [];
        const ids = friendIds.slice(0, 199).join(",");
        const resp = await axios.get(
          "https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?friendIds=" + ids
        );
        const list = (_b = (_a = resp.data) == null ? void 0 : _a.zpData) == null ? void 0 : _b.result;
        if (!Array.isArray(list)) return [];
        return list.map((f) => ({
          uid: f.uid,
          encryptBossId: f.encryptBossId || "",
          securityId: f.securityId || "",
          encryptJobId: f.encryptJobId || "",
          brandName: f.brandName || "",
          title: f.title || "",
          name: f.name || ""
        }));
      }
      async function fetchHistoryMessages(encryptBossId, securityId, count = HISTORY_MSG_COUNT) {
        var _a, _b;
        const params = new URLSearchParams({
          bossId: encryptBossId,
          groupId: encryptBossId,
          maxMsgId: "0",
          c: String(count),
          page: "1",
          src: "0",
          securityId,
          loading: "true",
          _t: String(Date.now())
        });
        const resp = await axios.get(
          "https://www.zhipin.com/wapi/zpchat/geek/historyMsg?" + params.toString()
        );
        const messages = (_b = (_a = resp.data) == null ? void 0 : _a.zpData) == null ? void 0 : _b.messages;
        if (!Array.isArray(messages)) return [];
        return messages.map((m) => {
          var _a2, _b2, _c, _d;
          return {
            mid: m.mid,
            time: m.time || 0,
            fromUid: ((_a2 = m.from) == null ? void 0 : _a2.uid) || 0,
            toUid: ((_b2 = m.to) == null ? void 0 : _b2.uid) || 0,
            bodyType: ((_c = m.body) == null ? void 0 : _c.type) || 0,
            text: ((_d = m.body) == null ? void 0 : _d.text) || ""
          };
        });
      }
      async function deleteFriend(securityId) {
        var _a, _b;
        const token = getZpToken();
        if (!token) return { ok: false, message: "未获取到 Zp_token" };
        const resp = await axios.post(
          "https://www.zhipin.com/wapi/zprelation/friend/delete.json",
          "securityId=" + encodeURIComponent(securityId),
          {
            headers: {
              "Zp_token": token,
              "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
            }
          }
        );
        const code2 = (_a = resp.data) == null ? void 0 : _a.code;
        if (code2 === 0) return { ok: true, message: "" };
        return { ok: false, message: ((_b = resp.data) == null ? void 0 : _b.message) || `code=${code2}` };
      }
      const REJECT_KEYWORDS = [
        "不合适",
        "不太合适",
        "不匹配",
        "不太匹配",
        "暂不考虑",
        "不考虑",
        "岗位已关闭",
        "岗位已满",
        "已招到",
        "已经招到",
        "不太符合",
        "不符合",
        "抱歉",
        "很遗憾",
        "祝您求职顺利",
        "再看看其他",
        "已向您表达不合适"
      ];
      const SELF_REJECT_KEYWORDS = [
        "不考虑了",
        "不合适",
        "算了",
        "不去了",
        "放弃",
        "不感兴趣"
      ];
      function detectByKeywords(messages, myUid) {
        for (let i = messages.length - 1; i >= 0; i--) {
          const m = messages[i];
          if (m.bodyType !== 1 || !m.text) continue;
          const isFromMe = m.fromUid === myUid;
          const text = m.text;
          if (!isFromMe) {
            for (const kw of REJECT_KEYWORDS) {
              if (text.includes(kw)) {
                return { reason: "hr_rejected", detail: `HR: "${text.substring(0, 60)}"` };
              }
            }
          } else {
            for (const kw of SELF_REJECT_KEYWORDS) {
              if (text.includes(kw)) {
                return { reason: "self_rejected", detail: `我: "${text.substring(0, 60)}"` };
              }
            }
          }
        }
        return null;
      }
      async function analyzeWithAi(messages, myUid, contactName) {
        const config = getActiveDirectConfig();
        if (!config) {
          return { shouldClean: false, reason: "无可用 AI 配置" };
        }
        const textMessages = messages.filter((m) => m.bodyType === 1 && m.text).map((m) => {
          const role = m.fromUid === myUid ? "我" : contactName;
          return `[${role}]: ${m.text}`;
        }).join("\n");
        if (!textMessages.trim()) {
          return { shouldClean: false, reason: "无文本消息" };
        }
        const prompt = `分析以下求职对话，判断是否属于以下情况之一：
1. HR明确拒绝了求职者（如不合适、岗位已满等）
2. 求职者明确拒绝了该岗位
3. 对话已经结束，双方不再有继续沟通的意向

对话内容：
${textMessages}

请只回复 JSON 格式：{"shouldClean": true/false, "reason": "简短原因"}`;
        const aiMessages = [
          { role: "system", content: "你是一个求职对话分析助手，只输出 JSON，不要输出其他内容。" },
          { role: "user", content: prompt }
        ];
        try {
          const answer = await directAiCall(config, aiMessages);
          const jsonMatch = answer.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              shouldClean: !!parsed.shouldClean,
              reason: parsed.reason || ""
            };
          }
          return { shouldClean: false, reason: "AI 返回格式异常" };
        } catch (e) {
          return { shouldClean: false, reason: `AI 调用失败: ${(e == null ? void 0 : e.message) || e}` };
        }
      }
      async function scanConversations(onProgress) {
        var _a, _b;
        const candidates = [];
        const now = Date.now();
        const myUid = ((_b = (_a = Tools.window) == null ? void 0 : _a._PAGE) == null ? void 0 : _b.uid) || 0;
        onProgress({ phase: "fetching", current: 0, total: 0, message: "获取会话列表..." });
        let friendList;
        try {
          friendList = await fetchFriendList();
        } catch (e) {
          onProgress({ phase: "error", current: 0, total: 0, message: (e == null ? void 0 : e.message) || "获取会话列表失败" });
          return [];
        }
        if (!friendList.length) {
          onProgress({ phase: "done", current: 0, total: 0, message: "没有会话" });
          return [];
        }
        const staleList = friendList.filter((f) => now - f.updateTime > STALE_MS);
        if (!staleList.length) {
          onProgress({ phase: "done", current: 0, total: friendList.length, message: `共 ${friendList.length} 个会话，无超过 ${STALE_DAYS} 天未活跃的` });
          return [];
        }
        onProgress({
          phase: "fetching",
          current: 0,
          total: staleList.length,
          message: `共 ${friendList.length} 个会话，${staleList.length} 个超过 ${STALE_DAYS} 天未活跃，获取详情...`
        });
        const staleIds = staleList.map((f) => f.friendId);
        let details = [];
        for (let i = 0; i < staleIds.length; i += 199) {
          const batch = staleIds.slice(i, i + 199);
          const batchDetails = await bossThrottle.enqueue(() => fetchFriendDetails(batch));
          details = details.concat(batchDetails);
        }
        const detailMap = /* @__PURE__ */ new Map();
        details.forEach((d) => detailMap.set(d.uid, d));
        onProgress({
          phase: "analyzing",
          current: 0,
          total: staleList.length,
          message: "分析会话内容..."
        });
        for (let i = 0; i < staleList.length; i++) {
          const friend = staleList[i];
          const detail = detailMap.get(friend.friendId);
          if (!detail || !detail.securityId) continue;
          onProgress({
            phase: "analyzing",
            current: i + 1,
            total: staleList.length,
            message: `分析 ${detail.name}@${detail.brandName} (${i + 1}/${staleList.length}，共 ${friendList.length} 个会话)`
          });
          try {
            const messages = await bossThrottle.enqueue(() => fetchHistoryMessages(detail.encryptBossId, detail.securityId));
            const lastTextMsg = [...messages].reverse().find((m) => m.bodyType === 1 && m.text);
            const kwResult = detectByKeywords(messages, myUid);
            if (kwResult) {
              candidates.push({
                friendId: friend.friendId,
                encryptBossId: detail.encryptBossId,
                securityId: detail.securityId,
                name: detail.name,
                brandName: detail.brandName,
                title: detail.title,
                updateTime: friend.updateTime,
                lastText: (lastTextMsg == null ? void 0 : lastTextMsg.text) || "",
                reason: kwResult.reason,
                reasonDetail: kwResult.detail,
                selected: true
              });
              continue;
            }
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.fromUid === myUid && now - friend.updateTime > STALE_MS) {
              candidates.push({
                friendId: friend.friendId,
                encryptBossId: detail.encryptBossId,
                securityId: detail.securityId,
                name: detail.name,
                brandName: detail.brandName,
                title: detail.title,
                updateTime: friend.updateTime,
                lastText: (lastTextMsg == null ? void 0 : lastTextMsg.text) || "",
                reason: "stale_no_reply",
                reasonDetail: `已读不回超过 ${STALE_DAYS} 天`,
                selected: true
              });
              continue;
            }
            const aiResult = await analyzeWithAi(messages, myUid, detail.name);
            if (aiResult.shouldClean) {
              candidates.push({
                friendId: friend.friendId,
                encryptBossId: detail.encryptBossId,
                securityId: detail.securityId,
                name: detail.name,
                brandName: detail.brandName,
                title: detail.title,
                updateTime: friend.updateTime,
                lastText: (lastTextMsg == null ? void 0 : lastTextMsg.text) || "",
                reason: "ai_detected",
                reasonDetail: aiResult.reason,
                selected: true
              });
            }
          } catch (_e) {
          }
        }
        onProgress({
          phase: "done",
          current: staleList.length,
          total: staleList.length,
          message: `扫描完成，找到 ${candidates.length} 个待清理会话`
        });
        return candidates;
      }
      async function batchDelete(items, onProgress) {
        let success = 0;
        let failed = 0;
        let lastError = "";
        const selected = items.filter((i) => i.selected);
        for (let i = 0; i < selected.length; i++) {
          const item = selected[i];
          onProgress(i + 1, selected.length, item.name);
          try {
            const result = await bossThrottle.enqueue(() => deleteFriend(item.securityId));
            if (result.ok) {
              success++;
            } else {
              failed++;
              lastError = result.message;
              onProgress(i + 1, selected.length, item.name, result.message);
            }
          } catch (e) {
            failed++;
            lastError = (e == null ? void 0 : e.message) || String(e);
            onProgress(i + 1, selected.length, item.name, lastError);
          }
        }
        return { success, failed, lastError };
      }
      const _hoisted_1$5 = { class: "cleaner-wrapper" };
      const _hoisted_2$5 = { class: "cleaner-toolbar" };
      const _hoisted_3$4 = {
        key: 1,
        class: "cleaner-result"
      };
      const _hoisted_4$4 = {
        key: 1,
        class: "cleaner-list"
      };
      const _hoisted_5$4 = { class: "cleaner-list-header" };
      const _hoisted_6$4 = { class: "cleaner-list-count" };
      const _hoisted_7$4 = { class: "cleaner-card__info" };
      const _hoisted_8$3 = { class: "cleaner-card__name" };
      const _hoisted_9$3 = { class: "cleaner-card__detail" };
      const _hoisted_10$3 = { class: "cleaner-card__reason" };
      const _hoisted_11$3 = { class: "cleaner-card__meta" };
      const _hoisted_12$3 = {
        key: 2,
        class: "cleaner-empty"
      };
      const _sfc_main$9 = /* @__PURE__ */ defineComponent({
        __name: "ConversationCleaner",
        setup(__props) {
          const candidates = ref([]);
          const scanning = ref(false);
          const scanned = ref(false);
          const deleting = ref(false);
          const deleteResult = ref("");
          const progress = ref({ phase: "idle", current: 0, total: 0, message: "" });
          const progressMsg = computed(() => progress.value.message || "扫描中...");
          const selectedCount = computed(() => candidates.value.filter((c) => c.selected).length);
          const selectAll = computed({
            get: () => candidates.value.length > 0 && candidates.value.every((c) => c.selected),
            set: () => {
            }
          });
          function toggleSelectAll(val) {
            candidates.value.forEach((c) => c.selected = val);
          }
          function reasonLabel(reason) {
            const map = {
              hr_rejected: "HR拒绝",
              self_rejected: "我拒绝",
              stale_no_reply: "已读不回",
              ai_detected: "AI判定"
            };
            return map[reason] || reason;
          }
          function reasonTagType(reason) {
            const map = {
              hr_rejected: "danger",
              self_rejected: "warning",
              stale_no_reply: "info",
              ai_detected: ""
            };
            return map[reason] || "";
          }
          function formatTime(ts) {
            if (!ts) return "--";
            const d = new Date(ts);
            const now = /* @__PURE__ */ new Date();
            const diffDays = Math.floor((now.getTime() - ts) / (24 * 60 * 60 * 1e3));
            const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
            return diffDays > 0 ? `${dateStr} (${diffDays}天前)` : dateStr;
          }
          async function startScan() {
            scanning.value = true;
            scanned.value = false;
            candidates.value = [];
            deleteResult.value = "";
            try {
              const result = await scanConversations((p) => {
                progress.value = p;
              });
              candidates.value = result;
            } catch (e) {
              ElMessage({ type: "error", message: `扫描失败: ${(e == null ? void 0 : e.message) || e}` });
            } finally {
              scanning.value = false;
              scanned.value = true;
            }
          }
          async function confirmDelete() {
            const count = selectedCount.value;
            if (!count) return;
            try {
              await ElMessageBox.confirm(
                `确认删除选中的 ${count} 个会话？删除后将从 BOSS 直聘列表中移除，同时删除聊天记录。`,
                "批量删除确认",
                { confirmButtonText: "确认删除", cancelButtonText: "取消", type: "warning" }
              );
            } catch {
              return;
            }
            deleting.value = true;
            deleteResult.value = "";
            try {
              const { success, failed, lastError } = await batchDelete(
                candidates.value,
                (cur, total, name, failReason) => {
                  deleteResult.value = failReason ? `删除中 ${cur}/${total}: ${name} — 失败: ${failReason}` : `删除中 ${cur}/${total}: ${name}`;
                }
              );
              deleteResult.value = `完成: 成功 ${success} 个${failed ? `，失败 ${failed} 个 (${lastError})` : ""}`;
              candidates.value = candidates.value.filter((c) => !c.selected);
            } catch (e) {
              ElMessage({ type: "error", message: `删除失败: ${(e == null ? void 0 : e.message) || e}` });
            } finally {
              deleting.value = false;
            }
          }
          return (_ctx, _cache) => {
            const _component_el_button = resolveComponent("el-button");
            const _component_el_progress = resolveComponent("el-progress");
            const _component_el_checkbox = resolveComponent("el-checkbox");
            const _component_el_tag = resolveComponent("el-tag");
            return openBlock(), createElementBlock("div", _hoisted_1$5, [
              createElementVNode("div", _hoisted_2$5, [
                createVNode(_component_el_button, {
                  type: "primary",
                  loading: scanning.value,
                  onClick: startScan,
                  disabled: deleting.value
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(scanning.value ? progressMsg.value : "扫描待清理会话"), 1)
                  ]),
                  _: 1
                }, 8, ["loading", "disabled"]),
                candidates.value.length && !scanning.value ? (openBlock(), createBlock(_component_el_button, {
                  key: 0,
                  type: "danger",
                  loading: deleting.value,
                  disabled: selectedCount.value === 0,
                  onClick: confirmDelete
                }, {
                  default: withCtx(() => [
                    createTextVNode(" 删除选中 (" + toDisplayString(selectedCount.value) + ") ", 1)
                  ]),
                  _: 1
                }, 8, ["loading", "disabled"])) : createCommentVNode("", true),
                deleteResult.value ? (openBlock(), createElementBlock("span", _hoisted_3$4, toDisplayString(deleteResult.value), 1)) : createCommentVNode("", true)
              ]),
              scanning.value && progress.value.total > 0 ? (openBlock(), createBlock(_component_el_progress, {
                key: 0,
                percentage: Math.round(progress.value.current / progress.value.total * 100),
                "stroke-width": 6,
                style: { "margin": "8px 0" }
              }, null, 8, ["percentage"])) : createCommentVNode("", true),
              candidates.value.length && !scanning.value ? (openBlock(), createElementBlock("div", _hoisted_4$4, [
                createElementVNode("div", _hoisted_5$4, [
                  createVNode(_component_el_checkbox, {
                    modelValue: selectAll.value,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectAll.value = $event),
                    onChange: toggleSelectAll
                  }, {
                    default: withCtx(() => [
                      createTextVNode("全选")
                    ]),
                    _: 1
                  }, 8, ["modelValue"]),
                  createElementVNode("span", _hoisted_6$4, "共 " + toDisplayString(candidates.value.length) + " 个待清理会话", 1)
                ]),
                (openBlock(true), createElementBlock(Fragment, null, renderList(candidates.value, (item, idx) => {
                  return openBlock(), createElementBlock("div", {
                    key: item.friendId,
                    class: "cleaner-card"
                  }, [
                    createVNode(_component_el_checkbox, {
                      modelValue: item.selected,
                      "onUpdate:modelValue": ($event) => item.selected = $event,
                      class: "cleaner-card__check"
                    }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                    createElementVNode("div", _hoisted_7$4, [
                      createElementVNode("div", _hoisted_8$3, toDisplayString(item.name) + " · " + toDisplayString(item.brandName) + " · " + toDisplayString(item.title), 1),
                      createElementVNode("div", _hoisted_9$3, [
                        createVNode(_component_el_tag, {
                          size: "small",
                          type: reasonTagType(item.reason)
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(reasonLabel(item.reason)), 1)
                          ]),
                          _: 2
                        }, 1032, ["type"]),
                        createElementVNode("span", _hoisted_10$3, toDisplayString(item.reasonDetail), 1)
                      ]),
                      createElementVNode("div", _hoisted_11$3, " 最后活跃: " + toDisplayString(formatTime(item.updateTime)) + " · 最后消息: " + toDisplayString((item.lastText || "(无文本)").substring(0, 50)), 1)
                    ])
                  ]);
                }), 128))
              ])) : createCommentVNode("", true),
              !candidates.value.length && !scanning.value && scanned.value ? (openBlock(), createElementBlock("div", _hoisted_12$3, " 没有找到需要清理的会话 ")) : createCommentVNode("", true)
            ]);
          };
        }
      });
      const _export_sfc = exports("_", (sfc, props) => {
        const target = sfc.__vccOpts || sfc;
        for (const [key, val] of props) {
          target[key] = val;
        }
        return target;
      });
      const ConversationCleaner = /* @__PURE__ */ _export_sfc(_sfc_main$9, [["__scopeId", "data-v-e91f45f7"]]);
      const _withScopeId$3 = (n) => (pushScopeId("data-v-92c42cef"), n = n(), popScopeId(), n);
      const _hoisted_1$4 = { class: "cleaner-section" };
      const _hoisted_2$4 = /* @__PURE__ */ _withScopeId$3(() => /* @__PURE__ */ createElementVNode("div", { class: "cleaner-section__title" }, "会话清理", -1));
      const _sfc_main$8 = /* @__PURE__ */ defineComponent({
        __name: "AiJob",
        setup(__props) {
          const VueAny = Vue;
          const ElementAny = ElementPlus;
          const IconsAny = Icons;
          const {
            defineComponent: defineComponent2,
            computed: computed2,
            watch: watch2,
            openBlock: openBlock$1,
            createElementBlock: createElementBlock$1,
            normalizeClass: normalizeClass2,
            unref: unref$1,
            inject: inject2,
            ref: ref2,
            createVNode: createVNode$1,
            Fragment: Fragment2,
            withCtx: withCtx2,
            createBlock: createBlock2,
            normalizeStyle,
            createTextVNode: createTextVNode2,
            toDisplayString: toDisplayString2,
            createCommentVNode: createCommentVNode2,
            createElementVNode: createElementVNode$1,
            withDirectives: withDirectives2,
            vShow: vShow2,
            renderList: renderList2,
            onUnmounted
          } = VueAny;
          const pushScopeId2 = VueAny.pushScopeId || (() => void 0);
          const popScopeId2 = VueAny.popScopeId || (() => void 0);
          const {
            ElText,
            ElIcon,
            ElButton,
            ElTableColumn,
            ElTag,
            ElTable,
            ElInput,
            ElLink,
            ElImage,
            ElDialog,
            ElInputNumber,
            ElSwitch,
            ElTooltip,
            ElEmpty,
            vLoading
          } = ElementAny;
          const {
            CircleCloseFilled,
            Promotion,
            Service,
            Shop,
            Wallet,
            PriceTag
          } = IconsAny;
          const GlobalAny = globalThis;
          const logger$12 = GlobalAny.logger$1 || console;
          const SSEClient = GlobalAny.SSEClient || class {
            constructor(..._args) {
              __publicField(this, "eventSource");
            }
            addOnMsgCallback(..._args) {
            }
            addEventListener(..._args) {
            }
            start(..._args) {
            }
            close(..._args) {
            }
          };
          const _withScopeId$32 = (n) => (pushScopeId2("data-v-13350d57"), n = n(), popScopeId2(), n);
          const _hoisted_5$32 = { style: { "font-size": "15px" } };
          const _hoisted_6$32 = { style: { "font-size": "15px" } };
          const _hoisted_7$32 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("span", null, "AI代聊 ", -1));
          const _hoisted_8$32 = { class: "fixed-stop-button" };
          const _hoisted_9$32 = { class: "push-records-container" };
          const _hoisted_10$32 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("div", { class: "push-records-header" }, [
            /* @__PURE__ */ createElementVNode$1("span", null, "实时操作记录")
          ], -1));
          const _hoisted_11$32 = { class: "push-records-content" };
          const _hoisted_12$12 = { class: "record-time" };
          const _hoisted_13$12 = {
            key: 0,
            class: "no-records"
          };
          const _hoisted_14$12 = { class: "my-header" };
          const _hoisted_15$12 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("br", null, null, -1));
          const _hoisted_16$12 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("h3", null, "我的产品列表", -1));
          const _hoisted_172 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("br", null, null, -1));
          const _hoisted_182 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("br", null, null, -1));
          const _hoisted_192 = {
            type: "info",
            style: { "margin-top": "10px" }
          };
          const _hoisted_20 = { key: 0 };
          const _hoisted_21 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("br", null, null, -1));
          const _hoisted_22 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("br", null, null, -1));
          const _hoisted_23 = { style: { "padding-top": "10px", "min-width": "8%" } };
          const _hoisted_24 = { class: "demonstration" };
          const _hoisted_25$1 = { class: "demonstration" };
          const _hoisted_26 = { class: "demonstration" };
          const _hoisted_27 = /* @__PURE__ */ _withScopeId$32(() => /* @__PURE__ */ createElementVNode$1("div", { class: "image-slot" }, "加载订单二维码失败；请稍后刷新重试", -1));
          const _hoisted_28 = { style: { "width": "80%" } };
          const _hoisted_29 = { class: "demonstration" };
          const _sfc_main$82 = /* @__PURE__ */ defineComponent2({
            __name: "AiJob",
            setup(__props2) {
              const platform2 = inject2("$platform");
              const axios$1 = inject2("$axios");
              const pushStatus = ref2(PushStatus.NOT_START);
              const collectMode = ref2(false);
              const actionLabel = computed2(() => collectMode.value ? "收藏" : "投递");
              const getStartButtonText = () => collectMode.value ? "开始收藏" : "开始投递";
              const pushBtnType = ref2("primary");
              const pushBtnText = ref2(getStartButtonText());
              const aiSeatBuyVisible = ref2(false);
              const productListLoading = ref2(false);
              const logRecorder = new LogRecorder();
              const latestPushRecords = ref2([]);
              let recordsUpdateTimer = null;
              const buyProductList = ref2([]);
              const showOtherProduct = ref2(true);
              const orderGroup = ref2([]);
              const payStatus = ref2(false);
              const promotionCode = ref2("");
              const lastPromotionCode = ref2("");
              let loginStore = LoginStore();
              let pushResultCounter2 = pushResultCount();
              const userStore = UserStore();
              const updateLatestPushRecords = () => {
                const allLogs = logRecorder.getLogs(1, logRecorder.getLogCount());
                const pushLogs = allLogs.filter(
                  (log) => log.message.toLowerCase().includes("投递") || log.message.toLowerCase().includes("收藏") || log.message.toLowerCase().includes("下一页") || log.message.toLowerCase().includes("工作")
                );
                latestPushRecords.value = pushLogs.slice(-10);
              };
              const getRecordLevelClass = (level) => {
                switch (level.toLowerCase()) {
                  case "error":
                    return "record-error";
                  case "warn":
                    return "record-warn";
                  case "info":
                    return "record-info";
                  case "debug":
                    return "record-debug";
                  case "trace":
                    return "record-trace";
                  default:
                    return "record-info";
                }
              };
              const startRecordsUpdate = () => {
                if (recordsUpdateTimer) {
                  clearInterval(recordsUpdateTimer);
                }
                updateLatestPushRecords();
                recordsUpdateTimer = setInterval(updateLatestPushRecords, 500);
              };
              const stopRecordsUpdate = () => {
                if (recordsUpdateTimer) {
                  clearInterval(recordsUpdateTimer);
                  recordsUpdateTimer = null;
                }
              };
              const isExpired = (row) => {
                const currentTime = /* @__PURE__ */ new Date();
                const endTime = new Date(row.periodOfValidityEndTime);
                return currentTime > endTime;
              };
              const randomStyle = () => {
                const tagStyleArr = ["primary", "warning", "success", "danger"];
                let number4 = Math.floor(Math.random() * 4);
                return tagStyleArr[number4];
              };
              const scrollToTop = () => {
                window.scrollTo({
                  top: 0,
                  behavior: "smooth"
                });
              };
              const handlerPush = () => {
                switch (pushStatus.value) {
                  case PushStatus.NOT_START:
                    startPush();
                    break;
                  case PushStatus.PUSHING:
                    pausePush();
                    break;
                  case PushStatus.PAUSE:
                    startPush();
                    break;
                }
              };
              const handlerFixedStopPush = () => {
                pausePush();
                scrollToTop();
              };
              const selfDefPushCountLimit = ref2(platform2.selfDefPushCountLimit);
              const selfDefPushCountLimitChange = (val) => {
                platform2.selfDefPushCountLimit = val;
              };
              const mockPush = ref2(false);
              const startPush = () => {
                if (!loginInterceptor()) {
                  return;
                }
                platform2.collectMode = collectMode.value;
                platform2.pushMock = mockPush.value;
                pushStatus.value = PushStatus.PUSHING;
                pushBtnType.value = "warning";
                pushBtnText.value = `停止${actionLabel.value}`;
                startRecordsUpdate();
                let pushResultPromise = platform2.startPush();
                pushResultPromise.then(() => {
                  ElMessage({
                    message: `批量${actionLabel.value}完成`,
                    type: "success",
                    duration: 3e3
                  });
                  setTimeout(() => {
                    pushStatus.value = PushStatus.PAUSE;
                    pushBtnType.value = "primary";
                    pushBtnText.value = getStartButtonText();
                    stopRecordsUpdate();
                  }, 200);
                });
              };
              const pausePush = () => {
                platform2.pausePush();
                pushStatus.value = PushStatus.PAUSE;
                pushBtnType.value = "primary";
                pushBtnText.value = getStartButtonText();
                stopRecordsUpdate();
              };
              const handlerClearPushRecords = () => {
                if (typeof logRecorder.clearLogs === "function") {
                  logRecorder.clearLogs();
                }
                latestPushRecords.value = [];
                if (typeof pushResultCounter2.clearCounts === "function") {
                  pushResultCounter2.clearCounts();
                }
                ElMessage({
                  message: "已清理投递成功/失败记录",
                  type: "success",
                  duration: 2e3
                });
              };
              const queryBuyProductList = async () => {
                let productResp = await axios$1.post("/api/product/user/product/list");
                buyProductList.value = productResp.data.data;
              };
              const showOrderGroup = async () => {
                if (!loginInterceptor()) {
                  return;
                }
                productListLoading.value = true;
                let promotionCodeVar = promotionCode.value.trim();
                promotionCode.value = "";
                setTimeout(() => {
                  showOtherProduct.value = true;
                }, 100);
                if (orderGroup.value.length < 1 || promotionCodeVar !== lastPromotionCode.value) {
                  let orderGroupResp = await axios$1.post("/api/pay/generate/order/group", { promotionCode: promotionCodeVar });
                  if (orderGroupResp.data.code != 200) {
                    ElMessage({
                      message: orderGroupResp.data.message,
                      type: "warning",
                      duration: 3e3
                    });
                    setTimeout(() => {
                      showOtherProduct.value = false;
                    }, 100);
                    productListLoading.value = false;
                    return;
                  }
                  orderGroup.value = orderGroupResp.data.data;
                  lastPromotionCode.value = promotionCodeVar;
                  productListLoading.value = false;
                }
                productListLoading.value = false;
                waitUsePay();
              };
              const waitUsePay = () => {
                const sseClient = new SSEClient(axios$1.defaults.baseURL + "api/sse/connect");
                sseClient.addOnMsgCallback((event) => {
                  let data = event.data;
                  if (data === "支付成功") {
                    payStatus.value = true;
                    orderGroup.value = [];
                    queryBuyProductList();
                    showOtherProduct.value = false;
                    firstAiSeatStatus.value = 0;
                  }
                });
                sseClient.start();
                let count = 0;
                let interval = setInterval(() => {
                  if (payStatus.value) {
                    clearInterval(interval);
                  }
                  orderGroup.value.forEach((orderItem) => {
                    axios$1.get("/api/pay/searchOrder?outTradeNo=" + orderItem.orderId).then((resp) => {
                      if (resp.data.data === "TRADE_SUCCESS") {
                        payStatus.value = true;
                        orderGroup.value = [];
                        clearInterval(interval);
                      }
                      if (resp.data.data === "WAIT_BUYER_PAY") {
                        logger$12.debug("等待支付");
                      }
                      count++;
                      if (count >= 10) {
                        logger$12.warn("订单超时未支付");
                        clearInterval(interval);
                      }
                    });
                  });
                }, 3e4);
              };
              const firstAiSeatStatus = ref2(userStore.user.aiSeatStatus);
              setTimeout(() => {
                firstAiSeatStatus.value = userStore.user.aiSeatStatus;
                logger$12.info("firstAiSeatStatus", firstAiSeatStatus.value);
              }, 1500);
              const handlerAISeatStatusChange = async (val) => {
                if (firstAiSeatStatus.value == null) {
                  return;
                }
                if (!loginInterceptor()) {
                  return;
                }
                firstAiSeatStatus.value = val ? 1 : 0;
                return axios$1.post("/api/user/save/preference", {
                  aiSeatStatus: val ? 1 : 0
                }).catch((error) => {
                  logger$12.warn("保存AI代聊开关状态失败", (error == null ? void 0 : error.message) || error);
                });
              };
              if (!loginStore.login && !loginStore.loginFailStatus) {
                logger$12.info("页面静默登录");
                silentlyLogin("").catch((_) => {
                });
              }
              watch2(collectMode, () => {
                if (pushStatus.value !== PushStatus.PUSHING) {
                  pushBtnText.value = getStartButtonText();
                }
              });
              onUnmounted(() => {
                stopRecordsUpdate();
              });
              return (_ctx, _cache) => {
                const _component_el_text = ElText;
                const _component_el_input_number = ElInputNumber;
                const _component_el_switch = ElSwitch;
                const _component_el_button = ElButton;
                const _component_el_tooltip = ElTooltip;
                const _component_el_link = ElLink;
                const _component_el_icon = ElIcon;
                const _component_el_table_column = ElTableColumn;
                const _component_el_tag = ElTag;
                const _component_el_table = ElTable;
                const _component_el_input = ElInput;
                const _component_el_empty = ElEmpty;
                const _component_el_image = ElImage;
                const _component_el_dialog = ElDialog;
                const _directive_loading = vLoading;
                return openBlock$1(), createElementBlock$1(Fragment2, null, [
                  createElementVNode$1("div", { class: "aj-section" }, [
                    createElementVNode$1("div", { class: "aj-section__title" }, "投递统计"),
                    createElementVNode$1("div", { class: "aj-section__body aj-stats-row" }, [
                      createVNode$1(_component_el_text, {
                        size: "large",
                        class: "mx-1",
                        type: "primary"
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2(toDisplayString2(actionLabel.value) + "成功：" + toDisplayString2(unref$1(pushResultCounter2).successCount) + "    ", 1)
                        ]),
                        _: 1
                      }),
                      createVNode$1(_component_el_text, {
                        size: "large",
                        class: "mx-1",
                        type: "danger"
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2(" " + toDisplayString2(actionLabel.value) + "失败：" + toDisplayString2(unref$1(pushResultCounter2).failCount) + "    ", 1)
                        ]),
                        _: 1
                      }),
                      createVNode$1(_component_el_button, {
                        type: "info",
                        size: "small",
                        plain: "",
                        onClick: handlerClearPushRecords
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2("清理投递记录")
                        ]),
                        _: 1
                      })
                    ])
                  ]),
                  createElementVNode$1("div", { class: "aj-section" }, [
                    createElementVNode$1("div", { class: "aj-section__title" }, "投递设置"),
                    createElementVNode$1("div", { class: "aj-section__body aj-settings-row" }, [
                      createElementVNode$1("span", { class: "aj-setting-item" }, [
                        createTextVNode2("单次处理限制："),
                        createVNode$1(_component_el_input_number, {
                          modelValue: selfDefPushCountLimit.value,
                          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selfDefPushCountLimit.value = $event),
                          min: -1,
                          max: 100,
                          size: "small",
                          onChange: selfDefPushCountLimitChange
                        }, null, 8, ["modelValue"])
                      ]),
                      !unref$1(isProdEnv)() ? createElementVNode$1("span", { class: "aj-setting-item" }, [
                        createTextVNode2("MOCK投递 "),
                        createVNode$1(_component_el_switch, {
                          modelValue: mockPush.value,
                          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => mockPush.value = $event)
                        }, null, 8, ["modelValue"])
                      ]) : createCommentVNode2("", true),
                      createElementVNode$1("span", { class: "aj-setting-item" }, [
                        createTextVNode2("按条件收藏 "),
                        createVNode$1(_component_el_switch, {
                          modelValue: collectMode.value,
                          "onUpdate:modelValue": ($event) => collectMode.value = $event,
                          "active-text": "开",
                          "inactive-text": "关",
                          "inline-prompt": "",
                          style: { "--el-switch-on-color": "#67c23a", "--el-switch-off-color": "#dcdfe6" }
                        }, null, 8, ["modelValue"])
                      ])
                    ])
                  ]),
                  createElementVNode$1("div", { class: "aj-section" }, [
                    createElementVNode$1("div", { class: "aj-section__title" }, "操作"),
                    createElementVNode$1("div", { class: "aj-section__body aj-action-row" }, [
                      createVNode$1(_component_el_tooltip, {
                        effect: "dark",
                        "raw-content": "",
                        content: "\r\n    先通过Boss的筛选功能圈选你的意向岗位<p/><span style='color:red;'>在【偏好设置-投递设置】中选择</span><br/>您的投递偏好，用于精准投递岗位\r\n    ",
                        placement: "bottom"
                      }, {
                        default: withCtx2(() => [
                          createVNode$1(_component_el_button, {
                            icon: unref$1(Promotion),
                            type: pushBtnType.value,
                            onClick: handlerPush
                          }, {
                            default: withCtx2(() => [
                              createElementVNode$1("p", _hoisted_5$32, toDisplayString2(pushBtnText.value), 1)
                            ]),
                            _: 1
                          }, 8, ["icon", "type"])
                        ]),
                        _: 1
                      }),
                      createVNode$1(_component_el_tooltip, {
                        effect: "dark",
                        "raw-content": "",
                        content: "\r\n    AI代聊：自动响应hr的消息,根据您的简历信息进行定制化回答。<br/>\r\n    - 高意向职位邮件通知，快速筛选出最合适的职位。<br/>\r\n    - 快捷发送简历，交换 wx、联系方式。<br/>\r\n    - hr拒绝挝留，不放过每一个机会。<br/>\r\n    ",
                        placement: "bottom"
                      }, {
                        default: withCtx2(() => [
                          createVNode$1(_component_el_button, {
                            icon: unref$1(Service),
                            type: "primary",
                            plain: ""
                          }, {
                            default: withCtx2(() => [
                              createElementVNode$1("p", _hoisted_6$32, [
                                _hoisted_7$32,
                                createVNode$1(_component_el_switch, {
                                  "active-text": "开",
                                  "inactive-text": "关",
                                  "inline-prompt": "",
                                  style: { "--el-switch-on-color": "#409eff", "--el-switch-off-color": "#dcdfe6" },
                                  modelValue: unref$1(userStore).user.aiSeatStatus,
                                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref$1(userStore).user.aiSeatStatus = $event),
                                  onChange: handlerAISeatStatusChange
                                }, null, 8, ["modelValue"])
                              ])
                            ]),
                            _: 1
                          }, 8, ["icon"])
                        ]),
                        _: 1
                      })
                    ])
                  ]),
                  withDirectives2(createElementVNode$1("div", _hoisted_8$32, [
                    createElementVNode$1("div", _hoisted_9$32, [
                      _hoisted_10$32,
                      createElementVNode$1("div", _hoisted_11$32, [
                        (openBlock$1(true), createElementBlock$1(Fragment2, null, renderList2(latestPushRecords.value, (record, index) => {
                          return openBlock$1(), createElementBlock$1("div", {
                            key: index,
                            class: "push-record-item"
                          }, [
                            createElementVNode$1("span", _hoisted_12$12, toDisplayString2(record.timestamp), 1),
                            createElementVNode$1("span", {
                              class: normalizeClass2(["record-message", getRecordLevelClass(record.level)])
                            }, toDisplayString2(record.message), 3)
                          ]);
                        }), 128)),
                        latestPushRecords.value.length === 0 ? (openBlock$1(), createElementBlock$1("div", _hoisted_13$12, " 暂无操作记录 ")) : createCommentVNode2("", true)
                      ])
                    ]),
                    createVNode$1(_component_el_button, {
                      type: "warning",
                      size: "large",
                      onClick: handlerFixedStopPush
                    }, {
                      default: withCtx2(() => [
                        createVNode$1(_component_el_icon, null, {
                          default: withCtx2(() => [
                            createVNode$1(unref$1(CircleCloseFilled))
                          ]),
                          _: 1
                        }),
                        createTextVNode2(" 停止" + toDisplayString2(actionLabel.value) + " ", 1)
                      ]),
                      _: 1
                    })
                  ], 512), [
                    [vShow2, pushStatus.value === unref$1(PushStatus).PUSHING]
                  ]),
                  createVNode$1(_component_el_dialog, {
                    modelValue: aiSeatBuyVisible.value,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => aiSeatBuyVisible.value = $event),
                    "show-close": false,
                    width: "800"
                  }, {
                    header: withCtx2(({ close, titleId, titleClass }) => {
                      var _a;
                      return [
                        createElementVNode$1("div", _hoisted_14$12, [
                          createVNode$1(_component_el_text, {
                            size: "large",
                            style: { "font-size": "20px" },
                            type: "info"
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("产品列表")
                            ]),
                            _: 1
                          }),
                          createVNode$1(_component_el_button, {
                            type: "warning",
                            onClick: close
                          }, {
                            default: withCtx2(() => [
                              createVNode$1(_component_el_icon, { class: "el-icon--left" }, {
                                default: withCtx2(() => [
                                  createVNode$1(unref$1(CircleCloseFilled))
                                ]),
                                _: 1
                              }),
                              createTextVNode2(" 关闭 ")
                            ]),
                            _: 2
                          }, 1032, ["onClick"])
                        ]),
                        withDirectives2(createElementVNode$1("div", null, [
                          _hoisted_15$12,
                          _hoisted_16$12,
                          _hoisted_172,
                          withDirectives2(createVNode$1(_component_el_table, {
                            data: buyProductList.value,
                            stripe: "",
                            style: { "width": "100%" }
                          }, {
                            default: withCtx2(() => [
                              createVNode$1(_component_el_table_column, {
                                prop: "productName",
                                label: "产品",
                                width: "180"
                              }, {
                                default: withCtx2(({ row }) => [
                                  createElementVNode$1("span", {
                                    style: normalizeStyle({ textDecoration: isExpired(row) ? "line-through" : "none" })
                                  }, toDisplayString2(row.productName), 5)
                                ]),
                                _: 1
                              }),
                              createVNode$1(_component_el_table_column, {
                                label: "状态",
                                width: "100"
                              }, {
                                default: withCtx2(({ row }) => [
                                  createElementVNode$1("span", {
                                    style: normalizeStyle({ color: isExpired(row) ? "red" : "green" })
                                  }, toDisplayString2(isExpired(row) ? "过期" : "正常"), 5)
                                ]),
                                _: 1
                              }),
                              createVNode$1(_component_el_table_column, {
                                prop: "powerList",
                                label: "能力",
                                width: "180"
                              }, {
                                default: withCtx2(({ row }) => [
                                  (openBlock$1(true), createElementBlock$1(Fragment2, null, renderList2(row.powerList, (power) => {
                                    return openBlock$1(), createElementBlock$1("div", { key: power }, [
                                      createVNode$1(_component_el_tag, {
                                        effect: "dark",
                                        type: randomStyle(),
                                        size: "small"
                                      }, {
                                        default: withCtx2(() => [
                                          createTextVNode2(toDisplayString2(power), 1)
                                        ]),
                                        _: 2
                                      }, 1032, ["type"])
                                    ]);
                                  }), 128))
                                ]),
                                _: 1
                              }),
                              createVNode$1(_component_el_table_column, {
                                prop: "periodOfValidityStartTime",
                                label: "有效期开始时间"
                              }),
                              createVNode$1(_component_el_table_column, {
                                prop: "periodOfValidityEndTime",
                                label: "有效期结束时间"
                              })
                            ]),
                            _: 1
                          }, 8, ["data"]), [
                            [vShow2, buyProductList.value.length > 0]
                          ]),
                          _hoisted_182
                        ], 512), [
                          [vShow2, buyProductList.value.length > 0]
                        ]),
                        createElementVNode$1("div", _hoisted_192, [
                          createVNode$1(_component_el_button, {
                            type: "danger",
                            icon: unref$1(Shop),
                            onClick: showOrderGroup
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2(" 更多产品 ")
                            ]),
                            _: 1
                          }, 8, ["icon"]),
                          createVNode$1(_component_el_input, {
                            "suffix-icon": unref$1(Wallet),
                            modelValue: promotionCode.value,
                            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => promotionCode.value = $event),
                            style: { "margin-left": "10px", "width": "240px" },
                            placeholder: "请输入您的优惠码"
                          }, null, 8, ["suffix-icon", "modelValue"]),
                          createVNode$1(_component_el_link, {
                            icon: unref$1(PriceTag),
                            type: "primary",
                            style: { "margin-left": "30px" },
                            target: "_blank",
                            href: "https://www.bilibili.com/video/BV1HKAyebESp"
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("点击获取优惠码(评论区)")
                            ]),
                            _: 1
                          }, 8, ["icon"])
                        ]),
                        withDirectives2(createVNode$1(_component_el_empty, {
                          "image-size": 50,
                          description: "购买产品为空，请点击更多产品查看"
                        }, null, 512), [
                          [vShow2, !((_a = buyProductList.value) == null ? void 0 : _a.length) && !showOtherProduct.value]
                        ]),
                        showOtherProduct.value ? withDirectives2((openBlock$1(), createElementBlock$1("div", _hoisted_20, [
                          _hoisted_21,
                          createElementVNode$1("p", null, [
                            createVNode$1(_component_el_text, {
                              class: "mx-1",
                              type: "danger"
                            }, {
                              default: withCtx2(() => [
                                createTextVNode2("定价说明：")
                              ]),
                              _: 1
                            }),
                            createTextVNode2(" 使用R1深度思考大模型时：首先，R1的价格更贵，深度思考的内容也会被记录token消耗。token消耗量巨大。同时由于boss的会话聊天机制，需要携带消息上下文调用。这也就意味着对话轮数越多，token消耗越多。按乘方的趋势增长。 ")
                          ]),
                          _hoisted_22,
                          (openBlock$1(true), createElementBlock$1(Fragment2, null, renderList2(orderGroup.value, (order) => {
                            return openBlock$1(), createElementBlock$1("div", {
                              key: order,
                              style: normalizeStyle([{ "display": "flex" }, "width: " + 1 / orderGroup.value.length]),
                              class: "block"
                            }, [
                              createElementVNode$1("div", _hoisted_23, [
                                createElementVNode$1("p", _hoisted_24, [
                                  createVNode$1(_component_el_text, {
                                    size: "large",
                                    type: "primary"
                                  }, {
                                    default: withCtx2(() => [
                                      createTextVNode2(toDisplayString2(order.title), 1)
                                    ]),
                                    _: 2
                                  }, 1024)
                                ]),
                                createElementVNode$1("p", _hoisted_25$1, [
                                  createVNode$1(_component_el_text, {
                                    size: "large",
                                    type: "success"
                                  }, {
                                    default: withCtx2(() => [
                                      createTextVNode2(toDisplayString2(order.validDays) + "天", 1)
                                    ]),
                                    _: 2
                                  }, 1024)
                                ]),
                                createElementVNode$1("p", _hoisted_26, [
                                  createVNode$1(_component_el_text, {
                                    size: "large",
                                    type: "danger"
                                  }, {
                                    default: withCtx2(() => [
                                      createTextVNode2("￥ " + toDisplayString2(order.totalAmount), 1)
                                    ]),
                                    _: 2
                                  }, 1024)
                                ])
                              ]),
                              createVNode$1(_component_el_image, {
                                style: { "width": "100px", "height": "100px" },
                                src: "data:image/png;base64," + order.qrCodeBase64,
                                fit: "fill"
                              }, {
                                error: withCtx2(() => [
                                  _hoisted_27
                                ]),
                                _: 2
                              }, 1032, ["src"]),
                              createElementVNode$1("div", _hoisted_28, [
                                createElementVNode$1("div", null, [
                                  createTextVNode2(" 提供能力: "),
                                  (openBlock$1(true), createElementBlock$1(Fragment2, null, renderList2(order.tags, (tag) => {
                                    return openBlock$1(), createBlock2(_component_el_tag, {
                                      style: { "margin": "10px" },
                                      key: tag,
                                      type: randomStyle(),
                                      size: "large",
                                      effect: "light"
                                    }, {
                                      default: withCtx2(() => [
                                        createTextVNode2(toDisplayString2(tag), 1)
                                      ]),
                                      _: 2
                                    }, 1032, ["type"]);
                                  }), 128))
                                ]),
                                createElementVNode$1("div", null, [
                                  createElementVNode$1("span", _hoisted_29, toDisplayString2(order.desc), 1)
                                ])
                              ])
                            ], 4);
                          }), 128))
                        ])), [
                          [_directive_loading, productListLoading.value]
                        ]) : createCommentVNode2("", true)
                      ];
                    }),
                    _: 1
                  }, 8, ["modelValue"])
                ], 64);
              };
            }
          });
          const RenderComponent = _sfc_main$82;
          return (_ctx, _cache) => {
            return openBlock(), createElementBlock("div", null, [
              createVNode(unref(RenderComponent)),
              createElementVNode("div", _hoisted_1$4, [
                _hoisted_2$4,
                createVNode(ConversationCleaner)
              ])
            ]);
          };
        }
      });
      const AiJob = /* @__PURE__ */ _export_sfc(_sfc_main$8, [["__scopeId", "data-v-92c42cef"]]);
      const _sfc_main$7 = /* @__PURE__ */ defineComponent({
        __name: "Preference",
        setup(__props) {
          const VueAny = Vue;
          const ElementAny = ElementPlus;
          const {
            defineComponent: defineComponent2,
            reactive: reactive2,
            openBlock: openBlock$1,
            createElementBlock: createElementBlock2,
            unref: unref$1,
            inject: inject2,
            ref: ref2,
            createVNode: createVNode2,
            Fragment: Fragment2,
            withCtx: withCtx2,
            createBlock: createBlock$1,
            createTextVNode: createTextVNode2,
            createCommentVNode: createCommentVNode2,
            createElementVNode: createElementVNode2,
            renderList: renderList2
          } = VueAny;
          const pushScopeId2 = VueAny.pushScopeId || (() => void 0);
          const popScopeId2 = VueAny.popScopeId || (() => void 0);
          const {
            ElText,
            ElButton,
            ElTag,
            ElInput,
            ElInputNumber,
            ElTooltip,
            ElForm,
            ElFormItem,
            ElCheckbox,
            ElOption,
            ElSelect,
            ElUpload,
            ElMessageBox: ElMessageBox2,
            ElNotification
          } = ElementAny;
          const _withScopeId$22 = (n) => (pushScopeId2("data-v-b36666e5"), n = n(), popScopeId2(), n);
          const _hoisted_1$52 = { key: 0 };
          const _hoisted_2$42 = /* @__PURE__ */ _withScopeId$22(() => /* @__PURE__ */ createElementVNode2("br", null, null, -1));
          const _hoisted_3$22 = /* @__PURE__ */ _withScopeId$22(() => /* @__PURE__ */ createElementVNode2("br", null, null, -1));
          const _hoisted_4$22 = { style: { "display": "flex", "margin-top": "10px" } };
          const _hoisted_5$22 = { style: { "display": "flex", "margin-top": "10px" } };
          const _hoisted_6$22 = { style: { "display": "flex" } };
          const _hoisted_7$22 = { style: { "display": "flex" } };
          const _hoisted_8$22 = { style: { "display": "flex" } };
          const _hoisted_10$22 = { style: { "display": "flex", "margin-bottom": "10px" } };
          const _hoisted_11$22 = /* @__PURE__ */ _withScopeId$22(() => /* @__PURE__ */ createElementVNode2("p", { class: "time-interval" }, "投递间隔", -1));
          const _hoisted_122 = /* @__PURE__ */ _withScopeId$22(() => /* @__PURE__ */ createElementVNode2("p", { class: "time-interval" }, "秒", -1));
          const _hoisted_132 = /* @__PURE__ */ _withScopeId$22(() => /* @__PURE__ */ createElementVNode2("p", { class: "time-interval" }, "翻页间隔", -1));
          const _hoisted_142 = /* @__PURE__ */ _withScopeId$22(() => /* @__PURE__ */ createElementVNode2("p", { class: "time-interval" }, "秒", -1));
          const _hoisted_152 = { style: { "display": "flex" } };
          const _hoisted_162 = { style: { "display": "flex", "margin-top": "10px" } };
          const _sfc_main$72 = /* @__PURE__ */ defineComponent2({
            __name: "Preference",
            setup(__props2) {
              const axios2 = inject2("$axios");
              const platform2 = inject2("$platform");
              const userStore = UserStore();
              const ruleFormRef = ref2();
              const validateEmail = (rule, value, callback) => {
                if (value === "") {
                  callback(new Error("请输入邮箱"));
                } else if (!/^[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+$/.test(value)) {
                  callback(new Error("请输入正确的邮箱"));
                } else {
                  callback();
                }
              };
              const rules2 = reactive2({
                phone: [{ required: true, message: "请输入手机号；作为偏好设置唯一键", trigger: "blur" }],
                email: [{
                  required: true,
                  message: "请输入邮件地址；将通过邮件通知您投递进度",
                  validator: validateEmail,
                  trigger: "blur"
                }]
              });
              const exportSetting = async () => {
                const preference = { ...userStore.user.preference };
                const exportData = JSON.stringify(preference, null, 2);
                try {
                  await navigator.clipboard.writeText(exportData);
                  ElNotification({
                    title: "导出成功",
                    message: "偏好设置已复制到剪贴板",
                    type: "success",
                    duration: 2e3
                  });
                } catch (error) {
                  ElNotification({
                    title: "导出失败",
                    message: "复制到剪贴板时出错",
                    type: "error",
                    duration: 2e3
                  });
                }
              };
              const importSetting = async () => {
                ElMessageBox2.prompt("请粘贴导出的偏好设置配置", "导入偏好设置", {
                  confirmButtonText: "确认",
                  cancelButtonText: "取消",
                  inputType: "textarea",
                  inputPlaceholder: "在此粘贴配置内容"
                }).then(({ value }) => {
                  try {
                    const importedPreference = JSON.parse(value);
                    userStore.user.preference = { ...importedPreference };
                    ElNotification({
                      title: "导入成功",
                      message: "偏好设置已导入，请点击保存偏好设置以持久化保存",
                      type: "success",
                      duration: 3e3
                    });
                  } catch (error) {
                    ElNotification({
                      title: "导入失败",
                      message: "配置格式错误，请检查后重试",
                      type: "error",
                      duration: 2e3
                    });
                  }
                }).catch(() => {
                });
              };
              const submitForm = async (formEl) => {
                if (!loginInterceptor()) {
                  return;
                }
                if (!formEl)
                  return;
                if (!userStore.user.phone || !userStore.user.email) {
                  ElMessage({
                    message: "请填写手机号或邮箱",
                    type: "error",
                    duration: 2e3
                  });
                }
                let valid = await formEl.validate((valid2, fields) => {
                  return valid2;
                });
                if (!valid) {
                  return;
                }
                await axios2.post("/api/user/save/preference", {
                  ...userStore.user,
                  aiSeatStatus: userStore.user.aiSeatStatus ? 1 : 0
                }).then((resp) => {
                  ElMessage({
                    message: "偏好设置保存成功",
                    type: "success",
                    duration: 2e3
                  });
                });
              };
              const resetForm = (formEl) => {
                if (!formEl)
                  return;
                userStore.user.email = "";
                userStore.user.preference = {};
              };
              const firstFile = ref2(null);
              let jobDetail = platform2.getFistJobDetail();
              const uploadData = {
                securityId: jobDetail == null ? void 0 : jobDetail.securityId,
                // securityId: BossOption.bossUserInfoMap?.values()?.next()?.value.securityId,
                source: "chat_file"
              };
              const beforeUpload = (file) => {
                firstFile.value = file;
                return true;
              };
              const handleUploadSuccess = async (response) => {
                userStore.user.preference.cI = response.zpData.url + "===" + response.zpData.tinyUrl;
                ElMessage({
                  message: "图片简历上传成功；点击下方保存偏好设置可持久保存",
                  type: "success",
                  duration: 3e3
                });
              };
              const preferenceDefaultValueHandler = () => {
                if (!userStore.user.preference.dr) {
                  userStore.user.preference.dr = 0;
                }
                if (!userStore.user.preference.srT) {
                  userStore.user.preference.srT = "1";
                }
              };
              preferenceDefaultValueHandler();
              return (_ctx, _cache) => {
                const _component_el_text = ElText;
                const _component_el_input = ElInput;
                const _component_el_form_item = ElFormItem;
                const _component_el_checkbox = ElCheckbox;
                const _component_el_option = ElOption;
                const _component_el_select = ElSelect;
                const _component_el_tooltip = ElTooltip;
                const _component_el_button = ElButton;
                const _component_el_upload = ElUpload;
                const _component_el_tag = ElTag;
                const _component_el_input_number = ElInputNumber;
                const _component_el_form = ElForm;
                return openBlock$1(), createBlock$1(_component_el_form, {
                  ref_key: "ruleFormRef",
                  ref: ruleFormRef,
                  model: unref$1(userStore).user,
                  rules: rules2,
                  "label-position": "right",
                  "label-width": "auto",
                  class: "form-preference",
                  size: "large",
                  "status-icon": ""
                }, {
                  default: withCtx2(() => [
                    createElementVNode2("div", null, [
                      unref$1(Tools).window.location.href.includes("job-recommend") ? (openBlock$1(), createElementBlock2("div", _hoisted_1$52, [
                        createVNode2(_component_el_text, {
                          class: "mx-1 top-title",
                          type: "danger"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("!!!请前往顶部【搜索】按钮所在页面保存偏好设置!!!")
                          ]),
                          _: 1
                        }),
                        _hoisted_2$42,
                        _hoisted_3$22
                      ])) : createCommentVNode2("", true),
                      createVNode2(_component_el_text, {
                        class: "mx-1 top-title",
                        type: "warning"
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2("账号信息")
                        ]),
                        _: 1
                      }),
                      createElementVNode2("div", _hoisted_4$22, [
                        createVNode2(_component_el_form_item, {
                          label: "手机号",
                          prop: "phone",
                          style: { "margin-left": "-6px" }
                        }, {
                          default: withCtx2(() => [
                            createVNode2(_component_el_input, {
                              modelValue: unref$1(userStore).user.phone,
                              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref$1(userStore).user.phone = $event)
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode2(_component_el_form_item, {
                          label: "通知邮箱",
                          prop: "email"
                        }, {
                          default: withCtx2(() => [
                            createVNode2(_component_el_input, {
                              modelValue: unref$1(userStore).user.email,
                              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref$1(userStore).user.email = $event)
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      createVNode2(_component_el_text, {
                        class: "mx-1 top-title",
                        type: "warning"
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2("投递设置")
                        ]),
                        _: 1
                      }),
                      createElementVNode2("div", _hoisted_5$22, [
                        createVNode2(_component_el_form_item, {
                          prop: "companyInclude",
                          style: { "margin-left": "-40px" }
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.cniE,
                              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref$1(userStore).user.preference.cniE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 公司名包含 ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_select, {
                              modelValue: unref$1(userStore).user.preference.cni,
                              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref$1(userStore).user.preference.cni = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "公司名包含",
                              style: { "width": "240px" }
                            }, {
                              default: withCtx2(() => [
                                (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入公司名"], (item, inx) => {
                                  return createVNode2(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode2(_component_el_form_item, {
                          label: "公司名排除",
                          prop: "companyExclude"
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.cneE,
                              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref$1(userStore).user.preference.cneE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 公司名排除    ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_select, {
                              modelValue: unref$1(userStore).user.preference.cne,
                              "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref$1(userStore).user.preference.cne = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "公司名排除",
                              style: { "width": "240px" }
                            }, {
                              default: withCtx2(() => [
                                (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入公司名"], (item, inx) => {
                                  return createVNode2(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      createElementVNode2("div", _hoisted_6$22, [
                        createVNode2(_component_el_form_item, {
                          label: "工作名包含",
                          style: { "margin-left": "-40px" },
                          prop: "jobNameInclude"
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.jniE,
                              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => unref$1(userStore).user.preference.jniE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 工作名包含 ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_select, {
                              modelValue: unref$1(userStore).user.preference.jni,
                              "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => unref$1(userStore).user.preference.jni = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "工作名包含",
                              style: { "width": "240px" }
                            }, {
                              default: withCtx2(() => [
                                (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入工作名"], (item, inx) => {
                                  return createVNode2(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode2(_component_el_form_item, {
                          label: "工作名排除",
                          prop: "jobContentExclude"
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.jneE,
                              "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unref$1(userStore).user.preference.jneE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 工作名排除    ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_select, {
                              modelValue: unref$1(userStore).user.preference.jne,
                              "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => unref$1(userStore).user.preference.jne = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "工作名排除",
                              style: { "width": "240px" }
                            }, {
                              default: withCtx2(() => [
                                (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入岗位名称"], (item, inx) => {
                                  return createVNode2(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      createElementVNode2("div", _hoisted_7$22, [
                        createVNode2(_component_el_form_item, {
                          label: "工作内容包含",
                          style: { "margin-left": "-40px" },
                          prop: "jobContentInclude"
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.jciE,
                              "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref$1(userStore).user.preference.jciE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2("     内容包含 ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_select, {
                              modelValue: unref$1(userStore).user.preference.jci,
                              "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref$1(userStore).user.preference.jci = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "工作内容包含",
                              style: { "width": "240px" }
                            }, {
                              default: withCtx2(() => [
                                (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入工作内容"], (item, inx) => {
                                  return createVNode2(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode2(_component_el_form_item, {
                          label: "工作内容排除",
                          prop: "jobContentExclude"
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.jceE,
                              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => unref$1(userStore).user.preference.jceE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 工作内容排除 ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_select, {
                              modelValue: unref$1(userStore).user.preference.jce,
                              "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => unref$1(userStore).user.preference.jce = $event),
                              multiple: "",
                              filterable: "",
                              remote: "",
                              "allow-create": "",
                              "default-first-option": "",
                              "reserve-keyword": false,
                              placeholder: "工作内容排除",
                              style: { "width": "240px" }
                            }, {
                              default: withCtx2(() => [
                                (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入工作内容字符串"], (item, inx) => {
                                  return createVNode2(_component_el_option, {
                                    key: inx,
                                    label: item,
                                    value: item
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      createElementVNode2("div", _hoisted_8$22, [
                        createVNode2(_component_el_form_item, {
                          label: "薪资范围",
                          prop: "salaryRange",
                          style: { "margin-left": "0" }
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.srE,
                              "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => unref$1(userStore).user.preference.srE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 薪资范围(月薪k) ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_input, {
                              modelValue: unref$1(userStore).user.preference.sr,
                              "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => unref$1(userStore).user.preference.sr = $event),
                              placeholder: "薪资范围 例:9-15"
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        }),
                        createVNode2(_component_el_form_item, {
                          label: "公司规模范围",
                          prop: "jobContentExclude",
                          style: { "margin-left": "0" }
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_checkbox, {
                              modelValue: unref$1(userStore).user.preference.csrE,
                              "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => unref$1(userStore).user.preference.csrE = $event),
                              label: "",
                              size: "large"
                            }, null, 8, ["modelValue"]),
                            createTextVNode2(" 公司规模范围 ")
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_input, {
                              modelValue: unref$1(userStore).user.preference.csr,
                              "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => unref$1(userStore).user.preference.csr = $event),
                              placeholder: "公司规模范围 例:10-5000",
                              style: { "width": "242px" }
                            }, null, 8, ["modelValue"])
                          ]),
                          _: 1
                        })
                      ]),
                      createVNode2(_component_el_form_item, {
                        label: "AI过滤(语义匹配)",
                        prop: "aiFilter"
                      }, {
                        label: withCtx2(() => [
                          createVNode2(_component_el_checkbox, {
                            modelValue: unref$1(userStore).user.preference.afE,
                            "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => unref$1(userStore).user.preference.afE = $event),
                            label: "",
                            size: "large"
                          }, null, 8, ["modelValue"]),
                          createVNode2(_component_el_tooltip, {
                            effect: "dark",
                            "raw-content": "",
                            content: "\r\n    批量投递时AI会通过你的提示词过滤筛选相应岗位<p/><span style='color:red;'>未在【产品列表】中购买【ai过滤】产品请勿开启,页面会报错\r\n    </span><br/>过滤提示词举例：我希望找到武汉的java岗位，薪资至少20K，不考虑学历要求为本科及以下、或者需要超过10年工作经验的职位。\r\n    </span><br/>与简历信息不互通，如果依赖您的某些信息，请通过提示词告知AI\r\n    ",
                            placement: "bottom"
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2(" AI 过滤(语义匹配) ")
                            ]),
                            _: 1
                          })
                        ]),
                        default: withCtx2(() => [
                          createVNode2(_component_el_input, {
                            type: "textarea",
                            modelValue: unref$1(userStore).user.preference.af,
                            "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => unref$1(userStore).user.preference.af = $event)
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_form_item, {
                        label: "发送自定义招呼语",
                        prop: "jobContentExclude"
                      }, {
                        label: withCtx2(() => [
                          createVNode2(_component_el_checkbox, {
                            modelValue: unref$1(userStore).user.preference.cgE,
                            "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => unref$1(userStore).user.preference.cgE = $event),
                            label: "",
                            size: "large"
                          }, null, 8, ["modelValue"]),
                          createTextVNode2(" 发送自定义招呼语 ")
                        ]),
                        default: withCtx2(() => [
                          createVNode2(_component_el_input, {
                            type: "textarea",
                            modelValue: unref$1(userStore).user.preference.cg,
                            "onUpdate:modelValue": _cache[22] || (_cache[22] = ($event) => unref$1(userStore).user.preference.cg = $event)
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_form_item, {
                        label: "发送图片简历",
                        prop: "jobContentExclude",
                        class: "form-item-upload",
                        style: { "margin-left": "0" }
                      }, {
                        label: withCtx2(() => [
                          createVNode2(_component_el_checkbox, {
                            modelValue: unref$1(userStore).user.preference.cIE,
                            "onUpdate:modelValue": _cache[23] || (_cache[23] = ($event) => unref$1(userStore).user.preference.cIE = $event),
                            label: "",
                            size: "large"
                          }, null, 8, ["modelValue"]),
                          createTextVNode2(" 发送图片简历        ")
                        ]),
                        default: withCtx2(() => [
                          createVNode2(_component_el_upload, {
                            action: "https://www.zhipin.com/wapi/zpupload/image/uploadSingle",
                            "before-upload": beforeUpload,
                            "on-success": handleUploadSuccess,
                            "show-file-list": false,
                            data: uploadData,
                            headers: { "Zp_token": unref$1(Tools).getCookieValue("bst") }
                          }, {
                            default: withCtx2(() => [
                              createVNode2(_component_el_button, {
                                size: "small",
                                type: "primary"
                              }, {
                                default: withCtx2(() => [
                                  createTextVNode2("选择图片简历")
                                ]),
                                _: 1
                              })
                            ]),
                            _: 1
                          }, 8, ["headers"]),
                          unref$1(userStore).user.preference.cI ? (openBlock$1(), createBlock$1(_component_el_tag, {
                            key: 0,
                            type: "success",
                            size: "small",
                            style: { "margin-left": "5px" }
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("已上传")
                            ]),
                            _: 1
                          })) : createCommentVNode2("", true)
                        ]),
                        _: 1
                      }),
                      createElementVNode2("div", _hoisted_10$22, [
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.fhE,
                          "onUpdate:modelValue": _cache[24] || (_cache[24] = ($event) => unref$1(userStore).user.preference.fhE = $event),
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("过滤猎头")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.polE,
                          "onUpdate:modelValue": _cache[25] || (_cache[25] = ($event) => unref$1(userStore).user.preference.polE = $event),
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("仅投递boss在线岗位 ")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.acE !== false,
                          "onUpdate:modelValue": ($event) => unref$1(userStore).user.preference.acE = $event,
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("活跃度过滤")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createTextVNode2(" 维度 "),
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.acW !== false,
                          "onUpdate:modelValue": ($event) => unref$1(userStore).user.preference.acW = $event,
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("周")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.acM !== false,
                          "onUpdate:modelValue": ($event) => unref$1(userStore).user.preference.acM = $event,
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("月")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.acY !== false,
                          "onUpdate:modelValue": ($event) => unref$1(userStore).user.preference.acY = $event,
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("年")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createTextVNode2("         "),
                        _hoisted_11$22,
                        createVNode2(_component_el_input_number, {
                          modelValue: unref$1(userStore).user.preference.pi,
                          "onUpdate:modelValue": _cache[26] || (_cache[26] = ($event) => unref$1(userStore).user.preference.pi = $event),
                          min: 3,
                          max: 60,
                          size: "small"
                        }, null, 8, ["modelValue"]),
                        _hoisted_122,
                        createTextVNode2("         "),
                        _hoisted_132,
                        createVNode2(_component_el_input_number, {
                          modelValue: unref$1(userStore).user.preference.npi,
                          "onUpdate:modelValue": _cache[27] || (_cache[27] = ($event) => unref$1(userStore).user.preference.npi = $event),
                          min: 6,
                          max: 60,
                          size: "small"
                        }, null, 8, ["modelValue"]),
                        _hoisted_142
                      ]),
                      createVNode2(_component_el_text, {
                        class: "mx-1 top-title",
                        type: "warning"
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2("交互设置")
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_form_item, {
                        label: "预测问题",
                        prop: "jobContentExclude",
                        style: { "margin-top": "10px" }
                      }, {
                        label: withCtx2(() => [
                          createVNode2(_component_el_checkbox, {
                            modelValue: unref$1(userStore).user.preference.ppE,
                            "onUpdate:modelValue": _cache[28] || (_cache[28] = ($event) => unref$1(userStore).user.preference.ppE = $event),
                            label: "",
                            size: "large"
                          }, null, 8, ["modelValue"]),
                          createTextVNode2(" 预设问题               ")
                        ]),
                        default: withCtx2(() => [
                          createVNode2(_component_el_input, {
                            type: "textarea",
                            modelValue: unref$1(userStore).user.preference.pp,
                            "onUpdate:modelValue": _cache[29] || (_cache[29] = ($event) => unref$1(userStore).user.preference.pp = $event)
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_form_item, {
                        label: "拒绝挽留",
                        prop: "jobContentExclude"
                      }, {
                        label: withCtx2(() => [
                          createVNode2(_component_el_checkbox, {
                            modelValue: unref$1(userStore).user.preference.rfE,
                            "onUpdate:modelValue": _cache[30] || (_cache[30] = ($event) => unref$1(userStore).user.preference.rfE = $event),
                            label: "",
                            size: "large"
                          }, null, 8, ["modelValue"]),
                          createTextVNode2(" 拒绝挽留               ")
                        ]),
                        default: withCtx2(() => [
                          createVNode2(_component_el_input, {
                            type: "textarea",
                            modelValue: unref$1(userStore).user.preference.rf,
                            "onUpdate:modelValue": _cache[31] || (_cache[31] = ($event) => unref$1(userStore).user.preference.rf = $event)
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createElementVNode2("div", _hoisted_152, [
                        createVNode2(_component_el_checkbox, {
                          style: { "padding-top": "6px" },
                          modelValue: unref$1(userStore).user.preference.hiaE,
                          "onUpdate:modelValue": _cache[32] || (_cache[32] = ($event) => unref$1(userStore).user.preference.hiaE = $event),
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("高意向停止AI代聊 ")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createVNode2(_component_el_text, {
                          type: "primary",
                          style: { "margin-top": "-20px" }
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("  高意向条件:")
                          ]),
                          _: 1
                        }),
                        createVNode2(_component_el_form_item, {
                          label: "对话聊天轮数",
                          prop: "crC",
                          style: { "margin-left": "-30px" }
                        }, {
                          label: withCtx2(() => [
                            createVNode2(_component_el_text, {
                              class: "mx-1",
                              type: "primary",
                              style: { "margin-top": "5px" }
                            }, {
                              default: withCtx2(() => [
                                createTextVNode2("对话轮数 >=")
                              ]),
                              _: 1
                            })
                          ]),
                          default: withCtx2(() => [
                            createVNode2(_component_el_text, {
                              class: "mx-1",
                              type: "primary",
                              style: { "margin-top": "5px" }
                            }, {
                              default: withCtx2(() => [
                                createVNode2(_component_el_input, {
                                  type: "number",
                                  style: { "width": "50px" },
                                  size: "small",
                                  modelValue: unref$1(userStore).user.preference.crC,
                                  "onUpdate:modelValue": _cache[33] || (_cache[33] = ($event) => unref$1(userStore).user.preference.crC = $event)
                                }, null, 8, ["modelValue"])
                              ]),
                              _: 1
                            }),
                            createVNode2(_component_el_form_item, {
                              label: "对话聊天轮数关键字",
                              prop: "crC",
                              style: { "margin-left": "0", "margin-top": "3px" }
                            }, {
                              label: withCtx2(() => [
                                createVNode2(_component_el_text, {
                                  class: "mx-1",
                                  type: "primary"
                                }, {
                                  default: withCtx2(() => [
                                    createTextVNode2("OR   包含关键字")
                                  ]),
                                  _: 1
                                })
                              ]),
                              default: withCtx2(() => [
                                createVNode2(_component_el_select, {
                                  modelValue: unref$1(userStore).user.preference.crK,
                                  "onUpdate:modelValue": _cache[34] || (_cache[34] = ($event) => unref$1(userStore).user.preference.crK = $event),
                                  multiple: "",
                                  filterable: "",
                                  remote: "",
                                  "allow-create": "",
                                  "default-first-option": "",
                                  "reserve-keyword": false,
                                  placeholder: "包含关键字",
                                  style: { "min-width": "200px", "width": "100%" }
                                }, {
                                  default: withCtx2(() => [
                                    (openBlock$1(), createElementBlock2(Fragment2, null, renderList2(["请输入包含关键字"], (item, inx) => {
                                      return createVNode2(_component_el_option, {
                                        key: inx,
                                        label: item,
                                        value: item
                                      }, null, 8, ["label", "value"]);
                                    }), 64))
                                  ]),
                                  _: 1
                                }, 8, ["modelValue"])
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      createVNode2(_component_el_form_item, null, {
                        default: withCtx2(() => [
                          createVNode2(_component_el_checkbox, {
                            modelValue: unref$1(userStore).user.preference.drE,
                            "onUpdate:modelValue": _cache[35] || (_cache[35] = ($event) => unref$1(userStore).user.preference.drE = $event),
                            label: "",
                            size: "large"
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("AI代聊延迟回复 ")
                            ]),
                            _: 1
                          }, 8, ["modelValue"]),
                          createTextVNode2("         "),
                          createVNode2(_component_el_input_number, {
                            modelValue: unref$1(userStore).user.preference.dr,
                            "onUpdate:modelValue": _cache[36] || (_cache[36] = ($event) => unref$1(userStore).user.preference.dr = $event),
                            min: 0,
                            max: 30,
                            size: "small"
                          }, null, 8, ["modelValue"]),
                          createTextVNode2("  秒 ")
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_text, {
                        class: "mx-1 top-title",
                        type: "warning"
                      }, {
                        default: withCtx2(() => [
                          createTextVNode2("邮件通知")
                        ]),
                        _: 1
                      }),
                      createElementVNode2("div", _hoisted_162, [
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.ermE,
                          "onUpdate:modelValue": _cache[37] || (_cache[37] = ($event) => unref$1(userStore).user.preference.ermE = $event),
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createTextVNode2("每轮交流邮件通知 ")
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        createVNode2(_component_el_checkbox, {
                          modelValue: unref$1(userStore).user.preference.crE,
                          "onUpdate:modelValue": _cache[38] || (_cache[38] = ($event) => unref$1(userStore).user.preference.crE = $event),
                          label: "",
                          size: "large"
                        }, {
                          default: withCtx2(() => [
                            createVNode2(_component_el_text, {
                              class: "mx-1",
                              type: "danger"
                            }, {
                              default: withCtx2(() => [
                                createTextVNode2("高意向邮件通知")
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      createVNode2(_component_el_form_item, null, {
                        default: withCtx2(() => [
                          createVNode2(_component_el_button, {
                            type: "primary",
                            onClick: _cache[39] || (_cache[39] = ($event) => submitForm(ruleFormRef.value))
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("保存偏好设置")
                            ]),
                            _: 1
                          }),
                          createVNode2(_component_el_button, {
                            onClick: _cache[40] || (_cache[40] = ($event) => resetForm(ruleFormRef.value))
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("清除偏好设置")
                            ]),
                            _: 1
                          }),
                          createVNode2(_component_el_button, { onClick: exportSetting }, {
                            default: withCtx2(() => [
                              createTextVNode2("导出偏好设置")
                            ]),
                            _: 1
                          }),
                          createVNode2(_component_el_button, { onClick: importSetting }, {
                            default: withCtx2(() => [
                              createTextVNode2("导入偏好设置")
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      })
                    ])
                  ]),
                  _: 1
                }, 8, ["model", "rules"]);
              };
            }
          });
          const RenderComponent = _sfc_main$72;
          return (_ctx, _cache) => {
            return openBlock(), createBlock(unref(RenderComponent));
          };
        }
      });
      const Preference = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-b61b2d43"]]);
      const _sfc_main$6 = /* @__PURE__ */ defineComponent({
        __name: "RunRecord",
        setup(__props) {
          const VueAny = Vue;
          const ElementAny = ElementPlus;
          const {
            defineComponent: defineComponent2,
            computed: computed2,
            watch: watch2,
            openBlock: openBlock$1,
            createElementBlock: createElementBlock2,
            ref: ref2,
            onMounted: onMounted2,
            createVNode: createVNode2,
            withCtx: withCtx2,
            createTextVNode: createTextVNode2,
            createElementVNode: createElementVNode2
          } = VueAny;
          const {
            ElButton,
            ElTableColumn,
            ElTable,
            ElInput,
            ElEmpty,
            ElOption,
            ElSelect,
            ElRow,
            ElCol,
            ElTimePicker,
            ElPagination
          } = ElementAny;
          const _sfc_main$62 = /* @__PURE__ */ defineComponent2({
            __name: "RunRecord",
            setup(__props2) {
              const logRecorder = new LogRecorder();
              const logs = ref2([]);
              const currentPage = ref2(1);
              const pageSize = ref2(10);
              const totalLogs = ref2(0);
              const filter2 = ref2({
                timeRange: [],
                // 时间范围，数组：[开始时间, 结束时间]
                level: "",
                // 日志级别
                keyword: ""
                // 日志内容关键字
              });
              const fetchLogs = () => {
                var _a;
                let allLogs = logRecorder.getLogs(1, logRecorder.getLogCount());
                if (((_a = filter2.value.timeRange) == null ? void 0 : _a.length) === 2) {
                  const [start, end] = filter2.value.timeRange.map(
                    (time) => time.toTimeString().slice(0, 6) + "00"
                    // 转为 'HH:mm' 格式字符串
                  );
                  allLogs = allLogs.filter((log) => {
                    const logTime = log.timestamp;
                    return logTime >= start && logTime <= end;
                  });
                }
                if (filter2.value.level) {
                  allLogs = allLogs.filter((log) => log.level === filter2.value.level);
                }
                if (filter2.value.keyword) {
                  const keyword = filter2.value.keyword.toLowerCase();
                  allLogs = allLogs.filter((log) => log.message.toLowerCase().includes(keyword));
                }
                totalLogs.value = allLogs.length;
                const startIndex = (currentPage.value - 1) * pageSize.value;
                logs.value = allLogs.slice(startIndex, startIndex + pageSize.value);
              };
              const handlePageChange = (page) => {
                currentPage.value = page;
                fetchLogs();
              };
              watch2(filter2, () => {
                currentPage.value = 1;
                fetchLogs();
              }, { deep: true });
              const clearLogs = () => {
                logRecorder.clearLogs();
                fetchLogs();
              };
              const trendData = ref2([]);
              const loadTrendData = () => {
                const days = [];
                for (let i = 6; i >= 0; i--) {
                  const d = /* @__PURE__ */ new Date();
                  d.setDate(d.getDate() - i);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, "0");
                  const day = String(d.getDate()).padStart(2, "0");
                  const dateStr = `${y}-${m}-${day}`;
                  const label = `${m}-${day}`;
                  const success = TampermonkeyApi.GmGetValue(`pushSuccessCount:${dateStr}`, 0);
                  const fail = TampermonkeyApi.GmGetValue(`pushFailCount:${dateStr}`, 0);
                  days.push({ date: dateStr, label, success, fail });
                }
                trendData.value = days;
              };
              const trendMax = computed2(() => {
                let max = 0;
                trendData.value.forEach((d) => {
                  if (d.success > max) max = d.success;
                  if (d.fail > max) max = d.fail;
                });
                return max || 1;
              });
              onMounted2(() => {
                fetchLogs();
                loadTrendData();
              });
              return (_ctx, _cache) => {
                const _component_el_button = ElButton;
                const _component_el_col = ElCol;
                const _component_el_time_picker = ElTimePicker;
                const _component_el_option = ElOption;
                const _component_el_select = ElSelect;
                const _component_el_input = ElInput;
                const _component_el_row = ElRow;
                const _component_el_table_column = ElTableColumn;
                const _component_el_empty = ElEmpty;
                const _component_el_table = ElTable;
                const _component_el_pagination = ElPagination;
                return openBlock$1(), createElementBlock2("div", null, [
                  // === 趋势图 SVG ===
                  createElementVNode2("div", { class: "trend-chart-wrapper" }, [
                    createElementVNode2("div", { class: "trend-chart-title" }, "最近 7 天投递趋势"),
                    (openBlock$1(), createElementBlock2("svg", {
                      viewBox: "0 0 420 140",
                      class: "trend-chart-svg"
                    }, [
                      // Y轴网格线
                      ...[0, 0.25, 0.5, 0.75, 1].map(
                        (ratio) => createElementVNode2("line", {
                          x1: 40,
                          y1: 10 + (1 - ratio) * 100,
                          x2: 410,
                          y2: 10 + (1 - ratio) * 100,
                          stroke: "#eee",
                          "stroke-width": 1
                        })
                      ),
                      // 柱状图
                      ...trendData.value.flatMap((d, i) => {
                        const barW = 16;
                        const gap = 50;
                        const x = 55 + i * gap;
                        const maxH = 100;
                        const sH = Math.round(d.success / trendMax.value * maxH);
                        const fH = Math.round(d.fail / trendMax.value * maxH);
                        return [
                          createElementVNode2("rect", {
                            x,
                            y: 110 - sH,
                            width: barW,
                            height: Math.max(sH, 0),
                            fill: "#67c23a",
                            rx: 2
                          }),
                          createElementVNode2("rect", {
                            x: x + barW + 2,
                            y: 110 - fH,
                            width: barW,
                            height: Math.max(fH, 0),
                            fill: "#f56c6c",
                            rx: 2
                          }),
                          createElementVNode2("text", {
                            x: x + barW,
                            y: 128,
                            "text-anchor": "middle",
                            style: "font-size:10px;fill:#909399"
                          }, d.label)
                        ];
                      }),
                      // 图例
                      createElementVNode2("rect", { x: 42, y: 132, width: 10, height: 6, fill: "#67c23a", rx: 1 }),
                      createElementVNode2("text", { x: 55, y: 138, style: "font-size:9px;fill:#606266" }, "成功"),
                      createElementVNode2("rect", { x: 82, y: 132, width: 10, height: 6, fill: "#f56c6c", rx: 1 }),
                      createElementVNode2("text", { x: 95, y: 138, style: "font-size:9px;fill:#606266" }, "失败"),
                      // Y轴标签
                      createElementVNode2("text", { x: 36, y: 14, "text-anchor": "end", style: "font-size:9px;fill:#909399" }, String(trendMax.value)),
                      createElementVNode2("text", { x: 36, y: 114, "text-anchor": "end", style: "font-size:9px;fill:#909399" }, "0")
                    ]))
                  ]),
                  createVNode2(_component_el_row, {
                    gutter: 20,
                    class: "filter-bar"
                  }, {
                    default: withCtx2(() => [
                      createVNode2(_component_el_col, { span: 2 }, {
                        default: withCtx2(() => [
                          createVNode2(_component_el_button, {
                            type: "warning",
                            onClick: clearLogs
                          }, {
                            default: withCtx2(() => [
                              createTextVNode2("清空日志")
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_col, { span: 8 }, {
                        default: withCtx2(() => [
                          createVNode2(_component_el_time_picker, {
                            modelValue: filter2.value.timeRange,
                            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => filter2.value.timeRange = $event),
                            "is-range": "",
                            "start-placeholder": "开始时间",
                            "end-placeholder": "结束时间",
                            format: "HH:mm",
                            clearable: "",
                            style: { "width": "100%" }
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_col, { span: 6 }, {
                        default: withCtx2(() => [
                          createVNode2(_component_el_select, {
                            modelValue: filter2.value.level,
                            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => filter2.value.level = $event),
                            placeholder: "请选择日志级别",
                            style: { "width": "100%" }
                          }, {
                            default: withCtx2(() => [
                              createVNode2(_component_el_option, {
                                label: "全部",
                                value: ""
                              }),
                              createVNode2(_component_el_option, {
                                label: "Error",
                                value: "error"
                              }),
                              createVNode2(_component_el_option, {
                                label: "Warn",
                                value: "warn"
                              }),
                              createVNode2(_component_el_option, {
                                label: "Info",
                                value: "info"
                              }),
                              createVNode2(_component_el_option, {
                                label: "Debug",
                                value: "debug"
                              }),
                              createVNode2(_component_el_option, {
                                label: "Trace",
                                value: "trace"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode2(_component_el_col, { span: 8 }, {
                        default: withCtx2(() => [
                          createVNode2(_component_el_input, {
                            modelValue: filter2.value.keyword,
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => filter2.value.keyword = $event),
                            placeholder: "请输入日志内容",
                            clearable: "",
                            style: { "width": "100%" }
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }),
                  createVNode2(_component_el_table, {
                    data: logs.value,
                    style: { "width": "100%", "min-height": "440px" }
                  }, {
                    empty: withCtx2(() => [
                      createVNode2(_component_el_empty, { description: "暂无日志数据" })
                    ]),
                    default: withCtx2(() => [
                      createVNode2(_component_el_table_column, {
                        prop: "timestamp",
                        label: "时间",
                        width: "120"
                      }),
                      createVNode2(_component_el_table_column, {
                        prop: "level",
                        label: "级别",
                        width: "100"
                      }),
                      createVNode2(_component_el_table_column, {
                        prop: "message",
                        label: "内容"
                      })
                    ]),
                    _: 1
                  }, 8, ["data"]),
                  createVNode2(_component_el_pagination, {
                    onCurrentChange: handlePageChange,
                    "current-page": currentPage.value,
                    "page-size": pageSize.value,
                    total: totalLogs.value,
                    background: "",
                    layout: "prev, pager, next"
                  }, null, 8, ["current-page", "page-size", "total"])
                ]);
              };
            }
          });
          const RenderComponent = _sfc_main$62;
          return (_ctx, _cache) => {
            return openBlock(), createBlock(unref(RenderComponent));
          };
        }
      });
      const RunRecord = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-0c4932dc"]]);
      const _withScopeId$2 = (n) => (pushScopeId("data-v-d31aa50b"), n = n(), popScopeId(), n);
      const _hoisted_1$3 = { class: "api-view-panels" };
      const _hoisted_2$3 = { class: "api-view-list api-config-list" };
      const _hoisted_3$3 = { class: "api-list-header" };
      const _hoisted_4$3 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("span", { class: "api-list-tip" }, "管理多个 API Key，按需启用", -1));
      const _hoisted_5$3 = { class: "api-config-card__meta" };
      const _hoisted_6$3 = { class: "api-config-card__line" };
      const _hoisted_7$3 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("span", { class: "api-config-card__label" }, "Base URL", -1));
      const _hoisted_8$2 = { class: "api-config-card__value" };
      const _hoisted_9$2 = { class: "api-config-card__line" };
      const _hoisted_10$2 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("span", { class: "api-config-card__label" }, "模型", -1));
      const _hoisted_11$2 = { class: "api-config-card__value" };
      const _hoisted_12$2 = { class: "api-config-card__line" };
      const _hoisted_13$1 = /* @__PURE__ */ _withScopeId$2(() => /* @__PURE__ */ createElementVNode("span", { class: "api-config-card__label" }, "API Key", -1));
      const _hoisted_14$1 = { class: "api-config-card__value" };
      const _hoisted_15$1 = { class: "api-config-card__actions" };
      const _hoisted_16$1 = { class: "api-config-card__buttons" };
      const _hoisted_17 = { class: "api-view-edit" };
      const _hoisted_18 = { class: "api-edit-header" };
      const _hoisted_19 = { class: "api-edit-title" };
      const _sfc_main$5 = /* @__PURE__ */ defineComponent({
        __name: "ApiKeyManager",
        setup(__props) {
          const state = inject("aiConfigState");
          if (!state) {
            throw new Error("ApiKeyManager 缺少 aiConfigState 注入");
          }
          const apiConfigList = ref([]);
          const apiView = ref("list");
          const editingConfigId = ref(null);
          const formRef = ref();
          const isTestLoading = ref(false);
          const editForm = ref({
            provider: 0,
            modelName: "",
            apiKey: "",
            baseUrl: "",
            timeout: 60,
            completionsPath: "",
            apiFormat: "completions",
            status: 0,
            testPassed: 0
          });
          const rules = {
            modelName: [
              { required: true, message: "请输入模型名称", trigger: "change" },
              {
                validator: (_rule, value, callback) => {
                  if (value === "...") {
                    callback(new Error("请选择具体模型名或输入模型名称"));
                    return;
                  }
                  callback();
                },
                trigger: "change"
              }
            ],
            apiKey: [{ required: true, message: "请输入API Key", trigger: "change" }],
            timeout: [{ required: true, message: "请输入超时时间", trigger: "change" }],
            baseUrl: [{ required: true, message: "Base URL 不能为空", trigger: "change" }]
          };
          const activeApiConfigId = computed(() => {
            var _a;
            return `${((_a = state.aiConfigExt.value) == null ? void 0 : _a.activeApiConfigId) || ""}`;
          });
          const createApiConfigId = () => {
            return `api-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          };
          const normalizeApiConfigItem = (config) => {
            const current = config || {};
            return {
              id: current.id || createApiConfigId(),
              provider: 0,
              modelName: `${current.modelName || ""}`,
              apiKey: `${current.apiKey || ""}`,
              baseUrl: `${current.baseUrl || ""}`,
              timeout: Number(current.timeout || 60),
              completionsPath: `${current.completionsPath || ""}`,
              apiFormat: current.apiFormat === "responses" ? "responses" : "completions",
              status: Number(current.status || 0),
              testPassed: Number(current.testPassed || 0)
            };
          };
          const maskApiKey = (apiKey) => {
            const value = `${apiKey || ""}`;
            if (!value) {
              return "--";
            }
            const head = value.slice(0, Math.min(4, value.length));
            const tail = value.slice(-Math.min(4, value.length));
            return `${head}****${tail}`;
          };
          const applyApiConfigToForm = (config) => {
            const normalizedConfig = normalizeApiConfigItem(config);
            editForm.value = { ...normalizedConfig };
          };
          const syncEditFormToParent = (config) => {
            var _a;
            const normalizedConfig = normalizeApiConfigItem(config);
            state.form.value = {
              ...state.form.value,
              provider: normalizedConfig.provider,
              modelName: normalizedConfig.modelName,
              apiKey: normalizedConfig.apiKey,
              baseUrl: normalizedConfig.baseUrl,
              timeout: normalizedConfig.timeout,
              completionsPath: normalizedConfig.completionsPath,
              apiFormat: normalizedConfig.apiFormat,
              status: normalizedConfig.status,
              testPassed: normalizedConfig.testPassed
            };
            (_a = state.handleProviderChange) == null ? void 0 : _a.call(state, state.form.value.provider, true);
          };
          const persistApiConfigList = (nextList, nextActiveId = void 0) => {
            const ext = state.ensureAiConfigExtSchema();
            ext.apiConfigs = nextList.map((item) => normalizeApiConfigItem(item));
            if (nextActiveId !== void 0) {
              ext.activeApiConfigId = nextActiveId || "";
            }
            state.persistAiConfigExt();
            apiConfigList.value = ext.apiConfigs.map((item) => ({ ...item }));
          };
          const loadApiConfigs = () => {
            const ext = state.ensureAiConfigExtSchema();
            let list = Array.isArray(ext.apiConfigs) ? ext.apiConfigs.map((item) => normalizeApiConfigItem(item)) : [];
            let activeId = typeof ext.activeApiConfigId === "string" ? ext.activeApiConfigId : "";
            let changed = false;
            if (!list.length && (state.form.value.apiKey || state.form.value.modelName || state.form.value.baseUrl)) {
              const defaultConfig = normalizeApiConfigItem({ ...state.form.value, id: createApiConfigId() });
              list = [defaultConfig];
              if (defaultConfig.status === 1) {
                activeId = defaultConfig.id;
              }
              changed = true;
            }
            if (activeId && !list.some((item) => item.id === activeId)) {
              activeId = "";
              changed = true;
            }
            if (!activeId) {
              const enabledItem = list.find((item) => item.status === 1);
              if (enabledItem) {
                activeId = enabledItem.id;
                changed = true;
              }
            }
            if (activeId) {
              const normalizedStatusList = list.map((item) => ({
                ...item,
                status: item.id === activeId ? 1 : 0
              }));
              if (normalizedStatusList.some((item, index) => item.status !== list[index].status)) {
                list = normalizedStatusList;
                changed = true;
              }
            }
            if (changed) {
              persistApiConfigList(list, activeId);
              return;
            }
            apiConfigList.value = list;
          };
          const backToList = () => {
            apiView.value = "list";
            editingConfigId.value = null;
          };
          const startNewConfig = () => {
            editingConfigId.value = null;
            editForm.value = {
              provider: 0,
              modelName: "",
              apiKey: "",
              baseUrl: "",
              timeout: Number(state.form.value.timeout || 60),
              completionsPath: `${state.form.value.completionsPath || ""}`,
              apiFormat: "completions",
              status: 0,
              testPassed: 0
            };
            apiView.value = "edit";
          };
          const startEditConfig = (id) => {
            const selected = apiConfigList.value.find((item) => item.id === id);
            if (!selected) {
              state.ElMessage({ type: "warning", message: "配置不存在" });
              return;
            }
            editingConfigId.value = id;
            applyApiConfigToForm(selected);
            apiView.value = "edit";
          };
          const saveApiConfig = async () => {
            if (!formRef.value) {
              return;
            }
            await formRef.value.validate(async (valid) => {
              if (!valid) {
                return;
              }
              const id = editingConfigId.value || createApiConfigId();
              const nextItem = normalizeApiConfigItem({ ...editForm.value, id });
              const nextList = apiConfigList.value.map((item) => ({ ...item }));
              const existsIndex = nextList.findIndex((item) => item.id === id);
              if (existsIndex >= 0) {
                nextList[existsIndex] = nextItem;
              } else {
                nextList.unshift(nextItem);
              }
              const ext = state.ensureAiConfigExtSchema();
              let activeId = ext.activeApiConfigId || "";
              if (nextItem.status === 1) {
                activeId = id;
              }
              const normalizedStatusList = nextList.map((item) => ({
                ...item,
                status: activeId && item.id === activeId ? 1 : activeId ? 0 : item.status
              }));
              persistApiConfigList(normalizedStatusList, activeId);
              editingConfigId.value = id;
              apiView.value = "list";
              state.ElMessage({ type: "success", message: "配置已保存" });
            });
          };
          const deleteApiConfig = async (id) => {
            const current = apiConfigList.value.find((item) => item.id === id);
            if (!current) {
              return;
            }
            const confirmed = await state.ElMessageBox.confirm(`确认删除配置【${current.modelName || "未命名模型"}】？`, "删除确认", {
              confirmButtonText: "删除",
              cancelButtonText: "取消",
              type: "warning"
            }).then(() => true).catch(() => false);
            if (!confirmed) {
              return;
            }
            const nextList = apiConfigList.value.filter((item) => item.id !== id).map((item) => ({ ...item }));
            const ext = state.ensureAiConfigExtSchema();
            const activeId = ext.activeApiConfigId === id ? "" : ext.activeApiConfigId || "";
            persistApiConfigList(nextList, activeId);
            if (editingConfigId.value === id) {
              backToList();
            }
            state.ElMessage({ type: "success", message: "配置已删除" });
          };
          const activateApiConfig = async (id) => {
            var _a;
            const selected = apiConfigList.value.find((item) => item.id === id);
            if (!selected) {
              state.ElMessage({ type: "warning", message: "配置不存在" });
              return;
            }
            const nextList = apiConfigList.value.map((item) => ({
              ...item,
              status: item.id === id ? 1 : 0
            }));
            persistApiConfigList(nextList, id);
            syncEditFormToParent({ ...selected, status: 1 });
            await ((_a = state.handleSave) == null ? void 0 : _a.call(state));
            backToList();
          };
          const handleTempSave = async () => {
            if (!formRef.value) {
              return;
            }
            await formRef.value.validate(async (valid) => {
              var _a, _b, _c;
              if (!valid) {
                return;
              }
              try {
                const payload = {
                  ...state.form.value,
                  ...editForm.value
                };
                const response = await request.post("/api/user/ai/config/temp/save", payload);
                if (response.data.code === 200) {
                  state.ElMessage({ type: "success", message: "保存成功" });
                  syncEditFormToParent(editForm.value);
                  await ((_a = state.fetchConfig) == null ? void 0 : _a.call(state));
                }
              } catch (error) {
                const msg = ((_c = (_b = error == null ? void 0 : error.response) == null ? void 0 : _b.data) == null ? void 0 : _c.message) || (error == null ? void 0 : error.message) || "未知错误";
                state.ElMessage({ type: "error", message: `保存失败: ${msg}` });
              }
            });
          };
          const handleTest = async () => {
            if (!formRef.value) {
              return;
            }
            await formRef.value.validate(async (valid) => {
              if (!valid) {
                return;
              }
              isTestLoading.value = true;
              try {
                const answer = await directTest({
                  baseUrl: editForm.value.baseUrl,
                  apiKey: editForm.value.apiKey,
                  modelName: editForm.value.modelName,
                  apiFormat: editForm.value.apiFormat || "completions",
                  timeout: Number(editForm.value.timeout || 60)
                });
                state.ElMessage({ type: "success", message: `测试通过: ${(answer || "").slice(0, 100)}` });
                editForm.value.testPassed = 1;
              } catch (e) {
                state.ElMessage({ type: "error", message: `测试失败: ${(e == null ? void 0 : e.message) || e || ""}` });
              } finally {
                isTestLoading.value = false;
              }
            });
          };
          onMounted(() => {
            loadApiConfigs();
          });
          return (_ctx, _cache) => {
            const _component_el_button = resolveComponent("el-button");
            const _component_el_tag = resolveComponent("el-tag");
            const _component_el_empty = resolveComponent("el-empty");
            const _component_el_input = resolveComponent("el-input");
            const _component_el_form_item = resolveComponent("el-form-item");
            const _component_el_option = resolveComponent("el-option");
            const _component_el_select = resolveComponent("el-select");
            const _component_el_form = resolveComponent("el-form");
            return openBlock(), createElementBlock("div", {
              class: normalizeClass(["api-view-wrapper", apiView.value === "edit" ? "is-edit" : ""])
            }, [
              createElementVNode("div", _hoisted_1$3, [
                createElementVNode("div", _hoisted_2$3, [
                  createElementVNode("div", _hoisted_3$3, [
                    _hoisted_4$3,
                    createVNode(_component_el_button, {
                      type: "primary",
                      onClick: startNewConfig
                    }, {
                      default: withCtx(() => [
                        createTextVNode("新增配置")
                      ]),
                      _: 1
                    })
                  ]),
                  apiConfigList.value.length ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(apiConfigList.value, (item) => {
                    return openBlock(), createElementBlock("div", {
                      key: item.id,
                      class: "api-config-card"
                    }, [
                      createElementVNode("div", _hoisted_5$3, [
                        createElementVNode("div", _hoisted_6$3, [
                          _hoisted_7$3,
                          createElementVNode("span", _hoisted_8$2, toDisplayString(item.baseUrl || "--"), 1)
                        ]),
                        createElementVNode("div", _hoisted_9$2, [
                          _hoisted_10$2,
                          createElementVNode("span", _hoisted_11$2, toDisplayString(item.modelName || "--"), 1)
                        ]),
                        createElementVNode("div", _hoisted_12$2, [
                          _hoisted_13$1,
                          createElementVNode("span", _hoisted_14$1, toDisplayString(maskApiKey(item.apiKey)), 1)
                        ])
                      ]),
                      createElementVNode("div", _hoisted_15$1, [
                        createVNode(_component_el_tag, {
                          size: "small",
                          type: item.id === activeApiConfigId.value ? "success" : "info"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(item.id === activeApiConfigId.value ? "已启用" : "未启用"), 1)
                          ]),
                          _: 2
                        }, 1032, ["type"]),
                        createElementVNode("div", _hoisted_16$1, [
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "primary",
                            plain: "",
                            onClick: ($event) => startEditConfig(item.id)
                          }, {
                            default: withCtx(() => [
                              createTextVNode("编辑")
                            ]),
                            _: 2
                          }, 1032, ["onClick"]),
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "success",
                            disabled: item.id === activeApiConfigId.value,
                            onClick: ($event) => activateApiConfig(item.id)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(" 启用 ")
                            ]),
                            _: 2
                          }, 1032, ["disabled", "onClick"]),
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "danger",
                            plain: "",
                            onClick: ($event) => deleteApiConfig(item.id)
                          }, {
                            default: withCtx(() => [
                              createTextVNode("删除")
                            ]),
                            _: 2
                          }, 1032, ["onClick"])
                        ])
                      ])
                    ]);
                  }), 128)) : (openBlock(), createBlock(_component_el_empty, {
                    key: 1,
                    description: "暂无配置，点击右上角新增配置"
                  }))
                ]),
                createElementVNode("div", _hoisted_17, [
                  createVNode(_component_el_form, {
                    ref_key: "formRef",
                    ref: formRef,
                    model: editForm.value,
                    rules,
                    "label-width": "120px",
                    class: "config-form api-config-form"
                  }, {
                    default: withCtx(() => [
                      createElementVNode("div", _hoisted_18, [
                        createVNode(_component_el_button, {
                          link: "",
                          type: "primary",
                          onClick: backToList
                        }, {
                          default: withCtx(() => [
                            createTextVNode("← 返回列表")
                          ]),
                          _: 1
                        }),
                        createElementVNode("span", _hoisted_19, toDisplayString(editingConfigId.value ? "编辑配置" : "新增配置"), 1)
                      ]),
                      createVNode(_component_el_form_item, {
                        label: "BASE URL",
                        prop: "baseUrl"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_input, {
                            modelValue: editForm.value.baseUrl,
                            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => editForm.value.baseUrl = $event),
                            placeholder: "请输入 Base URL，如 https://api.openai.com/v1"
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_form_item, {
                        label: "API KEY",
                        prop: "apiKey"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_input, {
                            modelValue: editForm.value.apiKey,
                            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => editForm.value.apiKey = $event),
                            placeholder: "请输入 API Key",
                            "show-password": ""
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_form_item, {
                        label: "模型名称",
                        prop: "modelName"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_el_input, {
                            modelValue: editForm.value.modelName,
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => editForm.value.modelName = $event),
                            placeholder: "请输入模型名称，如 gpt-4o / deepseek-chat"
                          }, null, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_form_item, { label: "API 格式" }, {
                        default: withCtx(() => [
                          createVNode(_component_el_select, {
                            modelValue: editForm.value.apiFormat,
                            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => editForm.value.apiFormat = $event),
                            style: { "width": "100%" },
                            teleported: false
                          }, {
                            default: withCtx(() => [
                              createVNode(_component_el_option, {
                                label: "Chat Completions（标准）",
                                value: "completions"
                              }),
                              createVNode(_component_el_option, {
                                label: "Responses API（GPT-5 系列）",
                                value: "responses"
                              })
                            ]),
                            _: 1
                          }, 8, ["modelValue"])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_form_item, null, {
                        default: withCtx(() => [
                          createVNode(_component_el_button, {
                            type: "info",
                            onClick: handleTempSave
                          }, {
                            default: withCtx(() => [
                              createTextVNode("暂存")
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_button, {
                            type: "success",
                            loading: isTestLoading.value,
                            onClick: handleTest
                          }, {
                            default: withCtx(() => [
                              createTextVNode("测试")
                            ]),
                            _: 1
                          }, 8, ["loading"]),
                          createVNode(_component_el_button, {
                            type: "primary",
                            onClick: saveApiConfig
                          }, {
                            default: withCtx(() => [
                              createTextVNode("保存配置")
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 8, ["model"])
                ])
              ])
            ], 2);
          };
        }
      });
      const ApiKeyManager = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-d31aa50b"]]);
      const _withScopeId$1 = (n) => (pushScopeId("data-v-865ef1d4"), n = n(), popScopeId(), n);
      const _hoisted_1$2 = { class: "preset-view-panels" };
      const _hoisted_2$2 = { class: "preset-view-list" };
      const _hoisted_3$2 = { class: "preset-list-header" };
      const _hoisted_4$2 = /* @__PURE__ */ _withScopeId$1(() => /* @__PURE__ */ createElementVNode("span", { class: "preset-list-tip" }, "管理提示词预设，启用后自动合并到系统提示词", -1));
      const _hoisted_5$2 = { class: "preset-card__header" };
      const _hoisted_6$2 = { class: "preset-card__name" };
      const _hoisted_7$2 = { class: "preset-card__content" };
      const _hoisted_8$1 = { class: "preset-card__actions" };
      const _hoisted_9$1 = { class: "preset-card__buttons" };
      const _hoisted_10$1 = { class: "preset-view-edit" };
      const _hoisted_11$1 = { class: "preset-edit-header" };
      const _hoisted_12$1 = { class: "preset-edit-title" };
      const _hoisted_13 = { class: "variable-hint" };
      const _hoisted_14 = /* @__PURE__ */ _withScopeId$1(() => /* @__PURE__ */ createElementVNode("div", { class: "variable-hint__title" }, "可用变量（输入后投递时自动替换为岗位真实信息）", -1));
      const _hoisted_15 = { class: "variable-hint__tags" };
      const _hoisted_16 = { style: { "display": "flex", "gap": "8px", "justify-content": "flex-end" } };
      const _sfc_main$4 = /* @__PURE__ */ defineComponent({
        __name: "PromptPresetManager",
        setup(__props) {
          const state = inject("aiConfigState");
          if (!state) {
            throw new Error("PromptPresetManager 缺少 aiConfigState 注入");
          }
          const presetView = ref("list");
          const editingPresetId = ref(null);
          const presetForm = ref({ name: "", content: "", scope: "personal" });
          const presetOptions = computed(() => {
            return state.getMergedPresetList().map((preset) => ({
              ...preset,
              optionLabel: `${preset.scope === "personal" ? "[模型]" : "[全局]"} ${preset.name}`
            }));
          });
          const backToPresetList = () => {
            presetView.value = "list";
            editingPresetId.value = null;
          };
          const startNewPreset = () => {
            editingPresetId.value = null;
            presetForm.value = { name: "", content: "", scope: "personal" };
            presetView.value = "edit";
          };
          const insertVariable = (label) => {
            presetForm.value.content = (presetForm.value.content || "") + label;
          };
          const startEditPreset = (id) => {
            const preset = state.getPresetById(id);
            if (!preset) {
              state.ElMessage({ type: "warning", message: "预设不存在" });
              return;
            }
            editingPresetId.value = id;
            presetForm.value = {
              name: preset.name || "",
              content: preset.content || "",
              scope: preset.scope || "personal"
            };
            presetView.value = "edit";
          };
          const savePreset = () => {
            const name = (presetForm.value.name || "").trim();
            const content = (presetForm.value.content || "").trim();
            if (!name) {
              state.ElMessage({ type: "warning", message: "请输入预设名称" });
              return;
            }
            if (!content) {
              state.ElMessage({ type: "warning", message: "请输入预设内容" });
              return;
            }
            const ext = state.ensureAiConfigExtSchema();
            if (editingPresetId.value) {
              const list = state.getCurrentChannelPresetList();
              const idx = list.findIndex((item) => item.id === editingPresetId.value);
              if (idx >= 0) {
                list[idx] = { ...list[idx], name, content, updatedAt: Date.now() };
              } else {
                const globalList = ext.promptPresetStore.global || [];
                const gIdx = globalList.findIndex((item) => item.id === editingPresetId.value);
                if (gIdx >= 0) {
                  globalList[gIdx] = { ...globalList[gIdx], name, content };
                }
              }
            } else {
              const preset = {
                id: `personal-${Date.now()}`,
                name,
                tags: ["个人"],
                content,
                scope: "personal",
                enabled: true,
                updatedAt: Date.now()
              };
              state.getCurrentChannelPresetList().push(preset);
            }
            state.persistAiConfigExt();
            state.ElMessage({ type: "success", message: editingPresetId.value ? "预设已更新" : "预设已创建" });
            backToPresetList();
          };
          const togglePresetEnabled = (id) => {
            const ext = state.ensureAiConfigExtSchema();
            const list = state.getCurrentChannelPresetList();
            const idx = list.findIndex((item) => item.id === id);
            if (idx >= 0) {
              list[idx].enabled = !list[idx].enabled;
              state.persistAiConfigExt();
              return;
            }
            const globalList = ext.promptPresetStore.global || [];
            const gIdx = globalList.findIndex((item) => item.id === id);
            if (gIdx >= 0) {
              globalList[gIdx].enabled = !globalList[gIdx].enabled;
              state.persistAiConfigExt();
            }
          };
          const deletePresetById = async (id) => {
            const preset = state.getPresetById(id);
            if (!preset) {
              return;
            }
            if (preset.scope === "global") {
              state.ElMessage({ type: "warning", message: "全局预设不可删除" });
              return;
            }
            const confirmed = await state.ElMessageBox.confirm(`确认删除预设【${preset.name}】？`, "删除确认", {
              confirmButtonText: "删除",
              cancelButtonText: "取消",
              type: "warning"
            }).then(() => true).catch(() => false);
            if (!confirmed) {
              return;
            }
            const list = state.getCurrentChannelPresetList();
            const idx = list.findIndex((item) => item.id === id);
            if (idx >= 0) {
              list.splice(idx, 1);
              state.persistAiConfigExt();
              state.ElMessage({ type: "success", message: "预设已删除" });
            }
          };
          return (_ctx, _cache) => {
            const _component_el_button = resolveComponent("el-button");
            const _component_el_tag = resolveComponent("el-tag");
            const _component_el_switch = resolveComponent("el-switch");
            const _component_el_empty = resolveComponent("el-empty");
            const _component_el_input = resolveComponent("el-input");
            const _component_el_form_item = resolveComponent("el-form-item");
            return openBlock(), createElementBlock("div", {
              class: normalizeClass(["preset-view-wrapper", presetView.value === "edit" ? "is-edit" : ""])
            }, [
              createElementVNode("div", _hoisted_1$2, [
                createElementVNode("div", _hoisted_2$2, [
                  createElementVNode("div", _hoisted_3$2, [
                    _hoisted_4$2,
                    createVNode(_component_el_button, {
                      type: "primary",
                      size: "small",
                      onClick: startNewPreset
                    }, {
                      default: withCtx(() => [
                        createTextVNode("新增预设")
                      ]),
                      _: 1
                    })
                  ]),
                  presetOptions.value.length ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(presetOptions.value, (preset) => {
                    return openBlock(), createElementBlock("div", {
                      key: preset.id,
                      class: "preset-card"
                    }, [
                      createElementVNode("div", _hoisted_5$2, [
                        createElementVNode("span", _hoisted_6$2, toDisplayString(preset.name), 1),
                        createVNode(_component_el_tag, {
                          size: "small",
                          type: preset.scope === "global" ? "warning" : "primary"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(preset.scope === "global" ? "全局" : "模型"), 1)
                          ]),
                          _: 2
                        }, 1032, ["type"])
                      ]),
                      createElementVNode("div", _hoisted_7$2, toDisplayString((preset.content || "").length > 80 ? `${(preset.content || "").slice(0, 80)}...` : preset.content || "暂无内容"), 1),
                      createElementVNode("div", _hoisted_8$1, [
                        createVNode(_component_el_switch, {
                          "model-value": preset.enabled !== false,
                          size: "small",
                          "active-text": "启用",
                          "inactive-text": "",
                          "onUpdate:modelValue": ($event) => togglePresetEnabled(preset.id)
                        }, null, 8, ["model-value", "onUpdate:modelValue"]),
                        createElementVNode("div", _hoisted_9$1, [
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "primary",
                            plain: "",
                            onClick: ($event) => startEditPreset(preset.id)
                          }, {
                            default: withCtx(() => [
                              createTextVNode("编辑")
                            ]),
                            _: 2
                          }, 1032, ["onClick"]),
                          createVNode(_component_el_button, {
                            size: "small",
                            type: "danger",
                            plain: "",
                            disabled: preset.scope === "global",
                            onClick: ($event) => deletePresetById(preset.id)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(" 删除 ")
                            ]),
                            _: 2
                          }, 1032, ["disabled", "onClick"])
                        ])
                      ])
                    ]);
                  }), 128)) : (openBlock(), createBlock(_component_el_empty, {
                    key: 1,
                    description: "暂无预设，点击右上角新增"
                  }))
                ]),
                createElementVNode("div", _hoisted_10$1, [
                  createElementVNode("div", _hoisted_11$1, [
                    createVNode(_component_el_button, {
                      link: "",
                      type: "primary",
                      onClick: backToPresetList
                    }, {
                      default: withCtx(() => [
                        createTextVNode("← 返回列表")
                      ]),
                      _: 1
                    }),
                    createElementVNode("span", _hoisted_12$1, toDisplayString(editingPresetId.value ? "编辑预设" : "新增预设"), 1)
                  ]),
                  createVNode(_component_el_form_item, { label: "预设名称" }, {
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        modelValue: presetForm.value.name,
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => presetForm.value.name = $event),
                        placeholder: "例如：技术岗稳健沟通"
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_el_form_item, { label: "预设内容" }, {
                    default: withCtx(() => [
                      createVNode(_component_el_input, {
                        modelValue: presetForm.value.content,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => presetForm.value.content = $event),
                        type: "textarea",
                        rows: 6,
                        maxlength: 5e3,
                        "show-word-limit": "",
                        placeholder: "输入提示词预设内容"
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createElementVNode("div", _hoisted_13, [
                    _hoisted_14,
                    createElementVNode("div", _hoisted_15, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(unref(PROMPT_VARIABLE_DEFS), (v) => {
                        return openBlock(), createBlock(_component_el_tag, {
                          key: v.key,
                          size: "small",
                          type: "info",
                          class: "variable-tag",
                          onClick: ($event) => insertVariable(v.label)
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(v.label), 1)
                          ]),
                          _: 2
                        }, 1032, ["onClick"]);
                      }), 128))
                    ])
                  ]),
                  createElementVNode("div", _hoisted_16, [
                    createVNode(_component_el_button, { onClick: backToPresetList }, {
                      default: withCtx(() => [
                        createTextVNode("取消")
                      ]),
                      _: 1
                    }),
                    createVNode(_component_el_button, {
                      type: "primary",
                      onClick: savePreset
                    }, {
                      default: withCtx(() => [
                        createTextVNode("保存预设")
                      ]),
                      _: 1
                    })
                  ])
                ])
              ])
            ], 2);
          };
        }
      });
      const PromptPresetManager = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-865ef1d4"]]);
      const _hoisted_1$1 = { class: "chat-history" };
      const _hoisted_2$1 = { class: "bubble" };
      const _hoisted_3$1 = { class: "meta" };
      const _hoisted_4$1 = { class: "content" };
      const _hoisted_5$1 = {
        key: 0,
        class: "tags"
      };
      const _hoisted_6$1 = { class: "chat-composer" };
      const _hoisted_7$1 = { class: "composer-input" };
      const _sfc_main$3 = /* @__PURE__ */ defineComponent({
        __name: "DebugConsole",
        setup(__props, { expose: __expose }) {
          const state = inject("aiConfigState");
          if (!state) {
            throw new Error("DebugConsole 缺少 aiConfigState 注入");
          }
          const DEBUG_MOCK_VARS = {};
          PROMPT_VARIABLE_DEFS.forEach((v) => {
            DEBUG_MOCK_VARS[v.key] = `[示例${v.label}]`;
          });
          const debugDialogVisible = ref(false);
          const debugQuestion = ref("");
          const isDebugLoading = ref(false);
          const debugHistory = ref([]);
          const jobKey = ref("");
          const finalPromptPreview = computed(() => {
            const enabledMergedText = state.getMergedPresetList().filter((preset) => preset.enabled !== false).map((preset, index) => `# ${preset.scope === "personal" ? "模型" : "全局"}预设${index + 1} ${preset.name}
${preset.content}`).join("\n\n");
            return enabledMergedText || "暂无可用提示词内容";
          });
          const openDebugDialog = () => {
            loadCurrentDebugHistory();
            debugDialogVisible.value = true;
          };
          const getJobKey = () => {
            if (jobKey.value) {
              return jobKey.value;
            }
            const key = "ask-debug-" + Tools.window._PAGE.uid + "-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + "@" + Tools.buildModelChannelKey(state.form.value.provider, state.form.value.modelName);
            jobKey.value = key;
            return key;
          };
          const persistCurrentDebugHistory = () => {
            const ext = state.ensureAiConfigExtSchema();
            const key = state.buildCurrentModelChannelKey();
            ext.debugHistoryByChannel[key] = Array.isArray(debugHistory.value) ? debugHistory.value.slice(-20).map((item) => ({ ...item })) : [];
            state.persistAiConfigExt();
          };
          const loadCurrentDebugHistory = () => {
            const ext = state.ensureAiConfigExtSchema();
            const key = state.buildCurrentModelChannelKey();
            const list = ext.debugHistoryByChannel[key];
            debugHistory.value = Array.isArray(list) ? list.slice(-20).map((item) => ({ ...item })) : [];
          };
          const saveDebugHistoryByChannelKey = (channelKey, historyList) => {
            if (!channelKey) {
              return;
            }
            const ext = state.ensureAiConfigExtSchema();
            ext.debugHistoryByChannel[channelKey] = Array.isArray(historyList) ? historyList.slice(-20).map((item) => ({ ...item })) : [];
            state.persistAiConfigExt();
          };
          const handleSendDebug = async () => {
            var _a;
            if (!debugQuestion.value) {
              state.ElMessage({ type: "warning", message: "请输入问题" });
              return;
            }
            if (debugHistory.value.length >= 20) {
              state.ElMessage({ type: "warning", message: "总对话长度不能超过20条，请先清空历史消息重试" });
              return;
            }
            const question = debugQuestion.value;
            debugHistory.value.push({ role: "user", content: question });
            persistCurrentDebugHistory();
            debugQuestion.value = "";
            isDebugLoading.value = true;
            try {
              const directConfig = getActiveDirectConfig();
              if (directConfig) {
                const systemPrompt = resolvePromptVariables(finalPromptPreview.value || "", DEBUG_MOCK_VARS);
                const messages = [];
                if (systemPrompt) {
                  messages.push({ role: "system", content: systemPrompt });
                }
                debugHistory.value.slice(0, debugHistory.value.length - 1).forEach((m) => {
                  messages.push({ role: m.role, content: m.content });
                });
                messages.push({ role: "user", content: question });
                const answer = await directAiCall(directConfig, messages);
                debugHistory.value.push({ role: "assistant", content: answer || "(未返回内容)", answerTypes: [1], operationTypes: [] });
                persistCurrentDebugHistory();
              } else {
                const payload = {
                  jobKey: getJobKey(),
                  question,
                  jobInfo: {},
                  userPrompt: resolvePromptVariables(finalPromptPreview.value || "", DEBUG_MOCK_VARS),
                  messageList: debugHistory.value.slice(0, debugHistory.value.length - 1)
                };
                const resp = await request.post("/api/user/ai/config/debug", payload, {
                  timeout: 6e4,
                  headers: { "Content-Type": "application/json" }
                });
                const data = ((_a = resp == null ? void 0 : resp.data) == null ? void 0 : _a.data) || {};
                const answer = (data == null ? void 0 : data.answerContent) || "";
                const answerTypes = Array.isArray(data == null ? void 0 : data.answerTypeList) ? data.answerTypeList : [];
                const operationTypes = Array.isArray(data == null ? void 0 : data.operationTypeList) ? data.operationTypeList : [];
                debugHistory.value.push({ role: "assistant", content: answer, answerTypes, operationTypes });
                persistCurrentDebugHistory();
              }
            } catch (e) {
              state.ElMessage({ type: "error", message: `调试失败: ${(e == null ? void 0 : e.message) || e || ""}` });
            } finally {
              isDebugLoading.value = false;
            }
          };
          const handleClearHistory = () => {
            debugHistory.value = [];
            persistCurrentDebugHistory();
            jobKey.value = "";
          };
          const mapAnswerType = (t) => {
            if (t === 0) return "NULL";
            if (t === 1) return "发送消息";
            if (t === 2) return "BOSS操作";
            if (t === 3) return "不回复当前消息";
            if (t === 4) return "AI服务异常";
            return String(t);
          };
          const mapOperationType = (t) => {
            if (t === 0) return "NULL";
            if (t === 1) return "发送简历";
            return String(t);
          };
          const mapRoleTitle = (role) => {
            if (role === "user") return "HR";
            return "AI代聊";
          };
          watch(
            () => `${state.form.value.provider}:${state.form.value.modelName || ""}`,
            (newChannelKey, oldChannelKey) => {
              if (oldChannelKey && oldChannelKey !== newChannelKey) {
                saveDebugHistoryByChannelKey(oldChannelKey, debugHistory.value);
              }
              loadCurrentDebugHistory();
              jobKey.value = "";
            }
          );
          __expose({
            open: openDebugDialog
          });
          return (_ctx, _cache) => {
            const _component_el_empty = resolveComponent("el-empty");
            const _component_el_tag = resolveComponent("el-tag");
            const _component_el_input = resolveComponent("el-input");
            const _component_el_button = resolveComponent("el-button");
            const _component_el_dialog = resolveComponent("el-dialog");
            return openBlock(), createBlock(_component_el_dialog, {
              modelValue: debugDialogVisible.value,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => debugDialogVisible.value = $event),
              title: "调试用户提示词",
              width: "800px"
            }, {
              footer: withCtx(() => [
                createVNode(_component_el_button, {
                  type: "warning",
                  disabled: isDebugLoading.value || debugHistory.value.length === 0,
                  onClick: handleClearHistory
                }, {
                  default: withCtx(() => [
                    createTextVNode(" 清空历史 ")
                  ]),
                  _: 1
                }, 8, ["disabled"]),
                createVNode(_component_el_button, {
                  onClick: _cache[1] || (_cache[1] = ($event) => debugDialogVisible.value = false)
                }, {
                  default: withCtx(() => [
                    createTextVNode("关闭")
                  ]),
                  _: 1
                })
              ]),
              default: withCtx(() => [
                createElementVNode("div", _hoisted_1$1, [
                  withDirectives(createVNode(_component_el_empty, { description: "暂无历史消息，请在下方开始你的调试吧" }, null, 512), [
                    [vShow, debugHistory.value.length === 0]
                  ]),
                  (openBlock(true), createElementBlock(Fragment, null, renderList(debugHistory.value, (m, idx) => {
                    return openBlock(), createElementBlock("div", {
                      key: idx,
                      class: normalizeClass(["chat-row", m.role === "user" ? "from-user" : "from-ai"])
                    }, [
                      createElementVNode("div", _hoisted_2$1, [
                        createElementVNode("div", _hoisted_3$1, toDisplayString(mapRoleTitle(m.role)), 1),
                        createElementVNode("div", _hoisted_4$1, toDisplayString(m.content), 1),
                        m.role === "assistant" ? (openBlock(), createElementBlock("div", _hoisted_5$1, [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(m.answerTypes || [], (t, i) => {
                            return openBlock(), createBlock(_component_el_tag, {
                              key: `a-${i}`,
                              size: "small",
                              type: "info"
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(mapAnswerType(t)), 1)
                              ]),
                              _: 2
                            }, 1024);
                          }), 128)),
                          (openBlock(true), createElementBlock(Fragment, null, renderList(m.operationTypes || [], (t, i) => {
                            return openBlock(), createBlock(_component_el_tag, {
                              key: `o-${i}`,
                              size: "small",
                              type: "success"
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(mapOperationType(t)), 1)
                              ]),
                              _: 2
                            }, 1024);
                          }), 128))
                        ])) : createCommentVNode("", true)
                      ])
                    ], 2);
                  }), 128))
                ]),
                createElementVNode("div", _hoisted_6$1, [
                  createElementVNode("div", _hoisted_7$1, [
                    createVNode(_component_el_input, {
                      modelValue: debugQuestion.value,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => debugQuestion.value = $event),
                      type: "textarea",
                      autosize: { minRows: 3, maxRows: 8 },
                      maxlength: 5e3,
                      "show-word-limit": "",
                      placeholder: "作为招聘的HR角色提出你的问题,AI代聊将结合你的偏好设置与微调提示词给出最终回答",
                      clearable: ""
                    }, null, 8, ["modelValue"]),
                    createVNode(_component_el_button, {
                      class: "send-btn",
                      type: "primary",
                      loading: isDebugLoading.value,
                      onClick: handleSendDebug
                    }, {
                      default: withCtx(() => [
                        createTextVNode("发送")
                      ]),
                      _: 1
                    }, 8, ["loading"])
                  ])
                ])
              ]),
              _: 1
            }, 8, ["modelValue"]);
          };
        }
      });
      const DebugConsole = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-5871d477"]]);
      const _withScopeId = (n) => (pushScopeId("data-v-34555a92"), n = n(), popScopeId(), n);
      const _hoisted_1 = { class: "ai-config" };
      const _hoisted_2 = { class: "ai-section" };
      const _hoisted_3 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("div", { class: "ai-section-title" }, "提示词与记忆", -1));
      const _hoisted_4 = { class: "tune-form" };
      const _hoisted_5 = { style: { "display": "flex", "align-items": "center", "gap": "8px", "flex-wrap": "wrap", "width": "100%" } };
      const _hoisted_6 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "启用", -1));
      const _hoisted_7 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "范围", -1));
      const _hoisted_8 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "最大轮数", -1));
      const _hoisted_9 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("span", { style: { "font-size": "12px", "color": "#606266" } }, "摘要阈值", -1));
      const _hoisted_10 = { class: "ai-section" };
      const _hoisted_11 = { class: "ai-section-header" };
      const _hoisted_12 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("div", { class: "ai-section-title" }, "自有API配置", -1));
      const _sfc_main$2 = /* @__PURE__ */ defineComponent({
        __name: "AiConfig",
        setup(__props) {
          const formRef = ref();
          const debugConsoleRef = ref();
          const modelOptions = {
            0: [],
            1: ["deepseek-chat", "deepseek-reasoner"],
            2: ["deepseek-r1-250120", "..."],
            3: ["deepseek-ai/DeepSeek-V3", "..."],
            4: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
            5: ["deepseek/deepseek-chat-v3-0324:free", "..."]
          };
          const availableModels = ref([]);
          const providerDetails = ref({});
          const lastFetchedConfig = ref(null);
          const form = ref({
            userId: 0,
            provider: 1,
            modelName: "",
            apiKey: "",
            baseUrl: "",
            timeout: 60,
            completionsPath: "",
            testPassed: 0,
            status: 0,
            userPrompt: ""
          });
          const isTestLoading = ref(false);
          const importResumeLoading = ref(false);
          const aiConfigExt = ref(Tools.getAiConfigExt());
          const memoryScopeOptions = [
            { label: "会话级", value: "session" },
            { label: "岗位级", value: "job" },
            { label: "全局级", value: "global" }
          ];
          const memoryProfile = ref({
            enabled: true,
            scope: "session",
            maxTurns: 20,
            summaryThreshold: 12,
            clearOnModelSwitch: true
          });
          const normalizeMemoryProfile = (profile) => {
            return {
              enabled: (profile == null ? void 0 : profile.enabled) !== false,
              scope: (profile == null ? void 0 : profile.scope) || "session",
              maxTurns: Number((profile == null ? void 0 : profile.maxTurns) || 20),
              summaryThreshold: Number((profile == null ? void 0 : profile.summaryThreshold) || 12),
              clearOnModelSwitch: (profile == null ? void 0 : profile.clearOnModelSwitch) !== false
            };
          };
          const buildCurrentModelChannelKey = () => Tools.buildModelChannelKey(form.value.provider, form.value.modelName);
          const ensureAiConfigExtSchema = () => {
            if (!aiConfigExt.value) {
              aiConfigExt.value = Tools.getAiConfigExt();
            }
            if (!aiConfigExt.value.currentConfig) {
              aiConfigExt.value.currentConfig = { provider: 1, modelName: "" };
            }
            if (!Array.isArray(aiConfigExt.value.apiConfigs)) {
              aiConfigExt.value.apiConfigs = [];
            }
            if (typeof aiConfigExt.value.activeApiConfigId !== "string") {
              aiConfigExt.value.activeApiConfigId = "";
            }
            if (!aiConfigExt.value.memoryProfiles) {
              aiConfigExt.value.memoryProfiles = {};
            }
            if (!aiConfigExt.value.promptPresetStore) {
              aiConfigExt.value.promptPresetStore = { global: [], personal: {} };
            }
            if (!Array.isArray(aiConfigExt.value.promptPresetStore.global)) {
              aiConfigExt.value.promptPresetStore.global = [];
            }
            if (!aiConfigExt.value.promptPresetStore.personal) {
              aiConfigExt.value.promptPresetStore.personal = {};
            }
            if (!aiConfigExt.value.debugHistoryByChannel) {
              aiConfigExt.value.debugHistoryByChannel = {};
            }
            if (!aiConfigExt.value.uiLayout) {
              aiConfigExt.value.uiLayout = { style: "dashboard-2col" };
            }
            if (!aiConfigExt.value.uiLayout.style) {
              aiConfigExt.value.uiLayout.style = "dashboard-2col";
            }
            return aiConfigExt.value;
          };
          const persistAiConfigExt = () => {
            aiConfigExt.value = Tools.saveAiConfigExt(ensureAiConfigExtSchema());
          };
          const ensureGlobalPresetCatalog = () => {
            const ext = ensureAiConfigExtSchema();
            if ((ext.promptPresetStore.global || []).length > 0) {
              return;
            }
            ext.promptPresetStore.global = [
              {
                id: "global-brief-professional",
                name: "简洁专业",
                tags: ["通用", "稳健"],
                content: "请使用简洁、专业、礼貌的语气回复，优先给出可执行结论。",
                scope: "global",
                enabled: true
              },
              {
                id: "global-value-driven",
                name: "价值导向",
                tags: ["通用", "亮点"],
                content: "回答中优先突出可量化成果、项目价值和岗位匹配度，避免空泛表达。",
                scope: "global",
                enabled: true
              }
            ];
            persistAiConfigExt();
          };
          const getCurrentChannelPresetList = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            const current = ext.promptPresetStore.personal[key];
            if (!Array.isArray(current)) {
              ext.promptPresetStore.personal[key] = [];
              persistAiConfigExt();
            }
            return ext.promptPresetStore.personal[key];
          };
          const getMergedPresetList = () => {
            const ext = ensureAiConfigExtSchema();
            const channelPresetList = getCurrentChannelPresetList().map((preset) => ({ ...preset, scope: "personal" }));
            const channelNameSet = new Set(
              channelPresetList.map((preset) => `${preset.name || ""}`.trim()).filter((name) => !!name)
            );
            const globalPresetList = (ext.promptPresetStore.global || []).filter((preset) => {
              const name = `${preset.name || ""}`.trim();
              return !name || !channelNameSet.has(name);
            }).map((preset) => ({ ...preset, scope: "global" }));
            return [...globalPresetList, ...channelPresetList];
          };
          const getPresetById = (presetId) => {
            if (!presetId) {
              return null;
            }
            return getMergedPresetList().find((preset) => preset.id === presetId) || null;
          };
          computed(() => {
            return getMergedPresetList().map((preset) => ({
              ...preset,
              optionLabel: `${preset.scope === "personal" ? "[模型]" : "[全局]"} ${preset.name}`
            }));
          });
          const finalPromptPreview = computed(() => {
            const enabledMergedText = getMergedPresetList().filter((preset) => preset.enabled !== false).map((preset, index) => `# ${preset.scope === "personal" ? "模型" : "全局"}预设${index + 1} ${preset.name}
${preset.content}`).join("\n\n");
            return enabledMergedText || "暂无可用提示词内容";
          });
          const saveCurrentMemoryProfileSilently = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            ext.memoryProfiles[key] = normalizeMemoryProfile(memoryProfile.value);
            persistAiConfigExt();
          };
          const saveCurrentMemoryProfile = () => {
            saveCurrentMemoryProfileSilently();
            ElMessage({ type: "success", message: "模型记忆策略已保存" });
          };
          const loadCurrentMemoryProfile = () => {
            const ext = ensureAiConfigExtSchema();
            const key = buildCurrentModelChannelKey();
            memoryProfile.value = normalizeMemoryProfile(ext.memoryProfiles[key]);
          };
          const syncCurrentChannelToExt = () => {
            const ext = ensureAiConfigExtSchema();
            ext.currentConfig = {
              provider: form.value.provider,
              modelName: form.value.modelName || ""
            };
            persistAiConfigExt();
          };
          const compareWithLastConfig = () => {
            if (!lastFetchedConfig.value) {
              return false;
            }
            const currentConfig = form.value;
            const normalizeCompletionsPath = (path) => {
              return !path || path.trim() === "" ? "" : path;
            };
            return currentConfig.provider === lastFetchedConfig.value.provider && currentConfig.modelName === lastFetchedConfig.value.modelName && currentConfig.apiKey === lastFetchedConfig.value.apiKey && currentConfig.baseUrl === lastFetchedConfig.value.baseUrl && normalizeCompletionsPath(currentConfig.completionsPath) === normalizeCompletionsPath(lastFetchedConfig.value.completionsPath);
          };
          const handleProviderChange = (value, keepModelName = false) => {
            availableModels.value = modelOptions[value] || [];
            if (!keepModelName) {
              form.value.modelName = "";
            }
            if (value !== 0 && providerDetails.value[value]) {
              form.value.baseUrl = providerDetails.value[value].defaultBaseUrl;
            }
            const isDataUnchanged = compareWithLastConfig();
            if (!isDataUnchanged) {
              form.value.testPassed = 0;
            }
          };
          const fetchAllProviderDetails = async () => {
            try {
              const response = await request.get("/api/user/ai/config/all/provider");
              if (response.data.code === 200) {
                const details = response.data.data;
                providerDetails.value = details.reduce((acc, detail) => {
                  acc[detail.code] = detail;
                  return acc;
                }, {});
              }
            } catch (error) {
              ElMessage({ type: "error", message: "获取供应商信息失败" });
            }
          };
          const fetchConfig = async () => {
            try {
              const response = await request.get("/api/user/ai/config/current");
              if (response.data.code === 200) {
                ensureGlobalPresetCatalog();
                let config = response.data.data;
                if (!config) {
                  config = {
                    status: 0,
                    provider: 1,
                    timeout: 60
                  };
                }
                form.value = { ...form.value, ...config };
                lastFetchedConfig.value = { ...config };
                const ext = ensureAiConfigExtSchema();
                if (!form.value.modelName && (ext == null ? void 0 : ext.currentConfig) && ext.currentConfig.provider === form.value.provider && ext.currentConfig.modelName) {
                  form.value.modelName = ext.currentConfig.modelName;
                }
                handleProviderChange(form.value.provider, true);
                syncCurrentChannelToExt();
                loadCurrentMemoryProfile();
              }
            } catch (error) {
              ElMessage({ type: "error", message: "获取配置失败" });
            }
          };
          watch(
            () => ({
              provider: form.value.provider,
              modelName: form.value.modelName,
              apiKey: form.value.apiKey,
              baseUrl: form.value.baseUrl,
              completionsPath: form.value.completionsPath,
              timeout: form.value.timeout,
              status: form.value.status
            }),
            () => {
              var _a;
              const isDataUnchanged = compareWithLastConfig();
              if (!isDataUnchanged) {
                form.value.testPassed = 0;
              }
              if (((_a = lastFetchedConfig.value) == null ? void 0 : _a.testPassed) && isDataUnchanged) {
                form.value.testPassed = 1;
              }
            },
            { deep: true }
          );
          const doPersistConfig = async (endpoint) => {
            const { userPrompt, apiFormat, ...rest } = form.value;
            const response = await request.post(endpoint, rest);
            if (response.data.code === 200) {
              syncCurrentChannelToExt();
              saveCurrentMemoryProfileSilently();
              return true;
            }
            return false;
          };
          const handleSave = async () => {
            var _a, _b;
            try {
              const ok = await doPersistConfig("/api/user/ai/config/save");
              if (ok) {
                ElMessage({ type: "success", message: "保存成功" });
              }
            } catch (e) {
              const msg = ((_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || (e == null ? void 0 : e.message) || "未知错误";
              ElMessage({ type: "error", message: `保存失败: ${msg}` });
            }
          };
          const handleTempSave = async () => {
            try {
              const ok = await doPersistConfig("/api/user/ai/config/temp/save");
              if (ok) {
                ElMessage({ type: "success", message: "保存成功" });
                await fetchConfig();
              }
            } catch (error) {
              ElMessage({ type: "error", message: "保存失败" });
            }
          };
          const handleSavePrompt = async () => {
            try {
              const composedPrompt = finalPromptPreview.value || "";
              const resp = await request.post("/api/user/ai/config/temp/save", {
                userPrompt: composedPrompt,
                userId: form.value.userId
              });
              if (resp.data.code === 200) {
                syncCurrentChannelToExt();
                ElMessage({ type: "success", message: "保存成功" });
              }
            } catch (e) {
              ElMessage({ type: "error", message: "保存失败" });
            }
          };
          const handleTest = async () => {
            isTestLoading.value = true;
            try {
              const response = await request.post("/api/user/ai/config/test", form.value, {
                timeout: form.value.timeout * 1e3 - 200
              });
              if (response.data.code === 200) {
                ElMessage({ type: "success", message: `测试通过: ${response.data.data || ""}` });
                form.value.testPassed = 1;
                return;
              }
              ElMessage({ type: "error", message: `测试失败: ${response.data.message || ""}` });
            } catch (e) {
              ElMessage({ type: "error", message: `测试失败: ${e || ""}` });
            } finally {
              isTestLoading.value = false;
            }
          };
          const handleImportResume = async () => {
            var _a2, _b2, _c2, _d2, _e, _f, _g, _h, _i, _j, _k;
            var _a, _b, _c, _d;
            if (!loginInterceptor()) {
              return;
            }
            const token = (_b = (_a = Tools.window) == null ? void 0 : _a._PAGE) == null ? void 0 : _b.token;
            const bossUserId = (_d = (_c = Tools.window) == null ? void 0 : _c._PAGE) == null ? void 0 : _d.uid;
            if (!token || !bossUserId) {
              ElMessage({ type: "error", message: "未获取到 Boss 登录信息，请刷新页面后重试" });
              return;
            }
            importResumeLoading.value = true;
            try {
              const resumeInfoResp = await axios.get("https://www.zhipin.com/wapi/zpgeek/resume/sidebar.json", {
                headers: { Zp_token: token }
              });
              const attachmentList = ((_b2 = (_a2 = resumeInfoResp == null ? void 0 : resumeInfoResp.data) == null ? void 0 : _a2.zpData) == null ? void 0 : _b2.attachmentList) || [];
              if (!attachmentList.length) {
                ElMessage({
                  type: "error",
                  message: "请先在 BOSS 个人中心上传附件简历，再执行导入"
                });
                return;
              }
              const resumeId = attachmentList[0].resumeId;
              const resumeFileResp = await fetchWithGM_request(
                "https://docdownload.zhipin.com/wflow/zpgeek/download/download4geek?resumeId=" + resumeId,
                { headers: { Zp_token: token }, responseType: "arraybuffer" }
              );
              const fileBlob = new Blob([resumeFileResp.response], { type: "application/pdf" });
              const formData = new FormData();
              formData.append("file", fileBlob);
              formData.append("resumeId", resumeId);
              formData.append("uniqueId", String(bossUserId));
              const importResp = await request.post("/api/user/import/resume", formData, {
                headers: { "Content-Type": "multipart/form-data" }
              });
              if (((_c2 = importResp == null ? void 0 : importResp.data) == null ? void 0 : _c2.code) !== 200) {
                const importMsg = ((_e = (_d2 = importResp == null ? void 0 : importResp.data) == null ? void 0 : _d2.data) == null ? void 0 : _e.msg) || ((_f = importResp == null ? void 0 : importResp.data) == null ? void 0 : _f.message) || "未知错误";
                ElMessage({ type: "error", message: `导入简历失败: ${importMsg}` });
                return;
              }
              const loginResp = await request.post("/api/user/silently/login?uniqueId=" + bossUserId);
              if ((_g = loginResp == null ? void 0 : loginResp.data) == null ? void 0 : _g.data) {
                localStorage.setItem("Authorization", loginResp.data.data);
              }
              if (!((_i = (_h = importResp == null ? void 0 : importResp.data) == null ? void 0 : _h.data) == null ? void 0 : _i.email)) {
                ElMessage({
                  type: "warning",
                  message: "导入简历成功，但未识别到邮箱，请在偏好设置中完善通知邮箱"
                });
                return;
              }
              ElMessage({ type: "success", message: "导入简历成功" });
            } catch (e) {
              const msg = ((_k = (_j = e == null ? void 0 : e.response) == null ? void 0 : _j.data) == null ? void 0 : _k.message) || (e == null ? void 0 : e.message) || "未知错误";
              ElMessage({ type: "error", message: `导入简历失败: ${msg}` });
            } finally {
              importResumeLoading.value = false;
            }
          };
          watch(
            () => `${form.value.provider}:${form.value.modelName || ""}`,
            () => {
              syncCurrentChannelToExt();
              loadCurrentMemoryProfile();
            }
          );
          const openDebugDialog = () => {
            var _a, _b;
            (_b = (_a = debugConsoleRef.value) == null ? void 0 : _a.open) == null ? void 0 : _b.call(_a);
          };
          provide("aiConfigState", {
            form,
            aiConfigExt,
            memoryProfile,
            ensureAiConfigExtSchema,
            persistAiConfigExt,
            buildCurrentModelChannelKey,
            getCurrentChannelPresetList,
            getMergedPresetList,
            getPresetById,
            ElMessage,
            ElMessageBox,
            fetchConfig,
            handleSave,
            handleTempSave,
            handleTest,
            handleProviderChange
          });
          onMounted(async () => {
            fetchAllProviderDetails();
            await fetchConfig();
          });
          return (_ctx, _cache) => {
            const _component_el_form_item = resolveComponent("el-form-item");
            const _component_el_switch = resolveComponent("el-switch");
            const _component_el_option = resolveComponent("el-option");
            const _component_el_select = resolveComponent("el-select");
            const _component_el_input_number = resolveComponent("el-input-number");
            const _component_el_button = resolveComponent("el-button");
            const _component_el_form = resolveComponent("el-form");
            const _component_el_tooltip = resolveComponent("el-tooltip");
            return openBlock(), createElementBlock("div", _hoisted_1, [
              createElementVNode("div", _hoisted_2, [
                _hoisted_3,
                createElementVNode("div", _hoisted_4, [
                  createVNode(_component_el_form, {
                    ref_key: "formRef",
                    ref: formRef,
                    "label-width": "120px"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_form_item, { label: "提示词管理" }, {
                        default: withCtx(() => [
                          createVNode(PromptPresetManager)
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_form_item, { label: "记忆策略" }, {
                        default: withCtx(() => [
                          createElementVNode("div", _hoisted_5, [
                            _hoisted_6,
                            createVNode(_component_el_switch, {
                              modelValue: memoryProfile.value.enabled,
                              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => memoryProfile.value.enabled = $event)
                            }, null, 8, ["modelValue"]),
                            _hoisted_7,
                            createVNode(_component_el_select, {
                              modelValue: memoryProfile.value.scope,
                              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => memoryProfile.value.scope = $event),
                              style: { "width": "120px" },
                              teleported: false
                            }, {
                              default: withCtx(() => [
                                (openBlock(), createElementBlock(Fragment, null, renderList(memoryScopeOptions, (option) => {
                                  return createVNode(_component_el_option, {
                                    key: option.value,
                                    label: option.label,
                                    value: option.value
                                  }, null, 8, ["label", "value"]);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"]),
                            _hoisted_8,
                            createVNode(_component_el_input_number, {
                              modelValue: memoryProfile.value.maxTurns,
                              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => memoryProfile.value.maxTurns = $event),
                              min: 1,
                              max: 100
                            }, null, 8, ["modelValue"]),
                            _hoisted_9,
                            createVNode(_component_el_input_number, {
                              modelValue: memoryProfile.value.summaryThreshold,
                              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => memoryProfile.value.summaryThreshold = $event),
                              min: 1,
                              max: 100
                            }, null, 8, ["modelValue"]),
                            createVNode(_component_el_button, {
                              type: "primary",
                              plain: "",
                              onClick: saveCurrentMemoryProfile
                            }, {
                              default: withCtx(() => [
                                createTextVNode("保存记忆")
                              ]),
                              _: 1
                            })
                          ])
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_form_item, null, {
                        default: withCtx(() => [
                          createVNode(_component_el_button, {
                            type: "primary",
                            onClick: handleSavePrompt
                          }, {
                            default: withCtx(() => [
                              createTextVNode("保存")
                            ]),
                            _: 1
                          }),
                          createVNode(_component_el_button, {
                            type: "warning",
                            onClick: openDebugDialog
                          }, {
                            default: withCtx(() => [
                              createTextVNode("调试")
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      })
                    ]),
                    _: 1
                  }, 512)
                ])
              ]),
              createElementVNode("div", _hoisted_10, [
                createElementVNode("div", _hoisted_11, [
                  _hoisted_12,
                  createVNode(_component_el_tooltip, {
                    effect: "dark",
                    placement: "bottom",
                    "raw-content": "",
                    content: "在 Boss 更新附件简历后请重新导入，仅用于 AI 代聊定制化回复"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_el_button, {
                        type: "primary",
                        loading: importResumeLoading.value,
                        onClick: handleImportResume
                      }, {
                        default: withCtx(() => [
                          createTextVNode("导入简历")
                        ]),
                        _: 1
                      }, 8, ["loading"])
                    ]),
                    _: 1
                  })
                ]),
                createVNode(ApiKeyManager)
              ]),
              createVNode(DebugConsole, {
                ref_key: "debugConsoleRef",
                ref: debugConsoleRef
              }, null, 512)
            ]);
          };
        }
      });
      const AiConfig = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-34555a92"]]);
      const STORAGE_KEY = "ai-job-panel-collapsed";
      const WIDTH_STORAGE_KEY = "ai-job-panel-width";
      const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/></svg>';
      const SVG_CLOSE = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      const SVG_MINIMIZE = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>';
      const SVG_TAB_AI = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
      const SVG_TAB_PREF = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.72V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.17a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
      const SVG_TAB_RECORD = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
      const SVG_TAB_CONFIG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';
      const _sfc_main$1 = /* @__PURE__ */ defineComponent({
        __name: "Panel",
        setup(__props) {
          const VueAny = Vue;
          const {
            defineComponent: defineComponent2,
            openBlock: openBlock$1,
            createElementBlock: createElementBlock2,
            normalizeClass: normalizeClass2,
            ref: ref2,
            onMounted: onMounted2,
            createBlock: createBlock$1,
            resolveDynamicComponent,
            normalizeStyle,
            createElementVNode: createElementVNode2,
            nextTick,
            renderList: renderList2,
            shallowRef
          } = VueAny;
          const _sfc_main$12 = /* @__PURE__ */ defineComponent2({
            __name: "Panel",
            setup(__props2) {
              const showComponent = shallowRef(AiJob);
              const activeMenuKey = ref2("1");
              const collapsed = ref2(false);
              const panelWidth = ref2(480);
              const isResizing = ref2(false);
              onMounted2(() => {
                try {
                  const saved = localStorage.getItem(STORAGE_KEY);
                  if (saved === "true") collapsed.value = true;
                  const savedWidth = localStorage.getItem(WIDTH_STORAGE_KEY);
                  if (savedWidth) {
                    const w = parseInt(savedWidth);
                    if (w >= 380 && w <= 800) panelWidth.value = w;
                  }
                } catch (_e) {
                }
              });
              const toggleCollapse = () => {
                collapsed.value = !collapsed.value;
                try {
                  localStorage.setItem(STORAGE_KEY, String(collapsed.value));
                } catch (_e) {
                }
              };
              const componentMap = /* @__PURE__ */ new Map();
              componentMap.set("1", { component: AiJob, name: "AI 助手", icon: SVG_TAB_AI });
              componentMap.set("2", { component: Preference, name: "偏好设置", icon: SVG_TAB_PREF });
              componentMap.set("3", { component: RunRecord, name: "运行记录", icon: SVG_TAB_RECORD });
              componentMap.set("4", { component: AiConfig, name: "AI 配置", icon: SVG_TAB_CONFIG });
              const cleanupPreference = () => {
                nextTick(() => {
                  document.querySelectorAll(".form-preference .el-form-item__label, .ai-config .el-form-item__label").forEach((label) => {
                    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
                    let node;
                    while (node = walker.nextNode()) {
                      const cleaned = node.textContent.replace(/[\u00a0]/g, " ").replace(/^\s+/, "").replace(/\s+$/, "");
                      if (cleaned !== node.textContent) node.textContent = cleaned;
                    }
                  });
                });
              };
              const handleSelect = (key) => {
                activeMenuKey.value = key;
                const item = componentMap.get(key);
                if (item) showComponent.value = item.component;
                cleanupPreference();
              };
              const startResize = (e) => {
                e.preventDefault();
                isResizing.value = true;
                const startX = e.clientX;
                const startWidth = panelWidth.value;
                const onMouseMove = (moveEvent) => {
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
                  try {
                    localStorage.setItem(WIDTH_STORAGE_KEY, String(panelWidth.value));
                  } catch (_e) {
                  }
                };
                document.addEventListener("mousemove", onMouseMove);
                document.addEventListener("mouseup", onMouseUp);
              };
              return (_ctx, _cache) => {
                return openBlock$1(), createElementBlock2("div", { class: "ai-job-root" }, [
                  // FAB Button
                  createElementVNode2("div", {
                    class: normalizeClass2(["ai-fab", { "ai-fab--close": !collapsed.value }]),
                    onClick: toggleCollapse,
                    title: collapsed.value ? "展开 AI 助手面板" : "收起面板",
                    innerHTML: collapsed.value ? SVG_OPEN : SVG_CLOSE
                  }, null, 10, ["title", "innerHTML"]),
                  // Sidebar (CSS class controls visibility, no vShow/Transition)
                  createElementVNode2(
                    "div",
                    {
                      class: normalizeClass2(["ai-sidebar", {
                        "is-resizing": isResizing.value,
                        "is-collapsed": collapsed.value
                      }]),
                      style: normalizeStyle({ width: panelWidth.value + "px" })
                    },
                    [
                      // Resize Handle
                      createElementVNode2("div", {
                        class: "ai-resize-handle",
                        onMousedown: startResize
                      }),
                      // Header
                      createElementVNode2("div", { class: "ai-sidebar-header" }, [
                        createElementVNode2("div", { class: "ai-sidebar-title" }, "AI 工作猎手"),
                        createElementVNode2("div", {
                          class: "ai-sidebar-minimize",
                          onClick: toggleCollapse,
                          title: "收起面板",
                          innerHTML: SVG_MINIMIZE
                        })
                      ]),
                      // Nav Tabs (plain HTML, no ElMenu)
                      createElementVNode2(
                        "div",
                        { class: "ai-sidebar-nav" },
                        renderList2(Array.from(componentMap.entries()), ([key, value]) => {
                          return createElementVNode2("div", {
                            class: normalizeClass2(["ai-nav-tab", { "is-active": activeMenuKey.value === key }]),
                            onClick: () => handleSelect(key),
                            innerHTML: value.icon + "<span>" + value.name + "</span>"
                          }, null, 10, ["innerHTML"]);
                        })
                      ),
                      // Body
                      createElementVNode2("div", { class: "ai-sidebar-body" }, [
                        (openBlock$1(), createBlock$1(Vue.KeepAlive, null, { default: () => [(openBlock$1(), createBlock$1(resolveDynamicComponent(showComponent.value)))], _: 1 }))
                      ])
                    ],
                    6
                    /* CLASS, STYLE */
                  )
                ]);
              };
            }
          });
          const RenderComponent = _sfc_main$12;
          return (_ctx, _cache) => {
            return openBlock(), createBlock(unref(RenderComponent));
          };
        }
      });
      const Panel = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-128e536d"]]);
      const Panel$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
        __proto__: null,
        default: Panel
      }, Symbol.toStringTag, { value: "Module" }));
      const _sfc_main = /* @__PURE__ */ defineComponent({
        __name: "App",
        setup(__props) {
          return (_ctx, _cache) => {
            return openBlock(), createBlock(Panel);
          };
        }
      });
      const scriptRel = /* @__PURE__ */ (function detectScriptRel() {
        const relList = typeof document !== "undefined" && document.createElement("link").relList;
        return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
      })();
      const assetsURL = function(dep) {
        return "/" + dep;
      };
      const seen = {};
      const __vitePreload = function preload(baseModule, deps, importerUrl) {
        let promise = Promise.resolve();
        if (deps && deps.length > 0) {
          let allSettled2 = function(promises) {
            return Promise.all(
              promises.map(
                (p) => Promise.resolve(p).then(
                  (value) => ({ status: "fulfilled", value }),
                  (reason) => ({ status: "rejected", reason })
                )
              )
            );
          };
          document.getElementsByTagName("link");
          const cspNonceMeta = document.querySelector(
            "meta[property=csp-nonce]"
          );
          const cspNonce = (cspNonceMeta == null ? void 0 : cspNonceMeta.nonce) || (cspNonceMeta == null ? void 0 : cspNonceMeta.getAttribute("nonce"));
          promise = allSettled2(
            deps.map((dep) => {
              dep = assetsURL(dep);
              if (dep in seen) return;
              seen[dep] = true;
              const isCss = dep.endsWith(".css");
              const cssSelector = isCss ? '[rel="stylesheet"]' : "";
              if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
                return;
              }
              const link = document.createElement("link");
              link.rel = isCss ? "stylesheet" : scriptRel;
              if (!isCss) {
                link.as = "script";
              }
              link.crossOrigin = "";
              link.href = dep;
              if (cspNonce) {
                link.setAttribute("nonce", cspNonce);
              }
              document.head.appendChild(link);
              if (isCss) {
                return new Promise((res2, rej) => {
                  link.addEventListener("load", res2);
                  link.addEventListener(
                    "error",
                    () => rej(new Error(`Unable to preload CSS for ${dep}`))
                  );
                });
              }
            })
          );
        }
        function handlePreloadError(err) {
          const e = new Event("vite:preloadError", {
            cancelable: true
          });
          e.payload = err;
          window.dispatchEvent(e);
          if (!e.defaultPrevented) {
            throw err;
          }
        }
        return promise.then((res2) => {
          for (const item of res2 || []) {
            if (item.status !== "rejected") continue;
            handlePreloadError(item.reason);
          }
          return baseModule().catch(handlePreloadError);
        });
      };
      class AiPower {
        static async ask(question, jobKey, bossUserInfo) {
          var _a;
          const directConfig = getActiveDirectConfig();
          if (directConfig) {
            const ext = Tools.getAiConfigExt();
            const channelKey = Tools.getCurrentAiModelChannelKey();
            const presetStore = ext.promptPresetStore || { global: [], personal: {} };
            const globalPresets = Array.isArray(presetStore.global) ? presetStore.global : [];
            const personalPresets = Array.isArray((_a = presetStore.personal) == null ? void 0 : _a[channelKey]) ? presetStore.personal[channelKey] : [];
            const allPresets = [...globalPresets, ...personalPresets].filter((p) => p.enabled !== false);
            const systemPrompt = allPresets.map((p) => p.content || "").filter(Boolean).join("\n\n");
            return directAsk(question, systemPrompt, [], directConfig);
          }
          return request.post(
            "/api/job/seeker/cloned/ask",
            {
              question,
              jobKey,
              jobInfo: {
                jobTitle: bossUserInfo.jobTitle
              }
            },
            {
              timeout: 9e4
            }
          );
        }
        static async filter(prompt, jobBaseInfo, jobExtInfo) {
          return request.post(
            "api/job/filter/one",
            {
              prompt,
              jobBaseInfo,
              jobExtInfo
            },
            {
              timeout: 6e4
            }
          );
        }
        static async updateAskStatus(jobKey, stop) {
          return request.post(`/api/job/seeker/cloned/change/session/status?jobKey=${jobKey}&stop=${stop}`);
        }
      } exports("A", AiPower);
      const logger = new Logger("call");
      const protoDefinition = `option java_package = "cn.techwolf.boss.chat";option java_outer_classname = "ChatProtocol";message TechwolfUser {required int64 uid = 1;optional string name = 2;optional string avatar = 3;optional string company = 4;optional int32 headImg = 5;optional int32 certification = 6;optional int32 source = 7;}message TechwolfSound {optional int64 sid = 1;optional string url = 2;optional int32 duration = 3;optional int32 templateId = 4;}message TechwolfVideo {required int32 type = 1;required int32 status = 2;optional int32 duration = 3;optional string text = 4;}message TechwolfInterview {required int32 condition = 1;required string text = 2;optional string url = 3;optional string extend = 4;}message TechwolfImageInfo {required string url = 1;required int32 width = 2;required int32 height = 3;}message TechwolfImage {optional int64 iid = 1;optional TechwolfImageInfo tinyImage = 2;optional TechwolfImageInfo originImage = 3;}message TechwolfAction {required int32 aid = 1;optional string extend = 2;}message TechwolfArticle {required string title = 1;required string description = 2;required string picUrl = 3;required string url = 4;optional int32 templateId = 5;optional string bottomText = 6;optional int64 timeout = 7;optional string statisticParameters = 8;repeated TechwolfSlice highlightParts = 9;repeated TechwolfSlice dimParts = 10;optional string subTitle = 11;optional string extend = 12;}message TechwolfNotify {required string text = 1;optional string url = 2;optional string title = 3;}message TechwolfButton {required string text = 1;optional string url = 2;optional int32 templateId = 3;}message TechwolfDialog {required string text = 1;repeated TechwolfButton buttons = 2;required bool operated = 3;optional bool clickMore = 4;optional int32 type = 5;optional string backgroundUrl = 6;optional int64 timeout = 7;optional string statisticParameters = 8;optional string title = 9;optional string url = 10;optional int32 selectedIndex = 11;optional string extend = 12;optional string content = 13;}message TechwolfJobDesc {required string title = 1;required string company = 2;required string salary = 3;required string url = 4;required int64 jobId = 5;optional string positionCategory = 6;optional string experience = 7;optional string education = 8;optional string city = 9;optional string bossTitle = 10;optional TechwolfUser boss = 11;optional string lid = 12;optional string stage = 13;optional string bottomText = 14;optional string jobLabel = 15;optional int32 iconFlag = 16;optional string content = 17;repeated string labels = 18;optional int64 expectId = 19;optional string expectPosition = 20;optional string expectSalary = 21;optional string partTimeDesc = 22;optional TechwolfUser geek = 23;optional string latlon = 24;optional string distance = 25;}message TechwolfResume {required TechwolfUser user = 1;optional string description = 2;optional string city = 3;optional string position = 4;repeated string keywords = 5;optional int64 expectId = 6;optional string lid = 7;optional int32 gender = 8;optional string salary = 9;optional string workYear = 10;optional string content1 = 11;optional string content2 = 12;optional string education = 13;optional string age = 14;repeated string labels = 15;repeated UserExperience experiences = 16;optional string positionCategory = 17;optional string jobSalary = 18;optional string bottomText = 19;optional string applyStatus = 20;optional int64 jobId = 21;optional string content3 = 22;optional string securityId = 23;optional TechwolfUser boss = 24;optional string brandName = 25;}message TechwolfHyperLink {required string text = 1;required string url = 2;required int32 hyperLinkType = 3;optional string extraJson=4;}message TechwolfMessageBody {required int32 type = 1;required int32 templateId = 2;optional string headTitle = 11;optional string text = 3;optional TechwolfSound sound = 4;optional TechwolfImage image = 5;optional TechwolfAction action = 6;repeated TechwolfArticle articles = 7;optional TechwolfNotify notify = 8;optional TechwolfDialog dialog = 9;optional TechwolfJobDesc jobDesc = 10;optional TechwolfResume resume = 12;optional TechwolfRedEnvelope redEnvelope = 13;optional TechwolfOrderDetail orderDetail = 14;optional TechwolfHyperLink hyperLink = 15;optional TechwolfVideo video = 16;optional TechwolfInterview interview = 17;optional TechwolfJobShare jobShare = 18;optional TechwolfResumeShare resumeShare = 19;optional AtInfo atInfo = 20;optional TechwolfSticker sticker = 21;optional TechwolfChatShare chatShare = 22;optional TechwolfInterviewShare interviewShare = 23;optional TechwolfListCard listCard = 24;optional TechwolfStarRate starRate = 25;optional TechwolfFrame frame = 26;optional TechwolfMultiImage multiImage = 27;optional string extend = 28;}message TechwolfMessage {required TechwolfUser from = 1;required TechwolfUser to = 2;required int32 type = 3;optional int64 mid = 4;optional int64 time = 5;required TechwolfMessageBody body = 6;optional bool offline = 7;optional bool received = 8;optional string pushText = 9;optional int64 taskId = 10;optional int64 cmid = 11;optional int32 status = 12;optional int32 uncount = 13;optional int32 pushSound = 14;optional int32 flag = 15;optional bytes encryptedBody = 16;optional string bizId = 17;optional int32 bizType = 18;optional string securityId = 19;}message TechwolfClientInfo {optional string version = 1;optional string system = 2;optional string systemVersion = 3;optional string model = 4;optional string uniqid = 5;optional string network = 6;optional int32 appid = 7;optional string platform = 8;optional string channel = 9;optional string ssid = 10;optional string bssid = 11;optional double longitude = 12;optional double latitude = 13;}message TechwolfClientTime {optional int64 startTime = 1;optional int64 resumeTime = 2;}message TechwolfPresence {required int32 type = 1;required int32 uid = 2;optional TechwolfClientInfo clientInfo = 3;optional TechwolfClientTime clientTime = 4;optional int64 lastMessageId = 5;optional int64 lastGroupMessageId = 6;optional int64 userId = 7;}message TechwolfKVEntry {required string key = 1;required string value = 2;}message TechwolfIq {required int64 qid = 1;required string query = 2;repeated TechwolfKVEntry params = 3;}message TechwolfIqResponse {required int64 qid = 1;required string query = 2;repeated TechwolfKVEntry results = 3;}message TechwolfMessageSync {required int64 clientMid = 1;required int64 serverMid = 2;}message TechwolfMessageRead {required int64 userId = 1;required int64 messageId = 2;required int64 readTime = 3;optional bool sync = 4 [default = false];optional int32 userSource = 5;}message TechwolfChatProtocol {required int32 type = 1;optional string version = 2;repeated TechwolfMessage messages = 3;optional TechwolfPresence presence = 4;optional TechwolfIq iq = 5;optional TechwolfIqResponse iqResponse = 6;repeated TechwolfMessageSync messageSync = 7;repeated TechwolfMessageRead messageRead = 8;optional TechwolfDataSync dataSync = 9;optional int32 domain = 10;}message TechwolfRedEnvelope {required int64 redId = 1;required string redText = 2;required string redTitle = 3;required string clickUrl = 4;}message TechwolfOrderDetail {required string title = 1;required string subTitle = 2;optional string url = 3;repeated TechwolfOrderDetailEntry orderDetailEntryList =  4;}message TechwolfOrderDetailItem {required string name = 1;required int32 templateId = 2;}message TechwolfOrderDetailEntry {required TechwolfOrderDetailItem key = 1;required TechwolfOrderDetailItem value = 2;}message TechwolfUserSync {required int64 uid = 1;required int32 identity = 2;optional string extraJson = 3;optional int32 userSource = 4;}message TechwolfDataSync {required int32 type = 1;optional TechwolfUserSync userSync = 2;optional TechwolfGroupSync groupSync = 3;}message TechwolfSlice {required int32 startIndex = 1;required int32 endIndex = 2;}message UserExperience {required string organization = 1;required string occupation = 2;optional string startDate = 3;optional string endDate = 4;required int32 type = 5;}message TechwolfJobShare {required TechwolfUser user = 1;required int64 jobId = 2;required string position = 3;required string salary = 4;optional string location = 5;required string company = 6;optional string stage = 7;optional string experience = 8;optional string education = 9;optional string url = 10;optional string lid = 11;optional string price = 12;optional string description = 13;}message TechwolfResumeShare {required TechwolfUser user = 1;required int64 expectId = 2;required string position = 3;required string salary = 4;optional string location = 5;optional string applyStatus = 6;optional string age = 7;optional string experience = 8;optional string education = 9;optional string url = 10;optional string lid = 11;optional int32 gender = 12;optional bool blurred = 13;optional int32 source = 14;}message AtInfo {required int32 flag = 1;repeated int64 uids = 2;}message TechwolfGroupSync {required int64 gid = 1;optional int32 version = 2;optional string encGid = 3;}message TechwolfSticker {required int64 sid = 1;optional int64 packId = 2;optional TechwolfImage image = 3;optional string format = 4;optional string name = 5;}message TechwolfChatShare {required int64 shareId = 1;required string title = 2;repeated string records = 3;optional string bottomText = 4;optional string url = 5;required TechwolfUser from = 6;required TechwolfUser to = 7;required TechwolfUser user = 8;}message TechwolfInterviewShare {required int64 interviewId = 1;required TechwolfUser user = 2;required string title = 3;required string bottomText = 4;optional string url = 5;optional string interviewTime = 6;optional string interviewAddress = 7;optional string jobName = 8;}message TechwolfListItem {optional string title = 1;optional int32 icon = 2;}message TechwolfListCard {optional string title = 1;repeated TechwolfListItem items = 2;optional int32 pageSize = 3;}message TechwolfStar {required int64 starId = 1;optional string starDesc = 2;repeated TechwolfListItem options = 3;}message TechwolfStarRate {optional string title = 1;repeated TechwolfStar stars = 2;required int32 rateStatus = 3;optional TechwolfStar rateStar = 4;optional TechwolfButton submitButton = 5;}message TechwolfFrame {required string href = 1;}message TechwolfMultiImage {repeated TechwolfImageInfo images = 1;}`;
      const root = protobuf.parse(protoDefinition).root;
      const protobufType = root.lookupType("TechwolfChatProtocol");
      const getRuntimeWindow = () => Tools.window;
      const isChannelConnected = (channel) => {
        if (!channel || typeof channel.send !== "function") {
          return false;
        }
        if (channel.client && typeof channel.client.isConnected === "function") {
          return channel.client.isConnected();
        }
        return true;
      };
      class Message {
        constructor({ form_uid, to_uid, to_name, content, image }) {
          __publicField(this, "msg");
          __publicField(this, "msgObj");
          __publicField(this, "hex");
          const r = (/* @__PURE__ */ new Date()).getTime();
          const d = r + 68256432452609;
          const data = {
            messages: [
              {
                from: {
                  uid: form_uid,
                  source: 0
                },
                to: {
                  uid: to_uid,
                  name: to_name,
                  source: 0
                },
                type: 1,
                mid: d.toString(),
                time: r.toString(),
                body: {
                  type: image ? 3 : 1,
                  templateId: 1,
                  text: image ? null : content ?? "",
                  image: image ? {
                    originImage: {
                      url: image.originImage
                    },
                    tinyImage: {
                      url: image.tinyImage
                    }
                  } : {}
                },
                cmid: d.toString()
              }
            ],
            type: 1
          };
          this.msgObj = data.messages[0];
          this.msg = protobufType.encode(data).finish().slice();
          this.hex = [...this.msg].map((b) => b.toString(16).padStart(2, "0")).join("");
        }
        toArrayBuffer() {
          return this.msg.buffer.slice(0, this.msg.byteLength);
        }
        send() {
          const runtimeWindow = getRuntimeWindow();
          const trySendByChannel = (channel, failLogTitle) => {
            if (!isChannelConnected(channel)) {
              return false;
            }
            try {
              channel.send(this);
              return true;
            } catch (e) {
              logger.error(failLogTitle, e);
              return false;
            }
          };
          if (this.msgObj.body.type === 3) {
            if (trySendByChannel(runtimeWindow.ChatWebsocketImage, "发送图片消息失败")) {
              return true;
            }
            if (trySendByChannel(runtimeWindow.ChatWebsocket, "发送图片消息失败(降级通道)")) {
              return true;
            }
          } else if (runtimeWindow.ChatWebsocket) {
            if (trySendByChannel(runtimeWindow.ChatWebsocket, "发送自定义消息失败")) {
              return true;
            }
          }
          if (runtimeWindow.GeekChatCore) {
            try {
              runtimeWindow.GeekChatCore.getInstance().getClient().client.send(this);
              return true;
            } catch (e) {
              logger.warn("发送自定义消息失败; boss可能更新了1，请反馈", e);
            }
          }
          logger.warn("发送自定义消息失败; boss可能更新了，请反馈");
          return false;
        }
      } exports("M", Message);
      const simulateScrollToEnd = async (platform2) => {
        const isMac = navigator.platform.toUpperCase().includes("MAC");
        const modifierKey = isMac ? "Meta" : "Control";
        try {
          const activeElement = document.activeElement;
          const eventOptions = {
            key: "End",
            code: "End",
            [modifierKey.toLowerCase() + "Key"]: true,
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window
          };
          const downEvent = new KeyboardEvent("keydown", eventOptions);
          const upEvent = new KeyboardEvent("keyup", eventOptions);
          document.dispatchEvent(downEvent);
          document.dispatchEvent(upEvent);
          if (activeElement) {
            activeElement.dispatchEvent(downEvent);
            activeElement.dispatchEvent(upEvent);
          }
          await new Promise((resolve) => requestAnimationFrame(() => resolve()));
        } catch (error) {
          console.warn("键盘事件触发失败，使用备选方案");
        }
        const getMaxScroll = () => {
          const documentElement = document.documentElement;
          return Math.max(
            document.body.scrollHeight,
            documentElement.scrollHeight,
            document.body.offsetHeight,
            documentElement.offsetHeight,
            document.body.clientHeight,
            documentElement.clientHeight
          ) - window.innerHeight;
        };
        const maxScroll = getMaxScroll();
        if (window.scrollY !== maxScroll) {
          window.scrollTo({
            top: maxScroll,
            behavior: "smooth"
          });
        }
      };
      const logger$1 = Logger.rootLogger;
      async function setChatWebsocket() {
        logger$1.info("build ChatWebsocket");
        try {
          const res = await fetch("https://static.zhipin.com/assets/zhipin/geek/socket.js?v=20250313");
          const code = await res.text();
          const str = '\nTools.window.ChatWebsocketImage = ChatWebsocket;\nconsole.log("set ChatWebsocket 成功", ChatWebsocket)\n';
          const modifiedCode = code.replaceAll(/if \("EventBus" in window\) \{\s+EventBus.subscribe\("CHAT_SEND_TEXT".*fail\);\s+}\);\s+}/gs, str).replace("ChatWebsocket.init()", "");
          eval(modifiedCode);
          logger$1.info("window 挂载 ChatWebsocket", Tools.window.ChatWebsocketImage);
        } catch (err) {
          logger$1.info("window 挂载 ChatWebsocket 失败", err);
        }
      }
      class BossPlatform extends AbsPlatform {
        constructor(curUrl) {
          super();
          __publicField(this, "curUrl");
          __publicField(this, "name", "Boss");
          __publicField(this, "urlList", ["/web/geek", "overseas"]);
          __publicField(this, "lastHeight", 0);
          __publicField(this, "bossDataCache", /* @__PURE__ */ new Map());
          this.curUrl = curUrl;
        }
        getPlatformType() {
          return 0;
        }
        getMountEle() {
          return new Promise((resolve) => {
            let count = 0;
            const interval = setInterval(() => {
              let element = null;
              let p = "";
              if (this.curUrl.includes("www.zhipin.com/web/geek/chat")) {
                element = document.querySelector(".chat-conversation");
              }
              if (this.curUrl.includes("www.zhipin.com/web/geek/job-recommend")) {
                element = document.querySelector(".recommend-search-inner");
                p = "end";
              }
              if (this.curUrl.includes("www.zhipin.com/web/geek/jobs")) {
                element = document.querySelector(".job-recommend-result");
              } else if (this.curUrl.includes("www.zhipin.com/web/geek/job")) {
                element = document.querySelector(".page-job-inner");
              }
              if (this.curUrl.includes("overseas")) {
                element = document.querySelector(".mod-header");
              }
              if (element !== null) {
                clearInterval(interval);
                resolve({ el: element, p });
                return;
              }
              if (count >= 3) {
                clearInterval(interval);
                logger$1.error(0, "获取平台挂载元素失败");
                resolve({ el: document.createElement("div"), p: "" });
                return;
              }
              count++;
            }, 300);
          });
        }
        async getRenderComponent() {
          if (this.curUrl.includes("www.zhipin.com/web/geek/chat")) {
            const mod = await __vitePreload(() => module.import('./BossMessage-unG4I697-CsGc8Ieo.js'), void 0 );
            return mod.default;
          }
          if (this.curUrl.includes("www.zhipin.com/web/geek/job") || this.curUrl.includes("overseas")) {
            const mod = await __vitePreload(() => Promise.resolve().then(() => Panel$1), void 0 );
            return mod.default;
          }
        }
        startPreHandler() {
          this.lastHeight = 0;
        }
        getJobList() {
          if (this.curUrl.includes("jobs")) {
            const elementNodeList2 = document.querySelectorAll(".job-card-wrap");
            const jobList = Array.from(elementNodeList2).map((item) => item.__vue__.data).filter((job) => !job.processed);
            if (elementNodeList2.length !== 0 && jobList.length === 0) {
              this.logRecorder.info("当前筛选条件下岗位均已投递");
            }
            return jobList;
          }
          if (this.curUrl.includes("job-recommend")) {
            const elementNodeList2 = document.querySelectorAll(".job-card-wrap");
            return Array.from(elementNodeList2).map((item) => item.__vue__.data).filter((job) => !job.contact);
          }
          if (this.curUrl.includes("overseas")) {
            const elementNodeList2 = document.querySelectorAll(".job-card-box");
            return Array.from(elementNodeList2).map((item) => item.__vue__.data).filter((job) => !job.contact);
          }
          const elementNodeList = document.querySelectorAll(".job-card-wrapper");
          return Array.from(elementNodeList).map((item) => item.__vue__.data);
        }
        hasNext() {
          var _a, _b;
          logger$1.debug("hasNext");
          if (this.curUrl.includes("jobs")) {
            return this.lastHeight !== ((_a = document.querySelector(".job-list-container")) == null ? void 0 : _a.scrollHeight);
          }
          if (this.curUrl.includes("overseas")) {
            return this.lastHeight !== ((_b = document.querySelector(".job-list")) == null ? void 0 : _b.scrollHeight);
          }
          if (this.curUrl.includes("job-recommend")) {
            return !!document.querySelector("#footer");
          }
          const nextPageBtn = document.querySelector(".ui-icon-arrow-right");
          if (nextPageBtn === null) {
            return false;
          }
          return nextPageBtn.parentElement.className !== "disabled";
        }
        acquireDataPre() {
          var _a, _b;
          if (this.pushStatus === PushStatus.PAUSE) {
            return;
          }
          if (this.curUrl.includes("jobs")) {
            this.lastHeight = ((_a = document.querySelector(".job-list-container")) == null ? void 0 : _a.scrollHeight) || 0;
            simulateScrollToEnd().then(() => {
              logger$1.info("获取下一页成功");
            }).catch((e) => {
              this.logRecorder.warn("获取下一页失败", e);
            });
            return;
          }
          if (this.curUrl.includes("job-recommend")) {
            simulateScrollToEnd().then(() => {
              logger$1.info("获取下一页成功");
            }).catch((e) => {
              this.logRecorder.warn("获取下一页失败", e);
            });
            return;
          }
          if (this.curUrl.includes("overseas")) {
            this.lastHeight = ((_b = document.querySelector(".job-list")) == null ? void 0 : _b.scrollHeight) || 0;
            simulateScrollToEnd().then(() => {
              logger$1.info("获取下一页成功");
            }).catch((e) => {
              this.logRecorder.warn("获取下一页失败", e);
            });
            return;
          }
          document.querySelector(".ui-icon-arrow-right").click();
        }
        async matchJob(jobDetail) {
          var _a;
          jobDetail.processed = true;
          const jobTitle = this.getJobKey(jobDetail);
          if (jobDetail.contact) {
            throw new NotMatchException(jobTitle, jobDetail.contact, "已经沟通过");
          }
          if (userStore$2.user.preference.fhE && jobDetail.goldHunter === 1) {
            throw new NotMatchException(jobTitle, jobDetail.goldHunter, "过滤猎头");
          }
          if (userStore$2.user.preference.polE && !jobDetail.bossOnline) {
            throw new NotMatchException(jobTitle, jobDetail.bossOnline, "仅投递在线boss");
          }
          const companyNameInclude = userStore$2.user.preference.cni;
          if (userStore$2.user.preference.cniE && !Tools.fuzzyMatch(companyNameInclude, jobDetail.brandName, true)) {
            throw new NotMatchException(jobTitle, jobDetail.brandName, "不满足配置公司名");
          }
          const companyNameExclude = userStore$2.user.preference.cne;
          if (userStore$2.user.preference.cneE && Tools.fuzzyMatch(companyNameExclude, jobDetail.brandName, false)) {
            throw new NotMatchException(jobTitle, jobDetail.brandName, "满足排除公司名");
          }
          const jobNameInclude = userStore$2.user.preference.jni;
          if (userStore$2.user.preference.jniE && !Tools.fuzzyMatch(jobNameInclude, jobDetail.jobName, true)) {
            throw new NotMatchException(jobTitle, jobDetail.jobName, "不满足配置工作名");
          }
          const jobNameExclude = userStore$2.user.preference.jne;
          if (userStore$2.user.preference.jneE && Tools.fuzzyMatch(jobNameExclude, jobDetail.jobName, false)) {
            throw new NotMatchException(jobTitle, jobDetail.jobName, "满足排除工作名");
          }
          const pageSalaryRange = jobDetail.salaryDesc.split(".")[0];
          if (userStore$2.user.preference.srE) {
            const salaryFilterType = `${userStore$2.user.preference.srT || "1"}`;
            if (!Tools.isSalaryTypeSupportedForFilter(pageSalaryRange, salaryFilterType)) {
              throw new NotMatchException(jobTitle, pageSalaryRange, "薪资类型不匹配");
            }
            const comparableSalaryRange = Tools.getComparableSalaryRange(pageSalaryRange, salaryFilterType);
            if (!Tools.isSalaryRangeMatched(userStore$2.user.preference.sr, comparableSalaryRange)) {
              throw new NotMatchException(jobTitle, pageSalaryRange, "不满足薪资范围");
            }
          }
          const pageCompanyScaleRange = userStore$2.user.preference.csr;
          if (userStore$2.user.preference.csrE && !Tools.isRangeOverlap(pageCompanyScaleRange, jobDetail.brandScaleName)) {
            throw new NotMatchException(jobTitle, jobDetail.brandScaleName, "不满足公司规模范围");
          }
          const jobDetailExt = await this.obtainBossJobDetailExt(jobDetail);
          logger$1.debug(`获取工作【${jobTitle}】详情扩展信息用于过滤 `, jobDetail);
          const activeTimeDesc = jobDetailExt.activeTimeDesc;
          const activePreference = userStore$2.user.preference || {};
          if (activePreference.acE !== false && !this.bossIsActive(activeTimeDesc, activePreference)) {
            throw new NotMatchException(jobTitle, activeTimeDesc, "不满足活跃度检查");
          }
          const jobContent = jobDetailExt.postDescription;
          const jobContentExclude = userStore$2.user.preference.jce;
          if (userStore$2.user.preference.jceE && Tools.fuzzyMatch(jobContentExclude, jobContent, false)) {
            throw new NotMatchException(jobTitle, jobContent, "满足排除工作内容");
          }
          const jobContentInclude = userStore$2.user.preference.jci;
          if (userStore$2.user.preference.jciE && !Tools.fuzzyMatch(jobContentInclude, jobContent, true)) {
            throw new NotMatchException(jobTitle, jobContent, "不满足工作内容");
          }
          if (userStore$2.user.preference.afE && userStore$2.user.preference.af) {
            const promptVars = buildPromptVarsFromJob(jobDetail);
            const resolvedFilterPrompt = resolvePromptVariables(userStore$2.user.preference.af, promptVars);
            const filterResp = await AiPower.filter(
              resolvedFilterPrompt,
              JSON.stringify(this.unpackBaseInfo(jobDetail)),
              JSON.stringify(this.unpackExtInfo(jobDetailExt))
            );
            const filterResult = (_a = filterResp == null ? void 0 : filterResp.data) == null ? void 0 : _a.data;
            if (filterResult && (filterResult == null ? void 0 : filterResult.filter)) {
              throw new NotMatchException(jobTitle, filterResult.reason, "AI过滤");
            }
          }
          if (this.isCommunication(jobDetailExt)) {
            throw new NotMatchException(jobTitle, jobDetailExt.friendStatus, "已经沟通过");
          }
          return true;
        }
        unpackBaseInfo(jobDetail) {
          return {
            jobName: jobDetail.jobName,
            salaryDesc: jobDetail.salaryDesc,
            jobLabels: jobDetail.jobLabels,
            skills: jobDetail.skills,
            jobExperience: jobDetail.jobExperience,
            jobDegree: jobDetail.jobDegree,
            cityName: jobDetail.cityName,
            areaDistrict: jobDetail.areaDistrict,
            businessDistrict: jobDetail.businessDistrict,
            brandName: jobDetail.brandName,
            brandStageName: jobDetail.brandStageName,
            brandIndustry: jobDetail.brandIndustry,
            brandScaleName: jobDetail.brandScaleName,
            welfareList: jobDetail.welfareList
          };
        }
        unpackExtInfo(jobDetailExt) {
          return {
            postDescription: jobDetailExt.postDescription,
            address: jobDetailExt.address,
            activeTimeDesc: jobDetailExt.activeTimeDesc
          };
        }
        pausePush() {
          this.pushStatus = PushStatus.PAUSE;
        }
        getJobKey(jobDetail) {
          return jobDetail.jobName + "-" + jobDetail.cityName + jobDetail.areaDistrict + jobDetail.businessDistrict;
        }
        isLimit(_jobDetail) {
          return {
            limit: TampermonkeyApi.GmGetValue(TampermonkeyApi.PUSH_LIMIT, false),
            msg: "Boss投递限制每天100次"
          };
        }
        async doPush(jobDetail, errorMsg = "", retries = 3) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
          const jobTitle = this.getJobKey(jobDetail);
          if (retries === 3) {
            logger$1.debug("正在投递：" + jobTitle);
          }
          if (retries === 0) {
            throw new PushReqException(jobTitle, errorMsg);
          }
          const publishUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${jobDetail.securityId}&jobId=${jobDetail.encryptJobId}&lid=${jobDetail.lid}`;
          let pushResp = { code: PushResultStatus.NOT_START, message: "" };
          try {
            await Tools.sleep(userStore$2.user.preference.pi * 1e3);
            pushResp = await axios.post(publishUrl, null, { headers: { Zp_token: Tools.getCookieValue("bst") } });
          } catch (error) {
            logger$1.debug(`工作【${jobTitle}】投递失败; 正在等待重试; 原因：${error.message}`);
            await Tools.sleep(800);
            return await this.doPush(jobDetail, error.message, retries - 1);
          }
          if (pushResp.data.code === PushResultStatus.FAIL && ((_d = (_c = (_b = (_a = pushResp.data) == null ? void 0 : _a.zpData) == null ? void 0 : _b.bizData) == null ? void 0 : _c.chatRemindDialog) == null ? void 0 : _d.content)) {
            if ((_h = (_g = (_f = (_e = pushResp.data) == null ? void 0 : _e.zpData) == null ? void 0 : _f.bizData) == null ? void 0 : _g.chatRemindDialog) == null ? void 0 : _h.content.include("您今天已与120位BOSS沟通")) {
              logger$1.debug(`当天已投递超过120次 工作【${jobTitle}】已修正为投递成功`);
              return {
                code: PushResultStatus.SUCCESS,
                message: "Success"
              };
            }
            return {
              code: 1,
              message: (_l = (_k = (_j = (_i = pushResp.data) == null ? void 0 : _i.zpData) == null ? void 0 : _j.bizData) == null ? void 0 : _k.chatRemindDialog) == null ? void 0 : _l.content
            };
          }
          await Tools.sleep(800);
          return pushResp.data;
        }
        buildFavoriteApiRequests(jobDetail) {
          const interestBody = new URLSearchParams({
            securityId: jobDetail.securityId,
            jobId: jobDetail.encryptJobId,
            lid: jobDetail.lid,
            tag: "1",
            flag: "1",
            interest: "1"
          }).toString();
          return [
            {
              name: "relation-interest-form",
              url: "https://www.zhipin.com/wapi/zprelation/geekTag/job/interest",
              data: interestBody,
              contentType: "application/x-www-form-urlencoded;charset=UTF-8"
            },
            {
              name: "relation-interest-query",
              url: `https://www.zhipin.com/wapi/zprelation/geekTag/job/interest?securityId=${encodeURIComponent(jobDetail.securityId)}`,
              data: interestBody,
              contentType: "application/x-www-form-urlencoded;charset=UTF-8"
            }
          ];
        }
        isFavoriteSuccess(respData) {
          var _a;
          const message = `${(respData == null ? void 0 : respData.message) || ""}`;
          const result = (respData == null ? void 0 : respData.result) ?? ((_a = respData == null ? void 0 : respData.zpData) == null ? void 0 : _a.result);
          if ((respData == null ? void 0 : respData.code) === 0 && result !== false) {
            return true;
          }
          return message.includes("已收藏") || message.includes("取消收藏") || message.includes("感兴趣");
        }
        findJobCardByJobDetail(jobDetail) {
          const cardSelectors = [".job-card-wrapper", ".job-card-wrap", ".job-card-box"];
          for (const selector of cardSelectors) {
            const cards = Array.from(document.querySelectorAll(selector));
            const targetCard = cards.find((card) => {
              var _a, _b, _c;
              const cardData = (_a = card == null ? void 0 : card.__vue__) == null ? void 0 : _a.data;
              const detailEncryptJobId = `${jobDetail.encryptJobId || ""}`;
              const detailJobId = `${jobDetail.jobId || ""}`;
              const cardEncryptJobId = `${(cardData == null ? void 0 : cardData.encryptJobId) || ""}`;
              const cardJobId = `${(cardData == null ? void 0 : cardData.jobId) || ""}`;
              if (detailEncryptJobId && cardEncryptJobId === detailEncryptJobId) {
                return true;
              }
              if (detailJobId && cardJobId === detailJobId) {
                return true;
              }
              if (detailEncryptJobId && cardJobId === detailEncryptJobId) {
                return true;
              }
              const href = ((_c = (_b = card.querySelector("a.job-card-left,a.job-name")) == null ? void 0 : _b.getAttribute("href")) == null ? void 0 : _c.toString()) || "";
              if (!href) {
                return false;
              }
              if (detailEncryptJobId && href.includes(detailEncryptJobId)) {
                return true;
              }
              const detailLid = `${jobDetail.lid || ""}`;
              return !!(detailLid && href.includes(detailLid));
            });
            if (targetCard) {
              return targetCard;
            }
          }
          return null;
        }
        getFavoriteHint(element) {
          const attrs = [
            element == null ? void 0 : element.textContent,
            element == null ? void 0 : element.getAttribute("title"),
            element == null ? void 0 : element.getAttribute("aria-label"),
            element == null ? void 0 : element.getAttribute("data-title"),
            element == null ? void 0 : element.getAttribute("ka"),
            element == null ? void 0 : element.className
          ].filter(Boolean);
          return attrs.join(" ").replace(/\s+/g, " ").trim();
        }
        isFavoriteDoneByHint(hint) {
          const text = (hint || "").replace(/\s+/g, "");
          return text.includes("已收藏") || text.includes("取消收藏") || text.includes("已感兴趣");
        }
        getFavoriteStateSnapshot(jobDetail) {
          const card = this.findJobCardByJobDetail(jobDetail);
          const detailScopes = this.findRelatedDetailScopes(jobDetail);
          return {
            cardText: ((card == null ? void 0 : card.textContent) || "").replace(/\s+/g, ""),
            detailText: detailScopes.map((scope) => (scope.textContent || "").replace(/\s+/g, "")).join(" ")
          };
        }
        isFavoriteConfirmedBySnapshot(snapshot) {
          return this.isFavoriteDoneByHint(snapshot.cardText) || this.isFavoriteDoneByHint(snapshot.detailText);
        }
        async waitFavoriteConfirmed(jobDetail, waitMs = 1200) {
          const startTs = Date.now();
          let snapshot = this.getFavoriteStateSnapshot(jobDetail);
          if (this.isFavoriteConfirmedBySnapshot(snapshot)) {
            return { confirmed: true, snapshot };
          }
          while (Date.now() - startTs < waitMs) {
            await Tools.sleep(200);
            snapshot = this.getFavoriteStateSnapshot(jobDetail);
            if (this.isFavoriteConfirmedBySnapshot(snapshot)) {
              return { confirmed: true, snapshot };
            }
          }
          return { confirmed: false, snapshot };
        }
        isFavoriteActionByHint(hint) {
          const text = (hint || "").replace(/\s+/g, "");
          const lowerText = text.toLowerCase();
          if (text.includes("沟通") || text.includes("投递") || text.includes("简历")) {
            return false;
          }
          return text.includes("收藏") || text.includes("感兴趣") || lowerText.includes("collect") || lowerText.includes("favorite") || lowerText.includes("star");
        }
        isVisibleFavoriteElement(element) {
          if (!(element instanceof HTMLElement)) {
            return true;
          }
          if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
            return false;
          }
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return false;
          }
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }
        findRelatedDetailScopes(jobDetail) {
          const scopes = [
            document.querySelector(".job-detail-box"),
            document.querySelector(".job-detail"),
            document.querySelector(".job-detail-container")
          ].filter(Boolean);
          if (scopes.length === 0) {
            return [];
          }
          const normalize = (text) => (text || "").replace(/\s+/g, "");
          const jobName = normalize(jobDetail.jobName);
          const brandName = normalize(jobDetail.brandName);
          const matchedScopes = scopes.filter((scope) => {
            const text = normalize(scope.textContent);
            if (!text) {
              return false;
            }
            const byJobName = jobName && text.includes(jobName);
            const byBrandName = brandName && text.includes(brandName);
            return !!(byJobName || byBrandName);
          });
          return matchedScopes;
        }
        async waitRelatedDetailScopes(jobDetail, waitMs = 1200) {
          const startTs = Date.now();
          let scopes = this.findRelatedDetailScopes(jobDetail);
          while (scopes.length === 0 && Date.now() - startTs < waitMs) {
            await Tools.sleep(120);
            scopes = this.findRelatedDetailScopes(jobDetail);
          }
          return scopes;
        }
        findFavoriteButtonInScope(scope, sampleHints) {
          const candidateSelector = "button,a,[role='button'],[class*='collect'],[class*='favorite'],[class*='star']";
          const candidates = Array.from(new Set(Array.from(scope.querySelectorAll(candidateSelector))));
          let favoriteButton = null;
          for (const element of candidates) {
            if (!this.isVisibleFavoriteElement(element)) {
              continue;
            }
            const hint = this.getFavoriteHint(element);
            if (!hint) {
              continue;
            }
            if ((this.isFavoriteActionByHint(hint) || this.isFavoriteDoneByHint(hint)) && sampleHints.length < 8) {
              sampleHints.push(hint.slice(0, 80));
            }
            if (this.isFavoriteDoneByHint(hint)) {
              return { done: true, button: element };
            }
            if (!favoriteButton && this.isFavoriteActionByHint(hint)) {
              favoriteButton = element;
            }
          }
          return { done: false, button: favoriteButton };
        }
        async triggerFavoriteByDom(jobDetail) {
          const card = this.findJobCardByJobDetail(jobDetail);
          if (!card) {
            return { success: false, message: "未定位到岗位卡片" };
          }
          const beforeCheck = await this.waitFavoriteConfirmed(jobDetail, 120);
          if (beforeCheck.confirmed) {
            return { success: true, verified: true, channel: "dom-already", message: "Success" };
          }
          const sampleHints = [];
          const hoverEvents = ["mouseenter", "mouseover", "mousemove"];
          hoverEvents.forEach((eventName) => {
            card.dispatchEvent(new MouseEvent(eventName, { bubbles: true, cancelable: true }));
          });
          const cardClickable = card.querySelector("a.job-card-left,a.job-name,[class*='job-card-left']");
          const clickTarget = cardClickable || card;
          clickTarget.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          await Tools.sleep(300);
          const detailScopes = await this.waitRelatedDetailScopes(jobDetail, 1500);
          const scopeList = [card, ...detailScopes].filter(Boolean);
          const uniqueScopeList = Array.from(new Set(scopeList));
          let favoriteBtn = null;
          for (const scope of uniqueScopeList) {
            const result = this.findFavoriteButtonInScope(scope, sampleHints);
            if (result.done) {
              return { success: true, verified: true, channel: "dom-done-mark", message: "Success" };
            }
            if (result.button) {
              favoriteBtn = result.button;
              break;
            }
          }
          if (!favoriteBtn) {
            const detailText = detailScopes.map((scope) => (scope.textContent || "").replace(/\s+/g, "")).join(" ");
            if (detailText.includes("已收藏") || detailText.includes("取消收藏")) {
              return { success: true, verified: true, channel: "dom-detail-mark", message: "Success" };
            }
            const debugHint = sampleHints.length > 0 ? `;候选:${sampleHints.join(" | ")}` : "";
            return { success: false, message: `未找到收藏按钮${debugHint}` };
          }
          if (typeof favoriteBtn.click === "function") {
            favoriteBtn.click();
          } else {
            favoriteBtn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
          }
          await Tools.sleep(250);
          const afterCheck = await this.waitFavoriteConfirmed(jobDetail, 1800);
          const btnHintAfterClick = this.getFavoriteHint(favoriteBtn);
          if (afterCheck.confirmed || this.isFavoriteDoneByHint(btnHintAfterClick)) {
            return { success: true, verified: true, channel: "dom-click", message: "Success" };
          }
          const afterHint = `button=${btnHintAfterClick.slice(0, 60)};card=${(afterCheck.snapshot.cardText || "").slice(0, 60)};detail=${(afterCheck.snapshot.detailText || "").slice(0, 60)}`;
          return { success: false, verified: false, message: `点击收藏后未观察到收藏态;${afterHint}` };
        }
        async doCollect(jobDetail, errorMsg = "", retries = 2) {
          const jobTitle = this.getJobKey(jobDetail);
          if (retries === 0) {
            throw new CollectReqException(jobTitle, errorMsg || "收藏重试多次失败");
          }
          let latestError = errorMsg;
          try {
            const beforeState = await this.waitFavoriteConfirmed(jobDetail, 120);
            if (beforeState.confirmed) {
              return {
                code: 0,
                message: "Success",
                verified: true,
                channel: "already"
              };
            }
            const domResult = await this.triggerFavoriteByDom(jobDetail);
            if (domResult.success && domResult.verified !== false) {
              return {
                code: 0,
                message: "Success",
                verified: true,
                channel: domResult.channel || "dom"
              };
            }
            latestError = domResult.message || latestError;
            if (this._collectMode) {
              await Tools.sleep(400);
              return await this.doCollect(jobDetail, latestError, retries - 1);
            }
            await Tools.sleep(Math.max(500, ((userStore$2 == null ? void 0 : userStore$2.user.preference.pi) || 3) * 600));
            const token = Tools.getCookieValue("bst");
            if (token) {
              const headers = { Zp_token: token };
              for (const favoriteRequest of this.buildFavoriteApiRequests(jobDetail)) {
                try {
                  const reqHeaders = {
                    ...headers
                  };
                  if (favoriteRequest.contentType) {
                    reqHeaders["content-type"] = favoriteRequest.contentType;
                  }
                  const resp = await axios.post(favoriteRequest.url, favoriteRequest.data, { headers: reqHeaders });
                  const respData = resp == null ? void 0 : resp.data;
                  if (this.isFavoriteSuccess(respData)) {
                    const confirmCheck = await this.waitFavoriteConfirmed(jobDetail, 1e3);
                    if (confirmCheck.confirmed) {
                      return {
                        code: 0,
                        message: "Success",
                        verified: true,
                        channel: favoriteRequest.name
                      };
                    }
                    latestError = `${favoriteRequest.name}:接口返回成功但未观察到收藏态`;
                    continue;
                  }
                  latestError = `${favoriteRequest.name}:${((respData == null ? void 0 : respData.message) || `收藏接口异常(${(respData == null ? void 0 : respData.code) || "unknown"})`).toString()}`;
                } catch (error) {
                  latestError = `${favoriteRequest.name}:${(error == null ? void 0 : error.message) || "收藏接口请求失败"}`;
                }
              }
            } else {
              latestError = "未获取到zp-token";
            }
          } catch (error) {
            latestError = (error == null ? void 0 : error.message) || latestError;
          }
          logger$1.debug(`工作【${jobTitle}】收藏失败; 正在等待重试; 原因：${latestError}`);
          await Tools.sleep(600);
          return await this.doCollect(jobDetail, latestError, retries - 1);
        }
        async requestBossDataByCache(jobDetail) {
          const cacheKey = `${jobDetail.encryptBossId}-${jobDetail.securityId}`;
          if (this.bossDataCache.has(cacheKey)) {
            return this.bossDataCache.get(cacheKey);
          }
          const result = await this.requestBossData(jobDetail);
          this.bossDataCache.set(cacheKey, result);
          return result;
        }
        async requestBossData(jobDetail, errorMsg = "", retries = 3) {
          const jobTitle = this.getJobKey(jobDetail);
          if (retries === 0) {
            throw new FetchJobBossFailExp(jobTitle, errorMsg || "获取boss数据重试多次失败");
          }
          const url = "https://www.zhipin.com/wapi/zpchat/geek/getBossData";
          const token = Tools.getCookieValue("bst");
          if (!token) {
            throw new FetchJobBossFailExp(jobTitle, "未获取到zp-token");
          }
          const data = new FormData();
          data.append("bossId", jobDetail.encryptBossId);
          data.append("securityId", jobDetail.securityId);
          data.append("bossSrc", "0");
          let resp;
          try {
            resp = await axios({ url, data, method: "POST", headers: { Zp_token: token } });
          } catch (e) {
            return this.requestBossData(jobDetail, e.message, retries - 1);
          }
          if (resp.data.code !== 0) {
            throw new FetchJobBossFailExp(jobTitle, resp.data.message);
          }
          return resp.data.zpData;
        }
        isSendChannelConnected(channel) {
          if (!channel) {
            return false;
          }
          if (channel.client && typeof channel.client.isConnected === "function") {
            try {
              return channel.client.isConnected();
            } catch (_e) {
              return false;
            }
          }
          return typeof channel.send === "function";
        }
        getSendChannelState() {
          return {
            imageExists: !!Tools.window.ChatWebsocketImage,
            imageConnected: this.isSendChannelConnected(Tools.window.ChatWebsocketImage),
            textExists: !!Tools.window.ChatWebsocket,
            textConnected: this.isSendChannelConnected(Tools.window.ChatWebsocket),
            geekExists: !!Tools.window.GeekChatCore
          };
        }
        formatSendChannelState(state) {
          return `image(${state.imageExists ? "Y" : "N"}/${state.imageConnected ? "on" : "off"}),text(${state.textExists ? "Y" : "N"}/${state.textConnected ? "on" : "off"}),geek(${state.geekExists ? "Y" : "N"})`;
        }
        async ensureSendChannelReady(waitMs = 4500) {
          if (!Tools.window.ChatWebsocketImage && typeof setChatWebsocket === "function") {
            await setChatWebsocket();
          }
          const tryInit = (channel) => {
            if (!channel || typeof channel.init !== "function") {
              return;
            }
            if (this.isSendChannelConnected(channel)) {
              return;
            }
            try {
              channel.init();
            } catch (e) {
              logger$1.debug("初始化消息通道失败", e);
            }
          };
          tryInit(Tools.window.ChatWebsocketImage);
          tryInit(Tools.window.ChatWebsocket);
          const startTs = Date.now();
          let reconnectTs = 0;
          while (Date.now() - startTs < waitMs) {
            const state = this.getSendChannelState();
            if (state.imageConnected || state.textConnected || state.geekExists) {
              return true;
            }
            if (Date.now() - reconnectTs > 1e3) {
              [Tools.window.ChatWebsocketImage, Tools.window.ChatWebsocket].forEach((channel) => {
                if (!channel || typeof channel.reConnection !== "function") {
                  return;
                }
                try {
                  channel.reConnection();
                } catch (e) {
                  logger$1.debug("消息通道重连触发失败", e);
                }
              });
              reconnectTs = Date.now();
            }
            await Tools.sleep(180);
          }
          return false;
        }
        async pushAfterHandler(pushResult, jobDetail) {
          const jobTitle = this.getJobKey(jobDetail);
          if (pushResult.message === "Success" && pushResult.code === 0) {
            pushResultCounter.successIncr();
            this.logRecorder.info(`工作【${jobTitle}】 投递成功`);
            try {
              await this.pushAfterSendImage(jobDetail);
            } catch (e) {
              this.logRecorder.warn(`工作【${jobTitle}】发送图片简历失败 原因：${(e == null ? void 0 : e.message) || e}`);
            }
            try {
              await this.pushAfterSendMsg(jobDetail);
            } catch (e) {
              this.logRecorder.warn(`工作【${jobTitle}】发送自定义消息失败 原因：${(e == null ? void 0 : e.message) || e}`);
            }
            jobDetail.contact = true;
            return jobDetail;
          }
          if (pushResult.message.includes("今日沟通人数已达上限")) {
            throw new PublishLimitExp(pushResult.message);
          }
          throw new PushReqException(jobTitle, pushResult.message);
        }
        async pushAfterSendMsg(jobDetail) {
          if (!userStore$2.user.preference.cgE || this._pushMock) {
            return;
          }
          const ready = await this.ensureSendChannelReady();
          if (!ready) {
            throw new Error(`消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`);
          }
          const bossData = await this.requestBossDataByCache(jobDetail);
          const customGreeting = userStore$2.user.preference.cg;
          const message = new Message({
            form_uid: Tools.window._PAGE.uid.toString(),
            to_uid: bossData.data.bossId.toString(),
            to_name: jobDetail.encryptBossId,
            content: customGreeting,
            image: void 0
          });
          let sendOk = message.send();
          if (!sendOk) {
            await Tools.sleep(300);
            await this.ensureSendChannelReady(2200);
            sendOk = message.send();
          }
          if (!sendOk) {
            throw new Error(`消息发送失败(${this.formatSendChannelState(this.getSendChannelState())})`);
          }
        }
        async pushAfterSendImage(jobDetail) {
          if (!userStore$2.user.preference.cIE || this._pushMock) {
            return;
          }
          const customerImageSet = userStore$2.user.preference.cI;
          if (!customerImageSet) {
            return;
          }
          const [originImage, tinyImage] = customerImageSet.split("===");
          if (!originImage || !tinyImage) {
            throw new Error("图片简历配置格式异常，请重新上传图片简历");
          }
          const ready = await this.ensureSendChannelReady(5500);
          if (!ready) {
            throw new Error(`图片消息发送通道不可用(${this.formatSendChannelState(this.getSendChannelState())})`);
          }
          const bossData = await this.requestBossDataByCache(jobDetail);
          const message = new Message({
            form_uid: Tools.window._PAGE.uid.toString(),
            to_uid: bossData.data.bossId.toString(),
            to_name: jobDetail.encryptBossId,
            content: "",
            image: {
              originImage,
              tinyImage
            }
          });
          let sendOk = message.send();
          if (!sendOk) {
            await Tools.sleep(350);
            await this.ensureSendChannelReady(2200);
            sendOk = message.send();
          }
          if (!sendOk) {
            throw new Error(`图片消息发送失败(${this.formatSendChannelState(this.getSendChannelState())})`);
          }
        }
        pushPreHandler(jobDetail) {
          return jobDetail;
        }
        async obtainBossJobDetailExt(jobDetail, message = "", retries = 3) {
          if (retries === 0) {
            logger$1.warn(`获取工作详情扩展信息异常,用于活跃度过滤以及工作内容过滤; 原因：${message}`);
            throw new NotMatchException(this.getJobKey(jobDetail), message, "获取工作详情扩展信息异常");
          }
          const params = `lid=${jobDetail.lid}&securityId=${jobDetail.securityId}&sessionId=`;
          try {
            const resp = await axios.get("https://www.zhipin.com/wapi/zpgeek/job/card.json?" + params, { timeout: 5e3 });
            return resp.data.zpData.jobCard;
          } catch (error) {
            logger$1.debug("获取详情页异常正在重试:", error);
            return this.obtainBossJobDetailExt(jobDetail, error.message, retries - 1);
          }
        }
        bossIsActive(activeText, activePreference = {}) {
          const checkWeek = activePreference.acW !== false;
          const checkMonth = activePreference.acM !== false;
          const checkYear = activePreference.acY !== false;
          if (checkWeek && activeText.includes("周")) {
            return false;
          }
          if (checkMonth && activeText.includes("月")) {
            return false;
          }
          if (checkYear && activeText.includes("年")) {
            return false;
          }
          return true;
        }
        isCommunication(jobCardJson) {
          return (jobCardJson == null ? void 0 : jobCardJson.friendStatus) === 1;
        }
      }
      const platformList = [BossPlatform];
      class PlatformFactory {
        static getInstance(url) {
          for (const PlatformClass of platformList) {
            const platformInstance = new PlatformClass(url);
            if (platformInstance.urlList.some((platformUrl) => url.includes(platformUrl))) {
              const pushResultCounter2 = pushResultCount();
              const userStore = UserStore();
              userStore.platformType = platformInstance.getPlatformType();
              bindPlatformRuntime(pushResultCounter2, userStore);
              userRemoteLoad();
              return platformInstance;
            }
          }
          throw new PlatformError(2, "错误的平台");
        }
      }
      const app = createApp(_sfc_main);
      app.use(createPinia());
      app.use(ElementPlus__default, { locale: zhCn });
      const platform = PlatformFactory.getInstance(location.href);
      app.provide("$platform", platform);
      app.provide("$axios", request);
      const rootApp = document.createElement("div");
      rootApp.id = "ai-job";
      rootApp.classList.add("page-job-content");
      window.onload = () => {
        platform.getMountEle().then((elP) => {
          const containerEle = elP.el;
          if (elP.p === "end") {
            containerEle.appendChild(rootApp);
          } else {
            containerEle.insertBefore(rootApp, containerEle.firstElementChild);
          }
          app.mount(rootApp);
        });
      };

    })
  };
}));

System.register("./BossMessage-unG4I697-CsGc8Ieo.js", ['vue', 'element-plus', './__monkey.entry-bLmTlXtK.js', 'pinia', 'protobufjs'], (function (exports, module) {
  'use strict';
  var defineComponent, openBlock, createBlock, unref, Vue, ElementPlus, _export_sfc, ElMessage, AiPower, Message, Tools;
  return {
    setters: [module => {
      defineComponent = module.defineComponent;
      openBlock = module.openBlock;
      createBlock = module.createBlock;
      unref = module.unref;
      Vue = module;
    }, module => {
      ElementPlus = module;
    }, module => {
      _export_sfc = module._;
      ElMessage = module.E;
      AiPower = module.A;
      Message = module.M;
      Tools = module.T;
    }, null, null],
    execute: (function () {

      const _sfc_main = /* @__PURE__ */ defineComponent({
        __name: "BossMessage",
        setup(__props) {
          const VueAny = Vue;
          const ElementAny = ElementPlus;
          const {
            defineComponent: defineComponent2,
            openBlock: openBlock$1,
            createElementBlock,
            ref,
            createVNode,
            Fragment,
            withCtx,
            createTextVNode,
            createCommentVNode,
            createElementVNode
          } = VueAny;
          const pushScopeId = VueAny.pushScopeId || (() => void 0);
          const popScopeId = VueAny.popScopeId || (() => void 0);
          const {
            ElButton,
            ElInput
          } = ElementAny;
          const GlobalAny = globalThis;
          const BossOption = GlobalAny.BossOption || { buildJobKey: (_data) => "" };
          const _withScopeId = (n) => (pushScopeId("data-v-251fd5d8"), n = n(), popScopeId(), n);
          const _hoisted_1 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createElementVNode("br", null, null, -1));
          const _hoisted_2 = {
            key: 0,
            class: "batch-send-float"
          };
          const _hoisted_3 = {
            class: "dialog-footer",
            style: { "margin-top": "10px", "text-align": "right" }
          };
          const _sfc_main2 = /* @__PURE__ */ defineComponent2({
            __name: "BossMessage",
            setup(__props2) {
              const batchSendDialogVisible = ref(false);
              const batchMessageText = ref("");
              const cleanupBatchUI = () => {
                const checkboxes = document.querySelectorAll(".batch-checkbox");
                checkboxes.forEach((checkbox) => checkbox.remove());
                const selectedElements = document.querySelectorAll(".batch-send-item");
                selectedElements.forEach((element) => element.classList.remove("batch-send-item"));
              };
              const onCancel = () => {
                batchSendDialogVisible.value = false;
                cleanupBatchUI();
                batchMessageText.value = "";
              };
              const checkAndCreateBatchSendButton = () => {
                const labelList = document.querySelector(".label-list");
                if (!labelList)
                  return;
                const existingButton = labelList.querySelector(".batch-send-btn");
                if (existingButton)
                  return;
                const batchSendButton = document.createElement("button");
                batchSendButton.className = "batch-send-btn";
                batchSendButton.innerHTML = "批量发送消息";
                batchSendButton.style.cssText = `
        margin: 10px 0px;
        padding: 8px 8px;
        background-color: #6ead34;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    `;
                batchSendButton.addEventListener("click", () => {
                  addCheckboxesToItems();
                  batchSendDialogVisible.value = true;
                });
                labelList.appendChild(batchSendButton);
              };
              const addCheckboxesToItems = () => {
                const items = document.querySelectorAll(".friend-content-warp");
                items.forEach((item) => {
                  if (item.querySelector(".batch-checkbox"))
                    return;
                  const checkbox = document.createElement("input");
                  checkbox.type = "checkbox";
                  checkbox.className = "batch-checkbox";
                  checkbox.style.cssText = `
            margin-right: 8px;
            transform: scale(1.2);
        `;
                  checkbox.addEventListener("click", (e) => {
                    e.stopPropagation();
                  });
                  checkbox.addEventListener("change", (e) => {
                    const target = e.target;
                    e.stopPropagation();
                    if (target.checked) {
                      item.classList.add("batch-send-item");
                    } else {
                      item.classList.remove("batch-send-item");
                    }
                  });
                  let firstElementChild = item.firstElementChild;
                  firstElementChild.insertBefore(checkbox, firstElementChild.firstChild);
                });
              };
              const sendBatchMessage = () => {
                if (!batchMessageText.value.trim()) {
                  ElMessage({
                    type: "warning",
                    message: "请输入消息内容"
                  });
                  return;
                }
                const selectedItems = document.querySelectorAll(".friend-content-warp.batch-send-item");
                if (selectedItems.length === 0) {
                  ElMessage({
                    type: "warning",
                    message: "请至少选择一个联系人"
                  });
                  return;
                }
                selectedItems.forEach((item) => {
                  const vueInstance = item.__vue__;
                  if (vueInstance && vueInstance.source) {
                    const to_uid = vueInstance.source.uid;
                    const to_name = vueInstance.source.encryptBossId;
                    if (to_uid && to_name) {
                      const message = new Message({
                        form_uid: Tools.window._PAGE.uid.toString(),
                        to_uid: to_uid.toString(),
                        to_name,
                        content: batchMessageText.value,
                        image: void 0
                      });
                      message.send();
                    }
                  }
                });
                ElMessage({
                  duration: 3e3,
                  type: "success",
                  message: `已发送消息给 ${selectedItems.length} 个联系人; 刷新页面查看结果`
                });
                batchMessageText.value = "";
                batchSendDialogVisible.value = false;
                cleanupBatchUI();
              };
              setInterval(() => {
                checkAndCreateBatchSendButton();
              }, 1e3);
              const handlerClick = () => {
                var _a, _b, _c;
                const element = document.querySelector(".friend-content.selected");
                const encryptJobId = (_c = (_b = (_a = element == null ? void 0 : element.parentElement) == null ? void 0 : _a.__vue__) == null ? void 0 : _b.source) == null ? void 0 : _c.encryptJobId;
                if (!encryptJobId) {
                  ElMessage({
                    type: "info",
                    message: "请先进入聊天窗口"
                  });
                  return;
                }
                const jobKey = BossOption.buildJobKey({ encryptJobId });
                AiPower.updateAskStatus(jobKey, false).then((_) => {
                  ElMessage({
                    type: "success",
                    message: "已重新触发AI代聊"
                  });
                });
              };
              return (_ctx, _cache) => {
                const _component_el_button = ElButton;
                const _component_el_input = ElInput;
                return openBlock$1(), createElementBlock(Fragment, null, [
                  _hoisted_1,
                  createVNode(_component_el_button, {
                    style: { "margin-left": "10px" },
                    type: "success",
                    onClick: handlerClick
                  }, {
                    default: withCtx(() => [
                      createTextVNode("重启当前会话AI代聊")
                    ]),
                    _: 1
                  }),
                  batchSendDialogVisible.value ? (openBlock$1(), createElementBlock("div", _hoisted_2, [
                    createVNode(_component_el_input, {
                      modelValue: batchMessageText.value,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => batchMessageText.value = $event),
                      type: "textarea",
                      rows: 4,
                      placeholder: "请输入要发送的消息内容"
                    }, null, 8, ["modelValue"]),
                    createElementVNode("div", _hoisted_3, [
                      createVNode(_component_el_button, { onClick: onCancel }, {
                        default: withCtx(() => [
                          createTextVNode("取消")
                        ]),
                        _: 1
                      }),
                      createVNode(_component_el_button, {
                        type: "primary",
                        onClick: sendBatchMessage
                      }, {
                        default: withCtx(() => [
                          createTextVNode("发送")
                        ]),
                        _: 1
                      })
                    ])
                  ])) : createCommentVNode("", true)
                ], 64);
              };
            }
          });
          const RenderComponent = _sfc_main2;
          return (_ctx, _cache) => {
            return openBlock(), createBlock(unref(RenderComponent));
          };
        }
      });
      const BossMessage = exports("default", /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-56b7eb89"]]));

    })
  };
}));

System.import("./__entry.js", "./");