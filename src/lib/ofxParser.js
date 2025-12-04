/**
 * Parser de arquivos OFX (Open Financial Exchange)
 * Converte arquivos OFX/QFX em objetos JavaScript
 */

// Função principal para parsear OFX
export const parseOFX = (ofxString) => {
  try {
    // Remover cabeçalho SGML (antes do <OFX>)
    const ofxStart = ofxString.indexOf('<OFX>')
    if (ofxStart === -1) {
      throw new Error('Arquivo OFX inválido: tag <OFX> não encontrada')
    }
    
    // Extrair header e body
    const header = ofxString.substring(0, ofxStart)
    let body = ofxString.substring(ofxStart)
    
    // Converter SGML para XML (adicionar tags de fechamento)
    body = sgmlToXml(body)
    
    // Parse do XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(body, 'text/xml')
    
    // Verificar erros de parsing
    const parseError = xmlDoc.querySelector('parsererror')
    if (parseError) {
      console.error('Erro de parsing:', parseError.textContent)
      // Tentar parsing alternativo
      return parseOFXManual(ofxString)
    }
    
    // Extrair informações
    const result = {
      header: parseHeader(header),
      account: parseAccountInfo(xmlDoc),
      transactions: parseTransactions(xmlDoc),
      balance: parseBalance(xmlDoc)
    }
    
    return result
  } catch (error) {
    console.error('Erro ao parsear OFX:', error)
    // Tentar parsing manual como fallback
    return parseOFXManual(ofxString)
  }
}

// Converter SGML do OFX para XML válido
const sgmlToXml = (sgml) => {
  // Tags que não precisam de fechamento no OFX original
  const selfClosingTags = [
    'TRNTYPE', 'DTPOSTED', 'DTSTART', 'DTEND', 'TRNAMT', 'FITID',
    'NAME', 'MEMO', 'CHECKNUM', 'REFNUM', 'BALAMT', 'DTASOF',
    'BANKID', 'BRANCHID', 'ACCTID', 'ACCTTYPE', 'CURDEF',
    'CODE', 'SEVERITY', 'MESSAGE', 'DTSERVER', 'LANGUAGE',
    'ORG', 'FID', 'INTU.BID', 'INTU.USERID'
  ]
  
  let xml = sgml
  
  // Adicionar tags de fechamento onde necessário
  selfClosingTags.forEach(tag => {
    const regex = new RegExp(`<${tag}>([^<]*)(?=<)`, 'gi')
    xml = xml.replace(regex, `<${tag}>$1</${tag}>`)
  })
  
  // Limpar espaços extras e quebras de linha dentro das tags
  xml = xml.replace(/>\s+</g, '><')
  
  return xml
}

// Parse do header SGML
const parseHeader = (header) => {
  const result = {}
  
  const lines = header.split(/[\r\n]+/)
  lines.forEach(line => {
    const [key, value] = line.split(':')
    if (key && value) {
      result[key.trim()] = value.trim()
    }
  })
  
  return result
}

// Extrair informações da conta
const parseAccountInfo = (xmlDoc) => {
  const account = {}
  
  // Tentar encontrar informações da conta bancária
  const bankAcct = xmlDoc.querySelector('BANKACCTFROM') || xmlDoc.querySelector('CCACCTFROM')
  
  if (bankAcct) {
    account.bankId = getTagValue(bankAcct, 'BANKID')
    account.branchId = getTagValue(bankAcct, 'BRANCHID')
    account.accountId = getTagValue(bankAcct, 'ACCTID')
    account.accountType = getTagValue(bankAcct, 'ACCTTYPE')
  }
  
  // Moeda
  account.currency = getTagValue(xmlDoc, 'CURDEF') || 'BRL'
  
  return account
}

