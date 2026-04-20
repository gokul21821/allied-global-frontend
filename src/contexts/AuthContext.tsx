// import React, { createContext, useContext, useEffect, useState } from 'react';
// import {
//   User,
//   onAuthStateChanged,
//   signInWithEmailAndPassword,
//   createUserWithEmailAndPassword,
//   signOut,
//   signInWithPopup,
//   GoogleAuthProvider,
//   fetchSignInMethodsForEmail
// } from 'firebase/auth';
// import { FirebaseError } from 'firebase/app';
// import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
// import { auth, db } from '../lib/firebase';

// interface UserData {
//   name: string;
//   email: string;
//   role: 'admin' | 'user' | 'super-admin' | 'sub-admin';
//   createdByAdmin: boolean;
//   createdBySubAdminId?: string | null;
//   isActive?: boolean;
//   createdAt: Date;
//   updatedAt: Date;
//   hasToppedUp?: boolean;
//   totalBalance?: number;
//   sentRequests?: {
//     [targetUserId: string]: {
//       status: "pending" | "accepted" | "rejected";
//       email: string;
//     };
//   };
//   receivedRequests?: {
//     [requestingUserId: string]: {
//       status: "pending" | "accepted" | "rejected";
//       email: string;
//     };
//   };
// }

// interface AuthContextType {
//   user: User | null;
//   userData: UserData | null;
//   loading: boolean;
//   signIn: (email: string, password: string) => Promise<void>;
//   signUp: (email: string, password: string) => Promise<void>;
//   signInWithGoogle: () => Promise<void>;
//   logout: () => Promise<void>;
//   isAdmin: () => boolean;
//   impersonatedUser: User | null;
//   impersonatedUserData: UserData | null;
//   isImpersonating: boolean;
//   impersonateUser: (userId: string) => Promise<void>;
//   stopImpersonation: () => void;
//   getEffectiveUser: () => User | null;
//   getEffectiveUserData: () => UserData | null;
//   managedUserIds: string[];
//   isSubAdmin: () => boolean;
//   isManagedUser: (userId: string) => boolean;
// }

// const AuthContext = createContext<AuthContextType | null>(null);

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// };

// export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [user, setUser] = useState<User | null>(null);
//   const [userData, setUserData] = useState<UserData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
//   const [impersonatedUserData, setImpersonatedUserData] = useState<UserData | null>(null);
//   const [managedUserIds, setManagedUserIds] = useState<string[]>([]);

//   const fetchUserData = async (uid: string) => {
//     try {
//       const userDoc = await getDoc(doc(db, 'users', uid));
//       if (userDoc.exists()) {
//         setUserData(userDoc.data() as UserData);
//       }
//     } catch (error) {
//       console.error('Error fetching user data:', error);
//     }
//   };

//   const isSubAdmin = () => userData?.role === 'sub-admin';
//   const isManagedUser = (userId: string) => managedUserIds.includes(userId);

//   useEffect(() => {
//     if (!user?.uid) {
//       setManagedUserIds([]);
//       return;
//     }

//     if (userData?.role === 'sub-admin') {
//       const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
//         const createdUsers: string[] = [];
//         snapshot.forEach((docSnap) => {
//           const data = docSnap.data() as UserData;
//           if (data.createdBySubAdminId === user.uid) {
//             createdUsers.push(docSnap.id);
//           }
//         });

//         setManagedUserIds(createdUsers);
//       });

//       return () => unsubscribe();
//     } else {
//       setManagedUserIds([]);
//     }
//   }, [user?.uid, userData?.role]);

//   useEffect(() => {
//     const unsubscribe = onAuthStateChanged(auth, async (user) => {
//       setUser(user);
//       if (user) {
//         await fetchUserData(user.uid);
//       } else {
//         setUserData(null);
//       }
//       setLoading(false);
//     });

//     return unsubscribe;
//   }, []);

