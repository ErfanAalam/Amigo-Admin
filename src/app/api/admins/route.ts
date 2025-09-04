import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '../../../utils/firebaseAdmin';

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

// GET /api/admins - Get all admins
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

    // Get all admins from Firestore
    const db = getFirebaseAdminFirestore();
    const adminsSnapshot = await db.collection('admins').get();
    
    const admins = adminsSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ 
      success: true, 
      admins: admins.sort((a: any, b: any) => {
        const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
        const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
        return bTime - aTime;
      })
    });

  } catch (error: any) {
    console.error('Error fetching admins:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch admins' 
    }, { status: 500 });
  }
}

// POST /api/admins - Create new admin
export async function POST(request: NextRequest) {
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

    const { email, password, role, permissions } = await request.json();

    // Validate input
    if (!email || !password || !role || !permissions || !Array.isArray(permissions)) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, password, role, permissions' 
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

    // Check if admin already exists
    const db = getFirebaseAdminFirestore();
    const existingAdminQuery = await db.collection('admins').where('email', '==', email).get();
    if (!existingAdminQuery.empty) {
      return NextResponse.json({ 
        error: 'Admin with this email already exists' 
      }, { status: 400 });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      emailVerified: true,
    });

    // Create admin document in Firestore
    await db.collection('admins').doc(userRecord.uid).set({
      email: email,
      role: role,
      permissions: permissions,
      createdAt: new Date(),
      isActive: true,
      createdBy: uid
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin created successfully',
      admin: {
        uid: userRecord.uid,
        email: email,
        role: role,
        permissions: permissions,
        isActive: true
      }
    });

  } catch (error: any) {
    console.error('Error creating admin:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 400 });
    } else if (error.code === 'auth/invalid-email') {
      return NextResponse.json({ 
        error: 'Invalid email format' 
      }, { status: 400 });
    } else if (error.code === 'auth/weak-password') {
      return NextResponse.json({ 
        error: 'Password is too weak. Use at least 6 characters.' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: error.message || 'Failed to create admin' 
    }, { status: 500 });
  }
}
