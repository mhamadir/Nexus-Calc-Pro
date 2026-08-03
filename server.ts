import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

let serverDbInstance: any = null;

function getServerDb() {
  if (!serverDbInstance) {
    try {
      const serverApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      serverDbInstance = firebaseConfig.firestoreDatabaseId 
        ? getFirestore(serverApp, firebaseConfig.firestoreDatabaseId)
        : getFirestore(serverApp);
    } catch (err) {
      console.error('[Firestore] Error initializing Firestore client:', err);
      return null;
    }
  }
  return serverDbInstance;
}

const botTokenCache = new Map<string, string>();

async function unblockUserInFirestore(uid: string) {
  try {
    const db = getServerDb();
    if (!db) return false;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status: 'active',
      activeDeviceId: null,
      failedDeviceAttempts: 0,
      lastAttemptDeviceId: null,
      blockedReason: null,
      updatedAt: new Date().toISOString()
    });
    console.log(`[Firestore] Successfully unblocked user ${uid} & reset device fingerprint.`);
    return true;
  } catch (err) {
    console.error(`[Firestore] Error unblocking user ${uid}:`, err);
    return false;
  }
}

async function blockUserInFirestore(uid: string) {
  try {
    const db = getServerDb();
    if (!db) return false;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status: 'blocked',
      blockedReason: 'manual',
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error(`[Firestore] Error blocking user ${uid}:`, err);
    return false;
  }
}

async function approveUserInFirestore(uid: string) {
  try {
    const db = getServerDb();
    if (!db) return false;
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      status: 'active',
      activeDeviceId: null,
      failedDeviceAttempts: 0,
      lastAttemptDeviceId: null,
      blockedReason: null,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error(`[Firestore] Error approving user ${uid}:`, err);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Anti-VPN & Proxy Detection endpoint
  app.get('/api/check-vpn', async (req, res) => {
    try {
      // Extract client IP from request headers or remote address
      const clientIpHeader = (req.headers['x-forwarded-for'] as string) ||
                             (req.headers['cf-connecting-ip'] as string) ||
                             (req.headers['x-real-ip'] as string) ||
                             req.socket.remoteAddress || '';
      
      const clientIp = clientIpHeader.split(',')[0].trim();

      // Header-based proxy / VPN indicators
      const hasViaHeader = !!req.headers['via'];
      const hasProxyHeader = !!req.headers['x-proxy-id'] || !!req.headers['proxy-connection'];

      // If headers explicitly flag proxy
      if (hasViaHeader || hasProxyHeader) {
        return res.json({
          isVpn: true,
          ip: clientIp || 'Anonymous IP',
          provider: 'Proxy Connection Header',
          reason: 'Proxy or VPN header detected on connection.'
        });
      }

      // Query external IP intelligence API if valid public IP is available
      if (clientIp && !clientIp.startsWith('127.') && !clientIp.startsWith('10.') && !clientIp.startsWith('192.168.') && clientIp !== '::1') {
        try {
          const ipRes = await fetch(`https://ip-api.com/json/${clientIp}?fields=status,country,isp,org,proxy,hosting,query`, {
            signal: AbortSignal.timeout(3000)
          });
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            const isVpn = !!(ipData.proxy || ipData.hosting);
            return res.json({
              isVpn,
              ip: ipData.query || clientIp,
              country: ipData.country,
              provider: ipData.isp || ipData.org,
              reason: isVpn ? 'Datacenter / Hosting / VPN exit node detected.' : undefined
            });
          }
        } catch (_) {}
      }

      res.json({
        isVpn: false,
        ip: clientIp || 'Unknown'
      });
    } catch (err: any) {
      res.json({ isVpn: false, error: err.message });
    }
  });

  // Explicit endpoint to unblock user & reset device fingerprint
  app.post('/api/unblock-user', async (req, res) => {
    try {
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: 'Missing uid parameter' });
      const success = await unblockUserInFirestore(uid);
      if (success) {
        return res.json({ success: true, message: 'User unblocked and device reset successfully.' });
      } else {
        return res.status(500).json({ error: 'Failed to update Firestore' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error unblocking user' });
    }
  });

  // Proxy endpoint to send Telegram messages cleanly
  app.post('/api/send-telegram', async (req, res) => {
    try {
      const { botToken, chatId, text, uid, replyMarkup } = req.body;
      if (!botToken || !chatId || !text || !uid) {
        return res.status(400).json({ error: 'Missing botToken, chatId, text, or uid' });
      }

      botTokenCache.set(String(chatId), botToken);

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup || {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `approve:${uid}` },
              { text: '🚫 Reject / Block', callback_data: `block:${uid}` }
            ]
          ]
        }
      };

      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      res.json(data);
    } catch (err: any) {
      console.error('Error sending Telegram notification:', err);
      res.status(500).json({ error: err.message || 'Failed to send Telegram message' });
    }
  });

  // Telegram Webhook Callback Endpoint
  app.post('/api/telegram-webhook', async (req, res) => {
    try {
      const update = req.body;
      if (update && update.callback_query) {
        const callbackQuery = update.callback_query;
        const callbackQueryId = callbackQuery.id;
        const dataStr = callbackQuery.data || '';
        const [action, uid] = dataStr.split(':');
        const message = callbackQuery.message;
        const chatId = message?.chat?.id;
        const messageId = message?.message_id;

        console.log(`Telegram webhook trigger -> Action: ${action}, UID: ${uid}, ChatID: ${chatId}`);

        // Immediate acknowledgment response to Telegram
        res.json({ ok: true });

        const botToken = (chatId ? botTokenCache.get(String(chatId)) : null) ||
                         req.headers['x-telegram-bot-token'] as string ||
                         process.env.TELEGRAM_BOT_TOKEN;

        if (action === 'unblock' || action === 'unblock_device') {
          // 1. Instantly update user status to 'active', reset counter & device ID in Firebase
          await unblockUserInFirestore(uid);

          if (botToken && chatId && messageId) {
            // Toast notification back to Telegram
            fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: 'User Unblocked & Device Reset',
                show_alert: true
              })
            }).catch(() => {});

            // Dynamically update the Telegram inline button text to: "[ User Unblocked & Device Reset ]"
            fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '[ User Unblocked & Device Reset ]', callback_data: `done:${uid}` }
                    ]
                  ]
                }
              })
            }).catch(() => {});
          }
        } else if (action === 'approve') {
          await approveUserInFirestore(uid);

          if (botToken && chatId && messageId) {
            fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: 'User Access Approved',
                show_alert: false
              })
            }).catch(() => {});

            fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '[ User Approved & Unlocked ]', callback_data: `done:${uid}` }
                    ]
                  ]
                }
              })
            }).catch(() => {});
          }
        } else if (action === 'block') {
          await blockUserInFirestore(uid);

          if (botToken && chatId && messageId) {
            fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: 'User Blocked',
                show_alert: false
              })
            }).catch(() => {});

            fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: '🔓 Unblock & Reset Device', callback_data: `unblock:${uid}` }
                    ]
                  ]
                }
              })
            }).catch(() => {});
          }
        }
        return;
      }

      res.json({ ok: true });
    } catch (err) {
      console.error('Telegram webhook error:', err);
      res.status(500).json({ error: 'Webhook error' });
    }
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
