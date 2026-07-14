export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';

export type StandType = 'permanent' | 'seasonal' | 'collab' | 'event' | 'collectible';

export type HomeMenuId = 'daily' | 'library' | 'quests' | 'shop' | 'friends';

export type ShopCategoryId =
  | 'chests'
  | 'cases'
  | 'guarantee'
  | 'books'
  | 'ink';

export type ShopItemId =
  | 'chest_entry'
  | 'chest_now'
  | 'chest_plus'
  | 'case_soft'
  | 'case_mid'
  | 'case_hot'
  | 'pack_rare'
  | 'pack_epic'
  | 'pack_legendary'
  | 'book_music';

export type ShopItemAction =
  | 'open_chest_free'
  | 'reset_chest'
  | 'open_chest_plus'
  | 'case_soft'
  | 'case_mid'
  | 'case_hot'
  | 'pack_rare'
  | 'pack_epic'
  | 'pack_legendary'
  | 'book_music';

export type CaseTier = 'soft' | 'mid' | 'hot';

export type ChestVariant = 'free' | 'plus';

export interface Card {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  slotIndex: number;
  bookId: string;
  shelfId: string;
  standId: string;
  image?: string;
}

export interface Page {
  id: string;
  number: number;
  rarity: Rarity;
  cards: Card[];
}

export interface Book {
  id: string;
  name: string;
  rarity: Rarity;
  shelfId: string;
  order: number;
  enabled: boolean;
  pages: Page[];
}

export interface Shelf {
  id: string;
  name: string;
  standId: string;
  order: number;
  enabled: boolean;
  books: Book[];
}

export interface Stand {
  id: string;
  name: string;
  type: StandType;
  order: number;
  enabled: boolean;
  shelves: Shelf[];
}

export interface ContentData {
  stands: Stand[];
}

export interface MoneyTier {
  amount: number;
  weight: number;
}

export interface ShopCategory {
  id: ShopCategoryId;
  title: string;
  hint?: string;
}

export interface ShopItem {
  id: ShopItemId;
  categoryId: ShopCategoryId;
  title: string;
  description?: string;
  price: number;
  action: ShopItemAction;
}

export interface AppConfig {
  telegramChannel: {
    username: string;
    requiredForDaily: boolean;
    requiredForChest?: boolean;
    enabled: boolean;
  };
  telegramBotUsername: string;
  /** Named Mini App path in t.me links (e.g. "app"). Empty = Main Mini App format. */
  telegramMiniAppShortName?: string;
  daily: {
    cooldownHours: number;
    moneyTiers: MoneyTier[];
    unlimitedOpens?: boolean;
  };
  chest: {
    cooldownHours: number;
    unlimitedOpens?: boolean;
  };
  shop: {
    categories: ShopCategory[];
    items: ShopItem[];
  };
  defaults: {
    startingCoins: number;
  };
  adminUserIds?: string[];
  dev?: {
    grantAllCards?: boolean;
  };
}

export interface UserProgress {
  collectedCardIds: string[];
  lastDailyOpenAt: string | null;
  lastChestOpenAt: string | null;
  coins: number;
  rating: number;
  bookTokens: number;
  ink: number;
  inkShopCardIds: string[];
  inkShopRolledAt: string | null;
  bonusCaseOpens: number;
  claimedQuestIds: string[];
  claimedAchievementIds: string[];
  visitedLibraryAt: string | null;
  lifetimeDailyOpens: number;
  lifetimeChestOpens: number;
  lifetimeInkEarned: number;
  inkPurchases: number;
  referralCount: number;
  referredByUserId: string | null;
  referralBonusClaimed: boolean;
  /** Soft channel gate until bot membership check exists. */
  channelConfirmedAt: string | null;
}

export type DailyRewardKind =
  | 'money'
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'book'
  | 'ink';

export type DailyReward =
  | { kind: 'money'; amount: number }
  | { kind: 'book'; tokens: number }
  | { kind: 'ink'; amount: number }
  | { kind: 'card'; card: Card };

export type Screen =
  | { name: 'home' }
  | { name: 'daily' }
  | { name: 'chest'; variant?: ChestVariant }
  | { name: 'library' }
  | { name: 'quests' }
  | { name: 'shop' }
  | { name: 'shopCategory'; categoryId: ShopCategoryId }
  | { name: 'shopItem'; itemId: ShopItemId }
  | { name: 'friends' }
  | { name: 'stand'; standId: string }
  | { name: 'shelf'; standId: string; shelfId: string }
  | { name: 'book'; standId: string; shelfId: string; bookId: string }
  | { name: 'profile' }
  | { name: 'admin' };

export const RARITY_LABELS: Record<Rarity, string> = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
  mythic: 'Мифическая',
  secret: 'Секретная',
};

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
  mythic: 'var(--rarity-mythic)',
  secret: 'var(--rarity-secret)',
};

export const REWARD_KIND_COLORS: Record<DailyRewardKind, string> = {
  money: 'var(--gold)',
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
  book: '#c4a574',
  ink: '#7eb8d4',
};

export const STAND_TYPE_LABELS: Record<StandType, string> = {
  permanent: 'Постоянные',
  seasonal: 'Сезонные',
  collab: 'Коллаборации',
  event: 'События',
  collectible: 'Коллекционные',
};
