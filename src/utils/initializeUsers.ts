import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

// Usuários padrão do sistema
const DEFAULT_USERS = [
  {
    email: 'admin@usekaylla.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin'
  },
  {
    email: 'user@usekaylla.com',
    password: 'user123',
    name: 'kayla',
    role: 'user'
  },
  {
    email: 'test@usekaylla.com',
    password: 'test123',
    name: 'test',
    role: 'viewer'
  }
];

// Função para inicializar usuários no Firebase
export const initializeUsers = async () => {
  try {
    console.log('Inicializando usuários no Firebase...');
    
    // Verificar se já existem usuários
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const existingUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log('Usuários existentes no Firebase:', existingUsers.length, 'usuários');
    
    // Sempre garantir que os usuários padrão existam (criar ou atualizar)
    for (const user of DEFAULT_USERS) {
      const existingUser = existingUsers.find(u => u.email === user.email);
      
      if (existingUser) {
        console.log(`Usuário já existe: ${user.name}`);
        // Opcional: atualizar senha se necessário
        // await updateDoc(doc(db, 'users', existingUser.id), { password: user.password });
      } else {
        console.log(`Criando usuário: ${user.name}`);
        await addDoc(collection(db, 'users'), {
          ...user,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    console.log('Usuários inicializados com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar usuários:', error);
  }
};

// Função para verificar se um usuário existe
export const checkUserExists = async (email: string) => {
  try {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Erro ao verificar usuário:', error);
    return false;
  }
};
