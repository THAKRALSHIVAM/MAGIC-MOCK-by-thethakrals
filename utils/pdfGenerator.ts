import type { Quiz, QuizSettings, QuizResult } from '../types';

declare const jspdf: any;

const APP_NAME = 'Magic Mock @thethakrals';

/**
 * Adds a header, footer, and a central watermark to every page of the document.
 */
const addPageBranding = (doc: any) => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(9);

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // --- HEADER ---
        doc.setTextColor(150, 150, 150);
        doc.text(APP_NAME, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });

        // --- FOOTER ---
        const pageNumText = `Page ${i} of ${pageCount}`;
        doc.text(pageNumText, doc.internal.pageSize.getWidth() - 10, 290, { align: 'right' });

        // --- CENTER WATERMARK ---
        doc.saveGraphicsState(); // Save current font/color/etc settings
        doc.setFontSize(50);
        doc.setTextColor(230, 230, 230); // A very light grey
        doc.setGState(new doc.GState({opacity: 0.5})); // Set transparency
        doc.text(
            APP_NAME,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() / 2,
            { align: 'center', angle: 45 } // Centered and rotated
        );
        doc.restoreGraphicsState(); // Restore settings for other text
    }
    doc.setTextColor(0, 0, 0); // Reset color for main content
};

export const generateQuizPdf = (quiz: Quiz, settings: QuizSettings) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text(`Quiz: ${quiz.topic}`, 10, 20);
    
    // --- HIGHLIGHTED INSTRUCTIONS BOX ---
    doc.setFillColor(240, 245, 255); // A light, cool grey-blue
    doc.setDrawColor(200, 210, 230);
    doc.rect(10, 28, 190, 22, 'FD'); 
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Instructions', 15, 35);
    doc.setFont('helvetica', 'normal');
    doc.text(`- This quiz has ${settings.numQuestions} questions.`, 15, 42);
    doc.text(`- The time limit is ${settings.duration} minutes. Good luck!`, 15, 48);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);

    let y = 65;
    quiz.questions.forEach((q, index) => {
        if (y > 260) {
            doc.addPage();
            y = 20;
        }
        const questionText = doc.splitTextToSize(`${index + 1}. ${q.questionText}`, 180);
        doc.setFont('helvetica', 'bold');
        doc.text(questionText, 15, y);
        y += questionText.length * 5 + 5;
        doc.setFont('helvetica', 'normal');

        if (q.questionType === 'multiple_choice' && q.options) {
            q.options.forEach(opt => {
                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(`- ${opt}`, 20, y);
                y += 7;
            });
        } else {
            doc.text('Answer: _________________________', 20, y);
            y += 10;
        }
        y += 10; // Increased spacing between questions
    });

    // --- ANSWER KEY PAGE ---
    doc.addPage();
    let yAnswer = 20;
    doc.setFontSize(22);
    doc.text('Answer Key', 10, yAnswer);
    yAnswer += 10;
    doc.line(10, yAnswer - 5, 200, yAnswer - 5);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    quiz.questions.forEach((q, index) => {
        if (yAnswer > 270) {
            doc.addPage();
            yAnswer = 20;
        }
        const fullAnswerText = `${index + 1}. ${q.correctAnswer}`;
        const splitText = doc.splitTextToSize(fullAnswerText, 180);
        doc.text(splitText, 15, yAnswer);
        yAnswer += splitText.length * 5 + 5;
    });
    
    addPageBranding(doc);
    doc.save(`${quiz.topic} - ${APP_NAME}.pdf`);
};


export const generateResultsPdf = (result: QuizResult) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    const scorePercentage = (result.score / result.quiz.questions.length) * 100;
     const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    doc.setFontSize(22);
    doc.text(`Results: ${result.quiz.topic}`, 10, 20);

    // --- HIGHLIGHTED PERFORMANCE SUMMARY BOX ---
    const scoreFillColor = scorePercentage >= 80 ? [237, 247, 237] : scorePercentage >= 50 ? [255, 248, 225] : [254, 242, 242];
    const scoreBorderColor = scorePercentage >= 80 ? [186, 230, 187] : scorePercentage >= 50 ? [255, 228, 153] : [254, 202, 202];
    doc.setFillColor(scoreFillColor[0], scoreFillColor[1], scoreFillColor[2]);
    doc.setDrawColor(scoreBorderColor[0], scoreBorderColor[1], scoreBorderColor[2]);
    doc.rect(10, 28, 190, 20, 'FD');
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Score: ${scorePercentage.toFixed(0)}%`, 20, 38);
    doc.setFont('helvetica', 'normal');
    doc.text(`Correct Answers: ${result.score}/${result.quiz.questions.length}`, 80, 38);
    doc.text(`Time Taken: ${formatTime(result.timeTaken)}`, 140, 38);
    doc.setTextColor(0, 0, 0);


    let y = 60;
    result.quiz.questions.forEach((q, index) => {
        const userAnswer = result.userAnswers[index];
        const isCorrect = userAnswer === q.correctAnswer;
        
        if (y > 250) {
            doc.addPage();
            y = 20;
        }
        
        const questionText = doc.splitTextToSize(`${index + 1}. ${q.questionText}`, 180);
        doc.setFont('helvetica', 'bold');
        doc.text(questionText, 15, y);
        y += questionText.length * 5 + 5;
        doc.setFont('helvetica', 'normal');
        
        doc.setTextColor(isCorrect ? 34 : 200, isCorrect ? 139 : 34, 34); // Green for correct, Red for incorrect
        doc.text(`Your answer: ${userAnswer || 'Not answered'}`, 20, y);
        y += 7;
        
        if (!isCorrect) {
            doc.setTextColor(34, 139, 34); // Green for correct answer
            doc.text(`Correct answer: ${q.correctAnswer}`, 20, y);
            y += 7;
        }
        
        // --- HIGHLIGHTED EXPLANATION BOX ---
        const explanationText = doc.splitTextToSize(q.explanation, 170);
        const boxHeight = (explanationText.length * 5) + 8;
        doc.setFillColor(245, 245, 245);
        doc.rect(20, y - 1, 175, boxHeight, 'F');
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'bold');
        doc.text('Explanation:', 22, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.text(explanationText, 22, y + 10);

        y += boxHeight + 8; // Extra spacing for next question
        doc.setTextColor(0, 0, 0);
    });
    
    addPageBranding(doc);
    doc.save(`Results - ${result.quiz.topic} - ${APP_NAME}.pdf`);
};