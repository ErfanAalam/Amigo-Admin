import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const sentBy = searchParams.get('sentBy');

    // Build query
    let query = getFirebaseAdminFirestore().collection('notificationLogs').orderBy('timestamp', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (sentBy) {
      query = query.where('sentBy', '==', sentBy);
    }

    // Execute query with limit
    const snapshot = await query.limit(limit).get();

    // Format the logs
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp,
    }));

    return NextResponse.json(logs);

  } catch (error) {
    console.error('Error fetching notification logs:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch notification logs',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
