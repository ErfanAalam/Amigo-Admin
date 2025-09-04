import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../../utils/firebaseAdmin';

// Allowed admin UIDs who can manage other admins
const ALLOWED_ADMIN_UIDS = [
  'yBVwfrDoLwOMiEMEIn450Gtqjw43',
  'Mh4uGEIj44QTUBcT08l2Fuid9h52'
];

async function verifyAdminAccess(uid: string): Promise<boolean> {
  try {
    // Check if the user is in the allowed admin UIDs
    if (ALLOWED_ADMIN_UIDS.includes(uid)) {
      return true;
    }

    // Check if the user has admin role in Firestore
    const db = getFirebaseAdminFirestore();
    const adminDoc = await db.collection('admins').doc(uid).get();
    
    if (adminDoc.exists) {
      const adminData = adminDoc.data();
      return adminData?.role === 'admin' && adminData?.isActive === true;
    }

    return false;
  } catch (error) {
    console.error('Error verifying admin access:', error);
    return false;
  }
}

// PUT /api/admins/[adminId]/status - Update admin status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization token provided' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getFirebaseAdminAuth();
    
    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user has admin access
    const hasAccess = await verifyAdminAccess(uid);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { adminId } = await params;
    const { isActive } = await request.json();

    // Validate input
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ 
        error: 'isActive must be a boolean value' 
      }, { status: 400 });
    }

    // Prevent self-deactivation
    if (adminId === uid && !isActive) {
      return NextResponse.json({ 
        error: 'You cannot deactivate your own account' 
      }, { status: 400 });
    }

    // Check if admin exists
    const db = getFirebaseAdminFirestore();
    const adminDoc = await db.collection('admins').doc(adminId).get();
    
    if (!adminDoc.exists) {
      return NextResponse.json({ 
        error: 'Admin not found' 
      }, { status: 404 });
    }

    // Update admin status
    await db.collection('admins').doc(adminId).update({
      isActive: isActive,
      updatedAt: new Date(),
      updatedBy: uid
    });

    // If deactivating, also disable the user in Firebase Auth
    if (!isActive) {
      try {
        await auth.updateUser(adminId, {
          disabled: true
        });
      } catch (authError: any) {
        console.error('Error disabling user in Auth:', authError);
        // Continue even if Auth update fails
      }
    } else {
      // If activating, enable the user in Firebase Auth
      try {
        await auth.updateUser(adminId, {
          disabled: false
        });
      } catch (authError: any) {
        console.error('Error enabling user in Auth:', authError);
        // Continue even if Auth update fails
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error: any) {
    console.error('Error updating admin status:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update admin status' 
    }, { status: 500 });
  }
}
