import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";
import https from "https";
import tls from "tls";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

/* ------------------ HEALTH CHECK ------------------ */
app.get("/", (req, res) => {
  res.json({ status: "Brand Trust Checker Backend Running ✅" });
});

/* ------------------ ANALYZE ROUTE ------------------ */
app.post("/analyze", async (req, res) => {
  try {
    const { companyName, website, phone, email } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: "Company name required" });
    }

    const domain = website
      ? website.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : null;

    /* ------------------ WEBSITE AGE (WHOIS) ------------------ */
    let websiteAge = "Unknown";
    if (domain) {
      try {
        const whoisRes = await fetch(
          `https://www.whoisxmlapi.com/whoisserver/WhoisService?apiKey=${process.env.at_hCoTxkW6zMlFpsOTDp1AiZM1pblew}&domainName=${domain}&outputFormat=JSON`
        );
        const whoisData = await whoisRes.json();
        websiteAge =
          whoisData?.WhoisRecord?.createdDate || "Not available";
      } catch {
        websiteAge = "Unavailable";
      }
    }

    /* ------------------ SSL CHECK ------------------ */
    let sslSecure = false;
    if (domain) {
      try {
        await new Promise((resolve, reject) => {
          const socket = tls.connect(
            443,
            domain,
            { servername: domain },
            () => {
              sslSecure = true;
              socket.end();
              resolve();
            }
          );
          socket.on("error", reject);
        });
      } catch {
        sslSecure = false;
      }
    }

    /* ------------------ PAGE SPEED ------------------ */
    let pageSpeedScore = "N/A";
    if (domain) {
      try {
        const psRes = await fetch(
          `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`
        );
        const psData = await psRes.json();
        pageSpeedScore = Math.round(
          psData?.lighthouseResult?.categories?.performance?.score * 100
        );
      } catch {
        pageSpeedScore = "Unavailable";
      }
    }

    /* ------------------ SAFE BROWSING ------------------ */
    let safeBrowsing = "Safe";
    if (domain) {
      try {
        const sbRes = await fetch(
          `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.AIzaSyBttGXB3PzqJsHriWj_qNLmnXJTIpBivDw}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client: { clientId: "brand-trust-checker", clientVersion: "1.0" },
              threatInfo: {
                threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
                platformTypes: ["ANY_PLATFORM"],
                threatEntryTypes: ["URL"],
                threatEntries: [{ url: `https://${domain}` }]
              }
            })
          }
        );
        const sbData = await sbRes.json();
        if (sbData?.matches) safeBrowsing = "Unsafe";
      } catch {
        safeBrowsing = "Unknown";
      }
    }

    /* ------------------ FINAL SCORE ------------------ */
    let score = 0;
    if (sslSecure) score += 25;
    if (pageSpeedScore !== "N/A" && pageSpeedScore >= 70) score += 25;
    if (safeBrowsing === "Safe") score += 25;
    if (websiteAge !== "Unknown") score += 25;

    /* ------------------ RESPONSE ------------------ */
    res.json({
      companyName,
      website,
      results: {
        businessSince: websiteAge,
        websiteAge,
        sslSecure,
        pageSpeedScore,
        safeBrowsing,
        googleBusinessStatus: "Demo (Billing API required)",
        addressVerification: "Demo",
        onlinePresence: ["Google", "Facebook", "LinkedIn (demo)"],
        otherWebsites: domain ? [`https://${domain}`] : [],
        improvements: [
          "Improve page speed",
          "Add Google Business Profile",
          "Increase online reviews"
        ],
        competitors: ["Competitor A", "Competitor B", "Competitor C"],
        finalScore: score
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ------------------ START SERVER ------------------ */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
