import React from 'react';
import { 
  Users, 
  Bot, 
  Swords, 
  ChevronRight 
} from 'lucide-react';
import { TeamId, MapTheme, CharacterCustomization } from '../../types';
import { MAP_CATALOG } from '../MapSelectorModal';
import { MultiplayerRoomPanel } from './MultiplayerRoomPanel';
import { SoloLobbyPanel } from './SoloLobbyPanel';
import { LobbyMapShowcase } from './LobbyMapShowcase';
import { LobbyFooterControls } from './LobbyFooterControls';
import { TankThumbnailCanvas } from '../customizer/TankThumbnailCanvas';

interface ArenaLobbyViewProps {
  isDark: boolean;
  gameModeType: 'multiplayer' | 'bot';
  setGameModeType: (mode: 'multiplayer' | 'bot') => void;
  playerName: string;
  handlePlayerNameChange: (name: string) => void;
  characterCustomization: CharacterCustomization;
  setShowCustomizerModal: (show: boolean) => void;
  playerTeam: TeamId;
  handleSelectTeam: (team: TeamId) => void;
  totalPlayersConfig: number;
  setTotalPlayersConfig: (count: number) => void;
  isSelectingPlayers: boolean;
  setIsSelectingPlayers: (sel: boolean) => void;
  handleUpdateTotalSlots: (count: number) => void;
  currentRoomCode: string;
  roomCodeInput: string;
  setRoomCodeInput: (code: string) => void;
  handleCopyRoomCode: () => void;
  handleJoinMultiplayerRoom: (code: string, isHost: boolean) => void;
  isJoinedRoom: boolean;
  joinedAsHost: boolean;
  isEffectiveHost: boolean;
  roomPlayersList: any[];
  handleLeaveRoom: () => void;
  handleUpdateBotTeam: (botId: string, team: TeamId) => void;
  handleKickPlayer: (playerId: string) => void;
  startMatch: (mode?: 'bot' | 'multiplayer') => void;
  handleAddBot: () => void;
  handleDeleteRoom: () => void;
  selectedMapTheme: MapTheme;
  handleSelectMapTheme: (theme: MapTheme) => void;
  setShowMapSelectorModal: (show: boolean) => void;
  isLocalPlayer: (id: string) => boolean;
  onOpenProfile: () => void;
}

