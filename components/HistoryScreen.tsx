import React, { useState, useMemo } from 'react';
import type { QuizResult, Folder } from '../types';
import { ChevronLeft, Folder as FolderIcon, MoreVertical, Plus, Search, Trash2, FileText, Move, Download, CircularProgress, Menu } from './icons';
import { generateQuizPdf } from '../utils/pdfGenerator';

interface HistoryScreenProps {
    results: QuizResult[];
    folders: Folder[];
    setResults: React.Dispatch<React.SetStateAction<QuizResult[]>>;
    setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
    onRetake: (result: QuizResult) => void;
    onBack: () => void;
}

type SortOption = 'Newest' | 'Oldest' | 'Score (High to Low)' | 'Score (Low to High)';
type MenuConfig = { id: string | null, position: 'top' | 'bottom' };

const HistoryScreen: React.FC<HistoryScreenProps> = ({ results, folders, setResults, setFolders, onRetake, onBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('Newest');
    const [activeFolderId, setActiveFolderId] = useState<string>('uncategorized');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [openMenu, setOpenMenu] = useState<MenuConfig>({ id: null, position: 'bottom' });
    const [moveMenuId, setMoveMenuId] = useState<string | null>(null);
    const [downloadState, setDownloadState] = useState<{ id: string; progress: number } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const filteredResults = useMemo(() => {
        return results
            .filter(r => r.folderId === activeFolderId)
            .filter(r => 
                r.quiz.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
                r.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => {
                switch (sortOption) {
                    case 'Oldest':
                        return parseInt(a.id) - parseInt(b.id);
                    case 'Score (High to Low)':
                        return (b.score / b.quiz.questions.length) - (a.score / a.quiz.questions.length);
                    case 'Score (Low to High)':
                        return (a.score / a.quiz.questions.length) - (b.score / b.quiz.questions.length);
                    case 'Newest':
                    default:
                        return parseInt(b.id) - parseInt(a.id);
                }
            });
    }, [results, searchTerm, sortOption, activeFolderId]);

    const handleMenuToggle = (event: React.MouseEvent<HTMLButtonElement>, id: string) => {
        if (openMenu.id === id) {
            setOpenMenu({ id: null, position: 'bottom' }); // Close if already open
            return;
        }

        const buttonRect = event.currentTarget.getBoundingClientRect();
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const MENU_HEIGHT = 120; // Approximate height of the menu

        const position = spaceBelow < MENU_HEIGHT ? 'top' : 'bottom';
        setOpenMenu({ id, position });
    };

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            const newFolder: Folder = { id: Date.now().toString(), name: newFolderName.trim() };
            setFolders(prev => [...prev, newFolder]);
            setNewFolderName('');
            setIsCreatingFolder(false);
        }
    };
    
    const handleDeleteResult = (id: string) => {
        if (window.confirm('Are you sure you want to delete this quiz result?')) {
            setResults(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleDeleteAll = () => {
         if (window.confirm('Are you sure you want to delete ALL quiz history and folders? This cannot be undone.')) {
            setResults([]);
            setFolders([{ id: 'uncategorized', name: 'Uncategorized' }]);
        }
    };

    const handleMoveResult = (resultId: string, targetFolderId: string) => {
        setResults(prev => prev.map(r => r.id === resultId ? { ...r, folderId: targetFolderId } : r));
        setMoveMenuId(null);
        setOpenMenu({ id: null, position: 'bottom' });
    };

    const handleDownload = (res: QuizResult) => {
        if (downloadState) return;
    
        let progress = 0;
        setDownloadState({ id: res.id, progress: 0 });
    
        const intervalId = setInterval(() => {
            progress += 5;
            if (progress >= 100) {
                clearInterval(intervalId);
                setDownloadState({ id: res.id, progress: 100 });
                setTimeout(() => {
                    generateQuizPdf(res.quiz, res.settings);
                    setDownloadState(null);
                }, 300);
            } else {
                setDownloadState({ id: res.id, progress });
            }
        }, 50);
    };

    const handleSelectFolder = (folderId: string) => {
        setActiveFolderId(folderId);
        setIsSidebarOpen(false); // Close sidebar on selection
    };

    const activeFolderName = folders.find(f => f.id === activeFolderId)?.name || 'History';
    const inputStyle = "w-full bg-black/20 backdrop-blur-sm ring-1 ring-white/10 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all placeholder:text-white/40";

    return (
        <div className="w-full max-w-6xl mx-auto backdrop-blur-xl bg-black/30 rounded-2xl shadow-2xl ring-1 ring-white/10 flex flex-col">
            <header className="p-4 border-b border-white/10 grid grid-cols-3 items-center flex-shrink-0">
                <div className="flex justify-start">
                    <button onClick={onBack} className="px-3 py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-white/80 hover:text-white">
                        <ChevronLeft className="w-5 h-5" /> <span className="hidden sm:inline">Back</span>
                    </button>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-center truncate">{activeFolderName}</h1>
                <div className="flex justify-end items-center gap-2">
                    <button onClick={handleDeleteAll} className="p-2 sm:px-4 sm:py-2 bg-red-500/80 hover:bg-red-500 rounded-lg text-sm font-semibold flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete All</span>
                    </button>
                     <button onClick={() => setIsSidebarOpen(true)} className="p-2 -mr-2 rounded-lg hover:bg-white/10 md:hidden">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </header>
            
            <div className="flex flex-1 overflow-hidden">
                {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-20 md:hidden" />}
                <aside className={`w-64 border-r border-white/10 p-4 flex-shrink-0 flex flex-col bg-black/30 md:bg-transparent
                    fixed md:relative inset-y-0 left-0 z-30
                    transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 
                    transition-transform duration-300 ease-in-out`}>
                    <h2 className="text-lg font-semibold mb-4 text-white/80">Folders</h2>
                    <ul className="space-y-1 flex-grow overflow-y-auto -mr-2 pr-2">
                        {folders.map(folder => (
                            <li key={folder.id}>
                                <button onClick={() => handleSelectFolder(folder.id)} className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-3 transition-colors ${activeFolderId === folder.id ? 'bg-pink-500/20 text-pink-300 font-semibold' : 'hover:bg-white/10 text-white/70'}`}>
                                    <FolderIcon className="w-5 h-5 flex-shrink-0" /> <span className="truncate">{folder.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                    {isCreatingFolder ? (
                        <div className="mt-4 flex-shrink-0">
                           <input 
                                type="text" 
                                value={newFolderName} 
                                onChange={e => setNewFolderName(e.target.value)}
                                placeholder="New folder name"
                                className="w-full bg-black/30 border border-white/20 rounded-lg p-2 mb-2 focus:ring-2 focus:ring-pink-500 focus:outline-none transition"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateFolder} className="w-full bg-pink-500 hover:bg-pink-600 text-sm py-1 rounded">Create</button>
                                <button onClick={() => setIsCreatingFolder(false)} className="w-full bg-black/30 hover:bg-white/20 text-sm py-1 rounded">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => setIsCreatingFolder(true)} className="w-full mt-4 px-3 py-2 rounded-md flex items-center justify-center gap-2 hover:bg-white/10 transition-colors bg-black/30 ring-1 ring-white/10 flex-shrink-0">
                            <Plus className="w-5 h-5"/> New Folder
                        </button>
                    )}
                </aside>

                <main className="flex-1 p-4 sm:p-6 flex flex-col overflow-hidden">
                    <div className="flex flex-col md:flex-row gap-4 mb-4 flex-shrink-0">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="Search by topic or tag..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`${inputStyle} pl-10`}
                            />
                        </div>
                         <div className="relative">
                            <select value={sortOption} onChange={e => setSortOption(e.target.value as SortOption)} className={`${inputStyle} appearance-none pr-8`}>
                                <option>Newest</option>
                                <option>Oldest</option>
                                <option>Score (High to Low)</option>
                                <option>Score (Low to High)</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.144-.446 1.58 0L10 10.405l2.904-2.857c.436-.446 1.144-.446 1.58 0 .436.445.436 1.162 0 1.608l-3.694 3.637c-.436.446-1.144.446-1.58 0L5.516 9.156c-.436-.446-.436-1.162 0-1.608z"/></svg></div>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto -mr-3 pr-3">
                        {filteredResults.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredResults.map(res => (
                                    <div key={res.id} className="bg-black/20 p-4 rounded-lg ring-1 ring-white/10 flex flex-col justify-between hover:ring-pink-500/50 transition-all">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-lg mb-2 pr-2 line-clamp-2">{res.quiz.topic}</h3>
                                                <div className="relative">
                                                     <button onClick={(e) => handleMenuToggle(e, res.id)} className="p-1 rounded-full hover:bg-white/20">
                                                        <MoreVertical className="w-5 h-5"/>
                                                     </button>
                                                     {openMenu.id === res.id && (
                                                         <div className={`absolute right-0 w-48 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-10
                                                            ${openMenu.position === 'top' ? 'bottom-full mb-1' : 'mt-1'}`}>
                                                            <button onClick={() => handleDeleteResult(res.id)} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2"><Trash2 className="w-4 h-4"/> Delete</button>
                                                            <div className="relative">
                                                                <button onClick={() => setMoveMenuId(moveMenuId === res.id ? null : res.id)} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2"><Move className="w-4 h-4"/> Move to...</button>
                                                                {moveMenuId === res.id && (
                                                                    <div className="absolute right-full top-0 mr-1 w-48 bg-gray-700 border border-white/20 rounded-lg shadow-xl">
                                                                        {folders.filter(f => f.id !== activeFolderId).map(f => (
                                                                            <button key={f.id} onClick={() => handleMoveResult(res.id, f.id)} className="w-full text-left px-4 py-2 hover:bg-white/10 flex items-center gap-2"><FolderIcon className="w-4 h-4"/>{f.name}</button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                         </div>
                                                     )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-white/50 mb-3">{new Date(parseInt(res.id)).toLocaleString()}</p>
                                            <div className="flex items-center gap-4 text-sm mb-4 text-white/80">
                                                <span>Score: <strong className="text-white">{((res.score / res.quiz.questions.length) * 100).toFixed(0)}%</strong></span>
                                                <span>{res.settings.difficulty}</span>
                                                <span>{res.quiz.questions.length} Qs</span>
                                            </div>
                                             {res.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {res.tags.map(tag => <span key={tag} className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full">{tag}</span>)}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 flex gap-2">
                                            <div className="relative w-full">
                                                <button
                                                    onClick={() => handleDownload(res)}
                                                    disabled={downloadState !== null}
                                                    className="w-full bg-black/30 hover:bg-white/10 text-white/80 font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                                                >
                                                    <div className={`flex items-center gap-2 transition-opacity ${downloadState?.id === res.id ? 'opacity-0' : 'opacity-100'}`}>
                                                        <Download className="w-4 h-4" /> Download
                                                    </div>
                                                </button>
                                                {downloadState?.id === res.id && (
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-pink-300">
                                                        <CircularProgress progress={downloadState.progress} size={30} strokeWidth={2.5} />
                                                        <span className="absolute text-xs font-mono text-white">{Math.round(downloadState.progress)}%</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => onRetake(res)} className="w-full bg-pink-500/80 hover:bg-pink-500 text-white font-semibold py-2 rounded-lg transition-colors">Retake Quiz</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-white/60">
                                <FileText className="w-20 h-20 mb-4 opacity-50"/>
                                <h3 className="text-xl font-semibold">No Quizzes Found</h3>
                                <p>Generate a new quiz or check another folder.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default HistoryScreen;