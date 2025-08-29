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
  { params }: { params: { chatId: string } }
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

    const { chatId } = params;
    const db = getFirebaseAdminFirestore();
    let messages: any[] = [];
    let chatType = 'unknown';

    console.log(`Searching for chat with ID: ${chatId}`);

    // Try to find messages in different collections based on chat type
    try {
      // Check direct chats first - messages are in subcollection
      const directChatDoc = await db.collection('chats').doc(chatId).get();
      if (directChatDoc.exists) {
        console.log('Found direct chat document, checking messages subcollection');
        const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
        if (!messagesSnapshot.empty) {
          messagesSnapshot.forEach(doc => {
            messages.push({ id: doc.id, ...doc.data() });
          });
          chatType = 'direct';
          console.log(`Found ${messages.length} messages in direct chat subcollection`);
        }
      }
    } catch (error) {
      console.log('Direct chat not found or error:', error);
    }

    // If no messages found in direct chats, check group chats
    if (messages.length === 0) {
      try {
        // Check if this is a group chat - messages are in subcollection
        const groupDoc = await db.collection('groups').doc(chatId).get();
        if (groupDoc.exists) {
          console.log('Found group document, checking messages subcollection');
          const messagesSnapshot = await db.collection('groups').doc(chatId).collection('messages').get();
          if (!messagesSnapshot.empty) {
            messagesSnapshot.forEach(doc => {
              messages.push({ id: doc.id, ...doc.data() });
            });
            chatType = 'group';
            console.log(`Found ${messages.length} messages in group subcollection`);
          }
        }
      } catch (error) {
        console.log('Group chat not found or error:', error);
      }
    }

    // If still no messages, check inner group chats (stored as chats with groupId_innerGroupId format)
    if (messages.length === 0) {
      try {
        // Check if this is an inner group chat - messages are in subcollection
        const innerGroupChatDoc = await db.collection('chats').doc(chatId).get();
        if (innerGroupChatDoc.exists) {
          console.log('Found inner group chat document, checking messages subcollection');
          const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
          if (!messagesSnapshot.empty) {
            messagesSnapshot.forEach(doc => {
              messages.push({ id: doc.id, ...doc.data() });
            });
            chatType = 'innerGroup';
            console.log(`Found ${messages.length} messages in inner group subcollection`);
          }
        }
      } catch (error) {
        console.log('Inner group chat not found or error:', error);
      }
    }

    // If still no messages, try to find by groupId pattern for inner groups
    if (messages.length === 0 && chatId.includes('_')) {
      try {
        const [groupId, innerGroupId] = chatId.split('_');
        console.log(`Trying to find inner group chat with groupId: ${groupId}, innerGroupId: ${innerGroupId}`);
        
        // Check if this is an inner group chat stored in chats collection
        const innerGroupChatDoc = await db.collection('chats').doc(chatId).get();
        if (innerGroupChatDoc.exists) {
          console.log('Found inner group chat document by pattern, checking messages subcollection');
          const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
          if (!messagesSnapshot.empty) {
            messagesSnapshot.forEach(doc => {
              messages.push({ id: doc.id, ...doc.data() });
            });
            chatType = 'innerGroup';
            console.log(`Found ${messages.length} messages in inner group subcollection by pattern`);
          }
        }
      } catch (error) {
        console.log('Search by groupId-innerGroupId pattern failed:', error);
      }
    }

    console.log(`Final result - Chat type: ${chatType}, Messages found: ${messages.length}`);

    // Process messages to include user information
    const processedMessages = await Promise.all(
      messages.map(async (message) => {
        let userName = 'Unknown User';
        let userEmail = 'N/A';
        
        if (message.senderId) {
          try {
            const userDoc = await db.collection('users').doc(message.senderId).get();
            if (userDoc.exists) {
              const userData = userDoc.data();
              userName = userData?.displayName || 'Anonymous';
              userEmail = userData?.email || 'N/A';
            }
          } catch (error) {
            console.log('User not found for message sender:', error);
          }
        }

        return {
          id: message.id || message.timestamp,
          text: message.text || message.content || '',
          senderId: message.senderId,
          senderName: userName,
          senderEmail: userEmail,
          timestamp: message.timestamp?.toDate?.() || message.timestamp || new Date(),
          type: message.messageType || message.type || 'text',
          mediaUrl: message.mediaUrl || null,
          mediaType: message.mediaType || null,
        };
      })
    );

    // Sort messages by timestamp
    processedMessages.sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });

    return NextResponse.json({ 
      success: true, 
      messages: processedMessages,
      total: processedMessages.length,
      chatType: chatType
    });

  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
}
