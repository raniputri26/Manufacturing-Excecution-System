import React, { useState, useEffect } from 'react';
import api from '../api';
import { Activity, Layers, Play, Square, History, ChevronRight, ChevronLeft, ChevronDown, X, Clock, ArrowRightLeft, Plus, Check } from 'lucide-react';

function Dashboard() {
    const [cellRuns, setCellRuns] = useState([]);
    const [locations, setLocations] = useState([]);
    const [shoeModels, setShoeModels] = useState([]);
    const [selectedCell, setSelectedCell] = useState(null);
    const [history, setHistory] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState(null);
    const [assignModelId, setAssignModelId] = useState('');
    const [loadingAssign, setLoadingAssign] = useState(false);
    const [bomPage, setBomPage] = useState(1);
    const BOM_PER_PAGE = 20;
    const [showHistory, setShowHistory] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState(null);
    const [editingQty, setEditingQty] = useState(null);
    const [loadingUpdate, setLoadingUpdate] = useState(false);
    const [activeZone, setActiveZone] = useState('production');
    const [holdingInventory, setHoldingInventory] = useState([]);
    const [machineHistory, setMachineHistory] = useState([]);
    const [holdingTab, setHoldingTab] = useState('inventory'); // 'inventory' or 'history'
    const [holdingInvPage, setHoldingInvPage] = useState(1);
    const [holdingLogPage, setHoldingLogPage] = useState(1);
    const HOLDING_PER_PAGE = 10;
    const [holdingCardPage, setHoldingCardPage] = useState({});
    const CARD_PER_PAGE = 2;
    const selectedCellIdRef = React.useRef(null);

    useEffect(() => {
        selectedCellIdRef.current = selectedCell?.id;
    }, [selectedCell]);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAll = () => {
        api.get('/cell-runs').then(res => setCellRuns(res.data)).catch(console.error);
        api.get('/locations').then(res => setLocations(res.data.filter(l => l.type === 'Cell'))).catch(console.error);
        api.get('/locations/holding-inventory').then(res => setHoldingInventory(res.data)).catch(console.error);
        api.get('/shoe-models').then(res => setShoeModels(res.data)).catch(console.error);

        if (selectedCellIdRef.current) {
            const currentCell = locations.find(l => l.id === selectedCellIdRef.current) || selectedCell;
            const isHolding = currentCell && /red\s*tag|storing/i.test(currentCell.name);

            if (isHolding) {
                api.get(`/locations/${selectedCellIdRef.current}/machine-history`)
                    .then(res => setMachineHistory(res.data))
                    .catch(() => setMachineHistory([]));
            } else {
                api.get(`/cell-runs/history/${selectedCellIdRef.current}`)
                    .then(res => setHistory(res.data))
                    .catch(() => setHistory([]));
            }
        }
    };

    const getCellRuns = (locationId) => cellRuns.filter(r => r.location_id === locationId);

    const handleSelectCell = async (loc) => {
        setSelectedCell(loc);
        setBomPage(1);
        // Auto-select first run
        const runs = getCellRuns(loc.id);
        setSelectedRunId(runs.length > 0 ? runs[0].id : null);
        setHoldingTab('inventory'); // Reset tab when switching cells

        const isHolding = /red\s*tag|storing/i.test(loc.name);
        if (isHolding) {
            try {
                const res = await api.get(`/locations/${loc.id}/machine-history`);
                setMachineHistory(res.data);
            } catch { setMachineHistory([]); }
        } else {
            try {
                const res = await api.get(`/cell-runs/history/${loc.id}`);
                setHistory(res.data);
            } catch { setHistory([]); }
        }
    };

    const openAssignModal = (loc) => {
        setAssignTarget(loc);
        setAssignModelId('');
        setShowAssignModal(true);
    };

    const handleAssign = async () => {
        if (!assignModelId || !assignTarget) return;
        setLoadingAssign(true);
        try {
            await api.post('/cell-runs/assign', {
                location_id: assignTarget.id,
                shoe_model_id: Number(assignModelId),
            });
            fetchAll();
            setShowAssignModal(false);
            if (selectedCell?.id === assignTarget.id) {
                handleSelectCell(assignTarget);
            }
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Failed to assign'));
        } finally {
            setLoadingAssign(false);
        }
    };

    const handleStopCell = async (cellRunId) => {
        if (!confirm('Stop this model run?')) return;
        try {
            await api.post('/cell-runs/stop', { cell_run_id: cellRunId });
            fetchAll();
            if (selectedCell) {
                handleSelectCell(selectedCell);
            }
        } catch (err) {
            alert('Error: ' + (err.response?.data?.message || 'Failed'));
        }
    };

    const handleUpdateQty = async (reqId, qty) => {
        if (!selectedRunId) return;
        setLoadingUpdate(true);
        try {
            await api.post(`/cell-runs/${selectedRunId}/update-actual`, {
                model_requirement_id: reqId,
                qty_actual: Number(qty)
            });
            setEditingQty(null);
            fetchAll();
        } catch (err) {
            alert('Error updating quantity: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoadingUpdate(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return '-';
        const date = new Date(d);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    const activeCount = cellRuns.length;
    const idleCount = locations.length - activeCount;

    const prodCells = locations.filter(loc => !(/red\s*tag|storing/i.test(loc.name)));
    const holdingZones = locations.filter(loc => /red\s*tag|storing/i.test(loc.name));

    const renderCellCard = (loc, idx) => {
        const runs = getCellRuns(loc.id);
        const isSelected = selectedCell?.id === loc.id;
        const isActive = runs.length > 0;
        return (
            <div
                key={loc.id}
                style={{ animationFillMode: 'both', animationDelay: `${idx * 0.05}s` }}
                onClick={() => handleSelectCell(loc)}
                className={`animate-slide-down-fade relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 group
                ${isSelected
                        ? 'border-marine-500 bg-marine-500 dark:bg-slate-800 dark:border-marine-500 shadow-lg shadow-marine-500/20 dark:shadow-none'
                        : isActive
                            ? 'border-emerald-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-400 dark:hover:border-[#383F57] hover:shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-[#383F57] hover:shadow-md'
                    }`}
            >
                {/* Status indicator */}
                <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />

                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1 transition-colors duration-300">{loc.name}</h3>

                {isActive ? (
                    <>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 transition-colors duration-300">
                            {runs.length === 1
                                ? <>Model: <span className="font-bold text-slate-800 dark:text-white">{runs[0].shoe_model?.name}</span></>
                                : <><span className="font-bold text-slate-800 dark:text-white">{runs.length} models</span> running</>
                            }
                        </p>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full transition-colors duration-300">
                                Running
                            </span>
                            <button
                                onClick={(e) => { e.stopPropagation(); openAssignModal(loc); }}
                                className="text-[10px] bg-marine-100 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400 hover:bg-marine-200 dark:hover:bg-marine-500/30 px-2 py-1 rounded-lg font-bold transition cursor-pointer border-none flex items-center gap-1"
                                title="Add Model"
                            >
                                <Plus className="w-3 h-3" /> Add Model
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mb-3 transition-colors duration-300">No model assigned</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); openAssignModal(loc); }}
                            className="text-xs bg-marine-500 dark:bg-marine-500 text-white hover:bg-marine-500 dark:hover:bg-marine-500 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer border-none flex items-center gap-1"
                        >
                            <Play className="w-3 h-3" /> Assign Model
                        </button>
                    </>
                )}
            </div>
        );
    };

    const renderHoldingCard = (loc, idx) => {
        const machinesInZone = holdingInventory.filter(m => m.location_id === loc.id);
        const isSelected = selectedCell?.id === loc.id;
        const isRepair = /red\s*tag/i.test(loc.name);

        return (
            <div
                key={loc.id}
                style={{ animationFillMode: 'both', animationDelay: `${idx * 0.05}s` }}
                onClick={() => handleSelectCell(loc)}
                className={`flex flex-col animate-slide-down-fade p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 group
                ${isSelected
                        ? 'border-marine-500 bg-marine-500 dark:bg-slate-800 shadow-lg shadow-marine-500/20 dark:shadow-none'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-[#383F57] hover:shadow-md'
                    }`}
            >
                <div className="flex justify-between items-start mb-3">
                    <h3 className={`font-bold text-lg mb-1 transition-colors duration-300 ${isSelected ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{loc.name}</h3>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                        {machinesInZone.length} Machines
                    </div>
                </div>

                <div className="flex-1 pr-1 space-y-3 mt-2">
                    {machinesInZone.length === 0 ? (
                        <div className="text-center py-6 flex flex-col items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                <span className="text-emerald-500 font-bold">✓</span>
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>Empty / No Issues</span>
                        </div>
                    ) : (() => {
                        const cardPage = holdingCardPage[loc.id] || 1;
                        const totalPages = Math.ceil(machinesInZone.length / CARD_PER_PAGE);
                        const paged = machinesInZone.slice((cardPage - 1) * CARD_PER_PAGE, cardPage * CARD_PER_PAGE);
                        return (
                            <>
                                {paged.map(m => (
                                    <div key={m.id} className={`p-4 rounded-xl border ${isSelected ? 'dark:border-slate-600 bg-white/10 border-white/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/50'} text-sm flex flex-col gap-2`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`font-bold truncate max-w-[150px] ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-200'}`}>{m.name}</span>
                                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : isRepair ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20' : 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20'}`}>{isRepair ? 'Temporary' : 'Under Repair'}</span>
                                        </div>
                                        <div className={`text-xs flex items-center gap-1.5 ${isSelected ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                            <span className="opacity-70">From:</span>
                                            <span className={`font-semibold ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{m.from_location?.name || '-'}</span>
                                            <span className="opacity-30 mx-1">•</span>
                                            <Clock className="w-3 h-3 opacity-50" />
                                            <span>{new Date(m.moved_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                        {m.notes && (
                                            <div className={`text-xs mt-1 p-2 rounded-lg ${isSelected ? 'bg-black/20 text-white/90' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
                                                <span className="font-bold opacity-70">Note:</span> {m.notes}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between pt-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setHoldingCardPage(prev => ({ ...prev, [loc.id]: Math.max(1, cardPage - 1) })); }}
                                            disabled={cardPage === 1}
                                            className={`flex items-center gap-0.5 text-xs font-semibold cursor-pointer bg-transparent border-none transition-colors ${isSelected ? 'text-white/70 hover:text-white disabled:text-white/30' : 'text-marine-600 dark:text-marine-400 hover:text-marine-700 disabled:text-slate-300 dark:disabled:text-slate-600'} disabled:cursor-not-allowed`}
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                        </button>
                                        <span className={`text-[10px] font-medium ${isSelected ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>{cardPage}/{totalPages}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setHoldingCardPage(prev => ({ ...prev, [loc.id]: Math.min(totalPages, cardPage + 1) })); }}
                                            disabled={cardPage >= totalPages}
                                            className={`flex items-center gap-0.5 text-xs font-semibold cursor-pointer bg-transparent border-none transition-colors ${isSelected ? 'text-white/70 hover:text-white disabled:text-white/30' : 'text-marine-600 dark:text-marine-400 hover:text-marine-700 disabled:text-slate-300 dark:disabled:text-slate-600'} disabled:cursor-not-allowed`}
                                        >
                                            Next <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        );
    };

    return (
        <div className="font-[family-name:sans-serif] bg-slate-50 dark:bg-slate-950 transition-colors duration-300 h-[100dvh] overflow-y-auto xl:h-[100dvh] xl:overflow-hidden flex flex-col">
            <div className="sticky top-0 z-20 px-5 pt-5 sm:px-8 sm:pt-8 xl:static xl:bg-transparent dark:xl:bg-transparent bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md pb-4 mb-4 xl:pb-0 xl:mb-0 transition-colors duration-300">
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b dark:border-white/10 pb-4 transition-colors duration-300">
                    <div className="flex items-center gap-4 ml-14 sm:ml-16 xl:ml-0 transition-all duration-300">
                        <div className="w-12 h-12 bg-marine-500 dark:bg-marine-500 rounded-2xl flex items-center justify-center shadow-lg">
                            <Activity className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors duration-300">Production Dashboard</h1>
                            <p className="text-slate-500 dark:text-slate-300 text-sm transition-colors duration-300">Cell management & machine allocation monitoring</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center px-4 py-2 bg-emerald-50 dark:bg-emerald-500/20 dark:backdrop-blur-md rounded-xl border border-emerald-100 dark:border-emerald-500/30 transition-colors duration-300">
                            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</div>
                            <div className="text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Active</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                            <div className="text-xl font-black text-slate-500 dark:text-slate-400">{idleCount}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Idle</div>
                        </div>
                    </div>
                </header>

                <div className="flex items-center justify-between xl:mb-4">
                    <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 transition-colors duration-300">
                        <Layers className="w-4 h-4" /> Production Cells
                    </h2>

                    {/* Zone Toggle Switch */}
                    <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-xl">
                        <button
                            onClick={() => setActiveZone('production')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2
                                ${activeZone === 'production'
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Main Production
                        </button>
                        <button
                            onClick={() => setActiveZone('holding')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-2
                                ${activeZone === 'holding'
                                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                                    : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            Red Tag & Storing
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex flex-col xl:flex-row gap-5 items-stretch flex-1 px-5 pb-5 sm:px-8 sm:pb-8 xl:min-h-0">
                {/* Cell Cards Grid */}
                <div className="w-full xl:w-[48%] shrink-0 flex flex-col xl:min-h-0">
                    <div className="xl:overflow-y-auto flex-1 pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>

                        {/* Dynamic Grid based on activeZone */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
                            {activeZone === 'production'
                                ? prodCells.map((loc, idx) => renderCellCard(loc, idx))
                                : holdingZones.map((loc, idx) => renderHoldingCard(loc, idx))
                            }
                        </div>

                    </div>
                </div>

                {/* Detail Panel */}
                <div className="w-full xl:flex-1 flex flex-col xl:min-h-0 min-w-0">
                    {!selectedCell ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-16 text-slate-400 dark:text-slate-400 transition-colors duration-300 flex-1">
                            <ChevronRight className="w-12 h-12 mb-3 opacity-30" />
                            <p className="font-medium text-center">Select a cell from the left to view<br />details and history</p>
                        </div>
                    ) : (() => {
                        const isHoldingZone = /red\s*tag|storing/i.test(selectedCell.name);

                        // Render Special View for Holding Zones
                        if (isHoldingZone) {
                            const machinesInZone = holdingInventory.filter(m => m.location_id === selectedCell.id);
                            const isRepair = /red\s*tag/i.test(selectedCell.name);
                            return (
                                <div className="flex flex-col gap-3 flex-1 min-h-0 animate-in fade-in duration-300">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-4 transition-colors duration-300 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRepair ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                <Layers className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{selectedCell.name}</h2>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{machinesInZone.length} Machines Recorded</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
                                        <div className="px-5 py-4 border-b-2 border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/80 flex items-center gap-2">
                                            <button
                                                onClick={() => setHoldingTab('inventory')}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border-none
                                                    ${holdingTab === 'inventory'
                                                        ? 'bg-marine-500 text-white shadow-md shadow-marine-500/30'
                                                        : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                            >
                                                📦 Inventory
                                            </button>
                                            <button
                                                onClick={() => setHoldingTab('history')}
                                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer border-none
                                                    ${holdingTab === 'history'
                                                        ? 'bg-marine-500 text-white shadow-md shadow-marine-500/30'
                                                        : 'bg-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300'}`}
                                            >
                                                📋 Movement Log
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                                            {holdingTab === 'inventory' ? (
                                                machinesInZone.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center p-16 text-slate-400 dark:text-slate-500 text-center h-full">
                                                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 flex justify-center items-center rounded-full mb-3 border border-slate-100 dark:border-slate-800">
                                                            <Check className="w-8 h-8 text-emerald-400" />
                                                        </div>
                                                        <p className="font-semibold text-lg">Empty / No Issues</p>
                                                        <p className="text-sm mt-1 max-w-xs">There are no machines currently stored or requiring repair in {selectedCell.name}.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                                                            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                                                                <tr>
                                                                    <th className="px-5 py-3 w-40 font-semibold">Machine Name</th>
                                                                    <th className="px-5 py-3 font-semibold">From Cell</th>
                                                                    <th className="px-5 py-3 font-semibold">Date Moved</th>
                                                                    <th className="px-5 py-3 font-semibold">Notes</th>
                                                                    <th className="px-5 py-3 w-28 text-right font-semibold">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                                {machinesInZone.slice((holdingInvPage - 1) * HOLDING_PER_PAGE, holdingInvPage * HOLDING_PER_PAGE).map(m => (
                                                                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                        <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                                                                            {m.name}
                                                                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">{m.qr_code}</div>
                                                                        </td>
                                                                        <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                                                                            {m.from_location?.name || '-'}
                                                                        </td>
                                                                        <td className="px-5 py-4">
                                                                            <div className="flex items-center gap-1.5 opacity-80">
                                                                                <Clock className="w-3.5 h-3.5" />
                                                                                {new Date(m.moved_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-4 italic text-slate-600 dark:text-slate-400">
                                                                            {m.notes ? m.notes : <span className="text-slate-300 dark:text-slate-600 not-italic">-</span>}
                                                                        </td>
                                                                        <td className="px-5 py-4 text-right">
                                                                            <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border ${isRepair ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20'}`}>
                                                                                {isRepair ? 'Temporary' : 'Under Repair'}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {machinesInZone.length > HOLDING_PER_PAGE && (
                                                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                                                                <button onClick={() => setHoldingInvPage(p => Math.max(1, p - 1))} disabled={holdingInvPage === 1} className="flex items-center gap-1 text-sm font-semibold text-marine-600 dark:text-marine-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none transition-colors hover:text-marine-700 dark:hover:text-marine-300">
                                                                    <ChevronLeft className="w-4 h-4" /> Prev
                                                                </button>
                                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Page {holdingInvPage} of {Math.ceil(machinesInZone.length / HOLDING_PER_PAGE)}</span>
                                                                <button onClick={() => setHoldingInvPage(p => Math.min(Math.ceil(machinesInZone.length / HOLDING_PER_PAGE), p + 1))} disabled={holdingInvPage >= Math.ceil(machinesInZone.length / HOLDING_PER_PAGE)} className="flex items-center gap-1 text-sm font-semibold text-marine-600 dark:text-marine-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none transition-colors hover:text-marine-700 dark:hover:text-marine-300">
                                                                    Next <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )
                                            ) : (
                                                machineHistory.length === 0 ? (
                                                    <div className="flex flex-col items-center justify-center p-16 text-slate-400 dark:text-slate-500 text-center h-full">
                                                        <History className="w-8 h-8 opacity-50 mb-3" />
                                                        <p className="font-semibold text-lg">No Activity</p>
                                                        <p className="text-sm mt-1 max-w-xs">There is no recorded machine activity for {selectedCell.name} yet.</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                                                            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] border-b border-slate-100 dark:border-slate-800 uppercase tracking-wider">
                                                                <tr>
                                                                    <th className="px-5 py-3 w-40 font-semibold">Machine Name</th>
                                                                    <th className="px-5 py-3 w-24 font-semibold">Type</th>
                                                                    <th className="px-5 py-3 font-semibold">From / To Cell</th>
                                                                    <th className="px-5 py-3 font-semibold">Date</th>
                                                                    <th className="px-5 py-3 font-semibold">Notes</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                                {machineHistory.slice((holdingLogPage - 1) * HOLDING_PER_PAGE, holdingLogPage * HOLDING_PER_PAGE).map(log => {
                                                                    const isIncoming = log.movement_type === 'IN';
                                                                    return (
                                                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                            <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-200">
                                                                                {log.machine?.name || 'Unknown'}
                                                                            </td>
                                                                            <td className="px-5 py-4">
                                                                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${isIncoming ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 border-red-200/50 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                                                                                    {isIncoming ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
                                                                                    {isIncoming ? 'Incoming' : 'Outbound'}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                                                                                {isIncoming ? (
                                                                                    <>From: <span className="text-slate-500">{log.from_location?.name || '-'}</span></>
                                                                                ) : (
                                                                                    <>To: <span className="text-slate-500">{log.location?.name || '-'}</span></>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-5 py-4">
                                                                                <div className="flex items-center gap-1.5 opacity-80">
                                                                                    <Clock className="w-3.5 h-3.5" />
                                                                                    {new Date(log.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-5 py-4 italic text-slate-600 dark:text-slate-400">
                                                                                {log.notes ? log.notes : <span className="text-slate-300 dark:text-slate-600 not-italic">-</span>}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                        {machineHistory.length > HOLDING_PER_PAGE && (
                                                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                                                                <button onClick={() => setHoldingLogPage(p => Math.max(1, p - 1))} disabled={holdingLogPage === 1} className="flex items-center gap-1 text-sm font-semibold text-marine-600 dark:text-marine-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none transition-colors hover:text-marine-700 dark:hover:text-marine-300">
                                                                    <ChevronLeft className="w-4 h-4" /> Prev
                                                                </button>
                                                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Page {holdingLogPage} of {Math.ceil(machineHistory.length / HOLDING_PER_PAGE)}</span>
                                                                <button onClick={() => setHoldingLogPage(p => Math.min(Math.ceil(machineHistory.length / HOLDING_PER_PAGE), p + 1))} disabled={holdingLogPage >= Math.ceil(machineHistory.length / HOLDING_PER_PAGE)} className="flex items-center gap-1 text-sm font-semibold text-marine-600 dark:text-marine-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none transition-colors hover:text-marine-700 dark:hover:text-marine-300">
                                                                    Next <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        const runs = getCellRuns(selectedCell.id);
                        const activeRun = runs.find(r => r.id === selectedRunId) || runs[0];
                        return (
                            <div className="flex flex-col gap-3 flex-1 min-h-0">
                                {/* Cell Info Header — Compact */}
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-3 transition-colors duration-300">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <h2 className="text-base font-bold text-slate-800 dark:text-white shrink-0">{selectedCell.name}</h2>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {runs.length > 0
                                                    ? <>{runs.length} model{runs.length > 1 ? 's' : ''} running</>
                                                    : 'Idle — no model assigned'
                                                }
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openAssignModal(selectedCell)}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border-none bg-marine-100 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400 hover:bg-marine-200 dark:hover:bg-marine-500/30"
                                            >
                                                <Plus className="w-3 h-3" /> Add Model
                                            </button>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0
                                                ${runs.length > 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                {runs.length > 0 ? 'Active' : 'Idle'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Model Tabs */}
                                {runs.length > 0 && (
                                    <div className="flex items-center gap-1 overflow-x-auto">
                                        {runs.map(r => (
                                            <div
                                                key={r.id}
                                                onClick={() => { setSelectedRunId(r.id); setBomPage(1); }}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-t-xl text-xs font-bold transition-all cursor-pointer border border-b-0 select-none
                                                    ${activeRun?.id === r.id
                                                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800'
                                                        : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-800'
                                                    }`}
                                            >
                                                <span className="truncate max-w-[120px]">{r.shoe_model?.name || 'Model'}</span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStopCell(r.id); }}
                                                    className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition bg-transparent border-none cursor-pointer p-0 ml-1"
                                                    title="Stop this model"
                                                >
                                                    <Square className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* BOM Requirements for selected model */}
                                {activeRun && activeRun.shoe_model?.requirements && activeRun.shoe_model.requirements.length > 0 && (
                                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl rounded-tl-none border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors duration-300 min-h-0 -mt-1">
                                        <div className="px-5 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase tracking-wider">BOM Requirements</h3>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">{activeRun.shoe_model.requirements.length} items</span>
                                            </div>
                                            <button
                                                onClick={() => setShowHistory(!showHistory)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border
                                                    ${showHistory
                                                        ? 'bg-marine-500 dark:bg-marine-500/20 text-white dark:text-marine-400 border-marine-500 dark:border-marine-500/40'
                                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                <History className="w-3.5 h-3.5" />
                                                Run History
                                                {history.length > 0 && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${showHistory ? 'bg-white/20 text-white dark:bg-marine-400/30 dark:text-marine-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{history.length}</span>
                                                )}
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto min-h-0">
                                            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-400">
                                                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-300 text-xs uppercase border-b border-slate-100 dark:border-slate-800">
                                                    <tr>
                                                        <th className="px-5 py-2">Section</th>
                                                        <th className="px-5 py-2">Machine Type</th>
                                                        <th className="px-5 py-2 text-center text-slate-500 dark:text-slate-400">Standard</th>
                                                        <th className="px-5 py-2 text-center font-bold text-marine-600 dark:text-marine-400">Actual</th>
                                                        <th className="px-5 py-2 text-center text-slate-500 dark:text-slate-400">Gap</th>
                                                        <th className="px-5 py-2 text-center w-16 text-slate-500 dark:text-slate-400">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {activeRun.shoe_model.requirements.slice((bomPage - 1) * BOM_PER_PAGE, bomPage * BOM_PER_PAGE).map((req, idx) => {
                                                        const sectionColors = [
                                                            { keyword: 'cutting', bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', dot: 'bg-sky-500' },
                                                            { keyword: 'stitching', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500' },
                                                            { keyword: 'comshare', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500' },
                                                            { keyword: 'assembly', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
                                                            { keyword: 'sewing', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
                                                        ];
                                                        const fallback = { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };
                                                        const sName = (req.section?.name || '').toLowerCase();
                                                        const b = sectionColors.find(c => sName.includes(c.keyword)) || fallback;
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                                <td className="px-5 py-2">
                                                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${b.bg} ${b.text} ${b.border}`}>
                                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`}></span>
                                                                        <span>{req.section?.name || '-'}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-2 font-medium text-slate-800 dark:text-slate-300 text-xs">{req.machine_name || req.machine_type || '-'}</td>
                                                                {(() => {
                                                                    const qtyStandard = req.qty_required || 0;
                                                                    const actualRecord = activeRun.actuals?.find(a => a.model_requirement_id === req.id);
                                                                    const qtyActual = actualRecord ? actualRecord.qty_actual : qtyStandard;
                                                                    const gap = qtyActual - qtyStandard;
                                                                    const gapColor = gap === 0 ? 'text-emerald-500 dark:text-emerald-400' : (gap > 0 ? 'text-blue-500 dark:text-blue-400' : 'text-red-500 dark:text-red-400');
                                                                    const gapText = gap > 0 ? `+${gap}` : gap;
                                                                    const isEditing = editingQty?.reqId === req.id;

                                                                    return (
                                                                        <>
                                                                            <td className="px-5 py-2 text-center font-bold text-slate-500 dark:text-slate-400">{qtyStandard}</td>
                                                                            <td className="px-5 py-2 text-center font-bold text-slate-800 dark:text-white">
                                                                                {isEditing ? (
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        className="w-14 text-center border border-marine-300 dark:border-marine-600 bg-white dark:bg-slate-800 rounded px-1 py-1 text-xs outline-none focus:ring-2 focus:ring-marine-500 dark:text-white transition"
                                                                                        value={editingQty.value}
                                                                                        onChange={e => setEditingQty({ ...editingQty, value: e.target.value })}
                                                                                        autoFocus
                                                                                    />
                                                                                ) : (
                                                                                    qtyActual
                                                                                )}
                                                                            </td>
                                                                            <td className={`px-5 py-2 text-center font-black ${gapColor}`}>{gapText}</td>
                                                                            <td className="px-5 py-2 text-center w-20">
                                                                                {isEditing ? (
                                                                                    <div className="flex gap-1 justify-center">
                                                                                        <button onClick={() => handleUpdateQty(req.id, editingQty.value)} disabled={loadingUpdate} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-500/20 px-2 py-1 rounded cursor-pointer border-none flex-1 font-bold transition-colors flex items-center justify-center">
                                                                                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                                                                        </button>
                                                                                        <button onClick={() => setEditingQty(null)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded cursor-pointer border-none flex-1 font-bold transition-colors flex items-center justify-center">
                                                                                            <span className="text-[10px]">✕</span>
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => setEditingQty({ reqId: req.id, value: qtyActual })}
                                                                                        className="text-slate-400 hover:text-marine-600 dark:text-slate-500 dark:hover:text-marine-400 bg-slate-100 dark:bg-slate-800 hover:bg-marine-100 dark:hover:bg-marine-900 px-2.5 py-1.5 rounded-lg cursor-pointer border-none transition-colors"
                                                                                    >
                                                                                        ✏️
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        {activeRun.shoe_model.requirements.length > BOM_PER_PAGE && (() => {
                                            const totalPages = Math.ceil(activeRun.shoe_model.requirements.length / BOM_PER_PAGE);
                                            return (
                                                <div className="flex items-center justify-between px-5 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02]">
                                                    <button
                                                        onClick={() => setBomPage(p => Math.max(1, p - 1))}
                                                        disabled={bomPage <= 1}
                                                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
                                                    >
                                                        <ChevronLeft className="w-3.5 h-3.5" /> Prev
                                                    </button>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        Page {bomPage} of {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setBomPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={bomPage >= totalPages}
                                                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm"
                                                    >
                                                        Next <ChevronRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}

                                {/* Run History Popup */}
                                {showHistory && (
                                    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
                                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden dark:border dark:border-slate-800" onClick={e => e.stopPropagation()} style={{ animation: 'fadeIn 0.2s ease-out' }}>
                                            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex justify-between items-center">
                                                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                                    <History className="w-4 h-4 text-slate-400" /> Run History — {selectedCell.name}
                                                </h3>
                                                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer bg-transparent border-none">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                                {history.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-8">No previous runs recorded for this cell.</p>
                                                ) : (
                                                    <div className="space-y-0">
                                                        {history.map((h, idx) => (
                                                            <div key={h.id} className="flex items-start gap-4 relative">
                                                                <div className="flex flex-col items-center">
                                                                    <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 border-2 border-white dark:border-slate-900 ring-2 ring-slate-200 dark:ring-slate-800 z-10 mt-1" />
                                                                    {idx < history.length - 1 && <div className="w-0.5 bg-slate-200 dark:bg-slate-800 flex-1 min-h-[40px]" />}
                                                                </div>
                                                                <div className="pb-5 flex-1">
                                                                    <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{h.shoe_model?.name || 'Unknown'}</p>
                                                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                                                        {formatDate(h.created_at)} → {formatDate(h.updated_at)}
                                                                    </p>
                                                                </div>
                                                                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full uppercase mt-1">
                                                                    Completed
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Assign Model Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden dark:border dark:border-slate-800" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex justify-between items-center transition-colors">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Assign Model</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{assignTarget?.name}</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer bg-transparent border-none">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            {getCellRuns(assignTarget?.id).length > 0 && (
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl text-sm text-blue-700 dark:text-blue-400 transition-colors">
                                    ℹ️ This cell already has <strong>{getCellRuns(assignTarget?.id).length} model{getCellRuns(assignTarget?.id).length > 1 ? 's' : ''}</strong> running.
                                    The new model will run <strong>concurrently</strong> alongside existing ones.
                                </div>
                            )}
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Select Shoe Model</label>
                            <select
                                value={assignModelId}
                                onChange={(e) => setAssignModelId(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-marine-500 focus:border-marine-500 outline-none transition text-slate-700 dark:text-slate-300 font-medium"
                            >
                                <option value="">-- Choose a model --</option>
                                {shoeModels.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-6 pt-0 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border-none"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                disabled={!assignModelId || loadingAssign}
                                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-marine-500 dark:bg-marine-500 text-white hover:bg-marine-500 dark:hover:bg-marine-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer border-none flex items-center gap-2"
                            >
                                {loadingAssign ? 'Assigning...' : 'Assign & Start'}
                                <Play className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fadeIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}

export default Dashboard;
