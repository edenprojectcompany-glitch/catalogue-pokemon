// api/record-spin.js — Spin unique par compte, vérifié côté serveur (Redis source de vérité)
import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const getUser = async (email) => {
      const key = `user:${email.toLowerCase().trim()}`;
      return await redis.get(key);
    };

    // ── GET : vérifie si l'utilisateur peut spinner ─────────────────────────
    if (req.method === 'GET') {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: 'Email requis' });

      const user = await getUser(email);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

      const lastSpin = user.lastSpin ? new Date(user.lastSpin).getTime() : null;
      if (!lastSpin || !user.wheelUsed) {
        return res.json({ canSpin: true, nextSpin: null });
      }
      const elapsed = Date.now() - lastSpin;
      if (elapsed >= THIRTY_DAYS_MS) {
        return res.json({ canSpin: true, nextSpin: null });
      }
      const nextSpin = lastSpin + THIRTY_DAYS_MS;
      return res.json({ canSpin: false, nextSpin });
    }

    // ── POST : tente d'enregistrer le spin (atomique) ────────────────────────
    if (req.method === 'POST') {
      const { email, coupon, fp } = req.body;
      if (!email) return res.status(400).json({ error: 'Email requis' });

      const emailKey = email.toLowerCase().trim();
      const key = `user:${emailKey}`;
      const user = await redis.get(key);
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

      // Vérification serveur : déjà spinné dans les 30 jours ?
      const lastSpin = user.lastSpin ? new Date(user.lastSpin).getTime() : null;
      if (lastSpin && user.wheelUsed) {
        const elapsed = Date.now() - lastSpin;
        if (elapsed < THIRTY_DAYS_MS) {
          const nextSpin = lastSpin + THIRTY_DAYS_MS;
          return res.status(403).json({
            error: 'Spin déjà utilisé',
            canSpin: false,
            nextSpin
          });
        }
      }

      // OK → enregistrer le spin dans Redis
      const now = new Date().toISOString();
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
               || req.headers['x-real-ip'] || 'unknown';

      const updated = {
        ...user,
        wheelUsed: true,
        lastSpin: now,
        coupon: coupon || user.coupon || null
      };
      await redis.set(key, updated);

      // Anti-fraude fingerprint
      if (fp) {
        await redis.set(`spin:fp:${fp}`, { userId: user.id, ip, date: now }, { ex: 30*24*60*60 });
      }
      if (ip && ip !== 'unknown') {
        await redis.set(`spin:ip:${ip}`, { userId: user.id, fp, date: now }, { ex: 30*24*60*60 });
      }

      console.log(JSON.stringify({ event: 'wheel_spin_recorded', email: emailKey, ip, date: now }));

      return res.status(200).json({ ok: true, lastSpin: now });
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch(err) {
    console.error('record-spin error:', err);
    return res.status(500).json({ error: err.message });
  }
}
