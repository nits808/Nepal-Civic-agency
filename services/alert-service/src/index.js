// ═══════════════════════════════════════════════════════════════
// Nepal Civic Intelligence Graph 3.0 — Real-Time Alert Service
// WebSocket-based alert broadcasting with Kafka consumption,
// user preference matching, and multi-channel notification
// ═══════════════════════════════════════════════════════════════

import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';

const PORT = parseInt(process.env.PORT || '4003');
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const REDIS_URL = process.env.REDIS_URL || 'redis://:nepal_civic_2026@localhost:6379';

const redis = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL);

// ── WebSocket Client Registry ─────────────────────────────────
// Map of channelName -> Set of WebSocket connections
const channels = new Map();
const clientSubscriptions = new Map(); // ws -> Set of channels

function addToChannel(channelName, ws) {
  if (!channels.has(channelName)) {
    channels.set(channelName, new Set());
  }
  channels.get(channelName).add(ws);

  if (!clientSubscriptions.has(ws)) {
    clientSubscriptions.set(ws, new Set());
  }
  clientSubscriptions.get(ws).add(channelName);
}

function removeClient(ws) {
  const subs = clientSubscriptions.get(ws);
  if (subs) {
    for (const channel of subs) {
      channels.get(channel)?.delete(ws);
      if (channels.get(channel)?.size === 0) {
        channels.delete(channel);
      }
    }
  }
  clientSubscriptions.delete(ws);
}

function broadcastToChannel(channelName, message) {
  const clients = channels.get(channelName);
  if (!clients) return 0;

  let sent = 0;
  const data = typeof message === 'string' ? message : JSON.stringify(message);

  for (const ws of clients) {
    try {
      if (ws.readyState === 1) { // OPEN
        ws.send(data);
        sent++;
      }
    } catch (e) {
      removeClient(ws);
    }
  }
  return sent;
}

function broadcastToAll(message) {
  let total = 0;
  for (const [channelName] of channels) {
    total += broadcastToChannel(channelName, message);
  }
  return total;
}

// ── Alert Types & Channels ────────────────────────────────────
// Channel naming: {type}.{location}
// Examples:
//   disaster.bagmati-province
//   policy.ministry-of-finance
//   news.kathmandu
//   personal.{userId}
//   all (broadcasts to everyone)

const ALERT_TYPES = ['disaster', 'policy', 'news', 'health', 'economic'];

function getAlertChannels(alert) {
  const channels = ['all'];

  if (alert.type) channels.push(alert.type);
  if (alert.province) channels.push(`${alert.type}.${slugify(alert.province)}`);
  if (alert.district) channels.push(`news.${slugify(alert.district)}`);
  if (alert.ministry) channels.push(`policy.${slugify(alert.ministry)}`);

  return channels;
}

function slugify(text) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

// ── Kafka Consumer ────────────────────────────────────────────
const kafka = new Kafka({
  clientId: 'alert-service',
  brokers: KAFKA_BROKERS,
});

async function startKafkaConsumer() {
  const consumer = kafka.consumer({ groupId: 'alert-dispatcher-group' });
  await consumer.connect();

  await consumer.subscribe({
    topics: ['enriched.alerts', 'enriched.events'],
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      try {
        const data = JSON.parse(message.value.toString());

        const alert = {
          id: `alert-${Date.now()}`,
          type: data.type || data.category || 'news',
          title: data.title,
          message: data.summary_3line || data.summary || data.content?.slice(0, 200),
          severity: data.urgency || data.severity || 'info',
          province: data.primary_province,
          district: data.primary_district,
          ministry: data.ministry,
          sourceUrl: data.url,
          timestamp: new Date().toISOString(),
        };

        // Determine channels to broadcast to
        const targetChannels = getAlertChannels(alert);

        for (const channel of targetChannels) {
          const sent = broadcastToChannel(channel, {
            type: 'alert',
            channel,
            data: alert,
          });
          if (sent > 0) {
            console.log(`📢 Alert sent to ${sent} clients on channel: ${channel}`);
          }
        }

        // Also publish to Redis pub/sub for multi-instance support
        await redis.publish('ncig:alerts', JSON.stringify(alert));

        // Store in Redis for history (last 1000 alerts)
        await redis.lpush('alerts:history', JSON.stringify(alert));
        await redis.ltrim('alerts:history', 0, 999);

        // Update metrics
        await redis.incr('metrics:alerts:total');
        await redis.incr(`metrics:alerts:${alert.type}`);

      } catch (err) {
        console.error('Alert processing error:', err.message);
      }
    },
  });

  console.log('📡 Kafka consumer started for alerts');
}

