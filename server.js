import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Brand Trust Checker Backend is running");
});

// ============================
// 🔹 CORE ANALYSIS FUNCTION
// ============================
async function analyzeWebsite({ website, companyName, phone, email }) {
  const result = {
    companyName: companyName || "N/A",
    website: website || "N/A",
    businessSince: "Unknown",
    websiteAge: "Unknown",
    sslSecure: false,
    seoStatus: "Unknown",
    performanceScore: "N/A",
    safeBrowsing: "Unknown",
    googleBusiness: "Not Checked (Billing Required)",
    addressMatch: "Not Available",
    phoneUsage: phone ? "Provided" : "Not Provided",
    onlinePresence: [],
    relatedWebsites: [],
    improvements: [],
    competitors: [],
    finalScore: 0,
  };

  // ============================
  // 1️⃣ SSL CHECK
  // ============================
  result.sslSecure = website?.startsWith("https://");

  // ============================
  // 2️⃣ GOOGLE PAGESPEED (SEO + PERFORMANCE)
  // ============================
  try {
    const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${website}&strategy=mobile&key=${process.env.GOOGLE_API_KEY}`;
    const psiRes = await fetch(psiUrl);
    const psiData = await psiRes.json();

    const perf =
      psiData?.lighthouseResult?.categories?.performance?.score;
    const seo =
      psiData?.lighthouseResult?.categories?.seo?.score;

    if (perf !== undefined) {
      result.performanceScore = Math.round(perf * 100);
    }

    if (seo !== undefined) {
      result.seoStatus = seo >= 0.7 ? "Good" : "Needs Improvement";
    }
  } catch (err) {
    console.error("PageSpeed error:", err.message);
  }

  // ============================
  // 3️⃣ GOOGLE SAFE BROWSING
  // ============================
  try {
    const sbRes = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    result.safeBrowsing = sbData.matches ? "Unsafe" : "Safe";
  } catch (err) {
    console.error("Safe Browsing error:", err.message);
  }

  // ============================
  // 4️⃣ DEMO / PLACEHOLDERS (FREE)
  // ============================
  result.onlinePresence = [
    "Google Search",
    "Social Media",
    "Business Directories",
  ];

  result.relatedWebsites = website ? [website] : [];

  result.competitors = [
    "Competitor A",
    "Competitor B",
    "Competitor C",
  ];

  // ============================
  // 5️⃣ IMPROVEMENTS SUGGESTION
  // ============================
  if (!result.sslSecure) result.improvements.push("Enable HTTPS (SSL)");
  if (result.performanceScore !== "N/A" && result.performanceScore < 70)
    result.improvements.push("Improve website performance");
  if (result.safeBrowsing === "Unsafe")
    result.improvements.push("Fix malware / security issues");

  if (result.improvements.length === 0)
    result.improvements.push("Your brand looks trustworthy");

  // ============================
  // 6️⃣ FINAL SCORE CALCULATION
  // ============================
  let score = 0;
  if (result.sslSecure) score += 25;
  if (result.performanceScore !== "N/A")
    score += result.performanceScore / 4;
  if (result.safeBrowsing === "Safe") score += 25;

  result.finalScore = Math.min(100, Math.round(score));

  return result;
}

// ============================
// ✅ GET /analyze (browser test)
// ============================
app.get("/analyze", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "url parameter required" });
  }

  try {
    const data = await analyzeWebsite({ website: url });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ============================
// ✅ POST /analyze (frontend)
// ============================
app.post("/analyze", async (req, res) => {
  const { companyName, website, phone, email } = req.body;

  if (!website) {
    return res.status(400).json({ error: "website is required" });
  }

  try {
    const data = await analyzeWebsite({
      companyName,
      website,
      phone,
      email,
    });
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ============================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
