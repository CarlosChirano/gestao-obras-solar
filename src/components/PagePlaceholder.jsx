import { Construction } from 'lucide-react'

const PagePlaceholder = ({ title, description }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-amber-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-center max-w-md">
        {description || 'Esta página está em desenvolvimento.'}
      </p>
    </div>
  )
}

export default PagePlaceholder
