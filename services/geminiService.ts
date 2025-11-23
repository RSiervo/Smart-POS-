import { GoogleGenAI, Type } from "@google/genai";
import { CartItem, Product, SaleRecord } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to sanitize output if the model adds markdown blocks
const cleanJson = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const getSmartRecommendations = async (cart: CartItem[], allProducts: Product[]): Promise<Product[]> => {
  const ai = getClient();
  if (!ai) return [];
  if (cart.length === 0) return [];

  const cartNames = cart.map(c => c.name).join(', ');
  // Use the dynamic product list passed from the App state
  const catalogContext = allProducts.map(p => `${p.id}: ${p.name} (₱${p.price}) - ${p.category}`).join('\n');

  const prompt = `
    Context: You are a smart AI assistant for a Philippine Grocery Store (Sari-sari store or Supermarket).
    Current Cart: ${cartNames}
    Product Catalog:
    ${catalogContext}

    Task: Suggest exactly 2 distinct products from the catalog that complement the current grocery cart.
    For example:
    - If they buy pasta, suggest sauce or cheese.
    - If they buy laundry soap, suggest fabric conditioner.
    - If they buy canned goods, suggest rice or bread.
    
    Return ONLY a JSON array of Product IDs (strings).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) return [];
    
    const suggestedIds: string[] = JSON.parse(cleanJson(jsonStr));
    return allProducts.filter(p => suggestedIds.includes(p.id));
  } catch (error) {
    console.error("Gemini Recs Error:", error);
    return [];
  }
};

export const analyzeSalesQuery = async (query: string, contextData: any): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Service unavailable. Please check API Key.";

  const dataStr = JSON.stringify(contextData);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a business analyst for a Grocery Store in the Philippines.
        Currency: PHP (₱).
        Here is the current sales data: ${dataStr}
        
        User Query: "${query}"
        
        Provide a concise, helpful, and professional answer. 
        If the query is about trends, explain them briefly.
        Keep cultural context in mind (e.g., mention staples like Rice or Canned goods if relevant).
      `,
    });
    return response.text || "I couldn't generate an answer.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Sorry, I encountered an error analyzing the data.";
  }
};

export const generateReceiptMessage = async (items: CartItem[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Salamat po! Come again.";

    const itemNames = items.map(i => i.name).join(', ');
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a short, friendly Taglish (Tagalog-English) thank you message for a grocery store receipt. The customer bought: ${itemNames}. Keep it under 15 words. Example: "Salamat sa pagbili ng bigas! Ingat po."`
        });
        return response.text || "Salamat po!";
    } catch (e) {
        return "Salamat po! Thank you for shopping.";
    }
}

export const generateInventoryReport = async (products: Product[], salesHistory: SaleRecord[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Service Unavailable.";

  // Simplify data to send to AI to save tokens
  const stockLevels = products.map(p => ({ name: p.name, stock: p.stock, price: p.price }));
  const salesSummary = salesHistory.map(s => ({ 
    customer: s.customerName, 
    total: s.total, 
    items: s.items.map(i => `${i.name} (x${i.quantity})`).join(', ')
  }));

  const prompt = `
    You are an intelligent Store Manager AI for a grocery store in the Philippines.
    
    Current Stock Levels:
    ${JSON.stringify(stockLevels)}

    Recent Sales History:
    ${JSON.stringify(salesSummary)}

    Task: Generate a comprehensive "Smart Inventory & Sales Report".
    
    Please include:
    1. **Restock Recommendations**: Which items are low on stock (below 20) and need urgent ordering?
    2. **Sales Insights**: Which items are selling fast based on the history?
    3. **Revenue Summary**: Brief comment on the recent transaction volume.
    4. **Action Items**: Bullet points on what the admin should do next.

    Format the output using simple Markdown (bolding, lists). Keep it professional but easy to read.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate report.";
  } catch (error) {
    console.error("Gemini Report Error:", error);
    return "Error generating AI report. Please try again later.";
  }
};

export const getRestockAdvice = async (lowStockItems: Product[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI unavailable.";
  if (lowStockItems.length === 0) return "No low stock items to analyze.";

  const items = lowStockItems.map(p => `${p.name} (Stock: ${p.stock}, Price: ₱${p.price})`).join('\n');

  const prompt = `
    You are an inventory expert for a grocery store.
    The following items are CRITICAL/LOW STOCK:
    ${items}

    Provide a quick, actionable restock plan.
    For each item, suggest a restock quantity (e.g., "Buy 50 units") based on common sense for a grocery store.
    Prioritize staple foods (rice, canned goods).
    Keep it short and direct.
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || "No advice generated.";
  } catch (e) {
      return "Error generating advice.";
  }
}