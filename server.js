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
  res.send("Brand Trust Checker Backend Running");
});

// 🔹 Shared analyze logic
async function analyzeWebsite(website) {
  const result = {
    website,
    websiteAge: "Unknown",
    sslSecure: false,
    seoScore: "N/A",
    performanceScore: "N/A",
    safeBrowsing: "Unknown",
    finalScore: 0,
  };

  // 1️⃣ SSL check
  result.sslSecure = website.startsWith("https://");

  // 2️⃣ Google PageSpeed API
  try {
    const psiRes = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${website}&strategy=mobile&key=${process.env.GOOGLE_API_KEY}`
    );
    const psiData = await psiRes.json();

    const perf =
      psiData?.lighthouseResult?.categories?.performance?.score;

    if (perf !== undefined) {
      result.performanceScore = Math.round(perf * 100);
    }
  } catch (e) {
    console.error("PageSpeed error:", e.message);
  }

  // 3️⃣ Google Safe Browsing
  try {
    const sbRes = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.GOOGLE_API_KEY}`,
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
        headers: { "Content-Type": "application/json" },
      }
    );

    const sbData = await sbRes.json();
    result.safeBrowsing = sbData.matches ? "Unsafe" : "Safe";
  } catch (e) {
    console.error("Safe browsing error:", e.message);
  }

  // 4️⃣ Final score (basic logic)
  let score = 0;
  if (result.sslSecure) score += 25;
  if (result.performanceScore !== "N/A") score += result.performanceScore / 4;
  if (result.safeBrowsing === "Safe") score += 25;

  result.finalScore = Math.min(100, Math.round(score));

  return result;
}

// ✅ GET support (browser test)
app.get("/analyze", async (req, res) => {
  const website = req.query.url;
  if (!website) {
    return res.status(400).json({ error: "url parameter required" });
  }

  try {
    const data = await analyzeWebsite(website);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// ✅ POST support (frontend)
app.post("/analyze", async (req, res) => {
  const { website } = req.body;
  if (!website) {
    return res.status(400).json({ error: "website required" });
  }

  try {
    const data = await analyzeWebsite(website);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
