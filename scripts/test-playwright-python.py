# -*- coding: utf-8 -*-
"""
Playwright Python示例脚本
用于测试AI Job Hunting的preview页面
"""

from playwright.sync_api import sync_playwright
import time


def test_panel_mount():
    """测试面板挂载和基本交互"""
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False)  # headless=False用于调试
        page = browser.new_page()

        try:
            # 访问preview页面
            print("正在访问preview页面...")
            page.goto("http://127.0.0.1:4173/preview.html")
            page.wait_for_load_state("networkidle")

            # 等待面板加载
            print("等待面板加载...")
            time.sleep(2)

            # 查找FAB按钮
            fab_button = page.get_by_test_id("fab-button")
            print(f"FAB按钮可见: {fab_button.is_visible()}")

            # 点击FAB展开面板
            print("点击FAB按钮...")
            fab_button.click()
            time.sleep(1)

            # 验证面板已展开
            panel = page.get_by_test_id("panel-container")
            print(f"面板已展开: {panel.is_visible()}")

            # 截图
            page.screenshot(path="screenshots/panel-opened.png")
            print("截图已保存: screenshots/panel-opened.png")

            # 测试Tab切换
            print("\n测试Tab切换...")
            tabs = ["工作台", "AI 配置", "传统投递", "账户"]
            for tab_name in tabs:
                tab = page.get_by_test_id(f"tab-{tab_name}")
                print(f"切换到 {tab_name} Tab...")
                tab.click()
                time.sleep(0.5)
                page.screenshot(path=f"screenshots/tab-{tab_name}.png")

            print("\n✅ 测试完成！")

        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            page.screenshot(path="screenshots/error.png")
            raise

        finally:
            # 关闭浏览器
            browser.close()


def test_aijob_interactions():
    """测试AiJob组件交互"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        try:
            # 访问页面并展开面板
            page.goto("http://127.0.0.1:4173/preview.html")
            page.wait_for_load_state("networkidle")
            time.sleep(2)

            page.get_by_test_id("fab-button").click()
            time.sleep(1)

            # 切换到工作台Tab
            page.get_by_test_id("tab-工作台").click()
            time.sleep(0.5)

            # 测试统计数字
            print("检查统计数字...")
            success_count = page.get_by_test_id("push-success-count")
            fail_count = page.get_by_test_id("push-fail-count")
            print(f"成功计数: {success_count.text_content()}")
            print(f"失败计数: {fail_count.text_content()}")

            # 测试单次处理限制输入
            print("\n测试单次处理限制...")
            limit_input = page.get_by_test_id("push-count-limit")
            limit_input.fill("50")
            time.sleep(0.5)
            page.screenshot(path="screenshots/aijob-limit-changed.png")

            # 测试收藏模式开关
            print("\n测试收藏模式开关...")
            collect_switch = page.get_by_test_id("collect-mode-switch")
            collect_switch.click()
            time.sleep(0.5)
            page.screenshot(path="screenshots/aijob-collect-mode.png")

            # 测试无限循环开关
            print("\n测试无限循环开关...")
            loop_switch = page.get_by_test_id("infinite-loop-switch")
            loop_switch.click()
            time.sleep(0.5)

            print("\n✅ AiJob交互测试完成！")

        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            page.screenshot(path="screenshots/error-aijob.png")
            raise

        finally:
            browser.close()


if __name__ == "__main__":
    import os

    # 创建截图目录
    os.makedirs("screenshots", exist_ok=True)

    print("=" * 50)
    print("AI Job Hunting - Playwright Python测试")
    print("=" * 50)
    print("\n注意: 请确保preview服务器正在运行")
    print("启动命令: npm run dev:preview")
    print("\n" + "=" * 50 + "\n")

    # 运行测试
    print("测试1: 面板挂载和Tab切换")
    print("-" * 50)
    test_panel_mount()

    print("\n\n测试2: AiJob组件交互")
    print("-" * 50)
    test_aijob_interactions()

    print("\n" + "=" * 50)
    print("所有测试完成！")
    print("截图保存在 screenshots/ 目录")
    print("=" * 50)
