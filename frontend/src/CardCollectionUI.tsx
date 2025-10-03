"use client";

import { useFhevm } from "@/fhevm/useFhevm";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFHECardCollection } from "@/fhevm/useFHECardCollection";
import { useMemo, useState } from "react";

export const CardCollectionUI = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const { instance: fhevmInstance, status: fhevmStatus, error: fhevmError } =
    useFhevm({ provider, chainId, initialMockChains, enabled: true });

  const cc = useFHECardCollection({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [tokenId, setTokenId] = useState<number>(1);
  const [mintForm, setMintForm] = useState({
    name: "",
    description: "",
    image: "",
    tags: "",
  });

  const tagsArray = useMemo(() =>
    mintForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5),
  [mintForm.tags]);

  if (!isConnected) {
    return (
      <div className="gradient-bg connect-container">
        <div className="connect-card fade-in">
          <h1 className="connect-title">🎴 ChainCard</h1>
          <p className="connect-subtitle">
            Your Encrypted NFT Card Collection on Blockchain
          </p>
          <p style={{ color: '#718096', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Collect, trade, and manage cards with fully homomorphic encryption. 
            Connect your wallet to get started.
          </p>
          <button className="btn-primary" onClick={connect} style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
            🦊 Connect MetaMask Wallet
        </button>
        </div>
      </div>
    );
  }

  if (cc.isDeployed === false) {
    return (
      <div className="gradient-bg connect-container">
        <div className="error-card fade-in" style={{ maxWidth: '600px', margin: '0 1rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚠️ Contract Not Deployed</h2>
          <p style={{ fontSize: '1.125rem' }}>
            CardCollection contract is not deployed on Chain ID: {chainId}
          </p>
          <p style={{ marginTop: '1rem', opacity: 0.9 }}>
            Please switch to a supported network or deploy the contract first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg" style={{ minHeight: '100vh' }}>
      <div className="app-layout fade-in">
        {/* Left Sidebar */}
        <aside className="sidebar glass-card">
          <div style={{ padding: '2rem 1.5rem' }}>
            {/* Logo/Brand */}
            <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎴</div>
              <h1 style={{ 
                fontSize: '1.75rem', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '0.25rem'
              }}>
                ChainCard
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#718096' }}>
                Encrypted NFT Collection
              </p>
            </div>

            <div style={{ borderTop: '2px solid #e0e0e0', paddingTop: '1.5rem' }}>
              <h3 style={{ 
                fontSize: '1rem', 
                fontWeight: '700', 
                color: '#2d3748',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔗 Network Info
              </h3>
              
              <div className="sidebar-info-item">
                <p className="sidebar-label">Chain ID</p>
                <p className="code-text" style={{ fontSize: '0.9rem' }}>{chainId}</p>
              </div>

              <div className="sidebar-info-item">
                <p className="sidebar-label">Account</p>
                <p className="code-text" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {accounts?.[0]?.slice(0, 10)}...{accounts?.[0]?.slice(-8)}
                </p>
              </div>

              <div className="sidebar-info-item">
                <p className="sidebar-label">FHEVM Status</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%',
                    background: fhevmStatus === 'ready' ? '#28C76F' : '#f5576c',
                    display: 'inline-block'
                  }} />
                  <p className="code-text" style={{ fontSize: '0.9rem' }}>{fhevmStatus}</p>
                </div>
              </div>

              <div className="sidebar-info-item">
                <p className="sidebar-label">Contract</p>
                <p className="code-text" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {cc.contractAddress?.slice(0, 10)}...{cc.contractAddress?.slice(-8)}
                </p>
              </div>

              {fhevmError && (
                <div style={{ 
                  marginTop: '1rem', 
                  padding: '0.75rem', 
                  background: 'linear-gradient(135deg, #ff6b6b15 0%, #ee5a6f15 100%)', 
                  borderRadius: '8px',
                  border: '1px solid #ff6b6b40'
                }}>
                  <p style={{ fontSize: '0.8rem', color: '#c53030', fontWeight: '600' }}>
                    ⚠️ {String(fhevmError)}
                  </p>
                </div>
              )}
            </div>

            {/* Powered by Footer in Sidebar */}
            <div style={{ 
              position: 'absolute', 
              bottom: '1.5rem', 
              left: '1.5rem',
              right: '1.5rem',
              paddingTop: '1rem',
              borderTop: '2px solid #e0e0e0'
            }}>
              <p style={{ fontSize: '0.75rem', color: '#718096', textAlign: 'center', lineHeight: '1.4' }}>
                🔐 Powered by<br />FHEVM Encryption
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Top Header Bar */}
          <div className="top-bar glass-card" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2d3748' }}>
              Dashboard
            </h2>
            <p style={{ fontSize: '0.95rem', color: '#718096' }}>
              Manage your encrypted NFT card collection with privacy and security
            </p>
          </div>

          {/* Mint Card Section - Now at Top */}
          <div className="glass-card card-section" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>✨ Mint New Card</h2>
                <p style={{ color: '#718096', fontSize: '0.95rem' }}>
                  Create a new unique card with custom metadata
                </p>
              </div>
            </div>
            
            <div className="mint-form-grid">
              <div className="form-group">
                <label className="form-label">Card Name</label>
                <input 
                  className="input-field" 
                  placeholder="Enter card name" 
                  value={mintForm.name} 
                  onChange={(e) => setMintForm({ ...mintForm, name: e.target.value })} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input 
                  className="input-field" 
                  placeholder="Describe your card" 
                  value={mintForm.description} 
                  onChange={(e) => setMintForm({ ...mintForm, description: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Image URL</label>
                <input 
                  className="input-field" 
                  placeholder="https://example.com/image.jpg" 
                  value={mintForm.image} 
                  onChange={(e) => setMintForm({ ...mintForm, image: e.target.value })} 
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Tags (comma separated, max 5)</label>
                <input 
                  className="input-field" 
                  placeholder="rare, legendary, epic" 
                  value={mintForm.tags} 
                  onChange={(e) => setMintForm({ ...mintForm, tags: e.target.value })} 
                />
                {tagsArray.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {tagsArray.map((tag, idx) => (
                      <span key={idx} className="stat-badge" style={{ fontSize: '0.8rem' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
      </div>

              <div style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                <button 
                  className="btn-primary" 
                  disabled={!cc.canRun}
                  onClick={async () => { 
                    await cc.mint(mintForm.name, mintForm.description, mintForm.image, tagsArray); 
                  }}
                  style={{ width: '100%', fontSize: '1.125rem', padding: '1rem' }}
                >
                  🎨 Mint Card NFT
                </button>
              </div>
            </div>
      </div>

          {/* Card Popularity Section */}
          <div className="glass-card card-section" style={{ padding: '2rem' }}>
            <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>📊 Card Popularity Manager</h2>
            <p style={{ color: '#718096', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Track and manage encrypted popularity scores for your cards
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Left Column - Input and Actions */}
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Token ID</label>
            <input
                    className="input-field"
              type="number"
              value={tokenId}
              onChange={(e) => setTokenId(Number(e.target.value))}
                    placeholder="Enter Token ID"
                    min="1"
                  />
                </div>

                <button 
                  className="btn-primary" 
                  disabled={!cc.canGetPopularity} 
                  onClick={() => cc.refreshPopularityHandle(tokenId)}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  🔄 Refresh Popularity Handle
                </button>

                <button 
                  className="btn-secondary" 
                  disabled={!cc.canDecrypt} 
                  onClick={() => cc.decryptPopularityHandle()}
                  style={{ width: '100%', marginBottom: '1.5rem' }}
                >
                  {cc.canDecrypt ? "🔓 Decrypt Popularity" : cc.isDecrypting ? "⏳ Decrypting..." : "Nothing to Decrypt"}
                </button>

                <div>
                  <p className="form-label" style={{ marginBottom: '0.75rem' }}>
                    Update Popularity Score
                  </p>
                  <div className="action-buttons">
                    <button 
                      className="btn-success" 
                      disabled={!cc.canRun} 
                      onClick={() => cc.updatePopularity(tokenId, +1)}
                      style={{ flex: '1' }}
                    >
                      👍 +1 Popularity
                    </button>
                    <button 
                      className="btn-secondary" 
                      disabled={!cc.canRun} 
                      onClick={() => cc.updatePopularity(tokenId, -1)}
                      style={{ flex: '1' }}
                    >
                      👎 -1 Popularity
            </button>
          </div>
          </div>
        </div>

              {/* Right Column - Results Display */}
              <div>
                {cc.handle && (
                  <div className="result-card" style={{ marginBottom: '1rem' }}>
                    <p className="form-label">Encrypted Handle</p>
                    <div style={{ 
                      background: 'rgba(102, 126, 234, 0.08)', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      border: '1px solid rgba(102, 126, 234, 0.2)'
                    }}>
                      <p className="code-text" style={{ fontSize: '0.85rem', wordBreak: 'break-all', lineHeight: '1.6' }}>
                        {cc.handle}
                      </p>
                    </div>
                  </div>
                )}

                {cc.clear !== undefined && (
                  <div className="result-card">
                    <p className="form-label" style={{ marginBottom: '1rem' }}>
                      Decrypted Popularity Score
                    </p>
                    <div style={{ 
                      padding: '1.5rem', 
                      background: 'linear-gradient(135deg, #81FBB815 0%, #28C76F15 100%)', 
                      borderRadius: '12px',
                      border: '2px solid #28C76F40',
                      textAlign: 'center'
                    }}>
                      <p style={{ fontSize: '3rem', fontWeight: '800', color: '#28C76F', lineHeight: '1' }}>
                        {String(cc.clear)}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: '#2d3748', marginTop: '0.5rem', fontWeight: '600' }}>
                        Current Score
                      </p>
                    </div>
                  </div>
                )}

                {!cc.handle && !cc.clear && (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center',
                    color: '#718096',
                    background: 'rgba(113, 128, 150, 0.05)',
                    borderRadius: '12px',
                    border: '2px dashed #e0e0e0'
                  }}>
                    <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📊</p>
                    <p style={{ fontSize: '0.95rem', fontWeight: '600' }}>No Data Yet</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Enter a Token ID and refresh to get started
                    </p>
                  </div>
                )}
          </div>
        </div>
      </div>

          {/* Status Message Bar */}
          {cc.message && (
            <div className="status-bar glass-card fade-in">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📝</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: '600', color: '#2d3748', marginBottom: '0.25rem' }}>
                    Status Message
                  </p>
                  <p className="code-text" style={{ fontSize: '0.95rem', wordBreak: 'break-word' }}>
                    {cc.message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


