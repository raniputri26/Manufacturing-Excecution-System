import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Database, QrCode, Sun, Moon, Pin, PinOff, Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

function Sidebar() {
    const [isHovered, setIsHovered] = useState(false);
    const [isPinned, setIsPinned] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const isExpanded = isPinned || isHovered || isMobileMenuOpen;

    const menuItems = [
        { path: '/', name: 'Dashboard', icon: LayoutDashboard },
        { path: '/master', name: 'Master Data', icon: Database },
        { path: '/scan', name: 'Scanner', icon: QrCode },
    ];

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="xl:hidden fixed top-3 left-3 sm:top-5 sm:left-5 z-[55] bg-[#2A3042] dark:bg-slate-800 text-white p-2 sm:p-2.5 rounded-xl shadow-md shadow-black/10 transition-all border-none cursor-pointer"
            >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Backdrop for Mobile */}
            <div 
                className={`xl:hidden fixed inset-0 bg-slate-900/50 z-[59] backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            ></div>

            {/* Nav spacer for correct main content margin when unpinned or expanded (Desktop only) */}
            <div className={`hidden xl:block transition-all duration-300 shrink-0 h-[100dvh] sticky top-0 bg-transparent ${isPinned ? 'w-64' : 'w-20'}`}></div>

            <aside
                className={`bg-[#2A3042] text-white min-h-[100dvh] font-[family-name:sans-serif] flex flex-col fixed left-0 top-0 h-[100dvh] transition-all duration-300 z-[60] 
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
                xl:translate-x-0 ${isExpanded ? 'w-64 shadow-2xl xl:shadow-none' : 'w-20'} 
                dark:bg-slate-900 border-r border-[#2A3042] dark:border-slate-800`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <div className="flex items-center justify-between p-5 mb-8 h-20 shrink-0">
                    <div className={`flex items-center gap-3 overflow-hidden transition-all duration-300 ${isExpanded ? 'opacity-100 w-full' : 'opacity-0 w-0'}`}>
                        <img src="/mes-logo.svg" alt="MES Logo" className="w-8 h-8 rounded-lg shrink-0 object-cover bg-white" />
                        <h1 className="text-xl font-bold tracking-wider whitespace-nowrap">MES System</h1>
                    </div>

                    {!isExpanded && (
                        <div className="absolute left-0 w-full hidden xl:flex items-center justify-center opacity-100 transition-opacity duration-300">
                            <img src="/mes-logo.svg" alt="MES Logo" className="w-10 h-10 rounded-xl object-cover bg-white" />
                        </div>
                    )}

                    {isExpanded && (
                        <button
                            onClick={() => {
                                if (isMobileMenuOpen) {
                                    setIsMobileMenuOpen(false);
                                } else {
                                    setIsPinned(!isPinned);
                                }
                            }}
                            className="text-slate-400 hover:text-white transition-colors p-1"
                            title={isMobileMenuOpen ? "Close menu" : (isPinned ? "Unpin sidebar" : "Pin sidebar")}
                        >
                            {(isPinned && !isMobileMenuOpen) ? <Pin className="w-5 h-5" fill="currentColor" /> : <PinOff className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                <nav className="flex flex-col gap-2 px-3">
                    {menuItems.map(item => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center py-3 rounded-xl transition-all duration-300 whitespace-nowrap overflow-hidden ${isActive ? 'bg-gradient-to-r from-marine-400 to-marine-600 dark:bg-gradient-to-r dark:from-marine-800/40 dark:to-marine-900/10 font-semibold text-white dark:text-marine-400' : 'text-slate-400 hover:bg-[#333A4E] dark:hover:bg-slate-800 hover:text-white dark:hover:text-slate-200'} ${isExpanded ? 'px-4 gap-4 justify-start' : 'px-0 gap-0 justify-center xl:justify-center'}`}
                                title={!isExpanded ? item.name : ""}
                            >
                                <Icon className="w-6 h-6 shrink-0" />
                                <span className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                                    {item.name}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto p-4 shrink-0 flex flex-col gap-4">
                    <button
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`flex items-center p-2 rounded-xl transition-all duration-300 text-slate-400 hover:bg-[#333A4E] dark:hover:bg-slate-800 hover:text-white dark:hover:text-slate-200 ${isExpanded ? 'justify-start gap-4 px-3' : 'justify-center mx-auto w-10 h-10'}`}
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                        <span className={`text-sm font-semibold transition-opacity duration-300 whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}`}>
                            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </span>
                    </button>

                    <div className={`flex items-center gap-3 transition-opacity duration-300 overflow-hidden ${isExpanded ? 'opacity-100' : 'opacity-0 w-0 h-0 hidden'}`}>
                        <div className="w-10 h-10 rounded-full bg-[#333A4E] dark:bg-slate-800 flex items-center justify-center text-sm font-bold shrink-0">A</div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold whitespace-nowrap">Administrator</span>
                            <span className="text-xs text-slate-400 whitespace-nowrap">Admin Role</span>
                        </div>
                    </div>

                    {!isExpanded && (
                        <div className="w-10 h-10 hidden xl:flex rounded-full bg-[#333A4E] dark:bg-slate-800 mx-auto items-center justify-center text-sm font-bold shrink-0" title="Administrator">
                            A
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
