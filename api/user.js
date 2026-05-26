// api/user.js — Eden Project TCG — mise à jour profil
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, updates } = req.body;
    if (!email) return res.status(400).json({ error: 'Email requis' });

    const key = `user:${email.toLowerCase().trim()}`;
    const user = await kv.get(key);
    if (!user) return res.status(404).json({ error: 'Compte introuvable' });

    const updated = { ...user, ...updates };
    await kv.set(key, updated);

    const { password: _, ...safeUser } = updated;
    return res.status(200).json({ success: true, user: safeUser });

  } catch (err) {
    console.error('User update error:', err);
    return res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
}
