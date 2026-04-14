/**
 * MiniMax Studio — Dashboard Logic
 * Manages idea list, stats, polling, and new idea submission.
 */
(function() {
  'use strict';

  // ── Auth Guard ─────────────────────────────────────────────────────────────
  const token = localStorage.getItem('mock_auth_token');
  if (!token) {
    window.location.href = 'auth.html';
    return;
  }

  // ── Elements ──────────────────────────────────────────────────────────────
  const navUserEmail = document.getElementById('navUserEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const ideasLoading = document.getElementById('ideasLoading');
  const ideasGrid = document.getElementById('ideasGrid');
  const emptyState = document.getElementById('emptyState');
  const errorBanner = document.getElementById('errorBanner');
  const errorBannerMsg = document.getElementById('errorBannerMsg');
  const errorRetryBtn = document.getElementById('errorRetryBtn');
  const newIdeaBtn = document.getElementById('newIdeaBtn');
  const emptyNewIdeaBtn = document.getElementById('emptyNewIdeaBtn');
  const newIdeaModal = document.getElementById('newIdeaModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const newIdeaForm = document.getElementById('newIdeaForm');
  const newIdeaText = document.getElementById('newIdeaText');
  const newIdeaTextError = document.getElementById('newIdeaText-error');
  const newIdeaCharCount = document.getElementById('newIdeaCharCount');
  const modalSubmitBtn = document.getElementById('modalSubmitBtn');

  // Stats elements
  const statTotal = document.getElementById('statTotal');
  const statPending = document.getElementById('statPending');
  const statProcessing = document.getElementById('statProcessing');
  const statCompleted = document.getElementById('statCompleted');
  const statFailed = document.getElementById('statFailed');

  // ── State ─────────────────────────────────────────────────────────────────
  let ideas = [];
  let pollInterval = null;
  let gradientIndex = 0;
  const GRADIENTS = ['gradient-1', 'gradient-2', 'gradient-3', 'gradient-4', 'gradient-5'];

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatDate(isoString) {
    const d = new Date(isoString);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function getGradient(index) {
    return GRADIENTS[gradientIndex++ % GRADIENTS.length];
  }

  function statusLabel(status) {
    const labels = { pending: '等待 Pending', processing: '生成中 Processing', completed: '已完成 Done', failed: '失败 Failed' };
    return labels[status] || status;
  }

  function showLoading() {
    ideasLoading.hidden = false;
    ideasGrid.hidden = true;
    emptyState.hidden = true;
    errorBanner.hidden = true;
  }

  function showIdeas(list) {
    ideasLoading.hidden = true;
    errorBanner.hidden = true;
    if (list.length === 0) {
      ideasGrid.hidden = true;
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      ideasGrid.hidden = false;
      renderIdeas(list);
    }
  }

  function showError(msg) {
    ideasLoading.hidden = true;
    ideasGrid.hidden = true;
    emptyState.hidden = true;
    errorBanner.hidden = false;
    errorBannerMsg.textContent = msg;
  }

  // ── Render Ideas ───────────────────────────────────────────────────────────
  function renderIdeas(list) {
    ideasGrid.innerHTML = '';
    gradientIndex = 0;

    list.forEach(function(idea) {
      const card = document.createElement('article');
      card.className = 'idea-card';
      card.dataset.id = idea.id;

      const imgArea = idea.image_url
        ? `<img class="idea-card-img" src="${idea.image_url}" alt="${idea.idea_text}" loading="lazy">`
        : `<div class="idea-card-placeholder ${getGradient(gradientIndex)}" aria-hidden="true">
            <span class="sr-only">无预览图 No preview</span>
            <span style="font-size:1.5rem;opacity:0.6;">&#127912;</span>
           </div>`;

      card.innerHTML = `
        ${imgArea}
        <div class="idea-card-body">
          <div class="idea-card-meta">
            <span class="idea-card-status status-${idea.status}">${statusLabel(idea.status)}</span>
            <span class="idea-card-date">${formatDate(idea.created_at)}</span>
          </div>
          <p class="idea-card-text">${idea.idea_text}</p>
          <div class="idea-card-meta">
            <span class="idea-card-date">Ref: ${idea.reference_id}</span>
          </div>
          <div class="idea-card-actions">
            <button class="btn-delete" type="button" data-id="${idea.id}" aria-label="删除 Delete">删除 Delete</button>
          </div>
        </div>
      `;

      ideasGrid.appendChild(card);
    });

    // Attach delete handlers
    ideasGrid.querySelectorAll('.btn-delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = this.dataset.id;
        if (window.confirm('确定要删除这条创意吗？Are you sure you want to delete this idea?')) {
          deleteIdea(id);
        }
      });
    });
  }

  // ── Render Stats ───────────────────────────────────────────────────────────
  function renderStats(data) {
    statTotal.textContent = data.total_ideas;
    statPending.textContent = data.pending;
    statProcessing.textContent = data.processing;
    statCompleted.textContent = data.completed;
    statFailed.textContent = data.failed;
  }

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  async function fetchDashboard() {
    try {
      const [ideasData, statsData] = await Promise.all([
        window.API.ideas.list(),
        window.API.dashboard.getStats()
      ]);

      ideas = ideasData.ideas;
      renderStats(statsData.stats);
      showIdeas(ideas);

      // Manage polling
      const hasProcessing = ideas.some(function(i) { return i.status === 'processing'; });
      if (hasProcessing && !pollInterval) {
        startPolling();
      } else if (!hasProcessing && pollInterval) {
        stopPolling();
      }
    } catch (err) {
      console.error('[Dashboard] Fetch failed:', err);
      showError('加载失败，请重试 Loading failed. Please retry. ' + (err.message || ''));
    }
  }

  // ── Polling ────────────────────────────────────────────────────────────────
  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(fetchDashboard, 10000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // ── Delete Idea ────────────────────────────────────────────────────────────
  async function deleteIdea(id) {
    // Optimistic remove from DOM
    const card = ideasGrid.querySelector(`[data-id="${id}"]`);
    if (card) card.style.opacity = '0.5';
    try {
      // For mock, just remove from local array
      ideas = ideas.filter(function(i) { return i.id !== id; });
      renderIdeas(ideas);
      // Recalculate stats
      const stats = { total_ideas: ideas.length, pending: 0, processing: 0, completed: 0, failed: 0 };
      ideas.forEach(function(i) { stats[i.status]++; });
      renderStats(stats);
      if (ideas.length === 0) {
        emptyState.hidden = false;
        ideasGrid.hidden = true;
      }
    } catch (err) {
      console.error('[Dashboard] Delete failed:', err);
      if (card) card.style.opacity = '1';
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal() {
    newIdeaModal.hidden = false;
    newIdeaText.value = '';
    newIdeaTextError.hidden = true;
    newIdeaCharCount.textContent = '0 / 500';
    newIdeaText.focus();
  }

  function closeModal() {
    newIdeaModal.hidden = true;
  }

  if (newIdeaBtn) newIdeaBtn.addEventListener('click', openModal);
  if (emptyNewIdeaBtn) emptyNewIdeaBtn.addEventListener('click', openModal);
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
  if (newIdeaModal) {
    newIdeaModal.addEventListener('click', function(e) {
      if (e.target === newIdeaModal) closeModal();
    });
  }

  // Char count
  if (newIdeaText) {
    newIdeaText.addEventListener('input', function() {
      const len = this.value.length;
      newIdeaCharCount.textContent = len + ' / 500';
      if (len > 0) clearFieldError('newIdeaText');
    });
  }

  function clearFieldError(id) {
    const el = document.getElementById(id + '-error');
    if (el) { el.textContent = ''; el.hidden = true; }
  }

  // ── New Idea Submit ────────────────────────────────────────────────────────
  if (newIdeaForm) {
    newIdeaForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearFieldError('newIdeaText');

      const idea_text = newIdeaText.value.trim();
      if (!idea_text || idea_text.length < 5) {
        document.getElementById('newIdeaText-error').textContent = '创意描述至少需要 5 个字符';
        document.getElementById('newIdeaText-error').hidden = false;
        return;
      }

      modalSubmitBtn.disabled = true;
      modalSubmitBtn.classList.add('loading');
      modalSubmitBtn.textContent = '提交中...';

      try {
        const result = await window.API.ideas.create(idea_text);
        closeModal();
        // Refresh the list
        await fetchDashboard();
      } catch (err) {
        console.error('[Dashboard] Create failed:', err);
        document.getElementById('newIdeaText-error').textContent = '提交失败: ' + (err.message || '请重试');
        document.getElementById('newIdeaText-error').hidden = false;
      } finally {
        modalSubmitBtn.disabled = false;
        modalSubmitBtn.classList.remove('loading');
        modalSubmitBtn.textContent = '提交 Submit';
      }
    });
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      try {
        await window.API.auth.logout();
      } catch (err) {
        // Ignore logout errors
      }
      localStorage.removeItem('mock_auth_token');
      window.location.href = 'auth.html';
    });
  }

  // ── Retry ──────────────────────────────────────────────────────────────────
  if (errorRetryBtn) {
    errorRetryBtn.addEventListener('click', function() {
      showLoading();
      fetchDashboard();
    });
  }

  // ── Load User Info ─────────────────────────────────────────────────────────
  window.API.auth.me().then(function(data) {
    navUserEmail.textContent = data.user.email;
  }).catch(function() {
    navUserEmail.textContent = 'User';
  });

  // ── Initialize ─────────────────────────────────────────────────────────────
  showLoading();
  fetchDashboard();

  // Cleanup on page leave
  window.addEventListener('beforeunload', stopPolling);
})();
