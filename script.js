// ============ DATA ============
// campaign: {id, name, channel, spend, revenue, impressions, clicks, conversions}
// content:  {id, title, channel, date: 'YYYY-MM-DD', campaignId}
// keyword:  {id, term, history: [{date, rank, traffic}]}

let campaigns = [];
let content = [];
let keywords = [];
let editingCampaignId = null;
let activeKeywordId = null;
let calendarViewDate = new Date();

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

campaigns = load('mh-campaigns', []);
content = load('mh-content', []);
keywords = load('mh-keywords', []);

// Seed example data on first run
if (campaigns.length === 0 && content.length === 0 && keywords.length === 0) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const inDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };

  campaigns = [
    { id: crypto.randomUUID(), name: 'Summer Sale Push', channel: 'Instagram', spend: 1200, revenue: 4800, impressions: 85000, clicks: 2100, conversions: 96 },
    { id: crypto.randomUUID(), name: 'Search Brand Terms', channel: 'Google Ads', spend: 900, revenue: 5400, impressions: 34000, clicks: 1450, conversions: 120 },
    { id: crypto.randomUUID(), name: 'Newsletter Relaunch', channel: 'Email', spend: 150, revenue: 2100, impressions: 12000, clicks: 980, conversions: 65 },
    { id: crypto.randomUUID(), name: 'B2B Lead Gen', channel: 'LinkedIn', spend: 2000, revenue: 3200, impressions: 22000, clicks: 610, conversions: 22 },
  ];

  content = [
    { id: crypto.randomUUID(), title: 'Summer teaser reel', channel: 'Instagram', date: inDays(1), campaignId: campaigns[0].id },
    { id: crypto.randomUUID(), title: 'Weekly newsletter', channel: 'Email', date: inDays(2), campaignId: campaigns[2].id },
    { id: crypto.randomUUID(), title: 'Case study post', channel: 'LinkedIn', date: inDays(4), campaignId: campaigns[3].id },
    { id: crypto.randomUUID(), title: 'Search ad copy refresh', channel: 'Google Ads', date: inDays(6), campaignId: campaigns[1].id },
  ];

  keywords = [
    { id: crypto.randomUUID(), term: 'best running shoes 2026', history: [
      { date: fmt(new Date(today.getTime() - 14*864e5)), rank: 18, traffic: 320 },
      { date: fmt(new Date(today.getTime() - 7*864e5)), rank: 12, traffic: 540 },
      { date: fmt(today), rank: 8, traffic: 890 }
    ]},
    { id: crypto.randomUUID(), term: 'affordable home decor ideas', history: [
      { date: fmt(new Date(today.getTime() - 14*864e5)), rank: 6, traffic: 1100 },
      { date: fmt(new Date(today.getTime() - 7*864e5)), rank: 9, traffic: 820 },
      { date: fmt(today), rank: 14, traffic: 560 }
    ]},
  ];
}

function saveAll() {
  persist('mh-campaigns', campaigns);
  persist('mh-content', content);
  persist('mh-keywords', keywords);
}

// ============ HELPERS ============
function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function money(n) { return '$' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }); }
function safeDiv(a, b) { return b > 0 ? a / b : 0; }

function campaignMetrics(c) {
  return {
    ctr: safeDiv(c.clicks, c.impressions) * 100,
    cpc: safeDiv(c.spend, c.clicks),
    cpa: safeDiv(c.spend, c.conversions),
    roas: safeDiv(c.revenue, c.spend),
  };
}

// ============ TABS ============
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'overview') renderOverview();
    if (btn.dataset.tab === 'campaigns') renderCampaigns();
    if (btn.dataset.tab === 'calendar') renderCalendar();
    if (btn.dataset.tab === 'seo') renderSeo();
  });
});

// ============ THEME ============
const themeToggle = document.getElementById('themeToggle');
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  themeToggle.textContent = t === 'light' ? '☀️' : '🌙';
}
applyTheme(load('mh-theme', 'dark'));
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  persist('mh-theme', next);
});

// ============ CHART INSTANCES ============
let chartSpendByChannel, chartChannelComparison, chartKeywordTrend;

