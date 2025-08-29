import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(token);
    
    // Check if user is admin
    const userDoc = await getFirebaseAdminFirestore().collection('admins').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { userIds, notification, data, excludeUserId } = body;

    if (!userIds || !Array.isArray(userIds) || !notification || !data) {
      return NextResponse.json({ 
        error: 'Missing required fields: userIds (array), notification, data' 
      }, { status: 400 });
    }

    // Filter out excluded user if provided
    const targetUserIds = excludeUserId 
      ? userIds.filter(id => id !== excludeUserId)
      : userIds;

    if (targetUserIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users to notify',
        sentCount: 0
      });
    }

    // Get FCM tokens for all target users
    const usersSnapshot = await getFirebaseAdminFirestore()
      .collection('users')
      .where('uid', 'in', targetUserIds)
      .get();

    const tokens: string[] = [];
    const validUserIds: string[] = [];

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      if (userData?.fcmToken) {
        tokens.push(userData.fcmToken);
        validUserIds.push(doc.id);
      }
    });

    if (tokens.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users have FCM tokens',
        sentCount: 0
      });
    }

    // Import Firebase Admin messaging dynamically
    const { getMessaging } = await import('firebase-admin/messaging');
    const messaging = getMessaging();

    // Send notifications to all valid users
    const sendPromises = tokens.map(async (token, index) => {
      try {
        const message = {
          token: token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: {
            ...data,
            userId: validUserIds[index],
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

        const response = await messaging.send(message);
        return { success: true, messageId: response, userId: validUserIds[index] };
      } catch (error) {
        console.error(`Error sending notification to user ${validUserIds[index]}:`, error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: validUserIds[index]
        };
      }
    });

    const results = await Promise.all(sendPromises);
    const successfulSends = results.filter(r => r.success);
    const failedSends = results.filter(r => !r.success);

    // Log the bulk notification
    await getFirebaseAdminFirestore().collection('notificationLogs').add({
      sentBy: decodedToken.uid,
      sentTo: validUserIds,
      notification: notification,
      data: data,
      totalUsers: targetUserIds.length,
      successfulSends: successfulSends.length,
      failedSends: failedSends.length,
      results: results,
      timestamp: new Date(),
      status: 'bulk_success',
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Bulk notifications sent',
      totalUsers: validUserIds.length,
      successfulSends: successfulSends.length,
      failedSends: failedSends.length,
      results: results
    });

  } catch (error) {
    console.error('Error sending bulk notifications:', error);
    
    // Log the error
    try {
      await getFirebaseAdminFirestore().collection('notificationLogs').add({
        sentBy: 'unknown',
        sentTo: [],
        notification: {},
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        status: 'bulk_error',
      });
    } catch (logError) {
      console.error('Error logging bulk notification error:', logError);
    }

    return NextResponse.json({ 
      error: 'Failed to send bulk notifications',
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
