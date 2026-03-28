import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

async function generate() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: 'A cozy, lofi-style sketch of a room interior. Hand-drawn, minimalist, black and white with subtle warm tones. In the room, there is a sleeping cat on a sofa, a small fireplace with embers, a window showing birds flying outside, a desk with a journal and pen, and a small pile of stones on the floor. No text. Clean lines, relaxing atmosphere.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString = part.inlineData.data;
        fs.writeFileSync('public/home-bg.png', Buffer.from(base64EncodeString, 'base64'));
        console.log('Image saved to public/home-bg.png');
        return;
      }
    }
    console.log('No image found in response');
  } catch (e) {
    console.error('Error:', e);
  }
}

generate();
