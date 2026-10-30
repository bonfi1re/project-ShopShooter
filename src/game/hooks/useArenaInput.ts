import { useRef, useState, useEffect, useCallback } from 'react';
import { soundEngine } from '../../utils/audio';

interface UseArenaInputProps {
  matchStatus: 'lobby' | 'playing' | 'ended';
  isFullscreen: boolean;
  setIsFullscreen: React.Dispatch<React.SetStateAction<boolean>>;
  arenaContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  simState: React.MutableRefObject<any>;
  isLocalPlayer: (id: string) => boolean;
  shootLaser: (playerId: string) => void;
  myPlayerId: React.MutableRefObject<string>;
  inputDevice: any;
  addDamageText: (text: string, x: number, y: number, color: string) => void;
}

export function useArenaInput({
  matchStatus,
  isFullscreen,
  setIsFullscreen,
  arenaContainerRef,
  canvasRef,
  simState,
  isLocalPlayer,
  shootLaser,
  myPlayerId,
  inputDevice,
  addDamageText,
}: UseArenaInputProps) {
  const keysPressed = useRef<Record<string, boolean>>({});
  const mouseWorldPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDown = useRef<boolean>(false);
  const lastDashTime = useRef<number>(0);
  const [hudDashCooldown, setHudDashCooldown] = useState<number>(0);

  const [virtualJoyActive, setVirtualJoyActive] = useState<boolean>(false);
  const [joyKnobPos, setJoyKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const mobileMoveVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const joyTouchId = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const aimTouchId = useRef<number | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (arenaContainerRef.current?.requestFullscreen) {
        arenaContainerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [setIsFullscreen]);

  const updateAimAngleFromClientCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (clientX - rect.left) * scaleX;
    const mouseY = (clientY - rect.top) * scaleY;

    const worldX = mouseX + simState.current.cameraX;
    const worldY = mouseY + simState.current.cameraY;

    mouseWorldPos.current = { x: worldX, y: worldY };

    const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (myP && !myP.isRespawning) {
      myP.angle = Math.atan2(worldY - myP.y, worldX - myP.x);
    }
  }, [isLocalPlayer, simState, canvasRef]);

  const resetAllInputs = useCallback(() => {
    keysPressed.current = {};
    isMouseDown.current = false;
    mobileMoveVector.current = { x: 0, y: 0 };
    joyTouchId.current = null;
    aimTouchId.current = null;
    setVirtualJoyActive(false);
    setJoyKnobPos({ x: 0, y: 0 });
  }, []);

  const triggerDash = useCallback(() => {
    const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
    if (!myP || myP.isRespawning) return;

    const now = Date.now();
    const cooldownMs = 3500;
    const timeSinceLast = now - lastDashTime.current;

    if (timeSinceLast < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - timeSinceLast) / 1000);
      addDamageText(`⏳ DASH CD (${remainingSec}s)`, myP.x, myP.y - 20, '#94a3b8');
      return;
    }

    lastDashTime.current = now;
    setHudDashCooldown(3.5);

    myP.activeSkill = {
      type: 'speed',
      timeLeft: 3.5,
    };
    soundEngine.playPowerUp();
    addDamageText('💨 DASH EVASIVE!', myP.x, myP.y - 20, '#10b981');
  }, [isLocalPlayer, simState, addDamageText]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (['space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.code.toLowerCase()) || e.key === ' ') {
        if (matchStatus === 'playing') {
          e.preventDefault();
        }
      }

      const keyLower = e.key.toLowerCase();
      const codeLower = e.code.toLowerCase();
      keysPressed.current[keyLower] = true;
      keysPressed.current[codeLower] = true;

      if (e.code === 'Space' || e.key === ' ' || e.key === 'Shift') {
        triggerDash();
      }

      if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    const handleUp = (e: KeyboardEvent) => {
      const keyLower = e.key.toLowerCase();
      const codeLower = e.code.toLowerCase();
      keysPressed.current[keyLower] = false;
      keysPressed.current[codeLower] = false;
    };

    const handleWindowBlur = () => resetAllInputs();
    const handleVisibilityChange = () => {
      if (document.hidden) resetAllInputs();
    };
    const handlePointerCancel = () => resetAllInputs();
    const handleGlobalMouseUp = () => { isMouseDown.current = false; };
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (matchStatus === 'playing' && isMouseDown.current) {
        updateAimAngleFromClientCoords(e.clientX, e.clientY);
      }
    };

    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointercancel', handlePointerCancel);
    window.addEventListener('touchcancel', handlePointerCancel);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('pointerup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('touchcancel', handlePointerCancel);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('pointerup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [matchStatus, triggerDash, resetAllInputs, updateAimAngleFromClientCoords]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    updateAimAngleFromClientCoords(e.clientX, e.clientY);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isMouseDown.current = true;
      updateAimAngleFromClientCoords(e.clientX, e.clientY);
      shootLaser(myPlayerId.current);
    }
  };

  const handleCanvasMouseUp = () => { isMouseDown.current = false; };

  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    inputDevice.notifyTouchEvent();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateAimAngleFromClientCoords(touch.clientX, touch.clientY);
    }
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      updateAimAngleFromClientCoords(touch.clientX, touch.clientY);
    }
  };

  const handleJoyTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    inputDevice.notifyTouchEvent();
    const touch = e.changedTouches[0];
    joyTouchId.current = touch.identifier;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    joyOrigin.current = { x: centerX, y: centerY };

    setVirtualJoyActive(true);
    handleJoyTouchMove(e);
  };

  const handleJoyTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joyTouchId.current) {
        const dx = touch.clientX - joyOrigin.current.x;
        const dy = touch.clientY - joyOrigin.current.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;

        if (dist === 0) {
          mobileMoveVector.current = { x: 0, y: 0 };
          setJoyKnobPos({ x: 0, y: 0 });
        } else {
          const clampedDist = Math.min(dist, maxRadius);
          const nx = dx / dist;
          const ny = dy / dist;
          mobileMoveVector.current = { x: nx * (clampedDist / maxRadius), y: ny * (clampedDist / maxRadius) };
          setJoyKnobPos({ x: nx * clampedDist, y: ny * clampedDist });
        }
        break;
      }
    }
  };

  const handleJoyTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setVirtualJoyActive(false);
        mobileMoveVector.current = { x: 0, y: 0 };
        setJoyKnobPos({ x: 0, y: 0 });
        break;
      }
    }
  };

  const handleAimTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    inputDevice.notifyTouchEvent();
    const touch = e.changedTouches[0];
    aimTouchId.current = touch.identifier;
    handleAimTouchMove(e);
  };

  const handleAimTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (aimTouchId.current === null || touch.identifier === aimTouchId.current) {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = touch.clientX - centerX;
        const dy = touch.clientY - centerY;
        if (Math.hypot(dx, dy) > 8) {
          const aimAngle = Math.atan2(dy, dx);
          const myP = simState.current.players.find((p: any) => isLocalPlayer(p.id));
          if (myP && !myP.isRespawning) {
            myP.angle = aimAngle;
          }
        }
        break;
      }
    }
  };

  const handleAimTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === aimTouchId.current) {
        aimTouchId.current = null;
        break;
      }
    }
  };

  return {
    keysPressed,
    isMouseDown,
    lastDashTime,
    hudDashCooldown,
    setHudDashCooldown,
    virtualJoyActive,
    joyKnobPos,
    mobileMoveVector,
    toggleFullscreen,
    triggerDash,
    handleCanvasMouseMove,
    handleCanvasMouseDown,
    handleCanvasMouseUp,
    handleCanvasTouchStart,
    handleCanvasTouchMove,
    handleJoyTouchStart,
    handleJoyTouchMove,
    handleJoyTouchEnd,
    handleAimTouchStart,
    handleAimTouchMove,
    handleAimTouchEnd,
  };
}
