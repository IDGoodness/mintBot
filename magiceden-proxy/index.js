app.get("/api/magiceden/upcoming", async (req, res) => {
  const { contract } = req.query;

  try {
    const url = "https://api-mainnet.magiceden.dev/v2/launchpad/collections";
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MintworXBot/1.0)",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Magic Eden API error (${response.status}):`, errorText);
      return res
        .status(response.status)
        .json({ error: "Magic Eden upstream error", detail: errorText });
    }

    const data = await response.json();

    // If contract address is passed, filter results
    if (contract) {
      const filtered = data.filter(
        (collection) =>
          collection?.address?.toLowerCase() === contract.toLowerCase()
      );
      return res.json(filtered);
    }

    res.json(data);
  } catch (err) {
    console.error("Proxy fetch error:", err);
    res
      .status(500)
      .json({ error: "Internal Server Error", detail: err.message });
  }
});