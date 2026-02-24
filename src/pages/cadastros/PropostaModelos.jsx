import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Edit,
  Trash2,
  X,
  Save,
  Copy,
  Clock,
  Shield,
  CreditCard
} from 'lucide-react'
import toast from 'react-hot-toast'

const PropostaModelos = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingModelo, setEditingModelo] = useState(null)

  const queryClient = useQueryClient()

  const { data: modelos, isLoading } = useQuery({
    queryKey: ['proposta-modelos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposta_modelos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const filtered = modelos?.filter(m =>
    m.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('proposta_modelos')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['proposta-modelos'])
      toast.success('Modelo excluído!')
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const duplicateMutation = useMutation({
    mutationFn: async (modelo) => {
      const { id, criado_em, atualizado_em, ...rest } = modelo
      const { error } = await supabase
        .from('proposta_modelos')
        .insert([{ ...rest, nome: `${rest.nome} (cópia)` }])
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['proposta-modelos'])
      toast.success('Modelo duplicado!')
    },
    onError: () => toast.error('Erro ao duplicar')
  })

  const handleDelete = (modelo) => {
    if (confirm(`Deseja excluir o modelo "${modelo.nome}"?`)) {
      deleteMutation.mutate(modelo.id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos de Proposta</h1>
          <p className="text-gray-500 mt-1">Templates com condições padrão para propostas comerciais</p>
        </div>
        <button
          onClick={() => { setEditingModelo(null); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" /> Novo Modelo
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar modelos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered?.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum modelo encontrado</h3>
          <p className="text-gray-500 mb-4">Crie modelos com condições padrão para agilizar suas propostas</p>
          <button onClick={() => { setEditingModelo(null); setShowModal(true) }} className="btn-primary">
            <Plus className="w-5 h-5" /> Criar Modelo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((modelo) => (
            <div key={modelo.id} className="card hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{modelo.nome}</h3>
                    {modelo.descricao && (
                      <p className="text-sm text-gray-500 line-clamp-1">{modelo.descricao}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => duplicateMutation.mutate(modelo)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Duplicar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditingModelo(modelo); setShowModal(true) }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(modelo)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                {modelo.condicoes_pagamento && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <CreditCard className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                    <span className="line-clamp-2">{modelo.condicoes_pagamento}</span>
                  </div>
                )}
                {modelo.texto_garantia && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <Shield className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                    <span className="line-clamp-2">{modelo.texto_garantia}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>Validade: {modelo.validade_dias || 30} dias</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModeloModal
          modelo={editingModelo}
          onClose={() => { setShowModal(false); setEditingModelo(null) }}
          onSave={() => {
            queryClient.invalidateQueries(['proposta-modelos'])
            setShowModal(false)
            setEditingModelo(null)
          }}
        />
      )}
    </div>
  )
}

// ============================================
// MODAL DE CRIAÇÃO/EDIÇÃO
// ============================================

const ModeloModal = ({ modelo, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: modelo?.nome || '',
    descricao: modelo?.descricao || '',
    condicoes_pagamento: modelo?.condicoes_pagamento || '',
    texto_garantia: modelo?.texto_garantia || '',
    validade_dias: modelo?.validade_dias || 30,
    observacoes: modelo?.observacoes || ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      toast.error('Digite o nome do modelo')
      return
    }

    setLoading(true)
    try {
      if (modelo) {
        const { error } = await supabase
          .from('proposta_modelos')
          .update({ ...formData, atualizado_em: new Date().toISOString() })
          .eq('id', modelo.id)
        if (error) throw error
        toast.success('Modelo atualizado!')
      } else {
        const { error } = await supabase
          .from('proposta_modelos')
          .insert([formData])
        if (error) throw error
        toast.success('Modelo criado!')
      }
      onSave()
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-900">
            {modelo ? 'Editar Modelo' : 'Novo Modelo de Proposta'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="input-field"
              placeholder="Ex: Proposta Padrão Instalação"
              required
            />
          </div>

          <div>
            <label className="label">Descrição</label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="input-field"
              placeholder="Descrição breve do modelo..."
            />
          </div>

          <div>
            <label className="label">Condições de Pagamento</label>
            <textarea
              value={formData.condicoes_pagamento}
              onChange={(e) => setFormData({ ...formData, condicoes_pagamento: e.target.value })}
              className="input-field"
              rows={4}
              placeholder="Ex: Pagamento em 3 parcelas iguais via boleto bancário..."
            />
          </div>

          <div>
            <label className="label">Garantia</label>
            <textarea
              value={formData.texto_garantia}
              onChange={(e) => setFormData({ ...formData, texto_garantia: e.target.value })}
              className="input-field"
              rows={4}
              placeholder="Ex: Garantia de 1 ano para mão de obra e 25 anos para módulos..."
            />
          </div>

          <div>
            <label className="label">Validade (dias)</label>
            <input
              type="number"
              value={formData.validade_dias}
              onChange={(e) => setFormData({ ...formData, validade_dias: parseInt(e.target.value) || 30 })}
              className="input-field"
              min={1}
              max={365}
            />
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Notas internas sobre este modelo..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PropostaModelos
