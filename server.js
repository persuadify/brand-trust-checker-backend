import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import https from "https";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

/* ---------------- HEALTH CHECK ---------------- */
app.get("/", (req, res) => {
  res.send("Brand Trust Checker API is running");
});

/* ---------------- ANALYZE ROUTE (GET) ---------------- */
app.get("/analyze", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const domain = new URL(url).hostname;

    /* ---------- SSL CHECK ---------- */
    const sslSecure = await new Promise((resolve) => {
      https
        .get(url, () => resolve(true))
        .on("error", () => resolve(false));
    });

    /* ---------- WHOIS ---------- */
    let businessSince = "NA";
    let domainCountry = "NA";
    try {
      const whoisRes = await fetch(
        `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.at_hCoTxkW6zMlFpsOTDp1AiZM1pblew}&domainName=${domain}&outputFormat=JSON`
      );
      const whoisData = await whoisRes.json();
      businessSince =
        whoisData?.WhoisRecord?.createdDate || "NA";
      domainCountry =
        whoisData?.WhoisRecord?.registrant?.country || "NA";
    } catch {}

    /* ---------- PAGE SPEED ---------- */
    let pageSpeed = "NA";
    try {
      const speedRes = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`
      );
      const speedData = await speedRes.json();
      pageSpeed = speedData?.lighthouseResult?.categories?.performance?.score
        ? Math.round(
            speedData.lighthouseResult.categories.performance.score * 100
          )
        : "NA";
    } catch {}

    /* ---------- SAFE BROWSING ---------- */
    let safeBrowsing = "Safe";
    try {
      const sbRes = await fetch(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`,
        {
          method: "POST",
          body: JSON.stringify({
            client: { clientId: "brand-checker", clientVersion: "1.0" },
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
      if (sbData.matches) safeBrowsing = "Unsafe";
    } catch {}

    /* ---------- FINAL RESPONSE ---------- */
    res.json({
      businessSince,
      websiteAge: businessSince !== "NA" ? "Available" : "NA",
      domainCountry,
      websiteSecure: sslSecure,
      seoStatus: pageSpeed !== "NA" ? "Good" : "NA",
      googleMyBusiness: "NA",
      addressVerification: "NA",
      phoneUsage: "NA",
      onlinePresence: "NA",
      otherWebsites: "NA",
      improvements: [
        "Improve SEO content",
        "Increase page speed",
        "Add Google My Business profile",
      ],
      competitors: "NA",
      finalScore:
        (sslSecure ? 25 : 0) +
        (pageSpeed !== "NA" ? 25 : 0) +
        (safeBrowsing === "Safe" ? 25 : 0),
      pageSpeed,
      safeBrowsing,
    });
  } catch (err) {
    res.status(500).json({ error: "Analysis failed" });
  }
});

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
