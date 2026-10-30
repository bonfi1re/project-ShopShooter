import { useState, useRef, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, deleteField } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';
import { TeamId, MapTheme, CharacterCustomization } from '../../types';
import { soundEngine } from '../../utils/audio';
import { getTeamPalette, normalizeTeamId, harmonizeCustomizationForTeam } from '../../config/teamConfig';
import { generateMatchRoster } from '../arena/rosterGenerator';
import { getStoredProfile, subscribeToProfileUpdates } from '../../services/profileStorage';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

interface UseArenaRoomSyncProps {
  myPlayerId?: React.MutableRefObject<string>;
  currentUsername?: string;
  userDiscountPoints: number;
  onTriggerSpecialNotification: (targetName: string, points: number) => void;
  getCharacterStats: any;
  isLocalPlayer: (id: string) => boolean;
  simState: React.MutableRefObject<any>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  minimapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  animFrameId: React.MutableRefObject<number | null>;
  setHudBlueScore: (val: number) => void;
  setHudRedScore: (val: number) => void;
  setHudTimeLeft: (val: number) => void;
  setHudMyHp: (val: number) => void;
  setHudMyKills: (val: number) => void;
  setHudKillFeed: (val: any[]) => void;
  setHudActiveSkill: (val: any) => void;
  setHudRespawnTimer: (val: number) => void;
  matchAwardGivenRef: React.MutableRefObject<boolean>;
  setMatchResultStats: (val: any) => void;
  onAddDiscountPoints: (pts: number) => void;
}

