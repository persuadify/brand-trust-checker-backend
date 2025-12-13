const express = require("express");
const cors = require("cors");
const url = require("url");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Brand Trust Checker API running");
});

app.post("/analyze", (req, res) => {
  const website = req.body.website;

  const domain = url.parse(website).hostname || "unknown";

  // Fake logic (next upgrade = real APIs)
  const seoScore = Math.floor(Math.random() * 30) + 70;
  const ssl = Math.random() > 0.2;
  const domainAge = Math.floor(Math.random() * 10) + 1;
  const scamRisk = Math.random() > 0.8;

  let trustScore = seoScore;
  if (!ssl) trustScore -= 15;
  if (domainAge < 2) trustScore -= 10;
  if (scamRisk) trustScore -= 20;

  trustScore = Math.max(30, Math.min(95, trustScore));

  let status =
    trustScore >= 80 ? "High Trust" :
    trustScore >= 65 ? "Medium Trust" :
    "Low Trust";

  res.json({
    website,
    domain,
    trustScore,
    status,
    breakdown: {
      seoScore,
      ssl: ssl ? "Valid SSL" : "No SSL",
      domainAge: `${domainAge} years`,
      scamRisk: scamRisk ? "Potential Risk" : "No Risk Detected"
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
