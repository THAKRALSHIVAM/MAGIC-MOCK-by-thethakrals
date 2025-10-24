
export type Screen = 'settings' | 'quiz' | 'results' | 'history';

export type QuestionType = 'Multiple Choice' | 'Fill in the Blank' | 'Mixed';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface QuizSettings {
    topic: string;
    documentContent?: string;
    numQuestions: number;
    questionType: QuestionType;
    difficulty: Difficulty;
    duration: number; // in minutes
    language: string;
}

export interface Question {
    questionText: string;
    questionType: 'multiple_choice' | 'fill_in_the_blank';
    options: string[]; // Made this field required
    correctAnswer: string;
    explanation: string;
}

export interface Quiz {
    topic: string;
    questions: Question[];
}

export interface QuizResult {
    id: string;
    quiz: Quiz;
    settings: QuizSettings;
    userAnswers: (string | null)[];
    score: number;
    timeTaken: number; // in seconds
    folderId: string;
    tags: string[];
}

export interface Folder {
    id: string;
    name: string;
}