/**
 * BRAND TRUST CHECKER – MEGA VERSION (ONE FILE)
 * Persuadify © 2025
 */

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");
const whois = require("whois-json");
const rateLimit = require("express-rate-limit");
const basicAuth = require("express-basic-auth");
const Stripe = require("stripe");

const app = express();
app.use(cors());
app.use(express.json());

/* =========================
   CONFIG (ADD YOUR KEYS)
========================= */
const GOOGLE_SAFE_BROWSING_KEY = "YOUR_GOOGLE_API_KEY";
const STRIPE_SECRET_KEY = "YOUR_STRIPE_KEY";
const ADMIN_EMAIL = "admin@persuadify.in";
const SMTP_USER = "your@email.com";
const SMTP_PASS = "email-password";

/* =========================
   SECURITY
========================= */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

/* =========================
   UTIL FUNCTIONS
========================= */
function calculateTrustScore(data) {
  let score = 100;

  if (!data.ssl) score -= 25;
  if (data.domainAge < 180) score -= 20;
  if (data.malware) score -= 40;
  if (!data.seo) score -= 15;

  return Math.max(score, 20);
}

/* =========================
   HEALTH CHECK
========================= */
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "Brand Trust Checker", time: new Date() });
});

/* =========================
   MAIN ANALYZE API
========================= */
app.post("/analyze", async (req, res) => {
  try {
    const { website, email } = req.body;
    if (!website) return res.status(400).json({ error: "Website required" });

    /* ---- SSL CHECK ---- */
    const ssl = website.startsWith("https://");

    /* ---- WHOIS ---- */
    const whoisData = await whois(website.replace(/^https?:\/\//, ""));
    const createdDate = new Date(whoisData.creationDate || whoisData.created);
    const domainAge =
      createdDate instanceof Date
        ? Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24))
        : 0;

    /* ---- GOOGLE SAFE BROWSING ---- */
    let malware = false;
    try {
      const sbRes = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_KEY}`,
        {
          method: "POST",
          body: JSON.stringify({
            client: { clientId: "persuadify", clientVersion: "1.0" },
            threatInfo: {
              threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url: website }],
            },
          }),
        }
      );
      const sbData = await sbRes.json();
      malware = !!sbData.matches;
    } catch {}

    /* ---- BASIC SEO CHECK ---- */
    let seo = true;
    try {
      const page = await fetch(website);
      const html = await page.text();
      if (!html.includes("<title>") || !html.includes("meta")) seo = false;
    } catch {
      seo = false;
    }

    const trustScore = calculateTrustScore({
      ssl,
      domainAge,
      malware,
      seo,
    });

    const result = {
      website,
      trustScore,
      status:
        trustScore >= 80
          ? "High Trust"
          : trustScore >= 60
          ? "Medium Trust"
          : "Low Trust",
      details: { ssl, domainAge, malware, seo },
    };

    /* ---- EMAIL REPORT ---- */
    if (email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });

      await transporter.sendMail({
        from: SMTP_USER,
        to: email,
        subject: "Your Brand Trust Report",
        html: `<h2>Trust Score: ${trustScore}</h2><pre>${JSON.stringify(
          result,
          null,
          2
        )}</pre>`,
      });
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

/* =========================
   ADMIN DASHBOARD (BASIC)
========================= */
app.use(
  "/admin",
  basicAuth({
    users: { admin: "password123" },
    challenge: true,
  })
);

app.get("/admin", (req, res) => {
  res.send("<h1>Admin Dashboard</h1><p>Usage logs coming soon</p>");
});

/* =========================
   STRIPE – PAID REPORTS
========================= */
const stripe = new Stripe(STRIPE_SECRET_KEY);

app.post("/create-payment", async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Premium Trust Report" },
          unit_amount: 999,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://persuadify.in/success",
    cancel_url: "https://persuadify.in/cancel",
  });

  res.json({ url: session.url });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Brand Trust Checker running on port ${PORT}`)
);