//   const checkExistingSignInMethods = async (email: string): Promise<string[]> => {
//     try {
//       const methods = await fetchSignInMethodsForEmail(auth, email);
//       return methods;
//     } catch (error) {
//       console.error('Error fetching sign-in methods:', error);
//       return [];
//     }
//   };

//   const signIn = async (email: string, password: string) => {
//     try {
//       await signInWithEmailAndPassword(auth, email, password);
//     } catch (error) {
//       if (error instanceof FirebaseError) {
//         switch (error.code) {
//           case 'auth/invalid-email':
//             throw new Error('Invalid email address');
//           case 'auth/user-disabled':
//             throw new Error('This account has been disabled');
//           case 'auth/user-not-found':
//             // Check if user exists with Google OAuth
//             const methods = await checkExistingSignInMethods(email);
//             if (methods.includes('google.com')) {
//               throw new Error('This email is registered with Google. Please try signing in with Google instead.');
//             }
//             throw new Error('No account found with this email address');
//           case 'auth/wrong-password':
//             // Check if user exists with Google OAuth
//             const signInMethods = await checkExistingSignInMethods(email);
//             if (signInMethods.includes('google.com')) {
//               throw new Error('This email is registered with Google. Please try signing in with Google instead.');
//             }
//             throw new Error('Invalid password');
//           case 'auth/invalid-credential':
//             // Check if user exists with Google OAuth
//             const existingMethods = await checkExistingSignInMethods(email);
//             if (existingMethods.includes('google.com')) {
//               throw new Error('This email is registered with Google. Please try signing in with Google instead.');
//             }
//             throw new Error('Invalid email or password');
//           default:
//             throw new Error('An error occurred during sign in');
//         }
//       }
//       throw error;
//     }
//   };

//   const signUp = async (email: string, password: string) => {
//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       // Create the user document in Firestore
//       const userData: UserData = {
//         name: user.email!.split('@')[0], // Use email prefix as default name
//         email: user.email!,
//         role: 'user', // Default role is user
//         createdByAdmin: false,
//         createdBySubAdminId: null,
//         isActive: true,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//         hasToppedUp: false,
//         totalBalance: 0,
//         sentRequests: {},
//         receivedRequests: {}
//       };

//       await setDoc(doc(db, 'users', user.uid), userData);
//       setUserData(userData);
//     } catch (error) {
//       if (error instanceof FirebaseError) {
//         switch (error.code) {
//           case 'auth/email-already-in-use':
//             // Check if the existing account uses Google OAuth
//             const methods = await checkExistingSignInMethods(email);
//             if (methods.includes('google.com')) {
//               throw new Error('This email is already registered with Google. Please try signing in with Google instead.');
//             }
//             throw new Error('This email is already registered. Please try signing in instead.');
//           case 'auth/invalid-email':
//             throw new Error('Invalid email address');
//           case 'auth/operation-not-allowed':
//             throw new Error('Email/password accounts are not enabled');
//           case 'auth/weak-password':
//             throw new Error('Password is too weak');
//           default:
//             throw new Error('An error occurred during sign up');
//         }
//       }
//       throw error;
//     }
//   };

//   const signInWithGoogle = async () => {
//     try {
//       const provider = new GoogleAuthProvider();
//       provider.addScope('email');
//       provider.addScope('profile');

//       // Add custom parameters for better popup handling
//       provider.setCustomParameters({
//         prompt: 'select_account'
//       });

//       let userCredential;
//       try {
//         // Try popup first
//         userCredential = await signInWithPopup(auth, provider);
//       } catch (popupError) {
//         console.error('Popup failed, error details:', popupError);
//         // If popup fails, throw the error to be handled by the calling function
//         throw popupError;
//       }

//       const user = userCredential.user;

//       // Check if user document exists in Firestore
//       const userDocRef = doc(db, 'users', user.uid);
//       const userDoc = await getDoc(userDocRef);

