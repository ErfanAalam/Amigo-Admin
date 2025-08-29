import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

export async function POST(request: NextRequest) {
  // Initialize Firebase Admin services
  const adminAuth = getFirebaseAdminAuth();
  const adminFirestore = getFirebaseAdminFirestore();
  try {
    console.log('🔔 Notification API called');
    
    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log('🔐 User authenticated:', decodedToken.uid);
    
    // Check if user exists and get their role
    let userRole = 'user';
    let isAdmin = false;
    
    try {
      // First check if user is an admin
      const adminDoc = await adminFirestore.collection('admins').doc(decodedToken.uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        if (adminData?.role === 'admin') {
          userRole = 'admin';
          isAdmin = true;
        }
      }
      
      // If not admin, check if user exists in users collection
      if (!isAdmin) {
        try {
          const userDoc = await adminFirestore.collection('users').doc(decodedToken.uid).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userRole = userData?.role || 'user';
          } else {
            // User doesn't exist in backend Firestore, but that's okay
            // They might be a mobile app user who only exists in the mobile app's Firestore
            console.log('User not found in backend Firestore, but allowing notification send:', decodedToken.uid);
            userRole = 'user';
          }
        } catch (error) {
          console.error('Error checking user in backend Firestore:', error);
          // Continue anyway, user might exist in mobile app's Firestore
          userRole = 'user';
        }
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      return NextResponse.json({ error: 'Failed to verify user role' }, { status: 500 });
    }

    // Parse request body
    const body = await request.json();
    const { to, notification, data } = body;
    if (!to || !notification || !data) {
      return NextResponse.json({ 
        error: 'Missing required fields: to, notification, data' 
      }, { status: 400 });
    }

    // Get the user's FCM token from Firestore
    let fcmToken = to;
    let targetUserId = 'unknown'; // We'll try to find this but it's not required
    
    console.log('📱 Processing notification request');
    console.log('📱 Input length:', to.length, 'Is FCM token:', to.length >= 100);
    
    // If 'to' is a user ID (not an FCM token), look up the FCM token
    if (to.length < 100) { // FCM tokens are typically longer than user IDs
      try {
        console.log('🔍 Looking up user by ID:', to);
        const userDoc = await adminFirestore.collection('users').doc(to).get();
        if (!userDoc.exists) {
          console.log('❌ User not found in backend Firestore:', to);
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const userData = userDoc.data();
        if (!userData?.fcmToken) {
          console.log('❌ User has no FCM token:', to);
          return NextResponse.json({ error: 'User has no FCM token' }, { status: 400 });
        }
        
        fcmToken = userData.fcmToken;
        targetUserId = to;
        console.log('✅ FCM token found for user:', to);
      } catch (error) {
        console.error('❌ Error looking up user FCM token:', error);
        return NextResponse.json({ error: 'Failed to look up user FCM token' }, { status: 500 });
      }
    } else {
      // 'to' is already an FCM token, this is the preferred case for mobile apps
      console.log('✅ FCM token provided directly, length:', to.length);
      fcmToken = to;
      
      // Try to find the user ID from the FCM token (optional)
      try {
        console.log('🔍 Looking up user by FCM token (optional)');
        const usersSnapshot = await adminFirestore
          .collection('users')
          .where('fcmToken', '==', to)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          targetUserId = usersSnapshot.docs[0].id;
          console.log('✅ User ID found for FCM token:', targetUserId);
        } else {
          console.log('⚠️ No user ID found for FCM token, but continuing');
        }
      } catch (error) {
        console.error('❌ Error looking up user ID from FCM token:', error);
        // Continue with notification sending even if we can't find the user ID
      }
    }

    // Security check: Regular users can only send notifications to other users (not to themselves for spam prevention)
    if (!isAdmin && targetUserId !== 'unknown' && targetUserId === decodedToken.uid) {
      console.log('❌ User trying to send notification to themselves:', decodedToken.uid);
      return NextResponse.json({ error: 'Users cannot send notifications to themselves' }, { status: 403 });
    }

    console.log('🚀 Preparing to send FCM notification');
    console.log('📱 Target FCM Token length:', fcmToken.length);
    console.log('👤 Target User ID:', targetUserId);
    console.log('👤 Sender User ID:', decodedToken.uid);

    // Import Firebase Admin messaging dynamically
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging();

    // Prepare the message
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'chat-messages',
          priority: 'high' as const,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
          },
        },
        headers: {
          'apns-priority': '10',
        },
      },
    };

    // Send the message
    const response = await messaging.send(message);
    console.log('✅ FCM message sent successfully, message ID:', response);
    
    // Log the notification for admin tracking
    await adminFirestore.collection('notificationLogs').add({
      sentBy: decodedToken.uid,
      sentTo: targetUserId !== 'unknown' ? targetUserId : 'unknown',
      notification: notification,
      data: data,
      messageId: response,
      timestamp: new Date(),
      status: 'success',
      userRole: userRole, // Log the role of the sender
      fcmTokenLength: fcmToken.length, // Log FCM token length for debugging
    });
    console.log('📝 Notification logged to database');

    return NextResponse.json({ 
      success: true, 
      messageId: response,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('❌ Error sending notification:', error);
    
    // Log the error
    try {
      await adminFirestore.collection('notificationLogs').add({
        sentBy: 'unknown',
        sentTo: 'unknown',
        notification: {},
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        status: 'error',
      });
      console.log('📝 Error logged to database');
    } catch (logError) {
      console.error('❌ Error logging notification error:', logError);
    }

    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
