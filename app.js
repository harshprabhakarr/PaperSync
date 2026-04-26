/**
 * ScholarMark - Academic Annotation Platform JS
 * Refactored to use Node.js backend API
 */

const API_BASE = 'http://localhost:3000/api';

// --- DATA STATE ---
let papers = [];
let annotations = [];
let collections = [];
let team = [
  { id: 'u1', name: 'Sarah Jenkins', role: 'Editor', avatar: 'S', color: '#6C63FF', online: true },
  { id: 'u2', name: 'Michael Chen', role: 'Annotator', avatar: 'M', color: '#FF6584', online: true },
  { id: 'u3', name: 'David Miller', role: 'Viewer', avatar: 'D', color: '#4FC3F7', online: false }
];

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  initNavigation();
  initModals();
  initUpload();
  initViewer();
  initCollections();
  renderAll();
  
  // Active users in sidebar
  renderActiveUsers();
});

async function loadData() {
  try {
    const [papersRes, annotationsRes, collectionsRes] = await Promise.all([
      fetch(`${API_BASE}/papers`),
      fetch(`${API_BASE}/annotations`),
      fetch(`${API_BASE}/collections`)
    ]);

    papers = await papersRes.json();
    annotations = await annotationsRes.json();
    collections = await collectionsRes.json();
  } catch (err) {
    console.error('Failed to load data from server:', err);
    showToast('Failed to connect to server', 'error');
  }
}

function renderAll() {
  renderDashboard();
  renderLibrary();
  renderCollections();
  renderAnnotations();
  renderCollaborate();
  updateStats();
}

// --- HELPER FUNCTIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> ${message}`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// --- NAVIGATION ---
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const views = document.querySelectorAll('.view');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewId = item.getAttribute('data-view');
      
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      
      views.forEach(v => v.classList.remove('active'));
      document.getElementById(`view-${viewId}`).classList.add('active');
      
      if (window.innerWidth <= 900) {
        sidebar.classList.remove('open');
      }
    });
  });

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  const globalSearch = document.getElementById('globalSearch');
  globalSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length > 2) {
      const searchNav = document.getElementById('nav-search');
      if (!searchNav.classList.contains('active')) {
        searchNav.click();
      }
      performSearch(query);
    }
  });
}

// --- MODALS ---
function initModals() {
  const setupModal = (btnId, modalId, closeId, cancelId) => {
    const btn = document.getElementById(btnId);
    const modal = document.getElementById(modalId);
    const close = document.getElementById(closeId);
    const cancel = document.getElementById(cancelId);

    if (btn) btn.onclick = () => modal.classList.add('open');
    if (close) close.onclick = () => modal.classList.remove('open');
    if (cancel) cancel.onclick = () => modal.classList.remove('open');
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  };

  setupModal('uploadBtn', 'uploadModal', 'closeUpload', 'cancelUpload');
  setupModal('newCollectionBtn', 'collectionModal', 'closeCollection', 'cancelCollection');
  setupModal('inviteBtn', 'inviteModal', 'closeInvite', 'cancelInvite');
  
  document.getElementById('closeViewer').onclick = () => {
    document.getElementById('viewerModal').classList.remove('open');
  };
}

// --- UPLOAD ---
let selectedFile = null;

