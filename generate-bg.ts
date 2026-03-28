import { GoogleGenAI } from "@google/genai";
import fs from "fs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generate() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: 'A black and white line art illustration of a cozy room. A cat is sitting on a sofa. There is a coffee table with a notebook and a smartphone. An open door leads to a balcony where there is a fire pit and a basket of stones. Through the window and door, a lake and flying birds are visible. The style is simple, clean, hand-drawn, lofi, no text, no words. Aspect ratio 16:9.',
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64Data = part.inlineData.data;
        fs.writeFileSync('public/home-bg.png', Buffer.from(base64Data, 'base64'));
        console.log('Image generated successfully!');
        return;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

generate();