// ============ OVERVIEW ============
function renderOverview() {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenue, 0);
  const blendedRoas = safeDiv(totalRevenue, totalSpend);

  document.getElementById('stat-spend').textContent = money(totalSpend);
  document.getElementById('stat-revenue').textContent = money(totalRevenue);
  document.getElementById('stat-roas').textContent = blendedRoas.toFixed(1) + 'x';
  document.getElementById('stat-keywords').textContent = keywords.length;

  const today = new Date(); today.setHours(0,0,0,0);
  const weekAhead = new Date(today); weekAhead.setDate(weekAhead.getDate() + 7);
  const upcoming = content.filter(p => {
    const d = new Date(p.date);
    return d >= today && d <= weekAhead;
  }).sort((a,b) => new Date(a.date) - new Date(b.date));

  document.getElementById('stat-content').textContent = upcoming.length;

  const listEl = document.getElementById('upcomingContentList');
  listEl.innerHTML = upcoming.length ? upcoming.map(p => `
    <div class="upcoming-item">
      <span>${esc(p.title)}</span>
      <span style="display:flex; gap:8px; align-items:center;">
        <span class="channel-tag">${esc(p.channel)}</span>
        <span style="color:var(--text-muted); font-family:var(--font-mono); font-size:0.75rem;">${p.date}</span>
      </span>
    </div>
  `).join('') : '<p class="empty-state">Nothing scheduled this week.</p>';

  // Spend by channel doughnut
  const byChannel = {};
  campaigns.forEach(c => { byChannel[c.channel] = (byChannel[c.channel] || 0) + c.spend; });
  const ctx1 = document.getElementById('chartSpendByChannel');
  if (chartSpendByChannel) chartSpendByChannel.destroy();
  if (Object.keys(byChannel).length) {
    chartSpendByChannel = new Chart(ctx1, {
      type: 'doughnut',
      data: {
        labels: Object.keys(byChannel),
        datasets: [{ data: Object.values(byChannel), backgroundColor: ['#5ec9b8','#f2a65a','#6ea8fe','#e8636b','#c792ea','#82c91e'] }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') } } } }
    });
  }

  // Keyword movers (compare last two history points)
  const moversEl = document.getElementById('keywordMovers');
  const movers = keywords
    .filter(k => k.history.length >= 2)
    .map(k => {
      const last = k.history[k.history.length - 1];
      const prev = k.history[k.history.length - 2];
      return { term: k.term, change: prev.rank - last.rank }; // positive = improved (rank number went down)
    })
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 5);

  moversEl.innerHTML = movers.length ? movers.map(m => `
    <div class="mover-row">
      <span>${esc(m.term)}</span>
      <span class="${m.change >= 0 ? 'mover-up' : 'mover-down'}">${m.change >= 0 ? '▲' : '▼'} ${Math.abs(m.change)}</span>
    </div>
  `).join('') : '<p class="empty-state">Track keywords over time to see movers.</p>';
}

// ============ CAMPAIGNS ============
function renderCampaigns() {
  const tbody = document.getElementById('campaignTableBody');
  tbody.innerHTML = campaigns.length ? campaigns.map(c => {
    const m = campaignMetrics(c);
    return `
      <tr>
        <td>${esc(c.name)}</td>
        <td><span class="channel-pill">${esc(c.channel)}</span></td>
        <td>${money(c.spend)}</td>
        <td>${c.impressions.toLocaleString()}</td>
        <td>${c.clicks.toLocaleString()}</td>
        <td>${m.ctr.toFixed(2)}%</td>
        <td>$${m.cpc.toFixed(2)}</td>
        <td>${c.conversions}</td>
        <td>$${m.cpa.toFixed(2)}</td>
        <td>${money(c.revenue)}</td>
        <td class="${m.roas >= 2 ? 'roas-good' : 'roas-bad'}">${m.roas.toFixed(1)}x</td>
        <td><button class="delete-row-btn" data-id="${c.id}" title="Delete">🗑</button></td>
      </tr>
    `;
  }).join('') : `<tr><td colspan="12" class="empty-state">No campaigns yet — add one to get started.</td></tr>`;

  // Channel comparison chart (ROAS per channel, averaged)
  const byChannel = {};
  campaigns.forEach(c => {
    if (!byChannel[c.channel]) byChannel[c.channel] = { spend: 0, revenue: 0 };
    byChannel[c.channel].spend += c.spend;
    byChannel[c.channel].revenue += c.revenue;
  });
  const labels = Object.keys(byChannel);
  const roasData = labels.map(ch => safeDiv(byChannel[ch].revenue, byChannel[ch].spend));

  const ctx = document.getElementById('chartChannelComparison');
  if (chartChannelComparison) chartChannelComparison.destroy();
  if (labels.length) {
    chartChannelComparison = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'ROAS by channel', data: roasData, backgroundColor: '#5ec9b8' }] },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') }, grid: { display: false } },
          y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') }, grid: { color: 'rgba(128,128,128,0.1)' } }
        }
      }
    });
  }
}

