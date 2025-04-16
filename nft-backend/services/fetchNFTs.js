const axios = require("axios");

async function fetchNFTs(contract) {
  const url = `https://api.opensea.io/api/v2/chain/ethereum/account/${wallet}/nfts`;

  try {
    const response = await axios.get(url, {
      headers: {
        "X-API-KEY":"49b1fa0034e04b659a78c556af80ac50", // fallback if key is missing
      },
    });

    return response.data.nfts.map((nft) => ({
        name: nft.name,
        image: nft.image_url,
        contract: nft.contract,
        tokenId: nft.identifier,
    }));
  } catch (error) {
    console.error(
        "OpenSea fetch error:",
        error.response?.data || error.message 
    );
    throw new Error("OpenSea API failed");
  }
}

module.exports = fetchNFTs;