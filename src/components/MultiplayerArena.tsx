import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useArenaGameLoop } from '../hooks/useArenaGameLoop';
import { useArenaRoomSync } from '../game/hooks/useArenaRoomSync';
import { useArenaInput } from '../game/hooks/useArenaInput';
import { 
  TeamId, 
  MapTheme, 
  InGameSkillType, 
  CollectibleSkill, 
  CharacterCustomization, 
  CharacterClass, 
  AccessoryType, 
  WeaponSkin 
} from '../types';
import { soundEngine } from '../utils/audio';
import { CharacterCustomizerModal } from './CharacterCustomizerModal';
import { PlayerProfileModal } from './profile/PlayerProfileModal';
import { MapSelectorModal } from './MapSelectorModal';
import { ArenaScoreHeader } from './arena/hud/ArenaScoreHeader';
import { ArenaKillFeedOverlay } from './arena/hud/ArenaKillFeedOverlay';
import { ArenaRespawnModal } from './arena/hud/ArenaRespawnModal';
import { ArenaDesktopControlsBar } from './arena/hud/ArenaDesktopControlsBar';
import { ArenaMobileControls } from './arena/controls/ArenaMobileControls';
import { ArenaLobbyView } from './arena/ArenaLobbyView';
import { ArenaMatchResultModal, ArenaMatchResultStats } from './arena/ArenaMatchResultModal';
import { LobbyLightParticles } from './arena/LobbyLightParticles';
import { incrementDailyQuestProgress } from '../utils/dailyChallenge';
import { useInputDevice } from '../utils/useInputDevice';
import { MAP_THEMES_CONFIG, INITIAL_SKILLS, AmbientParticle } from '../config/mapThemesConfig';
import { getStoredProfile, saveStoredProfile, subscribeToProfileUpdates } from '../services/profileStorage';
import { getTeamPalette, normalizeTeamId } from '../config/teamConfig';

interface MultiplayerArenaProps {
  currentUsername?: string;
  userDiscountPoints: number;
  onAddDiscountPoints: (points: number) => void;
  onNavigateToCart: () => void;
  onNavigateToLeaderboard: () => void;
  onTriggerSpecialNotification: (targetName: string, points: number) => void;
  themeMode?: 'dark' | 'light';
}

const WORLD_WIDTH = 2200;
const WORLD_HEIGHT = 1300;

