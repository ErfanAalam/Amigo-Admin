import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, FieldValue } from '../../../../../utils/firebaseAdmin';

// Allowed admin UIDs who can manage all groups
const ALLOWED_ADMIN_UIDS = [
  'yBVwfrDoLwOMiEMEIn450Gtqjw43',
  'Mh4uGEIj44QTUBcT08l2Fuid9h52'
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
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

    const adminData = adminDoc.data();
    const isMainAdmin = ALLOWED_ADMIN_UIDS.includes(decodedToken.uid) || adminData?.role === 'admin';

    const { userId } = await request.json();
    const { groupId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the group
    const groupRef = getFirebaseAdminFirestore().collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user can manage this group
    const groupData = groupDoc.data();
    if (!isMainAdmin && groupData?.createdBy !== decodedToken.uid) {
      return NextResponse.json({ error: 'You can only manage your own groups' }, { status: 403 });
    }

    // Check if user exists
    const userDoc = await getFirebaseAdminFirestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add user to group members
    await groupRef.update({
      members: FieldValue.arrayUnion(userId)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Member added to group successfully'
    });

  } catch (error) {
    console.error('Error adding member to group:', error);
    return NextResponse.json({ error: 'Failed to add member to group' }, { status: 500 });
  }
}
