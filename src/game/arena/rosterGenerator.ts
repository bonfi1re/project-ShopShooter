import { TeamId, MapTheme, CharacterCustomization, CharacterClass, AccessoryType, WeaponSkin, CollectibleSkill } from '../../types';
import { SimPlayer, AmbientParticle, SimBoss } from '../../types/multiplayerTypes';
import { MAP_THEMES_CONFIG, INITIAL_SKILLS } from '../../config/mapThemesConfig';
import { getTeamPalette, normalizeTeamId, harmonizeCustomizationForTeam } from '../../config/teamConfig';

interface GenerateRosterOptions {
  gameModeType: 'multiplayer' | 'bot';
  totalPlayersConfig: number;
  playerTeam: TeamId;
  playerName: string;
  myPlayerId: string;
  characterCustomization: CharacterCustomization;
  roomPlayersList: any[];
  selectedMapTheme: MapTheme;
  getCharacterStats: (charClass?: CharacterClass) => { maxHp: number; speedMultiplier: number; damageMultiplier: number };
  isLocalPlayer: (id: string) => boolean;
}

export function generateMatchRoster({
  gameModeType,
  totalPlayersConfig,
  playerTeam,
  playerName,
  myPlayerId,
  characterCustomization,
  roomPlayersList,
  selectedMapTheme,
  getCharacterStats,
  isLocalPlayer,
}: GenerateRosterOptions): {
  players: SimPlayer[];
  skills: CollectibleSkill[];
  ambientParticles: AmbientParticle[];
  boss: SimBoss;
} {
  const WORLD_WIDTH = 2200;
  const WORLD_HEIGHT = 1300;
  const isMultiplayer = gameModeType === 'multiplayer';

  const botNames = [
    'Ghost_Sniper',
    'Valkyrie_Bot',
    'Titan_Mech',
    'Shadow_Reaper',
    'Nexus_Blaster',
    'Cyber_Knight',
    'Frost_Byte',
    'Apex_Hunter'
  ];

  const botClasses: CharacterClass[] = ['phantom', 'ninja', 'tanker', 'commando', 'mecha'];
  const botWeapons: WeaponSkin[] = ['dual_blaster', 'laser_cannon', 'plasma_rifle', 'pulse_shotgun'];
  const botAccessories: AccessoryType[] = ['horns', 'cyber_goggles', 'halo', 'none', 'crown'];

  const newPlayers: SimPlayer[] = [];

  // Human Player
  const normPlayerTeam = normalizeTeamId(playerTeam);
  const myPalette = getTeamPalette(normPlayerTeam);
  const mySpawnX = normPlayerTeam === 'blue'
    ? 220 + Math.random() * 60
    : (WORLD_WIDTH - 260) - Math.random() * 80;
  const mySpawnY = 560 + (Math.random() - 0.5) * 160;
  const mySpawnAngle = normPlayerTeam === 'blue' ? 0 : Math.PI;
  const myStats = getCharacterStats(characterCustomization.characterClass);

  newPlayers.push({
    id: myPlayerId,
    name: playerName || 'Player',
    team: normPlayerTeam,
    x: mySpawnX,
    y: mySpawnY,
    angle: mySpawnAngle,
    hp: myStats.maxHp,
    maxHp: myStats.maxHp,
    score: 0,
    kills: 0,
    deaths: 0,
    isBot: false,
    isShielded: true,
    shieldTimer: 3.0,
    isRespawning: false,
    respawnTimer: 0,
    color: myPalette.primary,
    customization: harmonizeCustomizationForTeam(characterCustomization, normPlayerTeam),
  });

  // 2. Configured participants from lobby (Single Source of Truth)
  // Both Multiplayer & Solo/VS AI use this list directly.
  // CRITICAL: No auto-fill loop! A bot that was deleted in the lobby stays deleted.
  const otherParticipants = (roomPlayersList || []).filter(p => !isLocalPlayer(p.id) && p.id !== myPlayerId);

  otherParticipants.forEach((rp, idx) => {
    // Prevent duplicate bots or duplicate IDs
    if (newPlayers.some(p => p.id === rp.id)) return;

    const team = normalizeTeamId(rp.team || (idx % 2 === 0 ? 'blue' : 'red'));
    const isBlue = team === 'blue';
    const spawnX = isBlue ? 220 + Math.random() * 80 : (WORLD_WIDTH - 260) - Math.random() * 80;
    const spawnY = 360 + (idx * 110);
    const spawnAngle = isBlue ? 0 : Math.PI;
    const bClass = rp.customization?.characterClass || botClasses[idx % botClasses.length];
    const bStats = getCharacterStats(bClass);

    newPlayers.push({
      id: rp.id || `bot-${team}-${idx}-${Date.now()}`,
      name: rp.name || rp.username || `Player_${idx + 1}`,
      team,
      x: spawnX,
      y: spawnY,
      angle: spawnAngle,
      hp: bStats.maxHp,
      maxHp: bStats.maxHp,
      score: 0,
      kills: 0,
      deaths: 0,
      isBot: rp.isBot ?? true,
      isShielded: true,
      shieldTimer: 3.0,
      isRespawning: false,
      respawnTimer: 0,
      color: isBlue ? '#38bdf8' : '#f43f5e',
      customization: rp.customization || {
        characterClass: bClass,
        primaryColor: isBlue ? '#0284c7' : '#e11d48',
        secondaryColor: isBlue ? '#0369a1' : '#be123c',
        visorColor: isBlue ? '#38bdf8' : '#fb7185',
        weaponSkin: botWeapons[idx % botWeapons.length],
        accessory: botAccessories[idx % botAccessories.length],
        trailEffect: isBlue ? 'sparks' : 'flames',
      },
    });
  });

  const ambientParticles: AmbientParticle[] = [];
  for (let p = 0; p < 45; p++) {
    ambientParticles.push({
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6 - 0.4,
      size: Math.random() * 3 + 1.5,
      color: MAP_THEMES_CONFIG[selectedMapTheme]?.particleColor || '#06b6d4',
      alpha: Math.random() * 0.7 + 0.3,
    });
  }

  const boss: SimBoss = {
    id: 'boss-deal-box',
    name: 'Mega Golden Deal Box',
    x: 1100,
    y: 640,
    vx: 1.2,
    vy: 0.9,
    hp: 300,
    maxHp: 300,
    size: 58,
  };

  return {
    players: newPlayers,
    skills: JSON.parse(JSON.stringify(INITIAL_SKILLS)),
    ambientParticles,
    boss,
  };
}