document.getElementById('campaignTableBody').addEventListener('click', (e) => {
  const btn = e.target.closest('.delete-row-btn');
  if (btn && confirm('Delete this campaign?')) {
    campaigns = campaigns.filter(c => c.id !== btn.dataset.id);
    saveAll();
    renderCampaigns();
  }
});

const campaignModal = document.getElementById('campaignModalOverlay');
document.getElementById('openCampaignModalBtn').addEventListener('click', () => {
  document.getElementById('campaignForm').reset();
  campaignModal.classList.add('open');
});
document.getElementById('campaignCancelBtn').addEventListener('click', () => campaignModal.classList.remove('open'));
campaignModal.addEventListener('click', (e) => { if (e.target === campaignModal) campaignModal.classList.remove('open'); });

document.getElementById('campaignForm').addEventListener('submit', (e) => {
  e.preventDefault();
  campaigns.push({
    id: crypto.randomUUID(),
    name: document.getElementById('cName').value.trim(),
    channel: document.getElementById('cChannel').value,
    spend: Number(document.getElementById('cSpend').value),
    revenue: Number(document.getElementById('cRevenue').value),
    impressions: Number(document.getElementById('cImpressions').value),
    clicks: Number(document.getElementById('cClicks').value),
    conversions: Number(document.getElementById('cConversions').value),
  });
  saveAll();
  renderCampaigns();
  campaignModal.classList.remove('open');
});