// Redis pub/sub for multi-instance alert distribution
redisSub.subscribe('ncig:alerts');
redisSub.on('message', (channel, message) => {
  try {
    const alert = JSON.parse(message);
    const targetChannels = getAlertChannels(alert);
    for (const ch of targetChannels) {
      broadcastToChannel(ch, { type: 'alert', channel: ch, data: alert });
    }
  } catch (e) {
    // Ignore parse errors
  }
});

// ── Fastify Server ────────────────────────────────────────────
const app = Fastify({ logger: true });

await app.register(websocket);

// WebSocket endpoint
app.register(async function wsRoutes(fastify) {
  fastify.get('/ws', { websocket: true }, (socket, req) => {
    console.log('🔌 New WebSocket connection');

    // Default: subscribe to 'all' channel
    addToChannel('all', socket);

    // Send welcome message
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Nepal Civic Intelligence Graph alerts',
      channels: ['all'],
      timestamp: new Date().toISOString(),
    }));

    // Handle incoming messages (subscription management)
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.action) {
          case 'subscribe': {
            const ch = msg.channel;
            addToChannel(ch, socket);
            socket.send(JSON.stringify({
              type: 'subscribed',
              channel: ch,
              timestamp: new Date().toISOString(),
            }));
            console.log(`📡 Client subscribed to: ${ch}`);
            break;
          }

          case 'unsubscribe': {
            const ch = msg.channel;
            channels.get(ch)?.delete(socket);
            clientSubscriptions.get(socket)?.delete(ch);
            socket.send(JSON.stringify({
              type: 'unsubscribed',
              channel: ch,
            }));
            break;
          }

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            socket.send(JSON.stringify({ type: 'error', message: 'Unknown action' }));
        }
      } catch (e) {
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    socket.on('close', () => {
      removeClient(socket);
      console.log('🔌 WebSocket disconnected');
    });
  });
});

// REST API
app.get('/health', async () => ({
  status: 'healthy',
  service: 'alert-service',
  connectedClients: clientSubscriptions.size,
  activeChannels: channels.size,
  timestamp: new Date().toISOString(),
}));

app.get('/alerts', async (request) => {
  const { type, limit = 50 } = request.query;
  const alerts = await redis.lrange('alerts:history', 0, parseInt(limit) - 1);
  let parsed = alerts.map(a => JSON.parse(a));
  if (type) {
    parsed = parsed.filter(a => a.type === type);
  }
  return { alerts: parsed, total: parsed.length };
});

app.get('/alerts/metrics', async () => {
  const total = await redis.get('metrics:alerts:total') || '0';
  const byType = {};
  for (const type of ALERT_TYPES) {
    byType[type] = parseInt(await redis.get(`metrics:alerts:${type}`) || '0');
  }
  return { total: parseInt(total), byType };
});

// Manual alert broadcast (admin)
app.post('/alerts/broadcast', async (request) => {
  const alert = {
    id: `manual-${Date.now()}`,
    ...request.body,
    timestamp: new Date().toISOString(),
  };

  const channels = getAlertChannels(alert);
  let totalSent = 0;
  for (const ch of channels) {
    totalSent += broadcastToChannel(ch, { type: 'alert', channel: ch, data: alert });
  }

  await redis.lpush('alerts:history', JSON.stringify(alert));
  await redis.ltrim('alerts:history', 0, 999);

  return { message: 'Alert broadcast', sentTo: totalSent, channels };
});

app.get('/channels', async () => {
  const channelList = [];
  for (const [name, clients] of channels) {
    channelList.push({ name, subscribers: clients.size });
  }
  return { channels: channelList };
});

// ── Start ─────────────────────────────────────────────────────
async function start() {
  startKafkaConsumer().catch(err => {
    console.warn('Kafka consumer failed:', err.message);
    console.warn('Alert service running in API-only mode');
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`🔔 Alert Service running on port ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
