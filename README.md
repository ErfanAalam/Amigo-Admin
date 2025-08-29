# Amigo Admin Dashboard

A **secure and robust** admin dashboard for managing the Amigo chat application, built with Next.js and Firebase with enterprise-grade security.

## 🛡️ **Security Features**

- 🔐 **Multi-layered security architecture**
- 🚫 **No direct client-to-database connections**
- 🔒 **Server-side authentication validation**
- 🛡️ **Protected API routes with middleware**
- 🔑 **Firebase Admin SDK for secure operations**
- 👥 **Role-based access control (RBAC)**
- 🔒 **Environment variable protection**

## ✨ **Features**

- 🔐 Secure authentication with Firebase Auth
- 👥 User management and monitoring
- 📊 Real-time statistics dashboard
- 🔍 User search and filtering
- 📱 Responsive design with Tailwind CSS
- 🛡️ Protected routes for admin access
- 🔒 Secure API endpoints
- 📈 User analytics and insights

## 🚀 **Quick Start**

### **1. Install Dependencies**
```bash
npm install
```

### **2. Setup Firebase Admin SDK**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `amigo-ec5be`
3. Go to **Project Settings** > **Service Accounts**
4. Click **"Generate New Private Key"**
5. Download the JSON file

### **3. Create Environment File**
```bash
cp env.example .env.local
```

Edit `.env.local` with your Firebase Admin credentials:
```bash
FIREBASE_PROJECT_ID=amigo-ec5be
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@amigo-ec5be.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Here\n-----END PRIVATE KEY-----\n"
```

### **4. Create Your First Admin**
```bash
npm run create-admin-secure admin@yourdomain.com yourpassword
```

### **5. Start Development Server**
```bash
npm run dev
```

### **6. Access Dashboard**
Open [http://localhost:3000](http://localhost:3000) and login with your admin credentials.

## 🔐 **Security Architecture**

### **Multi-Layer Security**
```
┌─────────────────────────────────────┐
│           Client (Frontend)         │
│  • Firebase Auth                   │
│  • Protected Routes                │
│  • Token Management                │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           API Routes                │
│  • Authentication Middleware        │
│  • Token Verification               │
│  • Role-based Access Control       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│        Firebase Admin SDK           │
│  • Server-side Operations          │
│  • Secure Database Access          │
│  • Environment Protection          │
└─────────────────────────────────────┘
```

### **What's Protected**
- ✅ **API Routes**: All `/api/*` endpoints require authentication
- ✅ **Admin Access**: Only verified admins can access data
- ✅ **Database**: No direct client-to-Firestore connections
- ✅ **Credentials**: Firebase Admin keys never exposed to client
- ✅ **Routes**: Dashboard routes protected with middleware

## 🏗️ **Project Structure**

```
src/
├── app/                    # Next.js app router
│   ├── api/               # Secure API routes
│   │   ├── auth/          # Authentication endpoints
│   │   └── users/         # User management endpoints
│   ├── dashboard/         # Protected dashboard page
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Login page
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard
│   ├── Login.tsx          # Login form
│   └── ProtectedRoute.tsx # Route protection
├── context/               # React context
│   └── AuthContext.tsx    # Authentication context
├── utils/                 # Utility functions
│   ├── apiClient.ts       # Secure API client
│   └── firebaseAdmin.ts   # Firebase Admin utilities
└── middleware.ts          # Security middleware
```

## 🔧 **Available Scripts**

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run create-admin-secure` - Create secure admin user
- `npm run create-admin` - Legacy admin creation (less secure)

## 🚨 **Security Best Practices**

### **Production Deployment**
- ✅ Use HTTPS only
- ✅ Set secure HTTP headers
- ✅ Implement rate limiting
- ✅ Monitor access logs
- ✅ Regular security audits

### **Admin Management**
- ✅ Use strong passwords (12+ characters)
- ✅ Enable 2FA if possible
- ✅ Regular credential rotation
- ✅ Monitor admin access
- ✅ Limit admin permissions

## 📊 **Dashboard Features**

### **User Management**
- View all app users
- Search and filter users
- Monitor user status (online/offline)
- Track user activity and creation dates
- User analytics and insights

### **Real-time Statistics**
- Total user count
- Online user count
- New users today
- User growth trends

### **Security Monitoring**
- Authentication logs
- Access attempts
- Admin activity tracking
- Security event logging

## 🔒 **Compliance & Standards**

This implementation follows:
- ✅ **OWASP** security guidelines
- ✅ **Firebase** security best practices
- ✅ **Next.js** security recommendations
- ✅ **Industry-standard** authentication patterns
- ✅ **GDPR** data protection principles

## 🆘 **Troubleshooting**

### **Common Issues**

**"Missing Firebase Admin SDK environment variables"**
- Ensure `.env.local` file exists
- Check all required variables are set
- Verify Firebase Admin credentials

**"User is not an admin"**
- Run the admin creation script
- Check Firestore `admins` collection
- Verify user exists in Firebase Auth

**"Authentication failed"**
- Check Firebase configuration
- Verify service account permissions
- Check network connectivity

## 📚 **Documentation**

- [Security Documentation](./SECURITY.md) - Comprehensive security guide
- [Firebase Admin SDK](https://firebase.google.com/docs/admin) - Official documentation
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction) - API development
- [OWASP Security](https://owasp.org/www-project-top-ten/) - Security best practices

## 🤝 **Support**

For security issues or questions:
1. Check the [Security Documentation](./SECURITY.md)
2. Review Firebase Console logs
3. Check browser console for errors
4. Verify environment configuration

## 📄 **License**

This project is for internal use by Amigo chat application administrators.

---

**⚠️ Security Notice**: This dashboard implements enterprise-grade security measures. Always follow security best practices and keep credentials secure.