// Extrair transações
const parseTransactions = (xmlDoc) => {
  const transactions = []
  
  // Buscar todas as transações (STMTTRN)
  const stmtTrns = xmlDoc.querySelectorAll('STMTTRN')
  
  stmtTrns.forEach(trn => {
    const transaction = {
      type: getTagValue(trn, 'TRNTYPE'),
      datePosted: parseOFXDate(getTagValue(trn, 'DTPOSTED')),
      amount: parseFloat(getTagValue(trn, 'TRNAMT') || '0'),
      fitId: getTagValue(trn, 'FITID'),
      name: getTagValue(trn, 'NAME'),
      memo: getTagValue(trn, 'MEMO'),
      checkNum: getTagValue(trn, 'CHECKNUM'),
      refNum: getTagValue(trn, 'REFNUM')
    }
    
    // Determinar se é crédito ou débito
    transaction.isCredit = transaction.amount > 0
    transaction.description = transaction.memo || transaction.name || ''
    
    transactions.push(transaction)
  })
  
  // Ordenar por data (mais recente primeiro)
  transactions.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted))
  
  return transactions
}

// Extrair saldo
const parseBalance = (xmlDoc) => {
  const balance = {}
  
  // Saldo disponível
  const ledgerBal = xmlDoc.querySelector('LEDGERBAL')
  if (ledgerBal) {
    balance.ledger = parseFloat(getTagValue(ledgerBal, 'BALAMT') || '0')
    balance.ledgerDate = parseOFXDate(getTagValue(ledgerBal, 'DTASOF'))
  }
  
  // Saldo disponível
  const availBal = xmlDoc.querySelector('AVAILBAL')
  if (availBal) {
    balance.available = parseFloat(getTagValue(availBal, 'BALAMT') || '0')
    balance.availableDate = parseOFXDate(getTagValue(availBal, 'DTASOF'))
  }
  
  return balance
}

// Utilitário para obter valor de uma tag
const getTagValue = (parent, tagName) => {
  const element = parent.querySelector ? parent.querySelector(tagName) : null
  return element ? element.textContent.trim() : null
}

// Converter data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para Date
const parseOFXDate = (dateStr) => {
  if (!dateStr) return null
  
  // Remover timezone se existir (ex: [-3:GMT])
  const cleanDate = dateStr.replace(/\[.*\]/, '').trim()
  
  // Formato: YYYYMMDD ou YYYYMMDDHHMMSS
  const year = cleanDate.substring(0, 4)
  const month = cleanDate.substring(4, 6)
  const day = cleanDate.substring(6, 8)
  
  let hour = '00', minute = '00', second = '00'
  if (cleanDate.length >= 14) {
    hour = cleanDate.substring(8, 10)
    minute = cleanDate.substring(10, 12)
    second = cleanDate.substring(12, 14)
  }
  
  return `${year}-${month}-${day}`
}

// Parser manual (fallback para OFX mal formatados)
const parseOFXManual = (ofxString) => {
  const result = {
    header: {},
    account: {},
    transactions: [],
    balance: {}
  }
  
  try {
    // Extrair transações usando regex
    const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>|<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>)/gi
    let match
    
    while ((match = transactionRegex.exec(ofxString)) !== null) {
      const trnContent = match[1] || match[2]
      
      const transaction = {
        type: extractValue(trnContent, 'TRNTYPE'),
        datePosted: parseOFXDate(extractValue(trnContent, 'DTPOSTED')),
        amount: parseFloat(extractValue(trnContent, 'TRNAMT') || '0'),
        fitId: extractValue(trnContent, 'FITID'),
        name: extractValue(trnContent, 'NAME'),
        memo: extractValue(trnContent, 'MEMO'),
        checkNum: extractValue(trnContent, 'CHECKNUM'),
        refNum: extractValue(trnContent, 'REFNUM')
      }
      
      transaction.isCredit = transaction.amount > 0
      transaction.description = transaction.memo || transaction.name || ''
      
      if (transaction.fitId) {
        result.transactions.push(transaction)
      }
    }
    
    // Extrair informações da conta
    result.account.bankId = extractValue(ofxString, 'BANKID')
    result.account.accountId = extractValue(ofxString, 'ACCTID')
    result.account.accountType = extractValue(ofxString, 'ACCTTYPE')
    
    // Extrair saldo
    const balAmt = extractValue(ofxString, 'BALAMT')
    if (balAmt) {
      result.balance.ledger = parseFloat(balAmt)
    }
    
    // Ordenar transações
    result.transactions.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted))
    
  } catch (error) {
    console.error('Erro no parsing manual:', error)
  }
  
  return result
}

