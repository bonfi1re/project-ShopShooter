import React from 'react';
import { Trophy, Swords, Scale, RotateCcw, ArrowRight, ShoppingBag } from 'lucide-react';
import { TeamId } from '../../types';

export interface ArenaMatchResultStats {
  outcome: 'victory' | 'defeat' | 'draw';
  blueScore: number;
  redScore: number;
  playerKills: number;
  playerTeam: TeamId;
  pointsAwarded: number;
}

interface ArenaMatchResultModalProps {
  stats: ArenaMatchResultStats;
  isDark?: boolean;
  gameModeType: 'multiplayer' | 'bot';
  onPlayAgain?: () => void;
  onReturnToLobby: () => void;
  onNavigateToRedemption: () => void;
  onNavigateToLeaderboard: () => void;
}

export const ArenaMatchResultModal: React.FC<ArenaMatchResultModalProps> = ({
  stats,
  isDark = true,
  gameModeType,
  onPlayAgain,
  onReturnToLobby,
  onNavigateToRedemption,
  onNavigateToLeaderboard,
}) => {
  const { outcome, blueScore, redScore, playerKills, playerTeam, pointsAwarded } = stats;

  const isVictory = outcome === 'victory';
  const isDefeat = outcome === 'defeat';
  const isDraw = outcome === 'draw';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div
        className={`w-full max-w-md rounded-2xl md:rounded-3xl p-6 md:p-8 shadow-2xl border transition-all animate-in zoom-in-95 duration-200 text-center ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-white'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
        }`}
      >
        {/* Outcome Icon */}
        <div className="flex justify-center mb-4">
          {isVictory ? (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Trophy className="w-8 h-8" />
            </div>
          ) : isDraw ? (
            <div className="w-16 h-16 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center justify-center">
              <Scale className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Swords className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Outcome Heading */}
        <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
          {isVictory ? 'MENANG' : isDraw ? 'SERI' : 'KALAH'}
        </h2>
        <p
          className={`text-xs md:text-sm mb-6 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          {isVictory
            ? 'Pertandingan berhasil kamu menangkan dengan gemilang.'
            : isDraw
            ? 'Pertandingan berakhir seimbang hingga akhir waktu.'
            : 'Pertandingan selesai. Tetap semangat dan coba lagi.'}
        </p>

        {/* Team Scoreboard Display */}
        <div
          className={`rounded-2xl p-4 mb-4 border ${
            isDark
              ? 'bg-slate-950/60 border-slate-800/80'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="grid grid-cols-5 items-center">
            {/* Blue Team */}
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-xs font-bold text-sky-400 tracking-wide uppercase">
                  Tim Biru
                </span>
                {playerTeam === 'blue' && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                      isDark ? 'bg-sky-950 text-sky-300' : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    Kamu
                  </span>
                )}
              </div>
              <div className="text-3xl md:text-4xl font-black font-mono tracking-tight text-sky-400">
                {blueScore}
              </div>
            </div>

            {/* VS Divider */}
            <div
              className={`col-span-1 text-center font-bold text-xs ${
                isDark ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              VS
            </div>

            {/* Red Team */}
            <div className="col-span-2 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-xs font-bold text-rose-400 tracking-wide uppercase">
                  Tim Merah
                </span>
                {playerTeam === 'red' && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                      isDark ? 'bg-rose-950 text-rose-300' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    Kamu
                  </span>
                )}
              </div>
              <div className="text-3xl md:text-4xl font-black font-mono tracking-tight text-rose-400">
                {redScore}
              </div>
            </div>
          </div>
        </div>

        {/* Player Stats & Points Reward Box */}
        <div
          className={`rounded-2xl p-4 mb-6 border text-left space-y-3 ${
            isDark
              ? 'bg-slate-950/40 border-slate-800'
              : 'bg-slate-50/70 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-xs md:text-sm">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Eliminasi Pemain:
            </span>
            <span className="font-bold font-mono text-slate-300 dark:text-slate-200">
              {playerKills} Kill
            </span>
          </div>

          <div className="flex items-center justify-between text-xs md:text-sm pt-2 border-t border-slate-800/60 dark:border-slate-800">
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
              Hadiah Pertandingan:
            </span>
            <span className="font-extrabold font-mono text-emerald-500 text-lg md:text-xl">
              +{pointsAwarded} Poin
            </span>
          </div>

          <p
            className={`text-[11px] md:text-xs pt-1 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Poin berhasil ditambahkan ke saldo akunmu.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Main Action: Play Again or Return to Lobby */}
          {onPlayAgain ? (
            <button
              onClick={onPlayAgain}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-md transition-all active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              Main Lagi
            </button>
          ) : (
            <button
              onClick={onReturnToLobby}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-slate-950 shadow-md transition-all active:scale-[0.99]"
            >
              <ArrowRight className="w-4 h-4" />
              Kembali ke Lobi
            </button>
          )}

          {/* Secondary Action: Return to Lobby */}
          {onPlayAgain && (
            <button
              onClick={onReturnToLobby}
              className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors border ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              Kembali ke Lobi
            </button>
          )}

          {/* Secondary Action: Lihat Penukaran Poin (Neutral wording, no coupon disclosures) */}
          <button
            onClick={onNavigateToRedemption}
            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors border ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-sm'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
            Lihat Penukaran Poin
          </button>

          {/* Tertiary Action: Simple Leaderboard Link */}
          <button
            onClick={onNavigateToLeaderboard}
            className={`w-full pt-1.5 pb-1 text-xs font-medium transition-colors hover:underline ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Cek Papan Peringkat Mingguan
          </button>
        </div>
      </div>
    </div>
  );
};
