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

    const db = getFirebaseAdminFirestore();
    const chats: any[] = [];

    try {
      // Fetch direct chats from 'chats' collection
      const directChatsSnapshot = await db.collection('chats').get();
      directChatsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only include direct chats (those without groupId and innerGroupId)
        // Also ensure it has participants (user-to-user conversations)
        if (!data.groupId && !data.innerGroupId && data.participants && data.participants.length >= 2) {
          chats.push({
            id: doc.id,
            participants: data.participants || [],
            participantNames: data.participantNames || [],
            lastMessage: data.lastMessage || '',
            lastMessageType: data.lastMessageType || 'text',
            lastMessageTime: data.lastMessageTime?.toDate?.() || data.lastMessageTime,
            lastUpdated: data.lastActivity?.toDate?.() || data.lastActivity,
            chatType: 'direct'
          });
        }
      });
    } catch (error) {
      console.log('Direct chats collection not found or empty');
    }

    try {
      // Fetch admin-created inner group chats from 'chats' collection
      const innerGroupChatsSnapshot = await db.collection('chats').get();
      innerGroupChatsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        // Only include inner group chats (those with both groupId and innerGroupId)
        if (data.groupId && data.innerGroupId) {
          chats.push({
            id: doc.id,
            participants: data.participants || [],
            participantNames: data.participantNames || [],
            lastMessage: data.lastMessage || '',
            lastMessageType: data.lastMessageType || 'text',
            lastMessageTime: data.lastMessageTime?.toDate?.() || data.lastMessageTime,
            lastUpdated: data.lastActivity?.toDate?.() || data.lastActivity,
            groupId: data.groupId,
            innerGroupId: data.innerGroupId,
            groupName: data.groupName,
            innerGroupName: data.innerGroupName,
            chatType: 'innerGroup'
          });
        }
      });
    } catch (error) {
      console.log('Inner group chats collection not found or empty');
    }

    // Note: User-created group chats are not stored in a separate collection
    // They are accessed directly from groups/{groupId}/messages
    // So we don't need to fetch them here

    // Sort all chats by last activity
    chats.sort((a, b) => {
      const dateA = a.lastUpdated instanceof Date ? a.lastUpdated : new Date(a.lastUpdated);
      const dateB = b.lastUpdated instanceof Date ? b.lastUpdated : new Date(b.lastUpdated);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({ 
      success: true, 
      chats: chats
    });

  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
