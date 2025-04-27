import React from 'react';

const Deed = ({ 
  deed, 
  formatPLS, 
  getAttributeValue, 
  getPropertyDescription, 
  handleTransfer, 
  copyToClipboard, 
  sanitizeText 
}) => {
  return (
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
            onClick={() => handleTransfer(deed.id, deed.propertyValue)}
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
  );
};

export default Deed; 