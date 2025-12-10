import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Save, Loader2, Plus, Trash2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

const EquipeForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6'
  })

  const [membros, setMembros] = useState([])
  const [novoMembro, setNovoMembro] = useState({ colaborador_id: '', funcao_na_equipe: '' })

  // Buscar colaboradores disponíveis
  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-ativos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome, funcao:funcoes(nome)')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  useEffect(() => {
    if (isEditing) {
      loadEquipe()
    }
  }, [id])

  const loadEquipe = async () => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('equipes')
        .select(`
          *,
          equipe_membros(
            id,
            colaborador_id,
            funcao_na_equipe,
            colaborador:colaboradores(id, nome)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        nome: data.nome || '',
        descricao: data.descricao || '',
        cor: data.cor || '#3B82F6'
      })

      setMembros(data.equipe_membros?.map(m => ({
        id: m.id,
        colaborador_id: m.colaborador_id,
        funcao_na_equipe: m.funcao_na_equipe || '',
        colaborador_nome: m.colaborador?.nome
      })) || [])

    } catch (error) {
      toast.error('Erro ao carregar equipe')
      navigate('/equipes')
    } finally {
      setLoadingData(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ============================================
  // CORREÇÃO: Preencher função automaticamente
  // ============================================
  const handleColaboradorChange = (e) => {
    const colaboradorId = e.target.value
    const colaborador = colaboradores?.find(c => c.id === colaboradorId)
    
    setNovoMembro({
      colaborador_id: colaboradorId,
      // Preenche automaticamente com a função do colaborador
      funcao_na_equipe: colaborador?.funcao?.nome || ''
    })
  }

  const handleAddMembro = () => {
    if (!novoMembro.colaborador_id) {
      toast.error('Selecione um colaborador')
      return
    }

    // Verificar se já está na equipe
    if (membros.some(m => m.colaborador_id === novoMembro.colaborador_id)) {
      toast.error('Este colaborador já está na equipe')
      return
    }

    const colaborador = colaboradores?.find(c => c.id === novoMembro.colaborador_id)
    
    setMembros([...membros, {
      colaborador_id: novoMembro.colaborador_id,
      funcao_na_equipe: novoMembro.funcao_na_equipe || colaborador?.funcao?.nome || '',
      colaborador_nome: colaborador?.nome,
      isNew: true
    }])

    setNovoMembro({ colaborador_id: '', funcao_na_equipe: '' })
  }

  const handleRemoveMembro = (index) => {
    setMembros(membros.filter((_, i) => i !== index))
  }

  const handleUpdateMembroFuncao = (index, funcao) => {
    const updated = [...membros]
    updated[index].funcao_na_equipe = funcao
    setMembros(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      let equipeId = id

      if (isEditing) {
        // Atualizar equipe
        const { error } = await supabase
          .from('equipes')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            cor: formData.cor
          })
          .eq('id', id)
        
        if (error) throw error

        // Remover membros antigos
        await supabase
          .from('equipe_membros')
          .delete()
          .eq('equipe_id', id)

      } else {
        // Criar nova equipe
        const { data, error } = await supabase
          .from('equipes')
          .insert([{
            nome: formData.nome,
            descricao: formData.descricao,
            cor: formData.cor
          }])
          .select()
          .single()
        
        if (error) throw error
        equipeId = data.id
      }

      // Inserir membros
      if (membros.length > 0) {
        const membrosToInsert = membros.map(m => ({
          equipe_id: equipeId,
          colaborador_id: m.colaborador_id,
          funcao_na_equipe: m.funcao_na_equipe
        }))

        const { error: membrosError } = await supabase
          .from('equipe_membros')
          .insert(membrosToInsert)

        if (membrosError) throw membrosError
      }

      toast.success(isEditing ? 'Equipe atualizada!' : 'Equipe cadastrada!')
      navigate('/equipes')

    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Colaboradores disponíveis (não estão na equipe ainda)
  const colaboradoresDisponiveis = colaboradores?.filter(
    c => !membros.some(m => m.colaborador_id === c.id)
  )

  const cores = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
  ]

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/equipes')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Equipe' : 'Nova Equipe'}
          </h1>
          <p className="text-gray-600">Preencha os dados da equipe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Equipe */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Equipe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome da Equipe *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="input-field"
                placeholder="Ex: Equipe Alpha, Equipe Instalação..."
                required
              />
            </div>

            <div>
              <label className="label">Cor de Identificação</label>
              <div className="flex items-center gap-2">
                <div className="flex gap-2">
                  {cores.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, cor }))}
                      className={`w-8 h-8 rounded-lg transition-transform ${formData.cor === cor ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData(prev => ({ ...prev, cor: e.target.value }))}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label">Descrição</label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={2}
                className="input-field"
                placeholder="Descrição da equipe e suas especialidades..."
              />
            </div>
          </div>
        </div>

        {/* Membros da Equipe */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Membros da Equipe</h2>
          
          {/* Adicionar membro */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <label className="label">Colaborador</label>
              <select
                value={novoMembro.colaborador_id}
                onChange={handleColaboradorChange}
                className="input-field"
              >
                <option value="">Selecione um colaborador...</option>
                {colaboradoresDisponiveis?.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.nome} {col.funcao?.nome ? `(${col.funcao.nome})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Função na Equipe</label>
              <input
                type="text"
                value={novoMembro.funcao_na_equipe}
                onChange={(e) => setNovoMembro(prev => ({ ...prev, funcao_na_equipe: e.target.value }))}
                className="input-field"
                placeholder="Ex: Líder, Auxiliar..."
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddMembro}
                className="btn-primary h-[42px]"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar</span>
              </button>
            </div>
          </div>

          {/* Lista de membros */}
          {membros.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Nenhum membro adicionado. Adicione colaboradores à equipe acima.
            </p>
          ) : (
            <div className="space-y-2">
              {membros.map((membro, index) => (
                <div 
                  key={membro.colaborador_id} 
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{ backgroundColor: formData.cor }}
                    >
                      {membro.colaborador_nome?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{membro.colaborador_nome}</p>
                      <input
                        type="text"
                        value={membro.funcao_na_equipe}
                        onChange={(e) => handleUpdateMembroFuncao(index, e.target.value)}
                        className="text-sm text-gray-500 bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                        placeholder="Função na equipe..."
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMembro(index)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/equipes')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default EquipeForm
