import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../../utils/firebaseAdmin';

export async function POST(
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

    // Archive the chat by setting isActive to false
    await getFirebaseAdminFirestore().collection('chats').doc(chatId).update({
      isActive: false,
      archivedAt: new Date(),
      archivedBy: decodedToken.uid
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Chat archived successfully'
    });

  } catch (error) {
    console.error('Error archiving chat:', error);
    return NextResponse.json({ error: 'Failed to archive chat' }, { status: 500 });
  }
}
