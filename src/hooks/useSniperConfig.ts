import { useState } from 'react';

const useSniperConfig = () => {
  const [sniperConfig, setSniperConfig] = useState({
    percentage: 15,    // default snipe % below floor
    isActive: false    // whether the bot is currently watching
  });

  return { sniperConfig, setSniperConfig };
};

export default useSniperConfig;