import React, { useState, useRef, useEffect } from 'react';
import type { QuizSettings, QuestionType, Difficulty } from '../types';
import { History, Loader, Share, UploadCloud, AlertCircle, QuestionCircle } from './icons';
import { fileToBase64 } from '../utils/fileReader';

export interface TutorialElements {
    topic: React.RefObject<HTMLDivElement>;
    upload: React.RefObject<HTMLDivElement>;
    customize: React.RefObject<HTMLDivElement>;
    generate: React.RefObject<HTMLButtonElement>;
    history: React.RefObject<HTMLButtonElement>;
    share: React.RefObject<HTMLButtonElement>;
}

interface SettingsScreenProps {
    onGenerate: (settings: QuizSettings) => void;
    loading: boolean;
    error: string | null;
    onShowHistory: () => void;
    onShowTutorial: () => void;
    setTutorialRefs: (refs: TutorialElements) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onGenerate, loading, error, onShowHistory, onShowTutorial, setTutorialRefs }) => {
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [questionType, setQuestionType] = useState<QuestionType>('Multiple Choice');
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
    const [duration, setDuration] = useState(10);
    const [language, setLanguage] = useState('');
    const [documentContent, setDocumentContent] = useState<string | undefined>(undefined);
    const [fileName, setFileName] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [animatingIcon, setAnimatingIcon] = useState<string | null>(null);

    // Refs for the tutorial
    const topicRef = useRef<HTMLDivElement>(null);
    const uploadRef = useRef<HTMLDivElement>(null);
    const customizeRef = useRef<HTMLDivElement>(null);
    const generateRef = useRef<HTMLButtonElement>(null);
    const historyRef = useRef<HTMLButtonElement>(null);
    const shareRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        setTutorialRefs({
            topic: topicRef,
            upload: uploadRef,
            customize: customizeRef,
            generate: generateRef,
            history: historyRef,
            share: shareRef,
        });
    }, [setTutorialRefs]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsParsing(true);
            setFileName(file.name);
            setTopic(file.name); // Auto-fill topic with filename
            try {
                const base64Content = await fileToBase64(file);
                setDocumentContent(base64Content);
            } catch (err) {
                console.error("File reading error:", err);
                alert("Failed to read file. Please try a different file.");
            } finally {
                setIsParsing(false);
            }
        }
    };
    
    const handleShare = async () => {
        const shareData = {
            title: 'Magic Mock @thethakrals',
            text: 'Create amazing quizzes with AI!',
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        } catch (err) {
            console.error('Share failed:', err);
            await navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const handleIconClick = (iconName: string, callback: () => void) => {
        setAnimatingIcon(iconName);
        callback();
        setTimeout(() => {
            setAnimatingIcon(null);
        }, 500); // Duration should match the animation
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onGenerate({ topic, documentContent, numQuestions, questionType, difficulty, duration, language });
    };
    
    const inputStyle = "w-full bg-black/20 backdrop-blur-sm ring-1 ring-white/10 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all placeholder:text-white/40";
    const selectWrapperStyle = "relative w-full";
    const selectStyle = `${inputStyle} appearance-none`;
    const selectArrow = <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.516 7.548c.436-.446 1.144-.446 1.58 0L10 10.405l2.904-2.857c.436-.446 1.144-.446 1.58 0 .436.445.436 1.162 0 1.608l-3.694 3.637c-.436.446-1.144.446-1.58 0L5.516 9.156c-.436-.446-.436-1.162 0-1.608z"/></svg></div>;

    return (
        <div className="w-full max-w-4xl mx-auto backdrop-blur-xl bg-black/30 rounded-2xl shadow-2xl ring-1 ring-white/10 transition-all duration-500 ease-in-out">
            <header className="p-4 sm:p-6 border-b border-white/10 flex justify-between items-center">
                <h1 className="text-xl font-bold text-white/90">
                    Quiz Dashboard
                </h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleIconClick('tutorial', onShowTutorial)} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Show Tutorial">
                        <QuestionCircle className="w-6 h-6" />
                    </button>
                    <button ref={historyRef} onClick={() => handleIconClick('history', onShowHistory)} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="View History">
                        <History className={`w-6 h-6 transition-transform ${animatingIcon === 'history' ? 'animate-spin-short' : ''}`} />
                    </button>
                    <button ref={shareRef} onClick={() => handleIconClick('share', handleShare)} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Share App">
                        <Share className={`w-6 h-6 transition-transform ${animatingIcon === 'share' ? 'animate-pulse-once' : ''}`} />
                    </button>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-8">
                <div className="space-y-6">
                    <div ref={topicRef} className="space-y-3">
                        <label htmlFor="topic" className="font-semibold text-white/80 flex items-center gap-2">
                            <span className="bg-pink-500/80 text-white font-bold rounded-full h-7 w-7 flex items-center justify-center text-base shrink-0">1</span>
                            <span className="text-lg">Enter Topic or Upload Document</span>
                        </label>
                        <p className="pl-9 text-sm text-white/60 -mt-1">Enter a topic below, or upload a document to automatically use its name.</p>
                        <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., The Renaissance" required className={inputStyle} />
                    </div>

                    <div ref={uploadRef} className="pl-9 space-y-2">
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.docx,.txt" className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isParsing} 
                            className="w-full aspect-square max-h-72 bg-black/20 ring-1 ring-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-all duration-300 border-2 border-dashed border-white/20 hover:border-pink-500/80 text-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-pink-500">
                            <UploadCloud className="w-16 h-16" />
                            <span className="text-lg font-semibold text-center truncate px-4">{isParsing ? 'Parsing...' : (fileName || 'Upload Document')}</span>
                            <span className="text-sm text-white/50">PDF, DOCX, or TXT</span>
                        </button>
                    </div>
                </div>

                <div ref={customizeRef} className="space-y-3">
                    <label className="font-semibold text-white/80 flex items-center gap-2">
                        <span className="bg-purple-500/80 text-white font-bold rounded-full h-7 w-7 flex items-center justify-center text-base shrink-0">2</span>
                        <span className="text-lg">Customize Quiz</span>
                    </label>
                    <div className="pl-9 space-y-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-2">
                            <div className="space-y-2">
                                <label htmlFor="numQuestions" className="font-semibold text-white/80">Questions</label>
                                <input id="numQuestions" type="number" min="1" max="100" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className={inputStyle} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="duration" className="font-semibold text-white/80">Duration (min)</label>
                                <input id="duration" type="number" min="1" value={duration} onChange={e => setDuration(parseInt(e.target.value))} className={inputStyle} />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="questionType" className="font-semibold text-white/80">Type</label>
                                <div className={selectWrapperStyle}>
                                <select id="questionType" value={questionType} onChange={e => setQuestionType(e.target.value as QuestionType)} className={selectStyle}>
                                        <option>Multiple Choice</option>
                                        <option>Fill in the Blank</option>
                                        <option>Mixed</option>
                                    </select>
                                    {selectArrow}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="difficulty" className="font-semibold text-white/80">Difficulty</label>
                                <div className={selectWrapperStyle}>
                                    <select id="difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className={selectStyle}>
                                        <option>Easy</option>
                                        <option>Medium</option>
                                        <option>Hard</option>
                                    </select>
                                    {selectArrow}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="language" className="font-semibold text-white/80">Language <span className="text-white/50">(Optional)</span></label>
                            <input id="language" type="text" value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g., Spanish, French" className={`${inputStyle} mt-2`} />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/20 ring-1 ring-red-500/50 text-red-200 p-3 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0"/>
                        <span>{error}</span>
                    </div>
                )}

                <div className="pt-2">
                    <button ref={generateRef} type="submit" disabled={loading} className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-pink-800 disabled:to-purple-900 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg text-lg flex items-center justify-center gap-3 transition-all duration-300 transform hover:shadow-2xl hover:shadow-pink-500/30 hover:-translate-y-1">
                        {loading && <Loader className="w-6 h-6 animate-spin" />}
                        {loading ? 'Generating Quiz...' : 'Start Magic Mock'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SettingsScreen;