// Máscaras e validações para formulários

// ============================================
// MÁSCARAS (formata enquanto digita)
// ============================================

// CPF: 000.000.000-00
export const maskCPF = (value) => {
  if (!value) return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .slice(0, 14)
}

// CNPJ: 00.000.000/0000-00
export const maskCNPJ = (value) => {
  if (!value) return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .slice(0, 18)
}

// CPF ou CNPJ (detecta automaticamente)
export const maskCPFCNPJ = (value) => {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 11) {
    return maskCPF(value)
  }
  return maskCNPJ(value)
}

// Telefone: (00) 00000-0000 ou (00) 0000-0000
export const maskPhone = (value) => {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 10) {
    // Telefone fixo: (00) 0000-0000
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14)
  }
  // Celular: (00) 00000-0000
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

// CEP: 00.000-000
export const maskCEP = (value) => {
  if (!value) return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1')
    .slice(0, 10)
}

// Apenas números
export const maskOnlyNumbers = (value) => {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

// Moeda: R$ 0,00
export const maskMoney = (value) => {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  const amount = (parseInt(numbers) / 100).toFixed(2)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount)
}

// ============================================
// VALIDAÇÕES
// ============================================

// Valida email
export const isValidEmail = (email) => {
  if (!email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

// Valida CPF (apenas formato, não verifica dígitos)
export const isValidCPFFormat = (cpf) => {
  if (!cpf) return false
  const numbers = cpf.replace(/\D/g, '')
  return numbers.length === 11
}

// Valida CPF (com verificação de dígitos)
export const isValidCPF = (cpf) => {
  if (!cpf) return false
  const numbers = cpf.replace(/\D/g, '')
  
  if (numbers.length !== 11) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false
  
  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(numbers[9])) return false
  
  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(numbers[10])) return false
  
  return true
}

// Valida CNPJ (apenas formato)
export const isValidCNPJFormat = (cnpj) => {
  if (!cnpj) return false
  const numbers = cnpj.replace(/\D/g, '')
  return numbers.length === 14
}

// Valida CNPJ (com verificação de dígitos)
export const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false
  const numbers = cnpj.replace(/\D/g, '')
  
  if (numbers.length !== 14) return false
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false
  
  // Validação do primeiro dígito verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i]
  }
  let digit = sum % 11
  digit = digit < 2 ? 0 : 11 - digit
  if (digit !== parseInt(numbers[12])) return false
  
  // Validação do segundo dígito verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i]
  }
  digit = sum % 11
  digit = digit < 2 ? 0 : 11 - digit
  if (digit !== parseInt(numbers[13])) return false
  
  return true
}

// Valida telefone
export const isValidPhone = (phone) => {
  if (!phone) return false
  const numbers = phone.replace(/\D/g, '')
  return numbers.length >= 10 && numbers.length <= 11
}

// Valida CEP
export const isValidCEP = (cep) => {
  if (!cep) return false
  const numbers = cep.replace(/\D/g, '')
  return numbers.length === 8
}

// ============================================
// COMPONENTE DE INPUT COM MÁSCARA
// ============================================

// Função helper para usar em onChange
export const handleMaskedInput = (e, maskFunction, setter) => {
  const maskedValue = maskFunction(e.target.value)
  setter(maskedValue)
}

// Remove máscara (retorna apenas números)
export const unmask = (value) => {
  if (!value) return ''
  return value.replace(/\D/g, '')
}

// ============================================
// BUSCA CEP (via ViaCEP)
// ============================================

export const fetchAddressByCEP = async (cep) => {
  const numbers = cep.replace(/\D/g, '')
  if (numbers.length !== 8) return null
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`)
    const data = await response.json()
    
    if (data.erro) return null
    
    return {
      endereco: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || ''
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    return null
  }
}
