import axios from 'axios';

// Mintify API Key
const MINTIFY_API_KEY = '85c2edccc6fad38585b794b3595af637928bd512';
const MINTIFY_API_URL = 'https://api.mintify.xyz/v1';

export interface UpcomingNFT {
  id: string;
  name: string;
  contractAddress: string;
  mintPrice: string;
  launchTime: number;
  launchStatus: 'upcoming' | 'live' | 'ended';
  imageUrl?: string;
  description?: string;
  tokenSupply?: number;
  maxMintPerWallet?: number;
  blockchain: string;
}

export class MintifyService {
  /**
   * Fetch upcoming NFT drops that haven't been listed yet
   */
  async getUpcomingDrops(): Promise<UpcomingNFT[]> {
    try {
      const response = await axios.get(`${MINTIFY_API_URL}/drops/upcoming`, {
        headers: {
          'Authorization': `Bearer ${MINTIFY_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      return response.data.drops || [];
    } catch (error) {
      console.error('Error fetching upcoming drops from Mintify:', error);
      return [];
    }
  }
  
  /**
   * Get detailed information about a specific NFT drop
   */
  async getDropDetails(dropId: string): Promise<UpcomingNFT | null> {
    try {
      const response = await axios.get(`${MINTIFY_API_URL}/drops/${dropId}`, {
        headers: {
          'Authorization': `Bearer ${MINTIFY_API_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      return response.data.drop;
    } catch (error) {
      console.error(`Error fetching drop details for ${dropId}:`, error);
      return null;
    }
  }
  
  /**
   * Monitor a specific NFT contract for launch
   */
  async monitorContract(contractAddress: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${MINTIFY_API_URL}/monitor`, 
        { contractAddress },
        {
          headers: {
            'Authorization': `Bearer ${MINTIFY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.success;
    } catch (error) {
      console.error(`Error monitoring contract ${contractAddress}:`, error);
      return false;
    }
  }
  
  /**
   * Get contract ABI and mint function information
   */
  async getContractInfo(contractAddress: string): Promise<any> {
    try {
      const response = await axios.get(
        `${MINTIFY_API_URL}/contracts/${contractAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${MINTIFY_API_KEY}`,
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data.contract;
    } catch (error) {
      console.error(`Error fetching contract info for ${contractAddress}:`, error);
      return null;
    }
  }
} 