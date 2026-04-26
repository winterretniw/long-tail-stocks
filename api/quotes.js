// Vercel Serverless Function — Yahoo Finance proxy (with crumb auth)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols param required' });

  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  try {
    // ── Step 1: เปิด Yahoo Finance เพื่อรับ session cookie ──
    const homeRes = await fetch('https://finance.yahoo.com/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html' },
      redirect: 'follow',
    });

    // รวม cookies ทั้งหมด
    const rawCookie = homeRes.headers.get('set-cookie') || '';
    const cookies = rawCookie
      .split(/,(?=[^;]+=[^;]+)/)
      .map(c => c.split(';')[0].trim())
      .filter(Boolean)
      .join('; ');

    // ── Step 2: ขอ crumb ──
    const crumbRes = await fetch(
      'https://query1.finance.yahoo.com/v1/test/getcrumb',
      { headers: { 'User-Agent': UA, 'Cookie': cookies } }
    );
    const crumb = await crumbRes.text();

    if (!crumb || crumb.includes('{')) {
      throw new Error('ได้รับ crumb ไม่ถูกต้อง');
    }

    // ── Step 3: ดึงราคาหุ้นพร้อม crumb ──
    const quoteUrl =
      `https://query1.finance.yahoo.com/v7/finance/quote` +
      `?lang=en&region=US&symbols=${encodeURIComponent(symbols)}` +
      `&crumb=${encodeURIComponent(crumb)}`;

    const quoteRes = await fetch(quoteUrl, {
      headers: {
        'User-Agent': UA,
        'Cookie': cookies,
        'Accept': 'application/json',
      },
    });

    if (!quoteRes.ok) {
      throw new Error(`Yahoo Finance ตอบกลับ ${quoteRes.status}`);
    }

    const data = await quoteRes.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