function initUpload() {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const uploadMeta = document.getElementById('uploadMeta');
  const confirmBtn = document.getElementById('confirmUpload');
  const collectionSelect = document.getElementById('collectionSelect');

  const updateCollectionSelect = () => {
    collectionSelect.innerHTML = '<option value="">None</option>' + 
      collections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  };
  updateCollectionSelect();

  dropZone.onclick = () => fileInput.click();
  
  dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('over'); };
  dropZone.ondragleave = () => dropZone.classList.remove('over');
  dropZone.ondrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove('over');
    if (e.dataTransfer.files.length) handleFileSelection(e.dataTransfer.files[0]);
  };

  fileInput.onchange = (e) => {
    if (e.target.files.length) handleFileSelection(e.target.files[0]);
  };

  function handleFileSelection(file) {
    selectedFile = file;
    dropZone.innerHTML = `<div class="drop-icon">📄</div><p>${file.name}</p><span>File ready</span>`;
    uploadMeta.style.display = 'block';
    document.getElementById('paperTitle').value = file.name.replace(/\.[^/.]+$/, "");
  }

  confirmBtn.onclick = async () => {
    const title = document.getElementById('paperTitle').value;
    if (!title) { showToast('Please enter a title', 'error'); return; }

    const paperData = {
      title: title,
      authors: document.getElementById('paperAuthors').value || 'Unknown Author',
      year: document.getElementById('paperYear').value || new Date().getFullYear().toString(),
      abstract: document.getElementById('paperAbstract').value,
      tags: document.getElementById('paperTags').value.split(',').map(t => t.trim()).filter(t => t),
      ext: 'PDF',
      collectionId: collectionSelect.value,
      content: `
        <div class="paper-section">
          <h2>Abstract</h2>
          <p>${document.getElementById('paperAbstract').value || 'No abstract provided.'}</p>
        </div>
        <div class="paper-section">
          <h2>Content</h2>
          <p>This is a simulated paper content for demonstration. In a real application, the backend would parse the uploaded PDF.</p>
        </div>
      `
    };

    const formData = new FormData();
    if (selectedFile) formData.append('file', selectedFile);
    formData.append('paperData', JSON.stringify(paperData));

    try {
      const res = await fetch(`${API_BASE}/papers`, {
        method: 'POST',
        body: formData
      });
      const newPaper = await res.json();
      papers.unshift(newPaper);
      
      renderAll();
      document.getElementById('uploadModal').classList.remove('open');
      showToast('Paper uploaded successfully', 'success');
      
      // Reset
      uploadMeta.style.display = 'none';
      dropZone.innerHTML = `<div class="drop-icon">📄</div><p>Drag & drop your PDF here</p><span>or</span><label class="btn-outline">Browse Files</label>`;
      selectedFile = null;
    } catch (err) {
      showToast('Upload failed', 'error');
    }
  };
}

// --- VIEWER & ANNOTATIONS ---
let currentPaperId = null;
let currentTool = 'highlight'; 
let selectedText = '';
let currentHighlightColor = '#FFD600';

function initViewer() {
  const paperContent = document.getElementById('paperContent');
  const toolBtns = document.querySelectorAll('.btn-tool');
  const addNoteBox = document.getElementById('addNoteBox');
  const colorDots = document.querySelectorAll('.color-dot');
  
  toolBtns.forEach(btn => {
    btn.onclick = () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.id === 'toolHighlight' ? 'highlight' : 'comment';
    };
  });

  colorDots.forEach(dot => {
    dot.onclick = () => {
      colorDots.forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      currentHighlightColor = dot.getAttribute('data-color');
    };
  });

  paperContent.onmouseup = () => {
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    if (selectedText) {
      if (currentTool === 'highlight') {
        saveAnnotation({ type: 'highlight', text: selectedText, color: currentHighlightColor });
        selection.removeAllRanges();
      } else {
        addNoteBox.style.display = 'block';
        document.getElementById('noteText').focus();
      }
    }
  };

  document.getElementById('saveNote').onclick = () => {
    const commentText = document.getElementById('noteText').value.trim();
    if (commentText) {
      saveAnnotation({ type: 'comment', text: selectedText, comment: commentText, color: currentHighlightColor });
      document.getElementById('noteText').value = '';
      addNoteBox.style.display = 'none';
      selectedText = '';
    }
  };

  document.getElementById('cancelNote').onclick = () => {
    addNoteBox.style.display = 'none';
    selectedText = '';
  };
}