export function useArenaRoomSync({
  myPlayerId: propMyPlayerId,
  currentUsername: propCurrentUsername,
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
}: UseArenaRoomSyncProps) {
  const generateRandomRoomCode = () => {
    const prefixes = ['MALL', 'TDM', 'CYBER', 'SHOP', 'ARENA', 'NEON', 'VIP', 'PRO'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${randNum}`;
  };

  const [inLobby, setInLobby] = useState<boolean>(true);
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [currentRoomCode, setCurrentRoomCode] = useState<string>(generateRandomRoomCode);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const firestoreUnsubRef = useRef<(() => void) | null>(null);
  const matchStartedRef = useRef<boolean>(false);

  const localFallbackPlayerId = useRef<string>(
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
  const myPlayerId = propMyPlayerId || localFallbackPlayerId;

  const [isJoinedRoom, setIsJoinedRoom] = useState<boolean>(false);
  const [roomPlayersList, setRoomPlayersList] = useState<any[]>([]);
  const [roomHostId, setRoomHostId] = useState<string | null>(null);
  const [joinedAsHost, setJoinedAsHost] = useState<boolean>(false);

  const isEffectiveHost = Boolean(
    isJoinedRoom && joinedAsHost && (roomHostId === null || roomHostId === myPlayerId.current)
  );

  const [totalPlayersConfig, setTotalPlayersConfig] = useState<number>(4);
  const [playerTeam, setPlayerTeam] = useState<TeamId>('blue');
  const [selectedMapTheme, setSelectedMapTheme] = useState<MapTheme>('mall');
  const [gameModeType, setGameModeType] = useState<'multiplayer' | 'bot'>('multiplayer');
  const [matchStatus, setMatchStatus] = useState<'lobby' | 'playing' | 'ended'>('lobby');
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Synchronized player nickname and status from profile storage as single source of truth
  const [playerName, setPlayerName] = useState<string>(() => {
    return (propCurrentUsername || getStoredProfile().username || 'Tester').trim();
  });
  const [playerStatus, setPlayerStatus] = useState<string>(() => {
    return (getStoredProfile().statusMessage || 'Siap bertempur di Arena TDM!').trim();
  });

  // Keep in sync with propCurrentUsername
  useEffect(() => {
    if (propCurrentUsername && propCurrentUsername.trim()) {
      const trimmed = propCurrentUsername.trim();
      setPlayerName((prev) => (prev !== trimmed ? trimmed : prev));
      const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
      if (myP && myP.name !== trimmed) {
        myP.name = trimmed;
      }
    }
  }, [propCurrentUsername, isLocalPlayer, simState]);

  // Subscribe directly to profile updates across the whole application
  useEffect(() => {
    const unsub = subscribeToProfileUpdates((profile) => {
      if (profile.username && profile.username.trim()) {
        const trimmed = profile.username.trim();
        setPlayerName((prev) => (prev !== trimmed ? trimmed : prev));
        const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
        if (myP && myP.name !== trimmed) {
          myP.name = trimmed;
        }
      }
      if (profile.statusMessage) {
        setPlayerStatus(profile.statusMessage.trim());
      }
    });
    return unsub;
  }, [isLocalPlayer, simState]);

  // Authenticate anonymously
  useEffect(() => {
    signInAnonymously(auth).catch((err) => {
      console.warn("Firebase Auth fallback to local UID:", err);
    });

    return () => {
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }
    };
  }, []);

  const finishMatch = useCallback(() => {
    matchStartedRef.current = false;
    setMatchStatus('ended');

    const finalBlue = simState.current.blueScore;
    const finalRed = simState.current.redScore;
    const myPlayer = simState.current.players.find((p: any) => isLocalPlayer(p.id)) || simState.current.players.find((p: any) => !p.isBot);
    const myTeam = myPlayer?.team || playerTeam;

    let outcome: 'victory' | 'defeat' | 'draw' = 'draw';
    if (finalBlue === finalRed) {
      outcome = 'draw';
    } else if (finalBlue > finalRed) {
      outcome = myTeam === 'blue' ? 'victory' : 'defeat';
    } else {
      outcome = myTeam === 'red' ? 'victory' : 'defeat';
    }

    const isWinner = outcome === 'victory';
    const isDraw = outcome === 'draw';
    const baseReward = isWinner ? 500 : isDraw ? 250 : 150;
    const kills = myPlayer?.kills || 0;
    const killBonus = kills * 30;
    const totalAward = baseReward + killBonus;

    setMatchResultStats({
      outcome,
      blueScore: finalBlue,
      redScore: finalRed,
      playerKills: kills,
      playerTeam: myTeam,
      pointsAwarded: totalAward,
    });

    if (!matchAwardGivenRef.current) {
      matchAwardGivenRef.current = true;
      onAddDiscountPoints(totalAward);
    }

    if (isWinner) {
      soundEngine.playCheckoutSuccess();
    }
  }, [isLocalPlayer, playerTeam, onAddDiscountPoints, simState, matchAwardGivenRef, setMatchResultStats]);

  const initRoster = useCallback((forcedMode?: 'bot' | 'multiplayer', customTotalSlots?: number, characterCustomization?: CharacterCustomization) => {
    const effectiveMode = forcedMode || gameModeType;
    const effectiveSlots = customTotalSlots || totalPlayersConfig;

    const roster = generateMatchRoster({
      gameModeType: effectiveMode,
      totalPlayersConfig: effectiveSlots,
      playerTeam,
      playerName,
      myPlayerId: myPlayerId.current,
      characterCustomization: characterCustomization || {
        characterClass: 'phantom',
        primaryColor: '#06b6d4',
        secondaryColor: '#0284c7',
        visorColor: '#38bdf8',
        weaponSkin: 'dual_blaster',
        accessory: 'crown',
        trailEffect: 'sparks',
      },
      roomPlayersList,
      selectedMapTheme,
      getCharacterStats,
      isLocalPlayer,
    });

    simState.current.players = roster.players;
    simState.current.bullets = [];
    simState.current.damageTexts = [];
    simState.current.skills = roster.skills;
    simState.current.ambientParticles = roster.ambientParticles;
    simState.current.blueScore = 0;
    simState.current.redScore = 0;
    simState.current.timeLeft = 90;
    simState.current.currentTheme = selectedMapTheme;
    simState.current.boss = roster.boss;
  }, [totalPlayersConfig, playerTeam, selectedMapTheme, gameModeType, roomPlayersList, playerName, isLocalPlayer, getCharacterStats, simState]);

  const startMatch = useCallback(async (forcedMode?: 'bot' | 'multiplayer', characterCustomization?: CharacterCustomization) => {
    const effectiveMode = forcedMode || gameModeType;
    if (forcedMode && forcedMode !== gameModeType) {
      setGameModeType(forcedMode);
    }

    matchStartedRef.current = true;
    simState.current.currentTheme = selectedMapTheme;

    setHudBlueScore(0);
    setHudRedScore(0);
    setHudTimeLeft(90);
    setHudMyHp(100);
    setHudMyKills(0);
    setHudKillFeed([]);
    setHudActiveSkill(null);
    setHudRespawnTimer(0);
    matchAwardGivenRef.current = false;
    setMatchResultStats(null);

    initRoster(effectiveMode, undefined, characterCustomization);
    setInLobby(false);
    setMatchStatus('playing');
    soundEngine.playPowerUp();
    onTriggerSpecialNotification('Mega Golden Deal Box', 300);

    if (effectiveMode === 'multiplayer') {
      if (currentRoomCode) {
        try {
          const roomRef = doc(db, 'rooms', currentRoomCode);
          await updateDoc(roomRef, {
            gameState: 'playing',
            mapTheme: selectedMapTheme,
            blueScore: 0,
            redScore: 0,
            timeLeft: 90,
            updatedAt: Date.now(),
          });
        } catch (e) {}
      }
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          type: 'start-match', 
          mapTheme: selectedMapTheme,
          players: simState.current.players,
        }));
      }
    }
  }, [gameModeType, selectedMapTheme, initRoster, currentRoomCode, onTriggerSpecialNotification, simState, matchAwardGivenRef, setHudBlueScore, setHudRedScore, setHudTimeLeft, setHudMyHp, setHudMyKills, setHudKillFeed, setHudActiveSkill, setHudRespawnTimer, setMatchResultStats]);

  const handleLeaveMatch = async () => {
    soundEngine.playPowerUp();

    if (currentRoomCode && isJoinedRoom) {
      try {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        if (joinedAsHost) {
          await deleteDoc(roomRef);
        } else {
          await updateDoc(roomRef, {
            [`players.${myPlayerId.current}`]: deleteField(),
            updatedAt: Date.now(),
          });
        }
      } catch (e) {}
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          if (joinedAsHost) {
            wsRef.current.send(JSON.stringify({ type: 'delete-room' }));
          } else {
            wsRef.current.send(JSON.stringify({ type: 'leave-room' }));
          }
        }
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    if (firestoreUnsubRef.current) {
      firestoreUnsubRef.current();
      firestoreUnsubRef.current = null;
    }

    matchStartedRef.current = false;
    simState.current.players = [];
    simState.current.bullets = [];
    simState.current.damageTexts = [];
    simState.current.blueScore = 0;
    simState.current.redScore = 0;
    simState.current.timeLeft = 90;
    simState.current.boss = null;
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }

    setHudBlueScore(0);
    setHudRedScore(0);
    setHudTimeLeft(90);
    setHudMyHp(100);
    setHudMyKills(0);
    setHudKillFeed([]);
    setHudActiveSkill(null);
    setHudRespawnTimer(0);

    setIsJoinedRoom(false);
    setJoinedAsHost(false);
    setRoomHostId(null);
    setRoomPlayersList([]);
    setRoomCodeInput('');
    setCurrentRoomCode(generateRandomRoomCode());

    setMatchStatus('lobby');
    setInLobby(true);
  };

  const handleAddBot = async () => {
    soundEngine.playPowerUp();
    const botNames = ['Cyber_Sniper', 'Valkyrie_Bot', 'Titan_Mech', 'Shadow_Reaper', 'Nexus_Bot', 'Apex_Bot'];
    const botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const currentCount = roomPlayersList.length;
    if (currentCount >= totalPlayersConfig) return;

    const blueCount = roomPlayersList.filter(p => p.team === 'blue').length;
    const redCount = roomPlayersList.filter(p => p.team === 'red').length;
    const team = blueCount <= redCount ? 'blue' : 'red';

    const WORLD_WIDTH = 2200;
    const botSpawnX = team === 'blue' ? 220 + Math.random() * 80 : (WORLD_WIDTH - 260) - Math.random() * 80;
    const botAngle = team === 'blue' ? 0 : Math.PI;

    const botDisplayName = `${botNames[currentCount % botNames.length]} (BOT)`;
    const newBot = {
      id: botId,
      name: botDisplayName,
      username: botDisplayName,
      team,
      color: team === 'blue' ? '#38bdf8' : '#f43f5e',
      isReady: true,
      isBot: true,
      hp: 100,
      maxHp: 100,
      score: 0,
      kills: 0,
      deaths: 0,
      x: botSpawnX,
      y: 380 + (currentCount * 65),
      angle: botAngle,
    };

    setRoomPlayersList(prev => {
      if (prev.length >= totalPlayersConfig || prev.some(p => p.id === botId)) return prev;
      return [...prev, newBot];
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'add-bot', bot: newBot }));
    }

    if (currentRoomCode) {
      try {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        await updateDoc(roomRef, {
          [`players.${botId}`]: newBot,
          updatedAt: Date.now(),
        });
      } catch (e) {}
    }
  };

  const handleKickPlayer = async (targetId: string) => {
    soundEngine.playPowerUp();
    setRoomPlayersList(prev => prev.filter(p => p.id !== targetId));

    if (currentRoomCode) {
      try {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        await updateDoc(roomRef, {
          [`players.${targetId}`]: deleteField(),
          updatedAt: Date.now(),
        });
      } catch (e) {}
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kick-player', targetId }));
    }
  };

  const handleUpdateBotTeam = async (botId: string, newTeam: 'blue' | 'red') => {
    if (!currentRoomCode) return;
    soundEngine.playPowerUp();

    const WORLD_WIDTH = 2200;
    const newX = newTeam === 'blue' ? 220 + Math.random() * 80 : (WORLD_WIDTH - 260) - Math.random() * 80;
    const newAngle = newTeam === 'blue' ? 0 : Math.PI;

    setRoomPlayersList(prev => prev.map(p => p.id === botId ? { ...p, team: newTeam, color: newTeam === 'blue' ? '#38bdf8' : '#f43f5e', x: newX, angle: newAngle } : p));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'update-bot-team', botId, team: newTeam }));
    }

    try {
      const roomRef = doc(db, 'rooms', currentRoomCode);
      await updateDoc(roomRef, {
        [`players.${botId}.team`]: newTeam,
        [`players.${botId}.color`]: newTeam === 'blue' ? '#38bdf8' : '#f43f5e',
        [`players.${botId}.x`]: newX,
        [`players.${botId}.angle`]: newAngle,
        updatedAt: Date.now(),
      });
    } catch (e) {}
  };

  const handleSelectTeam = async (newTeam: TeamId, characterCustomization?: CharacterCustomization) => {
    const normTeam = normalizeTeamId(newTeam);
    setPlayerTeam(normTeam);
    soundEngine.playPowerUp();

    const tPalette = getTeamPalette(normTeam);
    const WORLD_WIDTH = 2200;
    const newSpawnX = normTeam === 'blue' ? 220 + Math.random() * 60 : (WORLD_WIDTH - 260) - Math.random() * 80;
    const newSpawnAngle = normTeam === 'blue' ? 0 : Math.PI;

    const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (myP) {
      myP.team = normTeam;
      myP.color = tPalette.primary;
      myP.x = newSpawnX;
      myP.y = 440 + Math.random() * 200;
      myP.angle = newSpawnAngle;
      if (myP.customization) {
        myP.customization = harmonizeCustomizationForTeam(myP.customization, normTeam);
      }
    }

    setRoomPlayersList(prev => prev.map(p => isLocalPlayer(p.id) ? {
      ...p,
      team: normTeam,
      color: tPalette.primary,
      x: newSpawnX,
      angle: newSpawnAngle,
      customization: p.customization ? harmonizeCustomizationForTeam(p.customization, normTeam) : undefined,
    } : p));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentRoomCode) {
      wsRef.current.send(JSON.stringify({
        type: 'change-team',
        team: normTeam,
        playerId: myPlayerId.current,
        roomCode: currentRoomCode,
      }));
    }

    if (isJoinedRoom && currentRoomCode) {
      try {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        const uid = myPlayerId.current;
        await updateDoc(roomRef, {
          [`players.${uid}.team`]: normTeam,
          [`players.${uid}.color`]: tPalette.primary,
          [`players.${uid}.x`]: newSpawnX,
          [`players.${uid}.y`]: 440 + Math.random() * 200,
          [`players.${uid}.angle`]: newSpawnAngle,
        });
      } catch (e) {}
    }
  };

  const handleUpdateTotalSlots = async (newSlots: number) => {
    soundEngine.playPowerUp();
    setTotalPlayersConfig(newSlots);

    if (currentRoomCode && isEffectiveHost) {
      try {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        await updateDoc(roomRef, { totalSlots: newSlots, updatedAt: Date.now() });
      } catch (e) {}

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'update-slots', totalSlots: newSlots }));
      }
    }
  };

  const handleSelectMapTheme = async (newTheme: MapTheme) => {
    setSelectedMapTheme(newTheme);
    simState.current.currentTheme = newTheme;
    soundEngine.playPowerUp();

    if (currentRoomCode && isEffectiveHost) {
      try {
        const roomRef = doc(db, 'rooms', currentRoomCode);
        await updateDoc(roomRef, { mapTheme: newTheme, updatedAt: Date.now() });
      } catch (e) {}

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'change-map', mapTheme: newTheme }));
      }
    }
  };

  const handleJoinMultiplayerRoom = async (targetCode?: string, asHost: boolean = false, characterCustomization?: CharacterCustomization) => {
    soundEngine.playPowerUp();
    const codeToUse = (targetCode || roomCodeInput.trim() || currentRoomCode).toUpperCase();
    if (!codeToUse) return;

    const myId = myPlayerId.current;
    setCurrentRoomCode(codeToUse);
    setJoinedAsHost(asHost);

    const safeName = playerName.trim() || 'Pemain';

    if (gameModeType === 'multiplayer') {
      simState.current.players = [];
    }
    let myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (!myP) {
      initRoster('multiplayer', undefined, characterCustomization);
      myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    }
    const WORLD_WIDTH = 2200;
    const initialSpawnX = playerTeam === 'blue' ? 220 + Math.random() * 60 : (WORLD_WIDTH - 260) - Math.random() * 80;
    const initialSpawnAngle = playerTeam === 'blue' ? 0 : Math.PI;

    if (myP) {
      myP.id = myId;
      myP.name = safeName;
      myP.team = playerTeam;
      myP.color = playerTeam === 'blue' ? '#38bdf8' : '#f43f5e';
      myP.x = initialSpawnX;
      myP.y = 440 + Math.random() * 200;
      myP.angle = initialSpawnAngle;
    }

    const myPlayerData = {
      id: myId,
      name: safeName,
      username: safeName,
      team: playerTeam,
      color: playerTeam === 'blue' ? '#38bdf8' : '#f43f5e',
      score: 0,
      kills: 0,
      deaths: 0,
      hp: 100,
      maxHp: 100,
      x: initialSpawnX,
      y: 440 + Math.random() * 200,
      angle: initialSpawnAngle,
      isReady: true,
      isBot: false,
      customization: characterCustomization,
    };

    setMatchStatus('lobby');
    setInLobby(true);
    setIsJoinedRoom(true);
    setRoomPlayersList([myPlayerData]);

    try {
      const roomRef = doc(db, 'rooms', codeToUse);
      if (firestoreUnsubRef.current) {
        firestoreUnsubRef.current();
        firestoreUnsubRef.current = null;
      }

      const snap = await getDoc(roomRef);
      if (!snap.exists()) {
        if (!asHost) {
          alert(`Room "${codeToUse}" belum aktif. Pastikan Host telah membuka room.`);
          setIsJoinedRoom(false);
          setJoinedAsHost(false);
          setRoomPlayersList([]);
          return;
        }
        setJoinedAsHost(true);
        setRoomHostId(myId);
        await setDoc(roomRef, {
          code: codeToUse,
          gameState: 'waiting',
          totalSlots: totalPlayersConfig,
          mapTheme: selectedMapTheme,
          blueScore: 0,
          redScore: 0,
          timeLeft: 90,
          hostId: myId,
          updatedAt: Date.now(),
          players: { [myId]: myPlayerData },
        });
      } else {
        const existingData = snap.data();
        if (asHost) {
          setJoinedAsHost(true);
          setRoomHostId(myId);
          await updateDoc(roomRef, {
            gameState: 'waiting',
            hostId: myId,
            totalSlots: totalPlayersConfig,
            blueScore: 0,
            redScore: 0,
            timeLeft: 90,
            players: { [myId]: myPlayerData },
            updatedAt: Date.now(),
          });
        } else {
          setJoinedAsHost(false);
          if (existingData?.hostId) setRoomHostId(existingData.hostId);
          await updateDoc(roomRef, {
            [`players.${myId}`]: myPlayerData,
            updatedAt: Date.now(),
          });
        }
      }

      firestoreUnsubRef.current = onSnapshot(roomRef, (docSnap) => {
        if (!docSnap.exists()) {
          setIsJoinedRoom(false);
          setJoinedAsHost(false);
          setRoomHostId(null);
          setRoomPlayersList([]);
          return;
        }
        const data = docSnap.data();
        const playersMap = data.players || {};
        const playersList = Object.values(playersMap) as any[];
        setRoomPlayersList(playersList);

        if (data.hostId) setRoomHostId(data.hostId);

        if (!asHost && playersMap && !playersMap[myId] && playersList.length > 0) {
          setIsJoinedRoom(false);
          setJoinedAsHost(false);
          setRoomHostId(null);
          setRoomPlayersList([]);
          return;
        }

        if (data.mapTheme) {
          setSelectedMapTheme(data.mapTheme);
          simState.current.currentTheme = data.mapTheme;
        }
        if (data.totalSlots) setTotalPlayersConfig(data.totalSlots);

        if (playersMap[myId]) {
          setPlayerTeam(playersMap[myId].team);
          if (myP) {
            myP.team = playersMap[myId].team;
            myP.color = playersMap[myId].team === 'blue' ? '#38bdf8' : '#f43f5e';
          }
        }

        if (data.gameState === 'playing' && !matchStartedRef.current && gameModeType === 'multiplayer') {
          matchStartedRef.current = true;
          if (data.mapTheme) {
            setSelectedMapTheme(data.mapTheme);
            simState.current.currentTheme = data.mapTheme;
          }
          simState.current.players = playersList.map((p, pIdx) => {
            const isLocal = isLocalPlayer(p.id);
            const spawnX = p.team === 'blue' ? 220 + Math.random() * 80 : (WORLD_WIDTH - 260) - Math.random() * 80;
            const spawnY = 360 + (pIdx * 120);
            const spawnAngle = p.team === 'blue' ? 0 : Math.PI;
            const displayName = isLocal ? safeName : (p.name || p.username || 'Striker').trim();

            if (isLocal) {
              return {
                ...p,
                id: myId,
                name: displayName,
                username: displayName,
                x: spawnX,
                y: spawnY,
                angle: spawnAngle,
                hp: p.hp || 100,
                maxHp: 100,
                isShielded: true,
                shieldTimer: 3.0,
                isRespawning: false,
                respawnTimer: 0,
                customization: characterCustomization,
              };
            }
            return {
              ...p,
              id: p.id,
              name: displayName,
              username: displayName,
              x: p.x || spawnX,
              y: p.y || spawnY,
              angle: p.angle !== undefined ? p.angle : spawnAngle,
              isBot: p.isBot || false,
              isShielded: true,
              shieldTimer: 3.0,
              isRespawning: false,
              respawnTimer: 0,
            };
          });

          if (data.blueScore !== undefined) simState.current.blueScore = data.blueScore;
          if (data.redScore !== undefined) simState.current.redScore = data.redScore;
          if (data.timeLeft !== undefined) {
            simState.current.timeLeft = data.timeLeft;
            setHudTimeLeft(Math.max(0, Math.floor(data.timeLeft)));
          }

          setInLobby(false);
          setMatchStatus('playing');
          soundEngine.playPowerUp();
          onTriggerSpecialNotification('Mega Golden Deal Box', 300);
        } else if (data.gameState === 'playing' && matchStatus === 'playing') {
          playersList.forEach((remoteP) => {
            if (!isLocalPlayer(remoteP.id)) {
              const localSimP = simState.current.players.find((p: any) => p.id === remoteP.id);
              if (localSimP && remoteP.x !== undefined && remoteP.y !== undefined) {
                if (Math.abs(localSimP.x - remoteP.x) > 40 || Math.abs(localSimP.y - remoteP.y) > 40) {
                  localSimP.x = remoteP.x;
                  localSimP.y = remoteP.y;
                  if (remoteP.angle !== undefined) localSimP.angle = remoteP.angle;
                }
              }
            }
          });
        } else if (data.gameState === 'ended' && matchStatus === 'playing') {
          finishMatch();
        }
      });
    } catch (err) {}

    try {
      if (wsRef.current) wsRef.current.close();
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setWsConnectionStatus('connecting');

      ws.onopen = () => {
        setWsConnectionStatus('connected');
        ws.send(JSON.stringify({
          type: 'join-room',
          roomCode: codeToUse,
          totalSlots: totalPlayersConfig,
          player: myPlayerData,
          asHost,
        }));
      };

      ws.onerror = () => setWsConnectionStatus('disconnected');
      ws.onclose = () => setWsConnectionStatus('disconnected');

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'room-updated') {
            if (data.room && data.room.players) setRoomPlayersList(Object.values(data.room.players));
            if (data.room && data.room.totalSlots) setTotalPlayersConfig(data.room.totalSlots);
            if (data.room && data.room.mapTheme) {
              setSelectedMapTheme(data.room.mapTheme);
              simState.current.currentTheme = data.room.mapTheme;
            }
          } else if (data.type === 'match-started') {
            if (data.room && data.room.mapTheme) {
              setSelectedMapTheme(data.room.mapTheme);
              simState.current.currentTheme = data.room.mapTheme;
            }
            if (!matchStartedRef.current && data.room && data.room.players && gameModeType === 'multiplayer') {
              matchStartedRef.current = true;
              const roomPlayers = Object.values(data.room.players) as any[];
              simState.current.players = roomPlayers.map((p, pIdx) => {
                const isLocal = isLocalPlayer(p.id);
                const spawnX = p.team === 'blue' ? 220 + Math.random() * 80 : (WORLD_WIDTH - 260) - Math.random() * 80;
                const spawnY = 360 + (pIdx * 120);
                const spawnAngle = p.team === 'blue' ? 0 : Math.PI;
                const displayName = isLocal ? safeName : (p.name || p.username || 'Striker').trim();

                if (isLocal) {
                  return {
                    ...p,
                    id: myId,
                    name: displayName,
                    username: displayName,
                    x: spawnX,
                    y: spawnY,
                    angle: spawnAngle,
                    hp: p.hp || 100,
                    maxHp: 100,
                    isShielded: true,
                    shieldTimer: 3.0,
                    isRespawning: false,
                    respawnTimer: 0,
                  };
                }
                return {
                  ...p,
                  id: p.id,
                  name: displayName,
                  username: displayName,
                  x: spawnX,
                  y: spawnY,
                  angle: spawnAngle,
                  isBot: p.isBot || false,
                  isShielded: true,
                  shieldTimer: 3.0,
                  isRespawning: false,
                  respawnTimer: 0,
                };
              });
            }
            if (data.room.blueScore !== undefined) simState.current.blueScore = data.room.blueScore;
            if (data.room.redScore !== undefined) simState.current.redScore = data.room.redScore;
            if (data.room.timeLeft !== undefined) simState.current.timeLeft = data.room.timeLeft;

            setInLobby(false);
            setMatchStatus('playing');
            soundEngine.playPowerUp();
            onTriggerSpecialNotification('Mega Golden Deal Box', 300);
          } else if (data.type === 'player-moved') {
            if (data.playerId && data.playerId !== myPlayerId.current) {
              const p = simState.current.players.find((item: any) => item.id === data.playerId);
              if (p) {
                if (data.updates.x !== undefined) p.x = data.updates.x;
                if (data.updates.y !== undefined) p.y = data.updates.y;
                if (data.updates.angle !== undefined) p.angle = data.updates.angle;
                if (data.updates.hp !== undefined) p.hp = data.updates.hp;
                if (data.updates.score !== undefined) p.score = data.updates.score;
                if (data.updates.kills !== undefined) p.kills = data.updates.kills;
                if (data.updates.deaths !== undefined) p.deaths = data.updates.deaths;
              }
            }
          } else if (data.type === 'bullet-fired') {
            if (data.playerId && data.playerId !== myPlayerId.current && data.bullet) {
              simState.current.bullets.push(data.bullet);
            }
          } else if (data.type === 'room-deleted') {
            setIsJoinedRoom(false);
            setJoinedAsHost(false);
            setRoomHostId(null);
            setRoomPlayersList([]);
            if (firestoreUnsubRef.current) {
              firestoreUnsubRef.current();
              firestoreUnsubRef.current = null;
            }
          } else if (data.type === 'player-left') {
            if (data.room && data.room.players) {
              setRoomPlayersList(Object.values(data.room.players));
            } else if (data.playerId) {
              setRoomPlayersList(prev => prev.filter(p => p.id !== data.playerId));
            }
          } else if (data.type === 'match-ended') {
            finishMatch();
          }
        } catch (err) {}
      };
    } catch (e) {}
  };

  return {
    inLobby,
    setInLobby,
    roomCodeInput,
    setRoomCodeInput,
    currentRoomCode,
    setCurrentRoomCode,
    copiedCode,
    setCopiedCode,
    copiedLink,
    setCopiedLink,
    joinError,
    wsConnectionStatus,
    myPlayerId,
    isJoinedRoom,
    roomPlayersList,
    roomHostId,
    joinedAsHost,
    isEffectiveHost,
    totalPlayersConfig,
    setTotalPlayersConfig,
    playerTeam,
    setPlayerTeam,
    selectedMapTheme,
    setSelectedMapTheme,
    gameModeType,
    setGameModeType,
    matchStatus,
    setMatchStatus,
    playerName,
    setPlayerName,
    playerStatus,
    setPlayerStatus,
    handleJoinMultiplayerRoom,
    handleLeaveMatch,
    handleAddBot,
    handleKickPlayer,
    handleUpdateBotTeam,
    handleSelectTeam,
    handleUpdateTotalSlots,
    handleSelectMapTheme,
    wsRef,
    startMatch,
    initRoster,
  };
}
