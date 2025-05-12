import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, Download, Calendar, ArrowUpDown } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';

interface ProcessedData {
  referencia: string;
  ultimaOcorrencia: string;
  dataUltimaOcorrencia: string | null;
  valorNF: string;
  status: string;
}

const DafitiTracker: React.FC = () => {
  const [data, setData] = useState<ProcessedData[]>([]);
  const [error, setError] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{
    key: keyof ProcessedData;
    direction: 'asc' | 'desc';
  } | null>(null);

  const formatDateTime = (dateStr: string | number): string | null => {
    try {
      if (typeof dateStr === 'number') {
        const date = XLSX.SSF.parse_date_code(dateStr);
        const parsedDate = new Date(date.y, date.m - 1, date.d, date.H, date.M);
        return format(parsedDate, 'dd/MM/yyyy HH:mm');
      }

      const parsedDate = parse(dateStr, 'dd/MM/yyyy HH:mm', new Date());
      if (isValid(parsedDate)) {
        return format(parsedDate, 'dd/MM/yyyy HH:mm');
      }

      const isoDate = new Date(dateStr);
      if (isValid(isoDate)) {
        return format(isoDate, 'dd/MM/yyyy HH:mm');
      }

      return null;
    } catch (err) {
      console.error('Error formatting date:', err);
      return null;
    }
  };

  const findColumnIndex = (headers: any[], searchTerms: string[]): number => {
    return headers.findIndex(header => 
      searchTerms.some(term => 
        String(header).toLowerCase().includes(term.toLowerCase())
      )
    );
  };

  const processExcel = async (file: File) => {
    setError('');
    const reader = new FileReader();
    
    reader.onerror = () => {
      setError('Erro ao ler o arquivo. Por favor, tente novamente.');
    };

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          setError('Arquivo vazio ou inválido.');
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const rawData = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: '',
          blankrows: false,
          raw: true
        }) as any[][];

        if (rawData.length < 2) {
          setError('Arquivo não contém dados suficientes.');
          return;
        }

        const headers = rawData[0];
        const referenciaIndex = findColumnIndex(headers, ['referência', 'referencia']);
        const ocorrenciaIndex = findColumnIndex(headers, ['última ocorrência', 'ultima ocorrencia']);
        const dataIndex = findColumnIndex(headers, ['dt. últ. ocorrência', 'data ultima ocorrencia']);
        const servicoIndex = findColumnIndex(headers, ['serviço', 'servico']);
        const valorIndex = findColumnIndex(headers, ['vlr mercadoria']);

        if (referenciaIndex === -1 || ocorrenciaIndex === -1 || dataIndex === -1 || servicoIndex === -1) {
          setError('Colunas necessárias não encontradas na planilha.');
          return;
        }

        const processedData = rawData
          .slice(1)
          .map(row => {
            const formattedDate = formatDateTime(row[dataIndex] || '');
            const ultimaOcorrencia = String(row[ocorrenciaIndex] || '').trim();
            const servico = String(row[servicoIndex] || '').trim();
            const referencia = String(row[referenciaIndex] || '').trim();
            const valorNFBruto = String(row[valorIndex] || '').trim();

            const valorNumerico = parseFloat(valorNFBruto.replace(',', '.'));
            const valorNF = isNaN(valorNumerico)
              ? 'R$ 0,00'
              : valorNumerico.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                });

            return {
              referencia,
              ultimaOcorrencia,
              dataUltimaOcorrencia: formattedDate,
              valorNF,
              status: 'Pendentes'
            };
          })
          .filter(row => 
            row.referencia && 
            row.dataUltimaOcorrencia && 
            (row.ultimaOcorrencia === 'Recebido na Base' || 
             row.ultimaOcorrencia === 'Coletado' ||
             row.ultimaOcorrencia === 'Romaneio em Transferencia')
          );

        if (processedData.length === 0) {
          setError('Nenhum dado encontrado com os critérios especificados.');
          return;
        }

        setData(processedData);
      } catch (err) {
        console.error('Error processing Excel file:', err);
        setError('Erro ao processar o arquivo. Verifique se o formato está correto.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleStatusChange = (referencia: string, newStatus: string) => {
    setData(data.map(item => 
      item.referencia === referencia ? { ...item, status: newStatus } : item
    ));
  };

  const exportToExcel = () => {
    try {
      const exportData = data.map(item => ({
        Referência: item.referencia,
        'Última Ocorrência': item.ultimaOcorrencia,
        'Data Última Ocorrência': item.dataUltimaOcorrencia,
        'Valor NF': item.valorNF,
        Status: item.status
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Dados Processados");
      XLSX.writeFile(wb, "dados_filtrados.xlsx");
    } catch (err) {
      setError('Erro ao exportar o arquivo.');
      console.error('Error exporting to Excel:', err);
    }
  };

  const handleSort = (key: keyof ProcessedData) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      if (key === 'dataUltimaOcorrencia') {
        const dateA = a[key] ? new Date(a[key]!).getTime() : 0;
        const dateB = b[key] ? new Date(b[key]!).getTime() : 0;
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setData(sortedData);
  };

  return (
    <div className="bg-white shadow-md p-6 min-h-screen w-full">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Sistema Dafiti</h2>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-[#ed5c0e] text-white px-4 py-2 rounded hover:bg-[#d45509] transition-colors">
            <FileUp size={20} />
            Importar XLSX
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && processExcel(e.target.files[0])}
            />
          </label>
        </div>

        {data.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
          >
            <Download size={20} />
            Exportar XLSX
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#ed5c0e] text-white font-bold">
              <tr>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider cursor-pointer hover:bg-[#d45509] transition-colors" onClick={() => handleSort('referencia')}>
                  <div className="flex items-center gap-2">
                    Referência
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider cursor-pointer hover:bg-[#d45509] transition-colors" onClick={() => handleSort('ultimaOcorrencia')}>
                  <div className="flex items-center gap-2">
                    Última Ocorrência
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider cursor-pointer hover:bg-[#d45509] transition-colors" onClick={() => handleSort('dataUltimaOcorrencia')}>
                  <div className="flex items-center gap-2">
                    Data Última Ocorrência
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider cursor-pointer hover:bg-[#d45509] transition-colors" onClick={() => handleSort('valorNF')}>
                  <div className="flex items-center gap-2">
                    Valor NF
                    <ArrowUpDown size={16} />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-sm uppercase tracking-wider cursor-pointer hover:bg-[#d45509] transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-2">
                    Status
                    <ArrowUpDown size={16} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => (
                <tr key={row.referencia}>
                  <td className="px-6 py-4 whitespace-nowrap">{row.referencia}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{row.ultimaOcorrencia}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{row.dataUltimaOcorrencia}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{row.valorNF}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={row.status}
                      onChange={(e) => handleStatusChange(row.referencia, e.target.value)}
                      className="border rounded px-2 py-1"
                    >
                      <option value="Pendentes">Pendentes</option>
                      <option value="Resolvido">Resolvido</option>
                      <option value="Extraviado">Extraviado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DafitiTracker;