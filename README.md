# BigQuery Release Radar 🚀

A modern, premium web application built using Python Flask, vanilla HTML5, CSS3, and JavaScript that parses and displays the official Google BigQuery Release Notes feed in a beautiful, interactive dashboard. It includes features for real-time search, category filtering, and direct sharing to Twitter.

---

## 🌟 Features

* **Sub-Update Segmentation**: Parses daily release notes and breaks them down into individual, readable update cards so you can isolate specific changes.
* **Smart Badges & Classification**: Categorizes updates as **Features**, **Changes**, **Deprecations**, or **Announcements** with corresponding color-coded, gradient badges.
* **Instant Client-Side Search**: Full-text searching across all updates, headings, summaries, and release dates.
* **Interactive Tweet Composer**:
  * Single-card tweeting (tweeting a specific update).
  * Multi-select batch tweeting (combining multiple updates into a single tweet summary).
  * Live character count validation (against Twitter's 280-character limit) with overflow warnings.
  * Auto-append Google documentation links.
  * Twitter Web Intent redirection (requires no API keys).
  * simulated local "Mock Post" feedback with completion checkmarks.
* **Glassmorphic Layout**: Responsive interface styled using modern CSS variables, blur filters, custom scrollbars, and glowing ambient background orbs.

---

## 🛠️ Technology Stack

* **Server-Side**: Python 3.11+, Flask 3.0.3, Requests, and Feedparser.
* **Client-Side**: HTML5, Vanilla CSS3 (custom layouts & animations), Vanilla JS (ES6 modules & DOM manipulation).
* **Icons**: Lucide Icons CDN.

---

## 📁 Directory Structure

```text
├── .git/                  # Local Git configurations
├── .gitignore             # File exclusion settings
├── .venv/                 # Virtual environment (ignored)
├── app.py                 # Flask server entry point & feed parser
├── requirements.txt       # Project python dependencies
├── static/
│   ├── css/
│   │   └── style.css      # Core stylesheet (layout, glassmorphism, animations)
│   └── js/
│       └── app.js         # Client engine (filtering, selection drawer, composer)
└── templates/
    └── index.html         # Main single page application template
```

---

## 🚀 Setup & Installation

### Prerequisites
* Python 3.11 or higher
* Git

### 1. Clone & Navigate to the Repository
```bash
git clone https://github.com/sunny19902030-dot/Testing-event-talks-app.git
cd Testing-event-talks-app
```

### 2. Create and Activate Virtual Environment
On Windows:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```
On macOS/Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

Open your browser and navigate to **`http://127.0.0.1:5000`**.

---

## 🔍 How It Works

### Feed Parsing:
When you click the **Refresh** button, the client requests data from the `/api/release-notes` Flask endpoint. The server fetches the feed from Google, uses `feedparser` to normalize the XML, and returns a JSON payload. 

The client-side JavaScript engine parses the HTML content, searching for `<h3>` headers to isolate individual features or changes. It then maps the categories to badges and compiles the raw text content for tweet formatting.

### Twitter Integration:
When you compose a tweet, the app encodes the text payload and opens a Twitter Web Intent:
```javascript
https://twitter.com/intent/tweet?text=URL_ENCODED_MESSAGE
```
This safely forwards you directly to Twitter's web editor with the text pre-filled, removing the need for a developer portal registration or API credentials.

---

## 📜 License

Created as a web application project. Built using Flask, JavaScript, and Vanilla CSS.
