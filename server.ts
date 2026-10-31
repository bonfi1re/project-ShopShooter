import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });
const viteWss = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) => {
    if (protocols.has('vite-hmr')) return 'vite-hmr';
    return Array.from(protocols)[0] || false;
  },
});

viteWss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'connected' }));
  ws.on('message', () => {});
});

server.on('upgrade', (req, socket, head) => {
  try {
    const { pathname } = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      viteWss.handleUpgrade(req, socket, head, (ws) => {
        viteWss.emit('connection', ws, req);
      });
    }
  } catch (err) {
    console.error('WebSocket upgrade error:', err);
    socket.destroy();
  }
});

app.use(express.json());

interface PlayerState {
  id: string;
  name?: string;
  username: string;
  team: 'blue' | 'red';
  color: string;
  x: number;
  y: number;
  angle: number;
  score: number;
  hp: number;
  maxHp: number;
  kills: number;
  deaths: number;
  isReady: boolean;
  isBot?: boolean;
  customization?: any;
  ws?: WebSocket;
}

interface RoomState {
  code: string;
  players: Record<string, PlayerState>;
  gameState: 'waiting' | 'playing' | 'ended';
  blueScore: number;
  redScore: number;
  timeLeft: number;
  totalSlots: number;
  bots: any[];
}

