// BigQuery Release Radar Frontend Logic

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let originalNotes = [];
    let parsedUpdates = [];
    let selectedUpdates = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let isTweetModalSingle = true; // flag to know if modal opened for single or multi
    let currentComposerTarget = null; // single update object or list of updates

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.querySelector('.status-indicator');
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search');
    const filterTagsContainer = document.getElementById('filter-tags-container');
    
    // Feed containers
    const feedLoader = document.getElementById('feed-loader');
    const feedError = document.getElementById('feed-error');
    const feedEmpty = document.getElementById('feed-empty');
    const timeline = document.getElementById('timeline');
    const retryBtn = document.getElementById('retry-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');

    // Selection Bar
    const selectionBar = document.getElementById('selection-bar');
    const selectionCount = document.getElementById('selection-count');
    const clearSelectionBtn = document.getElementById('clear-selection-btn');
    const tweetSelectedBtn = document.getElementById('tweet-selected-btn');

    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const charWarning = document.getElementById('char-warning');
    const includeUrlToggle = document.getElementById('include-url-toggle');
    const mockTweetBtn = document.getElementById('mock-tweet-btn');
    const postTweetBtn = document.getElementById('post-tweet-btn');

    // Toast
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    // Fetch Release Notes from API
    async function fetchReleaseNotes() {
        showLoadingState();
        try {
            const response = await fetch('/api/release-notes');
            const data = await response.json();
            
            if (data.success) {
                originalNotes = data.notes;
                parsedUpdates = parseFeedEntries(originalNotes);
                
                // Reset selections
                selectedUpdates = [];
                updateSelectionBar();

                // Render
                renderFeed();
                
                // Update Status
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                statusText.textContent = `Updated at ${timeStr}`;
                statusIndicator.className = 'status-indicator online';
            } else {
                showErrorState(data.error);
            }
        } catch (error) {
            showErrorState(error.message);
        }
    }

    // Parse feed HTML content into individual update cards
    function parseFeedEntries(entries) {
        const updates = [];
        let indexCounter = 0;

        entries.forEach((entry) => {
            const parser = new DOMParser();
            // Google feeds have rich text HTML in 'content' or 'summary'
            const doc = parser.parseFromString(entry.content, 'text/html');
            
            // Standard Cloud feeds separate updates under <h3> headings
            const headings = doc.querySelectorAll('h3');
            
            if (headings.length === 0) {
                // If there are no <h3> tags, parse it as a single general update
                const plainText = doc.body.textContent.trim();
                const type = detectTypeFromText(entry.title + " " + plainText);
                
                updates.push({
                    id: `up-${indexCounter++}`,
                    date: entry.title,
                    parentLink: entry.link,
                    type: type,
                    contentHtml: entry.content,
                    textText: cleanTweetText(plainText),
                    selected: false
                });
            } else {
                headings.forEach((heading) => {
                    const headingText = heading.textContent.trim();
                    const type = mapHeadingToType(headingText);
                    
                    // Grab all siblings following this heading until the next <h3>
                    let sibling = heading.nextElementSibling;
                    let contentHtml = '';
                    let rawTextParts = [];
                    
                    while (sibling && sibling.tagName !== 'H3') {
                        contentHtml += sibling.outerHTML;
                        rawTextParts.push(sibling.textContent.trim());
                        sibling = sibling.nextElementSibling;
                    }
                    
                    const plainText = rawTextParts.filter(t => t.length > 0).join('\n');
                    
                    updates.push({
                        id: `up-${indexCounter++}`,
                        date: entry.title,
                        parentLink: entry.link,
                        type: type,
                        contentHtml: contentHtml || `<p>${headingText}</p>`,
                        textText: cleanTweetText(plainText || headingText),
                        selected: false
                    });
                });
            }
        });
        
        return updates;
    }

    // Helper to map headings like "Change", "Feature" to standard categories
    function mapHeadingToType(heading) {
        const h = heading.toLowerCase();
        if (h.includes('feature') || h.includes('addition')) return 'Feature';
        if (h.includes('change') || h.includes('update')) return 'Change';
        if (h.includes('deprecat') || h.includes('remove')) return 'Deprecation';
        if (h.includes('announc') || h.includes('notice')) return 'Announcement';
        return 'General';
    }

    // Fallback classification if no headings are present
    function detectTypeFromText(text) {
        const t = text.toLowerCase();
        if (t.includes('feature') || t.includes('introduce') || t.includes('support for')) return 'Feature';
        if (t.includes('deprecat') || t.includes('obsolete') || t.includes('remove')) return 'Deprecation';
        if (t.includes('announc') || t.includes('welcome')) return 'Announcement';
        return 'Change';
    }

    // Clean text snippets of excessive whitespace or URLs for nicer tweets
    function cleanTweetText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/Link copied to clipboard\./gi, '')
            .trim();
    }

    // Filter and Search logic to render items
    function renderFeed() {
        // Filter elements
        let filtered = parsedUpdates.filter(update => {
            // Filter by type tag
            const matchesType = (activeFilter === 'all' || update.type === activeFilter);
            
            // Search text/date query
            const matchesSearch = searchQuery === '' || 
                update.date.toLowerCase().includes(searchQuery) ||
                update.type.toLowerCase().includes(searchQuery) ||
                update.textText.toLowerCase().includes(searchQuery) ||
                update.contentHtml.toLowerCase().includes(searchQuery);
                
            return matchesType && matchesSearch;
        });

        // Toggle feed states
        if (filtered.length === 0) {
            timeline.style.display = 'none';
            feedLoader.style.display = 'none';
            feedError.style.display = 'none';
            feedEmpty.style.display = 'flex';
            return;
        }

        feedEmpty.style.display = 'none';
        feedLoader.style.display = 'none';
        feedError.style.display = 'none';
        
        // Group by date
        const grouped = {};
        filtered.forEach(item => {
            if (!grouped[item.date]) {
                grouped[item.date] = [];
            }
            grouped[item.date].push(item);
        });

        // Build HTML
        timeline.innerHTML = '';
        
        for (const [date, items] of Object.entries(grouped)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'timeline-group';
            
            // Marker
            const markerDiv = document.createElement('div');
            markerDiv.className = 'timeline-date-marker';
            markerDiv.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-date-title">${date}</div>
            `;
            groupDiv.appendChild(markerDiv);
            
            // Items container
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'timeline-items';
            
            items.forEach(item => {
                const card = document.createElement('div');
                card.className = `release-card ${item.selected ? 'selected' : ''}`;
                card.setAttribute('data-id', item.id);
                card.setAttribute('data-type-border', item.type);
                
                card.innerHTML = `
                    <div class="card-select-column">
                        <label class="custom-checkbox">
                            <input type="checkbox" data-id="${item.id}" ${item.selected ? 'checked' : ''}>
                            <span class="checkmark"></span>
                        </label>
                    </div>
                    <div class="card-content-column">
                        <div class="card-header">
                            <span class="type-badge" data-type="${item.type}">
                                <i data-lucide="${getIconForType(item.type)}" class="inline-icon small"></i>
                                ${item.type}
                            </span>
                            <div class="card-actions">
                                <button class="btn-card-action tweet-single-btn" data-id="${item.id}" title="Tweet this update">
                                    <i data-lucide="twitter"></i>
                                </button>
                            </div>
                        </div>
                        <div class="html-content">
                            ${item.contentHtml}
                        </div>
                    </div>
                `;
                
                // Add event listeners to card
                // Checkbox toggle
                const checkbox = card.querySelector('input[type="checkbox"]');
                checkbox.addEventListener('change', (e) => {
                    toggleItemSelection(item.id, e.target.checked);
                });
                
                // Card body clicks (clicking details toggles select, except on links/buttons)
                card.addEventListener('click', (e) => {
                    if (e.target.tagName === 'A' || 
                        e.target.closest('a') || 
                        e.target.closest('.btn-card-action') || 
                        e.target.closest('input') || 
                        e.target.closest('.checkmark')) {
                        return; // Ignore links and buttons
                    }
                    checkbox.checked = !checkbox.checked;
                    toggleItemSelection(item.id, checkbox.checked);
                });

                // Tweet button click
                const tweetBtn = card.querySelector('.tweet-single-btn');
                tweetBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openTweetComposer(item);
                });
                
                itemsContainer.appendChild(card);
            });
            
            groupDiv.appendChild(itemsContainer);
            timeline.appendChild(groupDiv);
        }

        timeline.style.display = 'block';
        
        // Re-execute Lucide icons
        lucide.createIcons();
    }

    // Map release categories to Lucide icons
    function getIconForType(type) {
        switch(type) {
            case 'Feature': return 'sparkles';
            case 'Change': return 'refresh-cw';
            case 'Deprecation': return 'slash';
            case 'Announcement': return 'megaphone';
            default: return 'info';
        }
    }

    // Loading State
    function showLoadingState() {
        statusText.textContent = "Fetching updates...";
        statusIndicator.className = 'status-indicator loading';
        refreshBtn.disabled = true;
        feedLoader.style.display = 'flex';
        feedError.style.display = 'none';
        feedEmpty.style.display = 'none';
        timeline.style.display = 'none';
    }

    // Error State
    function showErrorState(msg) {
        console.error(msg);
        statusText.textContent = "Error sync";
        statusIndicator.className = 'status-indicator';
        refreshBtn.disabled = false;
        feedLoader.style.display = 'none';
        feedError.style.display = 'flex';
        feedEmpty.style.display = 'none';
        timeline.style.display = 'none';
        document.getElementById('error-message').textContent = msg || "Connection timed out.";
        showToast("Error updating feed details.", true);
    }

    // Selection management
    function toggleItemSelection(id, isSelected) {
        const item = parsedUpdates.find(u => u.id === id);
        if (item) {
            item.selected = isSelected;
            const card = document.querySelector(`.release-card[data-id="${id}"]`);
            if (card) {
                if (isSelected) card.classList.add('selected');
                else card.classList.remove('selected');
            }
            
            if (isSelected) {
                if (!selectedUpdates.includes(id)) selectedUpdates.push(id);
            } else {
                selectedUpdates = selectedUpdates.filter(uid => uid !== id);
            }
            
            updateSelectionBar();
        }
    }

    function updateSelectionBar() {
        const count = selectedUpdates.length;
        selectionCount.textContent = count;
        
        if (count > 0) {
            selectionBar.classList.add('active');
        } else {
            selectionBar.classList.remove('active');
        }
    }

    // Tweet Modal Text formatting
    function buildTweetText(target, includeUrl) {
        const prefix = "🚀 Google #BigQuery Update:\n\n";
        const hashtag = " #GoogleCloud #DataEngineering";
        
        if (isTweetModalSingle) {
            // Single update
            const update = target;
            const link = includeUrl ? `\n\nDoc: ${update.parentLink}` : '';
            
            // Clean/simplify the plain text
            let body = `[${update.type}] ${update.textText}`;
            
            // Handle standard character length (Max 280)
            const availableLength = 280 - prefix.length - link.length - hashtag.length;
            
            if (body.length > availableLength) {
                body = body.substring(0, availableLength - 3) + '...';
            }
            
            return `${prefix}${body}${link}${hashtag}`;
        } else {
            // Multi updates selection
            const updates = target;
            const link = includeUrl ? `\n\nDoc: ${updates[0].parentLink}` : '';
            
            let body = `Check out these updates from ${updates[0].date}:\n`;
            updates.forEach(u => {
                body += `• [${u.type}] ${u.textText}\n`;
            });
            
            // Truncate cleanly per line if needed
            const availableLength = 280 - prefix.length - link.length - hashtag.length;
            if (body.length > availableLength) {
                // Try summarizing or smart truncation
                body = body.substring(0, availableLength - 3) + '...';
            }
            
            return `${prefix}${body}${link}${hashtag}`;
        }
    }

    // Open Modal dialog
    function openTweetComposer(target) {
        if (Array.isArray(target)) {
            isTweetModalSingle = false;
            currentComposerTarget = target;
        } else {
            isTweetModalSingle = true;
            currentComposerTarget = target;
        }
        
        includeUrlToggle.checked = true;
        const initialText = buildTweetText(currentComposerTarget, true);
        tweetTextarea.value = initialText;
        
        updateCharCounter();
        
        tweetModal.classList.add('active');
        tweetTextarea.focus();
    }

    // Close Modal dialog
    function closeTweetModal() {
        tweetModal.classList.remove('active');
        currentComposerTarget = null;
    }

    // Update Textarea character count
    function updateCharCounter() {
        const text = tweetTextarea.value;
        const len = text.length;
        charCount.textContent = len;
        
        if (len > 280) {
            charCount.className = 'danger';
            charWarning.style.display = 'block';
            postTweetBtn.disabled = true;
        } else if (len > 250) {
            charCount.className = 'warning';
            charWarning.style.display = 'none';
            postTweetBtn.disabled = false;
        } else {
            charCount.className = '';
            charWarning.style.display = 'none';
            postTweetBtn.disabled = false;
        }
    }

    // Custom Toast Alert
    function showToast(message, isError = false) {
        toastMessage.textContent = message;
        toast.className = 'toast active' + (isError ? ' error' : '');
        
        // Setup simple Lucide icon swap inside toast
        const toastIcon = toast.querySelector('.toast-icon');
        if (isError) {
            toastIcon.setAttribute('data-id-icon', 'alert-circle');
            toastIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>`;
        } else {
            toastIcon.setAttribute('data-id-icon', 'check-circle');
            toastIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10"/><path d="m9 11 3 3 6-6"/></svg>`;
        }
        
        setTimeout(() => {
            toast.classList.remove('active');
        }, 3500);
    }

    // EVENT LISTENERS
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        // Spin effect
        const icon = refreshBtn.querySelector('.icon-refresh');
        icon.classList.add('loading-active');
        fetchReleaseNotes().finally(() => {
            icon.classList.remove('loading-active');
        });
    });

    // Retry on error card
    retryBtn.addEventListener('click', fetchReleaseNotes);

    // Search query changes
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        
        renderFeed();
    });

    // Clear search
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
        searchInput.focus();
    });

    // Filter Tag clicks
    filterTagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.filter-tag');
        if (tag) {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            activeFilter = tag.getAttribute('data-type');
            renderFeed();
        }
    });

    // Reset filters empty state button
    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
        document.querySelector('.filter-tag[data-type="all"]').classList.add('active');
        activeFilter = 'all';
        
        renderFeed();
    });

    // Bottom Selection drawer Clear Selection
    clearSelectionBtn.addEventListener('click', () => {
        parsedUpdates.forEach(u => u.selected = false);
        selectedUpdates = [];
        updateSelectionBar();
        renderFeed(); // Re-render to clear checkbox visuals
    });

    // Tweet Multi button click
    tweetSelectedBtn.addEventListener('click', () => {
        const selectedObjects = parsedUpdates.filter(u => selectedUpdates.includes(u.id));
        if (selectedObjects.length > 0) {
            openTweetComposer(selectedObjects);
        }
    });

    // Include URL toggle inside modal
    includeUrlToggle.addEventListener('change', (e) => {
        if (currentComposerTarget) {
            const newText = buildTweetText(currentComposerTarget, e.target.checked);
            tweetTextarea.value = newText;
            updateCharCounter();
        }
    });

    // Modal typing char count check
    tweetTextarea.addEventListener('input', updateCharCounter);

    // Close Modal buttons
    closeModalBtn.addEventListener('click', closeTweetModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeTweetModal);

    // Post via Twitter Web Intent
    postTweetBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const encodedText = encodeURIComponent(tweetText);
        const url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        window.open(url, '_blank', 'noopener,noreferrer');
        
        // Show success alert
        showToast("Twitter intent opened in a new tab!");
        
        // Reset state & selections
        closeTweetModal();
        clearSelectionBtn.click();
    });

    // Mock Tweet
    mockTweetBtn.addEventListener('click', () => {
        // Fake sending progress
        mockTweetBtn.disabled = true;
        const origText = mockTweetBtn.innerHTML;
        mockTweetBtn.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;margin:0;"></div> <span>Posting...</span>`;
        
        setTimeout(() => {
            mockTweetBtn.disabled = false;
            mockTweetBtn.innerHTML = origText;
            
            showToast("Tweet successfully simulated & saved!");
            
            closeTweetModal();
            clearSelectionBtn.click();
        }, 1200);
    });

    // Run on startup
    fetchReleaseNotes();
});
