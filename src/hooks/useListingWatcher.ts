import { useEffect } from 'react';

const useListingWatcher = (contract: string, floor: number, sniperConfig: { percentage: number, isActive: boolean }) => {
  useEffect(() => {
    if (!sniperConfig.isActive || !contract || !floor) return;

    const ws = new WebSocket('wss://ws.reservoir.tools/asks/v4');

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: "subscribe",
        filters: {
          contracts: [contract.toLowerCase()],
        },
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data?.event === "ask.created") {
        const price = parseFloat(data.ask?.price?.amount?.decimal);
        const tokenId = data.ask.token?.tokenId;

        const threshold = floor * (1 - sniperConfig.percentage / 100);

        if (price <= threshold) {
          console.log(`🔥 Snipe triggered on token ${tokenId} at ${price} ETH (below ${threshold})`);
          // TODO: call buy function here
        }
      }
    };

    return () => ws.close();
  }, [sniperConfig, contract, floor]);
};

export default useListingWatcher;