import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
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

    const { chatId } = await params;

    // Delete the chat
    await getFirebaseAdminFirestore().collection('chats').doc(chatId).delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
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
    const { chatId } = await params;
    const db = getFirebaseAdminFirestore();
    let messages: any[] = [];
    let chatType = 'unknown';

    

    // Try to find messages in different collections based on chat type
    try {
      // Check direct chats first - messages are in subcollection
      const directChatDoc = await db.collection('chats').doc(chatId).get();
      if (directChatDoc.exists) {
        
        const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
        if (!messagesSnapshot.empty) {
          messagesSnapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
          });
          chatType = 'direct';
          
        }
      }
    } catch (error) {
      
    }

    // If no messages found in direct chats, check group chats
    if (messages.length === 0) {
      try {
        // Check if this is a group chat - messages are in subcollection
        const groupDoc = await db.collection('groups').doc(chatId).get();
        if (groupDoc.exists) {
          
          const messagesSnapshot = await db.collection('groups').doc(chatId).collection('messages').get();
          if (!messagesSnapshot.empty) {
            messagesSnapshot.forEach(doc => {
              messages.push({ id: doc.id, ...doc.data() });
            });
            chatType = 'group';
            
          }
        }
      } catch (error) {
        
      }
    }

    // If still no messages, check inner group chats (stored as chats with groupId_innerGroupId format)
    if (messages.length === 0) {
      try {
        // Check if this is an inner group chat - messages are in subcollection
        const innerGroupChatDoc = await db.collection('chats').doc(chatId).get();
        if (innerGroupChatDoc.exists) {
          
          const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
          if (!messagesSnapshot.empty) {
            messagesSnapshot.forEach(doc => {
              messages.push({ id: doc.id, ...doc.data() });
            });
            chatType = 'innerGroup';
            
          }
        }
      } catch (error) {
        
      }
    }

    // If still no messages, try to find by groupId pattern for inner groups
    if (messages.length === 0 && chatId.includes('_')) {
      try {
        const [groupId, innerGroupId] = chatId.split('_');
        
        
        // Check if the group exists
        const groupDoc = await db.collection('groups').doc(groupId).get();
        if (groupDoc.exists) {
          // Check if the inner group exists
          const innerGroupDoc = await db.collection('groups').doc(groupId).collection('innerGroups').doc(innerGroupId).get();
          if (innerGroupDoc.exists) {
            
            const messagesSnapshot = await db.collection('groups').doc(groupId).collection('innerGroups').doc(innerGroupId).collection('messages').get();
            if (!messagesSnapshot.empty) {
              messagesSnapshot.forEach(doc => {
                messages.push({ id: doc.id, ...doc.data() });
              });
              chatType = 'innerGroup';
              
            }
          }
        }
      } catch (error) {
        
      }
    }

    if (messages.length === 0) {
      return NextResponse.json({ 
        error: 'Chat not found or no messages found',
        chatId,
        chatType: 'unknown'
      }, { status: 404 });
    }

    // Sort messages by timestamp (oldest first)
    messages.sort((a, b) => {
      const timestampA = a.timestamp?.toDate?.() || a.timestamp || 0;
      const timestampB = b.timestamp?.toDate?.() || b.timestamp || 0;
      return timestampA - timestampB;
    });

    return NextResponse.json({ 
      success: true,
      chatId,
      chatType,
      messageCount: messages.length,
      messages: messages
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
}
