import { GoogleGenAI } from "@google/genai";

const buildPrompt = ({ topic, numQuestions, difficulty, instructions }) => {
  return `You are a quiz question generator. Generate exactly ${numQuestions} multiple-choice questions about "${topic}" at ${difficulty} difficulty.

${instructions ? `Additional instructions: ${instructions}` : ""}

Respond with ONLY valid JSON, no markdown code fences, no explanation text before or after. Use exactly this structure:

{
  "title": "A short descriptive quiz title",
  "questions": [
    {
      "question": "The question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "must exactly match one of the options",
      "explanation": "A brief explanation of why this answer is correct",
      "timeLimit": 15
    }
  ]
}

Rules:
- Exactly 4 options per question, no more, no less.
- correctAnswer must be an exact string match to one of the 4 options.
- Do not repeat questions.
- Keep questions clear and unambiguous.`;
};

export const generateQuizWithAI = async ({
  topic,
  numQuestions,
  difficulty,
  instructions,
}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = buildPrompt({ topic, numQuestions, difficulty, instructions });

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
  });

  const rawText = response.text;

  const cleaned = rawText.replace(/```json\s*|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("AI returned invalid JSON");
  }

  return parsed;
};