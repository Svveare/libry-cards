import { useEffect, useMemo, useState } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
  };
  platform?: string;
  viewportStableHeight?: number;
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
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

function syncViewportHeight(app: TelegramWebApp) {
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

    try {
      app.expand?.();
    } catch {
      // ignore
    }

    try {
      app.requestFullscreen?.();
    } catch {
      // Bot API 8+ only
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

    syncViewportHeight(app);
    const onViewport = () => syncViewportHeight(app);
    try {
      app.onEvent?.('viewportChanged', onViewport);
    } catch {
      // ignore
    }

    setIsReady(true);

    return () => {
      try {
        app.offEvent?.('viewportChanged', onViewport);
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
