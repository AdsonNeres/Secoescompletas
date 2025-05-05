import React, { useState } from 'react';
import FileUploadSection from './components/FileUploadSection';
import ResultsSection from './components/ResultsSection';
import { FileProvider } from './context/FileContext';
import Header from './components/Header';
import SystemSelection from './components/SystemSelection';
import DafitiTracker from './components/DafitiTracker';
import RouteEvolution from './components/RouteEvolution';
import { ArrowLeft } from 'lucide-react';

function App() {
  const [selectedSystem, setSelectedSystem] = useState<'none' | 'comparador' | 'insucessos' | 'dafiti' | 'evolutivo'>('none');
  const [showHeader, setShowHeader] = useState(true);

  const handleSystemSelect = (system: 'comparador' | 'insucessos' | 'dafiti' | 'evolutivo') => {
    setSelectedSystem(system);
    setShowHeader(false);
  };

  const handleBack = () => {
    setSelectedSystem('none');
    setShowHeader(true);
  };

  return (
    <FileProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {showHeader && <Header />}
        <main className={`flex-1 ${selectedSystem === 'none' ? 'container mx-auto px-4' : 'w-full'} py-8`}>
          <div className={`${selectedSystem === 'none' ? 'max-w-6xl mx-auto' : 'w-full px-4'}`}>
            {selectedSystem !== 'none' && (
              <button
                onClick={handleBack}
                className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar para Seleção
              </button>
            )}
            {selectedSystem === 'none' && (
              <SystemSelection onSelect={handleSystemSelect} />
            )}
            {selectedSystem === 'comparador' && (
              <>
                <FileUploadSection />
                <ResultsSection />
              </>
            )}
            {selectedSystem === 'insucessos' && (
              <div className="bg-white rounded-lg shadow-md p-6 w-full">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Sistema de Insucessos</h2>
                <p className="text-gray-600">Sistema em desenvolvimento...</p>
              </div>
            )}
            {selectedSystem === 'dafiti' && <DafitiTracker />}
            {selectedSystem === 'evolutivo' && <RouteEvolution />}
          </div>
        </main>
      </div>
    </FileProvider>
  );
}

export default App;