/**
 * Google Authentication & Token Management Service
 * Using official client-side authentication with Workspace integration scopes
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

export interface GoogleUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

const STORAGE_KEY_TOKEN = 'masterit_g_access_token';
const STORAGE_KEY_USER = 'masterit_g_user';

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  } catch {
    return null;
  }
})();

let currentGoogleUser: GoogleUser | null = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
})();

export type AuthCallback = (user: GoogleUser | null, token: string | null) => void;
const listeners = new Set<AuthCallback>();

const notifyListeners = () => {
  listeners.forEach((cb) => {
    try {
      cb(currentGoogleUser, cachedAccessToken);
    } catch (e) {
      console.error('Auth listener error:', e);
    }
  });
};

export const initGoogleAuth = (callback?: AuthCallback) => {
  if (callback) listeners.add(callback);

  // Initial notification with restored cache
  if (cachedAccessToken || currentGoogleUser) {
    notifyListeners();
  }

  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      currentGoogleUser = {
        uid: user.uid,
        displayName: user.displayName || user.email || 'Google User',
        email: user.email,
        photoURL: user.photoURL,
      };
      try {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentGoogleUser));
      } catch (e) {
        console.error(e);
      }
    } else {
      // Don't immediately wipe if we have a valid cached token unless explicitly signed out
      if (!cachedAccessToken) {
        currentGoogleUser = null;
        try {
          localStorage.removeItem(STORAGE_KEY_USER);
        } catch (e) {
          console.error(e);
        }
      }
    }
    notifyListeners();
  });
};

export const subscribeGoogleAuth = (callback: AuthCallback) => {
  listeners.add(callback);
  callback(currentGoogleUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

export const googleSignIn = async (): Promise<{
  user: GoogleUser;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google OAuth access token');
    }

    cachedAccessToken = credential.accessToken;
    currentGoogleUser = {
      uid: result.user.uid,
      displayName: result.user.displayName || result.user.email || 'Google User',
      email: result.user.email,
      photoURL: result.user.photoURL,
    };

    try {
      localStorage.setItem(STORAGE_KEY_TOKEN, cachedAccessToken);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentGoogleUser));
    } catch (e) {
      console.error('Failed to cache token to localStorage', e);
    }

    notifyListeners();

    return { user: currentGoogleUser, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      String(error?.message || '').includes('popup-closed-by-user')
    ) {
      console.warn('Google sign-in popup dismissed by user.');
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const stored = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (stored) {
      cachedAccessToken = stored;
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
};

export const getGoogleUser = (): GoogleUser | null => {
  return currentGoogleUser;
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  currentGoogleUser = null;
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
  } catch (e) {
    console.error(e);
  }
  notifyListeners();
};
