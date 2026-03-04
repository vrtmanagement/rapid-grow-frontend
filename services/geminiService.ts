
import { GoogleGenAI, Type } from "@google/genai";
import { TaskStatus } from "../types";

export class GeminiService {
  static async generateProjectTasks(
    projectName: string, 
    description: string, 
    count: number = 5, 
    targetStatus: TaskStatus = 'todo'
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Project name: ${projectName}\nStrategic context: ${description}\n\nTask: Generate exactly ${count} essential, high-impact tactical units (tasks) for an elite entrepreneur to execute this mission. Focus on leverage and ROI. Set the status of all generated tasks to '${targetStatus}'. Use clear sentence case capitalization (First letter capital, rest lowercase).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                status: { type: Type.STRING, description: `Must be exactly '${targetStatus}'` },
                priority: { type: Type.STRING, description: "Must be 'low', 'medium', or 'high'" },
                description: { type: Type.STRING }
              },
              required: ["title", "status", "priority"]
            }
          }
        }
      });
      return JSON.parse(response.text || '[]');
    } catch (error) {
      console.error("Gemini project generation error:", error);
      return [];
    }
  }

  static async getPlanningAdvice(prompt: string, context: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Strategic context: ${context}\n\nClient request: ${prompt}`,
        config: {
          thinkingConfig: { thinkingBudget: 32768 },
          systemInstruction: "You are a world-class performance architect and executive productivity coach. Your advice must be concise, ruthless about priority, and focused on exponential leverage (10x not 10%). Provide your response with sentence case capitalization (First letter capital, rest lowercase)."
        }
      });
      return response.text;
    } catch (error) {
      console.error("Gemini api error:", error);
      return "Critical system error: Advice matrix offline. Re-initializing command...";
    }
  }
}