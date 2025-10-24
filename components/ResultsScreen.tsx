import React, { useState } from 'react';
import type { QuizResult } from '../types';
import { CheckCircle, XCircle, Repeat, CornerUpLeft, Download, CircularProgress } from './icons';
import { generateResultsPdf } from '../utils/pdfGenerator';

interface ResultsScreenProps {
    result: QuizResult;
    onRetake: (result: QuizResult) => void;
    onFinish: () => void;
    setQuizResults: React.Dispatch<React.SetStateAction<QuizResult[]>>;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ result, onRetake, onFinish, setQuizResults }) => {
    const [tags, setTags] = useState(result.tags.join(', '));
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const scorePercentage = (result.score / result.quiz.questions.length) * 100;

    const scoreColor = scorePercentage >= 80 ? 'text-green-400' : scorePercentage >= 50 ? 'text-yellow-400' : 'text-red-400';
    const scoreGlow = scorePercentage >= 80 ? 'shadow-green-500/50' : scorePercentage >= 50 ? 'shadow-yellow-500/50' : 'shadow-red-500/50';

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTags(e.target.value);
    };

    const handleTagSave = () => {
         setQuizResults(prev => prev.map(r => r.id === result.id ? {...r, tags: tags.split(',').map(t => t.trim()).filter(Boolean)} : r));
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
                    generateResultsPdf(result);
                    setDownloadProgress(null);
                }, 300);
            } else {
                setDownloadProgress(progress);
            }
        }, 50);
    };

    return (
        <div className="w-full max-w-4xl mx-auto backdrop-blur-xl bg-black/30 rounded-2xl shadow-2xl ring-1 ring-white/10">
            <header className="p-4 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Quiz Results</h1>
                    <p className="text-white/70 mt-1">{result.quiz.topic}</p>
                </div>
                <div className="relative">
                    <button onClick={handleDownload} disabled={downloadProgress !== null} className="px-4 py-2 bg-pink-500/80 hover:bg-pink-500 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:cursor-not-allowed">
                        <div className={`flex items-center gap-2 transition-opacity ${downloadProgress !== null ? 'opacity-0' : 'opacity-100'}`}>
                            <Download className="w-5 h-5"/> Download PDF
                        </div>
                    </button>
                    {downloadProgress !== null && (
                        <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
                            <CircularProgress progress={downloadProgress} size={32} strokeWidth={3} />
                            <span className="absolute text-xs font-mono">{Math.round(downloadProgress)}%</span>
                        </div>
                    )}
                </div>
            </header>
            
            <main className="p-4 sm:p-8 overflow-y-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 text-center">
                    <div className={`bg-black/30 p-4 rounded-lg ring-1 ring-white/10 shadow-2xl ${scoreGlow}`}>
                        <h3 className="font-semibold text-white/70">Score</h3>
                        <p className={`text-4xl sm:text-5xl font-bold ${scoreColor}`}>{scorePercentage.toFixed(0)}%</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg ring-1 ring-white/10">
                        <h3 className="font-semibold text-white/70">Correct</h3>
                        <p className="text-4xl sm:text-5xl font-bold">{result.score}<span className="text-xl sm:text-2xl text-white/50">/{result.quiz.questions.length}</span></p>
                    </div>
                     <div className="bg-black/30 p-4 rounded-lg ring-1 ring-white/10">
                        <h3 className="font-semibold text-white/70">Time Taken</h3>
                        <p className="text-3xl sm:text-4xl font-bold">{formatTime(result.timeTaken)}</p>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg ring-1 ring-white/10">
                        <h3 className="font-semibold text-white/70">Difficulty</h3>
                        <p className="text-3xl sm:text-4xl font-bold">{result.settings.difficulty}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4">Review Answers</h2>
                    <div className="space-y-6">
                        {result.quiz.questions.map((question, index) => {
                            const userAnswer = result.userAnswers[index];
                            const isCorrect = userAnswer === question.correctAnswer;
                            return (
                                <div key={index} className={`p-5 rounded-lg border ${isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                    <p className="font-bold text-lg mb-3">{index + 1}. {question.questionText}</p>
                                    <div className="flex items-start gap-3 mb-3 text-white/90">
                                        {isCorrect ? <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />}
                                        <p>Your answer: <span className="font-semibold block">{userAnswer || 'Not answered'}</span></p>
                                    </div>
                                    {!isCorrect && (
                                        <div className="flex items-start gap-3 mb-3 text-green-300">
                                            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5"/>
                                            <p>Correct answer: <span className="font-semibold block">{question.correctAnswer}</span></p>
                                        </div>
                                    )}
                                    <div className="bg-black/20 p-3 rounded mt-3 backdrop-blur-sm">
                                        <p className="font-semibold text-sm text-pink-300">Explanation</p>
                                        <p className="text-white/80">{question.explanation}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-white/80 mb-2">Tags <span className="text-white/50">(comma-separated)</span></h3>
                     <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={tags}
                            onChange={handleTagChange}
                            onBlur={handleTagSave}
                            placeholder="e.g., Mid-term Prep, Chapter 5"
                            className="flex-grow bg-black/20 backdrop-blur-sm ring-1 ring-white/10 rounded-lg p-3 focus:ring-2 focus:ring-pink-500 focus:outline-none transition-all placeholder:text-white/40"
                        />
                        <button onClick={handleTagSave} className="px-5 py-2 bg-pink-500/80 hover:bg-pink-500 rounded-lg font-semibold transition-colors">Save</button>
                    </div>
                </div>
            </main>

            <footer className="p-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <button onClick={() => onRetake(result)} className="w-full sm:w-auto px-6 py-3 rounded-lg bg-black/30 hover:bg-white/10 ring-1 ring-white/20 transition-colors flex items-center justify-center gap-2 font-semibold">
                    <Repeat className="w-5 h-5"/> Retake Quiz
                </button>
                <button onClick={onFinish} className="w-full sm:w-auto px-6 py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 font-bold transition-colors flex items-center justify-center gap-2">
                   <CornerUpLeft className="w-5 h-5"/> Back to Settings
                </button>
            </footer>
        </div>
    );
};

export default ResultsScreen;