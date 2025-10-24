import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Screen, Quiz, QuizSettings, QuizResult, Folder } from './types';
import SettingsScreen, { TutorialElements as SettingsTutorialElements } from './components/SettingsScreen';
import QuizScreen from './components/QuizScreen';
import ResultsScreen from './components/ResultsScreen';
import HistoryScreen from './components/HistoryScreen';
import Tutorial from './components/Tutorial';
import { generateQuiz } from './services/geminiService';
import { BookOpen, Heart, RequestFeature } from './components/icons';

export interface AllTutorialElements extends SettingsTutorialElements {
    featureRequest: React.RefObject<HTMLAnchorElement>;
}

const App: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('settings');
    const [quizSettings, setQuizSettings] = useState<QuizSettings | null>(null);
    const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
    const [quizResults, setQuizResults] = useState<QuizResult[]>(() => {
        try {
            const saved = localStorage.getItem('quizResults');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            return [];
        }
    });
    const [folders, setFolders] = useState<Folder[]>(() => {
        try {
            const saved = localStorage.getItem('quizFolders');
            return saved ? JSON.parse(saved) : [{ id: 'uncategorized', name: 'Uncategorized' }];
        } catch (error) {
            return [{ id: 'uncategorized', name: 'Uncategorized' }];
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTutorial, setShowTutorial] = useState(false);
    
    // Refs for the tutorial
    const settingsTutorialRefs = useRef<SettingsTutorialElements | null>(null);
    const featureRequestRef = useRef<HTMLAnchorElement>(null);
    const [allTutorialRefs, setAllTutorialRefs] = useState<AllTutorialElements | null>(null);


    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('magic_mock_tutorial_seen');
        if (!hasSeenTutorial) {
            setShowTutorial(true);
        }
    }, []);

    // Effect to combine refs from different components for the tutorial
    useEffect(() => {
        if (showTutorial && settingsTutorialRefs.current && featureRequestRef.current) {
            setAllTutorialRefs({
                ...settingsTutorialRefs.current,
                featureRequest: featureRequestRef
            });
        }
    }, [showTutorial, settingsTutorialRefs.current, featureRequestRef.current]);

    const navigate = (targetScreen: Screen) => {
        window.location.hash = targetScreen;
    };

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            if (['settings', 'quiz', 'results', 'history'].includes(hash)) {
                setScreen(hash as Screen);
            } else {
                setScreen('settings');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial check

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleBackToSettings = useCallback(() => {
        setCurrentQuiz(null);
        setQuizSettings(null);
        navigate('settings');
    }, []);

    // This effect handles navigation integrity. If we're on a screen
    // without the necessary data (e.g., direct URL navigation or refresh),
    // it redirects back to the settings page.
    useEffect(() => {
        if (screen === 'quiz' && (!currentQuiz || !quizSettings)) {
            handleBackToSettings();
        }
        if (screen === 'results' && !quizResults[0]) {
            handleBackToSettings();
        }
    }, [screen, currentQuiz, quizSettings, quizResults, handleBackToSettings]);


    useEffect(() => {
        localStorage.setItem('quizResults', JSON.stringify(quizResults));
    }, [quizResults]);

    useEffect(() => {
        localStorage.setItem('quizFolders', JSON.stringify(folders));
    }, [folders]);

    const handleGenerateQuiz = async (settings: QuizSettings) => {
        setLoading(true);
        setError(null);
        try {
            const quiz = await generateQuiz(settings);
            setQuizSettings(settings);
            setCurrentQuiz(quiz); // Set state before navigating
            navigate('quiz');
        } catch (err: any) {
            setError(err.message || 'Failed to generate quiz. Please check your settings and try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleQuizComplete = (result: QuizResult) => {
        const newResult = { ...result, id: Date.now().toString(), folderId: 'uncategorized', tags: [] };
        setQuizResults(prev => [newResult, ...prev]);
        navigate('results');
    };

    const handleRetakeQuiz = (result: QuizResult) => {
        setCurrentQuiz(result.quiz);
        setQuizSettings(result.settings);
        navigate('quiz');
    };
    
    const renderScreen = () => {
        switch (screen) {
            case 'quiz':
                if (currentQuiz && quizSettings) {
                    return <QuizScreen quiz={currentQuiz} settings={quizSettings} onComplete={handleQuizComplete} onBack={handleBackToSettings} />;
                }
                return null; // Render nothing while the useEffect handles redirection
            case 'results':
                const latestResult = quizResults[0];
                if (latestResult) {
                    return <ResultsScreen result={latestResult} onRetake={handleRetakeQuiz} onFinish={handleBackToSettings} setQuizResults={setQuizResults} />;
                }
                 return null; // Render nothing while the useEffect handles redirection
            case 'history':
                return <HistoryScreen 
                    results={quizResults} 
                    folders={folders}
                    setResults={setQuizResults}
                    setFolders={setFolders}
                    onRetake={handleRetakeQuiz}
                    onBack={handleBackToSettings}
                />;
            case 'settings':
            default:
                return <SettingsScreen 
                    setTutorialRefs={(refs) => settingsTutorialRefs.current = refs}
                    onGenerate={handleGenerateQuiz} 
                    loading={loading} 
                    error={error} 
                    onShowHistory={() => navigate('history')} 
                    onShowTutorial={() => setShowTutorial(true)} 
                />;
        }
    };

    return (
        <div className="min-h-screen w-full text-white font-sans flex flex-col">
           {showTutorial && allTutorialRefs && <Tutorial onClose={() => setShowTutorial(false)} elements={allTutorialRefs} />}
           <header className="w-full max-w-4xl mx-auto pt-4 sm:pt-6 px-2 sm:px-4 flex flex-col items-center gap-4">
                <div className="bg-black/25 backdrop-blur-lg rounded-2xl shadow-2xl shadow-black/50 ring-1 ring-white/10 px-4 py-2 sm:px-6 sm:py-3">
                    <button onClick={handleBackToSettings} className="text-2xl sm:text-4xl font-bold flex items-center gap-2 sm:gap-4 bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 via-pink-500 to-purple-500 hover:opacity-90 transition-opacity" style={{ textShadow: '0 2px 10px rgba(236, 72, 153, 0.3)' }}>
                        <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-pink-400" />
                        Magic Mock @thethakrals
                    </button>
                </div>
                <a 
                    ref={featureRequestRef}
                    href="https://s.id/thethakrals" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="group flex items-center gap-2.5 bg-black/30 backdrop-blur-md ring-1 ring-white/10 rounded-full px-5 py-2.5 text-white/90 hover:text-white transition-all transform hover:scale-105 animate-subtle-glow"
                >
                    <RequestFeature className="w-5 h-5 text-cyan-300 transition-transform group-hover:rotate-12" />
                    <span className="font-semibold text-sm">Request a Feature</span>
                </a>
            </header>
            <main className="flex-grow w-full flex flex-col items-center justify-start p-2 sm:p-4">
                {renderScreen()}
            </main>
           <footer className="w-full text-center p-4 text-white/50 text-sm mt-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                 <span>© {new Date().getFullYear()} Magic Mock @thethakrals</span>
                 <span className="hidden sm:inline text-white/30">|</span>
                 <a 
                    href="https://s.id/thethakrals" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="group flex items-center gap-1.5 text-base text-white/80 hover:text-white transition-colors"
                >
                    <span className="font-semibold">Made by</span>
                    <span className="font-bold text-lg group-hover:text-pink-400 group-hover:underline transition-colors">thethakrals</span>
                    <Heart className="w-5 h-5 text-pink-500 group-hover:text-pink-400 transition-colors" />
                </a>
            </footer>
        </div>
    );
};

export default App;