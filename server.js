import express from 'express';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// IMPORTANT: Store your API key in an environment variable, not in the code.
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn('Warning: OPENROUTER_API_KEY is not set. Set it before starting the server.');
}

/**
 * Performs a web search using a search API.
 * This is a placeholder function. In a real application, you would use a service
 * like Google Search API, SerpApi, or Brave Search API.
 * @param {string} query The search query.
 * @returns {Promise<string>} A string containing the search results.
 */
async function performWebSearch(query) {
  console.log(`Performing web search for: "${query}"`);
  // In a real implementation, you would make an API call to a search engine here.
  // For example, using fetch to call the SerpApi:
  // const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=YOUR_SERPAPI_KEY`;
  // const searchResponse = await fetch(searchUrl);
  // const searchData = await searchResponse.json();
  // const snippets = searchData.organic_results.map(r => r.snippet).join('\n');
  // return `Search results for "${query}":\n${snippets}`;

  // For this example, we'll return a dynamic placeholder for general queries,
  // and a specific real-time answer for date queries to demonstrate the capability.
  const lowerCaseQuery = query.toLowerCase();
  if (lowerCaseQuery.includes('date today') || lowerCaseQuery.includes('time now')) {
    // This simulates fetching real-time information.
    return `Today's date is ${new Date().toDateString()}.`;
  }

  return `Simulated search results for "${query}". A real implementation would provide up-to-date information to the AI based on the search query.`;
}

app.post('/api/chat', async (req, res) => {
  // The frontend will send the system prompt, the user's query, and the local search score
  const { systemPrompt, query, score } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  let finalSystemPrompt = systemPrompt;

  // Heuristic: if the local search score was low, perform a web search.
  // A score of 0 means no good local match was found.
  if (score === 0) {
    try {
      const searchResults = await performWebSearch(query);
      finalSystemPrompt += `\n\nHere is some up-to-date information from a web search that might be relevant:\n---${searchResults}\n---`;
    } catch (searchError) {
      console.error('Web search failed:', searchError);
      // Don't block the chat if search fails, just proceed without it.
    }
  }

  try {
    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173", // Or your app's URL
        "X-OpenRouter-Title": "AI Support Desk"
      },
      body: JSON.stringify({
        model: "nex-agi/nex-n2-pro:free",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: query }
        ]
      })
    });

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json();
      console.error("OpenRouter API Error:", errorData);
      throw new Error(errorData.error?.message || 'Failed to get response from OpenRouter');
    }

    const data = await openRouterResponse.json();
    const aiContent = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't find an answer.";

    res.json({ answer: aiContent });

  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    res.status(500).json({ error: 'Failed to get a response from the AI model.' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});