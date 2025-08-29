import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../utils/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken);
    
    // Check if user is an admin
    const adminDoc = await getFirebaseAdminFirestore().collection('admins').doc(decodedToken.uid).get();
    
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'User is not an admin' }, { status: 403 });
    }

    // Get search query parameter
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search') || '';

    // Fetch users from Firestore
    const usersRef = getFirebaseAdminFirestore().collection('users');
    let query = usersRef.orderBy('createdAt', 'desc');

    // Apply search filter if provided
    if (searchTerm) {
      // Note: Firestore doesn't support full-text search, so we'll filter client-side for now
      // In production, consider using Algolia or similar for better search
    }

    const querySnapshot = await query.get();
    
    const users = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || 'N/A',
        displayName: data.displayName || 'Anonymous',
        phoneNumber: data.phoneNumber || 'N/A',
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        lastSeen: data.lastSeen?.toDate?.() || data.lastSeen,
        isOnline: data.isOnline || false,
        profileImageUrl: data.profileImageUrl || null,
        currentLocation: data.currentLocation || null,
        lastLocationUpdate: data.lastLocationUpdate?.toDate?.() || data.lastLocationUpdate,
        role: data.role || 'user',
        callAccess: data.callAccess || false,
      };
    });

    // Apply search filter client-side if needed
    const filteredUsers = searchTerm 
      ? users.filter(user => 
          user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : users;

    return NextResponse.json({ 
      success: true, 
      users: filteredUsers,
      total: filteredUsers.length
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