const rooms: Record<string, RoomState> = {};

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: string | null = null;
  let playerId: string | null = null;

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'join-room') {
        const { roomCode, player, totalSlots, asHost } = msg;
        console.log('Join room request:', { roomCode, playerID: player?.id, asHost });
        if (!roomCode || !player?.id) return;
        currentRoom = roomCode.toUpperCase();
        console.log('Current room set to:', currentRoom);
        playerId = player.id;

        if (currentRoom && (!rooms[currentRoom] || asHost)) {
          const slots = totalSlots || 4;
          rooms[currentRoom] = {
            code: currentRoom,
            players: {},
            gameState: 'waiting',
            blueScore: 0,
            redScore: 0,
            timeLeft: 90,
            totalSlots: slots,
            bots: [],
          };
        }

        if (currentRoom && playerId) {
          const room = rooms[currentRoom];
          const existingP = room.players[playerId];
          const humanEntries = Object.keys(room.players).length;
          // Player's chosen team if provided, otherwise preserve or balance
          const assignedTeam = player.team || existingP?.team || (humanEntries % 2 === 0 ? 'blue' : 'red');

          room.players[playerId] = {
            ...player,
            team: assignedTeam,
            color: assignedTeam === 'blue' ? '#38bdf8' : '#f43f5e',
            x: assignedTeam === 'blue' ? 220 + Math.random() * 60 : (2200 - 260) - Math.random() * 80,
            y: 440 + Math.random() * 400,
            angle: assignedTeam === 'blue' ? 0 : Math.PI,
            ws,
          };

          // Broadcast updated room state to all in room
          broadcastToRoom(currentRoom, {
            type: 'room-updated',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'change-team' && currentRoom && playerId) {
        const room = rooms[currentRoom];
        if (room && room.players[playerId]) {
          const newTeam = msg.team === 'red' ? 'red' : 'blue';
          room.players[playerId].team = newTeam;
          room.players[playerId].color = newTeam === 'blue' ? '#38bdf8' : '#f43f5e';
          room.players[playerId].x = newTeam === 'blue' ? 220 + Math.random() * 60 : (2200 - 260) - Math.random() * 80;
          room.players[playerId].y = 440 + Math.random() * 400;
          room.players[playerId].angle = newTeam === 'blue' ? 0 : Math.PI;
          broadcastToRoom(currentRoom, {
            type: 'room-updated',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'player-update' && currentRoom && playerId) {
        const room = rooms[currentRoom];
        if (room && room.players[playerId]) {
          Object.assign(room.players[playerId], msg.updates);
          // Broadcast to other players
          broadcastToRoom(currentRoom, {
            type: 'player-moved',
            playerId,
            updates: msg.updates,
          }, playerId);
        }
      } else if (msg.type === 'update-name' && currentRoom && playerId) {
        const room = rooms[currentRoom];
        if (room && room.players[playerId]) {
          room.players[playerId].username = msg.username;
          broadcastToRoom(currentRoom, {
            type: 'room-updated',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'player-shoot' && currentRoom && playerId) {
        broadcastToRoom(currentRoom, {
          type: 'bullet-fired',
          playerId,
          bullet: msg.bullet,
        }, playerId);
      } else if (msg.type === 'bot-hit' && currentRoom) {
        broadcastToRoom(currentRoom, {
          type: 'bot-damaged',
          botId: msg.botId,
          damage: msg.damage,
          scorerId: msg.scorerId,
          points: msg.points,
        });
      } else if (msg.type === 'add-bot' && currentRoom) {
        const room = rooms[currentRoom];
        if (room) {
          const currentCount = Object.keys(room.players).length;
          if (currentCount < room.totalSlots) {
            let botToAdd = msg.bot;
            if (!botToAdd) {
              const botNames = ['Sniper_Elite', 'Valkyrie', 'Titan_Heavy', 'Shadow_Blade', 'Nexus_Pro', 'Apex_Striker'];
              const botId = `server-bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              const team = currentCount % 2 === 0 ? 'red' : 'blue';
              const botDisplayName = `${botNames[currentCount % botNames.length]} (BOT)`;
              botToAdd = {
                id: botId,
                name: botDisplayName,
                username: botDisplayName,
                team,
                x: team === 'blue' ? 220 + Math.random() * 60 : (2200 - 260) - Math.random() * 80,
                y: team === 'blue' ? 380 + (currentCount * 80) : 740 + (currentCount * 80),
                angle: team === 'blue' ? 0 : Math.PI,
                score: 0,
                hp: 100,
                maxHp: 100,
                kills: 0,
                deaths: 0,
                isReady: true,
                isBot: true,
                color: team === 'blue' ? '#38bdf8' : '#f43f5e',
              };
            }
            room.players[botToAdd.id] = botToAdd;
            broadcastToRoom(currentRoom, {
              type: 'room-updated',
              room: sanitizeRoom(room),
            });
          } else {
            broadcastToRoom(currentRoom, {
              type: 'room-updated',
              room: sanitizeRoom(room),
            });
          }
        }
      } else if (msg.type === 'start-match' && currentRoom) {
        const room = rooms[currentRoom];
        if (room) {
          room.gameState = 'playing';
          room.timeLeft = 90;
          room.blueScore = 0;
          room.redScore = 0;
          broadcastToRoom(currentRoom, {
            type: 'match-started',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'kick-player' && currentRoom) {
        const room = rooms[currentRoom];
        if (room) {
          const targetId = msg.targetId;
          delete room.players[targetId];
          if (room.bots) {
            room.bots = room.bots.filter(b => b.id !== targetId);
          }
          broadcastToRoom(currentRoom, {
            type: 'room-updated',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'update-slots' && currentRoom) {
        const room = rooms[currentRoom];
        if (room && msg.totalSlots) {
          room.totalSlots = msg.totalSlots;
          broadcastToRoom(currentRoom, {
            type: 'room-updated',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'update-bot-team' && currentRoom) {
        const room = rooms[currentRoom];
        if (room) {
          const newTeam = msg.team === 'red' ? 'red' : 'blue';
          const newColor = newTeam === 'blue' ? '#38bdf8' : '#f43f5e';
          if (room.bots) {
            const b = room.bots.find(x => x.id === msg.botId);
            if (b) {
              b.team = newTeam;
              b.color = newColor;
              b.y = newTeam === 'blue' ? 380 + Math.random() * 80 : 740 + Math.random() * 80;
            }
          }
          if (room.players[msg.botId]) {
            room.players[msg.botId].team = newTeam;
            room.players[msg.botId].color = newColor;
            room.players[msg.botId].y = newTeam === 'blue' ? 380 + Math.random() * 80 : 740 + Math.random() * 80;
          }
          broadcastToRoom(currentRoom, {
            type: 'room-updated',
            room: sanitizeRoom(room),
          });
        }
      } else if (msg.type === 'delete-room' && currentRoom) {
        const roomToDel = currentRoom;
        delete rooms[roomToDel];
        broadcastToRoom(roomToDel, {
          type: 'room-deleted',
          roomCode: roomToDel,
        });
        currentRoom = null;
      } else if (msg.type === 'leave-room' && currentRoom && playerId) {
        const room = rooms[currentRoom];
        if (room) {
          delete room.players[playerId];
          if (Object.keys(room.players).length === 0) {
            delete rooms[currentRoom];
          } else {
            broadcastToRoom(currentRoom, {
              type: 'player-left',
              playerId,
              room: sanitizeRoom(room),
            });
          }
        }
        currentRoom = null;
      } else if (msg.type === 'end-match' && currentRoom) {
        const room = rooms[currentRoom];
        if (room) {
          room.gameState = 'ended';
          broadcastToRoom(currentRoom, {
            type: 'match-ended',
            room: sanitizeRoom(room),
          });
        }
      }
    } catch (err) {
      console.error('WS Error:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoom && playerId && rooms[currentRoom]) {
      delete rooms[currentRoom].players[playerId];
      if (Object.keys(rooms[currentRoom].players).length === 0) {
        delete rooms[currentRoom];
      } else {
        broadcastToRoom(currentRoom, {
          type: 'player-left',
          playerId,
          room: sanitizeRoom(rooms[currentRoom]),
        });
      }
    }
  });
});

function broadcastToRoom(roomCode: string, payload: any, excludePlayerId?: string) {
  const room = rooms[roomCode];
  if (!room) return;
  const str = JSON.stringify(payload);
  Object.entries(room.players).forEach(([pId, p]) => {
    if (excludePlayerId && pId === excludePlayerId) return;
    if (p.ws && p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(str);
    }
  });
}

function sanitizeRoom(room: RoomState) {
  const sanitizedPlayers: Record<string, any> = {};
  Object.entries(room.players).forEach(([id, p]) => {
    sanitizedPlayers[id] = {
      id: p.id,
      name: p.name || p.username || 'Pemain',
      username: p.username || p.name || 'Pemain',
      team: p.team || 'blue',
      color: p.color,
      x: p.x,
      y: p.y,
      angle: p.angle,
      score: p.score,
      hp: p.hp,
      maxHp: p.maxHp || 100,
      kills: p.kills || 0,
      deaths: p.deaths || 0,
      isReady: p.isReady,
      isBot: p.isBot || false,
      customization: p.customization,
    };
  });

  if (room.bots) {
    room.bots.forEach(bot => {
      if (!sanitizedPlayers[bot.id]) {
        sanitizedPlayers[bot.id] = {
          ...bot,
          name: bot.name || bot.username || 'Pemain',
          username: bot.username || bot.name || 'Pemain',
        };
      }
    });
  }

  return {
    code: room.code,
    players: sanitizedPlayers,
    gameState: room.gameState,
    blueScore: room.blueScore || 0,
    redScore: room.redScore || 0,
    timeLeft: room.timeLeft,
    totalSlots: room.totalSlots || 4,
  };
}

// REST health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', activeRooms: Object.keys(rooms).length });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  // AI Studio requires dev server on port 3000. In Cloud Run container, PORT may be 8080 (used by Nginx).
  const envPort = Number(process.env.PORT);
  const PORT = (envPort && envPort !== 8080) ? envPort : (Number(process.env.DEFAULT_APP_PORT) || 3000);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`  ➜  Local:   http://localhost:${PORT}/`);
    console.log(`  ➜  Network: http://0.0.0.0:${PORT}/`);
  });
}

startServer();
