import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../../../utils/firebaseAdmin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { chatId: string; messageId: string } }
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

    const { chatId, messageId } = params;
    const db = getFirebaseAdminFirestore();

    // Try to delete from chats collection first (direct chats and inner group chats)
    try {
      const chatDoc = await db.collection('chats').doc(chatId).get();
      if (chatDoc.exists) {
        const messageDoc = await db.collection('chats').doc(chatId).collection('messages').doc(messageId).get();
        if (messageDoc.exists) {
          await db.collection('chats').doc(chatId).collection('messages').doc(messageId).delete();
          return NextResponse.json({ 
            success: true, 
            message: 'Message deleted successfully' 
          });
        }
      }
    } catch (error) {
      console.log('Message not found in chats collection:', error);
    }

    // Try to delete from groups collection (user-created group chats)
    try {
      const groupDoc = await db.collection('groups').doc(chatId).get();
      if (groupDoc.exists) {
        const messageDoc = await db.collection('groups').doc(chatId).collection('messages').doc(messageId).get();
        if (messageDoc.exists) {
          await db.collection('groups').doc(chatId).collection('messages').doc(messageId).delete();
          return NextResponse.json({ 
            success: true, 
            message: 'Message deleted successfully' 
          });
        }
      }
    } catch (error) {
      console.log('Message not found in groups collection:', error);
    }

    return NextResponse.json({ 
      error: 'Message not found' 
    }, { status: 404 });

  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
