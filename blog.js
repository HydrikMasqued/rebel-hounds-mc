/* ===== Rebel Hounds MC — Blog System ===== */

const BLOG_STORAGE_KEY = 'rh_blog_posts';
const BLOG_AUTH_KEY = 'rh_patch_auth';

/* ===== Auth check (cyrb53 provided by portal.js) ===== */
function isBlogAuthed() {
  try { return sessionStorage.getItem(BLOG_AUTH_KEY) === '1'; } catch (e) { return false; }
}

/* ===== Storage helpers ===== */
function getAllPosts() {
  try {
    const raw = localStorage.getItem(BLOG_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveAllPosts(posts) {
  try { localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts)); } catch (e) {}
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/* ===== CRUD ===== */
function createPost(title, excerpt, content, author, pinned) {
  const posts = getAllPosts();
  const id = generateId();
  const slug = slugify(title) || id;
  const now = new Date();
  const post = {
    id,
    slug,
    title,
    excerpt,
    content,
    author: author || 'Rebel Hounds MC',
    pinned: !!pinned,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    dateDisplay: now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  };
  posts.unshift(post);
  saveAllPosts(posts);
  return post;
}

function updatePost(id, updates) {
  const posts = getAllPosts();
  const idx = posts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  if (updates.title) posts[idx].slug = slugify(updates.title);
  Object.assign(posts[idx], updates, { updatedAt: new Date().toISOString() });
  saveAllPosts(posts);
  return posts[idx];
}

function deletePost(id) {
  const posts = getAllPosts().filter(p => p.id !== id);
  saveAllPosts(posts);
}

function getPost(idOrSlug) {
  const posts = getAllPosts();
  return posts.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
}

function getSortedPosts() {
  const posts = getAllPosts();
  return posts.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

/* ===== Seed data (first load only) ===== */
function seedBlogData() {
  if (getAllPosts().length > 0) return;

  const seeds = [
    {
      title: 'Club Established — October 2021',
      excerpt: 'The Rebel Hounds Motorcycle Club was born from the Perished Ones MC, transitioning from GTA Online into FiveM.',
      content: '<p>Established on 3 October 2021, the Rebel Hounds Motorcycle Club is a 1%er Motorcycle Club as well as a gaming community built primarily around the FiveM platform.</p><p>While members play various games together, the club only asserts authority within FiveM to maintain cohesion, discipline, and a unified culture.</p><p>The club began as a splinter faction from the Perished Ones Motorcycle Club. After numerous trials and achievements during our time in GTA Online, we transitioned into FiveM. Whilst we have adapted to the FiveM/Roleplay environment, Online traditions persist as the club maintains a highly militant personality with the shades of a modern day motorcycle club.</p>',
      author: 'Rebel Hounds MC',
      pinned: true,
      date: '2021-10-03'
    },
    {
      title: 'Five Directives — The Foundation',
      excerpt: 'Every member lives by the Five Directives. Non-negotiable laws that keep the club strong, unified and disciplined.',
      content: '<p>The Five Directives are the backbone of the Rebel Hounds MC. Every member, from Prospect to President, lives by these non-negotiable laws.</p><p>They exist to keep the club strong, unified and disciplined. When times get tough, the Directives keep us grounded. When we ride, they remind us why we wear this patch.</p><ul><li><strong>Brotherhood Above All</strong> — Club comes first. Always.</li><li><strong>Respect the Hierarchy</strong> — The chain of command exists for a reason.</li><li><strong>Protect the Name</strong> — What you do reflects on every brother.</li><li><strong>Handle It In-House</strong> — Never air club business publicly.</li><li><strong>Earn Your Colors</strong> — Every day you prove you belong.</li></ul>',
      author: 'Rebel Hounds MC',
      pinned: true,
      date: '2021-10-15'
    },
    {
      title: 'Growing the Chapter',
      excerpt: 'With 28 members and 5 chapters, the Rebel Hounds continue to expand across Los Santos.',
      content: '<p>Since our founding, we have grown to 28 members spread across 5 chapters. Each chapter operates with its own hierarchy while answering to the main charter.</p><p>Expansion has been deliberate — we don\'t rush patches. Every member earns their place through loyalty, dedication and respect for the club\'s values.</p><p>New prospects are always welcome. If you think you have what it takes, submit your application through the <a href="recruitment.html">recruitment page</a>.</p>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2022-03-20'
    },
    {
      title: 'Poker Run Recap',
      excerpt: 'Last weekend\'s Poker Run was a success! Full patch attendance, great company, and an epic showdown.',
      content: '<p>Last weekend we held one of our signature events — the Poker Run. Full patch attendance, great company, and an epic showdown at the end of the night.</p><p>The route took us through Paleto Bay, up to Mount Chiliad, and back down through Blaine County. The roads were open, the weather was perfect, and the brotherhood was on full display.</p><p>Special shoutout to the road captain for planning the route and to everyone who made it out. These are the moments that define us as a club.</p><blockquote>"A club that rides together, stays together."</blockquote>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2023-06-10'
    },
    {
      title: 'Cruising Through The Wilds',
      excerpt: 'Last weekend we took the whole club on a cruise through the wilds. Sunset runs, open roads, and brotherhood.',
      content: '<p>Sometimes you just need to ride. No agenda, no business, no drama — just the open road and your brothers beside you.</p><p>Last weekend we took the whole club on a cruise through the wilderness surrounding Los Santos. We rolled out at golden hour, engines rumbling as the sun dipped behind the mountains.</p><p>Stops included a lakeside break near Paleto Bay and a final run through the coastal highway. Moments like these remind you why you wear the patch.</p><blockquote>"Four wheels move the body. Two wheels move the soul."</blockquote>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2023-09-15'
    },
    {
      title: 'Friendly Skirmish: North vs South',
      excerpt: 'The chapter split in half for a friendly but intense skirmish. North Side won the battle.',
      content: '<p>Last Friday evening, the chapter split in half for a friendly but intense skirmish. North Side won the battle, but all brothers learned valuable lessons.</p><p>The exercise was designed to test communication, tactical awareness and unit cohesion. Both sides performed admirably, and the competitive spirit was exactly what we needed.</p><p>After the dust settled, we all gathered for drinks and debrief. Friendly competition makes us stronger — it sharpens the blade without cutting the bond.</p>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2024-01-20'
    },
    {
      title: 'Five Directives Memorial Service',
      excerpt: 'We held a memorial service for our fallen brothers. A moment to honor their legacy.',
      content: '<p>Last Monday we held a memorial service for our fallen brothers. A moment to honor their legacy and continue the fight together.</p><p>The service was held at the club's original meeting spot — the place where it all began. Brothers from every chapter attended, standing side by side in a show of unity and remembrance.</p><p>We read the names, shared the memories, and reaffirmed our commitment to the Five Directives. The club endures because they laid the foundation. We carry their torch forward.</p><blockquote>"Fallen but never forgotten. Ride on, brothers."</blockquote>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2024-05-06'
    },
    {
      title: 'Summer Run — Paleto Bay to Blaine County',
      excerpt: 'Our annual summer run took us from the city limits to the northern coast. 28 bikes, zero complaints.',
      content: '<p>The annual summer run is one of our biggest traditions, and this year\'s edition did not disappoint.</p><p>We rolled out of Los Santos at dawn, 28 bikes strong. The route hugged the western coastline, cutting through Mount Chiliad State Park before reaching Paleto Bay for a fuel stop and group photo.</p><p>From there, we pushed north into Blaine County, riding through the quiet back roads before looping back south. The weather held, the roads were clear, and every brother made it home safe.</p><p>These runs are what the club is all about — the freedom of the road and the bond of the brotherhood.</p>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2024-07-20'
    },
    {
      title: 'New Chapter: South LS',
      excerpt: 'The Rebel Hounds MC officially opens its fifth chapter in South Los Santos.',
      content: '<p>We are proud to announce the opening of our fifth chapter — South Los Santos. This expansion has been in the works for months, and the patch holders in the south have earned their place.</p><p>The new chapter brings our total membership to 30 and covers the southern districts of Los Santos, from Strawberry to Davis. The chapter president has been a prospect since early 2023 and has shown nothing but dedication to the club.</p><p>With five chapters now operational, the Rebel Hounds MC has one of the strongest presences on the server. The brand is growing, and so is our reputation.</p>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2025-02-14'
    },
    {
      title: 'Winter Celebration 2025',
      excerpt: 'The club gathered for our annual winter celebration. Food, drinks, and brotherhood.',
      content: '<p>Our annual winter celebration brought the whole club together for an evening of food, drinks and brotherhood.</p><p>The event was held at the clubhouse, decorated in full holiday style. Brothers brought their families, and the atmosphere was warm despite the cold outside.</p><p>Highlights included the annual club awards, a gift exchange between chapters, and the President\'s traditional end-of-year speech. As always, it was a reminder that the Rebel Hounds are more than a club — we are a family.</p><blockquote>"Another year, another chapter. The road ahead is long, but we ride it together."</blockquote>',
      author: 'Rebel Hounds MC',
      pinned: false,
      date: '2025-12-22'
    }
  ];

  const posts = seeds.map(s => {
    const id = generateId();
    const d = new Date(s.date);
    return {
      id,
      slug: slugify(s.title),
      title: s.title,
      excerpt: s.excerpt,
      content: s.content,
      author: s.author,
      pinned: s.pinned,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
      dateDisplay: d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };
  });

  saveAllPosts(posts);
}

/* ===== Rendering helpers ===== */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
