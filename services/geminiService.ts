import { GoogleGenAI, Type } from "@google/genai";
import type { QuizSettings, Quiz } from '../types';

const fileToGenerativePart = (fileContent: string, mimeType: string) => {
    return {
        inlineData: {
            data: fileContent, // Already base64 from fileReader
            mimeType,
        },
    };
};

const getMimeType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pdf': return 'application/pdf';
        case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case 'txt': return 'text/plain';
        default: return 'application/octet-stream';
    }
};

export const translateText = async (text: string | string[], language: string): Promise<string | string[]> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const model = 'gemini-2.5-flash';

        if (Array.isArray(text)) {
            const schema = {
                type: Type.OBJECT,
                properties: {
                    translations: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                    },
                },
                required: ['translations'],
            };

            const prompt = `Translate each of the following text snippets into ${language}.
            Respond with a single JSON object containing a "translations" key, which holds an array of the translated strings.
            The order of the translated strings in the array MUST correspond exactly to the order of the input text snippets.
            Do not add any explanations or other text outside of the JSON object.

            Input Texts:
            ${JSON.stringify(text)}
            `;

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const result = JSON.parse(response.text);
            if (result.translations && Array.isArray(result.translations) && result.translations.length === text.length) {
                return result.translations;
            } else {
                // Fallback or error
                console.error("AI translation response did not match the expected format.", result);
                throw new Error("AI translation response did not match the expected format.");
            }

        } else {
            // Original logic for single string translation
            const prompt = `Translate the following text into ${language}. Respond with only the translated text, without any additional explanations or context.\n\nText: "${text}"`;
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
            });
            return response.text;
        }

    } catch (e: any) {
        console.error("Error in translateText:", e);
        throw new Error("Failed to translate text.");
    }
};


export const generateQuiz = async (settings: QuizSettings): Promise<Quiz> => {
    try {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const model = 'gemini-2.5-flash';

        const schema = {
            type: Type.OBJECT,
            properties: {
                topic: { type: Type.STRING },
                questions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            questionText: { type: Type.STRING },
                            questionType: { 
                                type: Type.STRING,
                                enum: ['multiple_choice', 'fill_in_the_blank'],
                                description: "The type of the question."
                            },
                            options: { 
                                type: Type.ARRAY, 
                                items: { type: Type.STRING },
                                description: "An array of 4 options for multiple_choice, or an empty array for fill_in_the_blank."
                            },
                            correctAnswer: { type: Type.STRING },
                            explanation: { type: Type.STRING }
                        },
                        required: ['questionText', 'questionType', 'options', 'correctAnswer', 'explanation']
                    }
                }
            },
            required: ['topic', 'questions']
        };
        
        const promptContent = `You are Magic Mock, an expert quiz creator. Generate a quiz based on the following settings. The output MUST be a valid JSON object that strictly adheres to the provided schema.

    **Settings:**
    - Topic: ${settings.topic}
    - Number of Questions: ${settings.numQuestions}
    - Question Types to Generate: ${settings.questionType}
    - Difficulty: ${settings.difficulty}
    - Language: ${settings.language || 'English'}

    **CRITICAL OUTPUT RULES (FAILURE TO FOLLOW WILL RESULT IN AN ERROR):**
    1.  For any question where \`questionType\` is \`"multiple_choice"\`:
        - The \`options\` array MUST contain EXACTLY 4 unique, non-empty strings.
        - The \`correctAnswer\` string MUST be an exact match to one of the 4 strings in the \`options\` array.
    2.  For any question where \`questionType\` is \`"fill_in_the_blank"\`:
        - The \`options\` array MUST be an empty array (\`[]\`).
    3.  If the requested \`questionType\` is 'Mixed', generate a combination of both types, following the rules for each type individually.
    4.  The entire quiz (questions, options, answers, explanations) MUST be in the specified language: ${settings.language || 'English'}.
    5.  If document content is provided below, the quiz MUST be based exclusively on that content.
    `;
        
        let contents;
        if (settings.documentContent) {
            const mimeType = getMimeType(settings.topic); // topic holds the filename
            const filePart = fileToGenerativePart(settings.documentContent, mimeType);
            contents = { parts: [ {text: promptContent}, filePart ] };
        } else {
            contents = promptContent;
        }

        const response = await ai.models.generateContent({
            model,
            contents,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const text = response.text;
        const quizData = JSON.parse(text);

        // --- Start of Robust Validation ---
        if (!quizData.questions || !Array.isArray(quizData.questions)) {
            throw new Error("AI response is missing the 'questions' array.");
        }

        for (const q of quizData.questions) {
            if (q.questionType === 'multiple_choice') {
                if (!q.options || !Array.isArray(q.options) || q.options.length !== 4 || q.options.some(opt => typeof opt !== 'string' || opt.trim() === '')) {
                    console.error("Validation failed for multiple-choice question. The AI did not follow the rules.", q);
                    throw new Error("The AI generated a question with invalid options. Please try again, or adjust your topic to be more specific.");
                }
                if (!q.options.includes(q.correctAnswer)) {
                    console.error("Validation failed: Correct answer not in options.", q);
                    throw new Error("The AI generated a question where the correct answer was not in the options list. Please try again.");
                }
            } else if (q.questionType === 'fill_in_the_blank') {
                // Enforce that the options array is empty for fill-in-the-blank questions
                q.options = [];
            } else {
                // Unknown question type
                console.error("Validation failed: Unknown question type.", q);
                throw new Error(`The AI generated an unknown question type: '${q.questionType}'. Please try again.`);
            }
        }
        // --- End of Robust Validation ---

        return quizData as Quiz;
    } catch (e: any) {
        console.error("Error in generateQuiz:", e);
        let detailedMessage = "An unexpected error occurred. Please try again.";
        if (e instanceof Error) {
             if (e.message.toLowerCase().includes('json')) {
                detailedMessage = "The AI's response was not in the correct format. Please try modifying your request.";
            } else if (e.message.toLowerCase().includes('api_key')) {
                detailedMessage = "The API key is invalid or missing. Please check your configuration.";
            } else {
                detailedMessage = `Failed to generate quiz: ${e.message}`;
            }
        }
        throw new Error(detailedMessage);
    }
};