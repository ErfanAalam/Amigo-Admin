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

    const { name, startTime, endTime, members } = await request.json();
    const { groupId } = await params;

    if (!name || !startTime || !endTime) {
      return NextResponse.json({ error: 'Name, start time, and end time are required' }, { status: 400 });
    }

    // Validate time format
    const startTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const endTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!startTimeRegex.test(startTime) || !endTimeRegex.test(endTime)) {
      return NextResponse.json({ error: 'Invalid time format. Use HH:MM format' }, { status: 400 });
    }

    // Check if start time is before end time
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Start time must be before end time' }, { status: 400 });
    }

    // Get the group to add inner group to
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

    // Create inner group data
    const innerGroupData = {
      id: `${groupId}_${Date.now()}`, // Generate unique ID
      name,
      startTime,
      endTime,
      members: members || [],
      createdAt: new Date(),
      isActive: true,
      createdBy: decodedToken.uid,
    };

    // Add inner group to the group's innerGroups array
    await groupRef.update({
      innerGroups: FieldValue.arrayUnion(innerGroupData)
    });

    return NextResponse.json({ 
      success: true, 
      innerGroupId: innerGroupData.id,
      message: 'Inner group created successfully'
    });

  } catch (error) {
    console.error('Error creating inner group:', error);
    return NextResponse.json({ error: 'Failed to create inner group' }, { status: 500 });
  }
}

export async function PUT(
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

    const { innerGroups } = await request.json();
    const { groupId } = await params;

    if (!innerGroups || !Array.isArray(innerGroups)) {
      return NextResponse.json({ error: 'Inner groups array is required' }, { status: 400 });
    }

    // Get the group to update
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

    // Update the group's innerGroups array
    await groupRef.update({
      innerGroups: innerGroups
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Inner groups updated successfully'
    });

  } catch (error) {
    console.error('Error updating inner groups:', error);
    return NextResponse.json({ error: 'Failed to update inner groups' }, { status: 500 });
  }
}