//       if (!userDoc.exists()) {
//         // Create new user document if it doesn't exist
//         const userData: UserData = {
//           name: user.displayName || user.email!.split('@')[0],
//           email: user.email!,
//           role: 'user',
//           createdByAdmin: false,
//           createdBySubAdminId: null,
//           isActive: true,
//           createdAt: new Date(),
//           updatedAt: new Date(),
//           hasToppedUp: false,
//           totalBalance: 0,
//           sentRequests: {},
//           receivedRequests: {}
//         };

//         await setDoc(userDocRef, userData);
//         setUserData(userData);
//       } else {
//         setUserData(userDoc.data() as UserData);
//       }
//     } catch (error) {
//       console.error('Google sign-in detailed error:', error);

//       if (error instanceof FirebaseError) {
//         console.error('Firebase error code:', error.code);
//         console.error('Firebase error message:', error.message);

//         switch (error.code) {
//           case 'auth/popup-closed-by-user':
//             throw new Error('Sign-in popup was closed. Please try again.');
//           case 'auth/popup-blocked':
//             throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
//           case 'auth/cancelled-popup-request':
//             throw new Error('Sign-in was cancelled.');
//           case 'auth/unauthorized-domain':
//             throw new Error('This domain is not authorized for Google sign-in. Please wait a few minutes for changes to take effect.');
//           case 'auth/operation-not-allowed':
//             throw new Error('Google sign-in is not enabled. Please contact support.');
//           case 'auth/invalid-api-key':
//             throw new Error('Invalid API key configuration.');
//           case 'auth/network-request-failed':
//             throw new Error('Network error. Please check your internet connection and try again.');
//           case 'auth/account-exists-with-different-credential':
//             // Check if user exists with email/password
//             const email = error.customData?.email as string | undefined;
//             if (email && typeof email === 'string') {
//               const methods = await checkExistingSignInMethods(email);
//               if (methods.includes('password')) {
//                 throw new Error('This email is already registered with email/password. Please try signing in with your email and password instead.');
//               }
//             }
//             throw new Error('An account already exists with this email using a different sign-in method.');
//           default:
//             console.error('Unhandled Google sign-in error:', error);
//             throw new Error(`Google sign-in failed: ${error.message || 'Unknown error'}`);
//         }
//       }

//       // Handle non-Firebase errors
//       if (error && typeof error === 'object' && 'message' in error) {
//         throw new Error(`Sign-in failed: ${error.message}`);
//       }

//       throw new Error('An unexpected error occurred during Google sign-in. Please try again.');
//     }
//   };

//   const logout = async () => {
//     try {
//       await signOut(auth);
//       setUserData(null);
//     } catch (error) {
//       console.error('Error during logout:', error);
//       throw new Error('Failed to log out');
//     }
//   };

//   const isAdmin = () => {
//     return userData?.role === 'admin';
//   };

//   const impersonateUser = async (userId: string) => {
//     if (!user) {
//       throw new Error('Must be logged in to impersonate users');
//     }

//     const isSuperAdmin = userData?.role === 'super-admin';
//     const hasAcceptedRequest = userData?.sentRequests?.[userId]?.status === 'accepted';
//     const isSubAdminImpersonatingOwnUser = userData?.role === 'sub-admin' && managedUserIds.includes(userId);

//     if (!isSuperAdmin && !hasAcceptedRequest && !isSubAdminImpersonatingOwnUser) {
//       throw new Error('No permission to impersonate this user');
//     }

//     try {
//       const userDoc = await getDoc(doc(db, 'users', userId));
//       if (!userDoc.exists()) {
//         throw new Error('User not found');
//       }

//       const impersonatedUserData = userDoc.data() as UserData;

