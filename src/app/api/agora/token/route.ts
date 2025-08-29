import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

// Agora configuration
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

// Token expiration time (1 hour)
const TOKEN_EXPIRATION = 3600;

export async function POST(request: NextRequest) {
  try {
    console.log('POST request received to /api/agora/token');
    console.log('Environment variables:', {
      AGORA_APP_ID: AGORA_APP_ID ? 'Set' : 'Missing',
      AGORA_APP_CERTIFICATE: AGORA_APP_CERTIFICATE ? 'Set' : 'Missing'
    });

    // For admin panel usage, we'll skip authentication for now
    // In production, you should implement proper admin authentication
    
    // Check if Agora configuration is available
    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      console.error('Agora configuration missing');
      return NextResponse.json(
        { error: 'Server configuration error - Agora credentials not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    console.log('Request body:', body);
    
    const { channelName, uid, role = 'publisher' } = body;

    // Validate required fields
    if (!channelName || !uid) {
      return NextResponse.json(
        { error: 'Missing required fields: channelName and uid are required' },
        { status: 400 }
      );
    }

    // Validate channel name format
    if (typeof channelName !== 'string' || channelName.length < 3) {
      return NextResponse.json(
        { error: 'Invalid channel name format' },
        { status: 400 }
      );
    }

    // Validate UID
    if (typeof uid !== 'string' && typeof uid !== 'number') {
      return NextResponse.json(
        { error: 'Invalid UID format' },
        { status: 400 }
      );
    }

    // Calculate expiration timestamp
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expirationTimestamp = currentTimestamp + TOKEN_EXPIRATION;

    // Determine role
    let rtcRole: number;
    switch (role) {
      case 'publisher':
        rtcRole = 1; // PUBLISHER
        break;
      case 'subscriber':
        rtcRole = 2; // SUBSCRIBER
        break;
      default:
        rtcRole = 1; // PUBLISHER
    }

    console.log('Generating token with:', {
      channelName,
      uid,
      role: rtcRole,
      expirationTimestamp
    });

    // Generate token
    let rtcToken: string;
    
    if (typeof uid === 'string') {
      rtcToken = RtcTokenBuilder.buildTokenWithUserAccount(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        rtcRole,
        expirationTimestamp,
        0 // privilegeExpiredTs
      );
    } else {
      rtcToken = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channelName,
        uid,
        rtcRole,
        expirationTimestamp,
        0 // privilegeExpiredTs
      );
    }

    // Log token generation for monitoring
    console.log(`Token generated successfully for channel ${channelName}`);

    // Return token with metadata
    return NextResponse.json({
      token: rtcToken,
      appId: AGORA_APP_ID,
      channelName,
      uid,
      role,
      expiration: expirationTimestamp,
      expiresIn: TOKEN_EXPIRATION,
      generatedAt: currentTimestamp
    });

  } catch (error) {
    console.error('Error generating Agora token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET method for testing (optional - can be removed in production)
export async function GET(request: NextRequest) {
  console.log('GET request received to /api/agora/token');
  return NextResponse.json({
    message: 'Agora Token Server is running',
    status: 'active',
    timestamp: new Date().toISOString(),
    config: {
      appIdConfigured: !!AGORA_APP_ID,
      appCertificateConfigured: !!AGORA_APP_CERTIFICATE
    }
  });
}
