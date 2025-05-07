// DOM Elements
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const generateTagsButton = document.getElementById('generate-tags');
const tagsContainer = document.getElementById('tags');
const resultsContainer = document.getElementById('results');
const loadingIndicator = document.getElementById('loading');
const orientationSelect = document.getElementById('orientation');
const colorSelect = document.getElementById('color');
const loadMoreButton = document.getElementById('load-more');
const currentPageElement = document.getElementById('current-page');

// Add these variables at the top with other declarations
let currentPage = 1;
let isLoading = false;

// API Keys and Configuration
const API_CONFIG = {
  pexels: {
    baseUrl: 'https://api.pexels.com/v1/search',
    headers: {
      'Authorization': 'jqMGQifjkoGaGBlGLzlLVY8gqzdblXQnblBrMaJDwElpboN5eK2GSoNE'
    }
  },
  pixabay: {
    baseUrl: 'https://pixabay.com/api/',
    params: {
      key: '14457919-6f5811b9e1be1829093f9c5cd',
      image_type: 'photo',
      safesearch: true
    }
  }
};

// Event Listeners
searchButton.addEventListener('click', () => {
  currentPage = 1; // Reset page number for new searches
  searchImages();
});
searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    currentPage = 1; // Reset page number for new searches
    searchImages();
  }
});
generateTagsButton.addEventListener('click', generateTags);
loadMoreButton.addEventListener('click', () => {
  currentPage++;
  searchImages();
});

// Modify your existing search function to support pagination
async function searchImages() {
  if (isLoading) return;
  
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) {
    alert("Please enter a search term");
    return;
  }

  // Show loading state
  isLoading = true;
  loadingIndicator.style.display = 'block';
  loadMoreButton.disabled = true;

  try {
    const orientation = orientationSelect.value;
    const color = colorSelect.value;

    // Add page parameter to your API calls
    const results = await Promise.all([
      fetchPexelsImages(searchTerm, orientation, color, currentPage),
      fetchPixabayImages(searchTerm, orientation, color, currentPage)
    ]);

    // Clear results only if it's the first page
    if (currentPage === 1) {
      resultsContainer.innerHTML = '';
    }

    // Combine and normalize results
    const combinedPhotos = [
      ...normalizeResults(results[0]),
      ...normalizePixabayResults(results[1])
    ];

    // Display results
    displayImages(combinedPhotos, color);

    // Update page info
    currentPageElement.textContent = currentPage;

    // Enable/disable load more button based on results
    loadMoreButton.disabled = false;
    if (combinedPhotos.length === 0) {
      loadMoreButton.disabled = true;
    }
  } catch (error) {
    console.error('Error fetching images:', error);
    resultsContainer.innerHTML = '<p class="message">Error loading images. Please try again.</p>';
  } finally {
    isLoading = false;
    loadingIndicator.style.display = 'none';
  }
}

