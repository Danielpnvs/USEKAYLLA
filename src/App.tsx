import { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Package, 
  ShoppingCart, 
  History, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  FileText,
  User,
  Menu,
  X,
  Lock,
  LogOut
} from 'lucide-react';

// Componentes das abas
import ClothingForm from './components/ClothingForm';
import InventoryManager from './components/InventoryManager';
import SalesRegister from './components/SalesRegister';
import SalesHistory from './components/SalesHistory';
import Reports from './components/Reports';
import Investments from './components/Investments';
import CashFlow from './components/CashFlow';
import Notes from './components/Notes';
import Account from './components/Account';
import ErrorBoundary from './components/ErrorBoundary';
import { AppProvider, useApp } from './contexts/AppContext';
import { initializeUsers } from './utils/initializeUsers';

type TabType = 
  | 'clothing'
  | 'inventory'
  | 'sales'
  | 'history'
  | 'reports'
  | 'investments'
  | 'cashflow'
  | 'notes'
  | 'account';

const tabs = [
  { id: 'clothing' as TabType, name: 'Cadastrar Peças', icon: ShoppingBag },
  { id: 'inventory' as TabType, name: 'Gerenciar Estoque', icon: Package },
  { id: 'sales' as TabType, name: 'Registrar Vendas', icon: ShoppingCart },
  { id: 'history' as TabType, name: 'Histórico', icon: History },
  { id: 'reports' as TabType, name: 'Relatórios', icon: BarChart3 },
  { id: 'investments' as TabType, name: 'Investimentos', icon: TrendingUp },
  { id: 'cashflow' as TabType, name: 'Fluxo de Caixa', icon: DollarSign },
  { id: 'notes' as TabType, name: 'Anotações', icon: FileText },
  { id: 'account' as TabType, name: 'Conta', icon: User },
];

function AppContent() {
  const { activeTab, setActiveTab } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Inicializar usuários e verificar se usuário está logado
  useEffect(() => {
    // Inicializar usuários padrão no Firebase
    initializeUsers();
    
    const savedUser = localStorage.getItem('usekaylla_user');
    if (savedUser) {
      try {
        const userProfile = JSON.parse(savedUser);
        userProfile.createdAt = new Date(userProfile.createdAt);
        userProfile.lastLogin = new Date(userProfile.lastLogin);
        setCurrentUser(userProfile);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('usekaylla_user');
      }
    }
  }, []);

  // Sempre começar na aba Conta se não estiver logado
  useEffect(() => {
    console.log('App useEffect executado - isLoggedIn:', isLoggedIn, 'activeTab:', activeTab);
    if (!isLoggedIn) {
      console.log('Usuário não logado, redirecionando para account');
      setActiveTab('account');
    } else {
      console.log('Usuário logado, mantendo aba atual:', activeTab);
      // NÃO forçar mudança de aba quando logado - deixar o contexto gerenciar
      // Só redirecionar se estiver tentando acessar uma aba que não deveria
    }
  }, [isLoggedIn]); // Removido setActiveTab das dependências

  // Evitar redirecionamento desnecessário após operações
  useEffect(() => {
    // Se o usuário está logado e na aba sales, manter na aba sales
    if (isLoggedIn && activeTab === 'sales') {
      console.log('Usuário logado na aba sales, mantendo na aba sales');
    }
  }, [isLoggedIn, activeTab]);

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    setActiveTab('account');
    localStorage.removeItem('usekaylla_user');
    localStorage.removeItem('usekaylla_active_tab');
  };

  const renderTabContent = () => {
    console.log('App: Renderizando aba:', activeTab);
    
    // Se não estiver logado, só permite acessar a aba Conta
    if (!isLoggedIn && activeTab !== 'account') {
      return <Account />;
    }
    
    switch (activeTab) {
      case 'clothing':
        return <ClothingForm />;
      case 'inventory':
        return <InventoryManager />;
      case 'sales':
        return <SalesRegister />;
      case 'history':
        return <SalesHistory />;
      case 'reports':
        return <Reports />;
      case 'investments':
        return <Investments />;
      case 'cashflow':
        return <CashFlow />;
      case 'notes':
        return <Notes />;
      case 'account':
        return (
          <Account 
            onLogin={(user) => {
              setCurrentUser(user);
              setIsLoggedIn(true);
              // Redirecionar baseado no tipo de usuário
              if (user.role === 'viewer') {
                // Visualizador vai direto para o cadastro (demonstração)
                setActiveTab('clothing');
              } else {
                // Admin e usuário vão para estoque
                try {
                  localStorage.setItem('usekaylla_active_tab', 'inventory');
                } catch {}
                setActiveTab('inventory');
              }
            }}
            onLogout={() => {
              setCurrentUser(null);
              setIsLoggedIn(false);
            }}
            isLoggedIn={isLoggedIn}
            currentUser={currentUser}
          />
        );
      default:
        console.log('App: Aba padrão - account');
        return <Account />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center justify-center flex-1">
                <button
                  className="lg:hidden absolute left-8 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
                <div className="text-center">
                  <h1 
                    className="text-3xl md:text-4xl font-bold text-gray-800 drop-shadow-sm" 
                    style={{ 
                      fontFamily: 'Playfair Display, serif', 
                      letterSpacing: '0.05em',
                      textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    USE KAYLLA
                  </h1>
                  <p 
                    className="text-base md:text-lg text-gray-600 mt-2" 
                    style={{ 
                      fontFamily: 'Playfair Display, serif', 
                      fontWeight: '400',
                      letterSpacing: '0.02em'
                    }}
                  >
                    Gerenciando meu negócio com sofisticação e delicadeza
                  </p>
                </div>
              </div>
              
              {/* Botão de Logout */}
              {isLoggedIn && (
                <div className="absolute right-8 top-6">
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                    title="Sair da aplicação"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="text-sm font-medium">Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex px-6 pb-6">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full overflow-hidden">
            <div className="flex flex-col h-full pt-16 lg:pt-0">
              <nav className="flex-1 px-3 py-6 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isAccountTab = tab.id === 'account';
                const isBlocked = !isLoggedIn && !isAccountTab;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (!isBlocked) {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                      }
                    }}
                    disabled={isBlocked}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group ${
                      isBlocked
                        ? 'text-gray-400 cursor-not-allowed opacity-50'
                        : activeTab === tab.id
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-200 hover:text-gray-900 hover:shadow-md hover:transform hover:scale-102'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mr-3 transition-all duration-300 ${
                      isBlocked
                        ? 'bg-gray-200'
                        : activeTab === tab.id
                        ? 'bg-white bg-opacity-20'
                        : 'bg-gray-100 group-hover:bg-white'
                    }`}>
                      {isBlocked ? (
                        <Lock className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Icon className={`h-5 w-5 transition-colors duration-300 ${
                          activeTab === tab.id
                            ? 'text-white'
                            : 'text-gray-600 group-hover:text-gray-900'
                        }`} />
                      )}
                    </div>
                    <span className="font-semibold">
                      {isBlocked ? `${tab.name} (Bloqueado)` : tab.name}
                    </span>
                  </button>
                );
              })}
              </nav>
            </div>
          </div>
        </div>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-6">
          <div className="py-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {renderTabContent()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;