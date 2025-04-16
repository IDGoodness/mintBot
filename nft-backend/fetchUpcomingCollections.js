const axios = require("axios");

async function fetchUpcomingCollections(query = "") {
  const url = `https://api.reservoir.tools/search/collections/v2?q=${encodeURIComponent(
    query
  )}&limit=10`;

  const response = await axios.get(url, {
    headers: {
      "x-api-key": process.env.RESERVOIR_API_KEY,
    },
  });

  const collections = response.data?.collections || [];

  return collections.map((c) => ({
    name: c.name,
    image: c.image,
    slug: c.slug,
    floorAsk: c.floorAsk?.price || null,
    openseaUrl: `https://opensea.io/collection/${c.slug}`,
  }));
}

module.exports = fetchUpcomingCollections;