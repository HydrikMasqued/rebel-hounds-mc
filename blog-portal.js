// ===== BLOG PORTAL - FULL CRUD SYSTEM =====

const BLOG_STORAGE_KEY = 'rh_blog_posts';
const DEFAULT_POSTS = [
  {
    id: Date.now().toString(),
    title: 'Club Established — October 2021',
    date: '2021-10-15',
    category: 'News',
    content: 'The Rebel Hounds Motorcycle Club was born from the Perished Ones MC, transitioning from GTA Online into FiveM with a militant culture and brotherhood forged on the road.',
    author: 'Club President'
  },
  {
    id: (Date.now() + 1).toString(),
    title: 'Five Directives — The Foundation',
    date: '2021-11-02',
    category: 'Announcement',
    content: 'Every member lives by the Five Directives. Non-negotiable laws that keep the club strong, unified and disciplined. Read the full directives on the Patch Rules page.',
    author: 'Club President'
  },
  {
    id: (Date.now() + 2).toString(),
    title: 'Growing the Chapter',
    date: '2021-11-20',
    category: 'Recruitment',
    content: 'With 28 members and 5 chapters, the Rebel Hounds continue to expand across Los Santos. New prospects are always welcome — check the Recruitment page for requirements.',
    author: 'Club Secretary'
  }
];

let currentPost = null; // Track post being edited

// Load all blog posts on init
function initBlog() {
  loadAllPosts();
  setupModalEvents();
}

// ===== CRUD OPERATIONS =====

// Create/Update a new or existing post
function createOrUpdatePost(data) {
  let posts = getPostsFromStorage();

  const existingIndex = posts.findIndex(p => p.id === data.id);

  if (existingIndex >= 0) {
    // Update existing post
    posts[existingIndex] = { id: data.id, ...data };
    console.log('Post updated:', data.title);
  } else {
    // Create new post
    const newId = Date.now().toString();
    const newPost = { id: newId, author: 'You', ...data };
    posts.unshift(newPost); // Add to top
    currentPost = null; // Clear edit mode
    console.log('New post created:', data.title);
  }

  savePostsToStorage(posts);
  loadAllPosts();
}

// Read (load) all posts
function loadAllPosts() {
  const container = document.getElementById('blogPosts');
  
  let posts = getPostsFromStorage();
  
  // If no posts yet, use defaults
  if (!posts || posts.length === 0) {
    posts = JSON.parse(JSON.stringify(DEFAULT_POSTS));
    savePostsToStorage(posts);
  }

  container.innerHTML = '';

  posts.forEach(post => {
    const card = createPostCard(post);
    container.appendChild(card);
  });
}

// Delete a post
function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  let posts = getPostsFromStorage().filter(p => p.id !== id);
  
  if (posts.length === 0) {
    // Reset to defaults if empty
    savePostsToStorage(JSON.parse(JSON.stringify(DEFAULT_POSTS)));
  } else {
    savePostsToStorage(posts);
  }

  loadAllPosts();
}

// ===== STORAGE HANDLERS =====

function getPostsFromStorage() {
  try {
    const data = localStorage.getItem(BLOG_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Failed to load blog posts:', e);
    return null;
  }
}

function savePostsToStorage(posts) {
  try {
    localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts));
  } catch (e) {
    console.error('Failed to save blog posts:', e);
  }
}

// ===== UI HELPERS =====

function createPostCard(post) {
  const card = document.createElement('div');
  card.className = 'content-card';
  card.id = `post-${post.id}`;

  const dateFormatted = new Date(post.date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const categoryColor = getCategoryColor(post.category);

  card.innerHTML = `
    <div class="post-card-header">
      <span class="badge" style="background: ${categoryColor}; padding: 0.3rem 0.6rem; font-size: 0.8rem;">${post.category}</span>
      <span class="date-text" style="color: #888; font-size: 0.9rem;">${dateFormatted}</span>
      <button class="delete-btn hidden" id="delete-${post.id}" title="Delete post">🗑️</button>
    </div>

    <h3>${escapeHtml(post.title)}</h3>
    
    ${post.author ? `<p style="color: #888; font-size: 0.9rem;">By ${escapeHtml(post.author)}</p>` : ''}

    <p class="post-excerpt">${truncate(post.content, 200)}</p>

    <div class="post-actions" style="margin-top: 1rem;">
      <button class="btn btn-secondary btn-sm" onclick="openEdit('${post.id}')">✏️ Edit</button>
      ${currentPost?.id === post.id ? `<button class="btn btn-success btn-sm" onclick="saveCurrentPost()">✓ Save Changes</button>` : ''}
    </div>

    <style>
      .post-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
      .badge { border-radius: 4px; font-weight: 600; }
      .date-text { margin-left: 1rem; }
      .delete-btn { background: #dc3545; color: white; border: none; padding: 0.25rem 0.5rem; cursor: pointer; border-radius: 4px; }
      .post-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    </style>
  `;

  // Setup delete button
  const delBtn = card.querySelector(`#delete-${post.id}`);
  if (delBtn) {
    delBtn.addEventListener('click', () => deletePost(post.id));
  }

  return card;
}

function getCategoryColor(category) {
  const colors = {
    'News': '#dc3545',
    'Events': '#ffc107',
    'Recruitment': '#28a745',
    'Club News': '#17a2b8',
    'Announcement': '#6f42c1'
  };
  return colors[category] || '#6c757d';
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength).trim() + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== MODAL HANDLERS =====

function setupModalEvents() {
  // Add new post button
  document.getElementById('addPostBtn').addEventListener('click', () => openNewPost());

  // Close modal button
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);

  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', closeModal);

  // Save post button
  document.getElementById('savePostBtn').addEventListener('click', saveCurrentPost);

  // Close on backdrop click
  const modal = document.getElementById('editModal');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function openNewPost() {
  currentPost = null;
  
  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = '✏️ New Post';
  
  // Set default date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('postDate').value = today;
  
  // Clear all fields
  document.getElementById('editPostId').value = '';
  document.getElementById('postTitle').value = '';
  document.getElementById('postContent').value = '';
  document.getElementById('savePostBtn').textContent = 'Save Post';
}

function openEdit(postId) {
  const posts = getPostsFromStorage();
  const post = posts.find(p => p.id === postId);

  if (!post) return;

  currentPost = post; // Set to edit mode

  document.getElementById('editModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = `✏️ Edit "${escapeHtml(post.title)}"`;
  
  document.getElementById('editPostId').value = post.id;
  document.getElementById('postTitle').value = post.title;
  document.getElementById('postDate').value = post.date;
  document.getElementById('postCategory').value = post.category;
  document.getElementById('postContent').value = post.content;
  
  if (post.author) {
    document.getElementById('savePostBtn').textContent = 'Save Changes';
  } else {
    document.getElementById('savePostBtn').textContent = 'Save Post';
  }
}

function closeModal() {
  document.getElementById('editModal').classList.add('hidden');
  currentPost = null;
}

function saveCurrentPost() {
  if (!currentPost) {
    // Create new post
    const data = {
      title: document.getElementById('postTitle').value,
      date: document.getElementById('postDate').value,
      category: document.getElementById('postCategory').value,
      content: document.getElementById('postContent').value
    };
    createOrUpdatePost(data);
    closeModal();
  } else {
    // Update existing post
    const data = {
      id: currentPost.id,
      title: document.getElementById('postTitle').value,
      date: document.getElementById('postDate').value,
      category: document.getElementById('postCategory').value,
      content: document.getElementById('postContent').value
    };
    createOrUpdatePost(data);
    closeModal();
  }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', initBlog);
