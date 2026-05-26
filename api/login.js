import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const user = await redis.get(`user:${email.toLowerCase().trim()}`);
    if (!user) return res.status(404).json({ error: 'Aucun compte avec cet email.' });
    if (user.password !== password) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    const { password: _, ...safeUser } = user;
    return res.status(200).json({ success: true, user: safeUser });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
}
