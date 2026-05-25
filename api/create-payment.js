// api/create-payment.js — Eden Project TCG
// Crée un PaymentIntent Stripe sécurisé

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { amount, currency = 'eur', customer, items } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // centimes
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        customer_name: customer?.name || 'Invité',
        customer_email: customer?.email || '',
        items: JSON.stringify(items?.map(i => `${i.qty}x ${i.ref} @${i.price}€`) || [])
      },
      receipt_email: customer?.email || undefined,
      description: `Eden Project TCG — Commande ${items?.map(i => i.ref).join(', ')}`
    });

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: err.message });
  }
}
