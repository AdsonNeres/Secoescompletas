import React, { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Upload, Filter, UserPlus, Trash2, Plus, Check, Search, ArrowUpDown, X, Pencil, ChevronDown, ChevronRight, FileWarning, Printer } from 'lucide-react';
import { format } from 'date-fns';
import * as htmlToImage from 'html-to-image';

interface DeliveryData {
  id: string;
  data: string;
  motorista: string;
  percentualEntregas: number;
  rotas: string;
  totalPedido: number;
  entregues: number;
  pendente: number;
  insucessos: number;
  percentualRota: number;
  regiao: string;
  dataCompleta?: string;
  isEditing?: boolean;
  originalValues?: {
    rotas: string;
    totalPedido: number;
    entregues: number;
  };
}

interface RegionSummary {
  totalRecebido: number;
  totalPedidos: number;
  entregues: number;
  insucessos: number;
  percentualEntregas: number;
  isEditing?: boolean;
  originalTotalRecebido?: number;
}

interface DafitiSummary {
  totalPedidos: number;
  entregues: number;
  insucessos: number;
  percentualEntregas: number;
}

interface Toast {
  message: string;
  countdown: number;
}

interface DriverRegion {
  motorista: string;
  regiao: string;
}

const DAFITI_DRIVERS = [
  'Aroldo Moreira da Silva Junior',
  'Elisama de Oliveira Pereira',
  'Joao Batista Carneiro',
  'Edson Rodrigues de Figueiredo',
  'Gabriel Silva de Figueiredo'
];

function App() {
  const [data, setData] = useState<DeliveryData[]>(() => {
    const saved = localStorage.getItem('deliveryData');
    return saved ? JSON.parse(saved) : [];
  });
  const [toast, setToast] = useState<Toast | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [insucessosMap, setInsucessosMap] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('insucessosMap');
    return saved ? JSON.parse(saved) : {};
  });
  const [originalInsucessos, setOriginalInsucessos] = useState<Record<string, number>>({});
  const [batchRoute, setBatchRoute] = useState<string>('');
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DeliveryData;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('all');
  const [expandedRegions, setExpandedRegions] = useState<Record<string, boolean>>({
    SP: false,
    RJ: false,
    DAFITI: false,
    ALL: false
  });
  const [regionSummaries, setRegionSummaries] = useState<Record<string, RegionSummary>>({
    SP: { totalRecebido: 0, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0, isEditing: false },
    RJ: { totalRecebido: 0, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0, isEditing: false },
    DAFITI: { totalRecebido: 0, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0, isEditing: false },
    ALL: { totalRecebido: 0, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0, isEditing: false }
  });

  const [driversWithoutRegion, setDriversWithoutRegion] = useState<DriverRegion[]>([]);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [tempProcessedData, setTempProcessedData] = useState<DeliveryData[]>([]);

  const [newDriver, setNewDriver] = useState({
    motorista: '',
    totalPedido: '',
    regiao: 'SP',
    data: new Date()
  });

