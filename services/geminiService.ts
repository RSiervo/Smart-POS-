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

// Helper to remove asterisks, hash signs, and markdown bolding for clean UI text
const cleanReportText = (text: string) => {
    return text
        .replace(/\*\*/g, '')   // Remove bolding **
        .replace(/\*/g, '')     // Remove single asterisks
        .replace(/#/g, '')      // Remove headers #
        .replace(/```/g, '')    // Remove code blocks
        .trim();
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

  // Simplify context data to essential numbers to prevent token overflow
  const simpleContext = {
      dailySales: contextData.dailySales,
      topCategories: contextData.categories
  };
  const dataStr = JSON.stringify(simpleContext);
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `
        You are a business analyst for a Grocery Store in the Philippines.
        Currency: PHP (₱).
        Data: ${dataStr}
        
        User Query: "${query}"
        
        Provide a concise answer (max 40 words).
        NO asterisks (*). NO markdown.
      `,
    });
    return cleanReportText(response.text || "I couldn't generate an answer.");
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Sorry, I encountered an error analyzing the data.";
  }
};

export const generateReceiptMessage = async (items: CartItem[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "Salamat po! Come again.";

    const itemNames = items.slice(0, 5).map(i => i.name).join(', '); // Limit items
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Write a short, friendly Taglish (Tagalog-English) thank you message for a grocery receipt. Items: ${itemNames}. Max 10 words. Example: "Salamat sa pagbili ng bigas! Ingat po."`
        });
        return cleanReportText(response.text || "Salamat po!");
    } catch (e) {
        return "Salamat po! Thank you for shopping.";
    }
}

export const generateInventoryReport = async (products: Product[], salesHistory: SaleRecord[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI Service Unavailable.";

  // PERFORMANCE OPTIMIZATION: 
  // 1. Only send items with stock < 50 to focus the AI on actionable data.
  // 2. Limit sales history to recent 5 transactions.
  const relevantStock = products
    .filter(p => p.stock < 50)
    .slice(0, 50) // Limit to 50 items max to speed up processing
    .map(p => ({ name: p.name, stock: p.stock }));
    
  const salesSummary = salesHistory.slice(0, 5).map(s => ({ 
    total: s.total, 
    items: s.items.map(i => i.name).join(', ')
  }));

  const prompt = `
    Role: Store Manager AI.
    Low/Medium Stock Items: ${JSON.stringify(relevantStock)}
    Recent Sales: ${JSON.stringify(salesSummary)}

    Task: Create a "Smart Inventory Report".
    
    Strict Formatting Rules:
    1. Start with title: "INVENTORY STATUS REPORT"
    2. NO asterisks (*), bolding, or markdown.
    3. Use hyphens (-) for lists.
    4. Keep it concise.

    Content:
    - List top 3 items needing restock.
    - Identify 1 trend based on sales.
    - 1 Quick tip.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { maxOutputTokens: 1000 } // Increased from 300 to prevent cut-off
    });
    
    if (!response.text) {
        console.warn("Gemini returned empty text for report.");
        return "Report generation incomplete. Please try again.";
    }
    return cleanReportText(response.text);
  } catch (error) {
    console.error("Gemini Report Error:", error);
    return "Error generating AI report. Please check your internet connection.";
  }
};

export const getRestockAdvice = async (lowStockItems: Product[], salesHistory: SaleRecord[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "AI unavailable.";
  if (lowStockItems.length === 0) return "No low stock items to analyze.";

  // Simplify input for speed
  const itemAnalysis = lowStockItems.slice(0, 20).map(p => {
    const totalSold = salesHistory.reduce((acc, sale) => {
        const item = sale.items.find(i => i.id === p.id);
        return acc + (item ? item.quantity : 0);
    }, 0);
    return `${p.name}: Stock ${p.stock}, Sold ${totalSold}`;
  }).join('\n');

  const prompt = `
    Role: Inventory Manager AI.
    Data:
    ${itemAnalysis}
    
    Task: Suggest restock quantities.
    
    Strict Formatting Rules:
    1. Start with title: "RESTOCK RECOMMENDATIONS"
    2. NO asterisks (*) or markdown.
    3. Use hyphens (-) for list items.
    
    Format per line:
    - [Item Name]: Buy [Qty]. [Reason]
  `;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { maxOutputTokens: 1000 } // Increased limit
    });
    return cleanReportText(response.text || "No advice generated.");
  } catch (e) {
      return "Error generating advice.";
  }
};

export const generateBusinessStrategy = async (stats: any, topProducts: any[]): Promise<string> => {
    const ai = getClient();
    if (!ai) return "AI unavailable.";

    // AGGRESSIVE OPTIMIZATION for Speed:
    // 1. Limit top products to 3 items only.
    // 2. Round revenue to integer to save string length.
    const topCats = topProducts.slice(0, 3).map((p:any) => p.name).join(', ');
    const revenue = Math.round(stats.totalSales);

    const prompt = `
      Data: Revenue P${revenue}, Orders ${stats.totalOrders}. Top Items: ${topCats}.
      Task: List 3 very short, actionable strategies to increase sales.
      
      Strict Formatting Rules:
      1. Start with title: "QUICK STRATEGY"
      2. NO asterisks (*). NO markdown.
      3. Use hyphens (-) for bullet points.
      4. Max 50 words total.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                maxOutputTokens: 250, // Reduced to force fast generation
                temperature: 0.7
            }
        });
        return cleanReportText(response.text || "Strategy generated successfully.");
    } catch (e) {
        console.error("Strategy Gen Error:", e);
        return "Strategy currently unavailable.";
    }
};