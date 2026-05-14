import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAI,
  getGenerativeModel,
  getTemplateGenerativeModel,
  GoogleAIBackend,
} from "firebase/ai";

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

const app =
  getApps().length > 0 ? getApp() : initializeApp(getFirebaseConfig());
const db = getFirestore(app);

const ai = getAI(app, {
  backend: new GoogleAIBackend(),
});

const geminiModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
});

const templateGenerativeModel = getTemplateGenerativeModel(ai);

export { app, db, ai, geminiModel, templateGenerativeModel };
