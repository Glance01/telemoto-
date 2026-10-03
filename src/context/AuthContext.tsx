import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, DriverProfile, UserRole } from '../types';
import { removeUndefinedFields } from '../utils/firestoreHelper';
import { getDistrictCoordinates, addCoordinateJitter } from '../lib/mozambiqueLocations';

export const ADMIN_EMAILS = [
  'brunomuhacha97@gmail.com',
  'brunomuhacha016@gmail.com',
];

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

interface StoredAccount {
  uid: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: UserRole;
  photoUrl?: string;
  createdAt: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  driverProfile: DriverProfile | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    pass: string,
    fullName: string,
    phone: string,
    role: UserRole,
    province?: string,
    district?: string,
    bairro?: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Helper to create a user-compatible session object when provider is restricted
const createLocalSessionUser = (uid: string, email: string, displayName?: string, phoneNumber?: string): User => {
  return {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    phoneNumber: phoneNumber || null,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => 'mock-token',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    providerId: 'password',
  } as unknown as User;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [role, setRole] = useState<UserRole>('passenger');
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async (currentUser: User) => {
    try {
      // 1. Fetch user doc from Firestore
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userDocRef);

      const userIsAdmin = isAdminEmail(currentUser.email);

      let effectiveProfile: UserProfile;
      let effectiveRole: UserRole = 'passenger';

      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        const photo = uData.photoUrl || (uData as any).photoURL || '';
        effectiveRole = userIsAdmin ? 'super_admin' : (uData.role || 'passenger');
        effectiveProfile = {
          ...uData,
          role: effectiveRole,
          photoUrl: photo || undefined,
          photoURL: photo || undefined,
        };

        if (userIsAdmin && uData.role !== 'super_admin') {
          await setDoc(userDocRef, { ...effectiveProfile, role: 'super_admin' }, { merge: true }).catch(() => {});
        }
      } else {
        // Fallback: check localStorage for saved profile
        let localAccounts: StoredAccount[] = [];
        try {
          localAccounts = JSON.parse(localStorage.getItem('telemoto_user_accounts') || '[]');
        } catch (e) {
          console.warn('Error parsing local accounts', e);
        }
        const matched = localAccounts.find(
          (a) =>
            a.uid === currentUser.uid ||
            a.email.toLowerCase() === currentUser.email?.toLowerCase()
        );

        effectiveRole = userIsAdmin
          ? 'super_admin'
          : (matched?.role || 'passenger');

        effectiveProfile = {
          id: currentUser.uid,
          fullName:
            matched?.fullName ||
            currentUser.displayName ||
            currentUser.email?.split('@')[0] ||
            (userIsAdmin ? 'Administrador Bruno' : 'Utilizador'),
          phone:
            matched?.phone ||
            currentUser.phoneNumber ||
            (userIsAdmin ? '+258 84 000 0000' : ''),
          email: currentUser.email || undefined,
          role: effectiveRole,
          photoUrl: matched?.photoUrl || undefined,
          createdAt: matched?.createdAt || Date.now(),
        };

        try {
          await setDoc(userDocRef, removeUndefinedFields(effectiveProfile));
        } catch (e) {
          console.warn('Could not write to Firestore users collection, using local profile', e);
        }
      }

      setUserProfile(effectiveProfile);
      setRole(effectiveRole);

      // 2. Fetch driver doc ONLY if the user is explicitly a driver
      if (effectiveRole === 'driver') {
        const driverDocRef = doc(db, 'drivers', currentUser.uid);
        let driverSnap = await getDoc(driverDocRef);
        let dData: DriverProfile | null = null;

        if (driverSnap.exists()) {
          dData = driverSnap.data() as DriverProfile;
        } else {
          // Provision initial driver doc if missing
          dData = {
            id: currentUser.uid,
            userId: currentUser.uid,
            fullName: effectiveProfile.fullName || currentUser.displayName || 'Condutor TeleMoto+',
            phone: effectiveProfile.phone || currentUser.phoneNumber || '',
            email: currentUser.email || '',
            idNumber: '',
            bikeBrand: '',
            bikeModel: '',
            bikeColor: '',
            plateNumber: '',
            province: effectiveProfile.province || 'Inhambane',
            city: effectiveProfile.city || 'Massinga',
            district: effectiveProfile.city || 'Massinga',
            zone: 'Bairro Central',
            bairro: 'Bairro Central',
            photoUrl: effectiveProfile.photoUrl || '',
            bikePhotoUrl: '',
            isOnline: false,
            status: 'approved',
            termsAccepted: true,
            rating: 5.0,
            totalRatingsCount: 0,
            totalRides: 0,
            profileCompleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          try {
            await setDoc(driverDocRef, removeUndefinedFields(dData), { merge: true });
          } catch (e) {
            console.warn('Could not auto-create driver document in Firestore:', e);
          }
        }

        if (dData) {
          if (dData.plateNumber === 'MM-88-88' || dData.plateNumber === 'MZ-00-00') {
            dData.plateNumber = '';
          }
          if (dData.idNumber === '110100483921B' || dData.idNumber === 'BI-PENDENTE') {
            dData.idNumber = '';
          }
          if (dData.bikeBrand === 'TVS' && !dData.profileCompleted) {
            dData.bikeBrand = '';
            dData.bikeModel = '';
            dData.bikeColor = '';
          }
          setDriverProfile(dData);
          localStorage.setItem(`telemoto_driver_${currentUser.uid}`, JSON.stringify(dData));
        }
      } else {
        // Explicitly clear driver state for passengers / admins
        setDriverProfile(null);
        localStorage.removeItem(`telemoto_driver_${currentUser.uid}`);
        if (currentUser.email) {
          localStorage.removeItem(`telemoto_driver_${currentUser.email.toLowerCase()}`);
        }
      }

      // Save session backup
      localStorage.setItem(
        'telemoto_current_user',
        JSON.stringify({
          uid: currentUser.uid,
          email: currentUser.email || effectiveProfile.email,
          displayName: effectiveProfile.fullName,
          phone: effectiveProfile.phone,
          profile: effectiveProfile,
        })
      );
    } catch (err) {
      console.warn('Notice when fetching user profiles:', err);
      // Fallback from localStorage
      const localCurrent = localStorage.getItem('telemoto_current_user');
      if (localCurrent) {
        try {
          const parsed = JSON.parse(localCurrent);
          if (parsed && parsed.profile) {
            setUserProfile(parsed.profile);
            setRole(parsed.profile.role || 'passenger');
          }
        } catch (e) {
          // ignore
        }
      }
      const localDriver = localStorage.getItem(`telemoto_driver_${currentUser.uid}`) ||
        (currentUser.email ? localStorage.getItem(`telemoto_driver_${currentUser.email.toLowerCase()}`) : null);
      if (localDriver) {
        try {
          const parsedDriver = JSON.parse(localDriver);
          setDriverProfile(parsedDriver);
          setRole('driver');
        } catch (e) {
          // ignore
        }
      }
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isSubscribed) return;

      if (currentUser) {
        setUser(currentUser);
        await fetchProfiles(currentUser);
        if (isSubscribed) setLoading(false);
      } else {
        // Check if there is an active local session stored
        const localCurrent = localStorage.getItem('telemoto_current_user');
        if (localCurrent) {
          try {
            const parsed = JSON.parse(localCurrent);
            if (parsed && parsed.uid && parsed.email) {
              const sessionUser = createLocalSessionUser(parsed.uid, parsed.email, parsed.displayName, parsed.phone);
              setUser(sessionUser);
              // Always fetch latest profiles from Firestore to ensure real-time status & roles
              await fetchProfiles(sessionUser);
              if (isSubscribed) setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error reading local session', e);
          }
        }

        setUser(null);
        setUserProfile(null);
        setDriverProfile(null);
        setRole('passenger');
        if (isSubscribed) setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Try Firebase Auth first
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await fetchProfiles(cred.user);
      return { success: true };
    } catch (error: any) {
      console.warn('Firebase signInWithEmailAndPassword response:', error.code || error.message);

      // 2. Fallback if provider is not allowed or failed in console
      if (
        error.code === 'auth/operation-not-allowed' ||
        error.code === 'auth/configuration-not-found' ||
        error.code === 'auth/network-request-failed' ||
        error.code === 'auth/internal-error'
      ) {
        let localAccounts: StoredAccount[] = [];
        try {
          localAccounts = JSON.parse(localStorage.getItem('telemoto_user_accounts') || '[]');
        } catch (e) {
          console.warn('Error parsing local accounts during login fallback', e);
        }

        const match = localAccounts.find(
          (acc) => acc.email.toLowerCase() === cleanEmail && acc.passwordHash === pass
        );

        if (match) {
          const sessionUser = createLocalSessionUser(match.uid, match.email, match.fullName, match.phone);

          const profile: UserProfile = {
            id: match.uid,
            fullName: match.fullName,
            phone: match.phone,
            email: match.email,
            role: match.role,
            photoUrl: match.photoUrl,
            createdAt: match.createdAt,
          };

          try {
            await setDoc(doc(db, 'users', match.uid), removeUndefinedFields(profile), { merge: true });
          } catch (e) {
            // ignore
          }

          localStorage.setItem(
            'telemoto_current_user',
            JSON.stringify({
              uid: match.uid,
              email: match.email,
              displayName: match.fullName,
              phone: match.phone,
              profile,
            })
          );

          setUser(sessionUser);
          setUserProfile(profile);
          setRole(match.role);
          await fetchProfiles(sessionUser);
          return { success: true };
        } else {
          return { success: false, error: 'Email ou palavra-passe incorretos.' };
        }
      }

      let message = 'Falha ao autenticar. Verifique os seus dados.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        message = 'Email ou palavra-passe incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Formato de email inválido.';
      }
      return { success: false, error: message };
    }
  };

