// -*- coding: utf-8 -*-

export const simulateScrollToEnd = async (platform2?: string): Promise<void> => {
  const isMac = platform2 === "mac" || navigator.platform.toUpperCase().includes("MAC");
  const modifierKey = isMac ? "Meta" : "Control";
  try {
    const activeElement = document.activeElement;
    const eventOptions: KeyboardEventInit = {
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
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  } catch (error) {
    console.warn("键盘事件触发失败，使用备选方案");
  }
  const getMaxScroll = (): number => {
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
