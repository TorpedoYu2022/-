
import { GoogleGenAI, Type } from "@google/genai";
import { ComicStyle, ComicScript, StoryLength, AspectRatio } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Transforms whitepaper text into a structured, coherent narrative comic script.
 */
export async function generateComicScript(content: string, style: string, length: StoryLength): Promise<ComicScript> {
  const structure12 = `
    1-2: Problem Intro
    3-5: Deep Conflict
    6-9: Technical Solution
    10-11: Impact/ROI
    12: CTA
  `;

  const structure9 = `
    1-2: Background
    3-4: Evidence
    5-7: Solution
    8: Success
    9: CTA
  `;
  
  const structure6 = `
    1: Hook
    2: Conflict
    3: Pivot
    4: Action
    5: Impact
    6: CTA
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      You are a world-class B2B storyteller and creative director.
      Task: Convert the B2B whitepaper content into a ${length}-panel comic script.
      
      Language Requirement: 
      - 'caption' and 'dialogue' in Chinese (for UI reference).
      - 'imageDialogue' MUST be a concise, powerful English sentence (max 10 words) as a bold narrative hook.
      - 'sceneDialogue' MUST be English dialogue (max 15 words) representing the specific character dialogue or plot detail in the scene, to be displayed as very small subtitles.
      
      Narrative Structure (${length} panels):
      ${length === 12 ? structure12 : length === 9 ? structure9 : structure6}
      
      Variety Requirements:
      1. Different camera angles for each panel.
      2. Detailed background descriptions.
      3. Character consistency for a professional protagonist.

      Content:
      ${content}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          visualContext: { type: Type.STRING },
          panels: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
                imageDialogue: { type: Type.STRING, description: "A bold English hook for the image." },
                sceneDialogue: { type: Type.STRING, description: "Small plot-relevant English dialogue." },
                caption: { type: Type.STRING, description: "Chinese caption for reference." },
                dialogue: { type: Type.STRING, description: "Chinese dialogue for reference." },
              },
              required: ["id", "visualPrompt", "caption", "imageDialogue", "sceneDialogue"]
            }
          }
        },
        required: ["title", "visualContext", "panels"]
      }
    }
  });

  const responseText = response.text;
  if (!responseText) throw new Error("Script generation failed");
  return JSON.parse(responseText.trim());
}

/**
 * Generates a high-detail panel image with dynamic aspect ratio.
 */
export async function generatePanelImage(panel: any, style: string, context: string, aspectRatio: AspectRatio): Promise<string> {
  const enhancedPrompt = `
    MASTERPIECE ILLUSTRATION. Style: ${style}. 
    CHARACTER BIBLE: ${context}.
    SCENE: ${panel.visualPrompt}.
    ACTION & COMPOSITION: Highly dynamic, cinematic lighting, professional composition.
    TEXT RULE: DO NOT draw any text or speech bubbles inside the image pixels. I will overlay text digitally.
    Visual Quality: 8k resolution, trending on ArtStation, vivid expressions, complex business environment.
  `;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: enhancedPrompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio,
      }
    }
  });

  let base64Data: string | undefined;
  if (response.candidates?.[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        base64Data = part.inlineData.data;
        break;
      }
    }
  }

  if (!base64Data) throw new Error("Image generation failed");
  return `data:image/png;base64,${base64Data}`;
}
