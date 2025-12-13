const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Brand Trust Checker API is running");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Brand Trust Checker API",
    time: new Date().toISOString(),
  });
});

app.post("/analyze", (req, res) => {
  const website = req.body.website || "Unknown";

  const score = Math.floor(Math.random() * 40) + 60;

  let status = "Low Trust";
  if (score >= 80) status = "High Trust";
  else if (score >= 65) status = "Medium Trust";

  res.json({
    website,
    trustScore: score,
    status,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
