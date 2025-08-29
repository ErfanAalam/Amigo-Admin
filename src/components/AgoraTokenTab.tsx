'use client';

import React, { useState, useEffect } from 'react';
import { Phone, Key, Clock, Copy, Check, AlertTriangle, Settings, RefreshCw } from 'lucide-react';
import { 
  AgoraTokenRequest, 
  AgoraTokenResponse,
  generateAgoraToken,
  validateAgoraToken,
  getTokenExpirationInfo,
  getAgoraConfigStatus
} from '../utils/agoraTokenClient';

interface AgoraTokenTabProps {
  onRefresh?: () => void;
}

const AgoraTokenTab: React.FC<AgoraTokenTabProps> = ({ onRefresh }) => {
  const [tokenRequest, setTokenRequest] = useState<AgoraTokenRequest>({
    channelName: '',
    uid: '',
    role: 'publisher'
  });
  
  const [generatedToken, setGeneratedToken] = useState<AgoraTokenResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [configStatus, setConfigStatus] = useState(getAgoraConfigStatus());
  const [tokenHistory, setTokenHistory] = useState<AgoraTokenResponse[]>([]);

  useEffect(() => {
    // Load configuration status
    setConfigStatus(getAgoraConfigStatus());
  }, []);

  const handleInputChange = (field: keyof AgoraTokenRequest, value: string | number) => {
    setTokenRequest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenerateToken = async () => {
    if (!tokenRequest.channelName || !tokenRequest.uid) {
      setError('Please fill in all required fields');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

         try {
       const token = await generateAgoraToken(tokenRequest);
      setGeneratedToken(token);
      setSuccess('Token generated successfully!');
      
      // Add to history
      setTokenHistory(prev => [token, ...prev.slice(0, 9)]); // Keep last 10 tokens
      
      // Clear form
      setTokenRequest({
        channelName: '',
        uid: '',
        role: 'publisher'
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate token');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const validateToken = (token: string) => {
    return validateAgoraToken(token);
  };

  const getExpirationStatus = (expiration: number) => {
    const info = getTokenExpirationInfo(expiration);
    return info;
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Agora Token Management</h2>
            <p className="text-gray-600 mt-2">Generate and manage tokens for voice calls</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setConfigStatus(getAgoraConfigStatus())}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Configuration Status</h3>
            <Settings className="h-5 w-5 text-gray-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${
              configStatus.appIdConfigured 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  configStatus.appIdConfigured ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`font-medium ${
                  configStatus.appIdConfigured ? 'text-green-800' : 'text-red-800'
                }`}>
                  App ID: {configStatus.appIdConfigured ? 'Configured' : 'Missing'}
                </span>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              configStatus.appCertificateConfigured 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  configStatus.appCertificateConfigured ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`font-medium ${
                  configStatus.appCertificateConfigured ? 'text-green-800' : 'text-red-800'
                }`}>
                  App Certificate: {configStatus.appCertificateConfigured ? 'Configured' : 'Missing'}
                </span>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              configStatus.fullyConfigured 
                ? 'bg-green-50 border-green-200' 
                : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  configStatus.fullyConfigured ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span className={`font-medium ${
                  configStatus.fullyConfigured ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  Status: {configStatus.fullyConfigured ? 'Ready' : 'Incomplete'}
                </span>
              </div>
            </div>
          </div>

          {!configStatus.fullyConfigured && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                <div>
                  <h4 className="font-medium text-yellow-800">Configuration Required</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    Please add AGORA_APP_ID and AGORA_APP_CERTIFICATE to your environment variables.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Token Generation Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Generate New Token</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Channel Name *
            </label>
            <input
              type="text"
              value={tokenRequest.channelName}
              onChange={(e) => handleInputChange('channelName', e.target.value)}
              placeholder="e.g., chat-room-123"
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID *
            </label>
            <input
              type="text"
              value={tokenRequest.uid}
              onChange={(e) => handleInputChange('uid', e.target.value)}
              placeholder="e.g., user123 or 123"
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              value={tokenRequest.role}
              onChange={(e) => handleInputChange('role', e.target.value as 'publisher' | 'subscriber')}
              className="w-full px-4 py-3 text-black border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="publisher">Publisher</option>
              <option value="subscriber">Subscriber</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateToken}
          disabled={isGenerating || !configStatus.fullyConfigured}
          className={`w-full md:w-auto px-8 py-3 rounded-lg font-medium transition-colors ${
            isGenerating || !configStatus.fullyConfigured
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin inline" />
              Generating...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Generate Token
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="mb-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={clearMessages}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <Check className="h-5 w-5 text-green-600" />
                <p className="text-green-800 font-medium">{success}</p>
                <button
                  onClick={clearMessages}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generated Token Display */}
      {generatedToken && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Generated Token</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Token</label>
                <div className="relative">
                  <input
                    type="text"
                    value={generatedToken.token}
                    readOnly
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(generatedToken.token)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Expiration</label>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-900">
                    {getExpirationStatus(generatedToken.expiration).humanReadable}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getExpirationStatus(generatedToken.expiration).status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : getExpirationStatus(generatedToken.expiration).status === 'expiring-soon'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {getExpirationStatus(generatedToken.expiration).status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                <input
                  type="text"
                  value={generatedToken.channelName}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                <input
                  type="text"
                  value={generatedToken.uid}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={generatedToken.role}
                  readOnly
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Token History */}
      {tokenHistory.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Tokens</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Generated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tokenHistory.map((token, index) => {
                  const expirationInfo = getExpirationStatus(token.expiration);
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {token.channelName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {token.uid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          token.role === 'publisher'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {token.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          expirationInfo.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : expirationInfo.status === 'expiring-soon'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {expirationInfo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(token.generatedAt * 1000).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgoraTokenTab;
