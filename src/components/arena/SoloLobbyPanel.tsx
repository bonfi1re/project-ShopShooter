import React from 'react';
import { Bot, Play, Shield, Users, Sparkles, ChevronDown, X, UserPlus } from 'lucide-react';
import { TeamId } from '../../types';

interface SoloLobbyPanelProps {
  isDark: boolean;
  playerTeam: TeamId;
  handleSelectTeam: (team: TeamId) => void;
  totalPlayersConfig: number;
  setTotalPlayersConfig: (count: number) => void;
  isSelectingPlayers: boolean;
  setIsSelectingPlayers: (sel: boolean) => void;
  handleUpdateTotalSlots?: (count: number) => void;
  startMatch: () => void;
  playerName: string;
  soloBotsList?: any[];
  handleAddSoloBot?: (team?: TeamId) => void;
  handleKickSoloBot?: (botId: string) => void;
}

export const SoloLobbyPanel: React.FC<SoloLobbyPanelProps> = ({
  isDark,
  playerTeam,
  handleSelectTeam,
  totalPlayersConfig,
  setTotalPlayersConfig,
  isSelectingPlayers,
  setIsSelectingPlayers,
  handleUpdateTotalSlots,
  startMatch,
  playerName,
  soloBotsList = [],
  handleAddSoloBot,
  handleKickSoloBot,
}) => {
  const slotsPerTeam = Math.max(1, Math.floor(totalPlayersConfig / 2));
  const blueBots = soloBotsList.filter(b => b.team === 'blue');
  const redBots = soloBotsList.filter(b => b.team === 'red');

  // Build blue slots: if player is blue, slot 0 is player; then blue bots; then null
  const blueSlots: any[] = [];
  if (playerTeam === 'blue') {
    blueSlots.push({ id: 'local-player', name: playerName || 'Kamu', isMe: true });
  }
  blueBots.forEach(b => {
    if (blueSlots.length < slotsPerTeam) blueSlots.push(b);
  });
  while (blueSlots.length < slotsPerTeam) {
    blueSlots.push(null);
  }

  // Build red slots: if player is red, slot 0 is player; then red bots; then null
  const redSlots: any[] = [];
  if (playerTeam === 'red') {
    redSlots.push({ id: 'local-player', name: playerName || 'Kamu', isMe: true });
  }
  redBots.forEach(b => {
    if (redSlots.length < slotsPerTeam) redSlots.push(b);
  });
  while (redSlots.length < slotsPerTeam) {
    redSlots.push(null);
  }

  const currentTotalParticipants = 1 + soloBotsList.length;
  const canAddMoreBots = currentTotalParticipants < totalPlayersConfig;

  const onFormatChange = (count: number) => {
    if (handleUpdateTotalSlots) {
      handleUpdateTotalSlots(count);
    } else {
      setTotalPlayersConfig(count);
    }
    setIsSelectingPlayers(false);
  };

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 text-left transition-colors ${
      isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
    }`}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-amber-500" />
            <span>Mode Latihan VS AI (Solo)</span>
          </span>
          <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            Offline &amp; Cepat
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Lawan bot dengan tingkat kesulitan cerdas untuk latihan menembak, menguji mobilitas tank, dan mempelajari rute map.
        </p>
      </div>

      {/* Pengaturan Tim & Format */}
      <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'}`}>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Konfigurasi Pertandingan
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Pilih Tim */}
          <div>
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Pilih Tim Kamu
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => handleSelectTeam('blue')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                  playerTeam === 'blue'
                    ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                Tim Biru
              </button>
              <button
                onClick={() => handleSelectTeam('red')}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold transition-all border ${
                  playerTeam === 'red'
                    ? 'bg-rose-500 border-rose-400 text-white font-black'
                    : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-300 text-slate-700'
                }`}
              >
                Tim Merah
              </button>
            </div>
          </div>

          {/* Jumlah Pemain */}
          <div>
            <label className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block mb-1">
              Format Pemain
            </label>
            <div className="relative">
              <button
                onClick={() => setIsSelectingPlayers(!isSelectingPlayers)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <span>{totalPlayersConfig} Pemain ({totalPlayersConfig === 2 ? '1v1 Duel' : totalPlayersConfig === 4 ? '2v2 TDM' : totalPlayersConfig === 6 ? '3v3 TDM' : '4v4 War'})</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isSelectingPlayers && (
                <div className={`absolute z-30 mt-1 w-full rounded-xl border p-1 shadow-xl ${
                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
                }`}>
                  {[2, 4, 6, 8].map(count => (
                    <button
                      key={count}
                      onClick={() => onFormatChange(count)}
                      className={`w-full text-left px-2 py-1 rounded text-xs font-bold ${
                        totalPlayersConfig === count ? 'text-amber-400 font-black' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {count === 2 ? '1v1 Duel' : count === 4 ? '2v2 TDM' : count === 6 ? '3v3 TDM' : '4v4 War'} ({count} Petarung)
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Roster Preview (Tim Biru vs Tim Merah) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Simulasi Tim Pertandingan</span>
          </span>
          {handleAddSoloBot && canAddMoreBots && (
            <button
              onClick={() => handleAddSoloBot()}
              className="text-[10px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1"
            >
              <Bot className="w-3 h-3" />
              <span>+ Tambah Bot</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Blue Team Preview */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="bg-cyan-500/15 border-b border-cyan-500/30 px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-black text-cyan-500 uppercase tracking-wider">Tim Biru</span>
              <span className="text-[10px] font-bold text-cyan-400 font-mono">
                {blueSlots.filter(Boolean).length}/{slotsPerTeam} Tank
              </span>
            </div>
            <div className="p-2 space-y-1">
              {blueSlots.map((participant, idx) => {
                if (participant) {
                  const isMe = participant.isMe;
                  const displayName = isMe ? (playerName || 'Kamu') : participant.name;
                  return (
                    <div key={participant.id || `blue-${idx}`} className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[11px]">{isMe ? '👤' : '🤖'}</span>
                        <span className="font-bold truncate text-xs">{displayName}</span>
                        {isMe && <span className="text-[9px] text-cyan-400">(Kamu)</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] text-cyan-400 font-mono">{isMe ? 'Kamu' : 'AI'}</span>
                        {!isMe && handleKickSoloBot && (
                          <button
                            onClick={() => handleKickSoloBot(participant.id)}
                            title="Hapus Bot"
                            className="text-rose-400 hover:text-rose-300 p-0.5 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={`solo-empty-blue-${idx}`}
                    onClick={() => {
                      if (playerTeam !== 'blue') handleSelectTeam('blue');
                      else if (handleAddSoloBot) handleAddSoloBot('blue');
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg border border-dashed text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isDark ? 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700' : 'border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{playerTeam === 'blue' ? '+ Tambah Bot' : 'Pindah ke Tim Ini'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Red Team Preview */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="bg-rose-500/15 border-b border-rose-500/30 px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-black text-rose-500 uppercase tracking-wider">Tim Merah</span>
              <span className="text-[10px] font-bold text-rose-400 font-mono">
                {redSlots.filter(Boolean).length}/{slotsPerTeam} Tank
              </span>
            </div>
            <div className="p-2 space-y-1">
              {redSlots.map((participant, idx) => {
                if (participant) {
                  const isMe = participant.isMe;
                  const displayName = isMe ? (playerName || 'Kamu') : participant.name;
                  return (
                    <div key={participant.id || `red-${idx}`} className={`flex items-center justify-between px-2.5 py-1 rounded-lg text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-[11px]">{isMe ? '👤' : '🤖'}</span>
                        <span className="font-bold truncate text-xs">{displayName}</span>
                        {isMe && <span className="text-[9px] text-rose-400">(Kamu)</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[9px] text-rose-400 font-mono">{isMe ? 'Kamu' : 'AI'}</span>
                        {!isMe && handleKickSoloBot && (
                          <button
                            onClick={() => handleKickSoloBot(participant.id)}
                            title="Hapus Bot"
                            className="text-rose-400 hover:text-rose-300 p-0.5 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }
                return (
                  <button
                    key={`solo-empty-red-${idx}`}
                    onClick={() => {
                      if (playerTeam !== 'red') handleSelectTeam('red');
                      else if (handleAddSoloBot) handleAddSoloBot('red');
                    }}
                    className={`w-full py-1.5 px-2 rounded-lg border border-dashed text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      isDark ? 'border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700' : 'border-slate-300 text-slate-400 hover:text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{playerTeam === 'red' ? '+ Tambah Bot' : 'Pindah ke Tim Ini'}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* AI Bot Note */}
      <div className={`flex items-center gap-2 p-2 rounded-xl text-[11px] ${
        isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' : 'bg-amber-50 border border-amber-200 text-amber-800'
      }`}>
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>Bot menggunakan AI canggih untuk navigasi, tembakan taktis, dan duel seimbang.</span>
      </div>

      {/* Mulai Pertandingan Button */}
      <button
        onClick={startMatch}
        className="w-full py-3 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 shadow-md shadow-orange-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
      >
        <Play className="w-4 h-4 fill-white" />
        <span>Mulai Pertandingan vs AI ({currentTotalParticipants} Petarung)</span>
        <Users className="w-4 h-4" />
      </button>
    </div>
  );
};

