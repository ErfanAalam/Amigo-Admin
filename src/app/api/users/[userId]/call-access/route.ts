import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../../utils/firebaseAdmin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    // Await the params for Next.js 15 compatibility
    const { userId } = await params;
    const { callAccess } = await request.json();

    // Validate callAccess
    if (typeof callAccess !== 'boolean') {
      return NextResponse.json({ error: 'Invalid callAccess value specified' }, { status: 400 });
    }

    // Update user call access in Firestore
    const userRef = getFirebaseAdminFirestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await userRef.update({
      callAccess: callAccess,
      updatedAt: new Date(),
      updatedBy: decodedToken.uid
    });

    return NextResponse.json({ 
      success: true, 
      message: `User call access ${callAccess ? 'granted' : 'revoked'}`,
      userId,
      callAccess
    });

  } catch (error) {
    console.error('Error updating user call access:', error);
    return NextResponse.json({ error: 'Failed to update user call access' }, { status: 500 });
  }
}
