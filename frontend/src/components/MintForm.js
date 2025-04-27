import React, { useEffect } from 'react';
import { ethers } from 'ethers';

const MintForm = ({
  mintTo,
  setMintTo,
  tokenURI,
  setTokenURI,
  propertyValue,
  setPropertyValue,
  mintFeeEstimate,
  estimateMintFee,
  loading,
  error,
  handleSelfMint,
  contract,
  showNotification,
  fetchUserDeeds,
  account,
  handleSubmit
}) => {
  // Update fee estimate when property value changes
  useEffect(() => {
    if (propertyValue) {
      estimateMintFee(propertyValue);
    }
  }, [propertyValue, estimateMintFee]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Recipient Address:</label>
        <div className="input-with-button">
          <input 
            type="text" 
            value={mintTo} 
            onChange={(e) => setMintTo(e.target.value)}
            placeholder="0x..."
            disabled={loading}
            required
          />
          <button 
            type="button" 
            onClick={handleSelfMint}
            className="action-button small"
            disabled={loading}
          >
            Use My Address
          </button>
        </div>
      </div>
      
      <div className="form-group">
        <label>
          Metadata URI: 
          <span className="tooltip" title="IPFS or HTTP URL to JSON metadata">ℹ️</span>
        </label>
        <input 
          type="text" 
          value={tokenURI} 
          onChange={(e) => setTokenURI(e.target.value)}
          placeholder="ipfs://... or https://..."
          disabled={loading}
          required
        />
        <small className="form-hint">
          Link to a JSON file with property metadata (name, image, attributes)
        </small>
      </div>
      
      <div className="form-group">
        <label>Property Value (PLS):</label>
        <input 
          type="number" 
          value={propertyValue} 
          onChange={(e) => setPropertyValue(e.target.value)}
          placeholder="Property value in PLS"
          disabled={loading}
          min="0"
          step="0.01"
        />
        <small className="form-hint">
          Optional: Used to calculate transfer fees (0.3%)
        </small>
      </div>
      
      {mintFeeEstimate && (
        <div className="fee-display">
          <span className="fee-label">Estimated Fee:</span>
          <span className="fee-amount">{mintFeeEstimate}</span>
          <small className="fee-hint">Fee is 0.3% of property value or minimum 0.01 PLS</small>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? (
          <>
            <div className="spinner small"></div>
            <span>Processing...</span>
          </>
        ) : (
          <>Mint Deed</>
        )}
      </button>
    </form>
  );
};

export default MintForm; 