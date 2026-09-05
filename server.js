require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 3000;

app.disable('x-powered-by');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '7d', etag: true }));

const contactRequests = new Map();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

app.get('/', (_req, res) => {
  res.render('index');
});

app.post('/api/contact', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const company = typeof req.body?.company === 'string' ? req.body.company.trim().slice(0, 120) : '';
  const website = typeof req.body?.website === 'string' ? req.body.website.trim() : '';
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const recent = (contactRequests.get(ip) || []).filter((time) => now - time < 60 * 60 * 1000);

  if (website) return res.status(200).json({ ok: true }); // Honeypot: bots receive a benign response.
  if (!emailPattern.test(email)) return res.status(400).json({ error: 'Lütfen geçerli bir e-posta adresi girin.' });
  if (recent.length >= 5) return res.status(429).json({ error: 'Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.' });
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(503).json({ error: 'İletişim altyapısı henüz tamamlanmadı.' });
  }

  recent.push(now);
  contactRequests.set(ip, recent);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/contact_messages`, {
      method: 'POST',
      headers: {
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ email, company: company || null })
    });
    if (!response.ok) throw new Error(`Supabase isteği başarısız: ${response.status}`);
    return res.status(201).json({ ok: true });
  } catch (error) {
    console.error('İletişim talebi kaydedilemedi:', error.message);
    return res.status(502).json({ error: 'Mesajınız kaydedilemedi. Lütfen kısa süre sonra tekrar deneyin.' });
  }
});

app.use((_req, res) => res.status(404).redirect('/'));

app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor.`);
});