async function saveAnnotation(annData) {
  const ann = {
    ...annData,
    paperId: currentPaperId,
    author: 'Rajesh R.'
  };

  try {
    const res = await fetch(`${API_BASE}/annotations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ann)
    });
    const newAnn = await res.json();
    annotations.push(newAnn);
    renderPaperAnnotations();
    renderAnnotations();
    updateStats();
    showToast(`${ann.type.charAt(0).toUpperCase() + ann.type.slice(1)} added`);
  } catch (err) {
    showToast('Failed to save annotation', 'error');
  }
}

async function deleteAnnotation(id) {
  try {
    await fetch(`${API_BASE}/annotations/${id}`, { method: 'DELETE' });
    annotations = annotations.filter(a => a.id !== id);
    renderPaperAnnotations();
    renderAnnotations();
    updateStats();
    showToast('Annotation removed');
  } catch (err) {
    showToast('Delete failed', 'error');
  }
}

function openPaper(paperId) {
  currentPaperId = paperId;
  const paper = papers.find(p => p.id === paperId);
  if (!paper) return;

  document.getElementById('viewerTitle').textContent = paper.title;
  document.getElementById('paperContent').innerHTML = paper.content;
  document.getElementById('viewerModal').classList.add('open');
  renderPaperAnnotations();
}

function renderPaperAnnotations() {
  const container = document.getElementById('paperAnnotations');
  const filtered = annotations.filter(a => a.paperId === currentPaperId);
  
  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state sm"><p>No annotations yet.</p></div>';
    return;
  }

  container.innerHTML = [...filtered].reverse().map(a => `
    <div class="ann-item ${a.type}" style="border-left-color: ${a.color}">
      <div class="ann-item-text">"${a.text}"</div>
      ${a.comment ? `<div class="ann-item-comment" style="color:var(--text2); font-style:italic; margin:4px 0;">${a.comment}</div>` : ''}
      <div class="ann-item-meta">
        <span class="ann-author">${a.author}</span>
        <span>•</span>
        <span class="ann-date">${new Date(a.date).toLocaleDateString()}</span>
        <span class="ann-delete" onclick="deleteAnnotation('${a.id}')">🗑️</span>
      </div>
    </div>
  `).join('');
}

// --- COLLECTIONS ---
function initCollections() {
  const saveBtn = document.getElementById('saveCollection');
  const colorDots = document.querySelectorAll('[data-coll-color]');
  let selectedCollColor = '#6C63FF';

  colorDots.forEach(dot => {
    dot.onclick = () => {
      colorDots.forEach(d => d.classList.remove('selected'));
      dot.classList.add('selected');
      selectedCollColor = dot.getAttribute('data-coll-color');
    };
  });

  saveBtn.onclick = async () => {
    const name = document.getElementById('collName').value;
    if (!name) return;

    const collData = {
      name: name,
      desc: document.getElementById('collDesc').value,
      color: selectedCollColor
    };

    try {
      const res = await fetch(`${API_BASE}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collData)
      });
      const newColl = await res.json();
      collections.push(newColl);
      renderCollections();
      initUpload(); 
      document.getElementById('collectionModal').classList.remove('open');
      showToast('Collection created', 'success');
    } catch (err) {
      showToast('Failed to create collection', 'error');
    }
  };
}

// --- RENDERING ---
function renderDashboard() {
  const recentPapers = document.getElementById('recentPapers');
  const recentAnns = document.getElementById('recentAnnotations');

  if (papers.length === 0) {
    recentPapers.innerHTML = '<div class="empty-state"><p>No papers yet.</p></div>';
  } else {
    recentPapers.innerHTML = papers.slice(0, 4).map(p => `
      <div class="paper-list-item" onclick="openPaper('${p.id}')">
        <div class="paper-list-icon">📄</div>
        <div class="paper-list-info">
          <div class="title">${p.title}</div>
          <div class="meta">${p.authors} • ${p.year}</div>
        </div>
      </div>
    `).join('');
  }

  if (annotations.length === 0) {
    recentAnns.innerHTML = '<div class="empty-state sm"><p>No annotations yet.</p></div>';
  } else {
    recentAnns.innerHTML = [...annotations].slice(-4).reverse().map(a => `
      <div class="ann-feed-item">
        <div class="ann-feed-text">"${a.text}"</div>
        <div class="ann-feed-meta">${a.author} • ${papers.find(p => p.id === a.paperId)?.title || 'Paper'}</div>
      </div>
    `).join('');
  }
}