//       const mockUser: User = {
//         uid: userId,
//         email: impersonatedUserData.email,
//         emailVerified: true,
//         isAnonymous: false,
//         metadata: {
//           creationTime: impersonatedUserData.createdAt.toString(),
//           lastSignInTime: new Date().toString(),
//         },
//         providerData: [],
//         refreshToken: '',
//         tenantId: null,
//         delete: async () => { },
//         getIdToken: async () => '',
//         getIdTokenResult: async () => ({} as any),
//         reload: async () => { },
//         toJSON: () => ({}),
//         displayName: null,
//         phoneNumber: null,
//         photoURL: null,
//         providerId: 'firebase'
//       };

//       setImpersonatedUser(mockUser);
//       setImpersonatedUserData(impersonatedUserData);
//     } catch (error) {
//       console.error('Error impersonating user:', error);
//       throw error;
//     }
//   };

//   const stopImpersonation = () => {
//     setImpersonatedUser(null);
//     setImpersonatedUserData(null);
//   };

//   const getEffectiveUser = () => {
//     return impersonatedUser || user;
//   };

//   const getEffectiveUserData = () => {
//     return impersonatedUserData || userData;
//   };

//   const isImpersonating = impersonatedUser !== null;

//   const value = {
//     user,
//     userData,
//     loading,
//     signIn,
//     signUp,
//     signInWithGoogle,
//     logout,
//     isAdmin,
//     impersonatedUser,
//     impersonatedUserData,
//     isImpersonating,
//     impersonateUser,
//     stopImpersonation,
//     getEffectiveUser,
//     getEffectiveUserData,
//     managedUserIds,
//     isSubAdmin,
//     isManagedUser,
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };


