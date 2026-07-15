export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' | 'secret';

export type StandType = 'permanent' | 'seasonal' | 'collab' | 'event' | 'collectible';

export type HomeMenuId =
  | 'daily'
  | 'pass'
  | 'library'
  | 'quests'
  | 'shop'
  | 'friends';

export type ShopCategoryId =
  | 'chests'
  | 'cases'
  | 'guarantee'
  | 'books'
  | 'pages'
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
  | 'book_music'
  | 'pages_ink'
  | 'pages_coins'
  | 'pages_soft'
  | 'pages_mid';

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
  | 'book_music'
  | 'pages_ink'
  | 'pages_coins'
  | 'pages_soft'
  | 'pages_mid';

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

/** Bothost admin overrides applied on bootstrap. */
export type CardOverride = {
  name?: string;
  description?: string;
  image?: string;
  rarity?: string;
};

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
  /** Bothost HTTPS origin for bot API, e.g. https://xxx.bothost.ru — empty = offline */
  backendBaseUrl?: string;
  dev?: {
    grantAllCards?: boolean;
  };
}

export type CardRarityRoll = 'common' | 'rare' | 'epic' | 'legendary';

/** Grantable reward for pass / streak / quests / achievements. */
export type GrantReward =
  | { kind: 'coins'; amount: number }
  | { kind: 'ink'; amount: number }
  | { kind: 'pages'; amount: number }
  | { kind: 'bonusCase'; amount: number }
  | { kind: 'cardRarity'; rarity: CardRarityRoll }
  | { kind: 'choice'; options: Array<GrantReward | GrantReward[]> };

export interface DayStats {
  day: string;
  spentCoins: number;
  paidCases: number;
  inkEarned: number;
  inkBuys: number;
  passClaims: number;
  achievementClaims: number;
  chestOpens: number;
  /** First meaningful action ISO for midday unlock. */
  firstActiveAt: string | null;
  newCards: number;
  epicPlus: number;
  rarePlus: number;
  bonusCaseOpens: number;
  moneyHitMax: number;
  /** Mid/Hot paid cases today. */
  riskCases: number;
  /** Actions after midday unlock. */
  middayBonusOpens: number;
  middayRarePlus: number;
  middayInkBuys: number;
  middayMoneyHit25: number;
  middayHotOrPack: number;
}

export interface BattlePassProgress {
  seasonId: string;
  xp: number;
  premium: boolean;
  claimedFree: number[];
  claimedPremium: number[];
  /** Overflow XP rewards claimed past level cap (each BP_OVERFLOW_XP). */
  overflowClaims: number;
}

export interface UserProgress {
  collectedCardIds: string[];
  lastDailyOpenAt: string | null;
  lastChestOpenAt: string | null;
  coins: number;
  rating: number;
  /** Spendable page currency (not Book.pages slots). */
  pages: number;
  /** Book ids that already awarded a completion page. */
  claimedFullBookIds: string[];
  ink: number;
  inkShopCardIds: string[];
  inkShopRolledAt: string | null;
  bonusCaseOpens: number;
  /** Kept for save compatibility; bonus cases have no open cooldown. */
  lastBonusCaseOpenAt: string | null;
  claimedQuestIds: string[];
  claimedAchievementIds: string[];
  /** Server bootstrap claim ids already applied locally (anti double-credit). */
  appliedClaimIds: string[];
  visitedLibraryAt: string | null;
  lifetimeDailyOpens: number;
  lifetimeChestOpens: number;
  lifetimeInkEarned: number;
  inkPurchases: number;
  lifetimePaidCases: number;
  referralCount: number;
  referredByUserId: string | null;
  referralBonusClaimed: boolean;
  /** Soft channel gate until bot membership check exists. */
  channelConfirmedAt: string | null;
  dailyStreak: number;
  dailyStreakLastDate: string | null;
  claimedStreakMilestones: number[];
  dayStats: DayStats;
  battlePass: BattlePassProgress;
}

export type DailyRewardKind =
  | 'money'
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'pages'
  | 'ink';

export type DailyReward =
  | { kind: 'money'; amount: number }
  | { kind: 'pages'; amount: number }
  | { kind: 'ink'; amount: number }
  | { kind: 'card'; card: Card };

export type Screen =
  | { name: 'home' }
  | { name: 'daily' }
  | { name: 'pass' }
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
  pages: '#e0b878',
  ink: '#6ec8f0',
};

export const STAND_TYPE_LABELS: Record<StandType, string> = {
  permanent: 'Постоянные',
  seasonal: 'Сезонные',
  collab: 'Коллаборации',
  event: 'События',
  collectible: 'Коллекционные',
};
