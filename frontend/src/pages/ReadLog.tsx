import React, { useState } from 'react'
import { Search, Play, Pause, Trash2, Download } from 'lucide-react';


export default function ReadLog() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const addLog = (message) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 mb-0">
      {/* Process */}
      
      <div className="bg-white rounded-lg shadow-lg p-8 w-3/4  mt-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-0">Visor de Log</h2>
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            -ads
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar en logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
            />
          </div>
        </div>
      </div>
      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="mb-1">
              {log}
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-center space-x-2 mt-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>
                {loading ? 'Procesando...' : 'Finalizado'}
            </span>
          </div>
        )}
      </div>
    </div>
    
  );
}

