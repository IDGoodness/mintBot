import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';

export const berachain = {
  id: 80085,
  name: 'Berachain',
  nativeCurrency: {
    name: 'BERA',
    symbol: 'BERA',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.berachain.dev'],
    },
  },
  blockExplorers: {
    default: { name: 'Beratrail', url: 'https://beratrail.io' },
  },
} as const;

export const config = createConfig({
  chains: [mainnet, berachain],
  transports: {
    [mainnet.id]: http(),
    [berachain.id]: http('https://rpc.berachain.dev'),
  },
  ssr: true,
});