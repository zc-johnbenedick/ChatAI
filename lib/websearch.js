/**
 * Fetches up-to-date context for queries that fall outside the knowledge base.
 * Uses current date/time, DuckDuckGo instant answers, Wikipedia, and optional Brave Search.
 */

const TIME_SENSITIVE =
  /\b(today|now|current|latest|recent|this week|this month|this year|weather|news|stock|price|who is|what is the date|what time)\b/i;

/**
 * @param {string} query
 */
export function queryNeedsFreshData(query, similarity) {
  if (similarity < 0.78) return true;
  return TIME_SENSITIVE.test(query);
}

/**
 * @param {string} query
 * @returns {Promise<string>}
 */
export async function performWebSearch(query) {
  const sections = [];

  const now = new Date();
  sections.push(
    `Current date and time: ${now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })}`,
  );

  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  if (braveKey) {
    try {
      const braveResults = await fetchBraveResults(query, braveKey);
      if (braveResults) sections.push(braveResults);
    } catch (err) {
      console.error('Brave search failed:', err);
    }
  }

  try {
    const ddgResults = await fetchDuckDuckGoResults(query);
    if (ddgResults) sections.push(ddgResults);
  } catch (err) {
    console.error('DuckDuckGo search failed:', err);
  }

  try {
    const wikiResults = await fetchWikipediaSummary(query);
    if (wikiResults) sections.push(wikiResults);
  } catch (err) {
    console.error('Wikipedia search failed:', err);
  }

  if (sections.length === 1) {
    sections.push(
      `No detailed web results were found for "${query}". Use the current date/time above and answer from general knowledge when appropriate. State clearly if information may be outdated.`,
    );
  }

  return sections.join('\n\n');
}

/**
 * @param {string} query
 * @param {string} apiKey
 */
async function fetchBraveResults(query, apiKey) {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '5');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const webResults = data.web?.results ?? [];

  if (webResults.length === 0) return null;

  const snippets = webResults
    .slice(0, 5)
    .map((item, index) => {
      const title = item.title ?? 'Untitled';
      const description = item.description ?? '';
      const pageUrl = item.url ?? '';
      return `${index + 1}. ${title}\n${description}\nSource: ${pageUrl}`;
    })
    .join('\n\n');

  return `Web search results:\n${snippets}`;
}

/**
 * @param {string} query
 */
async function fetchDuckDuckGoResults(query) {
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_redirect', '1');
  url.searchParams.set('no_html', '1');
  url.searchParams.set('skip_disambig', '1');

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const parts = [];

  if (data.Answer) {
    parts.push(`Direct answer: ${data.Answer}`);
  }

  if (data.AbstractText) {
    const source = data.AbstractSource ? ` (${data.AbstractSource})` : '';
    parts.push(`Summary${source}: ${data.AbstractText}`);
  }

  const related = (data.RelatedTopics ?? [])
    .flatMap((topic) => {
      if (topic.Text) return [topic.Text];
      if (Array.isArray(topic.Topics)) {
        return topic.Topics.map((sub) => sub.Text).filter(Boolean);
      }
      return [];
    })
    .slice(0, 3);

  if (related.length > 0) {
    parts.push(`Related:\n${related.map((text, i) => `${i + 1}. ${text}`).join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

/**
 * @param {string} query
 */
async function fetchWikipediaSummary(query) {
  const searchUrl = new URL('https://en.wikipedia.org/w/api.php');
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('srsearch', query);
  searchUrl.searchParams.set('format', 'json');
  searchUrl.searchParams.set('srlimit', '1');
  searchUrl.searchParams.set('origin', '*');

  const searchResponse = await fetch(searchUrl);
  if (!searchResponse.ok) return null;

  const searchData = await searchResponse.json();
  const title = searchData.query?.search?.[0]?.title;
  if (!title) return null;

  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summaryResponse = await fetch(summaryUrl, {
    headers: { Accept: 'application/json' },
  });

  if (!summaryResponse.ok) return null;

  const summary = await summaryResponse.json();
  if (!summary.extract) return null;

  const source = summary.content_urls?.desktop?.page ?? '';
  return `Wikipedia (${title}): ${summary.extract}${source ? `\nSource: ${source}` : ''}`;
}
