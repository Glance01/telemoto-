import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey || 'AIzaSyBk0lQdro8jgpv7bs9S26pLJoB71b9jxeE',
  authDomain: firebaseConfigJson.authDomain || 'magnificent-bedrock-2thv3.firebaseapp.com',
  projectId: firebaseConfigJson.projectId || 'magnificent-bedrock-2thv3',
  storageBucket: firebaseConfigJson.storageBucket || 'magnificent-bedrock-2thv3.firebasestorage.app',
  messagingSenderId: firebaseConfigJson.messagingSenderId || '1022232390558',
  appId: firebaseConfigJson.appId || '1:1022232390558:web:125cdecfeb6ddb2eaec48f',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use provisioned Firestore Database ID from firebase-applet-config.json
const databaseId = firebaseConfigJson.firestoreDatabaseId || 'ai-studio-0de0d8f6-b9d1-4d1c-8bd2-2cbdeb8ffef4';

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalForceLongPolling: true,
    },
    databaseId
  );
} catch {
  try {
    firestoreInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      databaseId
    );
  } catch {
    firestoreInstance = getFirestore(app, databaseId);
  }
}

export const db = firestoreInstance;

export default app;
