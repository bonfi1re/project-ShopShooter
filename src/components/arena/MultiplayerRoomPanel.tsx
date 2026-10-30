import React, { useState } from 'react';
import { Users, Bot, Crown, Copy, Check, LogOut, Trash2, X, Play, Edit3, Shield, UserPlus } from 'lucide-react';
import { TeamId, MapTheme } from '../../types';
import { soundEngine } from '../../utils/audio';

interface MultiplayerRoomPanelProps {
  isDark: boolean;
  playerTeam: TeamId;
  handleSelectTeam: (team: TeamId) => void;
  totalPlayersConfig: number;
  isSelectingPlayers: boolean;
  setIsSelectingPlayers: (sel: boolean) => void;
  handleUpdateTotalSlots: (count: number) => void;
  currentRoomCode: string;
  roomCodeInput: string;
  setRoomCodeInput: (code: string) => void;
  handleCopyRoomCode: () => void;
  handleJoinMultiplayerRoom: (code: string, isHost: boolean) => void;
  isJoinedRoom: boolean;
  isEffectiveHost: boolean;
  roomPlayersList: any[];
  handleLeaveRoom: () => void;
  handleUpdateBotTeam: (botId: string, team: TeamId) => void;
  handleKickPlayer: (playerId: string) => void;
  startMatch: () => void;
  handleAddBot: () => void;
  handleDeleteRoom: () => void;
  selectedMapTheme: MapTheme;
  setShowMapSelectorModal: (show: boolean) => void;
  isLocalPlayer: (id: string) => boolean;
  playerName: string;
}

