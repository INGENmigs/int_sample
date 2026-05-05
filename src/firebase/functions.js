import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredConfigKeys = ["apiKey", "projectId", "appId"];

function getFirebaseConfig() {
  const missingKeys = requiredConfigKeys.filter((key) => !firebaseConfig[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missingKeys.join(", ")}`,
    );
  }

  return firebaseConfig;
}

const app = getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
const functionsRegion =
  import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1";
const functions = getFunctions(app, functionsRegion);
const emulatorHost = import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST;

if (
  import.meta.env.DEV &&
  emulatorHost &&
  !globalThis.__firebaseFunctionsEmulatorConnected
) {
  const [host, port] = emulatorHost.split(":");

  connectFunctionsEmulator(functions, host, Number(port));
  globalThis.__firebaseFunctionsEmulatorConnected = true;
}

function getCallableFunction(functionName, options) {
  return httpsCallable(functions, functionName, options);
}

async function callFunction(functionName, data, options) {
  const callable = getCallableFunction(functionName, options);
  const result = await callable(data);

  return result.data;
}

export { app, callFunction, functions, getCallableFunction, httpsCallable };
