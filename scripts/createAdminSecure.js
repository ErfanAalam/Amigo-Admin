const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env' });

// Check if environment variables are set
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.error('❌ Missing Firebase Admin SDK environment variables!');
  console.error('Please create a .env.local file with the following variables:');
  console.error('FIREBASE_PROJECT_ID=your-project-id');
  console.error('FIREBASE_CLIENT_EMAIL=your-service-account-email');
  console.error('FIREBASE_PRIVATE_KEY="your-private-key"');
  console.error('\nTo get these values:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Download the JSON file and copy the values');
  process.exit(1);
}

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const adminAuth = getAuth();
const adminDb = getFirestore();

async function createAdmin() {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    
    if (!email || !password) {
      console.error('❌ Usage: node createAdminSecure.js <email> <password>');
      console.error('Example: node createAdminSecure.js admin@amigo.com admin123');
      process.exit(1);
    }

    console.log('🔐 Creating admin user...');
    
    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: email,
      password: password,
      emailVerified: true,
    });
    
    console.log('✅ User created successfully:', userRecord.uid);
    
    // Create admin document in Firestore
    await adminDb.collection('admins').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      createdAt: new Date(),
      permissions: ['read_users', 'manage_users', 'view_analytics', 'create_admins'],
      isActive: true
    });
    
    console.log('✅ Admin document created successfully');
    console.log('\n🎉 Admin user setup complete!');
    console.log('📧 Email:', email);
    console.log('🆔 UID:', userRecord.uid);
    console.log('🔑 Password:', password);
    console.log('\n⚠️  Important: Save these credentials securely!');
    console.log('🚀 You can now login to the admin dashboard at http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    
    if (error.code === 'auth/email-already-exists') {
      console.error('💡 User already exists. Try a different email or reset the password.');
    } else if (error.code === 'auth/invalid-email') {
      console.error('💡 Invalid email format. Please use a valid email address.');
    } else if (error.code === 'auth/weak-password') {
      console.error('💡 Password is too weak. Use at least 6 characters.');
    }
    
    process.exit(1);
  }
}

createAdmin();
