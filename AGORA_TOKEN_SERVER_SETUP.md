# Agora Token Server Setup Guide

This guide will help you set up the Agora token server in your Next.js admin panel for secure voice calling.

## Prerequisites

- Next.js admin panel running
- Agora.io account and project
- Firebase Admin SDK configured
- Node.js environment

## Step 1: Install Dependencies

The required packages have already been installed:

```bash
npm install agora-token
```

## Step 2: Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Agora Configuration
AGORA_APP_ID=your-actual-agora-app-id-here
AGORA_APP_CERTIFICATE=your-actual-agora-app-certificate-here
```

### How to Get Agora Credentials:

1. Go to [Agora Console](https://console.agora.io/)
2. Create a new project or select existing one
3. Go to **Project Management** > **Your Project**
4. Copy the **App ID**
5. Go to **Security** > **App Certificate**
6. Copy the **App Certificate**

## Step 3: API Endpoint

The token server API endpoint is already created at:
```
/api/agora/token
```

This endpoint:
- ✅ Verifies Firebase authentication
- ✅ Validates user permissions
- ✅ Generates secure Agora tokens
- ✅ Handles both string and numeric UIDs
- ✅ Supports publisher/subscriber roles
- ✅ Includes token expiration (1 hour default)

## Step 4: Admin Panel Integration

The Agora Token Management tab has been added to your admin dashboard with:

- 🔧 Configuration status monitoring
- 🎯 Token generation form
- 📋 Token history tracking
- ⏰ Expiration status display
- 📋 Copy-to-clipboard functionality

## Step 5: Mobile App Integration

Update your mobile app's `agoraConfig.ts`:

```typescript
export const AGORA_CONFIG = {
  appId: 'YOUR_AGORA_APP_ID',
  tokenServerUrl: 'https://your-admin-panel.com/api/agora/token',
  // ... other config
};
```

Update your mobile app's `AgoraCallService.ts` to use the token server:

```typescript
private async generateToken(channelName: string): Promise<string> {
  try {
    const currentUser = firebaseAuth.currentUser;
    if (!currentUser) return '';

    const idToken = await currentUser.getIdToken();
    
    const response = await fetch('YOUR_ADMIN_PANEL_URL/api/agora/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        channelName,
        uid: currentUser.uid,
        role: 'publisher',
      }),
    });

    if (!response.ok) return '';
    
    const tokenData = await response.json();
    return tokenData.token;

  } catch (error) {
    console.error('Error generating token:', error);
    return '';
  }
}
```

## Step 6: Testing the Token Server

### Test the API Endpoint:

```bash
# Test GET endpoint
curl https://your-admin-panel.com/api/agora/token

# Test POST endpoint (requires Firebase token)
curl -X POST https://your-admin-panel.com/api/agora/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "channelName": "test-channel",
    "uid": "test-user",
    "role": "publisher"
  }'
```

### Test from Admin Panel:

1. Navigate to **Agora Tokens** tab
2. Check configuration status
3. Generate a test token
4. Verify token format and expiration

## Step 7: Security Features

The token server includes several security measures:

- 🔐 **Firebase Authentication**: All requests must include valid Firebase ID tokens
- 🛡️ **User Verification**: Verifies user exists in Firebase
- ⏰ **Token Expiration**: Tokens expire after 1 hour
- 🔒 **Role-based Access**: Supports publisher/subscriber roles
- 📝 **Audit Logging**: Logs all token generation attempts

## Step 8: Production Deployment

### Environment Variables:

Ensure these are set in your production environment:
```bash
AGORA_APP_ID=your-production-app-id
AGORA_APP_CERTIFICATE=your-production-app-certificate
NEXTAUTH_URL=https://your-production-domain.com
```

### HTTPS Required:

The token server must run over HTTPS in production for security.

### Rate Limiting:

Consider implementing rate limiting for the token endpoint:
```typescript
// Example with express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/agora/token', limiter);
```

## Step 9: Monitoring and Analytics

### Token Generation Metrics:

Track token generation patterns:
- Total tokens generated
- Failed generation attempts
- User activity patterns
- Channel usage statistics

### Error Monitoring:

Monitor for:
- Authentication failures
- Invalid requests
- Server errors
- Rate limit violations

## Step 10: Troubleshooting

### Common Issues:

1. **"Configuration Required" Error**
   - Check environment variables
   - Verify Agora credentials

2. **"Unauthorized" Error**
   - Verify Firebase token
   - Check user authentication

3. **"Server Configuration Error"**
   - Verify Agora App ID and Certificate
   - Check environment variables

4. **Token Generation Fails**
   - Check network connectivity
   - Verify Agora project status
   - Check Firebase Admin SDK

### Debug Mode:

Enable debug logging in your environment:
```bash
DEBUG=agora:*
NODE_ENV=development
```

## Step 11: Advanced Configuration

### Custom Token Expiration:

Modify the token expiration time in `route.ts`:
```typescript
const TOKEN_EXPIRATION = 7200; // 2 hours instead of 1
```

### Custom Roles:

Add additional role validation:
```typescript
// Add custom role validation
if (role === 'admin' && !isAdminUser(decodedToken.uid)) {
  return NextResponse.json(
    { error: 'Insufficient permissions for admin role' },
    { status: 403 }
  );
}
```

### Channel Name Validation:

Customize channel name validation:
```typescript
// Custom channel name validation
const channelNameRegex = /^[a-zA-Z0-9_-]{3,64}$/;
if (!channelNameRegex.test(channelName)) {
  return NextResponse.json(
    { error: 'Invalid channel name format' },
    { status: 400 }
  );
}
```

## Support and Resources

- [Agora Documentation](https://docs.agora.io/)
- [Agora Token Builder](https://webdemo.agora.io/agora-web-token-builder/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

## Next Steps

After setting up the token server:

1. **Test voice calls** between mobile app users
2. **Monitor token generation** in admin panel
3. **Implement call analytics** and reporting
4. **Add video calling support** (future enhancement)
5. **Implement call recording** (if needed)

---

**Note**: This token server provides secure, authenticated access to Agora's voice calling services. Always keep your Agora App Certificate secure and never expose it in client-side code.


