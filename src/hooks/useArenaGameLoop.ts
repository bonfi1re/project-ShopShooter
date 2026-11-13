import { useEffect, useRef } from 'react';
import { TeamId, MapTheme, CharacterClass, CollectibleSkill, InGameSkillType } from '../types';
import { updatePlayerMovementSystem } from '../game/systems/playerMovementSystem';
import { updateCombatCollisionSystem } from '../game/systems/combatCollisionSystem';
import { renderPassSystem } from '../game/systems/renderPassSystem';
import { renderTacticalRadar } from '../game/rendering/renderTacticalRadar';
import '../utils/canvasHelper';
import { WORLD_WIDTH, WORLD_HEIGHT, SimPlayer, SimBullet, SimDamageText, SimBoss, AmbientParticle } from '../types/multiplayerTypes';

interface UseArenaGameLoopProps {
  matchStatus: 'lobby' | 'playing' | 'ended';
  simState: React.MutableRefObject<{
    players: SimPlayer[];
    bullets: SimBullet[];
    boss: SimBoss | null;
    damageTexts: SimDamageText[];
    skills: CollectibleSkill[];
    ambientParticles: AmbientParticle[];
    shoppingParticles: any[];
    blueScore: number;
    redScore: number;
    timeLeft: number;
    cameraX: number;
    cameraY: number;
    currentTheme: MapTheme;
  }>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  minimapCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  keysPressed: React.MutableRefObject<Record<string, boolean>>;
  isMouseDown: React.MutableRefObject<boolean>;
  mobileMoveVector: React.MutableRefObject<{ x: number; y: number }>;
  lastDashTime: React.MutableRefObject<number>;
  isLocalPlayer: (id: string) => boolean;
  getCharacterStats: (charClass?: CharacterClass) => { maxHp: number; speedMultiplier: number; damageMultiplier: number };
  finishMatch: () => void;
  shootLaser: (playerId: string) => void;
  respawnSinglePlayer: (p: SimPlayer) => void;
  addDamageText: (text: string, x: number, y: number, color: string) => void;
  addKillFeed: (killer: string, victim: string, team: TeamId) => void;
  setHudRespawnTimer: (val: number) => void;
  setHudTimeLeft: (val: number) => void;
  setHudBlueScore: (val: number) => void;
  setHudRedScore: (val: number) => void;
  setHudDashCooldown: (val: number) => void;
  setHudMyHp: (val: number) => void;
  setHudMyKills: (val: number) => void;
  setHudActiveSkill: (val: { type: InGameSkillType; label: string; timeLeft: number } | null) => void;
  wsRef: React.RefObject<WebSocket | null>;
  gameModeType: 'multiplayer' | 'bot';
  myPlayerId: React.MutableRefObject<string>;
  isDark: boolean;
}

