import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Phone, 
  MapPin, 
  Loader2,
  Users,
  UserCircle,
  TrendingUp,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import toast from 'react-hot-toast'

const Clientes = () => {
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [showEstatisticas, setShowEstatisticas] = useState(true)
  const queryClient = useQueryClient()

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('clientes').update({ ativo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['clientes'])
      toast.success('Cliente excluído!')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao excluir')
  })

  // Estatísticas
  const estatisticas = useMemo(() => {
    if (!clientes) return null

    const total = clientes.length
    const pessoaFisica = clientes.filter(c => c.tipo_pessoa === 'fisica').length
    const pessoaJuridica = clientes.filter(c => c.tipo_pessoa === 'juridica').length

    // Cadastros por mês (últimos 6 meses)
    const hoje = new Date()
    const meses = []
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
      const nomeMes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
      
      const clientesMes = clientes.filter(c => {
        if (!c.created_at) return false
        const dataCadastro = new Date(c.created_at)
        return dataCadastro.getFullYear() === data.getFullYear() && 
               dataCadastro.getMonth() === data.getMonth()
      })

      meses.push({
        mesAno,
        nome: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
        total: clientesMes.length,
        clientes: clientesMes
      })
    }

    // Cadastrados este mês
    const mesAtual = meses[meses.length - 1]
    
    // Maior valor para calcular altura das barras
    const maxMes = Math.max(...meses.map(m => m.total), 1)

    return {
      total,
      pessoaFisica,
      pessoaJuridica,
      meses,
      mesAtual,
      maxMes
    }
  }, [clientes])

  const filtered = clientes?.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf_cnpj?.includes(search) ||
    c.cidade?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gerencie sua base de clientes</p>
        </div>
        <Link to="/clientes/novo" className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Cliente
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{estatisticas?.total || 0}</p>
              <p className="text-sm text-gray-500">Total de Clientes</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{estatisticas?.pessoaFisica || 0}</p>
              <p className="text-sm text-gray-500">Pessoa Física</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{estatisticas?.pessoaJuridica || 0}</p>
              <p className="text-sm text-gray-500">Pessoa Jurídica</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{estatisticas?.mesAtual?.total || 0}</p>
              <p className="text-sm text-gray-500">Novos este Mês</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfico de Cadastros por Mês */}
      <div className="card">
        <button 
          onClick={() => setShowEstatisticas(!showEstatisticas)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Cadastros por Mês</h3>
          </div>
          {showEstatisticas ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {showEstatisticas && estatisticas && (
          <div className="mt-4">
            {/* Gráfico de Barras */}
            <div className="flex items-end justify-between gap-2 h-32 mb-2">
              {estatisticas.meses.map((mes, index) => {
                const altura = mes.total > 0 ? (mes.total / estatisticas.maxMes) * 100 : 4
                const isUltimo = index === estatisticas.meses.length - 1
                
                return (
                  <div key={mes.mesAno} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold text-gray-700">{mes.total}</span>
                    <div 
                      className={`w-full rounded-t-lg transition-all ${
                        isUltimo ? 'bg-blue-500' : 'bg-blue-200'
                      }`}
                      style={{ height: `${altura}%`, minHeight: '4px' }}
                      title={`${mes.total} cliente(s) cadastrado(s)`}
                    />
                  </div>
                )
              })}
            </div>
            
            {/* Labels dos meses */}
            <div className="flex justify-between gap-2 border-t pt-2">
              {estatisticas.meses.map((mes, index) => {
                const isUltimo = index === estatisticas.meses.length - 1
                return (
                  <div key={mes.mesAno} className="flex-1 text-center">
                    <span className={`text-xs ${isUltimo ? 'font-semibold text-blue-600' : 'text-gray-500'}`}>
                      {mes.nome}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Lista de clientes do mês atual */}
            {estatisticas.mesAtual?.clientes?.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Clientes cadastrados em {estatisticas.mesAtual.nome}:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {estatisticas.mesAtual.clientes.slice(0, 10).map(cliente => (
                    <Link
                      key={cliente.id}
                      to={`/clientes/${cliente.id}`}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100 transition-colors"
                    >
                      {cliente.nome}
                    </Link>
                  ))}
                  {estatisticas.mesAtual.clientes.length > 10 && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      +{estatisticas.mesAtual.clientes.length - 10} mais
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou cidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhum cliente encontrado</p>
            <Link to="/clientes/novo" className="btn-primary mt-4 inline-flex">
              <Plus className="w-5 h-5" /> Cadastrar
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cidade</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          cliente.tipo_pessoa === 'juridica' ? 'bg-purple-100' : 'bg-green-100'
                        }`}>
                          {cliente.tipo_pessoa === 'juridica' ? (
                            <Building2 className="w-5 h-5 text-purple-600" />
                          ) : (
                            <UserCircle className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{cliente.nome}</p>
                          <p className="text-sm text-gray-500">{cliente.cpf_cnpj || 'Não informado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {cliente.telefone ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4" />
                          {cliente.telefone}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {cliente.cidade ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {cliente.cidade}/{cliente.estado}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${cliente.tipo_pessoa === 'juridica' ? 'badge-info' : 'badge-gray'}`}>
                        {cliente.tipo_pessoa === 'juridica' ? 'PJ' : 'PF'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link to={`/clientes/${cliente.id}`} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => setDeleteId(cliente.id)} className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">Tem certeza que deseja excluir este cliente?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} className="btn-danger">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Clientes
