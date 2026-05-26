// api/record-spin.js — Enregistre les fingerprints de spin côté serveur
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { fp, userId, date } = req.body;
    // Get real IP from Vercel headers
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

    // If using Vercel KV, store for cross-device detection:
    // import { kv } from '@vercel/kv';
    // await kv.set(`spin:fp:${fp}`, { userId, ip, date }, { ex: 30*24*60*60 });
    // await kv.set(`spin:ip:${ip}`, { userId, fp, date }, { ex: 30*24*60*60 });

    return res.status(200).json({ ok: true });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
}
