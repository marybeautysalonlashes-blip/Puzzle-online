import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer, setLogLevel } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Force long polling for environments that might block WebSockets
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if(error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      console.warn("Firestore connection transiently unavailable, using offline mode or retrying long-polling.");
    } else if (error?.code === 'permission-denied') {
      // Expected, means backend is reachable
    } else {
      console.error("Firestore test connection error:", error);
    }
  }
}
testConnection();
