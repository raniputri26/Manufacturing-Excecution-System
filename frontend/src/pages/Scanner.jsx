import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { Camera, MapPin, Send, ScanLine, Keyboard, X, Zap, Clock, Activity, UploadCloud, ChevronLeft, ChevronRight } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

function Scanner() {
    const [qrCode, setQrCode] = useState('');
    const [locationId, setLocationId] = useState('');
    const [machineInfo, setMachineInfo] = useState(null);
    const [manualFromId, setManualFromId] = useState('');
    const [lookingUp, setLookingUp] = useState(false);
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');
    const [locations, setLocations] = useState([]);
    const [scanMode, setScanMode] = useState('manual');
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [recentScans, setRecentScans] = useState([]);
    const [scanPage, setScanPage] = useState(1);
    const scansPerPage = 10;
    const scannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);
    const manualInputRef = useRef(null);
    const fileInputRef = useRef(null);

    const fetchLocations = async () => {
        try {
            const res = await api.get('/locations');
            setLocations(res.data);
        } catch (error) {
            console.error('Failed to fetch locations:', error);
        }
    };

    const holdingPattern = /red\s*tag|storing/i;
    const cellLocations = locations.filter(l => !holdingPattern.test(l.name) && l.type === 'Cell');
    const holdingLocations = locations.filter(l => holdingPattern.test(l.name));

    const fetchRecentScans = async () => {
        try {
            const res = await api.get('/machine-locations');
            setRecentScans(res.data || []);
        } catch (error) {
            console.error('Failed to fetch recent scans:', error);
        }
    };

    // Lookup machine info when QR code changes (debounced)
    useEffect(() => {
        if (!qrCode || qrCode.length < 3) {
            setMachineInfo(null);
            return;
        }
        const timer = setTimeout(async () => {
            setLookingUp(true);
            try {
                const res = await api.get(`/machines/lookup/${encodeURIComponent(qrCode)}`);
                setMachineInfo(res.data);
            } catch {
                setMachineInfo(null);
            } finally {
                setLookingUp(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [qrCode]);

    useEffect(() => {
        fetchLocations();
        fetchRecentScans();
        const interval = setInterval(fetchRecentScans, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (scanMode === 'manual' && manualInputRef.current) {
            setTimeout(() => manualInputRef.current?.focus(), 300);
        }
    }, [scanMode]);

    const stopCamera = useCallback(async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (e) {
                // ignore
            }
            html5QrCodeRef.current = null;
        }
        setIsCameraActive(false);
    }, []);

    const startCamera = useCallback(async () => {
        if (!scannerRef.current) return;

        await stopCamera();

        const html5QrCode = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = html5QrCode;

        try {
            await html5QrCode.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    setQrCode(decodedText);
                    setMessage('');
                    stopCamera();
                    setScanMode('manual');
                },
                () => { /* ignore scan errors */ }
            );
            setIsCameraActive(true);
        } catch (err) {
            setMessage('Error: Unable to open camera. Please ensure camera permission is granted.');
            setIsCameraActive(false);
        }
    }, [stopCamera]);

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    const handleModeSwitch = async (mode) => {
        if (mode === scanMode) return;

        if (mode === 'manual') {
            await stopCamera();
        }
        setScanMode(mode);

        if (mode === 'camera') {
            setTimeout(() => startCamera(), 200);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            await stopCamera();
            setScanMode('manual');
            
            const html5QrCodeScanner = new Html5Qrcode('qr-reader-hidden');
            const decodedText = await html5QrCodeScanner.scanFile(file, true);
            setQrCode(decodedText);
            setMessage('✅ Image processed! QR Code found.');
        } catch (err) {
            setMessage('Error: No QR code found in the image. Please try another one.');
            console.error(err);
        } finally {
            event.target.value = '';
        }
    };

    const handleScanSubmit = async (e) => {
        e.preventDefault();
        
        if (!qrCode || !locationId) {
            setMessage('Error: Please fill in QR Code and select a Target Cell.');
            return;
        }

        try {
            const res = await api.post('/machine-locations/scan', {
                qr_code: qrCode,
                location_id: locationId,
                from_location_id: (!machineInfo?.location_id && manualFromId) ? manualFromId : null,
                notes: notes || null
            });
            const machineName = res.data?.machine?.name || qrCode;
            const fromName = machineInfo?.location_name || locations.find(l => l.id == manualFromId)?.name || 'Baru';
            const destName = res.data?.location?.name || 'Unknown';
            setMessage(`✅ ${machineName}: ${fromName} → ${destName}`);
            setQrCode('');
            setMachineInfo(null);
            setManualFromId('');
            setNotes('');
            fetchRecentScans();
        } catch (error) {
            setMessage('Error: Failed to update location. ' + (error.response?.data?.message || ''));
        }
    };

    const formatTimestamp = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
            date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="min-h-[100dvh] h-[100dvh] bg-slate-50 dark:bg-slate-950 font-[family-name:sans-serif] transition-colors duration-300 relative flex flex-col overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-br from-marine-500/10 to-transparent dark:from-marine-500/5 -z-10 blur-3xl rounded-full translate-y-[-50%]"></div>
            <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-to-tl from-emerald-500/5 to-transparent dark:from-emerald-500/5 -z-10 blur-3xl rounded-full translate-y-[30%] translate-x-[20%]"></div>

            <div className="sticky top-0 z-20 w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8 pb-4 mb-4 sm:mb-6 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md border-b dark:border-white/10 transition-colors duration-300">
                <div className="max-w-6xl mx-auto">
                    <header className="flex items-center justify-between relative z-10 transition-colors duration-300">
                        <div className="flex items-center gap-4 ml-14 sm:ml-16 xl:ml-0 transition-all duration-300">
                            <div className="w-12 h-12 bg-marine-500 dark:bg-marine-500 rounded-2xl flex items-center justify-center shadow-lg">
                                <ScanLine className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight transition-colors duration-300">Machine Scanner</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium transition-colors duration-300">Scan QR codes to swiftly update machine locations</p>
                            </div>
                        </div>
                    </header>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto flex-1 px-4 sm:px-6 lg:px-8 pb-8 flex flex-col gap-6 relative z-10">

                <div className="flex flex-col lg:flex-row gap-6 w-full relative z-10 transition-all duration-300">
                    {/* LEFT COLUMN: VISUAL SCANNER */}
                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 lg:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 transition-colors duration-300 flex flex-col">

                        {/* Status Message */}
                        {message && (
                            <div className={`p-4 rounded-2xl text-sm font-semibold flex items-start gap-3 mb-6 animate-in slide-in-from-top-4 fade-in duration-300 ${message.includes('Error') ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20'}`}>
                                <div className="mt-0.5">
                                    {message.includes('Error') ? <X className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                                </div>
                                <span className="flex-1 leading-relaxed">{message}</span>
                                <button type="button" onClick={() => setMessage('')} className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition border-none bg-transparent cursor-pointer">
                                    <X className="w-4 h-4 opacity-50 hover:opacity-100" />
                                </button>
                            </div>
                        )}

                        <div className="flex bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl p-1.5 gap-1.5 mb-6">
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('manual')}
                                title="Manual Input"
                                className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all duration-300 border-none cursor-pointer
                                    ${scanMode === 'manual'
                                        ? 'bg-white dark:bg-slate-700 text-marine-600 dark:text-marine-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                        : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Keyboard className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => handleModeSwitch('camera')}
                                title="Use Camera"
                                className={`flex-1 flex items-center justify-center py-3 rounded-xl transition-all duration-300 border-none cursor-pointer
                                    ${scanMode === 'camera'
                                        ? 'bg-white dark:bg-slate-700 text-marine-600 dark:text-marine-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                                        : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Camera className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                title="Upload Image"
                                className="flex-1 flex items-center justify-center py-3 rounded-xl transition-all duration-300 border-none cursor-pointer bg-transparent text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                            >
                                <UploadCloud className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div id="qr-reader-hidden" style={{ display: 'none' }}></div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

                        <div className="flex-1 flex flex-col">
                            {/* Camera Mode */}
                            {scanMode === 'camera' && (
                                <div className="animate-in fade-in zoom-in-95 duration-300 h-full flex flex-col">
                                    <div className="relative overflow-hidden rounded-2xl bg-black border-[3px] border-slate-200 dark:border-slate-800 shadow-inner flex-1 flex flex-col min-h-[300px]">
                                        <div id="qr-reader" ref={scannerRef} className="w-full h-full flex-1 object-cover"></div>
                                        {!isCameraActive && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 text-white gap-4 backdrop-blur-sm z-20">
                                                <div className="w-10 h-10 border-3 border-marine-400 border-t-transparent rounded-full animate-spin"></div>
                                                <p className="text-sm font-medium tracking-wide">Initializing Camera...</p>
                                            </div>
                                        )}
                                        {/* Scanning overlay artifact */}
                                        {isCameraActive && (
                                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                                <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-emerald-400/50 rounded-3xl relative">
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl"></div>
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl"></div>
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl"></div>
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-xl"></div>
                                                    <div className="absolute top-0 left-0 w-full h-[2px] bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-scan-line"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-4 text-center">
                                        Point your camera securely at the machine's QR code
                                    </p>
                                </div>
                            )}

                            {/* Manual Mode */}
                            {scanMode === 'manual' && (
                                <div className="animate-in fade-in zoom-in-95 duration-300 flex-1 flex flex-col justify-center py-6">
                                    <div className="w-full max-w-sm mx-auto text-center">
                                        <div className="w-24 h-24 mx-auto bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-800">
                                            <QrCodeIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                                        </div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">Machine QR Code</label>
                                        <div className="relative group">
                                            <div className="absolute -inset-0.5 bg-gradient-to-r from-marine-500 to-emerald-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-500"></div>
                                            <input
                                                ref={manualInputRef}
                                                type="text"
                                                value={qrCode}
                                                onChange={(e) => setQrCode(e.target.value)}
                                                className="relative w-full text-center px-4 py-4 sm:py-5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-0 focus:border-marine-500 dark:focus:border-marine-500 outline-none transition-all text-xl font-bold font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 placeholder:font-sans placeholder:font-medium placeholder:text-base shadow-inner"
                                                placeholder="Tap & Scan Barcode..."
                                                autoComplete="off"
                                            />
                                            {qrCode && (
                                                <button type="button" onClick={() => setQrCode('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-none cursor-pointer">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-5">
                                            Ensure this field is active, then trigger your barcode scanner gun.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: FORM INPUTS */}
                    <div className="lg:w-[400px] shrink-0 flex flex-col gap-4">
                        <form className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 transition-colors duration-300 flex-1 flex flex-col" onSubmit={handleScanSubmit}>

                            <div className="mb-6 flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <MapPin className="w-5 h-5 text-marine-500" />
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Location Details</h3>
                            </div>

                            <div className="space-y-6 flex-1">
                                <div>
                                    <label className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                                        <span>Current Location</span>
                                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full ${
                                            machineInfo && !machineInfo.location_name 
                                                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                                                : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                                        }`}>{machineInfo && !machineInfo.location_name ? 'Pilih Manual' : 'Auto-detect'}</span>
                                    </label>

                                    {/* Auto-detected: machine already has location */}
                                    {(!machineInfo || machineInfo.location_name) && (
                                        <div className={`w-full px-5 py-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                            lookingUp 
                                                ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                                                : machineInfo?.location_name 
                                                    ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' 
                                                    : 'bg-slate-50/50 border-slate-200 dark:bg-slate-950 dark:border-slate-800'
                                        }`}>
                                            <MapPin className={`w-4.5 h-4.5 shrink-0 ${
                                                lookingUp ? 'text-amber-500 animate-pulse' 
                                                : machineInfo?.location_name ? 'text-emerald-500' 
                                                : 'text-slate-400'
                                            }`} />
                                            <span className={`font-semibold text-sm ${
                                                lookingUp ? 'text-amber-600 dark:text-amber-400'
                                                : machineInfo?.location_name ? 'text-emerald-700 dark:text-emerald-300'
                                                : 'text-slate-400 dark:text-slate-500'
                                            }`}>
                                                {lookingUp ? 'Mencari mesin...' 
                                                 : machineInfo?.location_name ? machineInfo.location_name
                                                 : 'Scan QR terlebih dahulu'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Manual select: machine has no location (penempatan awal) */}
                                    {machineInfo && !machineInfo.location_name && (
                                        <>
                                            <div className="relative group">
                                                <select
                                                    value={manualFromId}
                                                    onChange={(e) => setManualFromId(e.target.value)}
                                                    className="w-full pl-5 pr-10 py-3.5 bg-blue-50/30 hover:bg-blue-50 border-2 border-blue-200/50 rounded-xl focus:ring-0 focus:border-blue-500 outline-none transition-all text-slate-700 font-medium cursor-pointer appearance-none dark:bg-blue-950/20 dark:hover:bg-blue-900/30 dark:border-blue-900/50 dark:focus:border-blue-500 dark:text-slate-200"
                                                >
                                                    <option value="">-- Belum diketahui / Baru --</option>
                                                    <optgroup label="Production Cells">
                                                        {cellLocations.map(loc => (
                                                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                        ))}
                                                    </optgroup>
                                                    {holdingLocations.length > 0 && (
                                                        <optgroup label="Holding Zones">
                                                            {holdingLocations.map(loc => (
                                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                </select>
                                                <MapPin className="absolute right-4 top-4 w-4.5 h-4.5 text-blue-400 pointer-events-none" />
                                            </div>
                                            <p className="mt-1.5 text-xs text-blue-500 dark:text-blue-400 pl-1">
                                                ⚠️ Mesin belum terdaftar. Pilih cell di mana mesin ini berada saat ini.
                                            </p>
                                        </>
                                    )}

                                    {machineInfo && (
                                        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 pl-1">
                                            {machineInfo.name}
                                        </p>
                                    )}
                                </div>

                                <div className="flex justify-center -my-2 relative z-10 w-full opacity-30 pointer-events-none">
                                    <div className="w-8 h-8 bg-white dark:bg-slate-900 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                                        <div className="w-0.5 h-4 bg-slate-300 dark:bg-slate-700"></div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                                        Target Cell (Destination) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative group">
                                        <select
                                            value={locationId}
                                            onChange={(e) => setLocationId(e.target.value)}
                                            className="w-full pl-5 pr-10 py-3.5 bg-marine-50/30 hover:bg-marine-50 border-2 border-marine-200/50 rounded-xl focus:ring-0 focus:border-marine-500 outline-none transition-all text-slate-800 font-semibold cursor-pointer appearance-none dark:bg-marine-950/20 dark:hover:bg-marine-900/30 dark:border-marine-900/50 dark:focus:border-marine-500 dark:text-slate-100"
                                            required
                                        >
                                            <option value="" disabled>-- Select Destination --</option>
                                            <optgroup label="Production Cells">
                                                {cellLocations.map(loc => (
                                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                ))}
                                            </optgroup>
                                            {holdingLocations.length > 0 && (
                                                <optgroup label="Holding Zones">
                                                    {holdingLocations.map(loc => (
                                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        <div className="absolute right-4 top-4 pointer-events-none w-4.5 h-4.5 rounded-full bg-marine-500/20 dark:bg-marine-500/30 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-marine-500"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <label className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2.5">
                                        <span>Notes / Reason</span>
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Optional</span>
                                    </label>
                                    <div className="relative group">
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            rows="2"
                                            placeholder="e.g. Broken, Maintenance, Returned..."
                                            className="w-full px-5 py-3.5 bg-slate-50/50 hover:bg-slate-50 border-2 border-slate-200 rounded-xl focus:ring-0 focus:border-slate-400 outline-none transition-all text-slate-700 font-medium dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800 dark:focus:border-slate-600 dark:text-slate-200 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="submit"
                                    disabled={!qrCode || !locationId}
                                    className="w-full bg-marine-500 hover:bg-marine-600 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-3 transition-all cursor-pointer shadow-lg shadow-marine-500/20 disabled:shadow-none border-none active:scale-[0.98]"
                                >
                                    <Send className="w-5 h-5" />
                                    <span>Update Location</span>
                                </button>
                            </div>
                        </form>
                    </div>

                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/60 dark:border-slate-800 transition-colors duration-300 w-full relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Recent Scans</h3>
                    </div>

                    {recentScans.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                            <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No recent scans found.</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Start scanning machines to see history here.</p>
                        </div>
                    ) : (
                        <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-5 py-4 rounded-tl-xl w-32">Time</th>
                                        <th className="px-5 py-4">Machine Name</th>
                                        <th className="px-5 py-4 w-32">From Cell</th>
                                        <th className="px-5 py-4 w-32">Target Cell</th>
                                        <th className="px-5 py-4">Notes</th>
                                        <th className="px-5 py-4 rounded-tr-xl w-28">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentScans.slice((scanPage - 1) * scansPerPage, scanPage * scansPerPage).map((scan) => {
                                        const targetName = scan.location?.name || '';
                                        let statusText = 'Moved';
                                        let statusColorClass = 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20';
                                        let dotColor = 'bg-emerald-500';

                                        if (/red\s*tag/i.test(targetName)) {
                                            statusText = 'Temporary';
                                            statusColorClass = 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-500/20';
                                            dotColor = 'bg-amber-500';
                                        } else if (/storing|storage/i.test(targetName)) {
                                            statusText = 'Under Repair';
                                            statusColorClass = 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200/50 dark:border-orange-500/20';
                                            dotColor = 'bg-orange-500';
                                        }

                                        return (
                                            <tr key={scan.id} className="border-b border-slate-100 dark:border-slate-800/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-5 py-4 text-slate-500 dark:text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 opacity-70" />
                                                        {formatTimestamp(scan.created_at)}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {scan.machine?.name || 'Unknown Machine'}
                                                </td>
                                                <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium">
                                                    {scan.from_location?.name || '-'}
                                                </td>
                                                <td className="px-5 py-4 text-marine-600 dark:text-marine-400 font-bold whitespace-normal">
                                                    {scan.location?.name || 'Unknown Location'}
                                                </td>
                                                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                                                    {scan.notes ? (
                                                        <div className="max-w-[200px] truncate" title={scan.notes}>
                                                            {scan.notes}
                                                        </div>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusColorClass}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                                                        {statusText}
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {recentScans.length > scansPerPage && (
                            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => setScanPage(p => Math.max(1, p - 1))}
                                    disabled={scanPage === 1}
                                    className="flex items-center gap-1 text-sm font-semibold text-marine-600 dark:text-marine-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none transition-colors hover:text-marine-700 dark:hover:text-marine-300"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Prev
                                </button>
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Page {scanPage} of {Math.ceil(recentScans.length / scansPerPage)}
                                </span>
                                <button
                                    onClick={() => setScanPage(p => Math.min(Math.ceil(recentScans.length / scansPerPage), p + 1))}
                                    disabled={scanPage >= Math.ceil(recentScans.length / scansPerPage)}
                                    className="flex items-center gap-1 text-sm font-semibold text-marine-600 dark:text-marine-400 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed cursor-pointer bg-transparent border-none transition-colors hover:text-marine-700 dark:hover:text-marine-300"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes scan-line {
                    0% { transform: translateY(0); opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { transform: translateY(256px); opacity: 0; }
                }
                .animate-scan-line {
                    animation: scan-line 2s linear infinite;
                }
            `}</style>
        </div>
    );
}

function QrCodeIcon(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" /></svg>
    )
}

export default Scanner;
