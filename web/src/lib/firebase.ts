import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  projectId: "demo-nex",
  apiKey: "demo-api-key",
  authDomain: "demo-nex.firebaseapp.com",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Connect to emulators
// D1: Emulator only, strictly local
const EMULATOR_HOST = window.location.hostname || "127.0.0.1";

connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
