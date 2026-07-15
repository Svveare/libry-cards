import { useCallback, useEffect, useMemo, useState } from 'react';

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
  isFullscreen?: boolean;
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

const PREFER_FS_KEY = 'libry_prefer_fullscreen';
const FS_PAD_BUFFER = 8;
const BASE_PAD_TOP = 12;
const BASE_PAD_SIDE = 18;
const BASE_PAD_BOTTOM = 40;

function getWebApp(): TelegramWebApp | null {
  try {
    const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
      .Telegram;
    return tg?.WebApp ?? null;
  } catch {
    return null;
  }
}

function setCssPx(name: string, value: number) {
  document.documentElement.style.setProperty(name, `${Math.max(0, value)}px`);
}

function insetPx(n: number | undefined): number {
  return typeof n === 'number' && n > 0 ? n : 0;
}

function syncSafeAreas(app: TelegramWebApp) {
  const safe = app.safeAreaInset;
  const content = app.contentSafeAreaInset;
  const fullscreen = Boolean(app.isFullscreen);

  setCssPx('--tg-safe-area-inset-top', insetPx(safe?.top));
  setCssPx('--tg-safe-area-inset-bottom', insetPx(safe?.bottom));
  setCssPx('--tg-safe-area-inset-left', insetPx(safe?.left));
  setCssPx('--tg-safe-area-inset-right', insetPx(safe?.right));
  setCssPx('--tg-content-safe-area-inset-top', insetPx(content?.top));
  setCssPx('--tg-content-safe-area-inset-bottom', insetPx(content?.bottom));
  setCssPx('--tg-content-safe-area-inset-left', insetPx(content?.left));
  setCssPx('--tg-content-safe-area-inset-right', insetPx(content?.right));

  document.documentElement.dataset.tgFullscreen = fullscreen ? '1' : '0';

  if (fullscreen) {
    // In FS content draws under TG chrome — pad clear of close / status bar.
    setCssPx(
      '--app-pad-top',
      Math.max(insetPx(content?.top), insetPx(safe?.top)) +
        BASE_PAD_TOP +
        FS_PAD_BUFFER,
    );
    setCssPx(
      '--app-pad-bottom',
      Math.max(insetPx(content?.bottom), insetPx(safe?.bottom)) +
        BASE_PAD_BOTTOM,
    );
    setCssPx(
      '--app-pad-left',
      Math.max(insetPx(content?.left), insetPx(safe?.left)) + BASE_PAD_SIDE,
    );
    setCssPx(
      '--app-pad-right',
      Math.max(insetPx(content?.right), insetPx(safe?.right)) + BASE_PAD_SIDE,
    );
  } else {
    // Expand mode: TG already sits above the WebView — no contentSafeArea top.
    setCssPx('--app-pad-top', BASE_PAD_TOP);
    setCssPx('--app-pad-bottom', BASE_PAD_BOTTOM);
    setCssPx('--app-pad-left', BASE_PAD_SIDE);
    setCssPx('--app-pad-right', BASE_PAD_SIDE);
  }

  const h = app.viewportStableHeight;
  if (typeof h === 'number' && h > 0) {
    document.documentElement.style.setProperty(
      '--tg-viewport-stable-height',
      `${h}px`,
    );
  }
}

function readPreferFullscreen(): boolean {
  try {
    return localStorage.getItem(PREFER_FS_KEY) === '1';
  } catch {
    return false;
  }
}

function writePreferFullscreen(on: boolean) {
  try {
    localStorage.setItem(PREFER_FS_KEY, on ? '1' : '0');
  } catch {
    // ignore
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const webApp = useMemo(() => getWebApp(), []);
  const insideTelegram = Boolean(webApp?.initData);
  const user = webApp?.initDataUnsafe?.user;
  const userId = user?.id?.toString() ?? 'guest';
  const canFullscreen = Boolean(webApp?.requestFullscreen);

  const startParam =
    webApp?.initDataUnsafe?.start_param ??
    new URLSearchParams(window.location.search).get('tgWebAppStartParam') ??
    null;

  useEffect(() => {
    const app = getWebApp();
    if (!app) {
      document.documentElement.style.setProperty('--app-pad-top', '12px');
      document.documentElement.style.setProperty('--app-pad-bottom', '40px');
      document.documentElement.style.setProperty('--app-pad-left', '18px');
      document.documentElement.style.setProperty('--app-pad-right', '18px');
      setIsReady(true);
      return;
    }

    try {
      app.ready?.();
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

    const refresh = () => {
      setIsFullscreen(Boolean(app.isFullscreen));
      syncSafeAreas(app);
    };

    const onLayout = () => {
      if (!app.isFullscreen) {
        try {
          app.expand?.();
        } catch {
          // ignore
        }
      }
      refresh();
    };

    try {
      app.onEvent?.('viewportChanged', onLayout);
      app.onEvent?.('safeAreaChanged', onLayout);
      app.onEvent?.('contentSafeAreaChanged', onLayout);
      app.onEvent?.('fullscreenChanged', refresh);
    } catch {
      // ignore
    }

    refresh();

    if (readPreferFullscreen() && app.requestFullscreen && !app.isFullscreen) {
      try {
        app.requestFullscreen();
      } catch {
        // ignore
      }
      // Insets update via fullscreenChanged
      window.setTimeout(refresh, 120);
    }

    setIsReady(true);

    return () => {
      try {
        app.offEvent?.('viewportChanged', onLayout);
        app.offEvent?.('safeAreaChanged', onLayout);
        app.offEvent?.('contentSafeAreaChanged', onLayout);
        app.offEvent?.('fullscreenChanged', refresh);
      } catch {
        // ignore
      }
    };
  }, []);

  const enterFullscreen = useCallback(() => {
    const app = getWebApp();
    if (!app?.requestFullscreen) return;
    writePreferFullscreen(true);
    try {
      app.requestFullscreen();
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      setIsFullscreen(Boolean(app.isFullscreen));
      syncSafeAreas(app);
    }, 80);
  }, []);

  const leaveFullscreen = useCallback(() => {
    const app = getWebApp();
    writePreferFullscreen(false);
    try {
      app?.exitFullscreen?.();
    } catch {
      // ignore
    }
    try {
      app?.expand?.();
    } catch {
      // ignore
    }
    window.setTimeout(() => {
      if (app) {
        setIsFullscreen(Boolean(app.isFullscreen));
        syncSafeAreas(app);
      } else {
        setIsFullscreen(false);
      }
    }, 80);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) leaveFullscreen();
    else enterFullscreen();
  }, [isFullscreen, enterFullscreen, leaveFullscreen]);

  return {
    isReady,
    userId,
    user,
    insideTelegram,
    webApp,
    initData: webApp?.initData ?? '',
    startParam,
    isFullscreen,
    canFullscreen,
    enterFullscreen,
    leaveFullscreen,
    toggleFullscreen,
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
