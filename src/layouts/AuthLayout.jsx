import { Outlet } from 'react-router-dom'
import { Sun } from 'lucide-react'

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <Sun className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gestão de Obras Solar</h1>
          <p className="text-primary-200 mt-1">Sistema de controle de obras</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
