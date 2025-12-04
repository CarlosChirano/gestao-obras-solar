import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const ForgotPassword = () => {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Recuperar senha</h2>
      <p className="text-gray-600 mb-6">Funcionalidade em desenvolvimento.</p>
      <Link to="/login" className="btn-primary inline-flex">
        <ArrowLeft className="w-5 h-5" /> Voltar ao login
      </Link>
    </div>
  )
}

export default ForgotPassword
