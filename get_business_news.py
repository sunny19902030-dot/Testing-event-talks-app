import feedparser
import requests

# Standard Google News Business RSS feed URL
BUSINESS_NEWS_URL = "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en"

def get_top_headlines(limit=5):
    try:
        print("Fetching Google News Business RSS feed...")
        # Fetching with requests to simulate browser header in case of restrictions
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(BUSINESS_NEWS_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        
        if not feed.entries:
            print("No entries found or failed to parse feed.")
            return []
            
        print(f"Successfully fetched {len(feed.entries)} entries.")
        headlines = []
        for i, entry in enumerate(feed.entries[:limit]):
            headlines.append({
                'title': entry.get('title', ''),
                'link': entry.get('link', ''),
                'source': entry.get('source', {}).get('title', entry.get('publisher', 'Unknown')),
                'published': entry.get('published', '')
            })
        return headlines
    except Exception as e:
        print(f"Error fetching news: {e}")
        return []

if __name__ == "__main__":
    headlines = get_top_headlines()
    for index, h in enumerate(headlines, 1):
        print(f"{index}. [{h['source']}] {h['title']}")
        print(f"   Link: {h['link']}")
        print()
