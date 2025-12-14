import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import https from "https";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/analyze", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: "URL required" });

    const domain = new URL(url).hostname;

    // WHOIS
    let businessSince = "NA";
    let websiteAge = "NA";
    let domainCountry = "NA";

    try {
      const whoisRes = await fetch(
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.at_hCoTxkW6zMlFpsOTDp1AiZM1pblew }&domainName=${domain}&outputFormat=JSON`
      );
      const whois = await whoisRes.json();

      const created = whois?.WhoisRecord?.createdDate;
      domainCountry = whois?.WhoisRecord?.registrant?.country || "NA";

      if (created) {
        businessSince = created.split("T")[0];
        const years =
          new Date().getFullYear() - new Date(created).getFullYear();
        websiteAge = `${years} years`;
      }
    } catch {}

    // HTTPS
    const websiteSecure = url.startsWith("https");

    // PageSpeed
    let seoStatus = "NA";
    try {
      const speedRes = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=mobile&key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`
      );
      const speed = await speedRes.json();
      const score =
        speed?.lighthouseResult?.categories?.performance?.score;
      if (score !== undefined) {
        seoStatus = score >= 0.7 ? "Good" : "Needs Improvement";
      }
    } catch {}

    // Safe Browsing
    let safeBrowsing = "Safe";
    try {
      const sbRes = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client: { clientId: "persuadify", clientVersion: "1.0" },
            threatInfo: {
              threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url }]
            }
          })
        }
      );
      const sb = await sbRes.json();
      if (sb.matches) safeBrowsing = "Unsafe";
    } catch {}

    // Final Score
    let score = 50;
    if (websiteSecure) score += 10;
    if (seoStatus === "Good") score += 10;
    if (safeBrowsing === "Safe") score += 6;

    res.json({
      businessSince,
      websiteAge,
      domainCountry,
      websiteSecure,
      seoStatus,
      googleMyBusiness: "NA",
      addressVerification: "NA",
      phoneUsage: "NA",
      onlinePresence: "NA",
      otherWebsites: "NA",
      improvements: [
        "Improve page speed",
        "Add business listings",
        "Strengthen SEO content"
      ],
      competitors: "NA",
      finalScore: score
    });
  } catch (err) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.listen(process.env.PORT || 5000, () =>
  console.log("Brand Trust Checker backend running")
);
