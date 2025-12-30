import React, { useState, useEffect } from 'react';
import { useGitHub } from '../hooks/useGithub';

const Inventory = ({ user, inventoryData, setInventoryData }) => {
    const { updateInventory, saveLog, loading } = useGitHub();

    // Estado inicial con todos tus campos
    const initialFormState = {
        serie: '', n_item: '', operador: '', unidad_negocio: '', zona: '',
        provincia: '', distrito: '', direccion: '', sede: '', piso: '',
        area: '', subarea: '', categoria: 'Impresora', tecnologia: 'Laser',
        marca: 'HP', color: 'Negro', modelo: '', uso: 'Produccion',
        criticidad: 'Media', ip: '', print_server: '', servicio: 'Activo'
    };

    const [formData, setFormData] = useState(initialFormState);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // LOGICA DE BÚSQUEDA LOCAL: Se dispara cuando cambia la serie
    useEffect(() => {
        // Solo buscamos si NO estamos mostrando sugerencias (evita re-render al seleccionar)
        if (!showSuggestions && formData.serie.trim().length > 2) {
            const found = inventoryData.find(
                (item) => item.serie.toLowerCase() === formData.serie.toLowerCase()
            );

            if (found) {
                // Si existe, cargamos todos sus datos
                setFormData(found);
            }
            // NOTA: Quitamos el 'else reset' porque molestaba al escribir
        }
    }, [formData.serie, inventoryData, showSuggestions]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === 'serie') {
            if (value.length > 0) {
                const matches = inventoryData.filter(item =>
                    item.serie.toLowerCase().includes(value.toLowerCase())
                );
                setSuggestions(matches);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        }
    };

    const handleSelectSuggestion = (item) => {
        setFormData(item);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSave = async () => {
        if (!formData.serie) return alert("Por favor, ingrese la Serie.");

        // Helper para obtener el siguiente ID
        const getNextId = (list) => {
            const max = list.reduce((max, item) => Math.max(max, parseInt(item.n_item) || 0), 0);
            return (max + 1).toString();
        };

        // ==========================================
        // LÓGICA DE REEMPLAZO
        // ==========================================
        if (formData.uso === 'Reemplazo') {
            if (!formData.serieReemplazo || formData.serieReemplazo.trim() === '') {
                return alert("⚠️ Has seleccionado 'Reemplazo'. Por favor, ingresa la SERIE del equipo NUEVO.");
            }

            // 1. Preparamos el equipo VIEJO (Actual)
            const oldItem = {
                ...formData,
                serieReemplazo: undefined, // No guardamos este campo temporal en el JSON final del viejo
                operador_registro: user,
                fecha_modificacion: new Date().toLocaleString()
            };

            // 2. Preparamos el equipo NUEVO (Clonado)
            // Calculamos nuevo ID
            const newId = getNextId(inventoryData);

            const newItem = {
                ...formData,
                serie: formData.serieReemplazo, // La nueva serie
                n_item: newId, // Nuevo ID autoincrementable
                uso: 'Produccion', // Estado automático
                serieReemplazo: undefined, // Limpiamos campo temporal
                operador_registro: user,
                fecha_modificacion: new Date().toLocaleString()
            };

            // 3. Enviamos AMBOS a GitHub
            const success = await updateInventory([oldItem, newItem]);

            if (success) {
                // Generar logs para ambos eventos
                await saveLog({
                    usuario: user,
                    fecha: new Date().toLocaleString(),
                    accion: 'Reemplazo',
                    serie: oldItem.serie,
                    detalle: `Equipo reemplazado por: ${newItem.serie}`
                });

                await saveLog({
                    usuario: user,
                    fecha: new Date().toLocaleString(),
                    accion: 'Creación (Reemplazo)',
                    serie: newItem.serie,
                    detalle: `Registro creado automáticamente al reemplazar a ${oldItem.serie} (ID: ${newId})`
                });

                // Actualizamos estado local
                const updatedList = [...inventoryData];

                // Actualizamos viejo
                const indexOld = updatedList.findIndex(item => item.serie === oldItem.serie);
                if (indexOld !== -1) updatedList[indexOld] = oldItem;
                else updatedList.push(oldItem);

                // Agregamos nuevo
                updatedList.push(newItem);

                setInventoryData(updatedList);

                // Limpiamos form y cargamos el NUEVO para que el usuario siga trabajando en él si quiere
                setFormData(newItem);
                alert(`✅ Reemplazo exitoso.\n\n1. Equipo ${oldItem.serie} marcado como "Reemplazo".\n2. Equipo ${newItem.serie} creado como "Produccion" (ID: ${newId}).`);
            } else {
                alert("❌ Error al sincronizar con GitHub");
            }
            return; // Terminamos aquí el flujo de reemplazo
        }

        // ==========================================
        // FLUJO NORMAL (Edición / Creación simple)
        // ==========================================

        // Agregamos metadata del operador actual
        let dataToSave = {
            ...formData,
            operador_registro: user,
            fecha_modificacion: new Date().toLocaleString()
        };

        // Si es creación (no existe item previo), asignamos nuevo ID
        const previousItem = inventoryData.find(item => item.serie === formData.serie);
        if (!previousItem) {
            const nextId = getNextId(inventoryData);
            dataToSave.n_item = nextId;
        }

        const success = await updateInventory(dataToSave);

        if (success) {
            // --- LOGICA DE LOGS ---
            // previousItem ya está definido arriba
            let changes = [];

            if (!previousItem) {
                changes.push("Creación de nuevo registro");
            } else {
                // Comparamos campo por campo
                Object.keys(formData).forEach(key => {
                    if (key !== 'fecha_modificacion' && key !== 'operador_registro' && key !== 'serieReemplazo' && formData[key] !== previousItem[key]) {
                        changes.push(`Cambio en ${key}: '${previousItem[key]}' -> '${formData[key]}'`);
                    }
                });
            }

            if (changes.length > 0) {
                saveLog({
                    usuario: user,
                    fecha: new Date().toLocaleString(),
                    accion: previousItem ? 'Edición' : 'Creación',
                    serie: formData.serie,
                    detalle: changes.join(' | ')
                });
            }
            // ----------------------

            // Actualizamos la lista local para futuras búsquedas sin recargar
            const updatedList = [...inventoryData];
            const index = updatedList.findIndex(item => item.serie === formData.serie);
            if (index !== -1) updatedList[index] = dataToSave;
            else updatedList.push(dataToSave);

            setInventoryData(updatedList);
            alert("✅ Registro guardado y sincronizado con GitHub");
        } else {
            alert("❌ Error al sincronizar con GitHub");
        }
    };

    return (
        <div className="relative flex flex-col min-h-screen w-full max-w-md mx-auto bg-background-light dark:bg-background-dark shadow-2xl overflow-hidden">
            {/* HEADER */}
            <header className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
                <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-900 dark:text-white">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white flex-1 text-center pr-10">
                    Registro de Inventario
                </h1>
            </header>

            <main className="flex-1 flex flex-col w-full pb-32 overflow-y-auto no-scrollbar">

                {/* SECCIÓN: IDENTIFICACIÓN */}
                <div className="px-5 pt-6 pb-2">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-primary">qr_code_scanner</span>
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Identificación</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 relative z-50">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Serie (Serial Number)</label>
                            <input
                                name="serie"
                                value={formData.serie}
                                onChange={handleChange}
                                autoComplete="off"
                                className="w-full bg-white dark:bg-surface-dark border-2 border-primary/50 focus:border-primary rounded-xl px-4 py-3.5 text-lg font-semibold text-slate-900 dark:text-white outline-none shadow-sm transition-all"
                                placeholder="Ingrese serie"
                                type="text"
                                autoFocus
                            />
                            {/* SUGGESTIONS DROPDOWN */}
                            {showSuggestions && suggestions.length > 0 && (
                                <ul className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 animate-in fade-in slide-in-from-top-2">
                                    {suggestions.map((item, index) => (
                                        <li
                                            key={index}
                                            onClick={() => handleSelectSuggestion(item)}
                                            className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-700 transition-colors flex flex-col"
                                        >
                                            <span className="font-bold text-slate-900 dark:text-white">{item.serie}</span>
                                            <span className="text-xs text-slate-500">{item.marca} - {item.modelo}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 mx-5 my-4"></div>

                {/* SECCIÓN: UBICACIÓN */}
                <div className="px-5 py-2">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-slate-400">location_on</span>
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Ubicación</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Unidad de Negocio</label>
                            <select name="unidad_negocio" value={formData.unidad_negocio} onChange={handleChange} className="w-full bg-white dark:bg-surface-dark border border-slate-200 rounded-xl px-4 py-3 outline-none">
                                <option value="">Seleccionar...</option>
                                <option>AUNA IDEAS</option>
                                <option>CLINICA BELLAVISTA S.A.C.</option>
                                <option>CLINICA MIRAFLORES S.A.</option>
                                <option>CLINICA VALLE SUR S.A.</option>
                                <option>CONSORCIO TRECCA S.A.C.</option>
                                <option>GSP SERVICIOS COMERCIALES S.A.C.</option>
                                <option>GSP SERVICIOS GENERALES S.A.C.</option>
                                <option>GSP TRUJILLO S.A.C.</option>
                                <option>MEDIC SER S.A.C.</option>
                                <option>ONCOCENTER PERU S.A.C.</option>
                                <option>ONCOGENOMICS S.A.C</option>
                                <option>ONCOSALUD S.A.C.</option>
                                <option>R Y R PATOLOGOS S.A.C.</option>
                                <option>SERVIMEDICOS S.A.C.</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Sede</label>
                                <input name="sede" value={formData.sede} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" type="text" placeholder="Sede Central" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Provincia</label>
                                <input name="provincia" value={formData.provincia} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" type="text" placeholder="Lima" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Distrito</label>
                                <input name="distrito" value={formData.distrito} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" type="text" placeholder="Miraflores" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Piso</label>
                                <input name="piso" value={formData.piso} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" type="text" placeholder="3" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Dirección</label>
                            <input name="direccion" value={formData.direccion} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" type="text" placeholder="Av. Principal 123" />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 mx-5 my-4"></div>

                {/* SECCIÓN: DETALLES DEL EQUIPO */}
                <div className="px-5 py-2">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-slate-400">devices</span>
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Detalles del Equipo</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Categoría</label>
                                <select name="categoria" value={formData.categoria} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none">
                                    <option>Impresora</option>
                                    <option>Scanner</option>
                                    <option>Matricial</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Tecnología</label>
                                <select name="tecnologia" value={formData.tecnologia} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none">
                                    <option>Laser</option>
                                    <option>Inyección de Tinta</option>
                                    <option>Matricial</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Marca</label>
                                <select name="marca" value={formData.marca} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none">
                                    <option>HP</option>
                                    <option>Epson</option>
                                    <option>Fujitsu</option>
                                    <option>Kodak</option>
                                    <option>Zebra</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-slate-600">Color / Modelo</label>
                                <input name="modelo" value={formData.modelo} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" type="text" placeholder="M428fdw" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800 mx-5 my-4"></div>

                {/* SECCIÓN: ESTADO & RED */}
                {/* SECCIÓN: ESTADO & RED */}
                <div className="px-5 py-2 mb-10">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-slate-400">router</span>
                        <h3 className="text-slate-900 dark:text-white text-lg font-bold">Estado & Red</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-600">Uso</label>
                                <select name="uso" value={formData.uso} onChange={handleChange} className="border border-slate-200 rounded-xl px-2 py-3 text-sm outline-none">
                                    <option>Produccion</option>
                                    <option>Backup</option>
                                    <option>Reemplazo</option>
                                    <option>Retiro</option>
                                    <option>Custodia</option>
                                    <option>Contingencia</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-600">Criticidad</label>
                                <select name="criticidad" value={formData.criticidad} onChange={handleChange} className="border border-slate-200 rounded-xl px-2 py-3 text-sm outline-none">
                                    <option>Alta</option>
                                    <option>Media</option>
                                    <option>Baja</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-600">Servicio</label>
                                <select name="servicio" value={formData.servicio} onChange={handleChange} className="border border-slate-200 rounded-xl px-2 py-3 text-sm outline-none">
                                    <option>Outsourcing</option>
                                    <option>Hpfs</option>
                                </select>
                            </div>
                        </div>

                        {/* CAMPO CONDICIONAL: SERIE DE REEMPLAZO */}
                        {formData.uso === 'Reemplazo' && (
                            <div className="flex flex-col gap-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 animate-in fade-in slide-in-from-top-2">
                                <label className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                    🖨️ Serie del equipo NUEVO (Reemplazo):
                                </label>
                                <input
                                    name="serieReemplazo"
                                    value={formData.serieReemplazo || ''}
                                    onChange={handleChange}
                                    className="border-2 border-blue-400 rounded-xl px-4 py-3 outline-none font-semibold text-slate-900 dark:text-white"
                                    placeholder="Ingrese la serie del nuevo equipo"
                                    autoFocus
                                />
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    * Al guardar, se creará un nuevo registro con esta serie y los datos actuales.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Dirección IP</label>
                            <input name="ip" value={formData.ip} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none font-mono" placeholder="192.168.1.50" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-slate-600">Print Server</label>
                            <input name="print_server" value={formData.print_server} onChange={handleChange} className="border border-slate-200 rounded-xl px-4 py-3 outline-none" placeholder="PRINTSVR01" />
                        </div>
                    </div>
                </div>
            </main>

            {/* BOTÓN GUARDAR (STICKY) */}
            <div className="absolute bottom-0 left-0 w-full bg-white dark:bg-surface-dark border-t border-slate-200 p-4 pb-6 z-10 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`w-full ${loading ? 'bg-slate-400' : 'bg-primary hover:bg-blue-600'} text-white font-semibold text-lg py-3.5 rounded-xl shadow-lg shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
                >
                    <span className="material-symbols-outlined">{loading ? 'sync' : 'save'}</span>
                    {loading ? 'Sincronizando...' : 'Guardar Inventario'}
                </button>
            </div>
        </div>
    );
};

export default Inventory;