import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  name: string;
  email: string;
  role: 'admin' | 'user' | 'super-admin' | 'sub-admin' | 'sub-admin-user';
  createdByAdmin: boolean;
  createdBySubAdminId?: string | null;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
  hasToppedUp?: boolean;
  totalBalance?: number;
  sentRequests?: {
    [targetUserId: string]: {
      status: "pending" | "accepted" | "rejected";
      email: string;
    };
  };
  receivedRequests?: {
    [requestingUserId: string]: {
      status: "pending" | "accepted" | "rejected";
      email: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  impersonatedUser: User | null;
  impersonatedUserData: UserData | null;
  isImpersonating: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonation: () => void;
  getEffectiveUser: () => User | null;
  getEffectiveUserData: () => UserData | null;
  managedUserIds: string[];
  isSubAdmin: () => boolean;
  hasSubAdminPrivileges: () => boolean;
  isManagedUser: (userId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedUser, setImpersonatedUser] = useState<User | null>(null);
  const [impersonatedUserData, setImpersonatedUserData] = useState<UserData | null>(null);
  const [managedUserIds, setManagedUserIds] = useState<string[]>([]);

  const fetchUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Check if user is specifically a sub-admin (original role only)
  const isSubAdmin = () => userData?.role === 'sub-admin';

  // Check if user has sub-admin privileges (sub-admin OR sub-admin-user)
  const hasSubAdminPrivileges = () => {
    return userData?.role === 'sub-admin' || userData?.role === 'sub-admin-user';
  };

  // Check if a given user ID is managed by the current user
  const isManagedUser = (userId: string) => managedUserIds.includes(userId);

  // Update managed users listener to include both sub-admin and sub-admin-user
  useEffect(() => {
    if (!user?.uid) {
      setManagedUserIds([]);
      return;
    }

    // Listen for managed users if current user has sub-admin privileges
    if (hasSubAdminPrivileges()) {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const createdUsers: string[] = [];
        const currentUserRole = userData?.role;
        const parentSubAdminId = userData?.createdBySubAdminId; // For sub-admin-user, this is their parent sub-admin
        
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserData;
          
          // For sub-admin: show users they directly created
          if (currentUserRole === 'sub-admin') {
            if (data.createdBySubAdminId === user.uid) {
              createdUsers.push(docSnap.id);
            }
          }
          // For sub-admin-user: show users created by their parent sub-admin (same as parent can see)
          // AND also users they directly created
          else if (currentUserRole === 'sub-admin-user') {
            // Include users created by parent sub-admin
            if (parentSubAdminId && data.createdBySubAdminId === parentSubAdminId) {
              createdUsers.push(docSnap.id);
            }
            // Also include users created directly by this sub-admin-user
            if (data.createdBySubAdminId === user.uid) {
              createdUsers.push(docSnap.id);
            }
          }
        });

        setManagedUserIds(createdUsers);
      });

      return () => unsubscribe();
    } else {
      setManagedUserIds([]);
    }
  }, [user?.uid, userData?.role, userData?.createdBySubAdminId]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const checkExistingSignInMethods = async (email: string): Promise<string[]> => {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods;
    } catch (error) {
      console.error('Error fetching sign-in methods:', error);
      return [];
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-email':
            throw new Error('Invalid email address');
          case 'auth/user-disabled':
            throw new Error('This account has been disabled');
          case 'auth/user-not-found':
            // Check if user exists with Google OAuth
            const methods = await checkExistingSignInMethods(email);
            if (methods.includes('google.com')) {
              throw new Error('This email is registered with Google. Please try signing in with Google instead.');
            }
            throw new Error('No account found with this email address');
          case 'auth/wrong-password':
            // Check if user exists with Google OAuth
            const signInMethods = await checkExistingSignInMethods(email);
            if (signInMethods.includes('google.com')) {
              throw new Error('This email is registered with Google. Please try signing in with Google instead.');
            }
            throw new Error('Invalid password');
          case 'auth/invalid-credential':
            // Check if user exists with Google OAuth
            const existingMethods = await checkExistingSignInMethods(email);
            if (existingMethods.includes('google.com')) {
              throw new Error('This email is registered with Google. Please try signing in with Google instead.');
            }
            throw new Error('Invalid email or password');
          default:
            throw new Error('An error occurred during sign in');
        }
      }
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create the user document in Firestore
      const userData: UserData = {
        name: user.email!.split('@')[0], // Use email prefix as default name
        email: user.email!,
        role: 'user', // Default role is user
        createdByAdmin: false,
        createdBySubAdminId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        hasToppedUp: false,
        totalBalance: 0,
        sentRequests: {},
        receivedRequests: {}
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      setUserData(userData);
    } catch (error) {
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            // Check if the existing account uses Google OAuth
            const methods = await checkExistingSignInMethods(email);
            if (methods.includes('google.com')) {
              throw new Error('This email is already registered with Google. Please try signing in with Google instead.');
            }
            throw new Error('This email is already registered. Please try signing in instead.');
          case 'auth/invalid-email':
            throw new Error('Invalid email address');
          case 'auth/operation-not-allowed':
            throw new Error('Email/password accounts are not enabled');
          case 'auth/weak-password':
            throw new Error('Password is too weak');
          default:
            throw new Error('An error occurred during sign up');
        }
      }
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');

      // Add custom parameters for better popup handling
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      let userCredential;
      try {
        // Try popup first
        userCredential = await signInWithPopup(auth, provider);
      } catch (popupError) {
        console.error('Popup failed, error details:', popupError);
        // If popup fails, throw the error to be handled by the calling function
        throw popupError;
      }

      const user = userCredential.user;

      // Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        const userData: UserData = {
          name: user.displayName || user.email!.split('@')[0],
          email: user.email!,
          role: 'user',
          createdByAdmin: false,
          createdBySubAdminId: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          hasToppedUp: false,
          totalBalance: 0,
          sentRequests: {},
          receivedRequests: {}
        };

        await setDoc(userDocRef, userData);
        setUserData(userData);
      } else {
        setUserData(userDoc.data() as UserData);
      }
    } catch (error) {
      console.error('Google sign-in detailed error:', error);

      if (error instanceof FirebaseError) {
        console.error('Firebase error code:', error.code);
        console.error('Firebase error message:', error.message);

        switch (error.code) {
          case 'auth/popup-closed-by-user':
            throw new Error('Sign-in popup was closed. Please try again.');
          case 'auth/popup-blocked':
            throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
          case 'auth/cancelled-popup-request':
            throw new Error('Sign-in was cancelled.');
          case 'auth/unauthorized-domain':
            throw new Error('This domain is not authorized for Google sign-in. Please wait a few minutes for changes to take effect.');
          case 'auth/operation-not-allowed':
            throw new Error('Google sign-in is not enabled. Please contact support.');
          case 'auth/invalid-api-key':
            throw new Error('Invalid API key configuration.');
          case 'auth/network-request-failed':
            throw new Error('Network error. Please check your internet connection and try again.');
          case 'auth/account-exists-with-different-credential':
            // Check if user exists with email/password
            const email = error.customData?.email as string | undefined;
            if (email && typeof email === 'string') {
              const methods = await checkExistingSignInMethods(email);
              if (methods.includes('password')) {
                throw new Error('This email is already registered with email/password. Please try signing in with your email and password instead.');
              }
            }
            throw new Error('An account already exists with this email using a different sign-in method.');
          default:
            console.error('Unhandled Google sign-in error:', error);
            throw new Error(`Google sign-in failed: ${error.message || 'Unknown error'}`);
        }
      }

      // Handle non-Firebase errors
      if (error && typeof error === 'object' && 'message' in error) {
        throw new Error(`Sign-in failed: ${error.message}`);
      }

      throw new Error('An unexpected error occurred during Google sign-in. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw new Error('Failed to log out');
    }
  };

  const isAdmin = () => {
    return userData?.role === 'admin';
  };

  const impersonateUser = async (userId: string) => {
    if (!user) {
      throw new Error('Must be logged in to impersonate users');
    }

    const isSuperAdmin = userData?.role === 'super-admin';
    const isAdmin = userData?.role === 'admin';
    const hasAcceptedRequest = userData?.sentRequests?.[userId]?.status === 'accepted';
    // Allow both sub-admin and sub-admin-user to impersonate their managed users
    const hasSubAdminAccess = hasSubAdminPrivileges() && managedUserIds.includes(userId);

    if (!isSuperAdmin && !isAdmin && !hasAcceptedRequest && !hasSubAdminAccess) {
      throw new Error('No permission to impersonate this user');
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const impersonatedUserData = userDoc.data() as UserData;

      const mockUser: User = {
        uid: userId,
        email: impersonatedUserData.email,
        emailVerified: true,
        isAnonymous: false,
        metadata: {
          creationTime: impersonatedUserData.createdAt.toString(),
          lastSignInTime: new Date().toString(),
        },
        providerData: [],
        refreshToken: '',
        tenantId: null,
        delete: async () => { },
        getIdToken: async () => '',
        getIdTokenResult: async () => ({} as any),
        reload: async () => { },
        toJSON: () => ({}),
        displayName: null,
        phoneNumber: null,
        photoURL: null,
        providerId: 'firebase'
      };

      setImpersonatedUser(mockUser);
      setImpersonatedUserData(impersonatedUserData);
    } catch (error) {
      console.error('Error impersonating user:', error);
      throw error;
    }
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    setImpersonatedUserData(null);
  };

  const getEffectiveUser = () => {
    return impersonatedUser || user;
  };

  const getEffectiveUserData = () => {
    return impersonatedUserData || userData;
  };

  const isImpersonating = impersonatedUser !== null;

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    isAdmin,
    impersonatedUser,
    impersonatedUserData,
    isImpersonating,
    impersonateUser,
    stopImpersonation,
    getEffectiveUser,
    getEffectiveUserData,
    managedUserIds,
    isSubAdmin, // Keep for backward compatibility
    hasSubAdminPrivileges, // New function for unified privilege checking
    isManagedUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};