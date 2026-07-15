import { useEffect, useMemo, useState } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

type SafeArea = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
  };
  platform?: string;
  viewportStableHeight?: number;
  safeAreaInset?: SafeArea;
  contentSafeAreaInset?: SafeArea;
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent?: (event: string, callback: () => void) => void;
  offEvent?: (event: string, callback: () => void) => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
};

function getWebApp(): TelegramWebApp | null {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram;
    return tg?.WebApp ?? null;
  } catch {
    return null;
  }
}

function setCssPx(name: string, value: number | undefined) {
  const px = typeof value === 'number' && value > 0 ? `${value}px` : '0px';
  document.documentElement.style.setProperty(name, px);
}

function syncSafeAreas(app: TelegramWebApp) {
  const safe = app.safeAreaInset;
  const content = app.contentSafeAreaInset;
  setCssPx('--tg-safe-area-inset-top', safe?.top);
  setCssPx('--tg-safe-area-inset-bottom', safe?.bottom);
  setCssPx('--tg-safe-area-inset-left', safe?.left);
  setCssPx('--tg-safe-area-inset-right', safe?.right);
  setCssPx('--tg-content-safe-area-inset-top', content?.top);
  setCssPx('--tg-content-safe-area-inset-bottom', content?.bottom);
  setCssPx('--tg-content-safe-area-inset-left', content?.left);
  setCssPx('--tg-content-safe-area-inset-right', content?.right);

  const h = app.viewportStableHeight;
  if (typeof h === 'number' && h > 0) {
    document.documentElement.style.setProperty(
      '--tg-viewport-stable-height',
      `${h}px`,
    );
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);

  const webApp = useMemo(() => getWebApp(), []);
  const insideTelegram = Boolean(webApp?.initData);
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() ?? 'guest';

  const startParam =
    webApp?.initDataUnsafe?.start_param ??
    new URLSearchParams(window.location.search).get('tgWebAppStartParam') ??
    null;

  useEffect(() => {
    const app = getWebApp();
    if (!app) {
      setIsReady(true);
      return;
    }

    try {
      app.ready?.();
    } catch {
      // ignore
    }

    // Expand to usable height, but do NOT requestFullscreen —
    // fullscreen draws under iOS status bar and Telegram chrome.
    try {
      app.exitFullscreen?.();
    } catch {
      // ignore
    }

    try {
      app.expand?.();
    } catch {
      // ignore
    }

    try {
      app.disableVerticalSwipes?.();
    } catch {
      // ignore
    }

    try {
      app.setHeaderColor?.('#0D0F14');
    } catch {
      // Outside Telegram / old version
    }

    try {
      app.setBackgroundColor?.('#0D0F14');
    } catch {
      // ignore
    }

    syncSafeAreas(app);
    const onLayout = () => {
      try {
        app.expand?.();
      } catch {
        // ignore
      }
      syncSafeAreas(app);
    };
    try {
      app.onEvent?.('viewportChanged', onLayout);
      app.onEvent?.('safeAreaChanged', onLayout);
      app.onEvent?.('contentSafeAreaChanged', onLayout);
    } catch {
      // ignore
    }

    setIsReady(true);

    return () => {
      try {
        app.offEvent?.('viewportChanged', onLayout);
        app.offEvent?.('safeAreaChanged', onLayout);
        app.offEvent?.('contentSafeAreaChanged', onLayout);
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    isReady,
    userId,
    user,
    insideTelegram,
    webApp,
    initData: webApp?.initData ?? '',
    startParam,
    openTelegramLink: (url: string) => {
      const app = getWebApp();
      try {
        if (app?.openTelegramLink) {
          app.openTelegramLink(url);
          return;
        }
        if (app?.openLink) {
          app.openLink(url);
          return;
        }
      } catch {
        // fall through
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  };
}
