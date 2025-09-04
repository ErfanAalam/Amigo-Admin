import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../utils/firebaseAdmin';

// Allowed admin UIDs who can see all inner groups
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

    // Fetch inner groups based on admin permissions
    let querySnapshot;
    
    if (!isMainAdmin) {
      // Regular admins can only see their own inner groups
      
      
      // Get all inner groups first, then filter client-side to avoid index issues
      const allInnerGroupsSnapshot = await getFirebaseAdminFirestore()
        .collection('standaloneInnerGroups')
        .get();
      
      
      
      // Filter client-side
      const filteredDocs = allInnerGroupsSnapshot.docs.filter(doc => {
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
      // Main admins can see all inner groups
      
      querySnapshot = await getFirebaseAdminFirestore()
        .collection('standaloneInnerGroups')
        .orderBy('createdAt', 'desc')
        .get();
    }
    
    const innerGroups = querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || '',
          startTime: data.startTime,
          endTime: data.endTime,
          members: data.members || [],
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          createdBy: data.createdBy || 'unknown',
        };
      });

    
    
    
    

    return NextResponse.json({ 
      success: true, 
      innerGroups: innerGroups
    });

  } catch (error) {
    console.error('Error fetching standalone inner groups:', error);
    return NextResponse.json({ error: 'Failed to fetch standalone inner groups' }, { status: 500 });
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

    // Create standalone inner group in Firestore
    const innerGroupData = {
      name,
      description: description || '',
      startTime,
      endTime,
      members: members || [],
      createdAt: new Date(),
      createdBy: decodedToken.uid,
    };

    const docRef = await getFirebaseAdminFirestore().collection('standaloneInnerGroups').add(innerGroupData);

    return NextResponse.json({ 
      success: true, 
      innerGroupId: docRef.id,
      message: 'Standalone inner group created successfully'
    });

  } catch (error) {
    console.error('Error creating standalone inner group:', error);
    return NextResponse.json({ error: 'Failed to create standalone inner group' }, { status: 500 });
  }
}