export const ArenaLobbyView: React.FC<ArenaLobbyViewProps> = ({
  isDark,
  gameModeType,
  setGameModeType,
  playerName,
  handlePlayerNameChange,
  characterCustomization,
  setShowCustomizerModal,
  playerTeam,
  handleSelectTeam,
  totalPlayersConfig,
  setTotalPlayersConfig,
  isSelectingPlayers,
  setIsSelectingPlayers,
  handleUpdateTotalSlots,
  currentRoomCode,
  roomCodeInput,
  setRoomCodeInput,
  handleCopyRoomCode,
  handleJoinMultiplayerRoom,
  isJoinedRoom,
  isEffectiveHost,
  roomPlayersList,
  handleLeaveRoom,
  handleUpdateBotTeam,
  handleKickPlayer,
  startMatch,
  handleAddBot,
  handleDeleteRoom,
  selectedMapTheme,
  handleSelectMapTheme,
  setShowMapSelectorModal,
  isLocalPlayer,
  onOpenProfile,
}) => {
  const currentMapIndex = MAP_CATALOG.findIndex((m) => m.id === selectedMapTheme);
  const activeMap = MAP_CATALOG[currentMapIndex >= 0 ? currentMapIndex : 0];
  const safePlayerName = (playerName || 'Tester').trim();

  const handleBotCountChange = (delta: number) => {
    const nextCount = Math.min(8, Math.max(2, totalPlayersConfig + delta));
    setTotalPlayersConfig(nextCount);
    handleUpdateTotalSlots(nextCount);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto rounded-3xl border transition-colors p-4 sm:p-6 md:p-7 flex flex-col gap-5 ${
      isDark ? 'bg-slate-900/80 border-slate-800 text-white shadow-2xl' : 'bg-white/95 border-slate-200 text-slate-900 shadow-xl'
    }`}>
      {/* 1. Header & Player Profile Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        {/* Greeting & Title */}
        <div className="text-left flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
            <Swords className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-black tracking-widest uppercase text-amber-500 block leading-none mb-1">
              Selamat Datang Di
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase">
              ShopShooter Arena
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pertempuran taktis 2 Tim! Kompetitif di PC (WASD,Mouse) dan Mobile (Virtual Joystick).
            </p>
          </div>
        </div>

        {/* Profile and Avatar Cards */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          {/* Card: Nama Pemain & Avatar (Clickable) */}
          <button
            onClick={onOpenProfile}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-2xl border text-left min-w-[170px] transition-all ${
              isDark ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xs font-black shrink-0">
              {safePlayerName ? safePlayerName.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1 leading-none mb-0.5">
                <span className="text-[9px] uppercase font-bold text-slate-400">Nama Pemain:</span>
                <span className="text-[9px] text-emerald-500 font-semibold">✓ Profil</span>
              </div>
              <div className={`w-full bg-transparent text-xs font-black border-none p-0 focus:outline-none truncate ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                {safePlayerName}
              </div>
            </div>
          </button>


          {/* Card: Kustomisasi Avatar */}
          <button
            onClick={() => setShowCustomizerModal(true)}
            className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl border text-left min-w-[210px] group transition-all ${
              isDark ? 'bg-slate-950/70 hover:bg-slate-800 border-slate-800 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800 shadow-inner overflow-hidden p-0.5">
              <TankThumbnailCanvas customization={characterCustomization} team={playerTeam} size={34} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">
                Kustomisasi Avatar
              </span>
              <span className="text-xs font-black capitalize truncate block">
                {characterCustomization.characterClass} - {characterCustomization.weaponSkin.replace('_', ' ')}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </button>
        </div>
      </div>

      {/* 2. Mode Selection Large Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tab: Arena Multiplayer (Cyan) */}
        <button
          onClick={() => setGameModeType('multiplayer')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${
            gameModeType === 'multiplayer'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 border-cyan-400 text-white shadow-md shadow-cyan-500/20'
              : isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              gameModeType === 'multiplayer' ? 'bg-white/20 text-white' : 'bg-cyan-500/10 text-cyan-500'
            }`}>
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black uppercase tracking-wide block leading-tight">
                Arena Multiplayer
              </span>
              <span className={`text-[11px] block ${gameModeType === 'multiplayer' ? 'text-cyan-100' : 'text-slate-400'}`}>
                Main Bareng dengan Kode Room
              </span>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 shrink-0 ${gameModeType === 'multiplayer' ? 'text-white' : 'text-slate-400'}`} />
        </button>

        {/* Tab: VS AI (Solo) (Orange) */}
        <button
          onClick={() => setGameModeType('bot')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between text-left ${
            gameModeType === 'bot'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 border-amber-400 text-white shadow-md shadow-orange-500/20'
              : isDark
              ? 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              gameModeType === 'bot' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-500'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-black uppercase tracking-wide block leading-tight">
                VS AI (Solo)
              </span>
              <span className={`text-[11px] block ${gameModeType === 'bot' ? 'text-amber-100' : 'text-slate-400'}`}>
                Latihan Cepat Lawan Komputer
              </span>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 shrink-0 ${gameModeType === 'bot' ? 'text-white' : 'text-slate-400'}`} />
        </button>
      </div>

      {/* 3. Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Mode Settings & Roster */}
        <div className="lg:col-span-7">
          {gameModeType === 'multiplayer' ? (
            <MultiplayerRoomPanel
              isDark={isDark}
              playerTeam={playerTeam}
              handleSelectTeam={handleSelectTeam}
              totalPlayersConfig={totalPlayersConfig}
              isSelectingPlayers={isSelectingPlayers}
              setIsSelectingPlayers={setIsSelectingPlayers}
              handleUpdateTotalSlots={handleUpdateTotalSlots}
              currentRoomCode={currentRoomCode}
              roomCodeInput={roomCodeInput}
              setRoomCodeInput={setRoomCodeInput}
              handleCopyRoomCode={handleCopyRoomCode}
              handleJoinMultiplayerRoom={handleJoinMultiplayerRoom}
              isJoinedRoom={isJoinedRoom}
              isEffectiveHost={isEffectiveHost}
              roomPlayersList={roomPlayersList}
              handleLeaveRoom={handleLeaveRoom}
              handleUpdateBotTeam={handleUpdateBotTeam}
              handleKickPlayer={handleKickPlayer}
              startMatch={() => startMatch('multiplayer')}
              handleAddBot={handleAddBot}
              handleDeleteRoom={handleDeleteRoom}
              selectedMapTheme={selectedMapTheme}
              setShowMapSelectorModal={setShowMapSelectorModal}
              isLocalPlayer={isLocalPlayer}
              playerName={safePlayerName}
            />
          ) : (
            <SoloLobbyPanel
              isDark={isDark}
              playerTeam={playerTeam}
              handleSelectTeam={handleSelectTeam}
              totalPlayersConfig={totalPlayersConfig}
              setTotalPlayersConfig={setTotalPlayersConfig}
              isSelectingPlayers={isSelectingPlayers}
              setIsSelectingPlayers={setIsSelectingPlayers}
              startMatch={() => startMatch('bot')}
              playerName={safePlayerName}
            />
          )}
        </div>

        {/* Right Column: Map Aktif + Info Mode VS AI + Quick Banner */}
        <div className="lg:col-span-5">
          <LobbyMapShowcase
            isDark={isDark}
            selectedMapTheme={selectedMapTheme}
            handleSelectMapTheme={handleSelectMapTheme}
            setShowMapSelectorModal={setShowMapSelectorModal}
            playerTeam={playerTeam}
            handleSelectTeam={handleSelectTeam}
            totalPlayersConfig={totalPlayersConfig}
            handleBotCountChange={handleBotCountChange}
            startMatch={() => startMatch('bot')}
          />
        </div>
      </div>

      {/* 4. Bottom Controls Strip */}
      <LobbyFooterControls isDark={isDark} />
    </div>
  );
};
