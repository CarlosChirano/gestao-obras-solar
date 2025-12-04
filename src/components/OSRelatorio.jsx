import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { FileText, Loader2, Download, X } from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const OSRelatorio = ({ ordemServicoId, ordemServico }) => {
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Função para carregar imagem como base64
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Erro ao carregar imagem:', error)
      return null
    }
  }

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  // Gerar PDF
  const gerarPDF = async () => {
    setLoading(true)

    try {
      // Buscar dados completos da OS
      const { data: os, error: osError } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(*),
          veiculo:veiculos(*),
          empresa:empresas_contratantes(*),
          servicos:ordem_servico_servicos(
            *,
            servico:servicos(*)
          )
        `)
        .eq('id', ordemServicoId)
        .single()

      if (osError) throw osError

      // Buscar fotos
      const { data: fotos } = await supabase
        .from('os_fotos')
        .select('*')
        .eq('ordem_servico_id', ordemServicoId)
        .order('created_at')

      // Buscar checklists com itens
      const { data: checklists } = await supabase
        .from('os_checklists')
        .select(`
          *,
          itens:os_checklist_itens(*)
        `)
        .eq('ordem_servico_id', ordemServicoId)
        .order('created_at')

      // Buscar assinaturas
      const { data: assinaturas } = await supabase
        .from('os_assinaturas')
        .select('*')
        .eq('ordem_servico_id', ordemServicoId)

      // Criar PDF
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      let yPos = margin

      // Cores
      const corPrimaria = [37, 99, 235] // Azul
      const corSecundaria = [100, 116, 139] // Cinza

      // ========== CABEÇALHO ==========
      doc.setFillColor(...corPrimaria)
      doc.rect(0, 0, pageWidth, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('ORDEM DE SERVIÇO', margin, 15)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Nº ${os.numero || os.id.slice(0, 8).toUpperCase()}`, margin, 25)

      // Status
      const statusText = os.status || 'Pendente'
      doc.setFontSize(10)
      doc.text(statusText.toUpperCase(), pageWidth - margin - doc.getTextWidth(statusText.toUpperCase()), 25)

      yPos = 45

      // ========== DADOS DA OS ==========
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Informações da OS', margin, yPos)
      yPos += 8

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...corSecundaria)

      const infosOS = [
        ['Data de Abertura:', formatDateTime(os.created_at)],
        ['Data Agendada:', formatDate(os.data_agendamento)],
        ['Previsão de Conclusão:', formatDate(os.data_previsao)],
      ]

      infosOS.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold')
        doc.text(label, margin, yPos)
        doc.setFont('helvetica', 'normal')
        doc.text(value, margin + 45, yPos)
        yPos += 5
      })

      yPos += 5

      // ========== CLIENTE ==========
      if (os.cliente) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Cliente', margin, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.setTextColor(...corSecundaria)

        const infosCliente = [
          ['Nome:', os.cliente.nome || '-'],
          ['CPF/CNPJ:', os.cliente.cpf_cnpj || '-'],
          ['Telefone:', os.cliente.telefone || '-'],
          ['Email:', os.cliente.email || '-'],
        ]

        infosCliente.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.text(label, margin, yPos)
          doc.setFont('helvetica', 'normal')
          doc.text(value, margin + 25, yPos)
          yPos += 5
        })

        // Endereço
        if (os.cliente.endereco || os.cliente.cidade) {
          const endereco = [os.cliente.endereco, os.cliente.bairro, os.cliente.cidade, os.cliente.estado].filter(Boolean).join(', ')
          if (endereco) {
            doc.setFont('helvetica', 'bold')
            doc.text('Endereço:', margin, yPos)
            doc.setFont('helvetica', 'normal')
            const enderecoLines = doc.splitTextToSize(endereco, pageWidth - margin * 2 - 25)
            doc.text(enderecoLines, margin + 25, yPos)
            yPos += enderecoLines.length * 5
          }
        }

        yPos += 5
      }

      // ========== VEÍCULO ==========
      if (os.veiculo) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Veículo', margin, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.setTextColor(...corSecundaria)

        const infosVeiculo = [
          ['Placa:', os.veiculo.placa || '-'],
          ['Modelo:', `${os.veiculo.marca || ''} ${os.veiculo.modelo || ''}`.trim() || '-'],
          ['Ano:', os.veiculo.ano || '-'],
          ['Cor:', os.veiculo.cor || '-'],
        ]

        infosVeiculo.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold')
          doc.text(label, margin, yPos)
          doc.setFont('helvetica', 'normal')
          doc.text(String(value), margin + 20, yPos)
          yPos += 5
        })

        yPos += 5
      }

      // ========== EMPRESA CONTRATANTE ==========
      if (os.empresa) {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Empresa Contratante', margin, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.setTextColor(...corSecundaria)
        doc.setFont('helvetica', 'normal')
        doc.text(os.empresa.nome_fantasia || os.empresa.razao_social || '-', margin, yPos)
        yPos += 10
      }

      // ========== SERVIÇOS ==========
      if (os.servicos && os.servicos.length > 0) {
        // Verificar se precisa de nova página
        if (yPos > pageHeight - 60) {
          doc.addPage()
          yPos = margin
        }

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Serviços Realizados', margin, yPos)
        yPos += 8

        const servicosData = os.servicos.map((s, idx) => [
          idx + 1,
          s.servico?.nome || s.descricao || 'Serviço',
          s.quantidade || 1,
          s.servico?.unidade || 'un'
        ])

        doc.autoTable({
          startY: yPos,
          head: [['#', 'Serviço', 'Qtd', 'Unidade']],
          body: servicosData,
          theme: 'striped',
          headStyles: { 
            fillColor: corPrimaria,
            fontSize: 9,
            fontStyle: 'bold'
          },
          bodyStyles: { 
            fontSize: 8,
            textColor: [50, 50, 50]
          },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' }
          },
          margin: { left: margin, right: margin }
        })

        yPos = doc.lastAutoTable.finalY + 10
      }

      // ========== DESCRIÇÃO DO SERVIÇO ==========
      if (os.descricao) {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Descrição do Serviço', margin, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.setTextColor(...corSecundaria)
        doc.setFont('helvetica', 'normal')
        const descLines = doc.splitTextToSize(os.descricao, pageWidth - margin * 2)
        doc.text(descLines, margin, yPos)
        yPos += descLines.length * 5 + 10
      }

      // ========== OBSERVAÇÕES ==========
      if (os.observacoes) {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = margin
        }

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('Observações', margin, yPos)
        yPos += 8

        doc.setFontSize(9)
        doc.setTextColor(...corSecundaria)
        doc.setFont('helvetica', 'normal')
        const obsLines = doc.splitTextToSize(os.observacoes, pageWidth - margin * 2)
        doc.text(obsLines, margin, yPos)
        yPos += obsLines.length * 5 + 10
      }

      // ========== CHECKLIST ==========
      if (checklists && checklists.length > 0) {
        doc.addPage()
        yPos = margin

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Checklists', margin, yPos)
        yPos += 10

        for (const checklist of checklists) {
          if (yPos > pageHeight - 40) {
            doc.addPage()
            yPos = margin
          }

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...corPrimaria)
          doc.text(checklist.nome || 'Checklist', margin, yPos)
          yPos += 8

          if (checklist.itens && checklist.itens.length > 0) {
            const itensData = checklist.itens
              .sort((a, b) => a.ordem - b.ordem)
              .map(item => {
                let resposta = '-'
                if (item.tipo_resposta === 'checkbox') {
                  resposta = item.resposta_checkbox ? '✓ Sim' : '✗ Não'
                } else if (item.tipo_resposta === 'texto') {
                  resposta = item.resposta_texto || '-'
                } else if (item.tipo_resposta === 'numero') {
                  resposta = item.resposta_numero?.toString() || '-'
                } else if (item.tipo_resposta === 'selecao') {
                  resposta = item.resposta_selecao || '-'
                } else if (item.tipo_resposta === 'foto') {
                  resposta = item.resposta_foto_url ? '📷 Foto anexada' : '-'
                } else if (item.tipo_resposta === 'assinatura') {
                  if (item.resposta_assinatura_url) {
                    const info = item.resposta_texto?.split(' | CPF: ')
                    resposta = info?.[0] ? `✓ Assinado por ${info[0]}` : '✓ Assinado'
                  } else {
                    resposta = '-'
                  }
                }
                return [item.pergunta, resposta]
              })

            doc.autoTable({
              startY: yPos,
              head: [['Pergunta', 'Resposta']],
              body: itensData,
              theme: 'striped',
              headStyles: { 
                fillColor: [100, 116, 139],
                fontSize: 8,
                fontStyle: 'bold'
              },
              bodyStyles: { 
                fontSize: 8,
                textColor: [50, 50, 50]
              },
              columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 'auto' }
              },
              margin: { left: margin, right: margin }
            })

            yPos = doc.lastAutoTable.finalY + 10
          }
        }
      }

      // ========== FOTOS ==========
      if (fotos && fotos.length > 0) {
        doc.addPage()
        yPos = margin

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Registro Fotográfico', margin, yPos)
        yPos += 10

        // Agrupar fotos por categoria
        const fotosPorCategoria = fotos.reduce((acc, foto) => {
          const cat = foto.categoria || 'geral'
          if (!acc[cat]) acc[cat] = []
          acc[cat].push(foto)
          return acc
        }, {})

        const categoriasOrdem = ['antes', 'durante', 'depois', 'problema', 'material', 'geral']
        const categoriasNomes = {
          antes: 'Antes do Serviço',
          durante: 'Durante o Serviço',
          depois: 'Depois do Serviço',
          problema: 'Problemas Identificados',
          material: 'Materiais Utilizados',
          geral: 'Fotos Gerais'
        }

        for (const categoria of categoriasOrdem) {
          const fotosCategoria = fotosPorCategoria[categoria]
          if (!fotosCategoria || fotosCategoria.length === 0) continue

          if (yPos > pageHeight - 80) {
            doc.addPage()
            yPos = margin
          }

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(...corPrimaria)
          doc.text(categoriasNomes[categoria], margin, yPos)
          yPos += 8

          // Exibir fotos em grade (2 por linha)
          let xPos = margin
          for (let i = 0; i < fotosCategoria.length; i++) {
            const foto = fotosCategoria[i]

            try {
              const imgData = await loadImageAsBase64(foto.url)
              if (imgData) {
                const imgWidth = 85
                const imgHeight = 60

                if (yPos + imgHeight > pageHeight - 20) {
                  doc.addPage()
                  yPos = margin
                  xPos = margin
                }

                doc.addImage(imgData, 'JPEG', xPos, yPos, imgWidth, imgHeight)

                // Descrição da foto
                if (foto.descricao) {
                  doc.setFontSize(7)
                  doc.setFont('helvetica', 'normal')
                  doc.setTextColor(...corSecundaria)
                  const descFoto = doc.splitTextToSize(foto.descricao, imgWidth)
                  doc.text(descFoto[0], xPos, yPos + imgHeight + 4)
                }

                xPos += imgWidth + 5
                if (xPos > pageWidth - margin - imgWidth) {
                  xPos = margin
                  yPos += imgHeight + 15
                }
              }
            } catch (error) {
              console.error('Erro ao carregar foto:', error)
            }
          }

          yPos += 70
        }
      }

      // ========== ASSINATURAS ==========
      if (assinaturas && assinaturas.length > 0) {
        doc.addPage()
        yPos = margin

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Assinaturas', margin, yPos)
        yPos += 15

        const assinaturaCliente = assinaturas.find(a => a.tipo === 'cliente')
        const assinaturaTecnico = assinaturas.find(a => a.tipo === 'tecnico')

        const xPosCliente = margin
        const xPosTecnico = pageWidth / 2 + 10

        // Assinatura do Cliente
        if (assinaturaCliente) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text('Cliente', xPosCliente, yPos)

          try {
            const imgData = await loadImageAsBase64(assinaturaCliente.url)
            if (imgData) {
              doc.addImage(imgData, 'PNG', xPosCliente, yPos + 5, 70, 35)
            }
          } catch (error) {
            console.error('Erro ao carregar assinatura:', error)
          }

          // Linha
          doc.setDrawColor(...corSecundaria)
          doc.line(xPosCliente, yPos + 45, xPosCliente + 75, yPos + 45)

          // Nome e CPF
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          doc.text(assinaturaCliente.nome || 'Cliente', xPosCliente, yPos + 52)
          
          doc.setFontSize(8)
          doc.setTextColor(...corSecundaria)
          doc.text(`CPF: ${assinaturaCliente.cpf || '-'}`, xPosCliente, yPos + 58)
          doc.text(formatDateTime(assinaturaCliente.created_at), xPosCliente, yPos + 64)
        }

        // Assinatura do Técnico
        if (assinaturaTecnico) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(0, 0, 0)
          doc.text('Técnico Responsável', xPosTecnico, yPos)

          try {
            const imgData = await loadImageAsBase64(assinaturaTecnico.url)
            if (imgData) {
              doc.addImage(imgData, 'PNG', xPosTecnico, yPos + 5, 70, 35)
            }
          } catch (error) {
            console.error('Erro ao carregar assinatura:', error)
          }

          // Linha
          doc.setDrawColor(...corSecundaria)
          doc.line(xPosTecnico, yPos + 45, xPosTecnico + 75, yPos + 45)

          // Nome e CPF
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(0, 0, 0)
          doc.text(assinaturaTecnico.nome || 'Técnico', xPosTecnico, yPos + 52)
          
          doc.setFontSize(8)
          doc.setTextColor(...corSecundaria)
          doc.text(`CPF: ${assinaturaTecnico.cpf || '-'}`, xPosTecnico, yPos + 58)
          doc.text(formatDateTime(assinaturaTecnico.created_at), xPosTecnico, yPos + 64)
        }
      }

      // ========== RODAPÉ EM TODAS AS PÁGINAS ==========
      const totalPages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(...corSecundaria)
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
        doc.text(
          `Gerado em ${formatDateTime(new Date())}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: 'right' }
        )
      }

      // Salvar PDF
      const fileName = `OS-${os.numero || os.id.slice(0, 8).toUpperCase()}.pdf`
      doc.save(fileName)

      toast.success('PDF gerado com sucesso!')
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={gerarPDF}
      disabled={loading}
      className="btn-secondary"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {loading ? 'Gerando...' : 'Gerar PDF'}
    </button>
  )
}

export default OSRelatorio
