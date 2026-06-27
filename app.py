import os
import requests
import feedparser
from flask import Flask, render_template, jsonify

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    try:
        # Fetch the RSS feed using requests (with a timeout)
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse feed content
        feed = feedparser.parse(response.content)
        
        notes = []
        for entry in feed.entries:
            # Atom feeds put full HTML content in 'content' list.
            content = ""
            if 'content' in entry and len(entry['content']) > 0:
                content = entry['content'][0].get('value', '')
            if not content:
                content = entry.get('summary', '')
            
            notes.append({
                'id': entry.get('id', ''),
                'title': entry.get('title', 'Unknown Date'),
                'link': entry.get('link', ''),
                'updated': entry.get('updated', entry.get('published', '')),
                'content': content
            })
            
        return jsonify({
            'success': True,
            'title': feed.feed.get('title', 'BigQuery Release Notes'),
            'notes': notes
        })
        
    except requests.exceptions.RequestException as req_err:
        return jsonify({
            'success': False,
            'error': f"Failed to fetch feed: {str(req_err)}"
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"An error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    # Start the Flask app
    app.run(debug=True, host='127.0.0.1', port=5000)
