const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// ROOT CHECK
app.get("/", (req, res) => {
  res.send("Brand Trust Checker API is running");
});

// HEALTH CHECK (IMPORTANT)
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Brand Trust Checker API",
    time: new Date().toISOString()
  });
});

// ANALYZE API
app.post("/analyze", (req, res) => {
  const website = req.body.website || "Unknown";
  const score = Math.floor(Math.random() * 40) + 60;

  res.json({
    website,
    trustScore: score,
    status:
      score >= 80
        ? "High Trust"
        : score >= 65
        ? "Medium Trust"
        : "Low Trust"
  });
});

// SERVER START (LAST LINE ONLY)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

