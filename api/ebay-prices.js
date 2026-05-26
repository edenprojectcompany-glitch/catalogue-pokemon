// api/ebay-prices.js — Prix eBay en temps réel
// Les clés sont dans les variables d'environnement Vercel

const SEARCH_TERMS = {
  CN151vol3:   'Pokemon CN151 Vol.3 display sealed chinese',
  CN151vol4:   'Pokemon CN151 Vol.4 display sealed chinese',
  CN151vol1:   'Pokemon CN151 Vol.1 display sealed chinese',
  CN151vol2:   'Pokemon CN151 Vol.2 display sealed chinese',
  GempackVol3: 'Pokemon Gempack Vol.3 display sealed chinese',
  GempackVol2: 'Pokemon Gempack Vol.2 display sealed chinese',
  GempackVol4: 'Pokemon Gempack Vol.4 display sealed chinese',
  GempackVol5: 'Pokemon Gempack Vol.5 display sealed chinese',
  M2a:         'Pokemon Mega Dream EX display sealed japanese',
  M2:          'Pokemon Mega Inferno X display sealed japanese',
  M1L:         'Pokemon Mega Brave display sealed japanese',
  M1s:         'Pokemon Mega Symphonia display sealed japanese',
  M3:          'Pokemon Nihil Zero display sealed japanese',
  SV8a:        'Pokemon SV8a Terastal Festival display sealed',
  SV9:         'Pokemon SV9 Battle Partners display sealed',
  SV9a:        'Pokemon SV9a Heat Wave Arena display sealed',
  SV10:        'Pokemon SV10 Glory Team Rocket display sealed',
  SV11b:       'Pokemon SV11b Black Bolt display sealed',
  SV11w:       'Pokemon SV11w White Flare display sealed',
  SV2a151:     'Pokemon 151 SV2a display sealed japanese',
  M5:          'Pokemon Mega Abyss Eye display sealed japanese',
};

async function getEbayToken() {
  // Keys stored in Vercel environment variables
  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) throw new Error('eBay credentials not configured');
  
  const credentials = Buffer.from(`${appId}:${certId}`).toString('base64');
  const resp = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function searchEbayPrice(token, query) {
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&filter=buyingOptions:{FIXED_PRICE},conditions:{NEW},deliveryCountry:FR&sort=price&limit=5`;
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR',
      'Accept': 'application/json',
    }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (!data.itemSummaries?.length) return null;
  const prices = data.itemSummaries
    .map(item => parseFloat(item.price?.value))
    .filter(p => !isNaN(p) && p > 20)
    .sort((a, b) => a - b);
  if (!prices.length) return null;
  return Math.round(prices[Math.floor(prices.length / 2)]);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=21600');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const token = await getEbayToken();
    const prices = {};
    const { id } = req.query;
    const toFetch = id && SEARCH_TERMS[id] ? { [id]: SEARCH_TERMS[id] } : SEARCH_TERMS;
    for (const [productId, query] of Object.entries(toFetch)) {
      try {
        const price = await searchEbayPrice(token, query);
        if (price) prices[productId] = price;
        await new Promise(r => setTimeout(r, 150));
      } catch(e) { console.error(productId, e.message); }
    }
    return res.status(200).json({ prices, updated: new Date().toISOString(), source: 'ebay_live' });
  } catch(err) {
    console.error('eBay error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
