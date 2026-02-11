import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  LayoutDashboard,
  ClipboardList,
  Calendar,
  Users,
  Building2,
  Briefcase,
  UsersRound,
  Wrench,
  Car,
  Building,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Sun,
  DollarSign,
  ShieldCheck,
  PauseCircle,
  FolderTree,
  MapPin,
  Wallet,
  TrendingUp,
  Package,
  Banknote
} from 'lucide-react'

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [cadastrosOpen, setCadastrosOpen] = useState(true)
  const [financeiroOpen, setFinanceiroOpen] = useState(true)
  const [precificacaoOpen, setPrecificacaoOpen] = useState(true)
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut, user, userProfile } = useAuth()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/' 
    },
    { 
      label: 'Ordens de Serviço', 
      icon: ClipboardList, 
      path: '/ordens-servico' 
    },
    { 
      label: 'Calendário', 
      icon: Calendar, 
      path: '/calendario' 
    },
    { 
      label: 'Check-ins', 
      icon: MapPin, 
      path: '/checkins' 
    },
    { 
      label: 'Relatórios', 
      icon: FileText, 
      path: '/relatorios' 
    },
    { 
      label: 'Custos de Equipe', 
      icon: Banknote, 
      path: '/custos-equipe' 
    },
  ]

  const financeiroItems = [
    { label: 'Lançamentos', icon: DollarSign, path: '/financeiro' },
    { label: 'Plano de Contas', icon: FolderTree, path: '/plano-contas' },
  ]

  const precificacaoItems = [
    { label: 'Preço Venda (kWp)', icon: TrendingUp, path: '/faixas-preco-venda' },
    { label: 'Custo Equipe (kWp)', icon: Wallet, path: '/faixas-preco-custo' },
    { label: 'Serviços Extras', icon: Package, path: '/servicos-extras' },
  ]

  const cadastroItems = [
    { label: 'Colaboradores', icon: Users, path: '/colaboradores' },
    { label: 'Clientes', icon: Building2, path: '/clientes' },
    { label: 'Funções', icon: Briefcase, path: '/funcoes' },
    { label: 'Equipes', icon: UsersRound, path: '/equipes' },
    { label: 'Serviços', icon: Wrench, path: '/servicos' },
    { label: 'Veículos', icon: Car, path: '/veiculos' },
    { label: 'Empresas', icon: Building, path: '/empresas-contratantes' },
    { label: 'Checklists', icon: FileText, path: '/checklist-modelos' },
    { label: 'Motivos de Pausa', icon: PauseCircle, path: '/motivos-pausa' },
  ]

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-8 h-8 text-yellow-500" />
          <span className="font-bold text-gray-900">SolarSync</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-full w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-200 ease-in-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Sun className="w-8 h-8 text-yellow-500" />
            <div>
              <h1 className="font-bold text-gray-900">SolarSync</h1>
              <p className="text-xs text-gray-500">Gestão de Obras Solares</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-180px)]">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}

          {/* Submenu Financeiro */}
          <div className="pt-4">
            <button
              onClick={() => setFinanceiroOpen(!financeiroOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <span className="font-medium text-sm text-gray-500 uppercase">Financeiro</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${financeiroOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {financeiroOpen && (
              <div className="mt-1 space-y-1">
                {financeiroItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 pl-6 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Submenu Precificação */}
          <div className="pt-4">
            <button
              onClick={() => setPrecificacaoOpen(!precificacaoOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <span className="font-medium text-sm text-gray-500 uppercase">Precificação</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${precificacaoOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {precificacaoOpen && (
              <div className="mt-1 space-y-1">
                {precificacaoItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 pl-6 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Submenu Cadastros */}
          <div className="pt-4">
            <button
              onClick={() => setCadastrosOpen(!cadastrosOpen)}
              className="flex items-center justify-between w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <span className="font-medium text-sm text-gray-500 uppercase">Cadastros</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${cadastrosOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {cadastrosOpen && (
              <div className="mt-1 space-y-1">
                {cadastroItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 pl-6 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Configurações */}
          <div className="pt-4">
            <span className="px-3 font-medium text-sm text-gray-500 uppercase">Configurações</span>
            <div className="mt-2 space-y-1">
              <Link
                to="/usuarios"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive('/usuarios')
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="font-medium">Usuários</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* User */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-700 font-medium text-sm">
                  {userProfile?.nome?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userProfile?.nome || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main 
        className="lg:ml-64 min-h-screen"
        style={{ marginLeft: 'var(--sidebar-width, 0)', width: 'calc(100% - var(--sidebar-width, 0))' }}
      >
        <style>{`
          @media (min-width: 1024px) {
            main {
              --sidebar-width: 256px;
            }
          }
        `}</style>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export default MainLayout
