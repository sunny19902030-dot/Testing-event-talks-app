import feedparser

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

try:
    print("Fetching feed...")
    feed = feedparser.parse(url)
    
    print("\n--- FEED METADATA ---")
    print("Feed Title:", feed.feed.get('title'))
    print("Feed Description:", feed.feed.get('subtitle', feed.feed.get('description')))
    print("Number of entries:", len(feed.entries))
    
    if feed.entries:
        first_entry = feed.entries[0]
        print("\n--- FIRST ENTRY DETAILS ---")
        print("Title:", first_entry.get('title'))
        print("Link:", first_entry.get('link'))
        print("Updated/Published:", first_entry.get('updated', first_entry.get('published')))
        print("ID:", first_entry.get('id'))
        
        # Check standard entry keys
        print("\nAll Keys in Entry:", list(first_entry.keys()))
        
        print("\nSummary/Content snippet:")
        print(first_entry.get('summary', first_entry.get('content', [{}])[0].get('value', ''))[:500])
        
except Exception as e:
    print("Error:", e)
