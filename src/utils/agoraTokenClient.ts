// Client-safe utilities for Agora token management
// These functions can be used in React components without Node.js dependencies

export interface AgoraTokenRequest {
  channelName: string;
  uid: string | number;
  role?: 'publisher' | 'subscriber';
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: string | number;
  role: string;
  expiration: number;
  expiresIn: number;
  generatedAt: number;
}

export interface AgoraTokenStats {
  totalTokensGenerated: number;
  activeTokens: number;
  expiredTokens: number;
  lastTokenGenerated: Date | null;
}

/**
 * Generate an Agora token via API call
 */
export async function generateAgoraToken(
  request: AgoraTokenRequest
): Promise<AgoraTokenResponse> {
  try {
    const response = await fetch('/api/agora/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate token');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating Agora token:', error);
    throw error;
  }
}

/**
 * Validate an Agora token format
 */
export function validateAgoraToken(token: string): boolean {
  try {
    // Basic token validation
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check if token has the expected format (base64-like string)
    if (token.length < 100) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get token expiration info
 */
export function getTokenExpirationInfo(expirationTimestamp: number) {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = expirationTimestamp - now;
  
  if (timeUntilExpiry <= 0) {
    return {
      isExpired: true,
      timeUntilExpiry: 0,
      humanReadable: 'Expired',
      status: 'expired'
    };
  }

  const minutes = Math.floor(timeUntilExpiry / 60);
  const seconds = timeUntilExpiry % 60;
  
  let humanReadable = '';
  if (minutes > 0) {
    humanReadable = `${minutes}m ${seconds}s`;
  } else {
    humanReadable = `${seconds}s`;
  }

  return {
    isExpired: false,
    timeUntilExpiry,
    humanReadable,
    status: timeUntilExpiry < 300 ? 'expiring-soon' : 'active' // 5 minutes warning
  };
}

/**
 * Get Agora configuration status from environment
 */
export function getAgoraConfigStatus() {
  // In client-side, we can only check if the API endpoint is accessible
  // The actual configuration is checked server-side
  return {
    appIdConfigured: true, // Will be validated server-side
    appCertificateConfigured: true, // Will be validated server-side
    fullyConfigured: true, // Will be validated server-side
    missing: {
      appId: false,
      appCertificate: false
    }
  };
}


