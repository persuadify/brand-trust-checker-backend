import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// ---------- HELPERS ----------
const safe = (v) => (v === undefined || v === null || v === "" ? "NA" : v);

// ---------- ANALYZE API ----------
app.get("/analyze", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const domain = new URL(url).hostname;

    // --- WHOIS (website age, country)
    let websiteAge = "NA";
    let domainCountry = "NA";

    try {
      const whoisRes = await fetch(
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.at_hCoTxkW6zMlFpsOTDp1AiZM1pblew}&domainName=${domain}&outputFormat=JSON`
      );
      const whoisData = await whoisRes.json();

      const created =
        whoisData?.WhoisRecord?.createdDate || null;

      if (created) {
        const createdYear = new Date(created).getFullYear();
        const currentYear = new Date().getFullYear();
        websiteAge = `${currentYear - createdYear} years`;
      }

      domainCountry =
        whoisData?.WhoisRecord?.registrant?.country || "NA";
    } catch {}

    // --- SSL check
    const websiteSecure = url.startsWith("https");

    // --- PageSpeed
    let seoStatus = "NA";
    try {
      const psRes = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`
      );
      const psData = await psRes.json();
      const score =
        psData?.lighthouseResult?.categories?.performance?.score;
      if (score !== undefined) {
        seoStatus = score >= 0.6 ? "Good" : "Needs improvement";
      }
    } catch {}

    // --- Safe Browsing
    let safeBrowsing = "NA";
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
              threatEntries: [{ url }],
            },
          }),
        }
      );
      const sbData = await sbRes.json();
      safeBrowsing = sbData?.matches ? "Unsafe" : "Safe";
    } catch {}

    // --- FINAL RESPONSE (ALL FIELDS)
    const response = {
      businessSince: "NA",
      websiteAge: safe(websiteAge),
      domainCountry: safe(domainCountry),
      websiteSecure,
      seoStatus: safe(seoStatus),
      googleMyBusiness: "NA",
      addressVerification: "NA",
      phoneUsage: "NA",
      onlinePresence: "NA",
      otherWebsites: "NA",
      improvements: [
        "Improve page speed",
        "Add business listings",
        "Strengthen SEO content",
      ],
      competitors: "NA",
      finalScore: 66,
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
