const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.post("/analyze", async (req, res) => {
  const { website, email } = req.body;

  let score = {
    website: 0,
    messaging: 0,
    presence: 15,
    social: 0,
    authority: 0
  };

  try {
    const response = await axios.get(website, { timeout: 7000 });
    const html = response.data;
    const $ = cheerio.load(html);
    const lower = html.toLowerCase();

    if (website.startsWith("https")) score.website += 5;
    if ($("title").text()) score.website += 5;
    if ($("meta[name='description']").length) score.website += 5;
    if ($("a[href*='contact']").length) score.website += 5;
    if ($("a[href*='about']").length) score.website += 5;

    const h1 = $("h1").first().text();
    if (h1.length > 15) score.messaging += 10;
    if (h1.length < 90) score.messaging += 5;
    if (!h1.toLowerCase().includes("welcome")) score.messaging += 5;

    if (lower.includes("testimonial")) score.social += 8;
    if (lower.includes("client")) score.social += 6;
    if (lower.includes("review")) score.social += 6;

    if (lower.includes("blog")) score.authority += 5;
    if (lower.includes("founder")) score.authority += 5;
    if (lower.includes("press")) score.authority += 5;

  } catch (e) {
    return res.render("report", {
      error: "Website not reachable or blocked."
    });
  }

  const total = score.website + score.messaging + score.presence + score.social + score.authority;

  res.render("report", {
    website,
    email,
    total,
    score,
    insight: total < 50
      ? "Your brand is visible but not yet believable."
      : "Your brand shows strong trust signals."
  });
});

app.listen(3000, () => console.log("SaaS running on port 3000"));