// ============ CONTENT CALENDAR ============
function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();

  document.getElementById('calendarMonthLabel').textContent =
    calendarViewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let html = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    .map(d => `<div class="calendar-day-label">${d}</div>`).join('');

  for (let i = 0; i < startOffset; i++) html += `<div class="calendar-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayPosts = content.filter(p => p.date === dateStr);
    html += `
      <div class="calendar-cell">
        <div class="calendar-date">${day}</div>
        ${dayPosts.map(p => `<div class="calendar-post" title="${esc(p.title)}">${esc(p.title)}</div>`).join('')}
      </div>
    `;
  }
  grid.innerHTML = html;

  // populate campaign dropdown in content modal
  const sel = document.getElementById('pCampaign');
  sel.innerHTML = '<option value="">None</option>' +
    campaigns.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}

document.getElementById('prevMonthBtn').addEventListener('click', () => {
  calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
  renderCalendar();
});
document.getElementById('nextMonthBtn').addEventListener('click', () => {
  calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
  renderCalendar();
});

const contentModal = document.getElementById('contentModalOverlay');
document.getElementById('openContentModalBtn').addEventListener('click', () => {
  document.getElementById('contentForm').reset();
  contentModal.classList.add('open');
});
document.getElementById('contentCancelBtn').addEventListener('click', () => contentModal.classList.remove('open'));
contentModal.addEventListener('click', (e) => { if (e.target === contentModal) contentModal.classList.remove('open'); });

document.getElementById('contentForm').addEventListener('submit', (e) => {
  e.preventDefault();
  content.push({
    id: crypto.randomUUID(),
    title: document.getElementById('pTitle').value.trim(),
    channel: document.getElementById('pChannel').value,
    date: document.getElementById('pDate').value,
    campaignId: document.getElementById('pCampaign').value || null,
  });
  saveAll();
  renderCalendar();
  contentModal.classList.remove('open');
});

// ============ SEO TRACKER ============
function renderSeo() {
  const wrap = document.getElementById('keywordCards');
  wrap.innerHTML = keywords.length ? keywords.map(k => {
    const last = k.history[k.history.length - 1];
    return `
      <div class="keyword-card">
        <p class="keyword-term">${esc(k.term)}</p>
        <div class="keyword-stats">
          <span>Rank <span class="keyword-rank">#${last.rank}</span></span>
          <span>~${last.traffic.toLocaleString()} visits/mo</span>
        </div>
        <div class="keyword-actions">
          <button class="btn-ghost update-rank-btn" data-id="${k.id}">Update</button>
          <button class="btn-ghost delete-keyword-btn" data-id="${k.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('') : '<p class="empty-state">No keywords tracked yet.</p>';

  // Rank trend line chart (lower rank = better, so invert y axis)
  const ctx = document.getElementById('chartKeywordTrend');
  if (chartKeywordTrend) chartKeywordTrend.destroy();
  if (keywords.length) {
    const allDates = [...new Set(keywords.flatMap(k => k.history.map(h => h.date)))].sort();
    const palette = ['#5ec9b8','#f2a65a','#6ea8fe','#e8636b','#c792ea','#82c91e'];
    const datasets = keywords.map((k, i) => ({
      label: k.term,
      data: allDates.map(d => {
        const point = k.history.find(h => h.date === d);
        return point ? point.rank : null;
      }),
      borderColor: palette[i % palette.length],
      backgroundColor: palette[i % palette.length],
      spanGaps: true,
      tension: 0.3,
    }));
    chartKeywordTrend = new Chart(ctx, {
      type: 'line',
      data: { labels: allDates, datasets },
      options: {
        scales: {
          y: { reverse: true, title: { display: true, text: 'Rank (lower is better)', color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') },
               ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') }, grid: { color: 'rgba(128,128,128,0.1)' } },
          x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted') }, grid: { display: false } }
        },
        plugins: { legend: { position: 'bottom', labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text') } } }
      }
    });
  }
}

document.getElementById('keywordCards').addEventListener('click', (e) => {
  const updateBtn = e.target.closest('.update-rank-btn');
  const deleteBtn = e.target.closest('.delete-keyword-btn');
  if (updateBtn) {
    activeKeywordId = updateBtn.dataset.id;
    document.getElementById('rankForm').reset();
    document.getElementById('rankModalOverlay').classList.add('open');
  }
  if (deleteBtn && confirm('Stop tracking this keyword?')) {
    keywords = keywords.filter(k => k.id !== deleteBtn.dataset.id);
    saveAll();
    renderSeo();
  }
});

const keywordModal = document.getElementById('keywordModalOverlay');
document.getElementById('openKeywordModalBtn').addEventListener('click', () => {
  document.getElementById('keywordForm').reset();
  keywordModal.classList.add('open');
});
document.getElementById('keywordCancelBtn').addEventListener('click', () => keywordModal.classList.remove('open'));
keywordModal.addEventListener('click', (e) => { if (e.target === keywordModal) keywordModal.classList.remove('open'); });

document.getElementById('keywordForm').addEventListener('submit', (e) => {
  e.preventDefault();
  keywords.push({
    id: crypto.randomUUID(),
    term: document.getElementById('kTerm').value.trim(),
    history: [{
      date: new Date().toISOString().split('T')[0],
      rank: Number(document.getElementById('kRank').value),
      traffic: Number(document.getElementById('kTraffic').value),
    }]
  });
  saveAll();
  renderSeo();
  keywordModal.classList.remove('open');
});

const rankModal = document.getElementById('rankModalOverlay');
document.getElementById('rankCancelBtn').addEventListener('click', () => rankModal.classList.remove('open'));
rankModal.addEventListener('click', (e) => { if (e.target === rankModal) rankModal.classList.remove('open'); });

document.getElementById('rankForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const k = keywords.find(kw => kw.id === activeKeywordId);
  if (k) {
    k.history.push({
      date: new Date().toISOString().split('T')[0],
      rank: Number(document.getElementById('newRank').value),
      traffic: Number(document.getElementById('newTraffic').value),
    });
    saveAll();
    renderSeo();
  }
  rankModal.classList.remove('open');
});

// ============ INIT ============
renderOverview();
renderCampaigns();
renderCalendar();
renderSeo();
