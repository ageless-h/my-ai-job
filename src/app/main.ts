// -*- coding: utf-8 -*-
import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";

import App from "@/app/App.vue";
import { request } from "@/core/http/request";
import { PlatformFactory } from "@/core/platform/platform-factory";

const app = createApp(App);
app.use(createPinia());
app.use(ElementPlus, { locale: zhCn });

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
