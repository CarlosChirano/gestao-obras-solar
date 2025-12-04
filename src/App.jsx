import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'

// Layout
import MainLayout from './layouts/MainLayout'

// Auth
import Login from './pages/auth/Login'

// Dashboard
import Dashboard from './pages/Dashboard'

// Operação
import OrdensServico from './pages/operacao/OrdensServico'
import OrdemServicoForm from './pages/operacao/OrdemServicoForm'
import OrdemServicoDetalhes from './pages/operacao/OrdemServicoDetalhes'
import Calendario from './pages/operacao/Calendario'
import Relatorios from './pages/operacao/Relatorios'

// Cadastros
import Colaboradores from './pages/cadastros/Colaboradores'
import ColaboradorForm from './pages/cadastros/ColaboradorForm'
import Clientes from './pages/cadastros/Clientes'
import ClienteForm from './pages/cadastros/ClienteForm'
import Funcoes from './pages/cadastros/Funcoes'
import FuncaoForm from './pages/cadastros/FuncaoForm'
import Equipes from './pages/cadastros/Equipes'
import EquipeForm from './pages/cadastros/EquipeForm'
import Servicos from './pages/cadastros/Servicos'
import Veiculos from './pages/cadastros/Veiculos'
import EmpresasContratantes from './pages/cadastros/EmpresasContratantes'
import ChecklistModelos from './pages/cadastros/ChecklistModelos'

// Financeiro
import Financeiro from './pages/financeiro/Financeiro'
import LancamentoForm from './pages/financeiro/LancamentoForm'
import ContaBancariaForm from './pages/financeiro/ContaBancariaForm'
import ImportarOFX from './pages/financeiro/ImportarOFX'

// Usuários
import Usuarios from './pages/usuarios/Usuarios'
import UsuarioForm from './pages/usuarios/UsuarioForm'
import PerfisAcesso from './pages/usuarios/PerfisAcesso'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Componente para rotas protegidas
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <MainLayout>{children}</MainLayout>
}

// Componente para rotas públicas (login)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />

            {/* Rotas Privadas */}
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />

            {/* Ordens de Serviço */}
            <Route path="/ordens-servico" element={
              <PrivateRoute>
                <OrdensServico />
              </PrivateRoute>
            } />
            <Route path="/ordens-servico/nova" element={
              <PrivateRoute>
                <OrdemServicoForm />
              </PrivateRoute>
            } />
            <Route path="/ordens-servico/:id" element={
              <PrivateRoute>
                <OrdemServicoDetalhes />
              </PrivateRoute>
            } />
            <Route path="/ordens-servico/:id/editar" element={
              <PrivateRoute>
                <OrdemServicoForm />
              </PrivateRoute>
            } />

            {/* Calendário */}
            <Route path="/calendario" element={
              <PrivateRoute>
                <Calendario />
              </PrivateRoute>
            } />

            {/* Relatórios */}
            <Route path="/relatorios" element={
              <PrivateRoute>
                <Relatorios />
              </PrivateRoute>
            } />

            {/* Financeiro */}
            <Route path="/financeiro" element={
              <PrivateRoute>
                <Financeiro />
              </PrivateRoute>
            } />
            <Route path="/financeiro/novo" element={
              <PrivateRoute>
                <LancamentoForm />
              </PrivateRoute>
            } />
            <Route path="/financeiro/:id" element={
              <PrivateRoute>
                <LancamentoForm />
              </PrivateRoute>
            } />
            <Route path="/financeiro/contas/nova" element={
              <PrivateRoute>
                <ContaBancariaForm />
              </PrivateRoute>
            } />
            <Route path="/financeiro/contas/:id" element={
              <PrivateRoute>
                <ContaBancariaForm />
              </PrivateRoute>
            } />
            <Route path="/financeiro/importar-ofx" element={
              <PrivateRoute>
                <ImportarOFX />
              </PrivateRoute>
            } />

            {/* Usuários */}
            <Route path="/usuarios" element={
              <PrivateRoute>
                <Usuarios />
              </PrivateRoute>
            } />
            <Route path="/usuarios/:id" element={
              <PrivateRoute>
                <UsuarioForm />
              </PrivateRoute>
            } />
            <Route path="/usuarios/perfis" element={
              <PrivateRoute>
                <PerfisAcesso />
              </PrivateRoute>
            } />

            {/* Colaboradores */}
            <Route path="/colaboradores" element={
              <PrivateRoute>
                <Colaboradores />
              </PrivateRoute>
            } />
            <Route path="/colaboradores/novo" element={
              <PrivateRoute>
                <ColaboradorForm />
              </PrivateRoute>
            } />
            <Route path="/colaboradores/:id" element={
              <PrivateRoute>
                <ColaboradorForm />
              </PrivateRoute>
            } />

            {/* Clientes */}
            <Route path="/clientes" element={
              <PrivateRoute>
                <Clientes />
              </PrivateRoute>
            } />
            <Route path="/clientes/novo" element={
              <PrivateRoute>
                <ClienteForm />
              </PrivateRoute>
            } />
            <Route path="/clientes/:id" element={
              <PrivateRoute>
                <ClienteForm />
              </PrivateRoute>
            } />

            {/* Funções */}
            <Route path="/funcoes" element={
              <PrivateRoute>
                <Funcoes />
              </PrivateRoute>
            } />
            <Route path="/funcoes/novo" element={
              <PrivateRoute>
                <FuncaoForm />
              </PrivateRoute>
            } />
            <Route path="/funcoes/:id" element={
              <PrivateRoute>
                <FuncaoForm />
              </PrivateRoute>
            } />

            {/* Equipes */}
            <Route path="/equipes" element={
              <PrivateRoute>
                <Equipes />
              </PrivateRoute>
            } />
            <Route path="/equipes/nova" element={
              <PrivateRoute>
                <EquipeForm />
              </PrivateRoute>
            } />
            <Route path="/equipes/:id" element={
              <PrivateRoute>
                <EquipeForm />
              </PrivateRoute>
            } />

            {/* Serviços */}
            <Route path="/servicos" element={
              <PrivateRoute>
                <Servicos />
              </PrivateRoute>
            } />

            {/* Veículos */}
            <Route path="/veiculos" element={
              <PrivateRoute>
                <Veiculos />
              </PrivateRoute>
            } />

            {/* Empresas Contratantes */}
            <Route path="/empresas-contratantes" element={
              <PrivateRoute>
                <EmpresasContratantes />
              </PrivateRoute>
            } />

            {/* Checklist Modelos */}
            <Route path="/checklist-modelos" element={
              <PrivateRoute>
                <ChecklistModelos />
              </PrivateRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
