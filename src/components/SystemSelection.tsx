import React from 'react';
import { FileSearch, AlertTriangle, ShoppingBag, Map } from 'lucide-react';

interface SystemSelectionProps {
  onSelect: (system: 'comparador' | 'insucessos' | 'dafiti' | 'evolutivo') => void;
}

const SystemSelection: React.FC<SystemSelectionProps> = ({ onSelect }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Selecione o Sistema</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => onSelect('comparador')}
          className="flex flex-col items-center p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 group"
        >
          <FileSearch className="w-16 h-16 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-blue-800 mb-2">Romaneios</h3>
          <p className="text-blue-600 text-center text-sm">
            Compare pedidos entre sistemas R2PP e Riachuelo
          </p>
        </button>

        <button
          onClick={() => onSelect('insucessos')}
          className="flex flex-col items-center p-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border-2 border-amber-200 hover:border-amber-400 transition-all duration-300 group"
        >
          <AlertTriangle className="w-16 h-16 text-amber-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-amber-800 mb-2">Tracking Insucessos</h3>
          <p className="text-amber-600 text-center text-sm">
            Gerencie e analise insucessos do sistema
          </p>
        </button>

        <button
          onClick={() => onSelect('dafiti')}
          className="flex flex-col items-center p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 group"
        >
          <ShoppingBag className="w-16 h-16 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-purple-800 mb-2">Tracking Dafiti</h3>
          <p className="text-purple-600 text-center text-sm">
            Gerencie pedidos do sistema Dafiti
          </p>
        </button>

        <button
          onClick={() => onSelect('evolutivo')}
          className="flex flex-col items-center p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-green-200 hover:border-green-400 transition-all duration-300 group"
        >
          <Map className="w-16 h-16 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-xl font-semibold text-green-800 mb-2">Evolutivo de Rotas</h3>
          <p className="text-green-600 text-center text-sm">
            Acompanhe a evolução das rotas
          </p>
        </button>
      </div>
    </div>
  );
}

export default SystemSelection;