const handlePrint = useCallback(() => {
  const element = document.getElementById('print-content');
  if (element) {
    // Garantir que não há margens, preenchimentos ou bordas extras no conteúdo da captura
    element.style.margin = '0';
    element.style.padding = '0';
    element.style.border = 'none';
    element.style.backgroundColor = 'transparent'; // Garantir fundo transparente

    // Encontrar todas as linhas da tabela
    const rows = element.querySelectorAll('tr');
    
    // Encontrar o índice da coluna com o nome "Ações"
    const headerCells = rows[0].querySelectorAll('th');
    let actionsColumnIndex = -1;
    
    headerCells.forEach((cell, index) => {
      if (cell.textContent.trim() === 'Ações') {
        actionsColumnIndex = index;
      }
    });

    // Se a coluna "Ações" for encontrada, remover a célula dessa coluna em todas as linhas
    if (actionsColumnIndex !== -1) {
      rows.forEach(row => {
        const cells = row.querySelectorAll('td, th');
        if (cells[actionsColumnIndex]) {
          cells[actionsColumnIndex].remove();
        }
      });
    }

    

     const width = window.innerWidth; // Largura total da tela
    const height = (element.offsetHeight * width) / element.offsetWidth; // Ajusta a altura proporcional


    // Remover qualquer excessos de margem ou padding no próprio container da imagem
    const rect = element.getBoundingClientRect();
    const contentWidth = rect.width;
    const contentHeight = rect.height;

    // Gerar a imagem JPEG com o conteúdo ajustado
    htmlToImage.toJpeg(element, {
      quality: 1.0,
      width: contentWidth,  // Ajuste a largura conforme o conteúdo
      height: height,
      style: {
        transform: 'scale(1)',  // Não exagerar na escala
      }
    })
    .then((dataUrl) => {
      const link = document.createElement('a');
      link.download = `evolutivo-rotas-${format(new Date(), 'dd-MM-yyyy-HH-mm')}.jpg`;
      link.href = dataUrl;
      link.click();
    });
  }
}, []);



  useEffect(() => {
    if (toast?.countdown > 0) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, countdown: prev.countdown - 1 } : null);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (toast?.countdown === 0) {
      setToast(null);
    }
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('deliveryData', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('insucessosMap', JSON.stringify(insucessosMap));
  }, [insucessosMap]);

  useEffect(() => {
    const newSummaries = {
      SP: { ...regionSummaries.SP, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0 },
      RJ: { ...regionSummaries.RJ, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0 },
      DAFITI: { ...regionSummaries.DAFITI, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0 },
      ALL: { totalRecebido: 0, totalPedidos: 0, entregues: 0, insucessos: 0, percentualEntregas: 0, isEditing: false }
    };

    data.forEach(item => {
      const region = item.regiao;
      const insucessos = insucessosMap[item.id] || 0;
      
      if (region === 'SP' || region === 'RJ' || region === 'DAFITI') {
        newSummaries[region].totalPedidos += item.totalPedido;
        newSummaries[region].entregues += item.entregues;
        newSummaries[region].insucessos += insucessos;
      }
    });

    ['SP', 'RJ', 'DAFITI'].forEach(region => {
      if (region === 'DAFITI') {
        if (newSummaries[region].totalPedidos > 0) {
          newSummaries[region].percentualEntregas = 
            (newSummaries[region].entregues / newSummaries[region].totalPedidos) * 100;
        }
      } else {
        if (newSummaries[region].totalRecebido > 0) {
          newSummaries[region].percentualEntregas = 
            (newSummaries[region].entregues / newSummaries[region].totalRecebido) * 100;
        }
      }
    });

    newSummaries.ALL.totalRecebido = newSummaries.SP.totalRecebido + newSummaries.RJ.totalRecebido;
    newSummaries.ALL.totalPedidos = newSummaries.SP.totalPedidos + newSummaries.RJ.totalPedidos;
    newSummaries.ALL.entregues = newSummaries.SP.entregues + newSummaries.RJ.entregues;
    newSummaries.ALL.insucessos = newSummaries.SP.insucessos + newSummaries.RJ.insucessos;

    if (newSummaries.ALL.totalRecebido > 0) {
      newSummaries.ALL.percentualEntregas = 
        (newSummaries.ALL.entregues / newSummaries.ALL.totalRecebido) * 100;
    }

    setRegionSummaries(newSummaries);
  }, [data, insucessosMap, regionSummaries.SP.totalRecebido, regionSummaries.RJ.totalRecebido]);

  const showToast = (message: string) => {
    setToast({ message, countdown: 3 });
  };

  const handleInsucessosChange = useCallback((id: string, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    if (isNaN(numValue)) return;

    setInsucessosMap(prev => ({
      ...prev,
      [id]: numValue
    }));

    setData(prev => prev.map(item => {
      if (item.id === id) {
        const insucessos = numValue;
        const entregues = item.entregues;
        const pendente = Math.max(0, item.totalPedido - entregues - insucessos);
        
        return {
          ...item,
          pendente,
          percentualEntregas: item.totalPedido ? (entregues / item.totalPedido) * 100 : 0,
          percentualRota: item.totalPedido ? 
            ((item.totalPedido - pendente) / item.totalPedido) * 100 : 0
        };
      }
      return item;
    }));
  }, []);

  const handleRegionSelection = () => {
    const updatedData = tempProcessedData.map(item => {
      const driverRegion = driversWithoutRegion.find(d => d.motorista === item.motorista);
      if (driverRegion) {
        return {
          ...item,
          regiao: driverRegion.regiao
        };
      }
      return item;
    });
    
    setData(prev => [...prev, ...updatedData]);
    setDriversWithoutRegion([]);
    setShowRegionModal(false);
    setTempProcessedData([]);
    showToast('Regiões atualizadas com sucesso!');
  };

  const processExcelData = useCallback((workbook: XLSX.WorkBook) => {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

    const headerRow = jsonData[0] as Record<string, string>;
    let agenteCol = '', veiculoCol = '', inicioCol = '', servicosPrevCol = '', servicosRealizadosCol = '', situacaoCol = '';

    Object.entries(headerRow).forEach(([col, value]) => {
      const normalizedValue = String(value).toLowerCase().trim();
      if (normalizedValue === 'agente') agenteCol = col;
      if (normalizedValue === 'veículo') veiculoCol = col;
      if (normalizedValue === 'início - realizado') inicioCol = col;
      if (normalizedValue === 'serviços - previsto') servicosPrevCol = col;
      if (normalizedValue === 'serviços - realizado') servicosRealizadosCol = col;
      if (normalizedValue === 'situação') situacaoCol = col;
    });

    const processedData: DeliveryData[] = [];
    const driversNoRegion: DriverRegion[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, any>;
      const motorista = row[agenteCol] || '';
      const veiculo = String(row[veiculoCol] || '');
      let regiao = '';
      
      if (DAFITI_DRIVERS.includes(motorista)) {
        regiao = 'DAFITI';
      } else if (veiculo.includes('SP')) {
        regiao = 'SP';
      } else if (veiculo.includes('RJ')) {
        regiao = 'RJ';
      } else {
        if (motorista && !driversNoRegion.some(d => d.motorista === motorista)) {
          driversNoRegion.push({ motorista, regiao: 'SP' });
        }
      }

      const situacao = String(row[situacaoCol] || '');
      
      if (situacao !== 'Cancelada') {
        const totalPedido = Number(row[servicosPrevCol]) || 0;
        const entregues = Number(row[servicosRealizadosCol]) || 0;
        const pendente = totalPedido - entregues;
        const percentualRota = totalPedido > 0 ? ((totalPedido - pendente) / totalPedido) * 100 : 0;
        
        processedData.push({
          id: crypto.randomUUID(),
          data: row[inicioCol] || 'Não Iniciada',
          dataCompleta: row[inicioCol] || '',
          motorista: motorista,
          percentualEntregas: totalPedido ? (entregues / totalPedido) * 100 : 0,
          rotas: '1',
          totalPedido,
          entregues,
          pendente,
          insucessos: 0,
          percentualRota,
          regiao
        });
      }
    }

    if (driversNoRegion.length > 0) {
      setDriversWithoutRegion(driversNoRegion);
      setTempProcessedData(processedData);
      setShowRegionModal(true);
    } else {
      setData(prev => [...prev, ...processedData]);
      showToast('Arquivo importado com sucesso!');
    }
  }, []);

  const processInsuccessFile = useCallback((workbook: XLSX.WorkBook) => {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const u1Value = worksheet['U1']?.v;
    if (!u1Value || typeof u1Value !== 'string' || !u1Value.toLowerCase().includes('agente')) {
      showToast('A coluna U1 deve conter "Agente"');
      return;
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });
    const driverCounts: Record<string, number> = {};
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, any>;
      const driverName = row['U'];
      
      if (driverName) {
        driverCounts[driverName] = (driverCounts[driverName] || 0) + 1;
      }
    }

    setData(prev => prev.map(item => {
      const insucessCount = driverCounts[item.motorista] || 0;
      const newEntregues = Math.max(0, item.entregues - insucessCount);
      const pendente = Math.max(0, item.totalPedido - newEntregues - insucessCount);
      
      return {
        ...item,
        entregues: newEntregues,
        pendente,
        percentualEntregas: item.totalPedido ? (newEntregues / item.totalPedido) * 100 : 0,
        percentualRota: item.totalPedido ? 
          ((item.totalPedido - pendente) / item.totalPedido) * 100 : 0
      };
    }));

    setInsucessosMap(prev => {
      const newMap = { ...prev };
      data.forEach(item => {
        if (driverCounts[item.motorista]) {
          newMap[item.id] = driverCounts[item.motorista];
        }
      });
      return newMap;
    });

    showToast('Insucessos importados com sucesso!');
  }, [data]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        processExcelData(workbook);
      };
      reader.readAsArrayBuffer(file);
    }
  }, [processExcelData]);

  const handleInsuccessFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        processInsuccessFile(workbook);
      };
      reader.readAsArrayBuffer(file);
    }
  }, [processInsuccessFile]);

  const handleAddDriver = () => {
    if (newDriver.motorista) {
      const dataFormatted = format(newDriver.data, 'dd/MM/yyyy HH:mm');
      const totalPedido = newDriver.totalPedido === '' ? 0 : Number(newDriver.totalPedido);
      setData(prev => [...prev, {
        id: crypto.randomUUID(),
        data: dataFormatted,
        dataCompleta: newDriver.data.toISOString(),
        motorista: newDriver.motorista,
        percentualEntregas: 0,
        rotas: '1',
        totalPedido,
        entregues: 0,
        pendente: totalPedido,
        insucessos: 0,
        percentualRota: 0,
        regiao: newDriver.regiao
      }]);
      setNewDriver({
        motorista: '',
        totalPedido: '',
        regiao: 'SP',
        data: new Date()
      });
      setShowAddDriver(false);
    }
  };

  const handleSort = (key: keyof DeliveryData) => {
    setSortConfig({
      key,
      direction: sortConfig?.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const applyBatchRoute = () => {
    if (batchRoute) {
      setData(prev => prev.map(item => {
        if (searchTerm && !item.motorista.toLowerCase().includes(searchTerm.toLowerCase())) {
          return item;
        }
        if (selectedDriver !== 'all' && item.motorista !== selectedDriver) {
          return item;
        }
        if (selectedRegion !== '' && selectedRegion !== 'all' && item.regiao !== selectedRegion) {
          return item;
        }
        return {
          ...item,
          rotas: batchRoute
        };
      }));
      setBatchRoute('');
    }
  };

  const handleDelete = (id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    setShowDeleteConfirm(null);
  };

  const handleEdit = (id: string) => {
    setShowEditConfirm(id);
  };

  const confirmEdit = (id: string) => {
    setShowEditConfirm(null);
    setData(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          isEditing: true,
          originalValues: {
            rotas: item.rotas,
            totalPedido: item.totalPedido,
            entregues: item.entregues
          }
        };
      }
      return item;
    }));
    
    const item = data.find(item => item.id === id);
    if (item) {
      setOriginalInsucessos(prev => ({
        ...prev,
        [id]: insucessosMap[id] || 0
      }));
    }
  };

  const handleSave = (id: string) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, isEditing: false, originalValues: undefined } : item
    ));
  };

  const handleCancelEdit = (id: string) => {
    setData(prev => prev.map(item => {
      if (item.id === id) {
        const originalValues = item.originalValues;
        if (originalValues) {
          return {
            ...item,
            isEditing: false,
            rotas: originalValues.rotas,
            totalPedido: originalValues.totalPedido,
            entregues: originalValues.entregues,
            pendente: originalValues.totalPedido - originalValues.entregues,
            percentualEntregas: originalValues.totalPedido ? 
              (originalValues.entregues / originalValues.totalPedido) * 100 : 0,
            percentualRota: originalValues.totalPedido ? 
              ((originalValues.totalPedido - (originalValues.totalPedido - originalValues.entregues)) / originalValues.totalPedido) * 100 : 0,
            originalValues: undefined
          };
        }
      }
      return item;
    }));

    setInsucessosMap(prev => ({
      ...prev,
      [id]: originalInsucessos[id] || 0
    }));
  };

  const handleFieldChange = (id: string, field: string, value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    if ((field === 'totalPedido' || field === 'entregues') && isNaN(numValue)) return;

    setData(prev => prev.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item };
        const currentInsucessos = insucessosMap[id] || 0;

        if (field === 'totalPedido') {
          const entregues = Math.min(item.entregues, numValue);
          const pendente = Math.max(0, numValue - entregues - currentInsucessos);
          
          updatedItem = {
            ...updatedItem,
            totalPedido: numValue,
            entregues,
            pendente,
            percentualEntregas: numValue ? (entregues / numValue) * 100 : 0,
            percentualRota: numValue ? ((numValue - pendente) / numValue) * 100 : 0
          };
        } else if (field === 'entregues') {
          const entregues = Math.min(numValue, item.totalPedido);
          const pendente = Math.max(0, item.totalPedido - entregues - currentInsucessos);
          
          updatedItem = {
            ...updatedItem,
            entregues,
            pendente,
            percentualEntregas: item.totalPedido ? (entregues / item.totalPedido) * 100 : 0,
            percentualRota: item.totalPedido ? 
              ((item.totalPedido - pendente) / item.totalPedido) * 100 : 0
          };
        } else {
          if (field === 'rotas' && value === '') return item;
          updatedItem[field] = value;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const getPercentageStyle = (percentage: number, type: 'entregas' | 'rotas') => {
    let bgColor, textColor;
    
    if (type === 'entregas') {
      if (percentage >= 98) {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
      } else if (percentage >= 91) {
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
      } else {
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
      }
    } else {
      if (percentage === 100) {
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
      } else if (percentage >= 96) {
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
      } else {
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
      }
    }

    return `${bgColor} ${textColor} rounded-md px-2 py-1 text-center mb-2`;
  };

  const RegionSummaryCard = ({ region, summary }: { region: string, summary: RegionSummary }) => {
    const isExpanded = expandedRegions[region];
    const title = region === 'ALL' ? 'Todas as Regiões' : 
                 region === 'SP' ? 'São Paulo' : 
                 region === 'RJ' ? 'Rio de Janeiro' : 'Dafiti';
    
    if (selectedRegion === '') return null;
    
    if ((selectedRegion === 'all' && region !== 'ALL') || 
        (selectedRegion !== 'all' && selectedRegion !== region)) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="flex items-center cursor-pointer"
            onClick={() => setExpandedRegions(prev => ({ ...prev, [region]: !prev[region] }))}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
          {region !== 'ALL' && !summary.isEditing && (
            <button
              onClick={() => {
                setRegionSummaries(prev => ({
                  ...prev,
                  [region]: { 
                    ...prev[region], 
                    isEditing: true,
                    originalTotalRecebido: prev[region].totalRecebido
                  }
                }));
              }}
              className="text-blue-400 hover:text-blue-600"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {isExpanded && (
          <div className="mt-4">
            {region === 'ALL' ? (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">SP + RJ</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Total De Pedidos Recebido
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {summary.totalRecebido}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Pedidos Expedidos
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {summary.totalPedidos}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Entregues
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {summary.entregues}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Insucessos
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {summary.insucessos}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        % Entregas
                      </label>
                      <div className={`${getPercentageStyle(summary.percentualEntregas, 'entregas')} font-bold`}>
                        {summary.percentualEntregas.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-[#ed5c0e]">Dafiti</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Total Coleta Dafiti
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {regionSummaries.DAFITI.totalPedidos}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Entregues
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {regionSummaries.DAFITI.entregues}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        Insucessos
                      </label>
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {regionSummaries.DAFITI.insucessos}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">
                        % Entregas
                      </label>
                      <div className={`${getPercentageStyle(regionSummaries.DAFITI.percentualEntregas, 'entregas')} font-bold`}>
                        {regionSummaries.DAFITI.percentualEntregas.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    {region === 'DAFITI' ? 'Total Coleta Dafiti' : 'Total De Pedidos Recebido'}
                  </label>
                  {region === 'DAFITI' ? (
                    <div className="p-2 bg-gray-50 rounded text-center font-bold">
                      {summary.totalPedidos}
                    </div>
                  ) : (
                    summary.isEditing ? (
                      <input
                        type="text"
                        className="w-full p-2 border rounded text-center font-bold"
                        value={summary.totalRecebido}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : Number(value);
                          if (!isNaN(numValue)) {
                            setRegionSummaries(prev => ({
                              ...prev,
                              [region]: {
                                ...prev[region],
                                totalRecebido: numValue,
                                percentualEntregas: numValue > 0 ? (prev[region].entregues / numValue) * 100 : 0
                              }
                            }));
                          }
                        }}
                      />
                    ) : (
                      <div className="p-2 bg-gray-50 rounded text-center font-bold">
                        {summary.totalRecebido}
                      </div>
                    )
                  )}
                </div>
                {region !== 'DAFITI' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Pedidos Expedidos
                    </label>
                    <div className="p-2 bg-gray-50 rounded text-center font-bold">
                      {summary.totalPedidos}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Entregues
                  </label>
                  <div className="p-2 bg-gray-50 rounded text-center font-bold">
                    {summary.entregues}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Insucessos
                  </label>
                  <div className="p-2 bg-gray-50 rounded text-center font-bold">
                    {summary.insucessos}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    % Entregas
                  </label>
                  <div className={`${getPercentageStyle(summary.percentualEntregas, 'entregas')} font-bold`}>
                    {summary.percentualEntregas.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
            {region !== 'ALL' && summary.isEditing && (
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => {
                    setRegionSummaries(prev => ({
                      ...prev,
                      [region]: { 
                        ...prev[region], 
                        isEditing: false,
                        originalTotalRecebido: undefined
                      }
                    }));
                  }}
                  className="text-green-500 hover:text-green-700"
                  title="Salvar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setRegionSummaries(prev => ({
                      ...prev,
                      [region]: { 
                        ...prev[region], 
                        isEditing: false,
                        totalRecebido: prev[region].originalTotalRecebido || prev[region].totalRecebido,
                        originalTotalRecebido: undefined
                      }
                    }));
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  let filteredData = data.filter(item => {
    const regionMatch = selectedRegion === '' || selectedRegion === 'all' || item.regiao === selectedRegion;
    const driverMatch = selectedDriver === 'all' || item.motorista === selectedDriver;
    const searchMatch = item.motorista.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       item.regiao.toLowerCase().includes(searchTerm.toLowerCase());
    return regionMatch && driverMatch && searchMatch;
  });

  if (sortConfig) {
    filteredData = [...filteredData].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  const uniqueDrivers = Array.from(
    new Set(
      data
        .filter(item => selectedRegion === '' || selectedRegion === 'all' || item.regiao === selectedRegion)
        .map(item => item.motorista)
    )
  ).sort();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {toast && (
        <div className="fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-50 flex items-center space-x-4">
          <span>{toast.message}</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{toast.countdown}s</span>
            <button
              onClick={() => setToast(null)}
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-[1920px] mx-auto">
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-[#ed5c0e] mb-2">Evolutivo de Rotas R2PP</h1>
              <p className="text-gray-600">Importe, gerencie e acompanhe a evolução das entregas dos motoristas</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </button>
              <label className="inline-flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer text-sm">
                <Upload className="w-4 h-4 mr-1" />
                Novo arquivo
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <label className="inline-flex items-center px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg cursor-pointer text-sm">
                <FileWarning className="w-4 h-4 mr-1" />
                Importar Insucessos
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleInsuccessFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setShowAddDriver(true)}
                className="inline-flex items-center px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Motorista
              </button>
              <button
                onClick={() => {
                  setData([]);
                  setInsucessosMap({});
                }}
                className="inline-flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
              >
                <Trash2 className="w-4 h-4  mr-1" />
                Limpar
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2 bg-white border rounded-lg p-3">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="flex-1 border-none focus:ring-0 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 bg-white border rounded-lg p-3">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="flex-1 border-none focus:ring-0 text-sm"
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedDriver('all');
                }}
              >
                <option value="">Selecione uma região</option>
                <option value="all">Todas Regiões</option>
                <option value="SP">São Paulo (SP)</option>
                <option value="RJ">Rio de Janeiro (RJ)</option>
                <option value="DAFITI">Dafiti</option>
              </select>
            </div>

            <div className="flex items-center space-x-2 bg-white border rounded-lg p-3">
              <UserPlus className="w-4 h-4 text-gray-400" />
              <select
                className="flex-1 border-none focus:ring-0 text-sm"
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
              >
                <option value="all">Selecionar motorista</option>
                {uniqueDrivers.map(driver => (
                  <option key={driver} value={driver}>{driver}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2 lg:col-span-2">
              <input
                type="text"
                placeholder="Digite a rota para aplicar em lote"
                className="flex-1 p-3 border rounded-lg text-sm"
                value={batchRoute}
                onChange={(e) => setBatchRoute(e.target.value)}
              />
              <button
                onClick={applyBatchRoute}
                className="inline-flex items-center px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm"
              >
                <Check className="w-4 h-4 mr-1" />
                Aplicar
              </button>
            </div>
          </div>
        </div>

        <div id="print-content">
          {selectedRegion !== '' && (
            <>
              <RegionSummaryCard region="ALL" summary={regionSummaries.ALL} />
              {selectedRegion !== 'all' && (
                <>
                  <RegionSummaryCard region="SP" summary={regionSummaries.SP} />
                  <RegionSummaryCard region="RJ" summary={regionSummaries.RJ} />
                  <RegionSummaryCard region="DAFITI" summary={regionSummaries.DAFITI} />
                </>
              )}
            </>
          )}

          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#ed5c0e] text-white">
                  <tr>
                    {[
                      { key: 'motorista', label: 'Motorista' },
                      { key: 'percentualEntregas', label: '% Entregas' },
                      { key: 'rotas', label: 'Rotas' },
                      { key: 'totalPedido', label: 'Total Pedido' },
                      { key: 'entregues', label: 'Entregues' },
                      { key: 'pendente', label: 'Pendente' },
                      { key: 'insucessos', label: 'Insucessos' },
                      { key: 'percentualRota', label: '% Rota' },
                      { key: 'actions', label: 'Ações' }
                    ].map(({ key, label }, index, array) => (
                      <th
                        key={key}
                        className={`px-4 py-3 text-center text-xs font-bold uppercase tracking-wider cursor-pointer ${
                          index < array.length - 1 ? 'border-r border-orange-400' : ''
                        }`}
                        onClick={() => key !== 'actions' && handleSort(key as keyof DeliveryData)}
                      >
                        <div className="flex items-center justify-center">
                          {label}
                          {key !== 'actions' && (
                            <ArrowUpDown className="w-4 h-4 ml-1" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="font-bold">
                      <td className="px-4 py-3 whitespace-nowrap text-center">{item.motorista}</td>
                      <td className={`${getPercentageStyle(item.percentualEntregas, 'entregas')} text-center my-2`}>
                        {item.percentualEntregas.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {item.isEditing ? (
                          <input
                            type="text"
                            className="w-20 p-1 border rounded text-center mx-auto"
                            value={item.rotas}
                            onChange={(e) => handleFieldChange(item.id, 'rotas', e.target.value)}
                          />
                        ) : item.rotas}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {item.isEditing ? (
                          <input
                            type="text"
                            className="w-24 p-1 border rounded text-center mx-auto"
                            value={item.totalPedido === 0 ? '' : item.totalPedido}
                            onChange={(e) => handleFieldChange(item.id, 'totalPedido', e.target.value)}
                          />
                        ) : item.totalPedido}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {item.isEditing ? (
                          <input
                            type="text"
                            className="w-24 p-1 border rounded text-center mx-auto"
                            value={item.entregues === 0 ? '' : item.entregues}
                            onChange={(e) => handleFieldChange(item.id, 'entregues', e.target.value)}
                          />
                        ) : item.entregues}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">{item.pendente}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {item.isEditing ? (
                          <input
                            type="text"
                            className="w-20 p-1 border rounded text-center mx-auto"
                            value={insucessosMap[item.id] === 0 ? '' : (insucessosMap[item.id] || '')}
                            onChange={(e) => handleInsucessosChange(item.id, e.target.value)}
                          />
                        ) : (
                          insucessosMap[item.id] || 0
                        )}
                      </td>
                      <td className={`${getPercentageStyle(item.percentualRota, 'rotas')} text-center`}>
                        {item.percentualRota.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex space-x-2 justify-center">
                          {item.isEditing ? (
                            <>
                              <button
                                onClick={() => handleSave(item.id)}
                                className="text-green-500 hover:text-green-700"
                                title="Salvar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelEdit(item.id)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(item.id)}
                                className="text-blue-400 hover:text-blue-600"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(item.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showAddDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Adicionar Motorista</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Motorista
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={newDriver.motorista}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, motorista: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Pedido
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded"
                  value={newDriver.totalPedido}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, totalPedido: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Região
                </label>
                <select
                  className="w-full p-2 border rounded"
                  value={newDriver.regiao}
                  onChange={(e) => setNewDriver(prev => ({ ...prev, regiao: e.target.value }))}
                >
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="DAFITI">Dafiti</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data e Hora
                </label>
                <DatePicker
                  selected={newDriver.data}
                  onChange={(date) => setNewDriver(prev => ({ ...prev, data: date || new Date() }))}
                  showTimeInput
                  timeInputLabel="Hora:"
                  dateFormat="dd/MM/yyyy HH:mm:ss"
                  timeFormat="HH:mm:ss"
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAddDriver(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDriver}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">Confirmar Exclusão</h2>
            <p className="mb-4">Tem certeza que deseja excluir este registro?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-w-[90%]">
            <h2 className="text-xl font-bold mb-4 text-center">Confirmação de Edição</h2>
            <p className="mb-6 text-center text-gray-700">
              Tem certeza de que deseja alterar esses dados? Recomendamos importar para maior assertividade.
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => confirmEdit(showEditConfirm)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Sim, Desejo
              </button>
              <button
                onClick={() => setShowEditConfirm(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Não, Vou importar
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px] max-w-[90vw]">
            <h2 className="text-xl font-bold mb-6 text-center">Selecione a Região dos Motoristas</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {driversWithoutRegion.map((driver, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">{driver.motorista}</span>
                  <select
                    className="ml-4 p-2 border rounded"
                    value={driver.regiao}
                    onChange={(e) => {
                      const newDrivers = [...driversWithoutRegion];
                      newDrivers[index].regiao = e.target.value;
                      setDriversWithoutRegion(newDrivers);
                      
                      setTempProcessedData(prev => prev.map(item => {
                        if (item.motorista === driver.motorista) {
                          return {
                            ...item,
                            regiao: e.target.value
                          };
                        }
                        return item;
                      }));
                    }}
                  >
                    <option value="SP">São Paulo</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="DAFITI">Dafiti</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={handleRegionSelection}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;