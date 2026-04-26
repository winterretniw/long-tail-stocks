// Vercel Serverless Function — Yahoo Finance proxy
// Path: /api/quotes?symbols=ASTS,RKLB,...

export default async function handler(req, res) {
  // Allow CORS from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'symbols query param required' });
  }

  const YF_URL =
    `https://query2.finance.yahoo.com/v7/finance/quote` +
    `?lang=en&region=US&symbols=${encodeURIComponent(symbols)}`;

  try {
    const response = await fetch(YF_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
          'AppleWebKit/537.36 (KHTML, like Gecko) ' +
          'Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Yahoo Finance returned ${response.status}`,
      });
    }

    const data = await response.json();
    // Cache 60 seconds on Vercel edge
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
