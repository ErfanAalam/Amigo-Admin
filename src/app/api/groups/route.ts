import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../utils/firebaseAdmin';

// Allowed admin UIDs who can see all groups
const ALLOWED_ADMIN_UIDS = [
  'yBVwfrDoLwOMiEMEIn450Gtqjw43',
  'Mh4uGEIj44QTUBcT08l2Fuid9h52'
];

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

    const adminData = adminDoc.data();
    const isInAllowedList = ALLOWED_ADMIN_UIDS.includes(decodedToken.uid);
    const hasAdminRole = adminData?.role === 'admin';
    
    // TEMPORARY: Only use hardcoded UIDs for main admin status
    // Remove the role check to test if that's the issue
    const isMainAdmin = isInAllowedList; // Temporarily removed: || hasAdminRole;

    // Fetch groups based on admin permissions
    let querySnapshot;
    
    if (!isMainAdmin) {
      // Regular admins can only see their own groups
      
      // Get all groups first, then filter client-side to avoid index issues
      const allGroupsSnapshot = await getFirebaseAdminFirestore()
        .collection('groups')
        .get();
      
      
      // Filter client-side
      const filteredDocs = allGroupsSnapshot.docs.filter(doc => {
        const data = doc.data();
        const matches = data.createdBy === decodedToken.uid;
        return matches;
      });
      
      
      // Sort by createdAt descending
      filteredDocs.sort((a, b) => {
        const aTime = a.data().createdAt?.toDate?.() || a.data().createdAt || new Date(0);
        const bTime = b.data().createdAt?.toDate?.() || b.data().createdAt || new Date(0);
        return bTime - aTime;
      });
      
      // Create a mock query snapshot
      querySnapshot = {
        docs: filteredDocs
      };
    } else {
      // Main admins can see all groups
      querySnapshot = await getFirebaseAdminFirestore()
        .collection('groups')
        .orderBy('createdAt', 'desc')
        .get();
    }
    
    const groups = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          innerGroups: data.innerGroups || [],
          members: data.members || [],
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          isActive: data.isActive !== false,
          createdBy: data.createdBy || 'unknown',
        };
      });
    return NextResponse.json({ 
      success: true, 
      groups: groups
    });

  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const { name, description, members } = await request.json();

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    // Create group in Firestore
    const groupData = {
      name,
      description,
      members: members || [],
      innerGroups: [],
      createdAt: new Date(),
      isActive: true,
      createdBy: decodedToken.uid,
    };

    const docRef = await getFirebaseAdminFirestore().collection('groups').add(groupData);

    return NextResponse.json({ 
      success: true, 
      groupId: docRef.id,
      message: 'Group created successfully'
    });

  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    // Check if the group exists and user can delete it
    const groupRef = getFirebaseAdminFirestore().collection('groups').doc(groupId);
    const groupDoc = await groupRef.get();
    
    if (!groupDoc.exists) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if user can delete this group
    const groupData = groupDoc.data();
    if (!isMainAdmin && groupData?.createdBy !== decodedToken.uid) {
      return NextResponse.json({ error: 'You can only delete your own groups' }, { status: 403 });
    }

    // Delete the group from Firestore
    await groupRef.delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Group deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
