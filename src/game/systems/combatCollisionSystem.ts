import { TeamId, CharacterClass } from '../../types';
import { MAP_THEMES_CONFIG } from '../../config/mapThemesConfig';
import { WORLD_WIDTH, WORLD_HEIGHT, SimPlayer, SimBullet, SimBoss, CollectibleSkill, MapTheme } from '../../types/multiplayerTypes';
import { soundEngine } from '../../utils/audio';
import { incrementDailyQuestProgress } from '../../utils/dailyChallenge';

interface UpdateCombatCollisionParams {
  sim: {
    players: SimPlayer[];
    bullets: SimBullet[];
    boss: SimBoss | null;
    skills: CollectibleSkill[];
    shoppingParticles: any[];
    blueScore: number;
    redScore: number;
    currentTheme: MapTheme;
  };
  dt: number;
  isLocalPlayer: (id: string) => boolean;
  getCharacterStats: (charClass?: CharacterClass) => { maxHp: number; speedMultiplier: number; damageMultiplier: number };
  addDamageText: (text: string, x: number, y: number, color: string) => void;
  addKillFeed: (killer: string, victim: string, team: TeamId) => void;
}

export const updateCombatCollisionSystem = ({
  sim,
  dt,
  isLocalPlayer,
  getCharacterStats,
  addDamageText,
  addKillFeed,
}: UpdateCombatCollisionParams) => {
  const themeConfig = MAP_THEMES_CONFIG[sim.currentTheme] || MAP_THEMES_CONFIG['mall'];

  // 1. Collectible In-Game Skills Check
  sim.skills.forEach((skill) => {
    if (!skill.isAvailable) {
      skill.respawnCooldown -= dt;
      if (skill.respawnCooldown <= 0) {
        skill.isAvailable = true;
      }
      return;
    }

    sim.players.forEach((p) => {
      if (p.isRespawning) return;
      const dist = Math.hypot(p.x - skill.x, p.y - skill.y);
      if (dist < 42 && skill.isAvailable) {
        skill.isAvailable = false;
        skill.respawnCooldown = 22;

        if (skill.type === 'heal') {
          p.hp = Math.min(p.maxHp, p.hp + 50);
          addDamageText('+50 HEAL!', p.x, p.y - 25, '#22c55e');
        } else {
          p.activeSkill = {
            type: skill.type,
            timeLeft: skill.duration,
          };
          addDamageText(`${skill.icon} ${skill.label}!`, p.x, p.y - 25, skill.color);
        }

        if (isLocalPlayer(p.id)) {
          soundEngine.playPowerUp();
        }
      }
    });
  });

  // 2. Update Bullets & Collisions
  if (sim.bullets.length > 150) {
    sim.bullets.splice(0, sim.bullets.length - 120);
  }
  if (sim.shoppingParticles && sim.shoppingParticles.length > 100) {
    sim.shoppingParticles.splice(0, sim.shoppingParticles.length - 80);
  }

  for (let i = sim.bullets.length - 1; i >= 0; i--) {
    const b = sim.bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    b.life -= 1;

    if (b.x < 0 || b.x > WORLD_WIDTH || b.y < 0 || b.y > WORLD_HEIGHT || b.life <= 0) {
      sim.bullets.splice(i, 1);
      continue;
    }

    let hitObs = false;
    for (const obs of themeConfig.obstacles) {
      if (b.x > obs.x && b.x < obs.x + obs.w && b.y > obs.y && b.y < obs.y + obs.h) {
        hitObs = true;
        break;
      }
    }
    if (hitObs) {
      sim.bullets.splice(i, 1);
      continue;
    }

    let hitPlayer = false;
    for (const target of sim.players) {
      if (target.team !== b.team && !target.isRespawning) {
        const hasShieldSkill = target.activeSkill?.type === 'shield';
        if (target.isShielded || hasShieldSkill) {
          const dist = Math.hypot(target.x - b.x, target.y - b.y);
          if (dist < 32) {
            hitPlayer = true;
            addDamageText('BLOCKED!', target.x, target.y - 15, '#38bdf8');
            break;
          }
        } else {
          const dist = Math.hypot(target.x - b.x, target.y - b.y);
          if (dist < 26) {
            hitPlayer = true;
            const shooter = sim.players.find((p) => p.id === b.shooterId);
            const shooterStats = getCharacterStats(shooter?.customization?.characterClass);
            const rawDmg = Math.floor(b.damage * (shooterStats?.damageMultiplier || 1.0));

            const isTanker = target.customization?.characterClass === 'tanker';
            const damageReduction = isTanker ? 0.6 : 1.0;
            const finalDmg = Math.max(4, Math.round(rawDmg * damageReduction));

            target.hp = Math.max(0, target.hp - finalDmg);
            addDamageText(`-${finalDmg}`, target.x, target.y - 10, b.team === 'blue' ? '#22c55e' : '#f59e0b');
            soundEngine.playHit(target.hp === 0);

            if (target.hp === 0) {
              target.deaths += 1;
              target.isRespawning = true;
              target.respawnTimer = 3.5;

              soundEngine.playShoppingPop();
              for (let sp = 0; sp < 18; sp++) {
                const angle = Math.random() * Math.PI * 2;
                const speedVal = 2 + Math.random() * 6;
                const pTypes: ('receipt' | 'coin' | 'bag')[] = ['receipt', 'coin', 'bag'];
                const chosenType = pTypes[Math.floor(Math.random() * pTypes.length)];
                const pColor = chosenType === 'coin' ? '#fbbf24' : chosenType === 'bag' ? '#f43f5e' : '#f8fafc';

                sim.shoppingParticles.push({
                  x: target.x,
                  y: target.y,
                  vx: Math.cos(angle) * speedVal,
                  vy: Math.sin(angle) * speedVal - 1.5,
                  rotation: Math.random() * Math.PI * 2,
                  vRot: (Math.random() - 0.5) * 0.15,
                  type: chosenType,
                  color: pColor,
                  alpha: 1.0,
                  scale: 0.7 + Math.random() * 0.6,
                });
              }

              const shooter = sim.players.find((p) => p.id === b.shooterId);
              if (shooter) {
                shooter.kills += 1;
                shooter.score += 100;
                addKillFeed(shooter.name, target.name, b.team);

                if (isLocalPlayer(b.shooterId)) {
                  incrementDailyQuestProgress('kill', 1);
                  incrementDailyQuestProgress('score', 100);
                }
              }

              if (b.team === 'blue') sim.blueScore += 1;
              else sim.redScore += 1;
            }
            break;
          }
        }
      }
    }
    if (hitPlayer) {
      sim.bullets.splice(i, 1);
      continue;
    }

    if (sim.boss && sim.boss.hp > 0) {
      const bossDist = Math.hypot(sim.boss.x - b.x, sim.boss.y - b.y);
      if (bossDist < 38) {
        sim.boss.hp = Math.max(0, sim.boss.hp - b.damage);
        addDamageText(`-${b.damage}`, sim.boss.x, sim.boss.y - 20, '#fbbf24');
        soundEngine.playHit(false);

        if (sim.boss.hp === 0) {
          soundEngine.playPowerUp();
          if (b.team === 'blue') sim.blueScore += 3;
          else sim.redScore += 3;

          addDamageText('+300 BOSS VOUCHER!', sim.boss.x, sim.boss.y - 40, '#f59e0b');
          if (isLocalPlayer(b.shooterId)) {
            incrementDailyQuestProgress('score', 300);
          }
        }

        sim.bullets.splice(i, 1);
        continue;
      }
    }
  }

  // 3. Update Boss Position
  if (sim.boss && sim.boss.hp > 0) {
    sim.boss.x += sim.boss.vx;
    sim.boss.y += sim.boss.vy;
    if (sim.boss.x < 900 || sim.boss.x > 1300) sim.boss.vx *= -1;
    if (sim.boss.y < 480 || sim.boss.y > 800) sim.boss.vy *= -1;
  }
};
