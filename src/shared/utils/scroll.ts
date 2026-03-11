// -*- coding: utf-8 -*-

export const simulateScrollToEnd = async (platform2?: string): Promise<void> => {
  const isMac = platform2 === 'mac' || navigator.platform.toUpperCase().includes('MAC');
  const modifierKey = isMac ? 'Meta' : 'Control';
  const waitFrame = (): Promise<void> => {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  };

  try {
    const activeElement = document.activeElement;
    const eventOptions: KeyboardEventInit = {
      key: 'End',
      code: 'End',
      [modifierKey.toLowerCase() + 'Key']: true,
      bubbles: true,
      cancelable: true,
      composed: true,
      view: window,
    };
    const downEvent = new KeyboardEvent('keydown', eventOptions);
    const upEvent = new KeyboardEvent('keyup', eventOptions);
    document.dispatchEvent(downEvent);
    document.dispatchEvent(upEvent);
    if (activeElement) {
      activeElement.dispatchEvent(downEvent);
      activeElement.dispatchEvent(upEvent);
    }
    await waitFrame();
  } catch (error) {
    console.warn('键盘事件触发失败，使用备选方案');
  }

  const getMaxScroll = (): number => {
    const documentElement = document.documentElement;
    return (
      Math.max(
        document.body.scrollHeight,
        documentElement.scrollHeight,
        document.body.offsetHeight,
        documentElement.offsetHeight,
        document.body.clientHeight,
        documentElement.clientHeight
      ) - window.innerHeight
    );
  };

  let stableRounds = 0;
  let guard = 0;
  while (guard < 40) {
    const beforeMaxScroll = Math.max(0, getMaxScroll());
    window.scrollTo({
      top: beforeMaxScroll,
      behavior: 'auto',
    });
    await waitFrame();
    await waitFrame();

    const afterMaxScroll = Math.max(0, getMaxScroll());
    const atBottom = window.scrollY >= afterMaxScroll - 4;
    const heightStable = Math.abs(afterMaxScroll - beforeMaxScroll) <= 2;

    if (atBottom && heightStable) {
      stableRounds++;
      if (stableRounds >= 3) {
        break;
      }
    } else {
      stableRounds = 0;
    }

    if (!atBottom) {
      window.scrollBy(0, Math.max(200, Math.floor(window.innerHeight * 0.8)));
      await waitFrame();
    }

    guard++;
  }

  const finalMaxScroll = Math.max(0, getMaxScroll());
  window.scrollTo({ top: finalMaxScroll, behavior: 'auto' });
  await waitFrame();
};
