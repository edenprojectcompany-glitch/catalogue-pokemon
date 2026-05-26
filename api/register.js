// api/register.js — Eden Project TCG
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET : récupérer un user par email (pour login) ────────────────
  if (req.method === 'GET') {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email requis' });
    const key = `user:${email.toLowerCase().trim()}`;
    const user = await kv.get(key);
    if (!user) return res.status(404).json({ error: 'Aucun compte avec cet email.' });
    return res.status(200).json({ success: true, user });
  }

  // ── POST : inscription ────────────────────────────────────────────
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prenom, nom, email, tel, adresse, cp, ville, password, createdAt } = req.body;
    if (!prenom || !nom || !email || !password) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const key = `user:${email.toLowerCase().trim()}`;

    // Vérifier si email déjà pris
    const existing = await kv.get(key);
    if (existing) return res.status(409).json({ error: 'Un compte existe déjà avec cet email.' });

    const user = {
      prenom, nom,
      email: email.toLowerCase().trim(),
      tel: tel || '',
      adresse: adresse || '',
      cp: cp || '',
      ville: ville || '',
      password, // déjà hashé côté client
      createdAt: createdAt || new Date().toISOString(),
      coupon: null
    };

    await kv.set(key, user);
    console.log(`✅ Nouvel inscrit: ${prenom} ${nom} (${email})`);

    // Retourner le user sans le password
    const { password: _, ...safeUser } = user;
    return res.status(200).json({ success: true, message: `Bienvenue ${prenom} !`, user: safeUser });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Erreur serveur: ' + err.message });
  }
}
