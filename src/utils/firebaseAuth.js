/**
 * Firebase Authentication Service
 * Handles Firebase authentication operations
 */

import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const firebaseConfig = {
  apiKey: "AIzaSyAOC8S6aOGvfnUzp0Twb-7O727Un9FoUGE",
  authDomain: "internet-of-tsiken-690dd.firebaseapp.com",
  projectId: "internet-of-tsiken-690dd",
  storageBucket: "internet-of-tsiken-690dd.appspot.com",
  messagingSenderId: "296742448098",
  appId: "1:296742448098:web:8163021d84af262c6527bb",
  measurementId: "G-FEWSJPB1Z1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Sign up a new user
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} userData - Additional user data (name, phone, etc.)
 * @returns {Promise<object>} - { success: boolean, user: object, error: string }
 */
export const signUpUser = async (email, password, userData = {}) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Store additional user data in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      ...userData,
      createdAt: new Date(),
      emailVerified: false,
      otpVerified: false,
    });

    return { success: true, user, error: null };
  } catch (error) {
    console.error("Sign up error:", error);
    let errorMessage = "Failed to create account";

    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Email already in use";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak";
    }

    return { success: false, user: null, error: errorMessage };
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - { success: boolean, user: object, error: string }
 */
export const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Update last login time
    await updateDoc(doc(db, "users", user.uid), {
      lastLogin: new Date(),
    });

    return { success: true, user, error: null };
  } catch (error) {
    console.error("Sign in error:", error);
    let errorMessage = "Failed to sign in";

    if (error.code === "auth/user-not-found") {
      errorMessage = "User not found";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    } else if (error.code === "auth/user-disabled") {
      errorMessage = "User account has been disabled";
    }

    return { success: false, user: null, error: errorMessage };
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<object>} - { success: boolean, error: string }
 */
export const sendPasswordReset = async (email) => {
  try {
    // Check if user exists
    const userDoc = await getDoc(doc(db, "users", email.toLowerCase()));

    if (!userDoc.exists()) {
      // For security, we don't reveal if email exists or not
      return { success: true, error: null };
    }

    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error) {
    console.error("Password reset error:", error);
    let errorMessage = "Failed to send password reset email";

    if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email address";
    } else if (error.code === "auth/user-not-found") {
      // For security, don't reveal if user exists
      return { success: true, error: null };
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Verify password reset code
 * @param {string} code - Password reset code from email link
 * @returns {Promise<object>} - { success: boolean, email: string, error: string }
 */
export const verifyResetCode = async (code) => {
  try {
    const email = await verifyPasswordResetCode(auth, code);
    return { success: true, email, error: null };
  } catch (error) {
    console.error("Verify reset code error:", error);
    let errorMessage = "Invalid or expired password reset link";

    if (error.code === "auth/invalid-action-code") {
      errorMessage = "Password reset link is invalid or expired";
    } else if (error.code === "auth/expired-action-code") {
      errorMessage = "Password reset link has expired";
    }

    return { success: false, email: null, error: errorMessage };
  }
};

/**
 * Confirm password reset
 * @param {string} code - Password reset code from email link
 * @param {string} newPassword - New password
 * @returns {Promise<object>} - { success: boolean, error: string }
 */
export const confirmPasswordResetWithCode = async (code, newPassword) => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    return { success: true, error: null };
  } catch (error) {
    console.error("Confirm password reset error:", error);
    let errorMessage = "Failed to reset password";

    if (error.code === "auth/invalid-action-code") {
      errorMessage = "Password reset link is invalid";
    } else if (error.code === "auth/expired-action-code") {
      errorMessage = "Password reset link has expired";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "Password is too weak";
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * Get current user
 * @returns {object} - Current user or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Sign out user
 * @returns {Promise<object>} - { success: boolean, error: string }
 */
export const signOutUser = async () => {
  try {
    await auth.signOut();
    return { success: true, error: null };
  } catch (error) {
    console.error("Sign out error:", error);
    return { success: false, error: "Failed to sign out" };
  }
};

/**
 * Get user data from Firestore
 * @param {string} uid - User UID
 * @returns {Promise<object>} - User data or null
 */
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error("Get user data error:", error);
    return null;
  }
};

/**
 * Update user data in Firestore
 * @param {string} uid - User UID
 * @param {object} data - Data to update
 * @returns {Promise<object>} - { success: boolean, error: string }
 */
export const updateUserData = async (uid, data) => {
  try {
    await updateDoc(doc(db, "users", uid), data);
    return { success: true, error: null };
  } catch (error) {
    console.error("Update user data error:", error);
    return { success: false, error: "Failed to update user data" };
  }
};
