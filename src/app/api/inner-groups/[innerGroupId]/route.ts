import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ innerGroupId: string }> }
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

    const { innerGroupId } = await params;
    const { name, description, startTime, endTime, members } = await request.json();

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

    // Update the standalone inner group in Firestore
    const innerGroupRef = getFirebaseAdminFirestore().collection('standaloneInnerGroups').doc(innerGroupId);
    
    // Check if the inner group exists
    const innerGroupDoc = await innerGroupRef.get();
    if (!innerGroupDoc.exists) {
      return NextResponse.json({ error: 'Inner group not found' }, { status: 404 });
    }

    const updateData = {
      name,
      description: description || '',
      startTime,
      endTime,
      members: members || [],
      updatedAt: new Date(),
      updatedBy: decodedToken.uid,
    };

    await innerGroupRef.update(updateData);

    return NextResponse.json({ 
      success: true, 
      message: 'Standalone inner group updated successfully'
    });

  } catch (error) {
    console.error('Error updating standalone inner group:', error);
    return NextResponse.json({ error: 'Failed to update standalone inner group' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ innerGroupId: string }> }
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

    const { innerGroupId } = await params;

    // Check if the inner group exists
    const innerGroupRef = getFirebaseAdminFirestore().collection('standaloneInnerGroups').doc(innerGroupId);
    const innerGroupDoc = await innerGroupRef.get();
    
    if (!innerGroupDoc.exists) {
      return NextResponse.json({ error: 'Inner group not found' }, { status: 404 });
    }

    // Delete the standalone inner group from Firestore
    await innerGroupRef.delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Standalone inner group deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting standalone inner group:', error);
    return NextResponse.json({ error: 'Failed to delete standalone inner group' }, { status: 500 });
  }
}
