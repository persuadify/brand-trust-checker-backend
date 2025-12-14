import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ status: "Brand Trust Checker API Live ✅" });
});

app.post("/analyze", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  const result = {
    businessSince: "NA",
    websiteAge: "NA",
    domainCountry: "NA",
    websiteSecure: url.startsWith("https"),
    seoStatus: "NA",
    googleMyBusiness: "NA",
    addressVerification: "NA",
    phoneUsage: "NA",
    onlinePresence: "NA",
    otherWebsites: "NA",
    competitors: "NA",
    pageSpeed: "NA",
    safeBrowsing: "NA",
    improvements: [],
    finalScore: 50
  };

  /* =====================================================
     1️⃣ WHOIS API – Business Since, Website Age, Country
     ===================================================== */
  try {
    const domain = url.replace(/^https?:\/\//, "").split("/")[0];

    const whoisRes = await fetch(
      `https://api.whoisfreaks.com/v1.0/whois?apiKey=${process.env.at_hCoTxkW6zMlFpsOTDp1AiZM1pblew}&domainName=${domain}`
    );
    const whoisData = await whoisRes.json();

    if (whoisData?.createdDate) {
      const createdYear = new Date(whoisData.createdDate).getFullYear();
      const currentYear = new Date().getFullYear();

      result.businessSince = createdYear;
      result.websiteAge = `${currentYear - createdYear} years`;
      result.domainCountry = whoisData?.registrant?.country || "NA";
      result.finalScore += 15;
    }
  } catch (e) {
    // fallback NA
  }

  /* =====================================================
     2️⃣ GOOGLE SAFE BROWSING API – Security
     ===================================================== */
  try {
    const sbRes = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "brand-trust", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }]
          }
        })
      }
    );

    const sbData = await sbRes.json();
    result.safeBrowsing = sbData.matches ? "Unsafe" : "Safe";
    if (result.safeBrowsing === "Safe") result.finalScore += 10;
  } catch (e) {}

  /* =====================================================
     3️⃣ GOOGLE PAGESPEED API – SEO / Speed
     ===================================================== */
  try {
    const psRes = await fetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`
    );
    const psData = await psRes.json();

    if (psData?.lighthouseResult) {
      const score =
        psData.lighthouseResult.categories.performance.score * 100;
      result.pageSpeed = Math.round(score);
      result.seoStatus = score >= 70 ? "Good" : "Needs Improvement";
      if (score >= 70) result.finalScore += 10;
    }
  } catch (e) {}

  /* =====================================================
     Improvements (Always Visible)
     ===================================================== */
  if (result.pageSpeed === "NA" || result.pageSpeed < 70)
    result.improvements.push("Improve website speed");
  result.improvements.push("Create Google Business Profile");
  result.improvements.push("Improve SEO content & backlinks");

  if (result.websiteSecure) result.finalScore += 10;

  if (result.finalScore > 100) result.finalScore = 100;

  res.json(result);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
