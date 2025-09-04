import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../../utils/firebaseAdmin';

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

// PUT /api/admins/[adminId] - Update admin
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
    const { role, permissions } = await request.json();

    // Validate input
    if (!role || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ 
        error: 'Missing required fields: role, permissions' 
      }, { status: 400 });
    }

    if (!['admin', 'subadmin'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin or subadmin' 
      }, { status: 400 });
    }

    if (permissions.length === 0) {
      return NextResponse.json({ 
        error: 'At least one permission must be selected' 
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

    // Update admin document
    await db.collection('admins').doc(adminId).update({
      role: role,
      permissions: permissions,
      updatedAt: new Date(),
      updatedBy: uid
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating admin:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to update admin' 
    }, { status: 500 });
  }
}

// DELETE /api/admins/[adminId] - Delete admin
export async function DELETE(
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

    // Prevent self-deletion
    if (adminId === uid) {
      return NextResponse.json({ 
        error: 'You cannot delete your own account' 
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

    // Delete user from Firebase Auth
    try {
      await auth.deleteUser(adminId);
    } catch (authError: any) {
      console.error('Error deleting user from Auth:', authError);
      // Continue with Firestore deletion even if Auth deletion fails
    }

    // Delete admin document from Firestore
    await db.collection('admins').doc(adminId).delete();

    return NextResponse.json({ 
      success: true, 
      message: 'Admin deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting admin:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to delete admin' 
    }, { status: 500 });
  }
}
