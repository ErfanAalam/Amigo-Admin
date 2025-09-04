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

// GET /api/admins/permissions - Get current admin's permissions
export async function GET(request: NextRequest) {
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

    // Get admin permissions from Firestore
    const db = getFirebaseAdminFirestore();
    const adminDoc = await db.collection('admins').doc(uid).get();
    
    if (!adminDoc.exists) {
      return NextResponse.json({ 
        error: 'Admin not found' 
      }, { status: 404 });
    }

    const adminData = adminDoc.data();
    const permissions = adminData?.permissions || [];

    return NextResponse.json({ 
      success: true, 
      permissions: permissions,
      role: adminData?.role || 'user',
      isActive: adminData?.isActive || false
    });

  } catch (error: any) {
    console.error('Error fetching admin permissions:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch admin permissions' 
    }, { status: 500 });
  }
}
