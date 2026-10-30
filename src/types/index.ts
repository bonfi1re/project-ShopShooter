export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  image: string;
  rating: number;
  reviewCount: number;
  description: string;
  shooterBonusPoints: number;
  inStock: boolean;
  specs: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type TargetType = 'regular' | 'speedy' | 'special_gold' | 'bomb' | 'powerup_orb';

export interface ShooterTarget {
  id: string;
  type: TargetType;
  name: string;
  points: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  icon?: string;
  color: string;
  createdAt: number;
  duration: number;
  hp: number;
  maxHp: number;
  wobbleFreq: number;
  wobbleAmp: number;
  wobbleOffset: number;
  powerUpReward?: PowerUpType;
}

export type PowerUpType = 'freeze' | 'multishot' | 'magnet' | 'double_points' | 'shield';

export interface PowerUpItem {
  id: PowerUpType;
  name: string;
  description: string;
  icon: string;
  durationSeconds: number;
  costPoints: number;
  count: number;
  color: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  date: string;
  badge: string;
  isCurrentUser?: boolean;
  rewardTier: string;
  playerId?: string;
}

export interface FloatingNotification {
  id: string;
  type: 'special_target' | 'combo' | 'powerup' | 'bomb' | 'info';
  title: string;
  message: string;
  durationMs: number;
}

export interface FloatingHitText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  isCrit?: boolean;
}

export interface OrderConfirmation {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  shooterDiscountRupiah: number;
  pointsUsed: number;
  shippingFee: number;
  total: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    paymentMethod: string;
  };
  createdAt: string;
}

// Multiplayer Arena Types (inspired by Screenshots 1 & 2)
export type TeamId = 'blue' | 'red';
export type MapTheme = 'mall' | 'rooftop' | 'warehouse' | 'garden' | 'cavern' | 'lab' | 'forest';
export type InGameSkillType = 'tripleshot' | 'rapidfire' | 'shield' | 'speed' | 'heal';

export interface CollectibleSkill {
  id: string;
  type: InGameSkillType;
  x: number;
  y: number;
  label: string;
  icon: string;
  color: string;
  duration: number;
  isAvailable: boolean;
  respawnCooldown: number;
}

export type CharacterClass = 'ninja' | 'tanker' | 'commando' | 'phantom' | 'mecha';
export type AccessoryType = 'none' | 'crown' | 'halo' | 'horns' | 'cyber_goggles';
export type WeaponSkin = 'laser_cannon' | 'dual_blaster' | 'plasma_rifle' | 'pulse_shotgun';

export interface CharacterCustomization {
  characterClass: CharacterClass;
  primaryColor: string;
  secondaryColor: string;
  visorColor: string;
  weaponSkin: WeaponSkin;
  accessory: AccessoryType;
  trailEffect: 'none' | 'sparks' | 'flames' | 'matrix';
}

export interface ArenaPlayer {
  id: string;
  username: string;
  team: TeamId;
  color: string;
  x: number;
  y: number;
  angle: number;
  score: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  isReady: boolean;
  isHost: boolean;
  isBot?: boolean;
  isRespawning?: boolean;
  respawnTimeLeft?: number;
  isShielded?: boolean;
  customization?: CharacterCustomization;
  activeSkill?: {
    type: InGameSkillType;
    timeLeft: number;
  };
}

export interface ArenaBullet {
  id: string;
  shooterId: string;
  shooterTeam: TeamId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  damage: number;
  createdAt: number;
}

export interface ArenaBotEnemy {
  id: string;
  name: string;
  type: 'drone' | 'armored' | 'gold_boss' | 'bomb';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  points: number;
  size: number;
  color: string;
  behaviorTimer: number;
  dialogue?: string;
}

export interface TDMMatchState {
  code: string;
  totalPlayers: 2 | 4 | 6 | 8;
  targetKills: number;
  blueScore: number;
  redScore: number;
  timeLeft: number;
  status: 'lobby' | 'playing' | 'ended';
  winnerTeam?: TeamId | 'draw';
}