function updateStats() {
  const statsGrid = document.getElementById('statsGrid');
  const data = [
    { label: 'Total Papers', value: papers.length, icon: '📚', class: 'accent' },
    { label: 'Annotations', value: annotations.length, icon: '✏️', class: 'green' },
    { label: 'Collections', value: collections.length, icon: '🗂️', class: '' },
    { label: 'Team Members', value: team.length, icon: '👥', class: '' }
  ];

  statsGrid.innerHTML = data.map(s => `
    <div class="stat-card ${s.class}">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');
}

function renderLibrary(filter = 'all') {
  const container = document.getElementById('papersGrid');
  let filtered = papers;
  
  if (filter === 'annotated') {
    filtered = papers.filter(p => annotations.some(a => a.paperId === p.id));
  } else if (filter === 'pdf') {
    filtered = papers.filter(p => p.ext === 'PDF');
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><p>No papers found.</p></div>';
    return;
  }

  container.innerHTML = filtered.map(p => {
    const pAnns = annotations.filter(a => a.paperId === p.id).length;
    return `
      <div class="paper-card" onclick="openPaper('${p.id}')">
        <div class="paper-thumb">
          📄 <span class="paper-ext">${p.ext}</span>
        </div>
        <div class="paper-title">${p.title}</div>
        <div class="paper-authors">${p.authors}</div>
        <div class="paper-meta">
          <span class="paper-year">${p.year}</span>
          ${pAnns > 0 ? `<span class="paper-ann-count">${pAnns} annotations</span>` : ''}
        </div>
        <div class="paper-tags">
          ${p.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLibrary(btn.getAttribute('data-filter'));
    };
  });
}

function renderCollections() {
  const container = document.getElementById('collectionsGrid');
  if (collections.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🗂️</div><p>Create your first collection.</p></div>';
    return;
  }

  container.innerHTML = collections.map(c => {
    const count = papers.filter(p => p.collectionId === c.id).length;
    return `
      <div class="coll-card">
        <div class="coll-stripe" style="background:${c.color}"></div>
        <div class="coll-icon" style="color:${c.color}">📁</div>
        <div class="coll-name">${c.name}</div>
        <div class="coll-desc">${c.desc || 'No description'}</div>
        <div class="coll-stat">${count} Papers</div>
      </div>
    `;
  }).join('');
}