export const MultiplayerArena: React.FC<MultiplayerArenaProps> = ({
  currentUsername,
  userDiscountPoints,
  onAddDiscountPoints,
  onNavigateToCart,
  onNavigateToLeaderboard,
  onTriggerSpecialNotification,
  themeMode = 'dark',
}) => {
  const isDark = themeMode === 'dark';
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastShotTime = useRef<number>(0);
  const matchAwardGivenRef = useRef<boolean>(false);
  const [matchResultStats, setMatchResultStats] = useState<ArenaMatchResultStats | null>(null);

  const [hudBlueScore, setHudBlueScore] = useState<number>(0);
  const [hudRedScore, setHudRedScore] = useState<number>(0);
  const [hudTimeLeft, setHudTimeLeft] = useState<number>(90);
  const [hudMyKills, setHudMyKills] = useState<number>(0);
  const [hudMyHp, setHudMyHp] = useState<number>(100);
  const [hudActiveSkill, setHudActiveSkill] = useState<{ type: InGameSkillType; label: string; timeLeft: number } | null>(null);
  const [hudKillFeed, setHudKillFeed] = useState<{ id: string; text: string; team: TeamId }[]>([]);
  const [hudRespawnTimer, setHudRespawnTimer] = useState<number>(0);

  const inputDevice = useInputDevice();
  const showVirtualControls = inputDevice.showVirtualControls;
  const [isSelectingPlayers, setIsSelectingPlayers] = useState<boolean>(false);
  const [showMapSelectorModal, setShowMapSelectorModal] = useState<boolean>(false);

  const simState = useRef<{
    players: any[];
    bullets: any[];
    boss: any | null;
    damageTexts: any[];
    skills: CollectibleSkill[];
    ambientParticles: AmbientParticle[];
    shoppingParticles: any[];
    blueScore: number;
    redScore: number;
    timeLeft: number;
    cameraX: number;
    cameraY: number;
    currentTheme: MapTheme;
  }>({
    players: [],
    bullets: [],
    boss: null,
    damageTexts: [],
    skills: JSON.parse(JSON.stringify(INITIAL_SKILLS)),
    ambientParticles: [],
    shoppingParticles: [],
    blueScore: 0,
    redScore: 0,
    timeLeft: 90,
    cameraX: 0,
    cameraY: 0,
    currentTheme: 'mall',
  });

  const getCharacterStats = useCallback((charClass?: CharacterClass) => {
    switch (charClass) {
      case 'tanker':
        return { maxHp: 200, speedMultiplier: 0.78, damageMultiplier: 0.8 };
      case 'commando':
        return { maxHp: 80, speedMultiplier: 1.0, damageMultiplier: 1.35 };
      case 'ninja':
        return { maxHp: 90, speedMultiplier: 1.3, damageMultiplier: 1.0 };
      case 'mecha':
        return { maxHp: 150, speedMultiplier: 0.85, damageMultiplier: 1.1 };
      case 'phantom':
      default:
        return { maxHp: 100, speedMultiplier: 1.1, damageMultiplier: 1.0 };
    }
  }, []);

  const myPlayerId = useRef<string>(
    (() => {
      try {
        const saved = sessionStorage.getItem('shop_shooter_unique_client_id');
        if (saved) return saved;
      } catch (e) {}
      const newId = 'player_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
      try {
        sessionStorage.setItem('shop_shooter_unique_client_id', newId);
      } catch (e) {}
      return newId;
    })()
  );

  const isLocalPlayer = useCallback((id: string) => {
    if (!id) return false;
    if (myPlayerId.current && id === myPlayerId.current) return true;
    if (id === 'local-p1') return true;
    return false;
  }, []);

  const addDamageText = useCallback((text: string, x: number, y: number, color: string) => {
    simState.current.damageTexts.push({
      id: `${Date.now()}-${Math.random()}`,
      text,
      x,
      y,
      color,
      alpha: 1,
    });
  }, []);

  const addKillFeed = useCallback((killer: string, victim: string, team: TeamId) => {
    const id = `${Date.now()}-${Math.random()}`;
    const text = `💥 ${killer} mengeliminasi ${victim} (+1 Skor)`;
    setHudKillFeed((prev) => [{ id, text, team }, ...prev.slice(0, 3)]);
    setTimeout(() => {
      setHudKillFeed((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const respawnSinglePlayer = useCallback((p: any) => {
    p.isRespawning = false;
    const stats = getCharacterStats(p.customization?.characterClass);
    p.maxHp = stats.maxHp;
    p.hp = stats.maxHp;
    p.isShielded = true;
    p.shieldTimer = 3.0;
    p.respawnTimer = 0;

    if (p.team === 'blue') {
      p.x = 220 + Math.random() * 80;
      p.y = 380 + Math.random() * 480;
      p.angle = 0;
    } else {
      p.x = (WORLD_WIDTH - 260) - Math.random() * 80;
      p.y = 380 + Math.random() * 480;
      p.angle = Math.PI;
    }

    if (isLocalPlayer(p.id)) {
      setHudRespawnTimer(0);
      setHudMyHp(p.maxHp);
      soundEngine.playPowerUp();
      addDamageText('🛡️ PERISAI KEBAL (3s)', p.x, p.y - 25, '#facc15');
    }
  }, [getCharacterStats, isLocalPlayer, addDamageText]);

  // Use Room Sync & Networking Hook
  const roomSync = useArenaRoomSync({
    myPlayerId,
    currentUsername,
    userDiscountPoints,
    onTriggerSpecialNotification,
    getCharacterStats,
    isLocalPlayer,
    simState,
    canvasRef,
    minimapCanvasRef,
    animFrameId,
    setHudBlueScore,
    setHudRedScore,
    setHudTimeLeft,
    setHudMyHp,
    setHudMyKills,
    setHudKillFeed,
    setHudActiveSkill,
    setHudRespawnTimer,
    matchAwardGivenRef,
    setMatchResultStats,
    onAddDiscountPoints,
  });

  const botLastShotTimes = useRef<Record<string, number>>({});

  const shootLaser = useCallback((playerId: string) => {
    const p = simState.current.players.find((item: any) => item.id === playerId || (isLocalPlayer(playerId) && isLocalPlayer(item.id)));
    if (!p || p.isRespawning) return;

    const isRapid = p.activeSkill?.type === 'rapidfire';
    const isTriple = p.activeSkill?.type === 'tripleshot';

    const minDelay = isRapid ? 80 : 170;
    const now = Date.now();

    if (isLocalPlayer(playerId)) {
      if (now - lastShotTime.current < minDelay) return;
      lastShotTime.current = now;
      if (isTriple) soundEngine.playMultiShot();
      else soundEngine.playShoot();
    } else {
      // Throttle bot shots to max 1 shot per 250ms per bot
      const lastBotShot = botLastShotTimes.current[playerId] || 0;
      if (now - lastBotShot < 250) return;
      botLastShotTimes.current[playerId] = now;
    }

    if (p.isShielded && (!p.activeSkill || p.activeSkill.type !== 'shield')) {
      p.isShielded = false;
      p.shieldTimer = 0;
    }

    const speed = 23;
    const pTeam = normalizeTeamId(p.team);
    const pPalette = getTeamPalette(pTeam);
    const laserColor = isTriple ? pPalette.tripleBullet : pPalette.bullet;

    const createBullet = (fireAngle: number) => ({
      id: `${p.id}-${now}-${Math.random()}`,
      shooterId: p.id,
      team: pTeam,
      x: p.x + Math.cos(fireAngle) * 30,
      y: p.y + Math.sin(fireAngle) * 30,
      vx: Math.cos(fireAngle) * speed,
      vy: Math.sin(fireAngle) * speed,
      damage: Math.floor(18 + Math.random() * 25),
      color: laserColor,
      life: 75,
    });

    const pushAndSendBullet = (bullet: any) => {
      // Safety cap: Prevent runaway bullet arrays in memory
      if (simState.current.bullets.length > 150) {
        simState.current.bullets.splice(0, simState.current.bullets.length - 120);
      }
      simState.current.bullets.push(bullet);
      if (roomSync.gameModeType === 'multiplayer' && isLocalPlayer(playerId) && roomSync.wsRef?.current?.readyState === WebSocket.OPEN) {
        roomSync.wsRef.current.send(JSON.stringify({
          type: 'player-shoot',
          bullet,
        }));
      }
    };

    if (isTriple) {
      pushAndSendBullet(createBullet(p.angle - 0.22));
      pushAndSendBullet(createBullet(p.angle));
      pushAndSendBullet(createBullet(p.angle + 0.22));
    } else {
      pushAndSendBullet(createBullet(p.angle));
    }
  }, [isLocalPlayer, roomSync.gameModeType, roomSync.wsRef]);

  // Use Input & Controls Hook
  const arenaInput = useArenaInput({
    matchStatus: roomSync.matchStatus,
    isFullscreen,
    setIsFullscreen,
    arenaContainerRef,
    canvasRef,
    simState,
    isLocalPlayer,
    shootLaser,
    myPlayerId: roomSync.myPlayerId,
    inputDevice,
    addDamageText,
  });

  // Game Loop Hook
  useArenaGameLoop({
    matchStatus: roomSync.matchStatus,
    simState,
    canvasRef,
    minimapCanvasRef,
    keysPressed: arenaInput.keysPressed,
    isMouseDown: arenaInput.isMouseDown,
    mobileMoveVector: arenaInput.mobileMoveVector,
    lastDashTime: arenaInput.lastDashTime,
    isLocalPlayer,
    getCharacterStats,
    finishMatch: () => {
      // triggered via roomSync/finishMatch or loop
    },
    shootLaser,
    respawnSinglePlayer,
    addDamageText,
    addKillFeed,
    setHudRespawnTimer,
    setHudTimeLeft,
    setHudBlueScore,
    setHudRedScore,
    setHudDashCooldown: arenaInput.setHudDashCooldown,
    setHudMyHp,
    setHudMyKills,
    setHudActiveSkill,
    wsRef: roomSync.wsRef,
    myPlayerId: roomSync.myPlayerId,
    isDark,
    gameModeType: roomSync.gameModeType,
  });

  // Profile and Character Customization State
  const [profileData, setProfileData] = useState(() => {
    const p = getStoredProfile(userDiscountPoints);
    if (currentUsername && currentUsername.trim()) {
      p.username = currentUsername.trim();
    }
    return p;
  });
  const [characterCustomization, setCharacterCustomization] = useState<CharacterCustomization>(() => {
    try {
      const saved = localStorage.getItem('db_char_customization');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      characterClass: 'phantom',
      primaryColor: '#06b6d4',
      secondaryColor: '#0284c7',
      visorColor: '#38bdf8',
      weaponSkin: 'dual_blaster',
      accessory: 'crown',
      trailEffect: 'sparks',
    };
  });
  const [showCustomizerModal, setShowCustomizerModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);

  const handlePlayerNameChange = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    roomSync.setPlayerName(trimmed);
    saveStoredProfile({ username: trimmed }, userDiscountPoints);

    const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (myP) myP.name = trimmed;
  };

  // Sync when currentUsername prop changes
  useEffect(() => {
    if (currentUsername && currentUsername.trim()) {
      const trimmed = currentUsername.trim();
      setProfileData((prev) => (prev.username !== trimmed ? { ...prev, username: trimmed } : prev));
      roomSync.setPlayerName(trimmed);
      const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
      if (myP && myP.name !== trimmed) {
        myP.name = trimmed;
      }
    }
  }, [currentUsername, isLocalPlayer]);

  // Subscribe to centralized profile updates
  useEffect(() => {
    const unsub = subscribeToProfileUpdates((updated) => {
      setProfileData((prev) => ({ ...prev, ...updated }));
      if (updated.username) {
        roomSync.setPlayerName(updated.username);
        const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
        if (myP && myP.name !== updated.username) {
          myP.name = updated.username;
        }
      }
      if (updated.statusMessage) {
        roomSync.setPlayerStatus(updated.statusMessage);
      }
    });
    return unsub;
  }, [isLocalPlayer]);

  const handleCustomizationChange = (newCustom: CharacterCustomization) => {
    setCharacterCustomization(newCustom);
    try {
      localStorage.setItem('db_char_customization', JSON.stringify(newCustom));
    } catch (e) {}

    const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (myP) myP.customization = newCustom;
  };

  const handleInstantRespawn = () => {
    const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (myP && myP.isRespawning) {
      respawnSinglePlayer(myP);
    }
  };

  return (
    <div
      ref={arenaContainerRef}
      className={`w-full flex flex-col transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-1 md:p-2 h-screen w-screen overflow-hidden'
          : 'max-w-6xl mx-auto space-y-3'
      }`}
    >
      {/* Top TDM Scoreboard Header */}
      <ArenaScoreHeader
        isDark={isDark}
        hudBlueScore={hudBlueScore}
        hudRedScore={hudRedScore}
        hudTimeLeft={hudTimeLeft}
        selectedMapTheme={roomSync.selectedMapTheme}
        hudActiveSkill={hudActiveSkill}
        hudMyHp={hudMyHp}
        hudMyKills={hudMyKills}
        setShowCustomizerModal={setShowCustomizerModal}
        isFullscreen={isFullscreen}
        toggleFullscreen={arenaInput.toggleFullscreen}
        inLobby={roomSync.inLobby}
        handleLeaveMatch={roomSync.handleLeaveMatch}
      />

      {/* Main Game Battlefield Container with Canvas */}
      <div
        className={`relative w-full ${
          isFullscreen ? 'flex-1 h-0 min-h-0' : roomSync.inLobby ? 'min-h-[500px] border-none shadow-none bg-transparent' : 'h-[500px] md:h-[640px]'
        } ${roomSync.inLobby ? '' : isDark ? 'bg-[#060a12] border-slate-800' : 'bg-slate-100 border-slate-300'} rounded-xl md:rounded-2xl overflow-hidden ${roomSync.inLobby ? '' : 'border-2 shadow-2xl'} select-none touch-none`}
      >
        <canvas
          ref={canvasRef}
          onMouseMove={arenaInput.handleCanvasMouseMove}
          onMouseDown={arenaInput.handleCanvasMouseDown}
          onMouseUp={arenaInput.handleCanvasMouseUp}
          onTouchStart={arenaInput.handleCanvasTouchStart}
          onTouchMove={arenaInput.handleCanvasTouchMove}
          className={roomSync.inLobby ? 'hidden' : 'w-full h-full block cursor-crosshair touch-none'}
        />

        {!roomSync.inLobby && (
          <>
            <div className="absolute top-3 left-3 z-30 w-44 h-28 sm:w-52 sm:h-32 md:w-60 md:h-36 bg-slate-950/90 backdrop-blur-md rounded-xl border border-cyan-500/40 p-1.5 pointer-events-none shadow-[0_0_20px_rgba(0,0,0,0.7)] flex flex-col">
              <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800/80 mb-1">
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-cyan-400 flex items-center gap-1 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  📡 RADAR ARENA
                </span>
                <span className="text-[7.5px] sm:text-[8px] text-slate-400 font-mono">
                  Posisi &amp; Nama Player
                </span>
              </div>
              <div className="relative flex-1 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800">
                <canvas
                  ref={minimapCanvasRef}
                  width={240}
                  height={140}
                  className="w-full h-full block"
                />
              </div>
            </div>

            <ArenaKillFeedOverlay killFeed={hudKillFeed} />

            <ArenaRespawnModal
              respawnTimer={hudRespawnTimer}
              onInstantRespawn={handleInstantRespawn}
            />

            <ArenaDesktopControlsBar
              isDark={isDark}
              showVirtualControls={showVirtualControls}
              matchStatus={roomSync.matchStatus}
              respawnTimer={hudRespawnTimer}
            />

            <ArenaMobileControls
              showVirtualControls={showVirtualControls}
              matchStatus={roomSync.matchStatus}
              respawnTimer={hudRespawnTimer}
              dashCooldown={arenaInput.hudDashCooldown}
              onTriggerDash={arenaInput.triggerDash}
              onJoyTouchStart={arenaInput.handleJoyTouchStart}
              onJoyTouchMove={arenaInput.handleJoyTouchMove}
              onJoyTouchEnd={arenaInput.handleJoyTouchEnd}
              joyKnobPos={arenaInput.joyKnobPos}
              onAimTouchStart={arenaInput.handleAimTouchStart}
              onAimTouchMove={arenaInput.handleAimTouchMove}
              onAimTouchEnd={arenaInput.handleAimTouchEnd}
              onFireStart={() => {
                arenaInput.isMouseDown.current = true;
                shootLaser(roomSync.myPlayerId.current);
              }}
              onFireEnd={() => {
                arenaInput.isMouseDown.current = false;
              }}
            />
          </>
        )}

        {roomSync.inLobby && (
          <div 
            className={`w-full flex flex-col items-center justify-center p-1 sm:p-2 transition-all duration-300 relative overflow-hidden ${isDark ? 'text-white' : 'text-slate-900'}`} 
            style={{
              backgroundImage: `
                linear-gradient(135deg, ${
                  isDark 
                    ? 'rgba(15, 23, 42, 0.82) 0%, rgba(2, 6, 23, 0.88) 100%' 
                    : 'rgba(248, 250, 252, 0.78) 0%, rgba(241, 245, 249, 0.84) 100%'
                }),
                url('${
                  roomSync.selectedMapTheme === 'mall' 
                    ? '/src/assets/images/mall_lobby_bg_1792721153783.jpg' 
                    : roomSync.selectedMapTheme === 'rooftop' 
                    ? '/src/assets/images/rooftop_lobby_bg_1792721153944.jpg' 
                    : roomSync.selectedMapTheme === 'warehouse' || roomSync.selectedMapTheme === 'cavern'
                    ? '/src/assets/images/warehouse_lobby_bg_1792721153666.jpg' 
                    : roomSync.selectedMapTheme === 'lab'
                    ? '/src/assets/images/rooftop_lobby_bg_1792721153944.jpg'
                    : '/src/assets/images/garden_lobby_bg_1792721154333.jpg'
                }')
              `
            }}
          >
            <LobbyLightParticles isDark={isDark} />
            <ArenaLobbyView
              isDark={isDark}
              gameModeType={roomSync.gameModeType}
              setGameModeType={roomSync.setGameModeType}
              playerName={roomSync.playerName}
              handlePlayerNameChange={handlePlayerNameChange}
              characterCustomization={characterCustomization}
              setShowCustomizerModal={setShowCustomizerModal}
              playerTeam={roomSync.playerTeam}
              handleSelectTeam={(t) => roomSync.handleSelectTeam(t, characterCustomization)}
              totalPlayersConfig={roomSync.totalPlayersConfig}
              setTotalPlayersConfig={roomSync.setTotalPlayersConfig}
              isSelectingPlayers={isSelectingPlayers}
              setIsSelectingPlayers={setIsSelectingPlayers}
              handleUpdateTotalSlots={roomSync.handleUpdateTotalSlots}
              currentRoomCode={roomSync.currentRoomCode}
              roomCodeInput={roomSync.roomCodeInput}
              setRoomCodeInput={roomSync.setRoomCodeInput}
              handleCopyRoomCode={() => {
                navigator.clipboard.writeText(roomSync.currentRoomCode);
              }}
              handleJoinMultiplayerRoom={(code, host) => roomSync.handleJoinMultiplayerRoom(code, host, characterCustomization)}
              onOpenProfile={() => setShowProfileModal(true)}
              isJoinedRoom={roomSync.isJoinedRoom}
              joinedAsHost={roomSync.joinedAsHost}
              isEffectiveHost={roomSync.isEffectiveHost}
              roomPlayersList={roomSync.roomPlayersList}
              handleLeaveRoom={roomSync.handleLeaveMatch}
              handleUpdateBotTeam={roomSync.handleUpdateBotTeam}
              handleKickPlayer={roomSync.handleKickPlayer}
              startMatch={(mode) => roomSync.startMatch(mode, characterCustomization)}
              handleAddBot={roomSync.handleAddBot}
              handleDeleteRoom={roomSync.handleLeaveMatch}
              selectedMapTheme={roomSync.selectedMapTheme}
              handleSelectMapTheme={roomSync.handleSelectMapTheme}
              setShowMapSelectorModal={setShowMapSelectorModal}
              isLocalPlayer={isLocalPlayer}
            />
          </div>
        )}
      </div>

      {roomSync.matchStatus === 'ended' && (
        <ArenaMatchResultModal
          stats={
            matchResultStats || {
              outcome:
                hudBlueScore === hudRedScore
                  ? 'draw'
                  : (hudBlueScore > hudRedScore && roomSync.playerTeam === 'blue') ||
                    (hudRedScore > hudBlueScore && roomSync.playerTeam === 'red')
                  ? 'victory'
                  : 'defeat',
              blueScore: hudBlueScore,
              redScore: hudRedScore,
              playerKills: hudMyKills,
              playerTeam: roomSync.playerTeam,
              pointsAwarded:
                (hudBlueScore === hudRedScore
                  ? 250
                  : (hudBlueScore > hudRedScore && roomSync.playerTeam === 'blue') ||
                    (hudRedScore > hudBlueScore && roomSync.playerTeam === 'red')
                  ? 500
                  : 150) +
                hudMyKills * 30,
            }
          }
          isDark={isDark}
          gameModeType={roomSync.gameModeType}
          onPlayAgain={
            roomSync.gameModeType === 'bot'
              ? async () => {
                  await roomSync.handleLeaveMatch();
                  setTimeout(() => {
                    roomSync.startMatch('bot', characterCustomization);
                  }, 80);
                }
              : undefined
          }
          onReturnToLobby={roomSync.handleLeaveMatch}
          onNavigateToRedemption={onNavigateToCart}
          onNavigateToLeaderboard={onNavigateToLeaderboard}
        />
      )}

      {showCustomizerModal && (
        <CharacterCustomizerModal
          customization={characterCustomization}
          onChange={handleCustomizationChange}
          onClose={() => setShowCustomizerModal(false)}
        />
      )}

      <MapSelectorModal
        isOpen={showMapSelectorModal}
        selectedMap={roomSync.selectedMapTheme}
        onSelectMap={roomSync.handleSelectMapTheme}
        onClose={() => setShowMapSelectorModal(false)}
        themeMode={themeMode}
      />

      {showProfileModal && (
        <PlayerProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          isDark={isDark}
          isSelf={true}
          profile={{
            id: roomSync.myPlayerId.current,
            username: currentUsername || roomSync.playerName || profileData.username || 'Tester',
            avatarClass: characterCustomization.characterClass,
            primaryColor: characterCustomization.primaryColor,
            weaponSkin: characterCustomization.weaponSkin,
            totalMatches: profileData.totalMatches,
            wins: profileData.wins,
            losses: profileData.losses,
            kills: hudMyKills || profileData.kills,
            points: userDiscountPoints,
            isOnline: true,
            statusMessage: profileData.statusMessage || 'Siap bertempur di Arena TDM!',
            createdAt: profileData.createdAt,
          }}
          onUpdateProfile={(updated) => {
            saveStoredProfile(updated, userDiscountPoints);
            if (updated.username) {
              handlePlayerNameChange(updated.username);
            }
          }}
        />
      )}
    </div>
  );
};
