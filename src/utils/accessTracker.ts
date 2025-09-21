// Sistema de rastreamento de acessos no Firebase
// Registra e busca informações de último acesso dos usuários

import { useState } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Interface para dados de acesso
export interface AccessData {
  userId: string;
  userName: string;
  userRole: 'admin' | 'user' | 'viewer';
  lastAccess: Date;
  device: 'desktop' | 'mobile' | 'tablet';
  ip?: string;
  userAgent?: string;
}

// Detectar tipo de dispositivo
function detectDevice(): 'desktop' | 'mobile' | 'tablet' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/tablet|ipad|playbook|silk/.test(userAgent)) {
    return 'tablet';
  }
  
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/.test(userAgent)) {
    return 'mobile';
  }
  
  return 'desktop';
}

// Obter IP do usuário (simplificado)
async function getUserIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch {
    return 'unknown';
  }
}

// Registrar login no Firebase
export async function registerLogin(userData: {
  id: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
  email: string;
}): Promise<boolean> {
  try {
    console.log('🔐 registerLogin: Registrando acesso no Firebase', userData);
    
    const accessData: AccessData = {
      userId: userData.id,
      userName: userData.name,
      userRole: userData.role,
      lastAccess: new Date(),
      device: detectDevice(),
      ip: await getUserIP(),
      userAgent: navigator.userAgent
    };

    // Salvar no Firebase
    const accessRef = doc(db, 'userAccess', userData.id);
    await setDoc(accessRef, {
      ...accessData,
      lastAccess: Timestamp.fromDate(accessData.lastAccess)
    }, { merge: true });

    // Também atualizar o documento do usuário com último acesso
    const userRef = doc(db, 'users', userData.id);
    await updateDoc(userRef, {
      lastAccess: Timestamp.fromDate(accessData.lastAccess),
      lastDevice: accessData.device,
      lastIP: accessData.ip
    });

    console.log('✅ registerLogin: Acesso registrado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ registerLogin: Erro ao registrar acesso:', error);
    return false;
  }
}

// Buscar dados de acesso de um usuário específico
export async function getUserAccessData(userId: string): Promise<AccessData | null> {
  try {
    const accessRef = doc(db, 'userAccess', userId);
    const accessSnap = await getDoc(accessRef);
    
    if (accessSnap.exists()) {
      const data = accessSnap.data();
      return {
        ...data,
        lastAccess: data.lastAccess?.toDate() || new Date()
      } as AccessData;
    }
    
    return null;
  } catch (error) {
    console.error('❌ getUserAccessData: Erro ao buscar dados de acesso:', error);
    return null;
  }
}

// Buscar dados de acesso de todos os usuários (para admin)
export async function getAllUsersAccessData(): Promise<{
  user: AccessData | null;
  viewer: AccessData | null;
  admin: AccessData | null;
}> {
  try {
    console.log('🔍 getAllUsersAccessData: Buscando dados de acesso de todos os usuários');
    
    // Buscar dados de cada tipo de usuário
    const [userData, viewerData, adminData] = await Promise.all([
      getUserAccessData('user'),
      getUserAccessData('viewer'), 
      getUserAccessData('admin')
    ]);

    console.log('📊 getAllUsersAccessData: Dados encontrados:', {
      user: userData ? 'Sim' : 'Não',
      viewer: viewerData ? 'Sim' : 'Não', 
      admin: adminData ? 'Sim' : 'Não'
    });

    return {
      user: userData,
      viewer: viewerData,
      admin: adminData
    };
  } catch (error) {
    console.error('❌ getAllUsersAccessData: Erro ao buscar dados:', error);
    return {
      user: null,
      viewer: null,
      admin: null
    };
  }
}

// Formatar data para exibição
export function formatAccessDate(date: Date | null): string {
  if (!date) return 'Nunca acessou';
  
  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })}`;
}

// Hook para gerenciar dados de acesso
export function useAccessData() {
  const [accessData, setAccessData] = useState<{
    user: AccessData | null;
    viewer: AccessData | null;
    admin: AccessData | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAccessData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getAllUsersAccessData();
      setAccessData(data);
    } catch (err) {
      console.error('Erro ao carregar dados de acesso:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  return {
    accessData,
    loading,
    error,
    loadAccessData
  };
}