// Extrair valor de tag usando regex
const extractValue = (content, tagName) => {
  const regex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, 'i')
  const match = content.match(regex)
  return match ? match[1].trim() : null
}

// Função para ler arquivo OFX
export const readOFXFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const content = e.target.result
        const parsed = parseOFX(content)
        resolve(parsed)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
    
    // Tentar diferentes encodings
    reader.readAsText(file, 'ISO-8859-1') // Encoding comum em OFX brasileiros
  })
}

// Função para formatar transações para o banco de dados
export const formatTransactionsForDB = (parsedOFX, contaBancariaId, arquivoNome) => {
  return parsedOFX.transactions.map(t => ({
    conta_bancaria_id: contaBancariaId,
    fitid: t.fitId,
    tipo: t.isCredit ? 'CREDIT' : 'DEBIT',
    data_transacao: t.datePosted,
    valor: Math.abs(t.amount),
    descricao: t.description?.substring(0, 255) || '',
    memo: t.memo || null,
    arquivo_origem: arquivoNome,
    conciliado: false,
    ignorado: false
  }))
}

// Função para identificar categoria baseada na descrição
export const sugerirCategoria = (descricao, categorias) => {
  const desc = descricao.toLowerCase()
  
  // Mapeamento de palavras-chave para categorias
  const keywords = {
    'salario': 'Salários e Encargos',
    'folha': 'Salários e Encargos',
    'pagamento': 'Salários e Encargos',
    'combustivel': 'Combustível',
    'posto': 'Combustível',
    'gasolina': 'Combustível',
    'diesel': 'Combustível',
    'shell': 'Combustível',
    'ipiranga': 'Combustível',
    'br ': 'Combustível',
    'energia': 'Energia Elétrica',
    'eletrica': 'Energia Elétrica',
    'cemig': 'Energia Elétrica',
    'light': 'Energia Elétrica',
    'enel': 'Energia Elétrica',
    'celpe': 'Energia Elétrica',
    'internet': 'Internet/Telefone',
    'telefone': 'Internet/Telefone',
    'vivo': 'Internet/Telefone',
    'tim': 'Internet/Telefone',
    'claro': 'Internet/Telefone',
    'oi ': 'Internet/Telefone',
    'aluguel': 'Aluguel',
    'locacao': 'Aluguel',
    'contador': 'Contador',
    'contabil': 'Contador',
    'imposto': 'Impostos',
    'tributo': 'Impostos',
    'darf': 'Impostos',
    'gps': 'Impostos',
    'inss': 'Impostos',
    'fgts': 'Impostos',
    'tarifa': 'Taxas Bancárias',
    'taxa': 'Taxas Bancárias',
    'ted': 'Taxas Bancárias',
    'doc': 'Taxas Bancárias',
    'pix': 'Taxas Bancárias',
    'restaurante': 'Alimentação',
    'lanchonete': 'Alimentação',
    'ifood': 'Alimentação',
    'mercado': 'Alimentação',
    'supermercado': 'Alimentação',
    'material': 'Material de Trabalho',
    'ferramenta': 'Material de Trabalho',
    'equipamento': 'Material de Trabalho'
  }
  
  for (const [keyword, categoria] of Object.entries(keywords)) {
    if (desc.includes(keyword)) {
      const cat = categorias.find(c => c.nome === categoria)
      if (cat) return cat.id
    }
  }
  
  return null
}

export default parseOFX