// Replace the existing performSearch function
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    alert("Please enter a search term");
    return;
  }

  loadingIndicator.style.display = 'block';
  resultsContainer.innerHTML = '';

  try {
    const orientation = orientationSelect.value;
    const color = colorSelect.value;
    
    // Fetch from multiple sources simultaneously
    const results = await Promise.all([
      fetchPexelsImages(query, orientation, color),
      fetchPixabayImages(query, orientation, color)
    ]);
    
    // Combine and normalize results
    const combinedPhotos = [
      ...normalizeResults(results[0]),
      ...normalizePixabayResults(results[1])
    ];

    if (combinedPhotos.length > 0) {
      displayImages(combinedPhotos, color);
    } else {
      resultsContainer.innerHTML = '<div class="message">No images found. Try different keywords.</div>';
    }

  } catch (error) {
    console.error('Error fetching images:', error);
    resultsContainer.innerHTML = `<div class="message">Error fetching images: ${error.message}</div>`;
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

// Add these new helper functions
async function fetchPexelsImages(query, orientation, color, page = 1) {
  const params = new URLSearchParams({
    query: query,
    per_page: '20',
    page: page,
    orientation: orientation !== 'any' ? orientation : ''
  });

  try {
    const response = await fetch(`${API_CONFIG.pexels.baseUrl}?${params}`, {
      headers: API_CONFIG.pexels.headers
    });

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Pexels API error:', error);
    throw error;
  }
}

async function fetchPixabayImages(query, orientation, color, page = 1) {
  const params = new URLSearchParams({
    ...API_CONFIG.pixabay.params,
    q: query,
    per_page: 20,
    page: page,
    orientation: orientation !== 'any' ? orientation : 'all'
  });

  try {
    const response = await fetch(`${API_CONFIG.pixabay.baseUrl}?${params}`);
    if (!response.ok) throw new Error(`Pixabay API error: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Pixabay API error:', error);
    throw error;
  }
}

// Add normalization functions to standardize the response format
function normalizePixabayResults(data) {
  return data.hits.map(image => ({
    id: `pixabay-${image.id}`,
    source: 'Pixabay',
    photographer: image.user,
    alt: image.tags,
    src: {
      original: image.largeImageURL,
      large: image.largeImageURL,
      medium: image.webformatURL,
      small: image.previewURL
    },
    avg_color: null, // Pixabay doesn't provide color info
    url: image.pageURL
  }));
}

function normalizeResults(data) {
  return data.photos.map(photo => ({
    id: `pexels-${photo.id}`,
    source: 'Pexels',
    photographer: photo.photographer,
    alt: photo.alt,
    src: photo.src,
    avg_color: photo.avg_color,
    url: photo.url
  }));
}

// Add this function before the displayImages function
async function downloadImage(url, filename) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    alert('Failed to download image. Please try again.');
  }
}

// Display Images Function
function displayImages(photos, colorFilter) {
  resultsContainer.innerHTML = '';
  
  // Filter by color if needed
  let filteredPhotos = photos;
  if (colorFilter !== 'any') {
    filteredPhotos = photos.filter(photo => {
      // Simple color matching based on avg_color
      if (!photo.avg_color) return true;
      
      const avgColor = photo.avg_color.toLowerCase();
      return avgColor.includes(colorFilter.toLowerCase());
    });
    
    if (filteredPhotos.length === 0) {
      resultsContainer.innerHTML = '<div class="message">No images match your color filter. Try a different color.</div>';
      return;
    }
  }
  
  // Create image cards
  filteredPhotos.forEach(photo => {
    const card = document.createElement('div');
    card.className = 'image-card';
    
    card.innerHTML = `
      <img src="${photo.src.medium}" alt="${photo.alt || 'Stock image'}" loading="lazy">
      <p>By: ${photo.photographer} on ${photo.source}</p>
      <div class="download-options">
        <select class="size-select">
          <option value="${photo.src.small}">Small</option>
          <option value="${photo.src.medium}" selected>Medium</option>
          <option value="${photo.src.large}">Large</option>
          <option value="${photo.src.original}">Original</option>
        </select>
        <button class="download-button">Download</button>
      </div>
    `;

    const sizeSelect = card.querySelector('.size-select');
    const downloadButton = card.querySelector('.download-button');
    downloadButton.addEventListener('click', () => {
      const selectedUrl = sizeSelect.value;
      const size = sizeSelect.options[sizeSelect.selectedIndex].text;
      const filename = `${photo.photographer.replace(/\s+/g, '-')}_${size}.jpg`;
      downloadImage(selectedUrl, filename);
    });
    
    resultsContainer.appendChild(card);
  });
}

// Generate Tags Function
function generateTags() {
  const query = searchInput.value.trim();
  if (!query) {
    alert("Please enter a search term to generate tags");
    return;
  }
  
  // Simple tag suggestions based on the query
  const tagSuggestions = getTagSuggestions(query);
  
  // Display tags
  tagsContainer.innerHTML = '';
  if (!tagSuggestions || tagSuggestions.length === 0) {
    tagsContainer.innerHTML = '<div class="message">No tags available for this search term.</div>';
    return;
  }
  
  tagSuggestions.forEach(tag => {
    const tagElement = document.createElement('span');
    tagElement.className = 'tag';
    tagElement.textContent = tag;
    
    // Make tag clickable to use as search term
    tagElement.addEventListener('click', () => {
      searchInput.value = tag;
      performSearch();
    });
    
    tagsContainer.appendChild(tagElement);
  });
}

// Helper function to get tag suggestions
function getTagSuggestions(query) {
  const lowercaseQuery = query.toLowerCase();
  
  // Simple mapping of related tags
  const tagMappings = {
    'nature': ['forest', 'mountain', 'landscape', 'wildlife', 'river'],
    'city': ['urban', 'skyline', 'street', 'building', 'architecture'],
    'food': ['restaurant', 'delicious', 'cooking', 'healthy', 'fruit'],
    'people': ['portrait', 'happy', 'professional', 'lifestyle', 'family'],
    'technology': ['computer', 'digital', 'modern', 'innovation', 'gadget'],
    'travel': ['adventure', 'vacation', 'explore', 'destination', 'journey'],
    'business': ['office', 'professional', 'corporate', 'meeting', 'workspace'],
    'animal': ['wildlife', 'pet', 'cute', 'dog', 'cat'],
    'water': ['ocean', 'sea', 'lake', 'river', 'beach'],
    'car': ['vehicle', 'automotive', 'transport', 'speed', 'road']
  };
  
  // Check for direct matches first
  for (const [key, tags] of Object.entries(tagMappings)) {
    if (lowercaseQuery.includes(key)) {
      return tags;
    }
  }
  
  // If no direct match, return general photography tags
  return ['high quality', 'professional', 'creative', 'colorful', 'lifestyle'];
}

// Show initial instructions
resultsContainer.innerHTML = '<div class="message">Enter a search term and click "Search" to find images</div>';