export const useArenaGameLoop = ({
  matchStatus,
  simState,
  canvasRef,
  minimapCanvasRef,
  keysPressed,
  isMouseDown,
  mobileMoveVector,
  lastDashTime,
  isLocalPlayer,
  getCharacterStats,
  finishMatch,
  shootLaser,
  respawnSinglePlayer,
  addDamageText,
  addKillFeed,
  setHudRespawnTimer,
  setHudTimeLeft,
  setHudBlueScore,
  setHudRedScore,
  setHudDashCooldown,
  setHudMyHp,
  setHudMyKills,
  setHudActiveSkill,
  wsRef,
  myPlayerId,
  isDark,
}: UseArenaGameLoopProps) => {
  const matchStatusRef = useRef(matchStatus);
  matchStatusRef.current = matchStatus;

  const finishMatchRef = useRef(finishMatch);
  finishMatchRef.current = finishMatch;

  const shootLaserRef = useRef(shootLaser);
  shootLaserRef.current = shootLaser;

  const respawnSinglePlayerRef = useRef(respawnSinglePlayer);
  respawnSinglePlayerRef.current = respawnSinglePlayer;

  const addDamageTextRef = useRef(addDamageText);
  addDamageTextRef.current = addDamageText;

  const addKillFeedRef = useRef(addKillFeed);
  addKillFeedRef.current = addKillFeed;

  const isLocalPlayerRef = useRef(isLocalPlayer);
  isLocalPlayerRef.current = isLocalPlayer;

  const getCharacterStatsRef = useRef(getCharacterStats);
  getCharacterStatsRef.current = getCharacterStats;

  useEffect(() => {
    if (matchStatus !== 'playing') return;

    let lastTick = performance.now();
    let hudTimerAccumulator = 0;
    let animFrameId: number | null = null;

    let isLoopActive = true;

    const loop = (time: number) => {
      if (!isLoopActive || matchStatusRef.current !== 'playing') return;

      try {
        const dt = Math.min(0.08, (time - lastTick) / 1000);
        lastTick = time;
        hudTimerAccumulator += dt;

        const sim = simState.current;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');

        // 1. Process Respawn & Shield Timers
        sim.players.forEach((p) => {
          if (p.isRespawning) {
            p.respawnTimer -= dt;
            if (isLocalPlayerRef.current(p.id)) {
              setHudRespawnTimer(Math.max(0, p.respawnTimer));
            }
            if (p.respawnTimer <= 0) {
              respawnSinglePlayerRef.current(p);
            }
          }
          if (p.shieldTimer && p.shieldTimer > 0) {
            p.shieldTimer -= dt;
            if (p.shieldTimer <= 0) {
              p.shieldTimer = 0;
              p.isShielded = false;
            }
          } else if (!p.activeSkill || p.activeSkill.type !== 'shield') {
            p.isShielded = false;
          }
        });

        // 2. Match Timer & HUD updates
        if (hudTimerAccumulator >= 0.5) {
          hudTimerAccumulator = 0;
          sim.timeLeft -= 0.5;
          setHudTimeLeft(Math.max(0, Math.floor(sim.timeLeft)));
          setHudBlueScore(sim.blueScore);
          setHudRedScore(sim.redScore);

          const cdRemaining = Math.max(0, 3.5 - (Date.now() - lastDashTime.current) / 1000);
          setHudDashCooldown(cdRemaining > 0.05 ? cdRemaining : 0);

          const myP = sim.players.find((p) => isLocalPlayerRef.current(p.id));
          if (myP) {
            setHudMyHp(myP.hp);
            setHudMyKills(myP.kills);
            if (myP.activeSkill && myP.activeSkill.timeLeft > 0) {
              setHudActiveSkill({
                type: myP.activeSkill.type,
                label: myP.activeSkill.type.toUpperCase(),
                timeLeft: Math.ceil(myP.activeSkill.timeLeft),
              });
            } else {
              setHudActiveSkill(null);
            }
          }

          if (sim.timeLeft <= 0) {
            sim.timeLeft = 0;
            setHudTimeLeft(0);
            isLoopActive = false;
            finishMatchRef.current();
            return;
          }
        }

        if (isMouseDown.current) {
          shootLaserRef.current(myPlayerId.current);
        }

        sim.players.forEach((p) => {
          if (p.activeSkill) {
            p.activeSkill.timeLeft -= dt;
            if (p.activeSkill.timeLeft <= 0) {
              p.activeSkill = undefined;
            }
          }
        });

        // 3. Player & Bot Movement System
        updatePlayerMovementSystem({
          simPlayers: sim.players,
          currentTheme: sim.currentTheme,
          dt,
          isLocalPlayer: isLocalPlayerRef.current,
          getCharacterStats: getCharacterStatsRef.current,
          keysPressed: keysPressed.current,
          mobileMoveVector: mobileMoveVector.current,
          myPlayerId: myPlayerId.current,
          wsRef,
          shootLaser: shootLaserRef.current,
        });

        // 4. Combat & Collision System
        updateCombatCollisionSystem({
          sim,
          dt,
          isLocalPlayer: isLocalPlayerRef.current,
          getCharacterStats: getCharacterStatsRef.current,
          addDamageText: addDamageTextRef.current,
          addKillFeed: addKillFeedRef.current,
        });

        // 5. Update Ambient & Shopping Particles
        sim.ambientParticles.forEach((part) => {
          part.x += part.vx;
          part.y += part.vy;
          if (part.y < 0) part.y = WORLD_HEIGHT;
          if (part.x < 0) part.x = WORLD_WIDTH;
          if (part.x > WORLD_WIDTH) part.x = 0;
        });

        for (let sp = sim.shoppingParticles.length - 1; sp >= 0; sp--) {
          const part = sim.shoppingParticles[sp];
          part.x += part.vx;
          part.y += part.vy;
          part.vy += 0.2;
          part.vx *= 0.95;
          part.rotation += part.vRot;
          part.alpha -= 0.018;
          if (part.alpha <= 0) {
            sim.shoppingParticles.splice(sp, 1);
          }
        }

        // 6. Camera Tracking
        if (canvas) {
          const viewW = canvas.width;
          const viewH = canvas.height;
          const focusP = sim.players.find((p) => isLocalPlayerRef.current(p.id));
          if (focusP) {
            sim.cameraX = Math.max(0, Math.min(WORLD_WIDTH - viewW, focusP.x - viewW / 2));
            sim.cameraY = Math.max(0, Math.min(WORLD_HEIGHT - viewH, focusP.y - viewH / 2));
          }
        }

        // 7. Render Pass (Main Battlefield)
        if (canvas && ctx) {
          try {
            renderPassSystem({
              ctx,
              canvas,
              sim,
              isDark,
              isLocalPlayer: isLocalPlayerRef.current,
            });
          } catch (renderErr) {
            console.error("Render pass error:", renderErr);
          }
        }

        // 8. Radar Minimap Pass
        if (minimapCanvasRef?.current) {
          const miniCanvas = minimapCanvasRef.current;
          const miniCtx = miniCanvas.getContext('2d');
          if (miniCtx) {
            try {
              renderTacticalRadar({
                ctx: miniCtx,
                width: miniCanvas.width || 240,
                height: miniCanvas.height || 140,
                sim,
                viewW: canvas?.width || 1200,
                viewH: canvas?.height || 800,
                isLocalPlayer: isLocalPlayerRef.current,
                isDark,
              });
            } catch (radarErr) {
              console.error("Radar render error:", radarErr);
            }
          }
        }
      } catch (loopErr) {
        console.error("Game loop tick error:", loopErr);
      } finally {
        if (isLoopActive && matchStatusRef.current === 'playing') {
          animFrameId = requestAnimationFrame(loop);
        }
      }
    };

    animFrameId = requestAnimationFrame(loop);

    return () => {
      isLoopActive = false;
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };
  }, [
    matchStatus,
    simState,
    canvasRef,
    minimapCanvasRef,
    keysPressed,
    isMouseDown,
    mobileMoveVector,
    lastDashTime,
    setHudRespawnTimer,
    setHudTimeLeft,
    setHudBlueScore,
    setHudRedScore,
    setHudDashCooldown,
    setHudMyHp,
    setHudMyKills,
    setHudActiveSkill,
    wsRef,
    myPlayerId,
    isDark,
  ]);
};