export const MultiplayerRoomPanel: React.FC<MultiplayerRoomPanelProps> = ({
  isDark,
  playerTeam,
  handleSelectTeam,
  totalPlayersConfig,
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
  isLocalPlayer,
  playerName,
}) => {
  const [subMode, setSubMode] = useState<'create' | 'join'>('create');
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    handleCopyRoomCode();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const slotsPerTeam = Math.max(1, Math.floor(totalPlayersConfig / 2));
  const bluePlayers = roomPlayersList.filter(p => p.team === 'blue');
  const redPlayers = roomPlayersList.filter(p => p.team === 'red');

  // Fill up display slots
  const blueSlots = Array.from({ length: slotsPerTeam }, (_, i) => bluePlayers[i] || null);
  const redSlots = Array.from({ length: slotsPerTeam }, (_, i) => redPlayers[i] || null);

  const handleStart = () => {
    soundEngine.playPowerUp();
    if (!isJoinedRoom) {
      handleJoinMultiplayerRoom(currentRoomCode, true);
      setTimeout(() => startMatch(), 250);
    } else {
      startMatch();
    }
  };

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 text-left transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header: PILIH MODE MULTIPLAYER */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-cyan-500" />
            <span>Pilih Mode Multiplayer</span>
          </span>
          {isJoinedRoom && (
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ● Room Aktif: {currentRoomCode}
            </span>
          )}
        </div>

        {/* Tab Buttons: Buat Room / Gabung Room */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setSubMode('create');
              if (!isJoinedRoom) handleJoinMultiplayerRoom(currentRoomCode, true);
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              subMode === 'create'
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm'
                : isDark ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>+ Buat Room</span>
          </button>
          <button
            onClick={() => setSubMode('join')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
              subMode === 'join'
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm'
                : isDark ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gabung Room</span>
          </button>
        </div>
      </div>

      {/* PENGATURAN ROOM */}
      <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Pengaturan Room
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Nama / Kode Room */}
          <div>
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Nama Room
            </label>
            {subMode === 'create' ? (
              <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                isDark ? 'bg-slate-900 border-slate-700 text-cyan-300' : 'bg-white border-slate-300 text-slate-800'
              }`}>
                <span className="truncate">{currentRoomCode || 'ROOM_123'}</span>
                <button onClick={onCopy} title="Salin Kode Room" className="text-slate-400 hover:text-cyan-400 p-0.5">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                  placeholder="Kode..."
                  className={`w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-bold uppercase focus:outline-none focus:border-cyan-400 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                  maxLength={10}
                />
                <button
                  onClick={() => handleJoinMultiplayerRoom(roomCodeInput, false)}
                  className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shrink-0"
                >
                  OK
                </button>
              </div>
            )}
          </div>

          {/* Jumlah Pemain Dropdown */}
          <div>
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Jumlah Pemain
            </label>
            <div className="relative">
              <button
                onClick={() => setIsSelectingPlayers(!isSelectingPlayers)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <span>{totalPlayersConfig === 2 ? '1v1' : totalPlayersConfig === 4 ? '2v2' : totalPlayersConfig === 6 ? '3v3' : '4v4'}</span>
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {isSelectingPlayers && (
                <div className={`absolute z-30 mt-1 w-full rounded-xl border p-1 shadow-xl ${
                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {[2, 4, 6, 8].map(count => (
                    <button
                      key={count}
                      onClick={() => { handleUpdateTotalSlots(count); setIsSelectingPlayers(false); }}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-bold ${
                        totalPlayersConfig === count ? 'text-cyan-400 font-black' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {count === 2 ? '1v1' : count === 4 ? '2v2' : count === 6 ? '3v3' : '4v4'} ({count} Pemain)
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Mode Permainan */}
          <div>
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Mode Permainan
            </label>
            <div className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold truncate flex items-center justify-between ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}>
              <span>Team Deathmatch</span>
              <span className="text-[10px] text-slate-400">▾</span>
            </div>
          </div>
        </div>
      </div>

      {/* DAFTAR PEMAIN (2 Columns: Tim Biru vs Tim Merah) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Daftar Pemain</span>
          </span>
          {isEffectiveHost && (
            <button
              onClick={handleAddBot}
              disabled={roomPlayersList.length >= totalPlayersConfig}
              className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1 disabled:opacity-40"
            >
              <Bot className="w-3 h-3" />
              <span>+ Tambah Bot</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* TIM BIRU */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="bg-cyan-500/15 border-b border-cyan-500/30 px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-black text-cyan-500 uppercase tracking-wider">Tim Biru</span>
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                {bluePlayers.length}/{slotsPerTeam}
              </span>
            </div>
            <div className="p-2 space-y-1.5 min-h-[90px]">
              {blueSlots.map((player, idx) => {
                if (player) {
                  const isLocal = isLocalPlayer(player.id);
                  const isHost = idx === 0 || player.isHost;
                  const displayName = (isLocal ? (playerName || 'Kamu') : (player.name || player.username || 'Player')).trim();
                  return (
                    <div key={player.id || idx} className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-black shrink-0">
                          {player.isBot ? '🤖' : displayName.charAt(0).toUpperCase()}
                        </div>
                        {isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                        <span className="font-bold truncate text-xs">{displayName}</span>
                        {isLocal && <span className="text-[9px] text-cyan-400">(Kamu)</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isHost ? (
                          <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/30">Host</span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
                        )}
                        {isEffectiveHost && !isLocal && (
                          <button onClick={() => handleKickPlayer(player.id)} className="text-rose-400 hover:text-rose-300 p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={`empty-blue-${idx}`}
                    onClick={() => {
                      if (playerTeam !== 'blue') handleSelectTeam('blue');
                      else if (isEffectiveHost) handleAddBot();
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg border border-dashed text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isDark ? 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700' : 'border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{playerTeam === 'blue' ? (isEffectiveHost ? '+ Tambah Bot' : '+ Slot Kosong') : 'Pindah ke Tim Ini'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TIM MERAH */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="bg-rose-500/15 border-b border-rose-500/30 px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-black text-rose-500 uppercase tracking-wider">Tim Merah</span>
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 font-mono">
                {redPlayers.length}/{slotsPerTeam}
              </span>
            </div>
            <div className="p-2 space-y-1.5 min-h-[90px]">
              {redSlots.map((player, idx) => {
                if (player) {
                  const isLocal = isLocalPlayer(player.id);
                  const displayName = (isLocal ? (playerName || 'Kamu') : (player.name || player.username || 'Player')).trim();
                  return (
                    <div key={player.id || idx} className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                    }`}>
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] font-black shrink-0">
                          {player.isBot ? '🤖' : displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold truncate text-xs">{displayName}</span>
                        {isLocal && <span className="text-[9px] text-rose-400">(Kamu)</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                        {isEffectiveHost && !isLocal && (
                          <button onClick={() => handleKickPlayer(player.id)} className="text-rose-400 hover:text-rose-300 p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={`empty-red-${idx}`}
                    onClick={() => {
                      if (playerTeam !== 'red') handleSelectTeam('red');
                      else if (isEffectiveHost) handleAddBot();
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg border border-dashed text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isDark ? 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700' : 'border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{playerTeam === 'red' ? (isEffectiveHost ? '+ Tambah Bot' : '+ Slot Kosong') : 'Pindah ke Tim Ini'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action CTA */}
      <div className="pt-1 flex flex-col gap-2">
        <button
          onClick={handleStart}
          className="w-full py-3 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Mulai Pertandingan</span>
          <Users className="w-4 h-4" />
        </button>

        {isJoinedRoom && (
          <div className="flex items-center justify-between text-[11px]">
            {isEffectiveHost ? (
              <button onClick={handleDeleteRoom} className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold">
                <Trash2 className="w-3 h-3" />
                <span>Bubarkan Room</span>
              </button>
            ) : (
              <button onClick={handleLeaveRoom} className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold">
                <LogOut className="w-3 h-3" />
                <span>Tinggalkan Room</span>
              </button>
            )}
            <span className="text-slate-400">Pilih tim dengan mengklik kartu slot</span>
          </div>
        )}
      </div>
    </div>
  );
};
