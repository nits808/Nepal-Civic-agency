export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { caseTitle, articles } = JSON.parse(event.body);
    
    const API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: "CRITICAL: API Key not configured in Netlify environment variables." }) 
      };
    }

    const prompt = `You are a professional investigative journalist for Nepal Civic Intelligence.\nThe case is: "${caseTitle}".\nRead the following latest news headlines. Write a concise, natural, 2-3 sentence summary explaining the newest developments based on these articles.\n\nLatest News Feed:\n${articles.map(a => `- ${a.title}: ${a.description}`).join('\n')}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to generate from Gemini API');
    }

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return {
      statusCode: 200,
      body: JSON.stringify({ summary })
    };
  } catch (error) {
    console.error("Summarizer Function Error:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};
