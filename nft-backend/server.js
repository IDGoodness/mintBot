const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mintify API key
const MINTIFY_API_KEY = "85c2edccc6fad38585b794b3595af637928bd512";

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

// Get upcoming NFT drops from Mintify
app.get("/api/mintify/upcoming", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.mintify.xyz/v1/drops/upcoming",
      {
        headers: {
          "Authorization": `Bearer ${MINTIFY_API_KEY}`,
          "Accept": "application/json"
        }
      }
    );
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Mintify fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch upcoming drops." });
  }
});

// Get details for a specific NFT drop from Mintify
app.get("/api/mintify/drops/:dropId", async (req, res) => {
  const dropId = req.params.dropId;
  
  try {
    const response = await axios.get(
      `https://api.mintify.xyz/v1/drops/${dropId}`,
      {
        headers: {
          "Authorization": `Bearer ${MINTIFY_API_KEY}`,
          "Accept": "application/json"
        }
      }
    );
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Mintify drop details error:", err.message);
    res.status(500).json({ error: "Failed to fetch drop details." });
  }
});

// Monitor a specific contract for launch
app.post("/api/mintify/monitor", async (req, res) => {
  const { contractAddress } = req.body;
  
  if (!contractAddress) {
    return res.status(400).json({ error: "Contract address is required." });
  }
  
  try {
    const response = await axios.post(
      "https://api.mintify.xyz/v1/monitor",
      { contractAddress },
      {
        headers: {
          "Authorization": `Bearer ${MINTIFY_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Mintify monitor error:", err.message);
    res.status(500).json({ error: "Failed to monitor contract." });
  }
});

// Get contract info from Mintify
app.get("/api/mintify/contracts/:address", async (req, res) => {
  const address = req.params.address;
  
  try {
    const response = await axios.get(
      `https://api.mintify.xyz/v1/contracts/${address}`,
      {
        headers: {
          "Authorization": `Bearer ${MINTIFY_API_KEY}`,
          "Accept": "application/json"
        }
      }
    );
    
    res.json(response.data);
  } catch (err) {
    console.error("❌ Mintify contract info error:", err.message);
    res.status(500).json({ error: "Failed to fetch contract information." });
  }
});

// ✅ Start the Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});