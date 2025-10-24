import React, { useState, useEffect } from 'react';
import type { AllTutorialElements } from '../App';

interface TutorialProps {
    onClose: () => void;
    elements: AllTutorialElements;
}

const tutorialSteps: { elementKey: keyof AllTutorialElements; title: string; text: string; }[] = [
    {
        elementKey: 'topic',
        title: "1. Choose Your Topic",
        text: "Start by typing any subject you want a quiz on. This can be anything from 'World War II' to 'React Hooks'.",
    },
    {
        elementKey: 'upload',
        title: "2. Or Upload a Document",
        text: "Alternatively, upload your study materials (.pdf, .docx, .txt). The quiz will be based exclusively on the content of your file!",
    },
    {
        elementKey: 'customize',
        title: "3. Customize Your Quiz",
        text: "Fine-tune your test by setting the number of questions, duration, question type, and difficulty level.",
    },
    {
        elementKey: 'generate',
        title: "4. Generate and Start!",
        text: "Once you're ready, click 'Start Magic Mock' to let the AI build your custom quiz in seconds.",
    },
    {
        elementKey: 'history',
        title: "5. View Your History",
        text: "Click here to see all your past quiz results, review answers, retake quizzes, and organize them into folders.",
    },
    {
        elementKey: 'share',
        title: "6. Share the App",
        text: "Enjoying the app? Use this button to easily share it with your friends or colleagues.",
    },
    {
        elementKey: 'featureRequest',
        title: "7. Request a Feature",
        text: "Have a great idea? Click here to send your suggestions directly to the creator and help improve the app!",
    },
];

const Tutorial: React.FC<TutorialProps> = ({ onClose, elements }) => {
    const [step, setStep] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [panelPosition, setPanelPosition] = useState<'top' | 'bottom'>('bottom');
    
    useEffect(() => {
        const currentStepInfo = tutorialSteps[step];
        const element = elements[currentStepInfo.elementKey]?.current;

        if (element) {
            setHighlightStyle(prev => ({ ...prev, opacity: 0, transition: 'opacity 0.1s ease' }));
            
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'center',
            });
            
            const scrollEndTimer = setTimeout(() => {
                const rect = element.getBoundingClientRect();
                const PADDING = 10;

                const newHighlightStyle: React.CSSProperties = {
                    width: `${rect.width + PADDING}px`,
                    height: `${rect.height + PADDING}px`,
                    top: `${rect.top - PADDING / 2}px`,
                    left: `${rect.left - PADDING / 2}px`,
                    opacity: 1,
                    transition: 'all 0.4s ease-in-out, opacity 0.4s ease-in-out 0.1s'
                };
                
                setHighlightStyle(newHighlightStyle);

                const isBottomHalf = rect.top + rect.height / 2 > window.innerHeight / 2;
                setPanelPosition(isBottomHalf ? 'top' : 'bottom');
            }, 500);

            return () => clearTimeout(scrollEndTimer);
        }
    }, [step, elements]);


    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('magic_mock_tutorial_seen', 'true');
        }
        onClose();
    };
    
    const navButtonStyle = "px-5 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base";
    const currentStep = tutorialSteps[step];

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div className="absolute inset-0" onClick={handleClose}></div>
            
            {/* Highlight Box */}
            <div className="absolute rounded-lg animate-highlight-pulse" style={{
                ...highlightStyle,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
                border: '2px solid #EC4899', // pink-500
                pointerEvents: 'none',
            }}>
            </div>
            
            {/* Information & Navigation Panel */}
            <div className={`fixed left-0 right-0 p-4 z-10 flex flex-col items-center gap-4 
                ${panelPosition === 'bottom' ? 'bottom-0 animate-nav-in-bottom' : 'top-0 animate-nav-in-top'}`
            }>
                <div className="w-full max-w-md bg-gray-800/90 backdrop-blur-lg ring-1 ring-white/20 p-5 rounded-xl shadow-2xl">
                    
                    {/* Top bar: progress and step count */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-grow bg-white/10 rounded-full h-2">
                            <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${((step + 1) / tutorialSteps.length) * 100}%`, transition: 'width 0.3s ease-in-out' }}></div>
                        </div>
                        <span className="text-sm font-semibold text-white/70">{step + 1}/{tutorialSteps.length}</span>
                    </div>

                    {/* Step Content */}
                    <div className="mb-4">
                        <h3 className="text-xl font-bold text-pink-400 mb-1">{currentStep.title}</h3>
                        <p className="text-base text-white/80">{currentStep.text}</p>
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between items-center">
                        {step === tutorialSteps.length - 1 ? (
                            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" checked={dontShowAgain} onChange={e => setDontShowAgain(e.target.checked)} className="w-4 h-4 accent-pink-500 bg-gray-600 border-gray-500 rounded" />
                                Don't show again
                            </label>
                        ) : (
                            <button onClick={handleClose} className="text-sm text-white/60 hover:text-white underline hover:no-underline">Skip Tutorial</button>
                        )}
                        
                        <div className="flex gap-2">
                            <button onClick={() => setStep(s => s - 1)} disabled={step === 0} className={`${navButtonStyle} bg-white/10 hover:bg-white/20`}>Back</button>
                            {step < tutorialSteps.length - 1 ? (
                                <button onClick={() => setStep(s => s + 1)} className={`${navButtonStyle} bg-pink-500 hover:bg-pink-600`}>Next</button>
                            ) : (
                                <button onClick={handleClose} className={`${navButtonStyle} bg-green-500 hover:bg-green-600`}>Finish</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes nav-in-bottom {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-nav-in-bottom {
                    animation: nav-in-bottom 0.4s 0.2s ease-out forwards;
                    opacity: 0;
                }
                @keyframes nav-in-top {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-nav-in-top {
                    animation: nav-in-top 0.4s 0.2s ease-out forwards;
                    opacity: 0;
                }
                @keyframes highlight-pulse {
                    0%, 100% {
                        box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 5px 2px #EC4899;
                    }
                    50% {
                        box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 15px 5px #EC4899;
                    }
                }
                .animate-highlight-pulse {
                    animation: highlight-pulse 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default Tutorial;