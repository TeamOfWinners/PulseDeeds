import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import './App.css';
import PulseDeedNFT from './artifacts/contracts/PulseDeedNFT.sol/PulseDeedNFT.json';
import ConnectWallet from './components/ConnectWallet';
import Deed from './components/Deed';
import MintForm from './components/MintForm';

function App() {
  // Security utility functions
  const sanitizeText = (text) => {
    if (typeof text !== 'string') return '';
    
    // Create a new div element
    const tempDiv = document.createElement('div');
    // Set the text content (which escapes HTML)
    tempDiv.textContent = text;
    // Return the escaped HTML
    return tempDiv.innerHTML;
  };

  // Contract configuration
  const contractAddress = "0xC1BBb9401bA72E6E23cE5d03C92F7DEEe6595F9D";
  const abi = useMemo(() => PulseDeedNFT.abi, []);

  // State variables
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [networkName, setNetworkName] = useState('');
  const [error, setError] = useState(null);
  
  // Form states
  const [mintTo, setMintTo] = useState('');
  const [tokenURI, setTokenURI] = useState('');
  const [propertyValue, setPropertyValue] = useState('');
  const [transferTokenId, setTransferTokenId] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [newPropertyValue, setNewPropertyValue] = useState('');
  
  // Fee states
  const [mintFeeEstimate, setMintFeeEstimate] = useState('');
  const [transferFeeEstimate, setTransferFeeEstimate] = useState('');
  
  // UI states
  const [statusMessage, setStatusMessage] = useState('');
  const [userDeeds, setUserDeeds] = useState([]);
  const [isLoadingDeeds, setIsLoadingDeeds] = useState(false);
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  // Show notification
  const showNotification = useCallback((type, message) => {
    setNotification({
      show: true,
      type,
      message
    });
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setNotification(prev => ({...prev, show: false}));
    }, 5000);
  }, []);

  // Fetch all deeds owned by the user
  const fetchUserDeeds = useCallback(async (userAddress, contract) => {
    if (!userAddress || !contract) return;
    
    try {
      setIsLoadingDeeds(true);
      setUserDeeds([]);
      
      // Validate address
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid user address');
      }
      
      // Limit concurrent requests to prevent DOS and API rate limiting
      const MAX_CONCURRENT_REQUESTS = 3;
      const REQUEST_TIMEOUT = 10000; // 10 seconds
      
      // Create a function that wraps promises with a timeout
      const withTimeout = (promise, ms) => {
        const timeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), ms);
        });
        return Promise.race([promise, timeout]);
      };
      
      try {
        // Get total tokens count
        const nextId = await withTimeout(contract.nextTokenId(), REQUEST_TIMEOUT);
        const totalTokens = parseInt(nextId.toString());
        
        if (totalTokens === 0) {
          setUserDeeds([]);
          return;
        }
        
        // Cap total tokens to prevent DOS attacks (if contract is somehow compromised)
        const SAFE_MAX_TOKENS = 1000;
        const processedTotalTokens = Math.min(totalTokens, SAFE_MAX_TOKENS);
        
        // Process tokens in smaller batches
        const batchSize = 5;
        let userDeeds = [];
        
        // Process in limited parallel batches
        for (let batchStart = 0; batchStart < processedTotalTokens; batchStart += batchSize * MAX_CONCURRENT_REQUESTS) {
          const batchPromises = [];
          const batchEnd = Math.min(batchStart + batchSize * MAX_CONCURRENT_REQUESTS, processedTotalTokens);
          
          for (let i = 0; i < MAX_CONCURRENT_REQUESTS; i++) {
            const startIndex = batchStart + i * batchSize;
            const endIndex = Math.min(startIndex + batchSize, batchEnd);
            
            if (startIndex < batchEnd) {
              batchPromises.push(
                (async () => {
                  const batchResults = [];
                  
                  for (let id = startIndex; id < endIndex; id++) {
                    try {
                      // First check if the deed exists and user owns it
                      const owner = await withTimeout(contract.ownerOf(id), REQUEST_TIMEOUT);
                      
                      if (owner.toLowerCase() === userAddress.toLowerCase()) {
                        // Use getDeedDetails to get all deed info in one call
                        const deedDetails = await withTimeout(contract.getDeedDetails(id), REQUEST_TIMEOUT);
                        
                        // The function returns [exists, uri, value, transferFee]
                        if (deedDetails[0]) { // If exists is true
                          const tokenURIValue = deedDetails[1];
                          const propertyValue = deedDetails[2];
                          const transferFee = deedDetails[3];
                          
                          // Sanitize and validate the URI
                          let sanitizedURI = tokenURIValue;
                          try {
                            const url = new URL(tokenURIValue);
                            if (!['http:', 'https:', 'ipfs:'].includes(url.protocol)) {
                              throw new Error('Invalid protocol');
                            }
                            sanitizedURI = url.toString();
                          } catch (error) {
                            console.warn(`Invalid URI format for token ${id}: ${error.message}`);
                            sanitizedURI = '';
                          }
                          
                          // Fetch metadata from the URI with security checks
                          let metadata = null;
                          try {
                            if (sanitizedURI) {
                              const controller = new AbortController();
                              const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
                              
                              const response = await fetch(sanitizedURI, {
                                signal: controller.signal,
                                headers: {
                                  'Accept': 'application/json'
                                }
                              });
                              
                              clearTimeout(timeoutId);
                              
                              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                              
                              // Validate content type
                              const contentType = response.headers.get('content-type');
                              if (!contentType || !contentType.includes('application/json')) {
                                throw new Error('Invalid content type, expected JSON');
                              }
                              
                              // Limit response size to prevent memory issues
                              const MAX_JSON_SIZE = 1024 * 1024; // 1MB
                              const reader = response.body.getReader();
                              let receivedLength = 0;
                              let chunks = [];
                              
                              while(true) {
                                const {done, value} = await reader.read();
                                
                                if (done) {
                                  break;
                                }
                                
                                chunks.push(value);
                                receivedLength += value.length;
                                
                                if (receivedLength > MAX_JSON_SIZE) {
                                  reader.cancel();
                                  throw new Error('Response too large');
                                }
                              }
                              
                              // Concatenate chunks into a single Uint8Array
                              const chunksAll = new Uint8Array(receivedLength);
                              let position = 0;
                              for(let chunk of chunks) {
                                chunksAll.set(chunk, position);
                                position += chunk.length;
                              }
                              
                              // Convert to text
                              const jsonText = new TextDecoder('utf-8').decode(chunksAll);
                              
                              // Parse JSON safely
                              try {
                                metadata = JSON.parse(jsonText);
                                
                                // Validate expected fields and sanitize
                                if (typeof metadata !== 'object' || metadata === null) {
                                  throw new Error('Invalid metadata format');
                                }
                                
                                // Ensure required properties exist and are of correct type
                                metadata = {
                                  name: typeof metadata.name === 'string' ? metadata.name : 'Unknown Property',
                                  description: typeof metadata.description === 'string' ? metadata.description : '',
                                  image: typeof metadata.image === 'string' ? metadata.image : '',
                                  attributes: Array.isArray(metadata.attributes) ? metadata.attributes : []
                                };
                                
                                // Validate attributes format
                                metadata.attributes = metadata.attributes.filter(attr => 
                                  attr && typeof attr === 'object' && 
                                  typeof attr.trait_type === 'string' &&
                                  attr.value !== undefined
                                );
                              } catch (jsonError) {
                                throw new Error('Invalid JSON format');
                              }
                            }
                          } catch (metadataError) {
                            console.error(`Error fetching metadata for token ${id}:`, metadataError);
                            metadata = {
                              name: 'Unknown Property',
                              description: 'Metadata unavailable',
                              image: '',
                              attributes: []
                            };
                          }
                          
                          batchResults.push({
                            id,
                            tokenURI: sanitizedURI || 'Unknown URI',
                            metadata,
                            propertyValue: propertyValue.toString() !== '0' ? propertyValue : null,
                            transferFee: transferFee
                          });
                        }
                      }
                    } catch (error) {
                      // Skip tokens that don't exist or have other issues
                      console.log(`Token ${id} error:`, error.message);
                    }
                  }
                  
                  return batchResults;
                })()
              );
            }
          }
          
          try {
            const batchResultsArray = await Promise.all(batchPromises);
            const flatResults = batchResultsArray.flat();
            userDeeds = [...userDeeds, ...flatResults];
            
            // Update UI with partial results to improve perceived performance
            if (userDeeds.length > 0) {
              // Create a copy to avoid reference issues
              setUserDeeds([...userDeeds].sort((a, b) => a.id - b.id));
            }
          } catch (batchError) {
            console.error('Error processing token batch:', batchError);
            // Continue with next batch despite errors
          }
        }
        
        // Final sort and update of deeds
        userDeeds.sort((a, b) => a.id - b.id);
        setUserDeeds(userDeeds);
      } catch (contractError) {
        console.error('Contract interaction error:', contractError);
        throw new Error(`Contract error: ${contractError.message}`);
      }
    } catch (error) {
      console.error('Error fetching user deeds:', error);
      showNotification('error', `Error loading your deeds: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoadingDeeds(false);
    }
  }, [showNotification]);

  // Helper to format PLS amounts
  const formatPLS = useCallback((weiAmount) => {
    if (!weiAmount) return '0 PLS';
    try {
      const formatted = ethers.formatEther(weiAmount.toString());
      // Show at most 5 decimal places and remove trailing zeros
      return `${parseFloat(parseFloat(formatted).toFixed(5))} PLS`;
    } catch (error) {
      console.error('Error formatting PLS amount', error);
      return '0 PLS';
    }
  }, []);
  
  // Estimate mint fee
  const estimateMintFee = useCallback(async (value) => {
    if (!contract || !value) {
      setMintFeeEstimate('');
      return;
    }
    
    try {
      // Convert to wei (assuming value is in PLS)
      const valueInWei = value ? ethers.parseEther(value.toString()) : 0;
      const fee = await contract.estimateMintFee(valueInWei);
      setMintFeeEstimate(formatPLS(fee));
    } catch (error) {
      console.error('Error estimating mint fee', error);
      setMintFeeEstimate('Error calculating fee');
    }
  }, [contract, formatPLS]);

  // Estimate transfer fee
  const estimateTransferFee = useCallback(async (tokenId, newValue) => {
    if (!contract || !tokenId) {
      setTransferFeeEstimate('');
      return;
    }
    
    try {
      // Convert to wei (assuming value is in PLS)
      const newValueInWei = newValue ? ethers.parseEther(newValue.toString()) : 0;
      const fee = await contract.estimateTransferFee(tokenId, newValueInWei);
      setTransferFeeEstimate(formatPLS(fee));
    } catch (error) {
      console.error('Error estimating transfer fee', error);
      setTransferFeeEstimate('Error calculating fee');
    }
  }, [contract, formatPLS]);

  // Handle deed transfer
  const handleTransferDeed = useCallback(async (e) => {
    e.preventDefault();
    
    if (!contract || !signer || !transferTokenId || !transferTo) {
      showNotification('error', 'Missing required information');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Processing transfer...');
      setError('');
      
      // Validate addresses
      if (!ethers.isAddress(transferTo)) {
        throw new Error('Invalid recipient address');
      }
      
      // Get owner of token
      const owner = await contract.ownerOf(transferTokenId);
      
      // Ensure sender owns the token
      if (owner.toLowerCase() !== account.toLowerCase()) {
        throw new Error('You do not own this token');
      }
      
      // Convert new property value to wei if provided
      const newValueInWei = newPropertyValue ? ethers.parseEther(newPropertyValue.toString()) : 0;
      
      // Get the transfer fee
      const fee = await contract.estimateTransferFee(transferTokenId, newValueInWei);
      
      // Execute transfer transaction
      const tx = await contract.transferDeed(
        owner,
        transferTo,
        transferTokenId,
        newValueInWei,
        { value: fee }
      );
      
      setStatusMessage('Confirming transaction...');
      showNotification('info', 'Transaction submitted, waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        showNotification('success', 'Deed transferred successfully!');
        
        // Clear form fields
        setTransferTokenId('');
        setTransferTo('');
        setNewPropertyValue('');
        setTransferFeeEstimate('');
        
        // Refresh user deeds after transfer
        fetchUserDeeds(account, contract);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error transferring deed:', error);
      setError(error.message);
      showNotification('error', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  }, [account, contract, fetchUserDeeds, showNotification, signer, transferTo, transferTokenId, newPropertyValue]);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = useMemo(() => {
    return typeof window !== 'undefined' && window.ethereum !== undefined;
  }, []);

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setStatusMessage('Connecting to wallet...');
      
      // Check if MetaMask is installed
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No Ethereum provider found. Please install MetaMask!');
      }
      
      // Verify if we're on a secure context
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error('For security reasons, please connect using HTTPS');
      }
      
      console.log('Requesting accounts...');
      
      // Request accounts access - forcing MetaMask popup to appear
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts',
        params: []
      });
      
      console.log('Accounts received:', accounts);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please ensure MetaMask is unlocked');
      }
      
      // Create provider, signer, and contract instance
      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log('Provider created');
      
      const signer = await provider.getSigner();
      console.log('Signer obtained');
      
      // Verify the contract address is valid
      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Invalid contract address configuration');
      }
      
      const contract = new ethers.Contract(contractAddress, abi, signer);
      console.log('Contract instance created');
      
      // Get network information
      const network = await provider.getNetwork();
      const networkName = network.name === 'unknown' ? `Chain ID: ${network.chainId}` : network.name;
      console.log('Connected to network:', networkName);
      
      // Check if we're on PulseChain or a testnet for development
      const chainId = network.chainId;
      const validChainIds = [369, 940, 941, 943]; // PulseChain mainnet, testnet v4, testnet v4v
      
      // For development, allow any network
      if (!validChainIds.includes(Number(chainId)) && 
          process.env.NODE_ENV === 'production') {
        throw new Error(`Please connect to PulseChain. Current network: ${networkName}`);
      }
      
      // Update state with connection info
      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      setAccount(accounts[0]);
      setIsConnected(true);
      setNetworkName(networkName);
      setStatusMessage('');
      showNotification('success', 'Wallet connected successfully!');
      
      // Load user's deeds after connecting
      fetchUserDeeds(accounts[0], contract);
      
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      setStatusMessage('');
      
      // Handle specific connection errors
      if (error.code === 4001) {
        // User rejected request
        showNotification('error', 'Connection rejected. Please approve the connection request.');
      } else if (error.code === -32002) {
        // Request already pending
        showNotification('error', 'Connection request already pending. Please check MetaMask.');
      } else if (error.message && error.message.includes('Already processing eth_requestAccounts')) {
        // Another way MetaMask reports pending requests
        showNotification('info', 'MetaMask popup is already open. Please check your browser extensions.');
      } else {
        showNotification('error', `Error connecting: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [abi, contractAddress, fetchUserDeeds, showNotification]);
  
  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setAccount('');
    setIsConnected(false);
    setUserDeeds([]);
    setNetworkName('');
    
    showNotification('info', 'Wallet disconnected');
  }, [showNotification]);

  // Pre-fill mint form with current user address
  const handleSelfMint = useCallback(() => {
    if (account) {
      setMintTo(account);
    }
  }, [account]);

  // Extract attribute value from metadata
  const getAttributeValue = useCallback((metadata, traitType) => {
    if (!metadata || !metadata.attributes) return 'Unknown';
    
    const attribute = metadata.attributes.find(attr => 
      attr.trait_type?.toLowerCase() === traitType.toLowerCase() && 
      attr.value !== undefined
    );
    
    // Sanitize the value to prevent XSS
    return attribute ? sanitizeText(String(attribute.value)) : 'Unknown';
  }, []);

  // Get property description from metadata
  const getPropertyDescription = useCallback((metadata) => {
    if (!metadata) return 'No description available';
    
    if (metadata.description) return sanitizeText(metadata.description);
    
    // Build description from attributes if no description field
    const bedrooms = getAttributeValue(metadata, 'Bedrooms');
    const bathrooms = getAttributeValue(metadata, 'Bathrooms');
    const sqft = getAttributeValue(metadata, 'Square Feet');
    
    return `${bedrooms} bed, ${bathrooms} bath, ${sqft} sqft`;
  }, [getAttributeValue]);

  // Format address for display
  const formatAddress = useCallback((address) => {
    if (!address || typeof address !== 'string' || !ethers.isAddress(address)) {
      return 'Invalid Address';
    }
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, []);

  // Helper to copy address to clipboard with safety checks
  const copyToClipboard = useCallback((text) => {
    if (typeof text !== 'string' || text.length === 0) {
      showNotification('error', 'Nothing to copy');
      return;
    }
    
    // Rate limiting to prevent abuse
    const now = Date.now();
    const lastCopied = sessionStorage.getItem('lastCopied');
    if (lastCopied && now - parseInt(lastCopied) < 1000) {
      // Prevent copy more than once per second
      return;
    }
    sessionStorage.setItem('lastCopied', now.toString());
    
    navigator.clipboard.writeText(text).then(
      () => {
        showNotification('info', 'Address copied to clipboard');
      },
      (err) => {
        console.error('Could not copy text: ', err);
        showNotification('error', 'Failed to copy to clipboard');
      }
    );
  }, [showNotification]);

  // Listen for account and network changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          if (contract) {
            fetchUserDeeds(accounts[0], contract);
          }
        } else {
          setAccount('');
          setIsConnected(false);
          setUserDeeds([]);
        }
      };
      
      const handleChainChanged = () => {
        // Reload the page when the chain changes
        window.location.reload();
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Cleanup
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [contract, fetchUserDeeds]);

  // Handle deed minting
  const handleMintDeed = useCallback(async (e) => {
    e.preventDefault();
    
    if (!contract || !signer || !mintTo || !tokenURI) {
      showNotification('error', 'Missing required information');
      return;
    }
    
    try {
      setIsLoading(true);
      setStatusMessage('Processing mint...');
      setError('');
      
      // Validate address
      if (!ethers.isAddress(mintTo)) {
        throw new Error('Invalid recipient address');
      }
      
      // Convert to wei if property value is provided
      const propertyValueInWei = propertyValue ? ethers.parseEther(propertyValue.toString()) : 0;
      
      // Get the mint fee
      const fee = await contract.estimateMintFee(propertyValueInWei);
      
      // Execute mint transaction
      const tx = await contract.mintDeed(
        mintTo,
        tokenURI,
        propertyValueInWei,
        { value: fee }
      );
      
      setStatusMessage('Confirming transaction...');
      showNotification('info', 'Transaction submitted, waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Get the token ID from the event
        const event = receipt.logs
          .map(log => { try { return contract.interface.parseLog(log); } catch (e) { return null; }})
          .filter(event => event && event.name === 'DeedMinted')[0];
          
        const tokenId = event ? event.args.tokenId.toString() : 'unknown';
        
        showNotification('success', `Deed minted successfully! Token ID: ${tokenId}`);
        
        // Clear form fields
        setTokenURI('');
        setPropertyValue('');
        
        // Refresh user deeds after minting
        fetchUserDeeds(account, contract);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error minting deed:', error);
      setError(error.message);
      showNotification('error', `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  }, [account, contract, fetchUserDeeds, mintTo, propertyValue, showNotification, signer, tokenURI]);

  // Error handling utility
  const handleError = useCallback((error) => {
    console.error('Error:', error);
    setError(error.message || 'An error occurred');
    setIsLoading(false);
  }, []);

  // Initialize provider and signer
  useEffect(() => {
    const init = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          setProvider(provider);
          
          const network = await provider.getNetwork();
          setNetworkName(network.name);
          
          const signer = await provider.getSigner();
          setSigner(signer);
          
          const contract = new ethers.Contract(contractAddress, abi, signer);
          setContract(contract);
        }
      } catch (error) {
        handleError(error);
      }
    };
    
    init();
  }, [abi, handleError]);

  // Landing page when not connected
  if (!isConnected) {
    return (
      <div className="landing-page">
        <div className="neon-grid"></div>
        <div className="landing-content">
          <div className="logo-container">
            <div className="neon-house"></div>
            <h1>🏠 PulseDeeds</h1>
          </div>
          <h2>Your Decentralized Property Vault</h2>
          <p>Securely mint, store, and transfer property deeds as NFTs on the PulseChain network</p>
          <button 
            onClick={connectWallet} 
            className="connect-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner small"></div>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span className="wallet-icon">💼</span>
                <span>Connect Wallet</span>
              </>
            )}
          </button>
          
          {!isMetaMaskInstalled && (
            <div className="metamask-warning">
              <p>MetaMask not detected! Please install MetaMask to use this app.</p>
              <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="metamask-link">
                Install MetaMask
              </a>
            </div>
          )}
          
          {statusMessage && <div className="status-message">{statusMessage}</div>}
          {notification.show && (
            <div className={`notification ${notification.type}`}>
              {notification.message}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="brand">
            <div className="logo-container">
              <div className="neon-house small"></div>
              <h1>PulseDeeds</h1>
            </div>
            <p>Decentralized Property Deed Registry</p>
          </div>
          <div className="wallet-info">
            <div className="network-badge">
              <span className="network-indicator"></span>
              <span>{networkName}</span>
            </div>
            <div 
              className="account-info" 
              onClick={() => copyToClipboard(account)}
              title="Click to copy address"
            >
              <span className="wallet-icon">💼</span>
              <span>{formatAddress(account)}</span>
              <span className="copy-icon">📋</span>
            </div>
            <button onClick={disconnectWallet} className="disconnect-button">
              Disconnect
            </button>
          </div>
        </div>
      </header>
      
      <main>
        {/* Notification */}
        {notification.show && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        {/* Status Message */}
        {statusMessage && (
          <div className={`status-message ${isLoading ? 'loading' : ''}`}>
            <div className="spinner"></div>
            <span>{statusMessage}</span>
          </div>
        )}
        
        <div className="app-sections">
          {/* My Deeds Section */}
          <div className="section my-deeds-section">
            <h2>🏡 My Deeds</h2>
            {isLoadingDeeds ? (
              <div className="loading-deeds">
                <div className="spinner"></div>
                <p>Loading your property deeds...</p>
              </div>
            ) : userDeeds.length === 0 ? (
              <div className="no-deeds">
                <div className="empty-state-icon">🏠</div>
                <p>You don't own any property deeds yet.</p>
                <p>Mint a new deed or have someone transfer a deed to you.</p>
              </div>
            ) : (
              <>
                <div className="deed-count">You own {userDeeds.length} property deed{userDeeds.length !== 1 ? 's' : ''}</div>
                <div className="deeds-grid">
                  {userDeeds.map(deed => (
                    <div key={deed.id} className="deed-card">
                      {deed.metadata.image ? (
                        <div className="deed-image">
                          <img 
                            src={deed.metadata.image} 
                            alt={deed.metadata.name || 'Property'} 
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyMHB4IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNSkiPkltYWdlIE5vdCBBdmFpbGFibGU8L3RleHQ+PC9zdmc+';
                              console.log('Image load error for deed', deed.id);
                            }}
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        </div>
                      ) : (
                        <div className="deed-image deed-image-placeholder">
                          <span>🏠</span>
                          <span>No Image</span>
                        </div>
                      )}
                      <div className="deed-details">
                        <h3>{sanitizeText(deed.metadata.name || 'Unknown Property')}</h3>
                        <p className="deed-id">Token ID: {deed.id}</p>
                        <p className="deed-description">{getPropertyDescription(deed.metadata)}</p>
                        
                        {deed.propertyValue && (
                          <div className="property-value">
                            <span className="property-value-label">Property Value:</span>
                            <span>{formatPLS(deed.propertyValue)}</span>
                          </div>
                        )}
                        
                        <div className="deed-attributes">
                          <div className="attribute">
                            <span className="attribute-label">Square Feet:</span>
                            <span className="attribute-value">{getAttributeValue(deed.metadata, 'Square Feet')}</span>
                          </div>
                          <div className="attribute">
                            <span className="attribute-label">Bedrooms:</span>
                            <span className="attribute-value">{getAttributeValue(deed.metadata, 'Bedrooms')}</span>
                          </div>
                          <div className="attribute">
                            <span className="attribute-label">Bathrooms:</span>
                            <span className="attribute-value">{getAttributeValue(deed.metadata, 'Bathrooms')}</span>
                          </div>
                          {deed.metadata.attributes?.some(attr => attr.trait_type === 'Property Type') && (
                            <div className="attribute">
                              <span className="attribute-label">Type:</span>
                              <span className="attribute-value">{getAttributeValue(deed.metadata, 'Property Type')}</span>
                            </div>
                          )}
                          {deed.transferFee && (
                            <div className="attribute">
                              <span className="attribute-label">Transfer Fee:</span>
                              <span className="attribute-value">{formatPLS(deed.transferFee)}</span>
                            </div>
                          )}
                        </div>
                        <div className="deed-actions">
                          <button 
                            className="action-button" 
                            onClick={() => {
                              setTransferTokenId(deed.id.toString());
                              // Also pre-fill the current property value if it exists
                              if (deed.propertyValue) {
                                const valueInEther = ethers.formatEther(deed.propertyValue);
                                setNewPropertyValue(valueInEther);
                              }
                              document.getElementById('transfer-form').scrollIntoView({ behavior: 'smooth' });
                            }}
                          >
                            Transfer This Deed
                          </button>
                          <button 
                            className="action-button secondary" 
                            onClick={() => copyToClipboard(deed.tokenURI)}
                            title="Copy metadata URI"
                          >
                            Copy URI
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="form-sections">
            {/* Mint Deed Section */}
            <div className="section form-container mint-form">
              <h2>🛠️ Mint a New Deed</h2>
              <MintForm 
                mintTo={mintTo}
                setMintTo={setMintTo}
                tokenURI={tokenURI}
                setTokenURI={setTokenURI}
                propertyValue={propertyValue}
                setPropertyValue={setPropertyValue}
                mintFeeEstimate={mintFeeEstimate}
                estimateMintFee={estimateMintFee}
                loading={isLoading}
                error={error}
                handleSelfMint={handleSelfMint}
                contract={contract}
                showNotification={showNotification}
                fetchUserDeeds={fetchUserDeeds}
                account={account}
                handleSubmit={handleMintDeed}
              />
            </div>
            
            {/* Transfer Deed Section */}
            <div id="transfer-form" className="section form-container transfer-form">
              <h2>🔄 Transfer a Deed</h2>
              <form onSubmit={handleTransferDeed}>
                <div className="form-group">
                  <label>Token ID:</label>
                  <input 
                    type="number" 
                    value={transferTokenId} 
                    onChange={(e) => setTransferTokenId(e.target.value)}
                    placeholder="0"
                    disabled={isLoading}
                    required
                  />
                  {userDeeds.length > 0 && (
                    <div className="token-selector">
                      <small>My tokens: </small>
                      {userDeeds.map(deed => (
                        <span 
                          key={deed.id} 
                          className="token-id-badge"
                          onClick={() => setTransferTokenId(deed.id.toString())}
                        >
                          {deed.id}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="form-group">
                  <label>New Owner Address:</label>
                  <input 
                    type="text" 
                    value={transferTo} 
                    onChange={(e) => setTransferTo(e.target.value)}
                    placeholder="0x..."
                    disabled={isLoading}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>New Property Value (PLS):</label>
                  <input 
                    type="number" 
                    value={newPropertyValue} 
                    onChange={(e) => setNewPropertyValue(e.target.value)}
                    placeholder="New property value in PLS (optional)"
                    disabled={isLoading}
                    min="0"
                    step="0.01"
                  />
                  <small className="form-hint">
                    Optional: Update the property value on transfer
                  </small>
                </div>
                
                {transferFeeEstimate && (
                  <div className="fee-display">
                    <span className="fee-label">Estimated Fee:</span>
                    <span className="fee-amount">{transferFeeEstimate}</span>
                    <small className="fee-hint">Fee is 0.3% of property value or minimum 0.005 PLS</small>
                  </div>
                )}
                
                <button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="spinner small"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>Transfer Deed</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
      
      <footer>
        <p>PulseDeeds - Decentralized Property Deed Registry on PulseChain</p>
        <div className="footer-links">
          <a href="https://pulsechain.com" target="_blank" rel="noopener noreferrer">PulseChain</a>
          <span className="divider">|</span>
          <a href="#" onClick={(e) => {
            e.preventDefault();
            showNotification('info', 'Contract address copied to clipboard');
            copyToClipboard(contractAddress);
          }}>Contract</a>
        </div>
      </footer>
    </div>
  );
}

export default App; 