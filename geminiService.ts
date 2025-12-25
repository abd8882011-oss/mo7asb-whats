
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType } from "./types";

// Always use the process.env.API_KEY directly as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseFinancialText = async (text: string): Promise<Transaction[]> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please ensure it is set.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `تحليل النص المالي التالي المستخرج من محادثة واتساب واستخراج الحسابات بوضوح:
    
    النص: "${text}"`,
    config: {
      systemInstruction: `أنت محاسب خبير. مهمتك هي استخراج المعاملات المالية من نصوص واتساب غير المنظمة.
      - حدد العملة (مثل: USD للدوﻻر، TRY لليرة التركية، SYP لليرة السورية).
      - إذا ذكر المستخدم "ليرة" فقط في سياق سوري، فاستخدم SYP. إذا كان في سياق تركي، فاستخدم TRY.
      - حدد المبلغ كرقم.
      - حدد النوع: INCOMING (وارد/له/أرسل لي/جاني) أو OUTGOING (صادر/عليه/صرفت/دفعت).
      - أضف وصفاً مختصراً للمعاملة.
      - إذا ذكر النص "لي" أو "وارد" فهي INCOMING.
      - إذا ذكر النص "علي" أو "صادر" أو "مصاريف" فهي OUTGOING.
      - ارجع النتيجة كقائمة JSON حصراً.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            currency: { type: Type.STRING, description: "رمز العملة الموحد (USD, TRY, SYP)" },
            amount: { type: Type.NUMBER, description: "القيمة العددية للمبلغ" },
            type: { type: Type.STRING, enum: ["INCOMING", "OUTGOING"], description: "نوع المعاملة" },
            description: { type: Type.STRING, description: "وصف المعاملة" }
          },
          required: ["currency", "amount", "type", "description"]
        }
      }
    }
  });

  const parsed = JSON.parse(response.text.trim());
  return parsed.map((item: any, index: number) => ({
    ...item,
    id: `${Date.now()}-${index}`
  }));
};
