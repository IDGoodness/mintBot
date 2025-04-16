const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ✅ Your Route Goes *Below* This
app.get("/api/upcoming/:contract", async (req, res) => {
  const contract = req.params.contract.toLowerCase();

  try {
    const response = await axios.get(
      `https://api.reservoir.tools/collections/v7?id=${contract}`,
      {
        headers: {
          "x-api-key": process.env.RESERVOIR_API_KEY,
        },
      }
    );

    const collection = response.data?.collections?.[0];

    if (!collection) {
      return res.status(404).json({ error: "Collection not found." });
    }

    res.json({
      name: collection.name,
      slug: collection.slug,
      image: collection.image,
      floorAsk: collection.floorAsk?.price || null,
      openseaUrl: `https://opensea.io/collection/${collection.slug}`,
    });
  } catch (err) {
    console.error("❌ Reservoir fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch collection metadata." });
  }
});

// ✅ Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});