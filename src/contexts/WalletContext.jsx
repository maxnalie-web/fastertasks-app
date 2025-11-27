import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@/components/ui/use-toast';

const WalletContext = createContext();

const CONTRACT_ADDRESS = '0x5571d4b93eB7469BaA0d41dCFf4A42944b830A33';
const BASE_CHAIN_ID = '0x2105'; // 8453 in hex

const CONTRACT_ABI = [
  "function owner() view returns (address)",
  "function verifierWallet() view returns (address)",
  "function platformWallet() view returns (address)",
  "function platformFeeBps() view returns (uint256)",
  "function nextTaskId() view returns (uint256)",
  "function nativeBalances(address) view returns (uint256)",
  "function tasks(uint256) view returns (address creator, address token, uint256 remainingReward, uint256 maxParticipants, uint256 participantsPaid, bool isActive)",
  "function createTaskNative(uint256 maxParticipants) payable external",
  "function allocateReward(uint256 taskId, address user, uint256 amount) external",
  "function withdrawNative() external",
  "function verifiers(address) view returns (bool)", // Keeping this for role check
  "event TaskCreated(uint256 indexed taskId, address indexed creator, uint256 maxParticipants, uint256 totalReward)",
  "event RewardAllocated(uint256 indexed taskId, address indexed user, uint256 amount)"
];

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [ethPrice, setEthPrice] = useState(0);
  const [platformFeeBps, setPlatformFeeBps] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchEthPrice();
  }, []);

  const fetchEthPrice = async () => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      setEthPrice(data.ethereum.usd);
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      setEthPrice(3000); // Fallback price
    }
  };

  const switchToBase = async (ethereum) => {
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID }],
      });
      return true;
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: BASE_CHAIN_ID,
              chainName: 'Base',
              nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
          return true;
        } catch (addError) {
          console.error('Error adding Base network:', addError);
          return false;
        }
      }
      return false;
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      toast({
        title: "MetaMask not found",
        description: "Please install MetaMask to use this app",
        variant: "destructive"
      });
      return;
    }

    try {
      const ethereum = window.ethereum;
      
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      if (chainId !== BASE_CHAIN_ID) {
        const switched = await switchToBase(ethereum);
        if (!switched) {
          toast({
            title: "Network switch required",
            description: "Please switch to Base Mainnet manually",
            variant: "destructive"
          });
          return;
        }
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const ethersProvider = new ethers.BrowserProvider(ethereum);
      const ethersSigner = await ethersProvider.getSigner();
      const ethersContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, ethersSigner);

      setAccount(accounts[0]);
      setProvider(ethersProvider);
      setSigner(ethersSigner);
      setContract(ethersContract);

      // Check roles and fetch platform fee
      const [ownerAddress, isVerifierStatus, feeBps] = await Promise.all([
        ethersContract.owner(),
        ethersContract.verifiers(accounts[0]),
        ethersContract.platformFeeBps()
      ]);
      
      setIsOwner(accounts[0].toLowerCase() === ownerAddress.toLowerCase());
      setIsVerifier(isVerifierStatus);
      setPlatformFeeBps(Number(feeBps));


      toast({
        title: "Wallet connected",
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast({
        title: "Connection failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    setIsOwner(false);
    setIsVerifier(false);
    setPlatformFeeBps(0);
    
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectWallet();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WalletContext.Provider value={{
      account,
      provider,
      signer,
      contract,
      isOwner,
      isVerifier,
      ethPrice,
      platformFeeBps,
      connectWallet,
      disconnectWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
};