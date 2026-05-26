// api/record-spin.js — Vérifie et enregistre les spins côté serveur (Upstash Redis)
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // Vérifier le statut du spin pour un email donné
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'Email requis' });

      const key = `user:${email.toLowerCase().trim()}`;
      const user = await redis.get(key);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

      const lastSpin = user.lastSpin ? new Date(user.lastSpin).getTime() : null;
      if (!lastSpin || !user.wheelUsed) {
        return res.json({ canSpin: true, nextSpin: null });
      }
      const elapsed = Date.now() - lastSpin;
      if (elapsed >= THIRTY_DAYS_MS) {
        return res.json({ canSpin: true, nextSpin: null });
      }
      return res.json({ canSpin: false, nextSpin: lastSpin + THIRTY_DAYS_MS });
    }

    if (req.method === 'POST') {
      // Enregistrer un spin anti-fraude (fingerprint + IP)
      const { fp, userId, date, email } = req.body;
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
               || req.headers['x-real-ip']
               || 'unknown';

      console.log(JSON.stringify({
        event: 'wheel_spin',
        fingerprint: fp,
        userId,
        ip,
        date,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      }));

      // Stocker anti-fraude cross-device
      if (fp) {
        await redis.set(`spin:fp:${fp}`, { userId, ip, date }, { ex: 30*24*60*60 });
      }
      if (ip && ip !== 'unknown') {
        await redis.set(`spin:ip:${ip}`, { userId, fp, date }, { ex: 30*24*60*60 });
      }

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch(err) {
    console.error('record-spin error:', err);
    return res.status(500).json({ error: err.message });
  }
}
