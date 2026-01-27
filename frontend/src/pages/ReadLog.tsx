import React, { useState, useEffect, useRef } from 'react'
import { Search, Play, ExternalLink, Trash2, Download } from 'lucide-react';
import { saveAs } from "file-saver";


const URL_API = "http://localhost:3001/";

interface Errors { inputBusqueda?: string; inputBuffer?: string; selecTemplate?: string; selectedOption?: string }

export default function ReadLog() {
  const [formData, setFormData] = useState({
    selectedOption: '',
    inputBuffer: '',
    inputBusqueda: '',
    selecTemplate: ''
  });
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isBuffer, setIsBuffer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState(""); // "success" o "error"
  const [toastMessage, setToastMessage] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedText, setSelectedText] = useState("");
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const opcionesTemplate = [
    { id: 1, value: 1, texto: 'Busar por Identificación', filter: ' ' },
    { id: 2, value: 2, texto: 'xmlRequest', filter: '<IdConsultado>?</IdConsultado>' },
    { id: 3, value: 3, texto: 'executeEngine', filter: '[executeEngine] Respuesta: <?xml version=\"1.0\" encoding=\"UTF-8\"?><DecisorResponse><StrategyId>?</StrategyId> && "code=\"?\" error=\"true\""' },
    { id: 4, value: 4, texto: 'RespuestaMotor', filter: 'idEstrategia=? && IdConsultado=?' },
    { id: 5, value: 5, texto: 'Coincidencia Especifica', filter: ' ' },
  ]

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleLogExpansion = (logId: number) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleRemoveItem = (itemToRemove) => {
    setSelectedItems(selectedItems.filter(item => item !== itemToRemove));
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [
      ...prev,
      { ...message, timestamp }
    ]);
    //setLogs(prev => [...prev, `[${timestamp}] ${message.message}`]);
  };

  const handleToast = (toastType, message) => {
    setToastType(toastType)
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 6000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLSelectElement) {
      const value = e.target.options[e.target.selectedIndex].value;
      const text = e.target.options[e.target.selectedIndex].text;
      setSelectedText(text);
      setIsBuffer(value === '1' || value === '5');
    }
    setFormData({
      ...formData,
      [name]: value
    });


    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

  };

  const handleClear = async () => {
    setFormData({ selectedOption: '', inputBuffer: '', inputBusqueda: '', selecTemplate: '' })
    setLogs([]);
    setSelectedItems([]);
  }

  const validarFormulario = () => {
    const newErrors: Errors = {}; // objeto local con la misma forma
    if (!formData.selectedOption) {
      newErrors.selectedOption = 'Debe seleccionar una opción'
    }
    if (!formData.selecTemplate) {
      newErrors.selecTemplate = 'Seleccione una opcion'
    }
    if (!formData.inputBusqueda) {

      newErrors.inputBusqueda = 'Ingrese un parametro de busqueda '
    }
    setErrors(newErrors);

    return newErrors;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true)
    setLogs([]);
    setSelectedItems([]);
    const newErrors = validarFormulario();

    try {

      //debugger;
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      // Convertir el string en arreglo separando por coma
      const arregloBusqueda = formData.inputBusqueda
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n !== ""); // elimina vacíos

      setSelectedItems((prev) => {
        const nuevo = [...prev, ...arregloBusqueda];
        return [...new Set(nuevo)];
      });

      const response = await fetch(URL_API + "read", {
        method: "POST",
        headers: { 'Content-type': 'application/json' },
        body: JSON.stringify({
          radioAmbiente: formData.selectedOption,
          inputBuffer: formData.inputBuffer,
          inputBusqueda: formData.inputBusqueda,
          selecTemplate: formData.selecTemplate,
          selecTemplateText: selectedText,
          opcionesConsulta: arregloBusqueda
        })
      });
      // Leer el stream 
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        setIsProcessing(true);
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        // Procesar solo eventos completos 
        let parts = buffer.split("\n\n");
        // Cada mensaje SSE termina con "\n\n"
        buffer = parts.pop()!;
        for (const line of parts) {
          if (line.startsWith("data:")) {
            try {
              const jsonStr = line.replace(/^data:\s*/, "");
              const json = JSON.parse(jsonStr);
              //console.log("Evento:", json.message, json.type);
              addLog(json);
            } catch (err) {
              console.error("Error parseando JSON:", err, line);
            }
          }
        }
      }
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      //const data = await response.json();
      //debugger;
      /*if(data.code==255){
          setShowDialog(true);
          handleToast("error",`${data.message}`); 
      }*/
    } catch (error) {
      handleToast("error", `Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  function getLogClass(type) {
    switch (type) {
      case "ERROR":
        return "text-red-600 bg-red-50";
      case "info":
        return "text-yellow-700 bg-yellow-50";
      case "INFO":
        return "text-blue-600 bg-blue-50";
      case "server":
        return "text-gray-600 bg-gray-50";
      case "progress":
        return "mb-1 px-2 py-1 rounded";
      default:
        return "text-gray-600 bg-gray-50";
    }
  }

  const handleDownload = () => {
    console.log(logs.length);
    if (logs.length > 0) {
      const contenido = logs.map(log => log.message).join("\n");
      const logFile = new Blob([contenido], { type: "text/plain;charset=utf-8" });
      saveAs(logFile, "SEO_LOG.txt");
    } else {
      handleToast("info", `Info: No hay registros para generar el log`);
    }

  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 mb-0">

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-50 animate-slide-in w-[350px]">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg flex items-start gap-3 border-l-4 
              ${toastType === "success"
                ? "bg-green-50 text-green-800 border-green-600"
                : "bg-red-50 text-red-800 border-red-600"}`}
          >
            {/* Icono */}
            <div className="pt-1">
              {toastType === "success" ? (
                <svg className="w-6 h-6 text-green-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" />   {/* círculo */}
                  <path d="M7 10l2 2 4-4" />                       {/* check */}
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                </svg>
              )}
            </div>

            {/* Texto */}
            <div>
              <div className="font-semibold">
                {toastType === "success" ? "Éxito" : toastType === "info" ? "Info" : "Error"}
              </div>
              <div className="text-sm">{toastMessage}</div>
            </div>
          </div>
        </div>


      )}
      <div className="bg-white rounded-lg shadow-lg p-8 w-3/4  mt-6">
        <div className="mb-6">
          <div className='flex items-center justify-between'>
            <div>
              <h1 className="text-3xl font-bold mb-2">Log Viewer</h1>
              <p className="text-gray-400">Monitor en tiempo real de logs del sistema</p>
            </div>
            <a className='flex items-center gap-2 text-blue-700 hover:text-blue-400 transition-colors'
              href="http://localhost:5173/download"  >
              <span className='text-base'>Descargar Logs</span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* Form busqueda */}
        <form onSubmit={handleSubmit}>
          <div className="bg-gray-800 rounded-lg shadow-xl p-4 mb-4">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Input */}
              <div className="flex-1 min-w-[300px]">
                <div className="flex gap-2 pb-4">
                  <label className="flex items-center gap-2 px-4 py-2">
                    <input
                      type="radio"
                      name="selectedOption"
                      value="DEMO"
                      checked={formData.selectedOption === 'DEMO'}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 cursor-pointer"
                    />
                    <span className="ml-2 text-white">DEMO</span>
                  </label>
                  <label className="flex items-centergap-2 px-4 py-2">
                    <input
                      type="radio"
                      name="selectedOption"
                      value="PROD"
                      checked={formData.selectedOption === 'PROD'}
                      onChange={handleChange}
                      className="w-5 h-5 text-blue-600 cursor-pointer"
                    />
                    <span className="ml-2 text-white">PROD</span>
                  </label>
                </div>
                {errors.selectedOption && (
                  <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                    {errors.selectedOption}
                  </p>
                )}
                <div className="relative pb-4">
                  <select
                    name="selecTemplate"
                    value={formData.selecTemplate}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
                  >
                    <option value="">Seleccione...</option>
                    {opcionesTemplate.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.texto}
                      </option>
                    ))}


                  </select>
                  <div className='flex items-center cursor-pointer col-span-3'>
                    {errors.selecTemplate && (
                      <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                        {errors.selecTemplate}
                      </p>
                    )}
                  </div>
                </div>
                {isBuffer && (
                  <div className="relative pb-4">
                    <input
                      type="text"
                      placeholder="Buffer consulta"
                      name="inputBuffer"
                      value={formData.inputBuffer}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 ${errors.inputBusqueda ? "border-red-500 bg-red-50" : "border-gray-600"}`}
                    />
                    <div className='flex items-center cursor-pointer col-span-3'>
                      {errors.inputBuffer && (
                        <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                          {errors.inputBuffer}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Identificacion"
                    name="inputBusqueda"
                    value={formData.inputBusqueda}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 ${errors.inputBusqueda ? "border-red-500 bg-red-50" : "border-gray-600"}`}
                  />
                  <div className='flex items-center cursor-pointer col-span-3'>
                    {errors.inputBusqueda && (
                      <p className='flex items-center cursor-pointer mt-2 text-red-600'>
                        {errors.inputBusqueda}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {/* Botones */}
              <div className="flex gap-2">
                <button type="submit"
                  className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors text-white
                            ${loading
                      ? "bg-green-600 text-white cursor-not-allowed opacity-50"
                      : "bg-green-600 hover:bg-green-700 text-white hover:shadow-lg"}`}>
                  <Play size={18} />
                  {loading ? 'Procesando...' : 'Buscar'}

                </button>
                <button type="button"
                  onClick={handleClear}
                  className={`flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-700 rounded-lg font-medium transition-colors text-white
                  ${loading
                      ? "bg-red-500 text-white cursor-not-allowed opacity-50"
                      : "bg-red-500 hover:bg-red-700 text-white hover:shadow-lg"}`}>
                  <Trash2 size={18} />
                  Limpiar
                </button>
                <button type="button"
                  onClick={handleDownload}
                  className={`flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-700 rounded-lg font-medium transition-colors text-white
                            ${loading
                      ? "bg-blue-500 text-white cursor-not-allowed opacity-50"
                      : "bg-blue-500 hover:bg-blue-700 text-white hover:shadow-lg"}`}>

                  <Download size={18} />
                  Descargar
                </button>
              </div>

            </div>
            {/* Items seleccionados */}
            <div className="mb-6 pt-3">
              <h2 className="text-sm font-medium text-white mb-3">
                Seleccionados ({selectedItems.length}):
              </h2>
              <div className="min-h-[100px] p-4 bg-gray-50 border border-gray-200 rounded-lg">
                {selectedItems.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    No hay elementos seleccionados
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-200 text-black px-3 py-1 rounded-lg w-[100%]"
                      >
                        <span className="text-sm font-medium">{`[${selectedText}] Id Transaccion :  ${item}`}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                )}
              </div>
            </div>
          </div>

        </form>
        {/* Visual Log */}
        <div
          ref={logContainerRef}
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Registro del Proceso</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-[600px] overflow-y-auto" >
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const isExpanded = expandedLogs.has(index);
                const preview = log.message.length > 150 ? true : false
                const messagePreview = log.message.length > 150
                  ? log.message.substring(0, 120) + '...'
                  : log.message;
                return (
                  <div key={index} className="mb-3">
                    {/* Encabezado clickable */}
                    <div
                      className="flex items-start gap-3 cursor-pointer"
                      onClick={() => toggleLogExpansion(index)}
                    >
                      <span className="mb-1 w-30 shrink-0 px-2 rounded">
                        [{log.timestamp}]

                      </span>
                      {preview ? (
                        <span className="text-gray-500 text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>) : (
                        <span className="text-gray-500 text-xs"></span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${getLogClass(log.type)}`}
                      >
                        {messagePreview}
                      </span>
                    </div>

                    {/* Panel expandido debajo */}
                    {isExpanded && (
                      <div className="px-3">
                        {log.message}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-gray-500 italic">No hay registros disponibles</div>
            )}

            {isProcessing && (
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{loading ? "Procesando..." : "Finalizado"}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}