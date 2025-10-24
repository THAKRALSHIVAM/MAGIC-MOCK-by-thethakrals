import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Quiz, QuizSettings, QuizResult } from '../types';
import { ChevronLeft, ChevronRight, Clock, Pause, Play, Download, Translate, SkipForward, CircularProgress } from './icons';
import { generateQuizPdf } from '../utils/pdfGenerator';
import { translateText } from '../services/geminiService';

const LANGUAGES = ["Hindi", "Spanish", "French", "German", "Japanese", "Bengali", "Punjabi", "Russian", "Portuguese", "Urdu", "Marathi", "Telugu", "Tamil"];

interface QuizScreenProps {
    quiz: Quiz;
    settings: QuizSettings;
    onComplete: (result: QuizResult) => void;
    onBack: () => void;
}

const QuizScreen: React.FC<QuizScreenProps> = ({ quiz, settings, onComplete, onBack }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>(Array(quiz.questions.length).fill(null));
    const [timeLeft, setTimeLeft] = useState(settings.duration * 60);
    const [isPaused, setIsPaused] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showTranslateModal, setShowTranslateModal] = useState(false);
    const [translatedContent, setTranslatedContent] = useState<{ question: string; options?: string[] } | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

    const timerInterval = useRef<number | null>(null);

    const handleSubmit = useCallback(() => {
        if (timerInterval.current) {
            clearInterval(timerInterval.current);
        }
        const score = userAnswers.reduce((acc, answer, index) => {
            return answer === quiz.questions[index].correctAnswer ? acc + 1 : acc;
        }, 0);
        
        const timeTaken = (settings.duration * 60) - timeLeft;
        
        onComplete({
            id: '', // Will be set in App.tsx
            quiz,
            settings,
            userAnswers,
            score,
            timeTaken,
            folderId: 'uncategorized',
            tags: []
        });
    }, [userAnswers, quiz, settings, onComplete, timeLeft]);
    
    useEffect(() => {
        if (isPaused) {
            return;
        }
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }
        timerInterval.current = window.setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => {
            if(timerInterval.current) clearInterval(timerInterval.current);
        };
    }, [isPaused, timeLeft, handleSubmit]);
    
    const handleAnswerChange = (answer: string) => {
        const newAnswers = [...userAnswers];
        newAnswers[currentQuestionIndex] = answer;
        setUserAnswers(newAnswers);
    };

    const changeQuestion = (newIndex: number) => {
        if (newIndex >= 0 && newIndex < quiz.questions.length) {
            setCurrentQuestionIndex(newIndex);
            setTranslatedContent(null); // Clear translation when changing questions
        }
    };

    const goToNext = () => changeQuestion(currentQuestionIndex + 1);
    const goToPrev = () => changeQuestion(currentQuestionIndex - 1);
    const skipQuestion = () => goToNext();

    const handleBack = () => {
        if (window.confirm('Are you sure you want to exit? Your progress will be lost.')) {
            onBack();
        }
    };

    const handleTranslate = async (language: string) => {
        setIsTranslating(true);
        setShowTranslateModal(false);
        setTranslatedContent(null);
        try {
            const currentQuestion = quiz.questions[currentQuestionIndex];
            if (currentQuestion.questionType === 'multiple_choice') {
                const textsToTranslate = [currentQuestion.questionText, ...currentQuestion.options];
                const translations = await translateText(textsToTranslate, language) as string[];
                
                if (translations && translations.length === textsToTranslate.length) {
                    const [translatedQuestion, ...translatedOptions] = translations;
                    setTranslatedContent({ question: translatedQuestion, options: translatedOptions });
                } else {
                    throw new Error("Translation array length mismatch.");
                }
            } else {
                const translation = await translateText(currentQuestion.questionText, language) as string;
                setTranslatedContent({ question: translation });
            }
        } catch (error) {
            console.error(error);
            alert('Failed to translate the question.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleDownload = () => {
        if (downloadProgress !== null) return;

        let progress = 0;
        setDownloadProgress(progress);

        const intervalId = setInterval(() => {
            progress += 5;
            if (progress >= 100) {
                clearInterval(intervalId);
                setDownloadProgress(100);
                setTimeout(() => {
                    generateQuizPdf(quiz, settings);
                    setDownloadProgress(null);
                }, 300);
            } else {
                setDownloadProgress(progress);
            }
        }, 50);
    };
    
    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    const inputStyle = "w-full bg-black/20 backdrop-blur-sm ring-1 ring-white/10 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all placeholder:text-white/40";


    return (
        <div className="w-full max-w-4xl mx-auto backdrop-blur-xl bg-black/30 rounded-2xl shadow-2xl ring-1 ring-white/10 flex flex-col relative">
            {isPaused && (
                <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center rounded-2xl">
                    <h2 className="text-4xl font-bold mb-4">Paused</h2>
                    <button onClick={() => setIsPaused(false)} className="px-8 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold flex items-center gap-2">
                        <Play className="w-6 h-6"/> Resume
                    </button>
                </div>
            )}
            {showTranslateModal && (
                <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center rounded-2xl" onClick={() => setShowTranslateModal(false)}>
                    <div className="bg-gray-800 p-6 rounded-lg shadow-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Translate to:</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {LANGUAGES.map(lang => (
                                <button key={lang} onClick={() => handleTranslate(lang)} className="px-4 py-2 bg-black/30 hover:bg-white/20 rounded-md transition-colors">{lang}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <header className="p-4 border-b border-white/10 flex flex-wrap justify-between items-center gap-4 flex-shrink-0">
                <button onClick={handleBack} className="px-3 py-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 text-white/80 hover:text-white">
                    <ChevronLeft className="w-5 h-5" /> Back
                </button>
                <h2 className="text-lg sm:text-xl font-bold truncate order-first w-full sm:w-auto sm:order-none text-center">{quiz.topic}</h2>
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center">
                        <button onClick={handleDownload} disabled={downloadProgress !== null} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Download Quiz PDF">
                            <Download className={`w-5 h-5 transition-opacity ${downloadProgress !== null ? 'opacity-0' : 'opacity-100'}`}/>
                        </button>
                        {downloadProgress !== null && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <CircularProgress progress={downloadProgress} size={32} strokeWidth={3} />
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsPaused(!isPaused)} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label={isPaused ? "Resume" : "Pause"}>
                        {isPaused ? <Play className="w-5 h-5"/> : <Pause className="w-5 h-5"/>}
                    </button>
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg ring-1 ring-white/10">
                        <Clock className="w-5 h-5 text-pink-400"/>
                        <span className="font-semibold">{formatTime(timeLeft)}</span>
                    </div>
                </div>
            </header>

            <div className="w-full h-1.5 bg-black/30">
                <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>

            <main className="p-4 sm:p-8 flex-grow overflow-y-auto">
                <div className="mb-8">
                    <div className="flex justify-between items-start">
                         <p className="text-lg font-semibold text-white/60">Question {currentQuestionIndex + 1} of {quiz.questions.length}</p>
                         <button onClick={() => setShowTranslateModal(true)} disabled={isTranslating} className="text-sm flex items-center gap-1.5 text-pink-300 hover:text-pink-200 disabled:opacity-50">
                            <Translate className="w-4 h-4"/> {isTranslating ? 'Translating...' : 'Translate'}
                        </button>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mt-2 leading-tight">{currentQuestion.questionText}</h3>
                    {translatedContent?.question && <p className="mt-4 text-lg text-cyan-300 bg-cyan-900/30 p-3 rounded-lg">{translatedContent.question}</p>}
                </div>
                
                {currentQuestion.questionType === 'multiple_choice' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options.map((option, index) => (
                            <button key={index} onClick={() => handleAnswerChange(option)} 
                            className={`p-4 rounded-lg text-left transition-all duration-200 border-2 text-base sm:text-lg
                                ${userAnswers[currentQuestionIndex] === option 
                                    ? 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-400 shadow-lg' 
                                    : 'bg-black/20 border-white/10 hover:bg-white/10 hover:border-white/20'}`}>
                                {translatedContent?.options?.[index] || option}
                            </button>
                        ))}
                    </div>
                )}

                {currentQuestion.questionType === 'fill_in_the_blank' && (
                    <input type="text"
                        value={userAnswers[currentQuestionIndex] || ''}
                        onChange={(e) => handleAnswerChange(e.target.value)}
                        placeholder="Type your answer here..."
                        className={`${inputStyle} text-lg`}
                    />
                )}
            </main>

            <footer className="p-4 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-auto flex-shrink-0">
                <button onClick={goToPrev} disabled={currentQuestionIndex === 0} className="w-full sm:w-auto px-6 py-3 rounded-lg bg-black/30 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold">
                    <ChevronLeft className="w-5 h-5"/> Previous
                </button>
                
                <div className="w-full sm:w-auto flex items-center gap-4">
                    {currentQuestionIndex < quiz.questions.length - 1 && (
                         <button onClick={skipQuestion} className="w-full sm:w-auto px-6 py-3 rounded-lg bg-black/30 hover:bg-white/20 transition-colors flex items-center justify-center gap-2 font-semibold">
                            Skip <SkipForward className="w-5 h-5"/>
                        </button>
                    )}
                    
                    {currentQuestionIndex === quiz.questions.length - 1 ? (
                         <button onClick={handleSubmit} className="w-full sm:w-auto px-8 py-3 rounded-lg bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold transition-all transform hover:shadow-2xl hover:shadow-green-500/30 hover:-translate-y-0.5">
                            Submit Quiz
                        </button>
                    ) : (
                        <button onClick={goToNext} className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-colors flex items-center justify-center gap-2 font-bold transform hover:-translate-y-0.5">
                            Next <ChevronRight className="w-5 h-5"/>
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
};

export default QuizScreen;