function renderAnnotations() {
  const container = document.getElementById('allAnnotations');
  if (annotations.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">✏️</div><p>No annotations yet.</p></div>';
    return;
  }

  container.innerHTML = [...annotations].reverse().map(a => {
    const paper = papers.find(p => p.id === a.paperId);
    return `
      <div class="ann-card ${a.type}" style="border-left-color:${a.color}">
        <div class="ann-header">
          <span class="ann-type-badge ${a.type}">${a.type.toUpperCase()}</span>
          <span class="ann-paper">on ${paper ? paper.title : 'Deleted Paper'}</span>
        </div>
        <div class="ann-text">"${a.text}"</div>
        ${a.comment ? `<div class="ann-comment" style="margin-top:8px; color:var(--text2); background:var(--bg3); padding:8px; border-radius:4px;">${a.comment}</div>` : ''}
        <div class="ann-meta">
          <div class="ann-author-avatar" style="background:${a.author === 'Rajesh R.' ? 'var(--accent)' : 'var(--accent2)'}">${a.author[0]}</div>
          <span>${a.author}</span>
          <span>•</span>
          <span>${new Date(a.date).toLocaleDateString()}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderCollaborate() {
  const teamList = document.getElementById('teamList');
  const sharedPapers = document.getElementById('sharedPapers');
  const activityFeed = document.getElementById('activityFeed');

  teamList.innerHTML = team.map(m => `
    <div class="team-member">
      <div class="avatar" style="background:${m.color}">${m.avatar}</div>
      <div class="member-info">
        <div class="name">${m.name} ${m.online ? '<span class="online-dot"></span>' : ''}</div>
        <div class="role">${m.role}</div>
      </div>
      <span class="member-badge ${m.role.toLowerCase()}">${m.role}</span>
    </div>
  `).join('');

  sharedPapers.innerHTML = papers.slice(0, 3).map(p => `
    <div class="shared-paper-item" onclick="openPaper('${p.id}')">
      <div class="paper-list-icon">📄</div>
      <div class="paper-list-info">
        <div class="title">${p.title}</div>
        <div class="meta">Shared with team</div>
      </div>
    </div>
  `).join('');

  const activities = [
    { user: 'Sarah Jenkins', action: 'highlighted a section in', target: 'Attention Is All You Need', time: '10m ago' },
    { user: 'Michael Chen', action: 'added a comment to', target: 'Deep Residual Learning...', time: '45m ago' }
  ];

  activityFeed.innerHTML = activities.map(act => `
    <div class="activity-item">
      <div class="activity-text"><strong>${act.user}</strong> ${act.action} <em>${act.target}</em></div>
      <div class="activity-time">${act.time}</div>
    </div>
  `).join('');
}

function renderActiveUsers() {
  const container = document.getElementById('activeUsers');
  container.innerHTML = team.filter(m => m.online).map(m => `
    <div class="avatar" style="background:${m.color}; margin-right:-8px; border:2px solid var(--bg2); cursor:help;" title="${m.name}">${m.avatar}</div>
  `).join('') + `<div class="avatar" style="background:var(--accent); border:2px solid var(--bg2); z-index:10;">R</div>`;
}

// --- SEARCH ---
function performSearch(query) {
  const resultsContainer = document.getElementById('searchResults');
  const paperResults = papers.filter(p => p.title.toLowerCase().includes(query) || p.authors.toLowerCase().includes(query) || p.tags.some(t => t.toLowerCase().includes(query)));
  const annResults = annotations.filter(a => a.text.toLowerCase().includes(query) || (a.comment && a.comment.toLowerCase().includes(query)));

  if (paperResults.length === 0 && annResults.length === 0) {
    resultsContainer.innerHTML = '<div class="empty-state"><p>No results found.</p></div>';
    return;
  }

  let html = '';
  paperResults.forEach(p => {
    html += `<div class="search-result-card" onclick="openPaper('${p.id}')"><div class="result-type">PAPER</div><div class="result-title">${highlightMatch(p.title, query)}</div><div class="result-snippet">${highlightMatch(p.authors, query)}</div></div>`;
  });
  annResults.forEach(a => {
    const paper = papers.find(p => p.id === a.paperId);
    html += `<div class="search-result-card" onclick="openPaper('${a.paperId}')"><div class="result-type">ANNOTATION</div><div class="result-title">In: ${paper ? paper.title : 'Paper'}</div><div class="result-snippet">"${highlightMatch(a.text, query)}"</div></div>`;
  });
  resultsContainer.innerHTML = html;
}

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

document.getElementById('searchGo').onclick = () => performSearch(document.getElementById('searchInput').value.toLowerCase());

document.getElementById('confirmInvite').onclick = () => {
  const name = document.getElementById('inviteName').value;
  if (name) { showToast(`Invite sent to ${name}`, 'success'); document.getElementById('inviteModal').classList.remove('open'); }
};
