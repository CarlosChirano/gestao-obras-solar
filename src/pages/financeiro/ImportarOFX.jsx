import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  GitCompare,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Check,
  X,
  RefreshCw
} from 'lucide-react'
import { readOFXFile, formatTransactionsForDB, sugerirCategoria } from '../../lib/ofxParser'
import toast from 'react-hot-toast'

const ImportarOFX = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [etapa, setEtapa] = useState('upload') // upload, preview, conciliacao, concluido
  const [arquivo, setArquivo] = useState(null)
  const [contaSelecionada, setContaSelecionada] = useState('')
  const [dadosOFX, setDadosOFX] = useState(null)
  const [transacoesImportadas, setTransacoesImportadas] = useState([])
  const [transacoesNovas, setTransacoesNovas] = useState([])
  const [transacoesDuplicadas, setTransacoesDuplicadas] = useState([])
  const [processando, setProcessando] = useState(false)
  const [mostrarConciliadas, setMostrarConciliadas] = useState(false)

  // Buscar contas bancárias
  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar categorias
  const { data: categorias } = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar lançamentos para conciliação
  const { data: lancamentos } = useQuery({
    queryKey: ['lancamentos-conciliacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select(`
          *,
          categoria:categorias_financeiras(nome),
          colaborador:colaboradores(nome),
          cliente:clientes(nome)
        `)
        .eq('ativo', true)
        .eq('conciliado', false)
        .order('data_vencimento', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Buscar transações já importadas da conta
  const { data: transacoesExistentes } = useQuery({
    queryKey: ['transacoes-existentes', contaSelecionada],
    queryFn: async () => {
      if (!contaSelecionada) return []
      const { data, error } = await supabase
        .from('transacoes_bancarias')
        .select('fitid')
        .eq('conta_bancaria_id', contaSelecionada)
      if (error) throw error
      return data?.map(t => t.fitid) || []
    },
    enabled: !!contaSelecionada
  })

  // Processar arquivo OFX
  const handleArquivoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.ofx') && !file.name.toLowerCase().endsWith('.qfx')) {
      toast.error('Por favor, selecione um arquivo OFX ou QFX')
      return
    }

    setArquivo(file)
    setProcessando(true)

    try {
      const dados = await readOFXFile(file)
      setDadosOFX(dados)
      
      if (dados.transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo')
        setProcessando(false)
        return
      }

      toast.success(`${dados.transactions.length} transações encontradas`)
      setEtapa('preview')
    } catch (error) {
      console.error('Erro ao processar OFX:', error)
      toast.error('Erro ao processar arquivo OFX')
    } finally {
      setProcessando(false)
    }
  }

  // Verificar duplicatas e preparar importação
  const prepararImportacao = useCallback(() => {
    if (!dadosOFX || !contaSelecionada) return

    const novas = []
    const duplicadas = []

    dadosOFX.transactions.forEach(t => {
      const transacao = {
        ...t,
        conta_bancaria_id: contaSelecionada,
        categoria_id: sugerirCategoria(t.description, categorias || []),
        selecionada: true,
        lancamento_vinculado: null
      }

      if (transacoesExistentes?.includes(t.fitId)) {
        duplicadas.push(transacao)
      } else {
        novas.push(transacao)
      }
    })

    setTransacoesNovas(novas)
    setTransacoesDuplicadas(duplicadas)
    setEtapa('conciliacao')
  }, [dadosOFX, contaSelecionada, transacoesExistentes, categorias])

  // Importar transações
  const importarMutation = useMutation({
    mutationFn: async () => {
      const transacoesParaImportar = transacoesNovas
        .filter(t => t.selecionada)
        .map(t => ({
          conta_bancaria_id: contaSelecionada,
          fitid: t.fitId,
          tipo: t.isCredit ? 'CREDIT' : 'DEBIT',
          data_transacao: t.datePosted,
          valor: Math.abs(t.amount),
          descricao: t.description?.substring(0, 255) || '',
          memo: t.memo || null,
          arquivo_origem: arquivo.name,
          conciliado: !!t.lancamento_vinculado,
          lancamento_id: t.lancamento_vinculado,
          categoria_id: t.categoria_id
        }))

      if (transacoesParaImportar.length === 0) {
        throw new Error('Nenhuma transação selecionada para importar')
      }

      // Inserir transações
      const { data: transacoesInseridas, error: erroTransacoes } = await supabase
        .from('transacoes_bancarias')
        .insert(transacoesParaImportar)
        .select()

      if (erroTransacoes) throw erroTransacoes

      // Atualizar lançamentos vinculados
      const vinculados = transacoesNovas.filter(t => t.lancamento_vinculado)
      for (const t of vinculados) {
        await supabase
          .from('lancamentos_financeiros')
          .update({ 
            conciliado: true,
            transacao_bancaria_id: transacoesInseridas.find(ti => ti.fitid === t.fitId)?.id
          })
          .eq('id', t.lancamento_vinculado)
      }

      // Registrar importação
      await supabase
        .from('importacoes_ofx')
        .insert({
          conta_bancaria_id: contaSelecionada,
          arquivo_nome: arquivo.name,
          data_inicio: dadosOFX.transactions[dadosOFX.transactions.length - 1]?.datePosted,
          data_fim: dadosOFX.transactions[0]?.datePosted,
          total_transacoes: dadosOFX.transactions.length,
          transacoes_novas: transacoesParaImportar.length,
          transacoes_duplicadas: transacoesDuplicadas.length,
          saldo_final: dadosOFX.balance?.ledger
        })

      return transacoesInseridas
    },
    onSuccess: (data) => {
      toast.success(`${data.length} transações importadas com sucesso!`)
      queryClient.invalidateQueries(['transacoes-bancarias'])
      queryClient.invalidateQueries(['lancamentos'])
      setEtapa('concluido')
    },
    onError: (error) => {
      console.error('Erro ao importar:', error)
      toast.error('Erro ao importar transações')
    }
  })

  // Vincular transação a lançamento
  const vincularLancamento = (transacaoIndex, lancamentoId) => {
    setTransacoesNovas(prev => {
      const novas = [...prev]
      novas[transacaoIndex] = {
        ...novas[transacaoIndex],
        lancamento_vinculado: lancamentoId
      }
      return novas
    })
  }

  // Toggle seleção de transação
  const toggleSelecao = (index) => {
    setTransacoesNovas(prev => {
      const novas = [...prev]
      novas[index] = {
        ...novas[index],
        selecionada: !novas[index].selecionada
      }
      return novas
    })
  }

  // Atualizar categoria de transação
  const atualizarCategoria = (index, categoriaId) => {
    setTransacoesNovas(prev => {
      const novas = [...prev]
      novas[index] = {
        ...novas[index],
        categoria_id: categoriaId
      }
      return novas
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR')
  }

  // Encontrar lançamentos compatíveis para vincular
  const lancamentosCompativeis = (transacao) => {
    if (!lancamentos) return []
    
    const valorTrans = Math.abs(transacao.amount)
    const dataTrans = new Date(transacao.datePosted)
    const tipoTrans = transacao.isCredit ? 'receita' : 'despesa'

    return lancamentos.filter(l => {
      // Mesmo tipo (receita/despesa)
      if (l.tipo !== tipoTrans) return false
      
      // Valor similar (margem de 1%)
      const valorLanc = parseFloat(l.valor)
      const diferenca = Math.abs(valorLanc - valorTrans) / valorTrans
      if (diferenca > 0.01) return false
      
      // Data próxima (7 dias de diferença)
      const dataLanc = new Date(l.data_vencimento)
      const diffDias = Math.abs((dataTrans - dataLanc) / (1000 * 60 * 60 * 24))
      if (diffDias > 7) return false
      
      return true
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/financeiro')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Extrato OFX</h1>
          <p className="text-gray-600">Importe transações bancárias e faça a conciliação</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {['upload', 'preview', 'conciliacao', 'concluido'].map((step, index) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              etapa === step ? 'bg-blue-600 text-white' :
              ['upload', 'preview', 'conciliacao', 'concluido'].indexOf(etapa) > index ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {['upload', 'preview', 'conciliacao', 'concluido'].indexOf(etapa) > index ? (
                <Check className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < 3 && (
              <div className={`w-16 h-1 mx-2 ${
                ['upload', 'preview', 'conciliacao', 'concluido'].indexOf(etapa) > index ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Etapa 1: Upload */}
      {etapa === 'upload' && (
        <div className="card">
          <div className="max-w-xl mx-auto py-8">
            <div className="text-center mb-8">
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Selecione o arquivo OFX</h2>
              <p className="text-gray-500">
                Exporte o extrato do seu banco no formato OFX ou QFX
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta Bancária *
                </label>
                <select
                  value={contaSelecionada}
                  onChange={(e) => setContaSelecionada(e.target.value)}
                  className="input"
                  required
                >
                  <option value="">Selecione a conta</option>
                  {contasBancarias?.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome} - {conta.banco}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arquivo OFX *
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".ofx,.qfx"
                    onChange={handleArquivoChange}
                    className="hidden"
                    id="arquivo-ofx"
                    disabled={!contaSelecionada || processando}
                  />
                  <label htmlFor="arquivo-ofx" className="cursor-pointer">
                    {processando ? (
                      <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-2" />
                    ) : (
                      <FileText className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    )}
                    <p className="text-gray-600">
                      {arquivo ? arquivo.name : 'Clique para selecionar ou arraste o arquivo'}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Formatos aceitos: .ofx, .qfx
                    </p>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Etapa 2: Preview */}
      {etapa === 'preview' && dadosOFX && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumo do Arquivo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Transações</p>
                <p className="text-2xl font-bold text-gray-900">{dadosOFX.transactions.length}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Entradas</p>
                <p className="text-2xl font-bold text-green-600">
                  {dadosOFX.transactions.filter(t => t.isCredit).length}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-500">Saídas</p>
                <p className="text-2xl font-bold text-red-600">
                  {dadosOFX.transactions.filter(t => !t.isCredit).length}
                </p>
              </div>
              {dadosOFX.balance?.ledger && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500">Saldo Final</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(dadosOFX.balance.ledger)}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transações Encontradas</h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Data</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descrição</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dadosOFX.transactions.slice(0, 50).map((t, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">{formatDate(t.datePosted)}</td>
                      <td className="px-4 py-2 text-sm">{t.description}</td>
                      <td className={`px-4 py-2 text-sm text-right font-medium ${t.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {t.isCredit ? '+' : '-'} {formatCurrency(Math.abs(t.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {dadosOFX.transactions.length > 50 && (
                <p className="text-center text-gray-500 py-2">
                  ... e mais {dadosOFX.transactions.length - 50} transações
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setEtapa('upload')
                setArquivo(null)
                setDadosOFX(null)
              }}
              className="btn btn-secondary"
            >
              Voltar
            </button>
            <button
              onClick={prepararImportacao}
              className="btn btn-primary"
            >
              Continuar para Conciliação
            </button>
          </div>
        </div>
      )}

      {/* Etapa 3: Conciliação */}
      {etapa === 'conciliacao' && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Conciliação Bancária</h3>
                <p className="text-sm text-gray-500">
                  Vincule as transações do extrato com seus lançamentos
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{transacoesNovas.length}</p>
                  <p className="text-xs text-gray-500">Novas</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{transacoesDuplicadas.length}</p>
                  <p className="text-xs text-gray-500">Duplicadas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Transações Novas */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Transações para Importar ({transacoesNovas.filter(t => t.selecionada).length} selecionadas)
              </h3>
            </div>

            <div className="space-y-3">
              {transacoesNovas.map((t, index) => {
                const compativeis = lancamentosCompativeis(t)
                return (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${t.selecionada ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={t.selecionada}
                        onChange={() => toggleSelecao(index)}
                        className="mt-1"
                      />

                      {/* Info da transação */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{t.description}</p>
                            <p className="text-sm text-gray-500">{formatDate(t.datePosted)}</p>
                          </div>
                          <p className={`text-lg font-bold ${t.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                            {t.isCredit ? '+' : '-'} {formatCurrency(Math.abs(t.amount))}
                          </p>
                        </div>

                        {/* Categoria */}
                        <div className="mt-2 flex items-center gap-4">
                          <select
                            value={t.categoria_id || ''}
                            onChange={(e) => atualizarCategoria(index, e.target.value || null)}
                            className="input text-sm py-1"
                          >
                            <option value="">Sem categoria</option>
                            {categorias
                              ?.filter(c => t.isCredit ? c.tipo === 'receita' : c.tipo === 'despesa')
                              .map((c) => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))
                            }
                          </select>

                          {/* Vincular com lançamento */}
                          {compativeis.length > 0 && (
                            <select
                              value={t.lancamento_vinculado || ''}
                              onChange={(e) => vincularLancamento(index, e.target.value || null)}
                              className="input text-sm py-1"
                            >
                              <option value="">Vincular com lançamento...</option>
                              {compativeis.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.descricao} - {formatCurrency(l.valor)} ({formatDate(l.data_vencimento)})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {t.lancamento_vinculado && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                            <LinkIcon className="w-4 h-4" />
                            Vinculado a lançamento
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {transacoesNovas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhuma transação nova para importar
              </div>
            )}
          </div>

          {/* Transações Duplicadas */}
          {transacoesDuplicadas.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  Transações Duplicadas ({transacoesDuplicadas.length})
                </h3>
                <button
                  onClick={() => setMostrarConciliadas(!mostrarConciliadas)}
                  className="text-sm text-blue-600"
                >
                  {mostrarConciliadas ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>

              {mostrarConciliadas && (
                <div className="space-y-2">
                  {transacoesDuplicadas.map((t, index) => (
                    <div key={index} className="p-3 bg-yellow-50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-900">{t.description}</p>
                        <p className="text-xs text-gray-500">{formatDate(t.datePosted)}</p>
                      </div>
                      <p className={`font-medium ${t.isCredit ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(t.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setEtapa('preview')}
              className="btn btn-secondary"
            >
              Voltar
            </button>
            <button
              onClick={() => importarMutation.mutate()}
              disabled={importarMutation.isPending || transacoesNovas.filter(t => t.selecionada).length === 0}
              className="btn btn-primary"
            >
              {importarMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Importar {transacoesNovas.filter(t => t.selecionada).length} Transações
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Etapa 4: Concluído */}
      {etapa === 'concluido' && (
        <div className="card">
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Importação Concluída!</h2>
            <p className="text-gray-500 mb-6">
              As transações foram importadas com sucesso
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setEtapa('upload')
                  setArquivo(null)
                  setDadosOFX(null)
                  setTransacoesNovas([])
                  setTransacoesDuplicadas([])
                }}
                className="btn btn-secondary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Importar Outro Arquivo
              </button>
              <button
                onClick={() => navigate('/financeiro')}
                className="btn btn-primary"
              >
                Ir para Financeiro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportarOFX
