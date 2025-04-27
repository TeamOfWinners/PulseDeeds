import React from 'react';

const ConnectWallet = ({ connectWallet, isLoading }) => {
  return (
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
  );
};

export default ConnectWallet; 