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
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
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
    if (app) {
      try {
        app.ready?.();
      } catch {
        // ignore
      }

      if (app.initData) {
        try {
          app.expand?.();
        } catch {
          // ignore
        }
        try {
          app.setHeaderColor?.('#0D0F14');
        } catch {
          // Outside Telegram / old version — ignore
        }
        try {
          app.setBackgroundColor?.('#0D0F14');
        } catch {
          // ignore
        }
      }
    }
    setIsReady(true);
  }, []);

  return {
    isReady,
    userId,
    user,
    insideTelegram,
    webApp,
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
