/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Product, 
  CartItem, 
  PowerUpItem, 
  PowerUpType, 
  LeaderboardEntry, 
  FloatingNotification 
} from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_POWER_UPS, 
  INITIAL_LEADERBOARD, 
  POINT_TO_RUPIAH_RATIO, 
  formatRupiah 
} from './data/mockData';
import { Navbar } from './components/Navbar';
import { ShooterArena } from './components/ShooterArena';
import { MultiplayerArena } from './components/MultiplayerArena';
import { LeaderboardView } from './components/LeaderboardView';
import { PowerUpStore } from './components/PowerUpStore';
import { SpecialTargetNotification } from './components/SpecialTargetNotification';
import { DailyChallengeModal } from './components/DailyChallengeModal';
import { soundEngine } from './utils/audio';
import { getStoredProfile, getMyPlayerId, subscribeToProfileUpdates, saveStoredProfile } from './services/profileStorage';

const STORAGE_KEY_LEADERBOARD = 'shopshooter_global_leaderboard';

export default function App() {
  const [isDailyModalOpen, setIsDailyModalOpen] = useState<boolean>(false);
  
  // Theme Mode: 'dark' (default) or 'light' (white)
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('tank_arena_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('tank_arena_theme', next);
      return next;
    });
  };

  useEffect(() => {
    const handleOpenDaily = () => setIsDailyModalOpen(true);
    window.addEventListener('open_daily_challenge', handleOpenDaily);
    return () => window.removeEventListener('open_daily_challenge', handleOpenDaily);
  }, []);

  // Navigation: Pure Game Tabs
  const [activeTab, setActiveTab] = useState<'multiplayer' | 'shooter' | 'leaderboard' | 'powerups'>('multiplayer');

  // Combat XP Points & Power-ups
  const [userDiscountPoints, setUserDiscountPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('diskon_blaster_user_points');
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val)) return val;
      }
    } catch {}
    return 500;
  });

  useEffect(() => {
    try {
      localStorage.setItem('diskon_blaster_user_points', String(userDiscountPoints));
    } catch {}
  }, [userDiscountPoints]);

  const [powerUpInventory, setPowerUpInventory] = useState<PowerUpItem[]>(INITIAL_POWER_UPS);

  // Leaderboard & Player Identity (Synchronized with Player Profile as single source of truth)
  const [currentUsername, setCurrentUsername] = useState<string>(() => {
    return getStoredProfile().username;
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => {
    const profile = getStoredProfile();
    const myId = getMyPlayerId();
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (saved) {
        const parsed: LeaderboardEntry[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sync any existing entry of current player with latest profile username
          return parsed.map((entry) => {
            if (entry.isCurrentUser || (entry.playerId && entry.playerId === myId)) {
              return {
                ...entry,
                isCurrentUser: true,
                playerId: myId,
                username: profile.username || entry.username,
              };
            }
            return entry;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to parse leaderboard from storage:', err);
    }
    return INITIAL_LEADERBOARD;
  });

  // Sync profile changes into state and leaderboard automatically
  useEffect(() => {
    const myId = getMyPlayerId();
    const unsub = subscribeToProfileUpdates((profile) => {
      setCurrentUsername(profile.username);

      setLeaderboard((prev) => {
        let changed = false;
        const updated = prev.map((entry) => {
          const isUser = entry.isCurrentUser || (entry.playerId && entry.playerId === myId);
          if (isUser && entry.username !== profile.username) {
            changed = true;
            return {
              ...entry,
              isCurrentUser: true,
              playerId: myId,
              username: profile.username,
            };
          }
          return entry;
        });

        if (changed) {
          try {
            localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(updated));
          } catch {}
          return updated;
        }
        return prev;
      });
    });
    return unsub;
  }, []);

  // Persist leaderboard changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(leaderboard));
    } catch {}
  }, [leaderboard]);

  // Notifications
  const [notifications, setNotifications] = useState<FloatingNotification[]>([]);

  // Push notification helper
  const addNotification = (
    type: 'special_target' | 'combo' | 'powerup' | 'bomb' | 'info',
    title: string,
    message: string,
    durationMs: number = 7000
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newNotif: FloatingNotification = { id, type, title, message, durationMs };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 2)]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, durationMs);
  };

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Trigger special target alert
  const handleTriggerSpecialNotification = (targetName: string, points: number) => {
    addNotification(
      'special_target',
      '🚨 TARGET SPESIAL TERDETEKSI!',
      `${targetName} muncul di arena! Nilai +${points} Poin Diskon. Butuh 3 kali tembakan tepat sebelum kabur!`,
      8000
    );
  };

  // Add discount points from game
  const handleAddDiscountPoints = (points: number) => {
    setUserDiscountPoints((prev) => prev + points);
    if (points > 0) {
      addNotification(
        'info',
        'Poin Diskon Bertambah!',
        `Kamu berhasil mengumpulkan +${points} Poin (≈ ${formatRupiah(points * POINT_TO_RUPIAH_RATIO)}). Gunakan di keranjang belanja!`
      );
    }
  };

  // Deduct points on checkout
  const handleDeductPoints = (points: number) => {
    setUserDiscountPoints((prev) => Math.max(0, prev - points));
  };

  // Power-up consumption
  const handleUsePowerUpItem = (type: PowerUpType): boolean => {
    const item = powerUpInventory.find((p) => p.id === type);
    if (!item || item.count <= 0) return false;

    setPowerUpInventory((prev) =>
      prev.map((p) => (p.id === type ? { ...p, count: p.count - 1 } : p))
    );
    return true;
  };

  // Power-up purchase
  const handleBuyPowerUp = (powerUpId: string, cost: number): boolean => {
    if (userDiscountPoints < cost) return false;

    setUserDiscountPoints((prev) => prev - cost);
    setPowerUpInventory((prev) =>
      prev.map((p) => (p.id === powerUpId ? { ...p, count: p.count + 1 } : p))
    );

    addNotification(
      'powerup',
      'Power-Up Dibeli!',
      `1 unit power-up baru telah ditambahkan ke inventory arena kamu.`
    );
    return true;
  };

  // Update username directly into the single source of truth (profile storage)
  const handleUpdateUsername = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2 || trimmed.length > 20) return;
    const saveRes = saveStoredProfile({ username: trimmed }, userDiscountPoints);
    if (saveRes.success) {
      setCurrentUsername(trimmed);
    }
  };

  // Leaderboard submit (persisted, keyed to player ID, using synchronized profile username)
  const handleSubmitScoreToLeaderboard = (customName?: string) => {
    const myId = getMyPlayerId();
    let finalName = (customName && customName.trim()) || '';
    if (finalName && finalName.length >= 2 && finalName.length <= 20) {
      // Synchronize back to profile storage
      saveStoredProfile({ username: finalName }, userDiscountPoints);
      setCurrentUsername(finalName);
    } else {
      finalName = getStoredProfile(userDiscountPoints).username || 'Pemain';
    }

    const existingEntry = leaderboard.find(
      (e) => e.isCurrentUser || (e.playerId && e.playerId === myId)
    );

    // Retain the highest score achieved so far or the current points
    const targetScore = existingEntry
      ? Math.max(existingEntry.score, userDiscountPoints)
      : userDiscountPoints;

    const newEntry: LeaderboardEntry = {
      rank: 1,
      username: finalName,
      score: targetScore,
      date: 'Hari Ini',
      badge: targetScore >= 1800 ? '👑 Juara 1 Nasional' : targetScore >= 1500 ? '🥈 Peringkat Top' : '🎯 Shooter Aktif',
      isCurrentUser: true,
      playerId: myId,
      rewardTier: 'Mendapatkan Voucher',
    };

    // Filter out old records for this player to prevent duplicates
    const others = leaderboard.filter(
      (e) => !e.isCurrentUser && (!e.playerId || e.playerId !== myId)
    );

    const merged = [...others, newEntry];
    merged.sort((a, b) => b.score - a.score);
    const updated = merged.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

    setLeaderboard(updated);
    try {
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(updated));
    } catch {}

    addNotification(
      'info',
      'Skor Berhasil Dikirim!',
      `Skor ${targetScore.toLocaleString('id-ID')} poin atas nama ${finalName} telah tercatat di Papan Peringkat Global.`
    );
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${
      themeMode === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Daily Login Challenge & Streak Modal */}
      <DailyChallengeModal
        isOpen={isDailyModalOpen}
        onClose={() => setIsDailyModalOpen(false)}
        onAddDiscountPoints={handleAddDiscountPoints}
        themeMode={themeMode}
      />

      {/* Dynamic Siren & Special Notification Toast */}
      <SpecialTargetNotification
        notifications={notifications}
        onDismiss={handleDismissNotification}
      />

      {/* Top Bar Navigation with Dark/White Switcher */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userPoints={userDiscountPoints}
        themeMode={themeMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 md:px-6 pt-4 md:pt-6 pb-8">
        {activeTab === 'multiplayer' && (
          <MultiplayerArena
            currentUsername={currentUsername}
            userDiscountPoints={userDiscountPoints}
            onAddDiscountPoints={handleAddDiscountPoints}
            onNavigateToCart={() => setActiveTab('powerups')}
            onNavigateToLeaderboard={() => setActiveTab('leaderboard')}
            onTriggerSpecialNotification={handleTriggerSpecialNotification}
            themeMode={themeMode}
          />
        )}

        {activeTab === 'shooter' && (
          <ShooterArena
            userDiscountPoints={userDiscountPoints}
            onAddDiscountPoints={handleAddDiscountPoints}
            powerUpInventory={powerUpInventory}
            onUsePowerUpItem={handleUsePowerUpItem}
            onNavigateToCart={() => setActiveTab('powerups')}
            onNavigateToLeaderboard={() => setActiveTab('leaderboard')}
            onTriggerSpecialNotification={handleTriggerSpecialNotification}
            themeMode={themeMode}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            leaderboard={leaderboard}
            currentUserScore={userDiscountPoints}
            currentUsername={currentUsername}
            onUpdateUsername={handleUpdateUsername}
            onSubmitScoreToLeaderboard={handleSubmitScoreToLeaderboard}
            onNavigateToShooter={() => setActiveTab('multiplayer')}
            themeMode={themeMode}
          />
        )}

        {activeTab === 'powerups' && (
          <PowerUpStore
            userPoints={userDiscountPoints}
            powerUpInventory={powerUpInventory}
            onBuyPowerUp={handleBuyPowerUp}
            onNavigateToShooter={() => setActiveTab('multiplayer')}
            themeMode={themeMode}
          />
        )}
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t py-6 px-6 text-xs transition-colors duration-200 ${
        themeMode === 'dark' 
          ? 'border-slate-800 bg-slate-950 text-slate-500' 
          : 'border-slate-200 bg-white text-slate-500 shadow-inner'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex items-center gap-2 font-bold">
            <span className={themeMode === 'dark' ? 'text-white' : 'text-slate-900'}>TANK ARENA: SKY CLASH</span>
            <span>·</span>
            <span className="text-cyan-500">Real-Time Tactical Tank Combat Arena</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] opacity-80">
            <span>Mode: 1v1 · 2v2 · 3v3 · 4v4 TDM</span>
            <span>·</span>
            <span>Reset Peringkat Mingguan Setiap Minggu 23:59 WIB</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
