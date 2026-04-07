import React, { useState, useEffect } from 'react';
import api from '../api';
import { Database, Filter, Settings2, Box, Layers, ClipboardList, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Printer, Search, ChevronDown, ChevronsUpDown, Edit, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function MasterData() {
    const [activeTab, setActiveTab] = useState('machines');
    const [machines, setMachines] = useState([]);
    const [models, setModels] = useState([]);
    const [sections, setSections] = useState([]);
    const [requirements, setRequirements] = useState([]);
    const [filterSection, setFilterSection] = useState('All');
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [filterBomType, setFilterBomType] = useState('All');
    const [isBomFilterDropdownOpen, setIsBomFilterDropdownOpen] = useState(false);
    const [filterBomModel, setFilterBomModel] = useState('All');
    const [isBomModelDropdownOpen, setIsBomModelDropdownOpen] = useState(false);

    // Pagination states
    const [machinePage, setMachinePage] = useState(1);
    const machinesPerPage = 100;
    const [modelPage, setModelPage] = useState(1);
    const modelsPerPage = 50;
    const [searchTerm, setSearchTerm] = useState('');

    // Print Modal State
    const [printingMachine, setPrintingMachine] = useState(null);

    // Checkbox Selection State
    const [selectedMachines, setSelectedMachines] = useState(new Set());
    const [bulkPrintMachines, setBulkPrintMachines] = useState([]);

    // Import States
    const [file, setFile] = useState(null);
    const [importType, setImportType] = useState('machines');
    const [status, setStatus] = useState({ type: '', msg: '' });
    const [loading, setLoading] = useState(false);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [editType, setEditType] = useState(''); // 'machines', 'shoe-models', 'sections', 'model-requirements'
    const [editFormData, setEditFormData] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Add Requirement Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({ shoe_model_id: '', section_id: '', machine_name: '', qty_required: 1 });
    const [isAdding, setIsAdding] = useState(false);

    const [availableSheets, setAvailableSheets] = useState([]);
    const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
    const [fetchingSheets, setFetchingSheets] = useState(false);

    // Effects to reset pagination when filtering
    useEffect(() => {
        setMachinePage(1);
    }, [searchTerm, filterSection]);

    useEffect(() => {
        setModelPage(1);
    }, [searchTerm]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        api.get('/machines').then(res => setMachines(res.data)).catch(console.error);
        api.get('/shoe-models').then(res => setModels(res.data)).catch(console.error);
        api.get('/sections').then(res => setSections(res.data)).catch(console.error);
        api.get('/model-requirements').then(res => setRequirements(res.data)).catch(console.error);
    }

    const handleImport = async (e) => {
        e.preventDefault();
        if (!file) return alert('Select file first');

        const formData = new FormData();
        formData.append('file', file);
        if (importType === 'machines') {
            formData.append('sheet_index', selectedSheetIndex);
        }

        setLoading(true);
        setStatus({ type: '', msg: '' });

        try {
            const endpoint = importType === 'machines' ? '/import-machines' : `/import-${importType}`;
            const res = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setStatus({ type: 'success', msg: res.data.message || 'Import successful' });
            fetchData(); // Refresh table data
        } catch (err) {
            setStatus({ type: 'error', msg: err.response?.data?.message || 'Error importing data or endpoint not implemented yet for this type.' });
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        setFile(selectedFile);
        setStatus({ type: '', msg: '' });
        setAvailableSheets([]);
        setSelectedSheetIndex(0);

        if (selectedFile && importType === 'machines') {
            setFetchingSheets(true);
            const formData = new FormData();
            formData.append('file', selectedFile);

            try {
                const res = await api.post('/import-machines/sheets', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setAvailableSheets(res.data.sheets || []);
            } catch (err) {
                setStatus({ type: 'error', msg: 'Failed to read Excel sheets: ' + (err.response?.data?.message || 'Unknown error') });
            } finally {
                setFetchingSheets(false);
            }
        }
    };

    const handlePrintLabel = (machine) => {
        setPrintingMachine(machine);
        setBulkPrintMachines([]);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const toggleSelect = (id) => {
        setSelectedMachines(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const lowerSearch = searchTerm.toLowerCase();
    const filteredMachines = machines.filter(m => {
        const matchSection = filterSection === 'All' || m.type === filterSection;
        const matchSearch = !searchTerm || m.name?.toLowerCase().includes(lowerSearch) || m.qr_code?.toLowerCase().includes(lowerSearch) || m.type?.toLowerCase().includes(lowerSearch);
        return matchSection && matchSearch;
    });

    const toggleSelectAll = () => {
        if (selectedMachines.size === filteredMachines.length) {
            setSelectedMachines(new Set());
        } else {
            setSelectedMachines(new Set(filteredMachines.map(m => m.id)));
        }
    };

    const handleBulkPrint = () => {
        const selected = filteredMachines.filter(m => selectedMachines.has(m.id));
        if (selected.length === 0) return alert('Pilih mesin terlebih dahulu!');
        setPrintingMachine(null);
        setBulkPrintMachines(selected);
        setTimeout(() => {
            window.print();
        }, 400);
    };

    // --- Delete Logic ---
    const handleDelete = async (id, type) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        try {
            await api.delete(`/${type}/${id}`);
            fetchData(); // Refresh list
        } catch (err) {
            alert('Failed to delete item: ' + (err.response?.data?.message || err.message));
        }
    };

    // --- Edit Logic ---
    const openEditModal = (item, type) => {
        setEditType(type);
        setEditingItem(item);

        // Initialize form data based on type
        if (type === 'machines') {
            setEditFormData({ name: item.name, qr_code: item.qr_code, type: item.type || '' });
        } else if (type === 'shoe-models') {
            setEditFormData({ code: item.code, name: item.name, target_capacity: item.target_capacity || 0 });
        } else if (type === 'sections') {
            setEditFormData({ name: item.name });
        } else if (type === 'model-requirements') {
            setEditFormData({
                shoe_model_id: item.shoe_model_id || '',
                section_id: item.section_id || '',
                machine_name: item.machine_name || '',
                qty_required: item.qty_required || 0
            });
        }

        setIsEditModalOpen(true);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            await api.put(`/${editType}/${editingItem.id}`, editFormData);
            setIsEditModalOpen(false);
            fetchData(); // Refresh list
        } catch (err) {
            alert('Failed to update item: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsSaving(false);
        }
    };

    // --- Add Logic ---
    const openAddModal = () => {
        if (activeTab === 'machines') {
            setAddFormData({ name: '', qr_code: '', type: filterSection === 'All' ? '' : filterSection });
        } else if (activeTab === 'models') {
            setAddFormData({ code: '', name: '', target_capacity: 0 });
        } else if (activeTab === 'sections') {
            setAddFormData({ name: '' });
        } else if (activeTab === 'model-requirements') {
            const matchedModel = searchTerm ? models.find(m => m.name?.toLowerCase().includes(searchTerm.toLowerCase())) : null;
            setAddFormData({
                shoe_model_id: matchedModel?.id || '',
                section_id: '',
                machine_name: '',
                qty_required: 1
            });
        }
        setIsAddModalOpen(true);
    };

    const handleAddChange = (e) => {
        const { name, value } = e.target;
        setAddFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        const endpointMap = {
            'machines': 'machines',
            'models': 'shoe-models',
            'sections': 'sections',
            'model-requirements': 'model-requirements'
        };
        try {
            await api.post(`/${endpointMap[activeTab]}`, addFormData);
            setIsAddModalOpen(false);
            fetchData();
        } catch (err) {
            alert('Failed to add item: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsAdding(false);
        }
    };

    const tabs = [
        { id: 'machines', label: 'Machines', icon: Settings2 },
        { id: 'models', label: 'Shoe Models', icon: Box },
        { id: 'sections', label: 'Sections', icon: Layers },
        { id: 'bom', label: 'BOM / Requirements', icon: ClipboardList },
        { id: 'import', label: 'Import Data', icon: Upload },
    ];

    // Color-code type/section badges by keyword matching (case-insensitive)
    const sectionColorMap = [
        { keyword: 'cutting', bg: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-400', border: 'border-sky-200 dark:border-sky-500/20', dot: 'bg-sky-500' },
        { keyword: 'stitching', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500' },
        { keyword: 'comshare', bg: 'bg-violet-50 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-500/20', dot: 'bg-violet-500' },
        { keyword: 'assembly', bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
        { keyword: 'sewing', bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-500/20', dot: 'bg-emerald-500' },
    ];
    const defaultBadge = { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700', dot: 'bg-slate-400' };
    const getTypeBadge = (type) => {
        if (!type) return defaultBadge;
        const lower = type.toLowerCase();
        return sectionColorMap.find(c => lower.includes(c.keyword)) || defaultBadge;
    };

    return (
        <div className="p-4 pb-20 sm:p-6 font-[family-name:sans-serif] min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Single Print Label (CSS Print Only) */}
            {printingMachine && (
                <div className="print-only fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-10 font-[family-name:sans-serif]">
                    <div className="border-4 border-black p-8 rounded-2xl flex flex-col items-center max-w-lg w-full">
                        <h1 className="text-3xl font-black mb-6 text-center">{printingMachine.name}</h1>
                        <div className="bg-white p-4 border-2 border-slate-200 rounded-xl mb-6">
                            <QRCode value={printingMachine.qr_code} size={256} level="H" />
                        </div>
                        <p className="text-2xl font-mono font-bold tracking-widest">{printingMachine.qr_code}</p>
                        <p className="text-lg mt-4 text-slate-500 font-semibold">{printingMachine.type}</p>
                    </div>
                </div>
            )}

            {/* Bulk Print Labels (CSS Print Only) - 20 per A4 page */}
            {bulkPrintMachines.length > 0 && (() => {
                // Chunk into groups of 20
                const pages = [];
                for (let i = 0; i < bulkPrintMachines.length; i += 20) {
                    pages.push(bulkPrintMachines.slice(i, i + 20));
                }
                return (
                    <div className="print-only fixed inset-0 bg-white z-[9999] font-[family-name:sans-serif]">
                        {pages.map((page, pageIdx) => (
                            <div key={pageIdx} className="bulk-print-grid">
                                {page.map((m) => (
                                    <div key={m.id} className="bulk-label">
                                        <div className="label-name">{m.name}</div>
                                        <div className="label-qr">
                                            <QRCode value={m.qr_code} size={80} level="H" />
                                        </div>
                                        <div className="label-code">{m.qr_code}</div>
                                        <div className="label-type">{m.type}</div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                );
            })()}

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm;
                    }
                    body * { visibility: hidden; }
                    .print-only, .print-only * { visibility: visible; }
                    .print-only { position: absolute; left: 0; top: 0; width: 100%; height: 100%; }
                    .no-print { display: none !important; }

                    .bulk-print-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        grid-template-rows: repeat(5, 1fr);
                        gap: 4px;
                        width: 100%;
                        height: 100%;
                        box-sizing: border-box;
                        page-break-after: always;
                    }
                    .bulk-label {
                        border: 1px solid #444;
                        border-radius: 4px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 3px 2px;
                        text-align: center;
                        overflow: hidden;
                    }
                    .label-name {
                        font-size: 7pt;
                        font-weight: 800;
                        line-height: 1.1;
                        margin-bottom: 3px;
                        word-break: break-word;
                    }
                    .label-qr {
                        padding: 2px;
                    }
                    .label-code {
                        font-size: 5.5pt;
                        font-family: monospace;
                        font-weight: 600;
                        margin-top: 3px;
                        word-break: break-all;
                    }
                    .label-type {
                        font-size: 5.5pt;
                        color: #555;
                        margin-top: 2px;
                    }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>

            <header className="mb-6 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-4 ml-14 sm:ml-16 xl:ml-0 transition-all duration-300">
                        <div className="w-12 h-12 bg-marine-500 dark:bg-marine-500 rounded-2xl flex items-center justify-center shadow-lg shadow-marine-500/20 dark:shadow-none transition-colors duration-300">
                            <Database className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 dark:text-white transition-colors duration-300">Master Data</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors duration-300">Manage all core data entities in the system</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                            <div className="text-lg font-black text-marine-400 dark:text-marine-400">{machines.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Machines</div>
                        </div>
                        <div className="text-center px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{models.length}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Models</div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto w-max mx-auto max-w-full transition-colors duration-300">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                                className={`flex items-center gap-2 px-4 py-2.5 font-semibold transition-all rounded-lg cursor-pointer border-none whitespace-nowrap text-sm ${activeTab === tab.id ? 'bg-marine-500 dark:bg-marine-500 text-white shadow-md shadow-marine-500/20 dark:shadow-none' : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </header>

            <div className="w-full no-print">
                {activeTab === 'machines' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-3 shadow-sm transition-colors duration-300">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 max-w-sm focus-within:ring-2 focus-within:ring-marine-500 focus-within:border-marine-500 dark:focus-within:border-marine-500 transition-all shadow-sm shrink-0">
                                <Search className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                <input type="text" placeholder="Search by name, QR code, or type..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none border-none w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium" />
                            </div>

                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block"></div>

                            <div className="relative shrink-0 perspective" onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 pl-3 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer min-w-[150px] justify-between h-[38px] group">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{filterSection === 'All' ? 'All Types' : filterSection}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-marine-400 transition-transform ${isFilterDropdownOpen ? 'rotate-180 text-marine-500' : ''}`} />
                                </div>
                                {isFilterDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsFilterDropdownOpen(false); }}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-down-fade origin-top font-[family-name:sans-serif]">
                                            <div className="p-1.5 max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setFilterSection('All'); setSelectedMachines(new Set()); setIsFilterDropdownOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors border-none cursor-pointer flex items-center justify-between ${filterSection === 'All' ? 'bg-marine-50 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                >
                                                    <span>All Types</span>
                                                    {filterSection === 'All' && <CheckCircle className="w-4 h-4" />}
                                                </button>
                                                {Array.from(new Set(machines.map(m => m.type).filter(Boolean))).map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={(e) => { e.stopPropagation(); setFilterSection(t); setSelectedMachines(new Set()); setIsFilterDropdownOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors border-none cursor-pointer flex items-center justify-between ${filterSection === t ? 'bg-marine-50 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                    >
                                                        <span className="truncate">{t}</span>
                                                        {filterSection === t && <CheckCircle className="w-4 h-4 shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex-1 flex items-center justify-end gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{filteredMachines.length} TOTAL</span>
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer border-none"
                                >
                                    <span className="text-base leading-none">+</span> Add Machine
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300 flex flex-col">
                            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-340px)] custom-scrollbar">
                                <table className="w-full text-left text-sm relative">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0px_rgba(255,255,255,0.05)] transition-colors duration-300">
                                        <tr className="border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-4 py-4 w-12 bg-white dark:bg-slate-900">
                                                <input
                                                    type="checkbox"
                                                    checked={filteredMachines.length > 0 && selectedMachines.size === filteredMachines.length}
                                                    onChange={toggleSelectAll}
                                                    className="appearance-none w-[18px] h-[18px] border-2 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 checked:bg-marine-500 dark:checked:bg-marine-500 checked:border-marine-500 dark:checked:border-marine-500 cursor-pointer relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[5px] after:top-[1px] after:w-[5px] after:h-[10px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45 transition-colors"
                                                />
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    QR Code / ID
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Machine Name
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Type / Section
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right bg-white dark:bg-slate-900 whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {filteredMachines.slice((machinePage - 1) * machinesPerPage, machinePage * machinesPerPage).map((m, idx) => (
                                            <tr key={m.id} style={{ animationFillMode: 'both', animationDelay: `${Math.min(idx * 0.03, 0.3)}s` }} className={`animate-slide-down-fade transition-colors ${selectedMachines.has(m.id) ? 'bg-marine-50/60 dark:bg-marine-500/20' : idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'} hover:bg-marine-50/40 dark:hover:bg-marine-500/5`}>
                                                <td className="px-4 py-3 w-12">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMachines.has(m.id)}
                                                        onChange={() => toggleSelect(m.id)}
                                                        className="appearance-none w-[18px] h-[18px] border-2 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-950 checked:bg-marine-500 dark:checked:bg-marine-500 checked:border-marine-500 dark:checked:border-marine-500 cursor-pointer relative after:content-[''] after:hidden checked:after:block after:absolute after:left-[5px] after:top-[1px] after:w-[5px] after:h-[10px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45 transition-colors"
                                                    />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <code className="text-xs bg-slate-100 dark:bg-slate-800 text-marine-400 dark:text-marine-400 px-2 py-1 rounded-md font-mono font-semibold">{m.qr_code}</code>
                                                </td>
                                                <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-semibold text-sm">{m.name}</td>
                                                <td className="px-5 py-3">{(() => { const b = getTypeBadge(m.type); return (<span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${b.bg} ${b.text} ${b.border}`}><span className={`w-1.5 h-1.5 rounded-full ${b.dot}`}></span>{m.type || 'N/A'}</span>); })()}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handlePrintLabel(m)}
                                                            className="text-slate-400 hover:text-marine-400 dark:hover:text-marine-400 p-1.5 rounded-lg hover:bg-marine-500 dark:hover:bg-marine-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                            title="Print Label"
                                                        >
                                                            <Printer className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <button className="text-slate-400 hover:text-marine-500 p-1.5 rounded-lg hover:bg-marine-50 transition-all group cursor-pointer bg-transparent border-none" title="Edit">
                                                            <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <button className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all group cursor-pointer bg-transparent border-none" title="Delete">
                                                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {filteredMachines.length > machinesPerPage && (
                                <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm bg-slate-50/50 dark:bg-slate-800/20 mt-auto">
                                    <div className="text-slate-500 dark:text-slate-400 font-medium">
                                        Showing <span className="font-bold text-slate-700 dark:text-slate-200">{(machinePage - 1) * machinesPerPage + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(machinePage * machinesPerPage, filteredMachines.length)}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{filteredMachines.length}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setMachinePage(prev => Math.max(1, prev - 1))}
                                            disabled={machinePage === 1}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium bg-transparent"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.ceil(filteredMachines.length / machinesPerPage) }, (_, i) => i + 1)
                                                .filter(p => p === 1 || p === Math.ceil(filteredMachines.length / machinesPerPage) || Math.abs(p - machinePage) <= 1)
                                                .map((p, i, arr) => {
                                                    if (i > 0 && arr[i] - arr[i - 1] > 1) {
                                                        return <React.Fragment key={`ellipsis-${p}`}><span className="text-slate-400">...</span><button onClick={() => setMachinePage(p)} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors border-none cursor-pointer ${machinePage === p ? 'bg-marine-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 bg-transparent'}`}>{p}</button></React.Fragment>;
                                                    }
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setMachinePage(p)}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors border-none cursor-pointer ${machinePage === p ? 'bg-marine-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 bg-transparent'}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                })
                                            }
                                        </div>
                                        <button
                                            onClick={() => setMachinePage(prev => Math.min(Math.ceil(filteredMachines.length / machinesPerPage), prev + 1))}
                                            disabled={machinePage === Math.ceil(filteredMachines.length / machinesPerPage)}
                                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium bg-transparent"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'models' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-3 shadow-sm transition-colors duration-300">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 max-w-sm focus-within:ring-2 focus-within:ring-marine-500 focus-within:border-marine-500 dark:focus-within:border-marine-500 transition-all shadow-sm">
                                <Search className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                <input type="text" placeholder="Search by code or name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none border-none w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium" />
                            </div>

                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block"></div>

                            <div className="flex-1 flex items-center justify-end gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{models.filter(m => !searchTerm || m.code?.toLowerCase().includes(lowerSearch) || m.name?.toLowerCase().includes(lowerSearch)).length} TOTAL</span>
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer border-none"
                                >
                                    <span className="text-base leading-none">+</span> Add Model
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                <table className="w-full text-left text-sm relative">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0px_rgba(255,255,255,0.05)] transition-colors duration-300">
                                        <tr className="border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Code
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Name
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Target Capacity
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right bg-white dark:bg-slate-900 whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {models.filter(m => !searchTerm || m.code?.toLowerCase().includes(lowerSearch) || m.name?.toLowerCase().includes(lowerSearch)).map((m, idx) => (
                                            <tr key={m.id} style={{ animationFillMode: 'both', animationDelay: `${idx * 0.03}s` }} className={`animate-slide-down-fade transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'} hover:bg-marine-50/40 dark:hover:bg-marine-500/5`}>
                                                <td className="px-5 py-3"><code className="text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md font-mono font-semibold border border-emerald-100 dark:border-emerald-500/20">{m.code}</code></td>
                                                <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-semibold">{m.name}</td>
                                                <td className="px-5 py-3"><span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold border border-emerald-100 dark:border-emerald-500/20">{m.target_capacity} pairs/day</span></td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(m, 'shoe-models')}
                                                            className="text-slate-400 hover:text-marine-500 dark:hover:text-marine-400 p-1.5 rounded-lg hover:bg-marine-50 dark:hover:bg-marine-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(m.id, 'shoe-models')}
                                                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sections' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-3 shadow-sm transition-colors duration-300">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 max-w-sm focus-within:ring-2 focus-within:ring-marine-500 focus-within:border-marine-500 dark:focus-within:border-marine-500 transition-all shadow-sm">
                                <Search className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                <input type="text" placeholder="Search sections..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none border-none w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium" />
                            </div>

                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block"></div>

                            <div className="flex-1 flex items-center justify-end gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{sections.filter(s => !searchTerm || s.name?.toLowerCase().includes(lowerSearch)).length} TOTAL</span>
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer border-none"
                                >
                                    <span className="text-base leading-none">+</span> Add Section
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                <table className="w-full text-left text-sm relative">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0px_rgba(255,255,255,0.05)] transition-colors duration-300">
                                        <tr className="border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-20 bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    ID
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Section Name+
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right bg-white dark:bg-slate-900 whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {sections.filter(s => !searchTerm || s.name?.toLowerCase().includes(lowerSearch)).map((s, idx) => (
                                            <tr key={s.id} style={{ animationFillMode: 'both', animationDelay: `${idx * 0.03}s` }} className={`animate-slide-down-fade transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'} hover:bg-marine-50/40 dark:hover:bg-marine-500/5`}>
                                                <td className="px-5 py-3 w-20"><span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md font-mono font-bold">{s.id}</span></td>
                                                <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{s.name}</td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openEditModal(s, 'sections')}
                                                            className="text-slate-400 hover:text-marine-500 dark:hover:text-marine-400 p-1.5 rounded-lg hover:bg-marine-50 dark:hover:bg-marine-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(s.id, 'sections')}
                                                            className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'bom' && (
                    <div className="space-y-4">
                        <div className="p-3 bg-slate-50/80 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-3 shadow-sm transition-colors duration-300">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 max-w-sm focus-within:ring-2 focus-within:ring-marine-500 focus-within:border-marine-500 dark:focus-within:border-marine-500 transition-all shadow-sm shrink-0">
                                <Search className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                <input type="text" placeholder="Search BOM..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent text-sm text-slate-700 dark:text-slate-200 outline-none border-none w-full placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium" />
                            </div>
                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 shrink-0 hidden lg:block"></div>

                            {/* BOM Filter Dropdown */}
                            <div className="relative shrink-0 perspective" onClick={() => setIsBomFilterDropdownOpen(!isBomFilterDropdownOpen)}>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 pl-3 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer min-w-[150px] justify-between h-[38px] group">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{filterBomType === 'All' ? 'All Types' : filterBomType}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-marine-400 transition-transform ${isBomFilterDropdownOpen ? 'rotate-180 text-marine-500' : ''}`} />
                                </div>
                                {isBomFilterDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsBomFilterDropdownOpen(false); }}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-down-fade origin-top font-[family-name:sans-serif]">
                                            <div className="p-1.5 max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setFilterBomType('All'); setIsBomFilterDropdownOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors border-none cursor-pointer flex items-center justify-between ${filterBomType === 'All' ? 'bg-marine-50 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                >
                                                    <span>All Types</span>
                                                    {filterBomType === 'All' && <CheckCircle className="w-4 h-4" />}
                                                </button>
                                                {Array.from(new Set(requirements.map(r => sections.find(s => s.id === r.section_id)?.name).filter(Boolean))).map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={(e) => { e.stopPropagation(); setFilterBomType(t); setIsBomFilterDropdownOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors border-none cursor-pointer flex items-center justify-between ${filterBomType === t ? 'bg-marine-50 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                    >
                                                        <span className="truncate">{t}</span>
                                                        {filterBomType === t && <CheckCircle className="w-4 h-4 shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* BOM Shoe Model Filter Dropdown */}
                            <div className="relative shrink-0 perspective" onClick={() => setIsBomModelDropdownOpen(!isBomModelDropdownOpen)}>
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 pl-3 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer min-w-[150px] justify-between h-[38px] group">
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-marine-400 dark:text-marine-400 shrink-0" />
                                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">{filterBomModel === 'All' ? 'All Models' : filterBomModel}</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-marine-400 transition-transform ${isBomModelDropdownOpen ? 'rotate-180 text-marine-500' : ''}`} />
                                </div>
                                {isBomModelDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsBomModelDropdownOpen(false); }}></div>
                                        <div className="absolute top-full left-0 mt-2 w-full min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-down-fade origin-top font-[family-name:sans-serif]">
                                            <div className="p-1.5 max-h-64 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setFilterBomModel('All'); setIsBomModelDropdownOpen(false); }}
                                                    className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors border-none cursor-pointer flex items-center justify-between ${filterBomModel === 'All' ? 'bg-marine-50 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                >
                                                    <span>All Models</span>
                                                    {filterBomModel === 'All' && <CheckCircle className="w-4 h-4" />}
                                                </button>
                                                {Array.from(new Set(requirements.map(r => models.find(m => m.id === r.shoe_model_id)?.name).filter(Boolean))).map(t => (
                                                    <button
                                                        key={t}
                                                        onClick={(e) => { e.stopPropagation(); setFilterBomModel(t); setIsBomModelDropdownOpen(false); }}
                                                        className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-colors border-none cursor-pointer flex items-center justify-between ${filterBomModel === t ? 'bg-marine-50 dark:bg-marine-500/20 text-marine-600 dark:text-marine-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'}`}
                                                    >
                                                        <span className="truncate">{t}</span>
                                                        {filterBomModel === t && <CheckCircle className="w-4 h-4 shrink-0" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex-1 flex items-center justify-end gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{requirements.length} TOTAL</span>
                                <button
                                    onClick={openAddModal}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer border-none"
                                >
                                    <span className="text-base leading-none">+</span> Add Requirement
                                </button>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
                            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
                                <table className="w-full text-left text-sm relative">
                                    <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0px_rgba(255,255,255,0.05)] transition-colors duration-300">
                                        <tr className="border-b border-slate-200 dark:border-slate-800">
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Shoe Model
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Section
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-900 whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Machine Type Required
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center bg-white dark:bg-slate-900 whitespace-nowrap flex justify-center cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                                <div className="flex items-center gap-1.5">
                                                    Qty
                                                    <ChevronsUpDown className="w-3 h-3 opacity-40" />
                                                </div>
                                            </th>
                                            <th className="px-5 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right bg-white dark:bg-slate-900 whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {requirements.filter(r => {
                                            const secName = sections.find(s => s.id === r.section_id)?.name;
                                            const modelName = models.find(m => m.id === r.shoe_model_id)?.name;
                                            const matchType = filterBomType === 'All' || secName === filterBomType;
                                            const matchModel = filterBomModel === 'All' || modelName === filterBomModel;

                                            if (!searchTerm) return matchType && matchModel;

                                            const matchSearch = modelName?.toLowerCase().includes(lowerSearch) || secName?.toLowerCase().includes(lowerSearch) || r.machine_name?.toLowerCase().includes(lowerSearch);

                                            return matchType && matchModel && matchSearch;
                                        }).map((r, idx) => {
                                            const model = models.find(m => m.id === r.shoe_model_id);
                                            const section = sections.find(s => s.id === r.section_id);
                                            return (
                                                <tr key={r.id} style={{ animationFillMode: 'both', animationDelay: `${idx * 0.03}s` }} className={`animate-slide-down-fade transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/30'} hover:bg-marine-50/40 dark:hover:bg-marine-500/5`}>
                                                    <td className="px-5 py-3 font-semibold text-slate-800 dark:text-slate-200">{model?.name || '-'}</td>
                                                    <td className="px-5 py-3">{(() => { const b = getTypeBadge(section?.name); return (<span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${b.bg} ${b.text} ${b.border}`}><span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`}></span><span>{section?.name || '-'}</span></span>); })()}</td>
                                                    <td className="px-5 py-3 text-marine-400 dark:text-marine-400 font-semibold">{r.machine_name}</td>
                                                    <td className="px-5 py-3 text-center"><span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold">{r.qty_required}</span></td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => openEditModal(r, 'model-requirements')}
                                                                className="text-slate-400 hover:text-marine-500 dark:hover:text-marine-400 p-1.5 rounded-lg hover:bg-marine-50 dark:hover:bg-marine-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(r.id, 'model-requirements')}
                                                                className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group cursor-pointer bg-transparent border-none"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'import' && (
                    <div className="max-w-2xl mx-auto pt-4">
                        {status.msg && (
                            <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 font-medium ${status.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                                {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                {status.msg}
                            </div>
                        )}

                        <form onSubmit={handleImport} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Select Data Type to Import</label>
                                <div className="relative">
                                    <select
                                        value={importType}
                                        onChange={(e) => setImportType(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-marine-500 focus:border-marine-500 dark:focus:border-marine-500 outline-none transition appearance-none cursor-pointer text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="machines">Machines (QR Code, Name, Type)</option>
                                        <option value="shoe-models">Shoe Models (Code, Name, Target Capacity)</option>
                                        <option value="model-requirements">BOM / Requirements (Shoe, Section, Machine Type, Qty)</option>
                                    </select>
                                    <Database className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition mb-6 relative">
                                <input type="file" accept=".csv, .xlsx" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                <FileSpreadsheet className="w-12 h-12 text-slate-400 dark:text-slate-500 mb-3" />
                                <span className="font-semibold text-slate-700 dark:text-slate-200">Click to upload or drag and drop</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400 mt-1">Excel (.xlsx) or CSV files only</span>
                                {fetchingSheets && <div className="mt-4 pt-4 border-t dark:border-slate-700 w-full text-marine-400 dark:text-marine-400 font-bold text-sm">Reading sheets...</div>}
                                {file && !fetchingSheets && <div className="mt-4 pt-4 border-t dark:border-slate-700 w-full text-marine-400 dark:text-marine-400 font-bold text-sm">{file.name} selected</div>}
                            </div>

                            {availableSheets.length > 0 && importType === 'machines' && (
                                <div className="mb-6 p-4 bg-marine-500 dark:bg-marine-500 border border-marine-500 dark:border-marine-500/20 rounded-xl transition-colors duration-300">
                                    <label className="block text-sm font-bold text-marine-400 dark:text-marine-400 mb-2">Target Sheet to Import:</label>
                                    <select
                                        value={selectedSheetIndex}
                                        onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-marine-500 dark:border-marine-900/30 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none text-slate-700 dark:text-slate-200 font-medium"
                                    >
                                        {availableSheets.map((sheetName, idx) => (
                                            <option key={idx} value={idx}>{idx + 1}. {sheetName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button type="submit" disabled={!file || loading} className="bg-marine-500 hover:bg-marine-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm border-none">
                                    {loading ? 'Processing...' : 'Start Import'}
                                    <Upload className="w-4 h-4" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            {/* Floating Bottom Bar for Print */}
            {
                selectedMachines.size > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 dark:bg-slate-700 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-4 no-print transition-colors duration-300" style={{ animation: 'slideUp 0.25s ease-out' }}>
                        <div className="bg-marine-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                            {selectedMachines.size} Selected
                        </div>
                        <button
                            onClick={handleBulkPrint}
                            className="flex items-center gap-2 text-white font-semibold text-sm hover:text-marine-400 dark:hover:text-marine-400 transition cursor-pointer bg-transparent border-none"
                        >
                            <Printer className="w-4 h-4" />
                            Print Labels
                        </button>
                        <button
                            onClick={() => setSelectedMachines(new Set())}
                            className="text-slate-400 hover:text-white transition cursor-pointer bg-transparent border-none ml-1"
                        >
                            ✕
                        </button>
                    </div>
                )
            }

            <style>{`
                @keyframes slideUp {
                    from { transform: translate(-50%, 20px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `}</style>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between transition-colors duration-300">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                Edit {editType === 'machines' ? 'Machine' : editType === 'shoe-models' ? 'Shoe Model' : editType === 'sections' ? 'Section' : 'Requirement'}
                            </h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            {editType === 'machines' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Machine Name</label>
                                        <input required name="name" value={editFormData.name || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">QR Code / ID</label>
                                        <input required name="qr_code" value={editFormData.qr_code || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm font-mono text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Type / Section</label>
                                        <input required name="type" value={editFormData.type || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                </>
                            )}

                            {editType === 'shoe-models' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Model Code</label>
                                        <input required name="code" value={editFormData.code || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm font-mono text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Model Name</label>
                                        <input required name="name" value={editFormData.name || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Capacity</label>
                                        <input required type="number" name="target_capacity" value={editFormData.target_capacity || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                </>
                            )}

                            {editType === 'sections' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Section Name</label>
                                    <input required name="name" value={editFormData.name || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                </div>
                            )}

                            {editType === 'model-requirements' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Shoe Model</label>
                                        <div className="relative">
                                            <select required name="shoe_model_id" value={editFormData.shoe_model_id || ''} onChange={handleEditChange} className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition appearance-none cursor-pointer font-medium text-sm text-slate-800 dark:text-slate-200">
                                                <option value="" disabled>Select Model</option>
                                                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Section</label>
                                        <div className="relative">
                                            <select required name="section_id" value={editFormData.section_id || ''} onChange={handleEditChange} className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition appearance-none cursor-pointer font-medium text-sm text-slate-800 dark:text-slate-200">
                                                <option value="" disabled>Select Section</option>
                                                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Machine Type Required</label>
                                        <input required name="machine_name" value={editFormData.machine_name || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Quantity</label>
                                        <input required type="number" name="qty_required" value={editFormData.qty_required || ''} onChange={handleEditChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-marine-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex items-center justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer bg-transparent border-none">
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSaving} className="px-6 py-2 bg-marine-500 hover:bg-marine-500 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer border-none">
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Universal Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-transparent dark:border-slate-800">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                + Add {activeTab === 'machines' ? 'Machine' : activeTab === 'models' ? 'Shoe Model' : activeTab === 'sections' ? 'Section' : 'Requirement'}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-transparent border-none cursor-pointer">✕</button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            {activeTab === 'machines' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Machine Name</label>
                                        <input required name="name" value={addFormData.name || ''} onChange={handleAddChange} placeholder="e.g. Cutting Machine 1" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">QR Code / ID</label>
                                        <input required name="qr_code" value={addFormData.qr_code || ''} onChange={handleAddChange} placeholder="e.g. MAC-1234" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm font-mono text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Type / Section</label>
                                        <input required name="type" value={addFormData.type || ''} onChange={handleAddChange} placeholder="e.g. CUTTING" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                </>
                            )}

                            {activeTab === 'models' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Model Code</label>
                                        <input required name="code" value={addFormData.code || ''} onChange={handleAddChange} placeholder="e.g. PV574" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm font-mono text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Model Name</label>
                                        <input required name="name" value={addFormData.name || ''} onChange={handleAddChange} placeholder="e.g. Performance V574" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Target Capacity</label>
                                        <input required type="number" name="target_capacity" value={addFormData.target_capacity || ''} onChange={handleAddChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                </>
                            )}

                            {activeTab === 'sections' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Section Name</label>
                                    <input required name="name" value={addFormData.name || ''} onChange={handleAddChange} placeholder="e.g. CUTTING" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                </div>
                            )}

                            {activeTab === 'model-requirements' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Shoe Model</label>
                                        <div className="relative">
                                            <select required name="shoe_model_id" value={addFormData.shoe_model_id || ''} onChange={handleAddChange} className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition appearance-none cursor-pointer font-medium text-sm text-slate-800 dark:text-slate-200">
                                                <option value="" disabled>Pilih Model</option>
                                                {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Section</label>
                                        <div className="relative">
                                            <select required name="section_id" value={addFormData.section_id || ''} onChange={handleAddChange} className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition appearance-none cursor-pointer font-medium text-sm text-slate-800 dark:text-slate-200">
                                                <option value="" disabled>Pilih Section</option>
                                                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                            <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute right-3 top-3 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Machine Type Required</label>
                                        <input required name="machine_name" value={addFormData.machine_name || ''} onChange={handleAddChange} placeholder="e.g. Cutting Swing Arm" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Quantity</label>
                                        <input required type="number" min="1" name="qty_required" value={addFormData.qty_required || 1} onChange={handleAddChange} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium text-sm text-slate-800 dark:text-slate-200" />
                                    </div>
                                </>
                            )}
                            <div className="pt-4 flex items-center justify-end gap-3 mt-6 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer bg-transparent border-none">Cancel</button>
                                <button type="submit" disabled={isAdding} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer border-none">
                                    {isAdding ? 'Saving...' : `+ Add ${activeTab === 'machines' ? 'Machine' : activeTab === 'models' ? 'Model' : activeTab === 'sections' ? 'Section' : 'Requirement'}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

