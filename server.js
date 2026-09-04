const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// Demo "beyni": ziyaretci canli demo kutusuna bir mesaj yazdiginda, Botrix'in
// gercek bir musteri mesajini nasil isleyecegini kaba bir niyet tespitiyle
// simule ediyoruz. Gercek urunde bu katman NLP + randevu takvimine baglanir;
// burada amac ziyaretciye "bu mantikli" dedirtecek somut bir his vermek.
// ---------------------------------------------------------------------------

const SLOTS = ["Bugün 14:30", "Bugün 16:00", "Yarın 11:00", "Yarın 13:15"];

const PRICE_LIST = [
  { hizmet: "Saç kesimi", fiyat: "300₺" },
  { hizmet: "Sakal tıraşı", fiyat: "150₺" },
  { hizmet: "Saç + sakal", fiyat: "400₺" },
  { hizmet: "Cilt bakımı", fiyat: "250₺" },
];

function normalize(text) {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c");
}

function pickSlot() {
  return SLOTS[Math.floor(Math.random() * SLOTS.length)];
}

// Türkçe'de ekler kelime sınırlarını ("\b") güvenilmez hale getirir
// (ör. "boş yeriniz" içinde "boş yer" geçer ama \b eşleşmez), bu yüzden
// basit ve öngörülebilir olan alt-dize (includes) kontrolü kullanıyoruz.
function includesAny(text, words) {
  return words.some((w) => text.includes(w));
}

function detectIntent(raw) {
  const t = normalize(raw);

  if (includesAny(t, ["iptal", "vazgec", "gelemeyecegim", "gelemiyorum"])) {
    return "cancel";
  }
  if (/\d{1,2}[:.]\d{2}/.test(t)) {
    return "confirm_slot";
  }
  if (includesAny(t, ["acik misiniz", "aciksiniz", "calisiyor musunuz", "kapaniyor", "calisma saat", "hangi saatler", "adres", "nerede"])) {
    return "hours";
  }
  if (includesAny(t, ["randevu", "bos yer", "musait", "ne zaman", "saat kacta", "gelebilir"])) {
    return "book";
  }
  if (includesAny(t, ["fiyat", "ucret", "kac para", "kaca", "ne kadar"])) {
    return "price";
  }
  if (includesAny(t, ["tesekkur", "sagol", "elinize saglik", "harika"])) {
    return "thanks";
  }
  if (includesAny(t, ["merhaba", "selam", "iyi gunler", "kolay gelsin"])) {
    return "greeting";
  }
  return "fallback";
}

function buildReply(intent, raw) {
  switch (intent) {
    case "greeting":
      return "Merhaba! Hemen yardımcı olayım 🙂 Randevu mu almak istersiniz, yoksa fiyatları mı öğrenmek istersiniz?";
    case "book": {
      const a = pickSlot();
      const b = pickSlot();
      return `Tabii, şu an için uygun saatler: ${a} veya ${b}. Hangisi size uyar?`;
    }
    case "confirm_slot":
      return "Harika, randevunuzu bu saate aldım ✅ Adres ve hatırlatma bir gün önce buradan otomatik gelecek. Görüşmek üzere!";
    case "price": {
      const lines = PRICE_LIST.map((p) => `• ${p.hizmet}: ${p.fiyat}`).join("\n");
      return `Güncel fiyat listemiz:\n${lines}\n\nDilerseniz hemen randevu da oluşturabilirim.`;
    }
    case "cancel":
      return "Sorun değil, randevunuzu iptal ettim. Yeni bir tarih için ne zaman uygun olduğunuzu yazmanız yeterli.";
    case "hours":
      return "Hafta içi 09:00–20:00, cumartesi 09:00–18:00 arası açığız. Pazar kapalıyız. Yine de mesajınızı hemen okuyup dönüş yapabilirim.";
    case "thanks":
      return "Rica ederiz, iyi günler dileriz! Başka bir şeye ihtiyacınız olursa buradayız.";
    default:
      return "Mesajınızı aldım. Randevu almak, fiyat öğrenmek veya çalışma saatlerini sormak için yazabilirsiniz — hangisiyle devam edelim?";
  }
}

app.post("/api/reply", (req, res) => {
  const message = (req.body && req.body.message ? String(req.body.message) : "").slice(0, 300);

  if (!message.trim()) {
    return res.status(400).json({ error: "Boş mesaj gönderilemez." });
  }

  const intent = detectIntent(message);
  const reply = buildReply(intent, message);

  // Gerçek bir yazma süresi hissi için küçük, mesaj uzunluğuna bağlı bir gecikme.
  const delay = Math.min(1400, 400 + reply.length * 6);

  setTimeout(() => {
    res.json({ reply, intent, delayMs: delay });
  }, delay);
});

app.listen(PORT, () => {
  console.log(`Botrix sitesi http://localhost:${PORT} adresinde çalışıyor`);
});
