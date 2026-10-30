import React, { useState, useEffect } from 'react';
import { LeaderboardEntry } from '../types';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Clock, 
  Gift, 
  UserCheck, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../utils/audio';
import { WeeklyRewardsTab } from './leaderboard/WeeklyRewardsTab';

interface LeaderboardViewProps {
  leaderboard: LeaderboardEntry[];
  currentUserScore: number;
  currentUsername: string;
  onUpdateUsername: (name: string) => void;
  onSubmitScoreToLeaderboard: (username: string) => void;
  onNavigateToShooter: () => void;
  themeMode?: 'dark' | 'light';
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  leaderboard,
  currentUserScore,
  currentUsername,
  onUpdateUsername,
  onSubmitScoreToLeaderboard,
  onNavigateToShooter,
  themeMode = 'dark',
}) => {
  const isDark = themeMode === 'dark';
  const [activeTab, setActiveTab] = useState<'ranks' | 'rewards'>('ranks');
  const [inputName, setInputName] = useState<string>(currentUsername);
  const [inputError, setInputError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Synchronize inputName whenever profile username changes
  useEffect(() => {
    setInputName(currentUsername);
    setInputError(null);
  }, [currentUsername]);

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    const getNextSundayWIB = () => {
      const now = new Date();
      const wibOffset = 7 * 60 * 60 * 1000;
      const nowWIB = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + wibOffset);
      const dayOfWeek = nowWIB.getDay();
      let daysUntilSunday = (7 - dayOfWeek) % 7;
      if (daysUntilSunday === 0) {
        const hours = nowWIB.getHours();
        const minutes = nowWIB.getMinutes();
        const seconds = nowWIB.getSeconds();
        if (hours * 3600 + minutes * 60 + seconds >= 23 * 3600 + 59 * 60 + 59) {
          daysUntilSunday = 7;
        }
      }
      const targetWIB = new Date(nowWIB);
      targetWIB.setDate(targetWIB.getDate() + daysUntilSunday);
      targetWIB.setHours(23, 59, 59, 0);
      return targetWIB.getTime() - nowWIB.getTime();
    };
    return getNextSundayWIB();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const getNextSundayWIB = () => {
        const now = new Date();
        const wibOffset = 7 * 60 * 60 * 1000;
        const nowWIB = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000 + wibOffset);
        const dayOfWeek = nowWIB.getDay();
        let daysUntilSunday = (7 - dayOfWeek) % 7;
        if (daysUntilSunday === 0) {
          const hours = nowWIB.getHours();
          const minutes = nowWIB.getMinutes();
          const seconds = nowWIB.getSeconds();
          if (hours * 3600 + minutes * 60 + seconds >= 23 * 3600 + 59 * 60 + 59) {
            daysUntilSunday = 7;
          }
        }
        const targetWIB = new Date(nowWIB);
        targetWIB.setDate(targetWIB.getDate() + daysUntilSunday);
        targetWIB.setHours(23, 59, 59, 0);
        return targetWIB.getTime() - nowWIB.getTime();
      };
      const diff = getNextSundayWIB();
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '0:00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${days}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError(null);
    const trimmed = inputName.trim();
    if (!trimmed) {
      setInputError('Nama pemain tidak boleh kosong.');
      return;
    }
    if (trimmed.length < 2) {
      setInputError('Nama pemain minimal 2 karakter.');
      return;
    }
    if (trimmed.length > 20) {
      setInputError('Nama pemain maksimal 20 karakter.');
      return;
    }

    onUpdateUsername(trimmed);
    onSubmitScoreToLeaderboard(trimmed);
    setSubmitted(true);
    soundEngine.playPowerUp();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
    });
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className={`${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white border-slate-700' : 'bg-gradient-to-br from-white via-indigo-50 to-indigo-100 text-slate-900 border-indigo-200'} rounded-3xl p-6 md:p-8 border shadow-2xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Trophy className="w-4 h-4" />
              <span>Kompetisi Mingguan DiskonBlaster</span>
            </div>
            <h2 className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Papan Peringkat Global
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} mt-1 max-w-lg`}>
              Tembak target sebanyak-banyaknya di Arena Shooter. Raih posisi 3 besar setiap hari Minggu pukul 23:59 WIB untuk memenangkan voucher belanja.
            </p>
          </div>

          <div className={`${isDark ? 'bg-slate-800/90 border-slate-700/80' : 'bg-white/80 border-slate-200'} px-5 py-3.5 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner border`}>
            <div className={`w-10 h-10 rounded-xl ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'} border border-amber-500/30 flex items-center justify-center`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-[11px] uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'} block font-semibold`}>
                Reset Peringkat Dalam
              </span>
              <span className={`text-lg font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} font-mono-numbers`}>
                {formatCountdown(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* User Submission Form Strip */}
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-700/60' : 'border-slate-200'} flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'} flex items-center justify-center font-bold`}>
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Skor Tertinggi Kamu:</span>
              <div className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} font-mono-numbers`}>
                {currentUserScore} Poin Diskon
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={inputName}
                onChange={(e) => {
                  setInputName(e.target.value);
                  if (inputError) setInputError(null);
                }}
                placeholder="Masukkan Nickname Kamu"
                maxLength={20}
                className={`${isDark ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'} border text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 w-44 sm:w-56`}
              />
              {inputError && (
                <span className="absolute left-0 -bottom-4 text-[10px] text-rose-500 font-semibold whitespace-nowrap">
                  {inputError}
                </span>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap self-start sm:self-auto"
            >
              {submitted ? 'Tersimpan!' : 'Kirim Skor'}
            </button>
          </form>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ranks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'ranks'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Peringkat Teratas (Top 10)
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'rewards'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            Daftar Hadiah Mingguan
          </button>
        </div>

        <button
          onClick={onNavigateToShooter}
          className="flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
        >
          <span>Tingkatkan Skor di Arena</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Ranks Tab */}
      {activeTab === 'ranks' && (
        <div className={`${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'} border rounded-2xl overflow-hidden`}>
          <div className={`p-4 ${isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50/70 border-slate-200 text-slate-500'} border-b grid grid-cols-12 text-xs font-semibold uppercase tracking-wider`}>
            <span className="col-span-2 text-center">Peringkat</span>
            <span className="col-span-4">Shooter</span>
            <span className="col-span-3 text-right">Skor Mingguan</span>
            <span className="col-span-3 text-right">Hadiah Berhak</span>
          </div>

          <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {leaderboard.map((entry) => {
              const isTop1 = entry.rank === 1;
              const isTop2 = entry.rank === 2;
              const isTop3 = entry.rank === 3;

              return (
                <div
                  key={entry.playerId ? `player-${entry.playerId}` : `${entry.rank}-${entry.username}`}
                  className={`grid grid-cols-12 items-center p-4 transition-colors ${
                    entry.isCurrentUser
                      ? isDark ? 'bg-amber-950/40 border-l-4 border-amber-500 text-amber-200' : 'bg-amber-50/70 border-l-4 border-amber-500'
                      : isDark ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-slate-50/60 text-slate-800'
                  }`}
                >
                  {/* Rank Column */}
                  <div className="col-span-2 flex items-center justify-center">
                    {isTop1 ? (
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm shadow-sm">
                        <Crown className="w-4 h-4 fill-amber-500 text-amber-500" />
                      </div>
                    ) : isTop2 ? (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm">
                        2
                      </div>
                    ) : isTop3 ? (
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-sm">
                        3
                      </div>
                    ) : (
                      <span className="font-bold text-slate-500 text-sm font-mono-numbers">
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Username & Badge */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'} text-sm truncate`}>
                        {entry.username}
                      </span>
                      {entry.isCurrentUser && (
                        <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded">
                          KAMU
                        </span>
                      )}
                    </div>
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} block truncate`}>
                      {entry.badge} · {entry.date}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="col-span-3 text-right">
                    <span className={`font-extrabold ${isDark ? 'text-white' : 'text-slate-900'} text-base font-mono-numbers`}>
                      {entry.score.toLocaleString('id-ID')}
                    </span>
                    <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'} block`}>Poin</span>
                  </div>

                  {/* Reward Tier */}
                  <div className="col-span-3 text-right">
                    <span className="text-xs font-semibold text-emerald-600 block truncate">
                      {entry.rewardTier}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rewards Tab */}
      {activeTab === 'rewards' && <WeeklyRewardsTab isDark={isDark} />}
    </div>
  );
};
