import { useState, useEffect } from 'react';
import { User, LogIn, LogOut, Settings, Shield, Mail, Eye, EyeOff, X } from 'lucide-react';
// Quick action icons
import { Edit3, KeyRound, Download } from 'lucide-react';
import { useUsers } from '../hooks/useFirestore';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: Date;
  lastLogin: Date;
}

interface UserCredentials {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user' | 'viewer';
}

// Usuários do sistema
const USERS: UserCredentials[] = [
  {
    email: 'admin@usekaylla.com',
    password: 'admin123',
    name: 'Administrador',
    role: 'admin'
  },
  {
    email: 'usuario@usekaylla.com',
    password: 'user123',
    name: 'Usuário',
    role: 'user'
  },
  {
    email: 'visualizador@usekaylla.com',
    password: 'view123',
    name: 'Visualizador',
    role: 'viewer'
  }
];

interface AccountProps {
  onLogin?: (user: UserProfile) => void;
  onLogout?: () => void;
  isLoggedIn?: boolean;
  currentUser?: UserProfile | null;
}

export default function Account({ onLogin, onLogout, isLoggedIn: propIsLoggedIn, currentUser: propCurrentUser }: AccountProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(propIsLoggedIn || false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(propCurrentUser || null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showEditSelf, setShowEditSelf] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [userEditForm, setUserEditForm] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [selfEditForm, setSelfEditForm] = useState({
    name: '',
    email: ''
  });
  const [loginError, setLoginError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  
  // Estados para feedback de sucesso
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'name' | 'password'>('name');
  
  // Estados para feedback de erro
  const [showError, setShowError] = useState(false);
  const [errorType, setErrorType] = useState<'password_incorrect' | 'passwords_dont_match'>('password_incorrect');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showViewerPassword, setShowViewerPassword] = useState(false);

  // Hook para gerenciar usuários no Firebase
  const { updateUser, createUser, getUserByEmail } = useUsers();

  // Utilidades de credenciais persistidas (por email)
  const readCredentials = (): Record<string, string> => {
    try {
      const raw = localStorage.getItem('usekaylla_credentials');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeCredentials = (creds: Record<string, string>) => {
    localStorage.setItem('usekaylla_credentials', JSON.stringify(creds));
  };

  // Sistema de login real
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      // Permitir login por usuário simples (ex.: "admin") ou email completo
      const rawLogin = (loginForm.email || '').trim().toLowerCase();
      const loginEmail = rawLogin.includes('@') ? rawLogin : `${rawLogin}@usekaylla.com`;
      
      // Primeiro, tentar buscar no Firebase
      let firebaseUser = await getUserByEmail(loginEmail);
      
      // Se não encontrar no Firebase, buscar no array USERS local
      let baseUser = USERS.find(u => 
        u.email.toLowerCase() === loginEmail || 
        (u.role === 'user' && u.name.toLowerCase().replace(/\s+/g, '') === rawLogin)
      );
      
      // Se encontrou no Firebase, usar dados do Firebase
      if (firebaseUser) {
        baseUser = {
          email: firebaseUser.email,
          name: firebaseUser.name,
          role: firebaseUser.role,
          password: firebaseUser.password
        };
      }
      
      const creds = readCredentials();
      const effectivePassword = creds[loginEmail] ?? baseUser?.password;
      const isValid = !!baseUser && effectivePassword === loginForm.password;
      
      if (isValid && baseUser) {
        const userProfile: UserProfile = {
          id: baseUser.email,
          name: baseUser.name,
          email: baseUser.email,
          role: baseUser.role,
          createdAt: new Date('2025-09-06'), // Data corrigida
          lastLogin: new Date()
        };
        
        setCurrentUser(userProfile);
      setIsLoggedIn(true);
      setLoginForm({ email: '', password: '' });
        
        // Salvar no localStorage
        localStorage.setItem('usekaylla_user', JSON.stringify(userProfile));
        
        // Salvar último acesso por perfil
        if (baseUser.role === 'user') {
          localStorage.setItem('usekaylla_user_last_login', new Date().toISOString());
        } else if (baseUser.role === 'viewer') {
          localStorage.setItem('usekaylla_viewer_last_login', new Date().toISOString());
        }
        
        // Notificar componente pai
        if (onLogin) {
          onLogin(userProfile);
        }
      } else {
        setLoginError('Login ou senha incorretos!');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      setLoginError('Erro ao fazer login. Tente novamente.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('usekaylla_user');
    
    // Notificar componente pai
    if (onLogout) {
      onLogout();
    }
  };

  // Recuperação de senha removida por solicitação

  // Funções para editar próprias informações
  const handleEditSelf = () => {
    if (currentUser) {
      setSelfEditForm({
        name: currentUser.name,
        email: '' // Não usar email no formulário
      });
      setShowEditSelf(true);
    }
  };

  const handleSaveSelfEdit = async () => {
    if (selfEditForm.name) {
      try {
        // Para usuário, criar novo email baseado no nome
        const newEmail = currentUser?.role === 'user' 
          ? `${selfEditForm.name.toLowerCase().replace(/\s+/g, '')}@usekaylla.com`
          : (currentUser?.email || '');
        
        // Buscar usuário no Firebase
        const firebaseUser = await getUserByEmail(currentUser?.email || '');
        
        if (firebaseUser) {
          // Atualizar no Firebase
          await updateUser(firebaseUser.id, {
            name: selfEditForm.name,
            email: newEmail
          });
        } else {
          // Criar usuário no Firebase se não existir
          await createUser({
            name: selfEditForm.name,
            email: newEmail,
            role: currentUser?.role,
            password: currentUser?.role === 'user' ? 'user123' : 'admin123'
          });
        }
        
        // Atualizar usuário atual no array USERS (para compatibilidade)
        const userIndex = USERS.findIndex(u => u.email === currentUser?.email);
        if (userIndex !== -1) {
          USERS[userIndex] = {
            ...USERS[userIndex],
            name: selfEditForm.name,
            email: newEmail
          };
        }
        
        // Atualizar usuário atual
        const updatedUser: UserProfile = {
          ...currentUser!,
          name: selfEditForm.name,
          email: newEmail
        };
        setCurrentUser(updatedUser);
        
        // Salvar no localStorage
        localStorage.setItem('usekaylla_user', JSON.stringify(updatedUser));
        
        // Se for um usuário normal, atualizar dados visíveis ao admin preservando a senha atual
        if (currentUser?.role === 'user') {
          const existing = localStorage.getItem('usekaylla_user_data');
          let preservedPassword = '';
          if (existing) {
            try {
              preservedPassword = JSON.parse(existing)?.password || '';
            } catch {}
          }
          if (!preservedPassword) {
            preservedPassword = USERS.find(u => u.role === 'user')?.password || '';
          }
          localStorage.setItem('usekaylla_user_data', JSON.stringify({
            name: selfEditForm.name,
            email: newEmail, // Usar novo email se for usuário
            password: preservedPassword,
            role: currentUser?.role
          }));
        }
        
        // Mostrar feedback de sucesso
        setSuccessType('name');
        setShowSuccess(true);
        
        // Fechar modal de edição
        setShowEditSelf(false);
        setSelfEditForm({ name: '', email: '' });
      } catch (error) {
        console.error('Erro ao salvar alterações:', error);
        alert('Erro ao salvar alterações. Tente novamente.');
      }
    } else {
      alert('Preencha todos os campos!');
    }
  };

  // Funções para Admin editar usuário
  const handleEditUser = () => {
    // Buscar dados atualizados do usuário
    const userData = localStorage.getItem('usekaylla_user_data');
    if (userData) {
      const parsed = JSON.parse(userData);
      setUserEditForm({
        name: parsed.name,
        email: parsed.email,
        password: parsed.password
      });
    } else {
      // Fallback para dados originais
      const userUser = USERS.find(u => u.role === 'user');
      if (userUser) {
        setUserEditForm({
          name: userUser.name,
          email: userUser.email,
          password: userUser.password
        });
      }
    }
    setShowEditUser(true);
  };

  const handleSaveUserEdit = () => {
    if (userEditForm.name && userEditForm.email && userEditForm.password) {
      // Atualizar usuário no array USERS (simulação)
      const userIndex = USERS.findIndex(u => u.role === 'user');
      if (userIndex !== -1) {
        USERS[userIndex] = {
          ...USERS[userIndex],
          name: userEditForm.name,
          email: userEditForm.email,
          password: userEditForm.password
        };
      }
      
      // Atualizar dados no localStorage para sincronização
      localStorage.setItem('usekaylla_user_data', JSON.stringify({
        name: userEditForm.name,
        email: userEditForm.email,
        password: userEditForm.password,
        role: 'user'
      }));
      
      alert('Usuário atualizado com sucesso!');
      setShowEditUser(false);
      setUserEditForm({ name: '', email: '', password: '' });
    } else {
      alert('Preencha todos os campos!');
    }
  };

  // Funções para ações rápidas
  const handleChangePassword = async () => {
    if (!currentUser) {
      alert('É necessário estar logado para alterar a senha.');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Preencha todos os campos de senha.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorType('passwords_dont_match');
      setShowError(true);
      return;
    }

    try {
      const baseUser = USERS.find(u => u.email === currentUser.email);
      const creds = readCredentials();
      const effectivePassword = creds[currentUser.email] ?? baseUser?.password ?? '';
      if (currentPassword !== effectivePassword) {
        setErrorType('password_incorrect');
        setShowError(true);
        return;
      }

      // Buscar usuário no Firebase
      const firebaseUser = await getUserByEmail(currentUser.email);
      
      if (firebaseUser) {
        // Atualizar senha no Firebase
        await updateUser(firebaseUser.id, {
          password: newPassword
        });
      } else {
        // Criar usuário no Firebase se não existir
        await createUser({
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          password: newPassword
        });
      }

      // Persistir nova senha para este email
      const updated = { ...creds, [currentUser.email]: newPassword };
      writeCredentials(updated);

      // Se for o usuário padrão do sistema, manter sincronizado para o admin visualizar
      if (currentUser.role === 'user') {
        const existing = localStorage.getItem('usekaylla_user_data');
        let payload: any = existing ? (() => { try { return JSON.parse(existing); } catch { return {}; } })() : {};
        payload = {
          name: payload.name ?? baseUser?.name ?? currentUser.name,
          email: payload.email ?? currentUser.email,
          password: newPassword,
          role: 'user'
        };
        localStorage.setItem('usekaylla_user_data', JSON.stringify(payload));
      }

      // Mostrar feedback de sucesso
      setSuccessType('password');
      setShowSuccess(true);
      
      // Fechar modal e limpar formulário
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      alert('Erro ao alterar senha. Tente novamente.');
    }
  };

  const handleExportData = () => {
    const data = {
      user: currentUser,
      exportDate: new Date().toISOString(),
      version: '1.0',
      note: 'Dados exportados do sistema USEKAYLLA'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usekaylla-dados-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Sincronizar com props do componente pai
  useEffect(() => {
    if (propIsLoggedIn !== undefined) {
      setIsLoggedIn(propIsLoggedIn);
    }
    if (propCurrentUser !== undefined) {
      setCurrentUser(propCurrentUser);
    }
    // Carregar preferência de som
    try {
      const pref = localStorage.getItem('usekaylla_sound_enabled');
      if (pref !== null) {
        setSoundEnabled(pref === 'true');
      }
    } catch {}
  }, [propIsLoggedIn, propCurrentUser]);

  // Carregar usuário do localStorage (apenas se não vier via props)
  useEffect(() => {
    if (!propIsLoggedIn && !propCurrentUser) {
      const savedUser = localStorage.getItem('usekaylla_user');
      if (savedUser) {
        try {
          const userProfile = JSON.parse(savedUser);
          // Converter strings de data de volta para Date
          userProfile.createdAt = new Date(userProfile.createdAt);
          userProfile.lastLogin = new Date(userProfile.lastLogin);
          setCurrentUser(userProfile);
          setIsLoggedIn(true);
        } catch (error) {
          console.error('Erro ao carregar usuário:', error);
          localStorage.removeItem('usekaylla_user');
        }
      }
    }
  }, [propIsLoggedIn, propCurrentUser]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg mr-3">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Conta</h2>
                  <p className="text-sm text-gray-600">Faça login para acessar sua conta</p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
              <div className="text-center mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <LogIn className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Bem-vindo de volta!</h3>
                <p className="text-gray-600">Faça login para acessar sua conta</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Login</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="Login"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full pl-10 pr-12 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Entrar
                </button>
              </form>

              {/* Link "Esqueci minha senha" removido por solicitação */}

              {loginError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{loginError}</p>
              </div>
              )}

              
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg mr-3">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Conta</h2>
                <p className="text-sm text-gray-600">Gerenciar perfil e configurações</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200 flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </button>
          </div>
        </div>

        {/* Account Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Stats */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-lg mr-3">
                  <Shield className="h-5 w-5 text-white" />
                  </div>
                <h3 className="text-lg font-semibold text-gray-900">Status da Conta</h3>
                </div>
              <div className="space-y-3">
                {currentUser?.role === 'admin' ? (
                  // Interface para Administrador
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Usuário Atual</span>
                      <span className="text-sm font-medium text-gray-900">
                        {currentUser?.name}
                      </span>
              </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tipo de Acesso</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        Administrador
                      </span>
                    </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Ativa
                  </span>
                    </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Último Login</span>
                  <span className="text-sm font-medium text-gray-900">
                        {currentUser?.lastLogin.toLocaleDateString('pt-BR')} às {currentUser?.lastLogin.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Membro desde</span>
                  <span className="text-sm font-medium text-gray-900">
                        {currentUser?.createdAt.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="border-t pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Usuário do Sistema</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const userData = localStorage.getItem('usekaylla_user_data');
                            if (userData) {
                              const parsed = JSON.parse(userData);
                              return parsed.name;
                            }
                            return USERS.find(u => u.role === 'user')?.name;
                          })()}
                        </span>
                    </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Email do Usuário</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const userData = localStorage.getItem('usekaylla_user_data');
                            if (userData) {
                              const parsed = JSON.parse(userData);
                              return parsed.email;
                            }
                            return USERS.find(u => u.role === 'user')?.email;
                          })()}
                        </span>
                  </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Senha do Usuário</span>
                        <span className="text-sm font-medium text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
                          {showUserPassword ? (
                            (() => {
                              const userData = localStorage.getItem('usekaylla_user_data');
                              if (userData) {
                                const parsed = JSON.parse(userData);
                                return parsed.password;
                              }
                              return USERS.find(u => u.role === 'user')?.password;
                            })()
                          ) : (
                            '••••••••'
                          )}
                    <button
                            type="button"
                            onClick={() => setShowUserPassword(p => !p)}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Mostrar senha do usuário"
                          >
                            {showUserPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Último Acesso do Usuário</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const userLastLogin = localStorage.getItem('usekaylla_user_last_login');
                            if (userLastLogin) {
                              const lastLogin = new Date(userLastLogin);
                              return `${lastLogin.toLocaleDateString('pt-BR')} às ${lastLogin.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            }
                            return 'Nunca acessou';
                          })()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Senha do Visualizador</span>
                        <span className="text-sm font-medium text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded flex items-center gap-2">
                          {showViewerPassword ? (
                            (() => USERS.find(u => u.role === 'viewer')?.password)() || ''
                          ) : (
                            '••••••••'
                          )}
                    <button
                            type="button"
                            onClick={() => setShowViewerPassword(p => !p)}
                            className="text-gray-500 hover:text-gray-700"
                            aria-label="Mostrar senha do visualizador"
                          >
                            {showViewerPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                        </span>
                  </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Último Acesso do Visualizador</span>
                        <span className="text-sm font-medium text-gray-900">
                          {(() => {
                            const viewerLastLogin = localStorage.getItem('usekaylla_viewer_last_login');
                            if (viewerLastLogin) {
                              const lastLogin = new Date(viewerLastLogin);
                              return `${lastLogin.toLocaleDateString('pt-BR')} às ${lastLogin.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                            }
                            return 'Nunca acessou';
                          })()}
                  </span>
                </div>
                      </div>
                  </>
                ) : currentUser?.role === 'viewer' ? (
                  // Interface para Visualizador
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Usuário</span>
                      <span className="text-sm font-medium text-gray-900">
                        {currentUser?.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tipo de Acesso</span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        Visualizador
                      </span>
                      </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Status</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Visualização
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Modo Visualização:</strong> Você pode visualizar todas as funcionalidades, mas não pode editar valores ou fazer alterações.
                      </p>
                      </div>
                    
                    {/* Dados Simulados para Demonstração */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Dados de Demonstração
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Faturamento Total:</span>
                          <span className="font-medium text-blue-900">R$ 1.373,20</span>
                    </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Peças Cadastradas:</span>
                          <span className="font-medium text-blue-900">5 itens</span>
                      </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Vendas Realizadas:</span>
                          <span className="font-medium text-blue-900">10 vendas</span>
                    </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Lucro Real:</span>
                          <span className="font-medium text-green-600">R$ 894,08</span>
                  </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Ticket Médio:</span>
                          <span className="font-medium text-blue-900">R$ 137,32</span>
                    </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Estoque Total:</span>
                          <span className="font-medium text-blue-900">119 peças</span>
                  </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Peças Vendidas:</span>
                          <span className="font-medium text-blue-900">35 peças</span>
                </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Produto Mais Vendido:</span>
                          <span className="font-medium text-blue-900">Camiseta Básica</span>
            </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Margem de Lucro:</span>
                          <span className="font-medium text-green-600">65,2%</span>
          </div>
                </div>
                      <div className="mt-3 pt-2 border-t border-blue-200">
                        <p className="text-xs text-blue-600">
                          💡 Estes são dados simulados para demonstração. Em uma conta real, você veria os dados reais do sistema.
                        </p>
              </div>
                    </div>
                  </>
                ) : (
                  // Interface para Usuário
                  <>
                <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Usuário</span>
                      <span className="text-sm font-medium text-gray-900">
                        {currentUser?.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tipo de Acesso</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Usuário
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Ativa
                  </span>
                </div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Ações Rápidas</h3>
              </div>
              <div className="space-y-3">
                {/* Preferência: Ativar som */}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Ativar som</p>
                    <p className="text-xs text-gray-500">Tocar sons em ações do sistema</p>
                  </div>
                  <button
                    aria-pressed={soundEnabled}
                    onClick={() => {
                      const next = !soundEnabled;
                      setSoundEnabled(next);
                      localStorage.setItem('usekaylla_sound_enabled', String(next));
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${soundEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                    type="button"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                </div>
                {currentUser?.role === 'user' ? (
                  <button 
                    onClick={handleEditSelf}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                  >
                    <Edit3 className="h-4 w-4 mr-2 text-gray-500" />
                    Editar Nome de Usuário
                  </button>
                ) : (
                  <button 
                    onClick={handleEditSelf}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                  >
                    <Edit3 className="h-4 w-4 mr-2 text-gray-500" />
                    Editar Minhas Informações
                  </button>
                )}
                <button 
                  onClick={() => setShowChangePassword(true)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                >
                  <KeyRound className="h-4 w-4 mr-2 text-gray-500" />
                  Alterar Senha
                </button>
                {currentUser?.role === 'admin' && (
                <button 
                    onClick={handleEditUser}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                >
                    <Edit3 className="h-4 w-4 mr-2 text-gray-500" />
                    Editar Usuário do Sistema
                </button>
                )}
                <button 
                  onClick={() => setShowPrivacy(true)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                >
                  <Shield className="h-4 w-4 mr-2 text-gray-500" />
                  Privacidade e Segurança
                </button>
                <button 
                  onClick={handleExportData}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center"
                >
                  <Download className="h-4 w-4 mr-2 text-gray-500" />
                  Exportar Dados
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Alterar Senha */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Alterar Senha</h3>
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Senha Atual</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nova Senha</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowChangePassword(false)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleChangePassword}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                  >
                    Alterar Senha
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Próprias Informações */}
        {showEditSelf && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    {currentUser?.role === 'user' ? 'Editar Nome de Usuário' : 'Editar Minhas Informações'}
                  </h3>
                  <button
                    onClick={() => setShowEditSelf(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input
                    type="text"
                    value={selfEditForm.name}
                    onChange={(e) => setSelfEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditSelf(false)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveSelfEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Usuário (apenas para Admin) */}
        {showEditUser && currentUser?.role === 'admin' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Editar Usuário</h3>
                  <button
                    onClick={() => setShowEditUser(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                  <input
                    type="text"
                    value={userEditForm.name}
                    onChange={(e) => setUserEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={userEditForm.email}
                    onChange={(e) => setUserEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Senha (Visível para Admin)</label>
                  <input
                    type="text"
                    value={userEditForm.password}
                    onChange={(e) => setUserEditForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Senha visível para administrador"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ Como administrador, você pode ver e alterar a senha do usuário
                  </p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowEditUser(false)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveUserEdit}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Notificações removido - não necessário para uso pessoal */}

        {/* Modal Privacidade e Segurança */}
        {showPrivacy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Privacidade e Segurança</h3>
                  <button
                    onClick={() => setShowPrivacy(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">✅ Sistema Seguro</h4>
                  <p className="text-sm text-green-700">Dados armazenados localmente no navegador com Firebase Firestore. Acesso protegido por login.</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">🔒 Dados Privados</h4>
                  <p className="text-sm text-blue-700">Seus dados de negócio são mantidos privados. Apenas você tem acesso com suas credenciais.</p>
                </div>
                {/* Seção 'Dois Usuários' removida conforme solicitado */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">⚠️ Backup Recomendado</h4>
                  <p className="text-sm text-yellow-700">Use "Exportar Dados" regularmente para backup. Dados ficam no navegador e Firebase.</p>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowPrivacy(false)}
                    className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Feedback de Sucesso */}
        {showSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 text-center">
              <div className="text-6xl mb-4">
                {successType === 'name' ? '🎉' : '🔐'}
              </div>
              <h3 className="text-2xl font-bold text-green-600 mb-2">
                {successType === 'name' ? 'Nome Atualizado!' : 'Senha Alterada!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {successType === 'name' 
                  ? 'Seu nome de usuário foi atualizado com sucesso!' 
                  : 'Sua senha foi alterada com sucesso!'
                }
              </p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => {
                    setShowSuccess(false);
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-all duration-200"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Feedback de Erro */}
        {showError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 text-center">
              <div className="text-6xl mb-4">
                {errorType === 'password_incorrect' ? '🔒' : '⚠️'}
              </div>
              <h3 className="text-2xl font-bold text-red-600 mb-2">
                {errorType === 'password_incorrect' ? 'Senha Incorreta!' : 'Senhas Não Coincidem!'}
              </h3>
              <p className="text-gray-600 mb-6">
                {errorType === 'password_incorrect' 
                  ? 'A senha atual informada está incorreta. Verifique e tente novamente.' 
                  : 'As senhas digitadas não são iguais. Verifique e tente novamente.'
                }
              </p>
              <div className="flex space-x-4 justify-center">
                <button
                  onClick={() => {
                    setShowError(false);
                  }}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-all duration-200"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}