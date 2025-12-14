import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import https from "https";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- SSL CHECK ---------------- */
async function checkSSL(url) {
  try {
    return new Promise((resolve) => {
      const req = https.get(url, () => resolve("Secure (HTTPS Enabled)"));
      req.on("error", () => resolve("Not Secure"));
    });
  } catch {
    return "Not Secure";
  }
}

/* ---------------- WHOIS ---------------- */
async function getWhois(domain) {
  try {
    const res = await axios.get(
      `https://www.whoisxmlapi.com/whoisserver/WhoisService`,
      {
        params: {
          apiKey: process.env.WHOIS_API_KEY,
          domainName: domain,
          outputFormat: "JSON"
        }
      }
    );

    const record = res.data.WhoisRecord;
    return {
      created: record.createdDate || null
    };
  } catch {
    return { created: null };
  }
}

/* ---------------- PAGE SPEED SEO ---------------- */
async function getSEO(url) {
  try {
    const res = await axios.get(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`,
      {
        params: {
          url,
          strategy: "mobile",
          key: process.env.GOOGLE_API_KEY
        }
      }
    );

    const score =
      res.data.lighthouseResult.categories.performance.score * 100;

    return `${Math.round(score)}/100`;
  } catch {
    return "SEO data unavailable";
  }
}

/* ---------------- SAFE BROWSING ---------------- */
async function checkSafeBrowsing(url) {
  try {
    const res = await axios.post(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SAFE_BROWSING_KEY}`,
      {
        client: {
          clientId: "brand-trust-checker",
          clientVersion: "1.0"
        },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }]
        }
      }
    );

    return res.data.matches ? "Unsafe" : "Safe";
  } catch {
    return "Unknown";
  }
}

/* ---------------- TRUST SCORE ---------------- */
function calculateScore({ ssl, seo }) {
  let score = 40;

  if (ssl.includes("Secure")) score += 20;
  if (seo.includes("/")) score += parseInt(seo) / 5;

  return Math.min(100, Math.round(score));
}

/* ---------------- MAIN API ---------------- */
app.post("/analyze", async (req, res) => {
  const { companyName, website } = req.body;

  let domain = website
    ? website.replace("https://", "").replace("http://", "").split("/")[0]
    : null;

  const whois = domain ? await getWhois(domain) : {};
  const ssl = website ? await checkSSL(website) : "No website";
  const seo = website ? await getSEO(website) : "No website";
  const safe = website ? await checkSafeBrowsing(website) : "Unknown";

  const score = calculateScore({ ssl, seo });

  res.json({
    businessAge: whois.created
      ? `Since ${whois.created.substring(0, 4)}`
      : "Data not found",

    websiteAge: whois.created
      ? `${new Date().getFullYear() -
          new Date(whois.created).getFullYear()} years`
      : "Unknown",

    ssl,
    seo,
    googleBusiness: "Demo: Listing may exist",
    addressCheck: "Demo: Appears consistent",
    onlinePresence: "Demo: Google, Facebook, Justdial",
    websites: website ? [website] : [],
    competitors: [
      "competitor1.com",
      "competitor2.com",
      "competitor3.com"
    ],
    improvements: [
      "Improve SEO score",
      "Add Google Business Profile",
      "Increase backlinks"
    ],
    safeBrowsing: safe,
    finalScore: score
  });
});

app.listen(process.env.PORT, () =>
  console.log(`Backend running on port ${process.env.PORT}`)
);
