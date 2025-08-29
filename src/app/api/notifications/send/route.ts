import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

export async function POST(request: NextRequest) {
  // Initialize Firebase Admin services
  const adminAuth = getFirebaseAdminAuth();
  const adminFirestore = getFirebaseAdminFirestore();
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Check if user is admin
    const userDoc = await adminFirestore.collection('admins').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

        const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
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
    let targetUserId = to;
    
    // If 'to' is a user ID (not an FCM token), look up the FCM token
    if (to.length < 100) { // FCM tokens are typically longer than user IDs
      try {
        const userDoc = await adminFirestore.collection('users').doc(to).get();
        if (!userDoc.exists) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        
        const userData = userDoc.data();
        if (!userData?.fcmToken) {
          return NextResponse.json({ error: 'User has no FCM token' }, { status: 400 });
        }
        
        fcmToken = userData.fcmToken;
        targetUserId = to;
      } catch (error) {
        console.error('Error looking up user FCM token:', error);
        return NextResponse.json({ error: 'Failed to look up user FCM token' }, { status: 500 });
      }
    } else {
      // 'to' is already an FCM token, try to find the user ID
      try {
        const usersSnapshot = await adminFirestore
          .collection('users')
          .where('fcmToken', '==', to)
          .limit(1)
          .get();
        
        if (!usersSnapshot.empty) {
          targetUserId = usersSnapshot.docs[0].id;
        }
      } catch (error) {
        console.error('Error looking up user ID from FCM token:', error);
        // Continue with notification sending even if we can't find the user ID
      }
    }

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
    
    // Log the notification for admin tracking
    await adminFirestore.collection('notificationLogs').add({
      sentBy: decodedToken.uid,
      sentTo: targetUserId,
      notification: notification,
      data: data,
      messageId: response,
      timestamp: new Date(),
      status: 'success',
    });

    return NextResponse.json({ 
      success: true, 
      messageId: response,
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    
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
    } catch (logError) {
      console.error('Error logging notification error:', logError);
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