  const register = async (
    email: string,
    pass: string,
    fullName: string,
    phone: string,
    selectedRole: UserRole,
    province?: string,
    district?: string,
    bairro?: string
  ) => {
    const cleanEmail = email.trim().toLowerCase();
    const isAdmin = isAdminEmail(cleanEmail);
    const effectiveRole: UserRole = isAdmin ? 'super_admin' : selectedRole;
    const prov = province || 'Inhambane';
    const dist = district || 'Massinga';
    const bai = bairro || 'Bairro Central';
    const initialCoords = addCoordinateJitter(getDistrictCoordinates(prov, dist));

    try {
      // 1. Try standard Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const newProfile: UserProfile = {
        id: cred.user.uid,
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        role: effectiveRole,
        province: prov,
        city: dist,
        createdAt: Date.now(),
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), removeUndefinedFields(newProfile));
      } catch (err) {
        console.warn('Error setting Firestore user profile:', err);
      }

      if (effectiveRole === 'driver') {
        const newDriver: DriverProfile = {
          id: cred.user.uid,
          userId: cred.user.uid,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          idNumber: '',
          bikeBrand: '',
          bikeModel: '',
          bikeColor: '',
          plateNumber: '',
          province: prov,
          city: dist,
          district: dist,
          zone: bai,
          bairro: bai,
          currentLat: initialCoords.lat,
          currentLng: initialCoords.lng,
          lastLocationUpdate: Date.now(),
          photoUrl: '',
          bikePhotoUrl: '',
          isOnline: true,
          status: 'approved',
          termsAccepted: true,
          rating: 5.0,
          totalRatingsCount: 0,
          totalRides: 0,
          profileCompleted: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        try {
          await setDoc(doc(db, 'drivers', cred.user.uid), removeUndefinedFields(newDriver));
          await setDoc(
            doc(db, 'tripLocations', cred.user.uid),
            {
              driverId: cred.user.uid,
              lat: initialCoords.lat,
              lng: initialCoords.lng,
              heading: 0,
              updatedAt: Date.now(),
            },
            { merge: true }
          );
          await updateDoc(doc(db, 'users', cred.user.uid), {
            role: 'driver',
            hasSubmittedDocuments: false,
          });
          setDriverProfile(newDriver);
        } catch (err) {
          console.warn('Error setting Firestore driver profile:', err);
        }
      }

      // Save to local registry for backup
      const localAccounts: StoredAccount[] = JSON.parse(
        localStorage.getItem('telemoto_user_accounts') || '[]'
      );
      localAccounts.push({
        uid: cred.user.uid,
        email: cleanEmail,
        passwordHash: pass,
        fullName: fullName.trim(),
        phone: phone.trim(),
        role: effectiveRole,
        createdAt: Date.now(),
      });
      localStorage.setItem('telemoto_user_accounts', JSON.stringify(localAccounts));

      setUser(cred.user);
      setUserProfile(newProfile);
      setRole(effectiveRole);
      return { success: true };
    } catch (error: any) {
      console.warn('Firebase createUserWithEmailAndPassword response:', error.code || error.message);

      // 2. Seamless fallback when Email/Password is not enabled in Firebase Console (auth/operation-not-allowed)
      if (
        error.code === 'auth/operation-not-allowed' ||
        error.code === 'auth/configuration-not-found' ||
        error.code === 'auth/admin-restricted-operation' ||
        error.code === 'auth/network-request-failed' ||
        error.code === 'auth/internal-error'
      ) {
        // Check if email already registered locally
        let localAccounts: StoredAccount[] = [];
        try {
          localAccounts = JSON.parse(localStorage.getItem('telemoto_user_accounts') || '[]');
        } catch (e) {
          console.warn('Error parsing local accounts during register fallback', e);
        }

        const existing = localAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
        if (existing) {
          return { success: false, error: 'Este email já está registado na plataforma.' };
        }

        // Try getting an anonymous auth UID or generate a persistent local unique ID
        let uid: string;
        let sessionUser: User;
        try {
          const anonCred = await signInAnonymously(auth);
          uid = anonCred.user.uid;
          sessionUser = anonCred.user;
        } catch (anonErr) {
          uid = 'mz_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          sessionUser = createLocalSessionUser(uid, cleanEmail, fullName.trim(), phone.trim());
        }

        const newProfile: UserProfile = {
          id: uid,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: cleanEmail,
          role: effectiveRole,
          province: prov,
          city: dist,
          createdAt: Date.now(),
        };

        // Write to Firestore (rules deployed allow write)
        try {
          await setDoc(doc(db, 'users', uid), removeUndefinedFields(newProfile));
        } catch (dbErr) {
          console.warn('Firestore write warning:', dbErr);
        }

        if (effectiveRole === 'driver') {
          const newDriver: DriverProfile = {
            id: uid,
            userId: uid,
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: cleanEmail,
            idNumber: '',
            bikeBrand: '',
            bikeModel: '',
            bikeColor: '',
            plateNumber: '',
            province: prov,
            city: dist,
            district: dist,
            zone: bai,
            bairro: bai,
            currentLat: initialCoords.lat,
            currentLng: initialCoords.lng,
            lastLocationUpdate: Date.now(),
            photoUrl: '',
            bikePhotoUrl: '',
            isOnline: true,
            status: 'approved',
            termsAccepted: true,
            rating: 5.0,
            totalRatingsCount: 0,
            totalRides: 0,
            profileCompleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          try {
            await setDoc(doc(db, 'drivers', uid), removeUndefinedFields(newDriver));
            await setDoc(
              doc(db, 'tripLocations', uid),
              {
                driverId: uid,
                lat: initialCoords.lat,
                lng: initialCoords.lng,
                heading: 0,
                updatedAt: Date.now(),
              },
              { merge: true }
            );
            await updateDoc(doc(db, 'users', uid), {
              role: 'driver',
              hasSubmittedDocuments: false,
            });
            setDriverProfile(newDriver);
          } catch (dbErr) {
            console.warn('Firestore driver write warning:', dbErr);
          }
        }

        // Save account into local storage registry
        localAccounts.push({
          uid,
          email: cleanEmail,
          passwordHash: pass,
          fullName: fullName.trim(),
          phone: phone.trim(),
          role: effectiveRole,
          createdAt: Date.now(),
        });
        localStorage.setItem('telemoto_user_accounts', JSON.stringify(localAccounts));

        localStorage.setItem(
          'telemoto_current_user',
          JSON.stringify({
            uid,
            email: cleanEmail,
            displayName: fullName.trim(),
            phone: phone.trim(),
            profile: newProfile,
          })
        );

        setUser(sessionUser);
        setUserProfile(newProfile);
        setRole(effectiveRole);
        return { success: true };
      }

      let message = 'Não foi possível concluir o registo. Tente novamente.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este email já está registado na plataforma.';
      } else if (error.code === 'auth/weak-password') {
        message = 'A palavra-passe deve ter pelo menos 6 caracteres.';
      }
      return { success: false, error: message };
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Utilizador não autenticado.' };

    try {
      const payload: any = { ...data };
      if (payload.photoURL && !payload.photoUrl) payload.photoUrl = payload.photoURL;
      if (payload.photoUrl && !payload.photoURL) payload.photoURL = payload.photoUrl;

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, removeUndefinedFields({ ...payload, updatedAt: Date.now() }), { merge: true });

      setUserProfile((prev) => (prev ? { ...prev, ...payload, updatedAt: Date.now() } : null));

      // Update StoredAccount registry
      let localAccounts: StoredAccount[] = [];
      try {
        localAccounts = JSON.parse(localStorage.getItem('telemoto_user_accounts') || '[]');
      } catch (e) {
        console.warn('Error parsing local accounts during update', e);
      }
      const accIndex = localAccounts.findIndex((a) => a.uid === user.uid || (user.email && a.email.toLowerCase() === user.email.toLowerCase()));
      if (accIndex >= 0) {
        if (payload.photoUrl) localAccounts[accIndex].photoUrl = payload.photoUrl;
        if (payload.fullName) localAccounts[accIndex].fullName = payload.fullName;
        if (payload.phone) localAccounts[accIndex].phone = payload.phone;
        localStorage.setItem('telemoto_user_accounts', JSON.stringify(localAccounts));
      }

      // Update local storage backup
      const localCurrent = localStorage.getItem('telemoto_current_user');
      if (localCurrent) {
        try {
          const parsed = JSON.parse(localCurrent);
          if (parsed && parsed.profile) {
            parsed.profile = { ...parsed.profile, ...payload };
            localStorage.setItem('telemoto_current_user', JSON.stringify(parsed));
          }
        } catch (e) {
          // ignore
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      return { success: false, error: err.message || 'Erro ao atualizar perfil.' };
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Nenhum utilizador com sessão ativa.' };

    const uid = user.uid;
    const userEmail = user.email?.toLowerCase();

    try {
      // 1. Delete user from Firestore
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (e) {
        console.warn('Could not delete user doc:', e);
      }

      // 2. Delete driver records (both by doc id and by matching userId / email / phone)
      try {
        await deleteDoc(doc(db, 'drivers', uid));
      } catch (e) {
        // ignore
      }

      try {
        const driversSnap = await getDocs(collection(db, 'drivers'));
        for (const d of driversSnap.docs) {
          const dData = d.data();
          if (
            d.id === uid ||
            dData.id === uid ||
            dData.userId === uid ||
            (userEmail && dData.email && dData.email.toLowerCase() === userEmail) ||
            (user.phoneNumber && dData.phone && dData.phone === user.phoneNumber)
          ) {
            await deleteDoc(doc(db, 'drivers', d.id));
          }
        }
      } catch (e) {
        console.warn('Could not sweep driver docs:', e);
      }

      try {
        await deleteDoc(doc(db, 'wallets', uid));
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        for (const w of walletsSnap.docs) {
          const wData = w.data();
          if (w.id === uid || wData.driverId === uid || wData.id === uid) {
            await deleteDoc(doc(db, 'wallets', w.id));
          }
        }
      } catch (e) {
        // ignore
      }

      try {
        await deleteDoc(doc(db, 'tripLocations', uid));
        await deleteDoc(doc(db, 'driverLocations', uid));
      } catch (e) {
        // ignore
      }

      // 3. Remove from localStorage registry
      try {
        let localAccounts: StoredAccount[] = [];
        try {
          localAccounts = JSON.parse(localStorage.getItem('telemoto_user_accounts') || '[]');
        } catch (e) {
          console.warn('Error parsing local accounts during delete', e);
        }
        const filtered = localAccounts.filter((a) => a.uid !== uid && a.email.toLowerCase() !== userEmail);
        localStorage.setItem('telemoto_user_accounts', JSON.stringify(filtered));
        localStorage.removeItem('telemoto_current_user');
      } catch (e) {
        // ignore
      }

      // 4. Try deleting from Firebase Auth if supported
      try {
        if (typeof user.delete === 'function') {
          await deleteUser(user);
        }
      } catch (e) {
        console.warn('Firebase user.delete notice:', e);
        try {
          await signOut(auth);
        } catch (sErr) {
          // ignore
        }
      }

      // 5. Reset app states
      setUser(null);
      setUserProfile(null);
      setDriverProfile(null);
      setRole('passenger');

      return { success: true };
    } catch (err: any) {
      console.error('Error deleting account:', err);
      return { success: false, error: err.message || 'Erro ao eliminar conta.' };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('telemoto_current_user');
    setUser(null);
    setUserProfile(null);
    setDriverProfile(null);
    setRole('passenger');
  };

  const refreshProfiles = async () => {
    if (user) {
      await fetchProfiles(user);
    }
  };

  const switchActiveRole = async (newRole: UserRole) => {
    setRole(newRole);
    setUserProfile((prev) => (prev ? { ...prev, role: newRole } : null));

    if (newRole === 'passenger') {
      setDriverProfile(null);
    }

    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { role: newRole });
      } catch (e) {
        console.warn('Could not update role in Firestore:', e);
      }

      if (newRole === 'driver') {
        const driverDocRef = doc(db, 'drivers', user.uid);
        const snap = await getDoc(driverDocRef);
        if (snap.exists()) {
          setDriverProfile(snap.data() as DriverProfile);
        } else if (userProfile) {
          const newD: DriverProfile = {
            id: user.uid,
            userId: user.uid,
            fullName: userProfile.fullName || 'Condutor TeleMoto+',
            phone: userProfile.phone || '',
            email: user.email || '',
            idNumber: '',
            bikeBrand: '',
            bikeModel: '',
            bikeColor: '',
            plateNumber: '',
            province: userProfile.province || 'Inhambane',
            city: userProfile.city || 'Massinga',
            district: userProfile.city || 'Massinga',
            zone: 'Bairro Central',
            bairro: 'Bairro Central',
            photoUrl: userProfile.photoUrl || '',
            bikePhotoUrl: '',
            isOnline: true,
            status: 'approved',
            termsAccepted: true,
            rating: 5.0,
            totalRatingsCount: 0,
            totalRides: 0,
            profileCompleted: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          try {
            await setDoc(driverDocRef, removeUndefinedFields(newD), { merge: true });
            setDriverProfile(newD);
          } catch (err) {
            // ignore
          }
        }
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        driverProfile,
        role,
        loading,
        login,
        register,
        updateUserProfile,
        deleteAccount,
        logout,
        refreshProfiles,
        switchActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
