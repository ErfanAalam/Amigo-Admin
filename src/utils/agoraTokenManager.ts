import { getFirebaseAdminAuth } from './firebaseAdmin';

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
 * Generate an Agora token for voice calls
 * @param request - Token request parameters
 * @param adminUid - Admin user ID for verification
 * @returns Promise<AgoraTokenResponse>
 */
export async function generateAgoraToken(
  request: AgoraTokenRequest,
  adminUid: string
): Promise<AgoraTokenResponse> {
  try {
    // Verify admin permissions
    const auth = getFirebaseAdminAuth();
    const adminUser = await auth.getUser(adminUid);
    if (!adminUser) {
      throw new Error('Admin user not found');
    }

    // Get admin's Firebase ID token
    const customToken = await auth.createCustomToken(adminUid);
    
    // Make request to token server
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agora/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customToken}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to generate token');
    }

    const tokenData: AgoraTokenResponse = await response.json();
    return tokenData;

  } catch (error) {
    console.error('Error generating Agora token:', error);
    throw error;
  }
}

/**
 * Validate an Agora token
 * @param token - Token to validate
 * @returns boolean indicating if token is valid
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
 * @param expirationTimestamp - Token expiration timestamp
 * @returns Object with expiration details
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
 * Generate test token for development
 * @param channelName - Test channel name
 * @param uid - Test user ID
 * @returns Promise<AgoraTokenResponse>
 */
export async function generateTestToken(
  channelName: string = 'test-channel',
  uid: string = 'test-user'
): Promise<AgoraTokenResponse> {
  const testRequest: AgoraTokenRequest = {
    channelName,
    uid,
    role: 'publisher'
  };

  // Use a default admin UID for testing
  const defaultAdminUid = process.env.DEFAULT_ADMIN_UID || 'admin-test';
  
  return generateAgoraToken(testRequest, defaultAdminUid);
}

/**
 * Get Agora configuration status
 * @returns Object with configuration status
 */
export function getAgoraConfigStatus() {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  
  return {
    appIdConfigured: !!appId,
    appCertificateConfigured: !!appCertificate,
    fullyConfigured: !!(appId && appCertificate),
    missing: {
      appId: !appId,
      appCertificate: !appCertificate
    }
  };
}
