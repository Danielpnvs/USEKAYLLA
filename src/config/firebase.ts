import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuração do Firebase
// IMPORTANTE: Substitua estas configurações pelas suas próprias do Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDkY4FPYiUhpgGYkcYzJJ1uUyQv0yEe9Vo",
  authDomain: "usekaylla.firebaseapp.com",
  projectId: "usekaylla",
  storageBucket: "usekaylla.firebasestorage.app",
  messagingSenderId: "948098617374",
  appId: "1:948098617374:web:261afe17a0f19cc660de0f"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar serviços
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
