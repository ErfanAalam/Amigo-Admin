import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, FieldValue } from '../../../../../../utils/firebaseAdmin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; userId: string }> }
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

    const { groupId, userId } = await params;

    // Get the group
    const groupRef = getFirebaseAdminFirestore().collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();

    if (!groupDoc.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Remove user from group members
    await groupRef.update({
      members: FieldValue.arrayRemove(userId)
    });

    // Also remove user from all inner groups
    const groupData = groupDoc.data();
    if (groupData?.innerGroups) {
      const updatedInnerGroups = groupData.innerGroups.map((innerGroup: any) => ({
        ...innerGroup,
        members: innerGroup.members.filter((memberId: string) => memberId !== userId)
      }));

      await groupRef.update({
        innerGroups: updatedInnerGroups
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Member removed from group successfully'
    });

  } catch (error) {
    console.error('Error removing member from group:', error);
    return NextResponse.json({ error: 'Failed to remove member from group' }, { status: 500 });
  }
}
