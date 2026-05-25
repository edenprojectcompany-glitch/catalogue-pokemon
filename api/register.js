// api/register.js — Eden Project TCG
// Collecte les inscriptions clients et les stocke dans un fichier JSON (KV Vercel ou fichier)
// Pour une vraie base de données, remplacez par Vercel KV ou Supabase.

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prenom, nom, email, tel, adresse, cp, ville, createdAt } = req.body;

    // Validation basique
    if (!prenom || !nom || !email) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // ── Option 1 : Vercel KV (recommandé, gratuit jusqu'à 30 000 req/mois) ──────
    // Décommentez si vous ajoutez @vercel/kv dans package.json
    // import { kv } from '@vercel/kv';
    // const key = `user:${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    // await kv.set(key, { prenom, nom, email, tel, adresse, cp, ville, createdAt });
    // const allKeys = await kv.keys('user:*');
    // console.log(`✅ Inscrit: ${prenom} ${nom} (${email}) — Total: ${allKeys.length}`);

    // ── Option 2 : Email via Resend (gratuit 3 000 emails/mois) ─────────────────
    // Décommentez et ajoutez RESEND_API_KEY dans les variables d'environnement Vercel
    /*
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Eden Project TCG <noreply@edenprojecttcg.com>',
        to: ['Edenprojectcompany@gmail.com'],
        subject: `🌸 Nouvelle inscription: ${prenom} ${nom}`,
        html: `
          <h2>Nouvelle inscription Eden Project TCG</h2>
          <table>
            <tr><td><b>Prénom</b></td><td>${prenom}</td></tr>
            <tr><td><b>Nom</b></td><td>${nom}</td></tr>
            <tr><td><b>Email</b></td><td>${email}</td></tr>
            <tr><td><b>Téléphone</b></td><td>${tel || '—'}</td></tr>
            <tr><td><b>Adresse</b></td><td>${adresse || '—'}</td></tr>
            <tr><td><b>CP</b></td><td>${cp || '—'}</td></tr>
            <tr><td><b>Ville</b></td><td>${ville || '—'}</td></tr>
            <tr><td><b>Date</b></td><td>${createdAt}</td></tr>
          </table>
        `
      })
    });
    */

    // ── Log basique (toujours actif, visible dans Vercel Functions logs) ─────────
    console.log(JSON.stringify({
      event: 'new_user',
      prenom, nom, email, tel: tel || null,
      adresse: adresse || null, cp: cp || null, ville: ville || null,
      createdAt
    }));

    return res.status(200).json({ success: true, message: `Bienvenue ${prenom} !` });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
