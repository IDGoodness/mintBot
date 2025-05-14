import { ethers } from 'ethers';
import { isTargetContractDeployed } from '../utils/contractIntegration';

export interface MonitoredContract {
  contractAddress: string;
  name: string;
  mintPrice: string;
  launchTime: number;
  status: 'pending' | 'deployed' | 'error';
  lastChecked: number;
  checkInterval: number; // milliseconds
  autoActivate?: boolean; // Add new flag for auto-activation
}

class ContractMonitorService {
  private monitoredContracts: Map<string, MonitoredContract> = new Map();
  private monitorIntervals: Map<string, NodeJS.Timeout> = new Map();
  private deploymentCallbacks: Map<string, ((contract: MonitoredContract) => void)[]> = new Map();
  private autoActivationCallbacks: Map<string, ((contract: MonitoredContract) => void)> = new Map();
  private provider: ethers.BrowserProvider | null = null;

  constructor() {
    // Initialize provider when service is created
    this.initProvider();
    
    // Load any previously monitored contracts from localStorage
    this.loadMonitoredContracts();
  }

  private async initProvider() {
    if (window.ethereum) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        console.log('Contract monitor provider initialized');
      } catch (err) {
        console.error('Error initializing contract monitor provider:', err);
      }
    }
  }

  private loadMonitoredContracts() {
    try {
      const saved = localStorage.getItem('monitoredContracts');
      if (saved) {
        const contracts = JSON.parse(saved) as MonitoredContract[];
        contracts.forEach(contract => {
          this.monitoredContracts.set(contract.contractAddress, contract);
          this.startMonitoring(contract.contractAddress);
        });
        console.log(`Loaded ${contracts.length} previously monitored contracts`);
      }
    } catch (error) {
      console.error('Error loading monitored contracts:', error);
    }
  }

  private saveMonitoredContracts() {
    try {
      const contracts = Array.from(this.monitoredContracts.values());
      localStorage.setItem('monitoredContracts', JSON.stringify(contracts));
    } catch (error) {
      console.error('Error saving monitored contracts:', error);
    }
  }

  public setAutoActivationCallback(callback: (contract: MonitoredContract) => void, contractAddress?: string) {
    if (contractAddress) {
      this.autoActivationCallbacks.set(contractAddress, callback);
    } else {
      this.autoActivationCallbacks.set('global', callback);
    }
  }

  public async monitorContract(
    contractAddress: string, 
    name: string, 
    mintPrice: string, 
    launchTime: number, 
    checkInterval = 30000, // Default to 30 seconds
    autoActivate = false  // Add option for auto-activation
  ): Promise<boolean> {
    if (!this.provider) {
      await this.initProvider();
      if (!this.provider) {
        console.error('Provider not available');
        return false;
      }
    }

    // Check if already monitoring
    if (this.monitoredContracts.has(contractAddress)) {
      // Update auto-activate setting if already monitoring
      const existingContract = this.monitoredContracts.get(contractAddress)!;
      existingContract.autoActivate = autoActivate;
      this.monitoredContracts.set(contractAddress, existingContract);
      this.saveMonitoredContracts();
      console.log(`Already monitoring contract ${contractAddress}, updated auto-activation to ${autoActivate}`);
      return true;
    }

    try {
      // Check if already deployed
      const isDeployed = await isTargetContractDeployed(this.provider, contractAddress);
      
      const contract: MonitoredContract = {
        contractAddress,
        name,
        mintPrice,
        launchTime,
        status: isDeployed ? 'deployed' : 'pending',
        lastChecked: Date.now(),
        checkInterval,
        autoActivate
      };

      this.monitoredContracts.set(contractAddress, contract);
      this.saveMonitoredContracts();

      // If not deployed yet, start monitoring
      if (!isDeployed) {
        this.startMonitoring(contractAddress);
        return true;
      }

      // If already deployed and auto-activate is enabled, trigger auto-activation
      if (isDeployed && autoActivate) {
        this.triggerAutoActivation(contract);
      }

      // If already deployed, trigger any callbacks immediately
      this.notifyDeployment(contract);
      return true;
    } catch (error) {
      console.error(`Error monitoring contract ${contractAddress}:`, error);

      // Create contract entry with error status
      const contract: MonitoredContract = {
        contractAddress,
        name,
        mintPrice,
        launchTime,
        status: 'error',
        lastChecked: Date.now(),
        checkInterval,
        autoActivate
      };

      this.monitoredContracts.set(contractAddress, contract);
      this.saveMonitoredContracts();
      return true;
    }
  }

  private startMonitoring(contractAddress: string) {
    // Clear any existing interval
    if (this.monitorIntervals.has(contractAddress)) {
      clearInterval(this.monitorIntervals.get(contractAddress)!);
    }

    const contract = this.monitoredContracts.get(contractAddress);
    if (!contract) return;

    const intervalId = setInterval(async () => {
      await this.checkContractDeployment(contractAddress);
    }, contract.checkInterval);

    this.monitorIntervals.set(contractAddress, intervalId);
    console.log(`Started monitoring contract ${contractAddress} every ${contract.checkInterval / 1000} seconds`);
  }

  private async checkContractDeployment(contractAddress: string) {
    const contract = this.monitoredContracts.get(contractAddress);
    if (!contract || contract.status === 'deployed') return;

    if (!this.provider) {
      await this.initProvider();
      if (!this.provider) {
        console.error('Provider not available for checking deployment');
        contract.status = 'error';
        this.monitoredContracts.set(contractAddress, contract);
        this.saveMonitoredContracts();
        return;
      }
    }

    try {
      const isDeployed = await isTargetContractDeployed(this.provider, contractAddress);
      contract.lastChecked = Date.now();

      if (isDeployed) {
        console.log(`Contract ${contractAddress} is now deployed!`);
        contract.status = 'deployed';
        this.monitoredContracts.set(contractAddress, contract);
        this.saveMonitoredContracts();
        
        // Stop monitoring
        if (this.monitorIntervals.has(contractAddress)) {
          clearInterval(this.monitorIntervals.get(contractAddress)!);
          this.monitorIntervals.delete(contractAddress);
        }

        // Notify callbacks
        this.notifyDeployment(contract);
        
        // Trigger auto-activation if enabled
        if (contract.autoActivate) {
          console.log(`Auto-activating bot for newly deployed contract ${contractAddress}`);
          this.triggerAutoActivation(contract);
        }
      }
    } catch (error) {
      console.error(`Error checking contract deployment for ${contractAddress}:`, error);
      contract.status = 'error';
      this.monitoredContracts.set(contractAddress, contract);
      this.saveMonitoredContracts();
      
      // Stop monitoring on error
      if (this.monitorIntervals.has(contractAddress)) {
        clearInterval(this.monitorIntervals.get(contractAddress)!);
        this.monitorIntervals.delete(contractAddress);
      }
    }
  }

  private notifyDeployment(contract: MonitoredContract) {
    const callbacks = this.deploymentCallbacks.get(contract.contractAddress) || [];
    callbacks.forEach(callback => {
      try {
        callback(contract);
      } catch (error) {
        console.error('Error in deployment callback:', error);
      }
    });
  }

  public onDeployment(contractAddress: string, callback: (contract: MonitoredContract) => void) {
    if (!this.deploymentCallbacks.has(contractAddress)) {
      this.deploymentCallbacks.set(contractAddress, []);
    }
    
    this.deploymentCallbacks.get(contractAddress)!.push(callback);

    // If the contract is already deployed, trigger the callback immediately
    const contract = this.monitoredContracts.get(contractAddress);
    if (contract && contract.status === 'deployed') {
      callback(contract);
    }
  }

  public stopMonitoring(contractAddress: string) {
    if (this.monitorIntervals.has(contractAddress)) {
      clearInterval(this.monitorIntervals.get(contractAddress)!);
      this.monitorIntervals.delete(contractAddress);
    }
    
    this.monitoredContracts.delete(contractAddress);
    this.deploymentCallbacks.delete(contractAddress);
    this.saveMonitoredContracts();
  }

  public getMonitoredContracts(): MonitoredContract[] {
    return Array.from(this.monitoredContracts.values());
  }

  public isMonitoring(contractAddress: string): boolean {
    return this.monitoredContracts.has(contractAddress);
  }

  public forceCheckAll() {
    this.monitoredContracts.forEach((_, address) => {
      this.checkContractDeployment(address);
    });
  }

  private triggerAutoActivation(contract: MonitoredContract) {
    // Try contract-specific callback first
    const specificCallback = this.autoActivationCallbacks.get(contract.contractAddress);
    if (specificCallback) {
      try {
        specificCallback(contract);
      } catch (error) {
        console.error('Error in contract-specific auto-activation callback:', error);
      }
    }

    // Then try global callback
    const globalCallback = this.autoActivationCallbacks.get('global');
    if (globalCallback) {
      try {
        globalCallback(contract);
      } catch (error) {
        console.error('Error in global auto-activation callback:', error);
      }
    }
  }
}

// Create singleton instance
const contractMonitorService = new ContractMonitorService();
export default contractMonitorService; 