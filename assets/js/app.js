const API_BASE = resolveApiBase();

const STORAGE_KEYS = {
  currentUserId: 'pc-current-user-id',
  workspace: 'pc-workspace-selection',
  chat: 'pc-workspace-chat',
  crawler: 'pc-crawler-config'
};

const MAX_CHAT_HISTORY = 200;

const state = {
  users: [],
  cpus: [],
  mainboards: [],
  rams: [],
  gpus: [],
  psus: [],
  baseComponents: [],
  prices: [],
  sourceNames: [],
  reviews: [],
  builds: [],
  currentUser: null,
  workspace: loadJSON(STORAGE_KEYS.workspace, {}),
  chat: loadJSON(STORAGE_KEYS.chat, []),
  crawler: loadJSON(STORAGE_KEYS.crawler, {
    interval: '15 phút',
    sources: 'GearVN, Phong Vũ, TNC, An Phát',
    status: 'Đang chạy ổn định'
  })
};

const componentMeta = {
  cpu: { label: 'CPU' },
  mainboard: { label: 'Mainboard' },
  ram: { label: 'RAM' },
  gpu: { label: 'GPU' },
  psu: { label: 'PSU' }
};

const componentEditSchema = {
  cpu: [
    { key: 'socketType', label: 'Socket', type: 'text', placeholder: 'AM5, LGA1700, ...' },
    { key: 'tdpWattage', label: 'TDP (W)', type: 'number', min: 1, placeholder: '120' }
  ],
  mainboard: [
    { key: 'socketType', label: 'Socket', type: 'text', placeholder: 'AM5, LGA1700, ...' },
    { key: 'ramGeneration', label: 'Chuẩn RAM', type: 'text', placeholder: 'DDR4, DDR5, ...' }
  ],
  ram: [
    { key: 'ramGeneration', label: 'Chuẩn RAM', type: 'text', placeholder: 'DDR4, DDR5, ...' },
    { key: 'capacityGb', label: 'Dung lượng (GB)', type: 'number', min: 1, placeholder: '16' }
  ],
  gpu: [
    { key: 'vramSizeGb', label: 'VRAM (GB)', type: 'number', min: 1, placeholder: '12' },
    { key: 'tdpWattage', label: 'TDP (W)', type: 'number', min: 1, placeholder: '220' }
  ],
  psu: [
    { key: 'powerOutputWatt', label: 'Công suất (W)', type: 'number', min: 1, placeholder: '750' }
  ]
};

const componentCreateSchema = componentEditSchema;

function componentCollection(type) {
  return {
    cpu: state.cpus,
    mainboard: state.mainboards,
    ram: state.rams,
    gpu: state.gpus,
    psu: state.psus
  }[type] || [];
}

function findComponentEntity(type, id) {
  return componentCollection(type).find((item) => Number(item.id) === Number(id)) || null;
}

function getComponentFormValue(key) {
  const field = byId(`adminEdit_${key}`);
  return field ? field.value.trim() : '';
}

function componentUpdatePayload(type) {
  const schema = componentEditSchema[type] || [];
  const payload = {
    baseComponentId: Number(byId('adminEditBaseComponentId')?.value || 0)
  };

  schema.forEach((field) => {
    const rawValue = getComponentFormValue(field.key);
    payload[field.key] = field.type === 'number' ? Number(rawValue || 0) : rawValue;
  });

  return payload;
}

function renderComponentEditFields(type, item) {
  const baseComponent = item?.baseComponent || {};
  const fields = [
    `<input id="adminEditBaseComponentId" type="hidden" value="${escapeHtml(baseComponent.id || '')}" />`,
    `<label>Tên <input id="adminEditBaseName" type="text" value="${escapeHtml(baseComponent.name || '')}" /></label>`,
    `<label>Brand <input id="adminEditBaseBrand" type="text" value="${escapeHtml(baseComponent.brand || '')}" /></label>`
  ];

  (componentEditSchema[type] || []).forEach((field) => {
    const value = item?.[field.key] ?? '';
    const attrs = [
      `id="adminEdit_${field.key}"`,
      `type="${field.type}"`,
      field.min ? `min="${field.min}"` : '',
      `value="${escapeHtml(value)}"`
    ].filter(Boolean).join(' ');
    fields.push(`<label>${field.label} <input ${attrs} /></label>`);
  });

  return fields.join('');
}

function renderComponentCreateFields(type) {
  return (componentCreateSchema[type] || []).map((field) => {
    const attrs = [
      `id="adminNew_${field.key}"`,
      `type="${field.type}"`,
      field.min ? `min="${field.min}"` : '',
      field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''
    ].filter(Boolean).join(' ');
    return `<label>${field.label} <input ${attrs} /></label>`;
  }).join('');
}

function componentCreatePayload(type) {
  const schema = componentCreateSchema[type] || [];
  const payload = {};

  schema.forEach((field) => {
    const fieldValue = byId(`adminNew_${field.key}`)?.value.trim() || '';
    payload[field.key] = field.type === 'number' ? Number(fieldValue || 0) : fieldValue;
  });

  return payload;
}

function resolveApiBase() {
  // Kiểm tra nếu đang chạy trên Vercel (không phải localhost)
  if (location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return 'https://pc-builder-backend-gklg.onrender.com/api'; 
  }
  
  // Mặc định cho môi trường local
  return 'http://localhost:8080/api';
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function money(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' đ';
}

function formatDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function parseDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function pageName() {
  return document.body.dataset.page || 'home';
}

function prefix() {
  const pathname = location.pathname.replace(/\\/g, '/');
  if (pathname.includes('/frontend/pages/')) return '../';
  return '/frontend/';
}

function pageHref(page, query = '') {
  const map = {
    home: `${prefix()}index.html`,
    auth: `${prefix()}pages/auth.html`,
    catalog: `${prefix()}pages/catalog.html`,
    detail: `${prefix()}pages/detail.html`,
    workspace: `${prefix()}pages/workspace.html`,
    compare: `${prefix()}pages/compare.html`,
    account: `${prefix()}pages/account.html`,
    admin: `${prefix()}pages/admin.html`
  };
  return `${map[page] || map.home}${query}`;
}

function componentHref(id) {
  return pageHref('detail', `?id=${id}`);
}

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(typeof body === 'string' ? body : body?.message || response.statusText || 'Request failed');
  }

  return body;
}

async function getJson(path, fallback) {
  try {
    return await requestJson(path);
  } catch (error) {
    console.warn(`Backend fetch failed for ${path}`, error);
    return fallback;
  }
}

async function loadShell() {
  const headerTarget = byId('header-placeholder');
  const footerTarget = byId('footer-placeholder');

  await Promise.all([
    headerTarget ? fetch(`${prefix()}components/header.html`).then((response) => response.text()).then((html) => { headerTarget.innerHTML = html; }) : Promise.resolve(),
    footerTarget ? fetch(`${prefix()}components/footer.html`).then((response) => response.text()).then((html) => { footerTarget.innerHTML = html; }) : Promise.resolve()
  ]);
}

function componentTypeToLabel(type) {
  return componentMeta[type]?.label || type.toUpperCase();
}

function normalizePriceMap(rows) {
  const map = new Map();
  rows.forEach((price) => {
    const id = Number(price.component?.id || price.componentId || 0);
    if (!id) return;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push({
      source: price.sourceName,
      price: Number(price.priceValue || 0)
    });
  });
  return map;
}

function lowestPrice(prices) {
  return prices && prices.length ? prices.reduce((best, item) => (item.price < best.price ? item : best), prices[0]) : { source: '-', price: 0 };
}

function priceHistoryForComponent(componentId) {
  return state.prices
    .filter((price) => Number(price.component?.id || price.componentId) === Number(componentId))
    .map((price) => ({
      id: Number(price.id || 0),
      sourceName: price.sourceName || '-',
      priceValue: Number(price.priceValue || 0),
      crawledAt: price.crawledAt || null
    }))
    .sort((left, right) => {
      const leftTime = parseDateValue(left.crawledAt);
      const rightTime = parseDateValue(right.crawledAt);
      return leftTime - rightTime || left.id - right.id;
    });
}

function drawPriceChart(canvas, points) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(canvas.clientWidth || 0, 320);
  const height = Number(canvas.getAttribute('height') || 220);

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.scale(ratio, ratio);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8f9fb';
  ctx.fillRect(0, 0, width, height);

  if (!points.length) {
    return;
  }

  const padding = { top: 18, right: 18, bottom: 38, left: 72 };
  const drawWidth = width - padding.left - padding.right;
  const drawHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => Number(point.priceValue || 0));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const spread = Math.max(maxValue - minValue, 1);

  const xStep = points.length === 1 ? 0 : drawWidth / (points.length - 1);
  const projectY = (value) => padding.top + drawHeight - ((value - minValue) / spread) * drawHeight;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + drawHeight);
  ctx.lineTo(padding.left + drawWidth, padding.top + drawHeight);
  ctx.stroke();

  ctx.fillStyle = '#6b7a8d';
  ctx.font = '11px Inter, Segoe UI, sans-serif';
  ctx.fillText(money(maxValue), 4, padding.top + 6);
  ctx.fillText(money(minValue), 4, padding.top + drawHeight);

  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();

  points.forEach((point, index) => {
    const x = padding.left + (points.length === 1 ? drawWidth / 2 : index * xStep);
    const y = projectY(Number(point.priceValue || 0));
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  points.forEach((point, index) => {
    const x = padding.left + (points.length === 1 ? drawWidth / 2 : index * xStep);
    const y = projectY(Number(point.priceValue || 0));
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

function componentName(item) {
  return item?.baseComponent?.name || item?.name || `#${item?.id || ''}`;
}

function buildCatalogItem(type, item, priceMap) {
  const id = Number(item.id || item.baseComponent?.id);
  const prices = priceMap.get(id) || [];
  const cheapest = lowestPrice(prices);
  const base = item.baseComponent || {};
  const specs = {
    cpu: { socket: item.socketType, tdp: `${item.tdpWattage}W` },
    mainboard: { socket: item.socketType, ram: item.ramGeneration },
    ram: { generation: item.ramGeneration, capacity: `${item.capacityGb}GB` },
    gpu: { vram: `${item.vramSizeGb}GB`, tdp: `${item.tdpWattage}W` },
    psu: { wattage: `${item.powerOutputWatt}W` }
  };

  return {
    id,
    type,
    name: componentName(item),
    brand: base.brand || '',
    lowestPrice: cheapest.price,
    lowestSource: cheapest.source,
    prices,
    specs: specs[type] || {},
    description: type === 'cpu' ? 'CPU cân bằng hiệu năng/giá.' : type === 'gpu' ? 'GPU cho gaming và đồ họa.' : 'Linh kiện trong hệ thống.'
  };
}

function currentUserLabel() {
  if (!state.currentUser) return null;
  return state.currentUser.email || 'Người dùng';
}

function syncHeader() {
  const userMenu = byId('userMenu');
  if (!userMenu) return;

  if (state.currentUser) {
    const email = currentUserLabel();
    const initial = email.charAt(0).toUpperCase();
    userMenu.innerHTML = `
      <div class="user-dropdown-wrap">
        <button class="header-state" id="userMenuBtn" type="button"
          style="display:flex;align-items:center;gap:8px;cursor:pointer;border:1.5px solid var(--border-2);background:var(--white);color:var(--navy);padding:7px 14px;border-radius:99px;font-size:13px;font-weight:600;transition:all .2s">
          <span style="width:24px;height:24px;border-radius:50%;background:var(--navy);color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${escapeHtml(initial)}</span>
          <span style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(email)}</span>
          <span style="font-size:10px;color:var(--text-3)">▾</span>
        </button>
        <div id="userMenuDropdown" class="user-menu-dropdown" style="display:none">
          <a href="${pageHref('account')}">👤 Tài khoản</a>
          <hr/>
          <button id="logoutBtn" class="danger" type="button">🚪 Đăng xuất</button>
        </div>
      </div>
    `;

    const userMenuBtn = byId('userMenuBtn');
    const dropdown    = byId('userMenuDropdown');
    const logoutBtn   = byId('logoutBtn');

    userMenuBtn?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      localStorage.removeItem(STORAGE_KEYS.currentUserId);
      state.currentUser = null;
      syncHeader();
      location.href = pageHref('home');
    });

    document.addEventListener('click', (e) => {
      if (userMenuBtn && dropdown &&
          !userMenuBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    }, { once: false });

  } else {
    userMenu.innerHTML = `<a class="header-state" href="${pageHref('auth')}">Đăng nhập</a>`;
  }

  const navCompare = byId('navCompare');
  const navAdmin   = byId('navAdmin');
  if (navCompare) navCompare.style.display = 'inline-flex';
  if (navAdmin)   navAdmin.style.display   = (state.currentUser && String(state.currentUser.role || '').toUpperCase() === 'ADMIN') ? 'inline-flex' : 'none';

  document.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === pageName());
  });
}

function getSelectedUserId() {
  return Number(localStorage.getItem(STORAGE_KEYS.currentUserId) || 0) || null;
}

function persistCurrentUser(userId) {
  localStorage.setItem(STORAGE_KEYS.currentUserId, String(userId));
  state.currentUser = state.users.find((user) => Number(user.id) === Number(userId)) || null;
}

async function loadBackendData() {
  const [users, cpus, mainboards, rams, gpus, psus, baseComponents, prices, sourceNames, reviews, builds] = await Promise.all([
    getJson('/users', []),
    getJson('/cpus', []),
    getJson('/mainboards', []),
    getJson('/rams', []),
    getJson('/gpus', []),
    getJson('/psus', []),
    getJson('/base-components', []),
    getJson('/crawled-prices', []),
    getJson('/crawled-prices/sources', []),
    getJson('/reviews', []),
    getJson('/builds', [])
  ]);

  state.users = users;
  state.cpus = cpus;
  state.mainboards = mainboards;
  state.rams = rams;
  state.gpus = gpus;
  state.psus = psus;
  state.baseComponents = baseComponents;
  state.prices = prices;
  state.sourceNames = sourceNames;
  state.reviews = reviews;
  state.builds = builds;
  state.currentUser = state.users.find((user) => Number(user.id) === getSelectedUserId()) || null;
}

function catalogItems() {
  const priceMap = normalizePriceMap(state.prices);
  return [
    ...state.cpus.map((item) => buildCatalogItem('cpu', item, priceMap)),
    ...state.mainboards.map((item) => buildCatalogItem('mainboard', item, priceMap)),
    ...state.rams.map((item) => buildCatalogItem('ram', item, priceMap)),
    ...state.gpus.map((item) => buildCatalogItem('gpu', item, priceMap)),
    ...state.psus.map((item) => buildCatalogItem('psu', item, priceMap))
  ];
}

function renderHome() {
  // Fill live stats
  const items = catalogItems();
  const statComp  = byId('statComponents');
  const statBld   = byId('statBuilds');
  const statRev   = byId('statReviews');
  const statSrc   = byId('statSources');
  if (statComp) statComp.textContent = items.length || '—';
  if (statBld)  statBld.textContent  = state.builds.length || '—';
  if (statRev)  statRev.textContent  = state.reviews.length || '—';
  if (statSrc)  statSrc.textContent  = state.sourceNames.length || '—';
  // feature-grid is already static HTML in index.html — nothing to render
}

function renderCatalog() {
  const filters = byId('catalogFilters');
  const search  = byId('catalogSearch');
  const sortSel = byId('catalogSort');
  const grid    = byId('catalogGrid');
  const count   = byId('catalogCount');
  const cheapest = byId('catalogCheapest');
  const items   = catalogItems();
  let activeType = 'all';

  function draw() {
    const keyword = (search?.value || '').trim().toLowerCase();
    const sortVal = sortSel?.value || 'default';

    let visible = items.filter((item) =>
      (activeType === 'all' || item.type === activeType) &&
      [item.name, item.brand, item.description, item.type].join(' ').toLowerCase().includes(keyword)
    );

    if (sortVal === 'price-asc')  visible = [...visible].sort((a, b) => a.lowestPrice - b.lowestPrice);
    if (sortVal === 'price-desc') visible = [...visible].sort((a, b) => b.lowestPrice - a.lowestPrice);
    if (sortVal === 'name-asc')   visible = [...visible].sort((a, b) => a.name.localeCompare(b.name));

    if (count) count.textContent = `${visible.length} linh kiện`;
    if (cheapest) {
      const top = visible.reduce((best, item) => (!best || item.lowestPrice < best.lowestPrice ? item : best), null);
      cheapest.textContent = top && top.lowestPrice ? `Rẻ nhất: ${top.name} — ${money(top.lowestPrice)}` : '';
    }

    if (grid) {
      grid.innerHTML = visible.length ? visible.map((item) => `
        <article class="product-card" onclick="location.href='${componentHref(item.id)}'">
          <div class="product-top">
            <span class="pill">${escapeHtml(componentTypeToLabel(item.type))}</span>
            <span class="price">${item.lowestPrice ? money(item.lowestPrice) : '—'}</span>
          </div>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="muted">${escapeHtml(item.brand || '—')}</p>
          <div class="card-meta" style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border)">
            ${item.lowestSource ? `📍 ${escapeHtml(item.lowestSource)}` : ''}
          </div>
          <a class="btn outline btn-sm" href="${componentHref(item.id)}" onclick="event.stopPropagation()">Xem chi tiết</a>
        </article>
      `).join('') : '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><span>Không tìm thấy linh kiện phù hợp.</span></div>';
    }
  }

  if (filters) {
    const filterList = ['all', 'cpu', 'mainboard', 'ram', 'gpu', 'psu'];
    filters.innerHTML = filterList.map((type) =>
      `<button type="button" class="chip ${type === 'all' ? 'active' : ''}" data-filter="${type}">${
        escapeHtml(type === 'all' ? 'Tất cả' : componentTypeToLabel(type))
      }</button>`
    ).join('');

    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      activeType = button.dataset.filter;
      filters.querySelectorAll('.chip').forEach((chip) =>
        chip.classList.toggle('active', chip.dataset.filter === activeType)
      );
      draw();
    });
  }

  search?.addEventListener('input', draw);
  sortSel?.addEventListener('change', draw);
  draw();
}

function getCatalogItemById(id) {
  return catalogItems().find((item) => Number(item.id) === Number(id));
}

function renderDetail() {
  const id = Number(new URLSearchParams(location.search).get('id') || catalogItems()[0]?.id || 0);
  const item = getCatalogItemById(id) || catalogItems()[0];
  if (!item) return;

  const history = priceHistoryForComponent(item.id);

  byId('detailTitle').textContent = item.name;
  byId('detailSubtitle').textContent = `${item.brand} • ${componentTypeToLabel(item.type)} • Giá thấp nhất ${money(item.lowestPrice)}`;
  byId('detailType').textContent = componentTypeToLabel(item.type);
  byId('detailLowestPrice').textContent = money(item.lowestPrice);
  byId('detailSource').textContent = item.lowestSource;
  byId('detailVisualTitle').textContent = item.name;
  byId('detailVisualSubtitle').textContent = `${item.brand} • ${componentTypeToLabel(item.type)}`;

  byId('detailSpecs').innerHTML = Object.entries(item.specs).map(([key, value]) => `
    <div class="spec-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join('') || '<div class="empty"><div class="empty-icon">📐</div><span>Chưa có thông số.</span></div>';

  // Render prices as price-source-item cards
  const cheapestSource = item.lowestSource;
  byId('detailPrices').innerHTML = history.length ? history.map((price) => {
    const isCheapest = price.sourceName === cheapestSource;
    return `
      <div class="price-source-item${isCheapest ? ' cheapest' : ''}">
        <div>
          <div class="source-name">${escapeHtml(price.sourceName)}${isCheapest ? ' <span class="badge badge-green" style="font-size:10px">Rẻ nhất</span>' : ''}</div>
          <div class="source-time">${escapeHtml(formatDateTime(price.crawledAt) || 'Không rõ thời gian')}</div>
        </div>
        <span class="source-price">${money(price.priceValue)}</span>
      </div>`;
  }).join('') : '<div class="empty"><div class="empty-icon">💰</div><span>Chưa có dữ liệu giá.</span></div>';

  // Set breadcrumb & visual chip
  if (byId('detailBreadcrumb')) byId('detailBreadcrumb').textContent = item.name;
  if (byId('detailVisualChip')) byId('detailVisualChip').textContent = componentTypeToLabel(item.type);
  if (byId('detailBadge')) byId('detailBadge').innerHTML = `<span class="badge badge-ice">${escapeHtml(componentTypeToLabel(item.type))}</span>`;

  const chart = byId('priceChart');
  const chartEmpty = byId('priceChartEmpty');
  if (chart) {
    drawPriceChart(chart, history);
  }
  if (chartEmpty) {
    chartEmpty.style.display = history.length ? 'none' : 'block';
  }

  const reviews = state.reviews.filter((review) => Number(review.component?.id || review.componentId) === Number(item.id));
  byId('detailReviews').innerHTML = reviews.length ? reviews.map((review) => `
    <div class="review-item">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span class="review-author">${escapeHtml(review.user?.email || review.user?.name || 'Người dùng')}</span>
        <span class="review-stars">${'★'.repeat(Number(review.ratingStar || review.rating || 0))}${'☆'.repeat(Math.max(0, 5 - Number(review.ratingStar || review.rating || 0)))}</span>
      </div>
      <p class="review-text">${escapeHtml(review.commentText || review.comment || '')}</p>
    </div>
  `).join('') : '<div class="empty"><div class="empty-icon">⭐</div><span>Chưa có đánh giá.</span></div>';

  // Show/hide review form based on login state
  const reviewFormWrap   = byId('reviewFormWrap');
  const reviewLoginPrompt = byId('reviewLoginPrompt');
  if (reviewFormWrap)    reviewFormWrap.style.display   = state.currentUser ? 'flex' : 'none';
  if (reviewLoginPrompt) reviewLoginPrompt.style.display = state.currentUser ? 'none' : 'block';

  byId('submitReviewBtn')?.addEventListener('click', async () => {
    if (!state.currentUser) return;
    const commentText = byId('reviewText')?.value.trim();
    if (!commentText) { showToast('Vui lòng nhập nội dung đánh giá.', 'error'); return; }
    const btn = byId('submitReviewBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi...'; }
    try {
      await requestJson('/reviews', {
        method: 'POST',
        body: JSON.stringify({ userId: state.currentUser.id, componentId: item.id, ratingStar: 5, commentText })
      });
      byId('reviewText').value = '';
      showToast('Đã gửi đánh giá thành công!', 'success');
      await loadBackendData();
      renderDetail();
      syncHeader();
    } catch (error) {
      showToast(`Không thể gửi đánh giá: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Gửi đánh giá'; }
    }
  });
}

function getWorkspaceSelects() {
  return {
    cpu: byId('workspaceCpuSelect'),
    mainboard: byId('workspaceMainboardSelect'),
    ram: byId('workspaceRamSelect'),
    gpu: byId('workspaceGpuSelect'),
    psu: byId('workspacePsuSelect')
  };
}

function workspaceSelectionFromUI() {
  const selects = getWorkspaceSelects();
  return {
    cpu: Number(selects.cpu?.value || 0),
    mainboard: Number(selects.mainboard?.value || 0),
    ram: Number(selects.ram?.value || 0),
    gpu: Number(selects.gpu?.value || 0),
    psu: Number(selects.psu?.value || 0)
  };
}

function workspaceComponentsFromSelection(selection) {
  return Object.values(selection).map((id) => getCatalogItemById(id)).filter(Boolean);
}

function renderWorkspaceSummary(report) {
  const summary     = byId('workspaceSummary');
  const result      = byId('workspaceResult');
  const summaryCard = byId('workspaceSummaryCard');

  if (summary) {
    summary.innerHTML = report.components.map((item) => `
      <div class="stack-item" style="display:flex;justify-content:space-between;align-items:center">
        <strong>${escapeHtml(item.name)}</strong>
        <span style="font-family:'Cormorant Garamond',serif;font-size:17px;font-weight:700;color:var(--crimson)">${money(item.lowestPrice)}</span>
      </div>`).join('');
    if (summaryCard) summaryCard.style.display = report.components.length ? 'block' : 'none';
  }

  if (result) {
    if (!report.components.length) {
      result.innerHTML = '';
      return;
    }
    if (report.compatible) {
      result.innerHTML = `
        <div class="notice" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <span>✅ Cấu hình <strong>tương thích</strong></span>
          <span style="font-family:'Cormorant Garamond',serif;font-size:20px;font-weight:700;color:var(--navy)">Tổng: ${money(report.totalPrice)}</span>
        </div>`;
    } else {
      const issues = (report.issues || []).map((item) =>
        `<li style="margin-top:6px">⚠️ ${escapeHtml(item.message || item)}</li>`).join('');
      result.innerHTML = `
        <div class="notice error">
          <strong>Cần điều chỉnh cấu hình</strong>
          <ul style="padding-left:4px;margin-top:6px;list-style:none">${issues}</ul>
        </div>`;
    }
  }
}

async function checkWorkspaceCompatibility() {
  const selection = workspaceSelectionFromUI();
  const components = workspaceComponentsFromSelection(selection);
  if (!components.length) {
    return { compatible: false, totalPrice: 0, issues: [], components: [] };
  }

  const payload = {
    totalPrice: components.reduce((sum, item) => sum + Number(item.lowestPrice || 0), 0),
    components: components.map((item) => ({ componentId: item.id, quantity: 1 }))
  };

  return await requestJson('/compatibility/check', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

async function renderAssistantPreview(existingReport) {
  const chatList = byId('chatMessages');
  const chatInput = byId('chatInput');
  const sendBtn = byId('sendChatBtn');
  if (chatList) {
    chatList.innerHTML = state.chat.map((item) => `<div class="chat-line ${item.role}"><strong>${item.role === 'assistant' ? 'AI' : 'Bạn'}:</strong> ${escapeHtml(item.message)}</div>`).join('');
  }

  if (!chatInput || !sendBtn) return;

  async function sendChat() {
    const message = chatInput.value.trim();
    if (!message) return;
    const components = workspaceComponentsFromSelection(workspaceSelectionFromUI());
    if (!components.length) {
      alert('Chọn ít nhất một linh kiện trước khi hỏi AI.');
      return;
    }

    addChatMessage('user', message);
    chatInput.value = '';

    try {
      const report = existingReport || await checkWorkspaceCompatibility();
      const response = await requestJson('/assistant/analyze', {
        method: 'POST',
        body: JSON.stringify({
          message,
          componentId: components[0]?.id || null,
          budget: Number(report?.totalPrice || components.reduce((sum, item) => sum + item.lowestPrice, 0)),
          useCase: message,
          compatibilityComponents: components.map((item) => ({ componentId: item.id, quantity: 1 })),
          conversationContext: buildConversationContext()
        })
      });

      addChatMessage('assistant', formatAssistantMessage(response.answer || 'AI chưa trả lời được.'));
      chatList.innerHTML = state.chat.map((item) => `<div class="chat-line ${item.role}"><strong>${item.role === 'assistant' ? 'AI' : 'Bạn'}:</strong> ${escapeHtml(item.message)}</div>`).join('');
    } catch (error) {
      addChatMessage('assistant', `Không gọi được AI: ${error.message}`);
      chatList.innerHTML = state.chat.map((item) => `<div class="chat-line ${item.role}"><strong>${item.role === 'assistant' ? 'AI' : 'Bạn'}:</strong> ${escapeHtml(item.message)}</div>`).join('');
    }
  }

  sendBtn.onclick = sendChat;
  chatInput.onkeydown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      sendChat();
    }
  };
}

function assistantContextFromWorkspace() {
  const ids = Object.values(state.workspace || {})
    .map((value) => Number(value || 0))
    .filter(Boolean);

  const items = ids
    .map((id) => getCatalogItemById(id))
    .filter(Boolean);

  if (items.length) {
    return {
      items,
      components: items.map((item) => ({ componentId: item.id, quantity: 1 }))
    };
  }

  const fallback = catalogItems()[0];
  if (!fallback) {
    return { items: [], components: [] };
  }

  return {
    items: [fallback],
    components: [{ componentId: fallback.id, quantity: 1 }]
  };
}

function assistantBudgetFromContext(context) {
  if (context?.budget != null) return Number(context.budget || 0);
  return (context?.items || []).reduce((sum, item) => sum + Number(item.lowestPrice || 0), 0);
}

function buildPartsLabel(details) {
  return (details || [])
    .map((detail) => detail.component?.name || detail.component?.baseComponent?.name || '')
    .filter(Boolean)
    .join(', ');
}

function renderFloatingAssistantLines(container) {
  if (!container) return;
  const lines = state.chat;
  if (!lines.length) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;text-align:center;padding:20px;color:var(--text-3)">
        <span style="font-size:32px;opacity:.25">🤖</span>
        <span style="font-size:13px;font-weight:600">Xin chào! Tôi có thể gợi ý cấu hình và giá linh kiện cho bạn.</span>
      </div>`;
    return;
  }

  container.innerHTML = lines.map((item) => `
    <div class="chat-line ${item.role}">
      <div class="chat-avatar-sm">${item.role === 'assistant' ? '🤖' : '👤'}</div>
      <div class="chat-bubble">${escapeHtml(item.message)}</div>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

// ── TOAST HELPER ──
function showToast(message, type = 'info') {
  const container = byId('toast-container');
  if (!container) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 220);
  }, 3000);
}

// ── MODAL HELPER ──
function showModal({ title, body, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy', onConfirm, danger = false }) {
  const existing = byId('_dynamicModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = '_dynamicModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button id="_modalClose" style="background:none;border:none;font-size:18px;color:var(--text-3);cursor:pointer;line-height:1;padding:0">✕</button>
      </div>
      <div style="font-size:14px;color:var(--text-2);line-height:1.6">${body}</div>
      <div class="modal-footer">
        <button id="_modalCancel" class="btn outline">${escapeHtml(cancelLabel)}</button>
        <button id="_modalConfirm" class="btn ${danger ? 'crimson' : 'primary'}">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  byId('_modalClose')?.addEventListener('click', close);
  byId('_modalCancel')?.addEventListener('click', close);
  byId('_modalConfirm')?.addEventListener('click', () => { close(); onConfirm?.(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

// ── INPUT MODAL HELPER ──
function showInputModal({ title, fields, confirmLabel = 'Lưu', onConfirm }) {
  const existing = byId('_dynamicModal');
  if (existing) existing.remove();

  const fieldHtml = fields.map((f) => `
    <label style="display:grid;gap:6px;font-size:13px;font-weight:600;color:var(--text-3)">
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:.07em">${escapeHtml(f.label)}</span>
      ${f.type === 'textarea'
        ? `<textarea id="_mf_${f.key}" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;resize:vertical;min-height:80px;font-family:inherit">${escapeHtml(f.value || '')}</textarea>`
        : `<input id="_mf_${f.key}" type="${f.type || 'text'}" value="${escapeHtml(f.value || '')}" placeholder="${escapeHtml(f.placeholder || '')}" style="padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;width:100%" />`
      }
    </label>
  `).join('');

  const overlay = document.createElement('div');
  overlay.id = '_dynamicModal';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div class="modal-title">${escapeHtml(title)}</div>
        <button id="_modalClose" style="background:none;border:none;font-size:18px;color:var(--text-3);cursor:pointer;line-height:1;padding:0">✕</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px">${fieldHtml}</div>
      <div class="modal-footer">
        <button id="_modalCancel" class="btn outline">Hủy</button>
        <button id="_modalConfirm" class="btn primary">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  byId('_modalClose')?.addEventListener('click', close);
  byId('_modalCancel')?.addEventListener('click', close);
  byId('_modalConfirm')?.addEventListener('click', () => {
    const values = {};
    fields.forEach((f) => {
      values[f.key] = byId(`_mf_${f.key}`)?.value || '';
    });
    close();
    onConfirm?.(values);
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function addChatMessage(role, message) {
  state.chat.push({ role, message: String(message || '') });
  if (state.chat.length > MAX_CHAT_HISTORY) {
    state.chat = state.chat.slice(-MAX_CHAT_HISTORY);
  }
  saveJSON(STORAGE_KEYS.chat, state.chat);
}

function buildConversationContext(maxMessages = 14) {
  const lines = state.chat
    .slice(-Math.max(1, maxMessages))
    .map((item) => `${item.role === 'assistant' ? 'AI' : 'Nguoi dung'}: ${item.message}`);
  return lines.join('\n');
}

function formatAssistantMessage(message) {
  const text = String(message ?? '').trim();
  if (!text) return 'Tôi chưa đủ dữ liệu để trả lời.';

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && (parsed.cpu || parsed.gpu || parsed.ram || parsed.mainboard || parsed.psu)) {
      if (isOutOfScopeReason(parsed.reason)) {
        return normalizePlainAssistantText(parsed.reason);
      }

      const parts = [];
      const configParts = [];
      if (parsed.cpu) configParts.push(`CPU ${parsed.cpu}`);
      if (parsed.mainboard) configParts.push(`mainboard ${parsed.mainboard}`);
      if (parsed.ram) configParts.push(`RAM ${parsed.ram}`);
      if (parsed.gpu) configParts.push(`GPU ${parsed.gpu}`);
      if (parsed.psu) configParts.push(`PSU ${parsed.psu}`);

      if (configParts.length) {
        parts.push(`Mình gợi ý cấu hình gồm ${joinNaturalList(configParts)}.`);
      }

      if (parsed.estimatedPrice != null) {
        parts.push(`Chi phí ước tính khoảng ${money(parsed.estimatedPrice)}.`);
      }

      const reason = normalizeAssistantReason(parsed.reason, parsed);
      if (reason) {
        parts.push(`Lý do: ${reason}`);
      }

      return parts.join(' ');
    }
  } catch {
    // keep plain text
  }

  return normalizePlainAssistantText(text);
}

function isOutOfScopeReason(reason) {
  const text = String(reason ?? '').trim();
  if (!text) return false;
  return /not in my database|not in my pc builder database|don't have performance requirements|system requirements|cannot accurately match a build/i.test(text);
}

function normalizePlainAssistantText(text) {
  const clean = String(text ?? '').trim();
  if (!clean) return 'Tôi chưa đủ dữ liệu để trả lời.';

  if (/i don't have enough data\.?/i.test(clean)) {
    return 'Mình chưa có đủ dữ liệu để trả lời câu này.';
  }

  if (/not in my pc builder database|only provide information about pc components|system requirements/i.test(clean)) {
    return 'Mình chưa có dữ liệu về game này trong hệ thống. Nếu bạn gửi cấu hình tối thiểu của game hoặc tên linh kiện, mình sẽ kiểm tra giúp bạn máy có chơi được không.';
  }

  if (/game\s*"?where the wind meets"?/i.test(clean) || /where the wind meets/i.test(clean)) {
    return 'Mình chưa có dữ liệu về game Where the Wind Meets trong hệ thống. Nếu bạn gửi cấu hình tối thiểu của game, mình sẽ giúp bạn kiểm tra máy có chơi được không.';
  }

  return clean
    .replace(/^I don't have enough data\.?$/i, 'Mình chưa có đủ dữ liệu để trả lời câu này.')
    .replace(/^The game .*? is not in my PC Builder database\.?/i, 'Mình chưa có dữ liệu về game này trong hệ thống.')
    .replace(/I can only provide information about PC components.*$/i, 'Mình hiện chỉ hỗ trợ dữ liệu linh kiện PC trong hệ thống.')
    .replace(/If you have the system requirements.*$/i, 'Nếu bạn gửi cấu hình tối thiểu của game, mình sẽ giúp bạn kiểm tra máy có chơi được không.');
}

function joinNaturalList(items) {
  const list = items.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  if (list.length <= 1) return list[0] || '';
  if (list.length === 2) return `${list[0]} và ${list[1]}`;
  return `${list.slice(0, -1).join(', ')} và ${list[list.length - 1]}`;
}

function normalizeAssistantReason(reason, parsed) {
  const text = String(reason ?? '').trim();
  if (!text) return '';

  try {
    const nested = JSON.parse(text);
    if (nested && typeof nested === 'object') {
      const details = [];
      if (nested.compatibility?.compatible === true) details.push('các linh kiện tương thích với nhau');
      if (nested.compatibility?.cpuSocket && nested.compatibility?.mainboardSocket) {
        details.push(`socket ${nested.compatibility.cpuSocket} của CPU khớp với socket ${nested.compatibility.mainboardSocket} trên mainboard`);
      }
      if (nested.compatibility?.ramType) {
        details.push(`RAM ${nested.compatibility.ramType} phù hợp với mainboard`);
      }
      if (nested.compatibility?.estimatedPowerWatt != null && nested.compatibility?.recommendedPsuWatt != null) {
        details.push(`mức điện tiêu thụ ước tính ${nested.compatibility.estimatedPowerWatt}W, PSU khuyến nghị ${nested.compatibility.recommendedPsuWatt}W`);
      }
      if (nested.reason) {
        details.push(String(nested.reason).trim());
      }
      if (details.length) {
        return details.join(', ').replace(/^I don't have enough data\.\s*/i, '');
      }
    }
  } catch {
    // keep plain text
  }

  const cleaned = text.replace(/^I don't have enough data\.\s*/i, '').trim();
  if (cleaned) return cleaned;

  if (parsed?.cpu || parsed?.gpu) {
    return 'Cấu hình này được chọn để cân bằng giữa hiệu năng, độ tương thích và chi phí.';
  }

  return '';
}

function initFloatingAssistant() {
  if (byId('assistantFloatRoot')) return;

  const wrapper = document.createElement('div');
  wrapper.id = 'assistantFloatRoot';
  wrapper.innerHTML = `
    <button id="assistantFloatToggle" class="assistant-float-toggle" type="button" aria-expanded="false" title="Trợ lý AI">🤖</button>
    <section id="assistantFloatPanel" class="assistant-float-panel" aria-hidden="true">
      <header class="assistant-float-header">
        <div class="chat-avatar">🤖</div>
        <div class="chat-header-info">
          <div class="chat-header-name">Trợ lý AI</div>
          <div class="chat-header-status">Sẵn sàng hỗ trợ</div>
        </div>
        <div class="assistant-float-actions">
          <button id="assistantFloatClear" class="assistant-float-clear" type="button" title="Xóa chat">↺</button>
          <button id="assistantFloatClose" class="assistant-float-close" type="button" aria-label="Đóng chat">✕</button>
        </div>
      </header>
      <div id="assistantFloatMessages" class="assistant-float-messages"></div>
      <div class="assistant-float-compose">
        <div class="assistant-float-context">
          <label>Nguồn phân tích
            <select id="assistantFloatContextMode">
              <option value="workspace">Workspace hiện tại</option>
              <option value="build">Build đã lưu của tôi</option>
            </select>
          </label>
          <label id="assistantFloatBuildWrap" style="display:none">Chọn build
            <select id="assistantFloatBuild"></select>
          </label>
          <div id="assistantFloatBuildPreview" class="assistant-build-preview" style="display:none"></div>
        </div>
        <div class="compose-inner">
          <textarea id="assistantFloatInput" placeholder="Hỏi về cấu hình, giá, tương thích..." rows="2"
            style="flex:1;background:none;border:none;outline:none;font-size:13px;color:var(--text);resize:none;max-height:90px;line-height:1.5;padding:2px 0;font-family:inherit"></textarea>
          <button id="assistantFloatSend" class="chat-send-btn" type="button">➤</button>
        </div>
      </div>
    </section>
  `;
  document.body.appendChild(wrapper);

  const toggle = byId('assistantFloatToggle');
  const panel = byId('assistantFloatPanel');
  const closeBtn = byId('assistantFloatClose');
  const clearBtn = byId('assistantFloatClear');
  const sendBtn = byId('assistantFloatSend');
  const input = byId('assistantFloatInput');
  const messages = byId('assistantFloatMessages');
  const contextMode = byId('assistantFloatContextMode');
  const buildWrap = byId('assistantFloatBuildWrap');
  const buildSelect = byId('assistantFloatBuild');
  const buildPreview = byId('assistantFloatBuildPreview');

  let assistantBuilds = [];
  const buildDetailsCache = new Map();

  const syncContextModeUI = () => {
    const isBuildMode = contextMode?.value === 'build';
    if (buildWrap) {
      buildWrap.style.display = isBuildMode ? 'grid' : 'none';
    }
    if (!isBuildMode && buildPreview) {
      buildPreview.style.display = 'none';
      buildPreview.innerHTML = '';
    }
  };

  const renderAssistantBuildPreview = async () => {
    if (!buildPreview) return;
    if (contextMode?.value !== 'build') {
      buildPreview.style.display = 'none';
      buildPreview.innerHTML = '';
      return;
    }

    const buildId = Number(buildSelect?.value || 0);
    const selectedBuild = assistantBuilds.find((build) => Number(build.id) === buildId);
    if (!selectedBuild) {
      buildPreview.style.display = 'block';
      buildPreview.innerHTML = '<div class="empty">Chon build de xem cau hinh dinh kem.</div>';
      return;
    }

    let details = buildDetailsCache.get(buildId);
    if (!details) {
      details = await loadBuildDetails(buildId);
      buildDetailsCache.set(buildId, details || []);
    }

    const parts = buildPartsLabel(details || []);
    buildPreview.style.display = 'block';
    buildPreview.innerHTML = `
      <strong>${escapeHtml(selectedBuild.title || `Build #${selectedBuild.id}`)}</strong>
      <div>${escapeHtml(parts || 'Chua co linh kien')}</div>
      <div><strong>${money(selectedBuild.totalPrice || 0)}</strong></div>
    `;
  };

  const refreshAssistantBuilds = async () => {
    if (!buildSelect) return;

    if (!state.currentUser?.id) {
      assistantBuilds = [];
      buildSelect.innerHTML = '<option value="">Dang nhap de chon build</option>';
      buildSelect.disabled = true;
      return;
    }

    assistantBuilds = await getJson(`/builds/user/${state.currentUser.id}`, []);
    buildSelect.disabled = assistantBuilds.length === 0;
    buildSelect.innerHTML = assistantBuilds.length
      ? assistantBuilds.map((build) => `<option value="${build.id}">${escapeHtml(build.title || `Build #${build.id}`)}</option>`).join('')
      : '<option value="">Chua co build nao</option>';
    await renderAssistantBuildPreview();
  };

  const assistantContextFromBuild = async () => {
    const buildId = Number(buildSelect?.value || 0);
    if (!buildId) {
      return { items: [], components: [], budget: 0 };
    }

    const selectedBuild = assistantBuilds.find((build) => Number(build.id) === buildId);
    if (!selectedBuild) {
      return { items: [], components: [], budget: 0 };
    }

    let details = buildDetailsCache.get(buildId);
    if (!details) {
      details = await loadBuildDetails(buildId);
      buildDetailsCache.set(buildId, details || []);
    }

    const components = (details || []).map((detail) => ({
      componentId: Number(detail.component?.id || detail.componentId || 0),
      quantity: Number(detail.quantity || 1)
    })).filter((entry) => entry.componentId);

    const items = components
      .map((entry) => getCatalogItemById(entry.componentId))
      .filter(Boolean);

    return {
      items,
      components,
      budget: Number(selectedBuild.totalPrice || 0)
    };
  };

  const openPanel = () => {
    if (!panel || !toggle) return;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    renderFloatingAssistantLines(messages);
  };

  const closePanel = () => {
    if (!panel || !toggle) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
  };

  const sendAssistantMessage = async () => {
    const message = (input?.value || '').trim();
    if (!message) return;

    const context = contextMode?.value === 'build'
      ? await assistantContextFromBuild()
      : assistantContextFromWorkspace();

    if (!context.components.length) {
      alert(contextMode?.value === 'build'
        ? 'Build nay chua co linh kien de phan tich.'
        : 'Chua co du lieu linh kien de AI phan tich.');
      return;
    }

    addChatMessage('user', message);
    if (input) input.value = '';
    renderFloatingAssistantLines(messages);

    try {
      const budget = assistantBudgetFromContext(context);
      const conversationContext = buildConversationContext();
      const response = await requestJson('/assistant/analyze', {
        method: 'POST',
        body: JSON.stringify({
          message,
          componentId: context.items[0]?.id || context.components[0]?.componentId || null,
          budget,
          useCase: message,
          compatibilityComponents: context.components,
          conversationContext
        })
      });

      const assistantMessage = formatAssistantMessage(response.answer || 'AI chua tra loi duoc.');
      addChatMessage('assistant', assistantMessage);
    } catch (error) {
      addChatMessage('assistant', `Khong goi duoc AI: ${error.message}`);
    }

    renderFloatingAssistantLines(messages);
  };

  toggle?.addEventListener('click', () => {
    if (!panel) return;
    if (panel.classList.contains('open')) closePanel();
    else {
      openPanel();
      refreshAssistantBuilds();
      syncContextModeUI();
    }
  });
  closeBtn?.addEventListener('click', closePanel);
  clearBtn?.addEventListener('click', () => {
    state.chat = [];
    saveJSON(STORAGE_KEYS.chat, state.chat);
    renderFloatingAssistantLines(messages);
  });
  contextMode?.addEventListener('change', () => {
    syncContextModeUI();
    renderAssistantBuildPreview();
  });
  buildSelect?.addEventListener('change', () => {
    renderAssistantBuildPreview();
  });
  sendBtn?.addEventListener('click', sendAssistantMessage);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendAssistantMessage();
    }
  });

  refreshAssistantBuilds();
  syncContextModeUI();
  renderAssistantBuildPreview();
  renderFloatingAssistantLines(messages);
}

async function renderWorkspace() {
  const selects = getWorkspaceSelects();
  const items = catalogItems();
  const groups = {
    cpu: items.filter((item) => item.type === 'cpu'),
    mainboard: items.filter((item) => item.type === 'mainboard'),
    ram: items.filter((item) => item.type === 'ram'),
    gpu: items.filter((item) => item.type === 'gpu'),
    psu: items.filter((item) => item.type === 'psu')
  };

  Object.entries(selects).forEach(([type, select]) => {
    if (!select) return;
    select.innerHTML = `<option value="">-- Chọn ${type.toUpperCase()} --</option>` +
      groups[type].map((item) => `<option value="${item.id}">${escapeHtml(item.name)} — ${money(item.lowestPrice)}</option>`).join('');
    const saved = state.workspace[type] || groups[type][0]?.id || '';
    select.value = String(saved);
    state.workspace[type] = Number(select.value || 0);
    select.addEventListener('change', () => {
      state.workspace[type] = Number(select.value || 0);
      saveJSON(STORAGE_KEYS.workspace, state.workspace);
    });
  });

  async function updateWorkspace() {
    const btn = byId('checkCompatibilityBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang kiểm tra...'; }
    try {
      const report = await checkWorkspaceCompatibility();
      renderWorkspaceSummary({
        components: workspaceComponentsFromSelection(workspaceSelectionFromUI()),
        compatible: Boolean(report.compatible),
        totalPrice: Number(report.totalPrice || 0),
        issues: report.issues || []
      });
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔍 Kiểm tra tương thích'; }
    }
  }

  byId('checkCompatibilityBtn')?.addEventListener('click', updateWorkspace);

  // Save build button on workspace page
  byId('saveWorkspaceBuildBtn')?.addEventListener('click', async () => {
    if (!state.currentUser) {
      showToast('Hãy đăng nhập trước khi lưu cấu hình.', 'error'); return;
    }
    const btn = byId('saveWorkspaceBuildBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang lưu...'; }
    try {
      await createBackendBuild(state.workspace);
      showToast('Đã lưu cấu hình thành công!', 'success');
    } catch (error) {
      showToast(`Không thể lưu cấu hình: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Lưu cấu hình'; }
    }
  });

  // Wire inline workspace chat
  const chatList  = byId('chatMessages');
  const chatInput = byId('chatInput');
  const sendBtn   = byId('sendChatBtn');
  const clearBtn  = byId('wsClearChatBtn');

  function renderWsChat() {
    if (!chatList) return;
    if (!state.chat.length) {
      chatList.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;text-align:center;padding:24px;color:var(--text-3)">
          <span style="font-size:36px;opacity:.25">🤖</span>
          <span style="font-size:14px;font-weight:600">AI tư vấn cấu hình PC</span>
          <span style="font-size:13px">Chọn linh kiện rồi đặt câu hỏi bất kỳ</span>
        </div>`;
      return;
    }
    chatList.innerHTML = state.chat.map((item) => `
      <div class="chat-line ${item.role}">
        <div class="chat-avatar-sm">${item.role === 'assistant' ? '🤖' : '👤'}</div>
        <div class="chat-bubble">${escapeHtml(item.message)}</div>
      </div>`).join('');
    chatList.scrollTop = chatList.scrollHeight;
  }

  async function sendWsChat(text) {
    const message = (text || chatInput?.value || '').trim();
    if (!message) return;
    const components = workspaceComponentsFromSelection(workspaceSelectionFromUI());
    if (!components.length) {
      showToast('Chọn ít nhất một linh kiện trước khi hỏi AI.', 'error');
      return;
    }
    addChatMessage('user', message);
    if (chatInput) chatInput.value = '';
    renderWsChat();
    if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳'; }
    try {
      const report = await checkWorkspaceCompatibility().catch(() => ({ totalPrice: 0 }));
      const response = await requestJson('/assistant/analyze', {
        method: 'POST',
        body: JSON.stringify({
          message,
          componentId: components[0]?.id || null,
          budget: Number(report?.totalPrice || components.reduce((s, i) => s + i.lowestPrice, 0)),
          useCase: message,
          compatibilityComponents: components.map((i) => ({ componentId: i.id, quantity: 1 })),
          conversationContext: buildConversationContext()
        })
      });
      addChatMessage('assistant', formatAssistantMessage(response.answer || 'AI chưa trả lời được.'));
    } catch (error) {
      addChatMessage('assistant', `Không gọi được AI: ${error.message}`);
    } finally {
      if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
    }
    renderWsChat();
  }

  sendBtn?.addEventListener('click', () => sendWsChat());
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendWsChat(); }
  });
  clearBtn?.addEventListener('click', () => {
    state.chat = [];
    saveJSON(STORAGE_KEYS.chat, state.chat);
    renderWsChat();
  });

  // Hint chips
  document.querySelectorAll('.ws-hint').forEach((chip) => {
    chip.addEventListener('click', () => sendWsChat(chip.textContent.trim()));
  });

  renderWsChat();

  // Initial summary
  const initComponents = workspaceComponentsFromSelection(workspaceSelectionFromUI());
  renderWorkspaceSummary({
    components: initComponents,
    compatible: true,
    totalPrice: initComponents.reduce((sum, item) => sum + item.lowestPrice, 0),
    issues: []
  });
}

function renderCompare() {
  const categorySelect = byId('compareCategory');
  const leftSelect = byId('compareLeft');
  const rightSelect = byId('compareRight');
  const result = byId('compareResult');
  if (!categorySelect || !leftSelect || !rightSelect || !result) return;

  const categories = ['cpu', 'mainboard', 'ram', 'gpu', 'psu'];
  categorySelect.innerHTML = categories.map((type) => `<option value="${type}">${escapeHtml(componentTypeToLabel(type))}</option>`).join('');

  function fillOptions() {
    const list = catalogItems().filter((item) => item.type === categorySelect.value);
    leftSelect.innerHTML = list.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
    rightSelect.innerHTML = list.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
    leftSelect.value = String(list[0]?.id || '');
    rightSelect.value = String(list[1]?.id || list[0]?.id || '');
  }

  function compareNow() {
    const left = getCatalogItemById(leftSelect.value);
    const right = getCatalogItemById(rightSelect.value);
    if (!left || !right) {
      result.innerHTML = '<div class="empty">Chọn đủ 2 linh kiện để so sánh.</div>';
      return;
    }

    const keys = Array.from(new Set([...Object.keys(left.specs), ...Object.keys(right.specs)]));
    result.innerHTML = `
      <div class="compare-head">
        <div class="stack-item"><strong>${escapeHtml(left.name)}</strong><div>${money(left.lowestPrice)}</div></div>
        <div class="stack-item"><strong>${escapeHtml(right.name)}</strong><div>${money(right.lowestPrice)}</div></div>
      </div>
      <table class="compare-table">
        <thead><tr><th>Thông số</th><th>${escapeHtml(left.name)}</th><th>${escapeHtml(right.name)}</th></tr></thead>
        <tbody>
          ${keys.map((key) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(left.specs[key] || '-')}</td><td>${escapeHtml(right.specs[key] || '-')}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  categorySelect.onchange = () => {
    fillOptions();
    compareNow();
  };
  leftSelect.onchange = compareNow;
  rightSelect.onchange = compareNow;
  fillOptions();
  compareNow();
}

async function loadBuildDetails(buildId) {
  return await getJson(`/build-details/build/${buildId}`, []);
}

async function createBackendBuild(selection, report) {
  if (!state.currentUser) throw new Error('Chưa đăng nhập');
  const selectedIds = Object.values(selection).filter(Boolean);
  const components = selectedIds.map((id) => getCatalogItemById(id)).filter(Boolean);
  const totalPrice = components.reduce((sum, item) => sum + Number(item.lowestPrice || 0), 0);
  const compatibility = report || await checkWorkspaceCompatibility();
  const build = await requestJson('/builds', {
    method: 'POST',
    body: JSON.stringify({
      userId: state.currentUser.id,
      title: `Build của ${state.currentUser.email}`,
      description: 'Cấu hình lưu từ workspace',
      totalPrice,
      compatible: Boolean(compatibility.compatible)
    })
  });

  for (const id of selectedIds) {
    await requestJson('/build-details', {
      method: 'POST',
      body: JSON.stringify({ buildId: build.id, componentId: id, quantity: 1 })
    });
  }
  return build;
}

async function renderAccount() {
  const guestBox   = byId('accountGuest');
  const contentBox = byId('accountContent');
  const buildsBox  = byId('savedBuilds');
  const reviewsBox = byId('myReviews');
  const saveBtn    = byId('saveWorkspaceBuildBtn');

  // Show/hide based on login state
  if (guestBox)   guestBox.style.display   = state.currentUser ? 'none' : 'block';
  if (contentBox) contentBox.style.display = state.currentUser ? 'block' : 'none';

  // Populate profile header
  if (state.currentUser) {
    const initial = (state.currentUser.email || '?').charAt(0).toUpperCase();
    const avatarEl = byId('accountAvatarInitial');
    const nameEl   = byId('accountName');
    const emailEl  = byId('accountEmailDisplay');
    const roleEl   = byId('accountRoleBadge');
    if (avatarEl) avatarEl.textContent = initial;
    if (nameEl)   nameEl.textContent   = state.currentUser.email || '—';
    if (emailEl)  emailEl.textContent  = state.currentUser.email || '—';
    if (roleEl) {
      roleEl.textContent = String(state.currentUser.role || 'USER').toUpperCase();
      roleEl.className = String(state.currentUser.role || '').toUpperCase() === 'ADMIN'
        ? 'badge badge-navy' : 'badge badge-ice';
    }
  }

  const userBox = null; // legacy ref, replaced above

  const userBuilds = state.currentUser ? await getJson(`/builds/user/${state.currentUser.id}`, []) : [];
  const buildDetailsMap = new Map();
  await Promise.all(userBuilds.map(async (build) => {
    buildDetailsMap.set(Number(build.id), await loadBuildDetails(build.id));
  }));

  const buildsCountLabel = byId('buildsCountLabel');
  if (buildsCountLabel) buildsCountLabel.textContent = `${userBuilds.length} cấu hình đã lưu`;

  if (buildsBox) {
    buildsBox.innerHTML = userBuilds.length ? userBuilds.map((build) => {
      const parts = (buildDetailsMap.get(Number(build.id)) || []).map((detail) => detail.component?.name || detail.component?.baseComponent?.name || '').filter(Boolean);
      const compatBadge = build.compatible
        ? '<span class="badge badge-green">Tương thích</span>'
        : '<span class="badge badge-crimson">Cần xem lại</span>';
      return `
        <div class="build-card">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
            <div class="build-card-title">${escapeHtml(build.title || `Build #${build.id}`)}</div>
            ${compatBadge}
          </div>
          <div class="build-card-parts">${escapeHtml(parts.join(' · ') || 'Chưa có linh kiện')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:10px;border-top:1px solid var(--border)">
            <span class="build-card-price">${money(build.totalPrice)}</span>
            <div class="build-card-actions">
              <button class="btn outline btn-sm account-edit-build-btn" type="button" data-build-id="${build.id}">✏️ Sửa</button>
              <button class="btn outline btn-sm account-delete-build-btn" type="button" data-build-id="${build.id}">🗑️ Xóa</button>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔧</div><span style="font-size:15px;font-weight:600">Chưa có cấu hình nào</span><span>Vào Workspace để tạo build đầu tiên</span><a href="../pages/workspace.html" class="btn outline btn-sm" style="margin-top:8px">Mở Workspace</a></div>';

    buildsBox.querySelectorAll('.account-edit-build-btn').forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.currentUser) return;
        const buildId = Number(button.dataset.buildId || 0);
        const build = userBuilds.find((entry) => Number(entry.id) === buildId);
        if (!build) return;

        showInputModal({
          title: '✏️ Sửa build',
          fields: [
            { key: 'title', label: 'Tên build', value: build.title || '', placeholder: 'Tên cấu hình...' },
            { key: 'description', label: 'Mô tả', type: 'textarea', value: build.description || '', placeholder: 'Mô tả...' }
          ],
          confirmLabel: 'Lưu thay đổi',
          onConfirm: async ({ title, description }) => {
            try {
              await requestJson(`/builds/${buildId}`, {
                method: 'PUT',
                body: JSON.stringify({ userId: state.currentUser.id, title, description, totalPrice: build.totalPrice, compatible: Boolean(build.compatible) })
              });
              showToast('Đã cập nhật build.', 'success');
              await loadBackendData();
              await renderAccount();
            } catch (error) {
              showToast(`Lỗi: ${error.message}`, 'error');
            }
          }
        });
      });
    });

    buildsBox.querySelectorAll('.account-delete-build-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const buildId = Number(button.dataset.buildId || 0);
        if (!buildId) return;
        showModal({
          title: 'Xóa build',
          body: 'Bạn chắc chắn muốn xóa build này? Hành động không thể hoàn tác.',
          confirmLabel: 'Xóa', danger: true,
          onConfirm: async () => {
            try {
              await requestJson(`/builds/${buildId}`, { method: 'DELETE' });
              showToast('Đã xóa build.', 'success');
              await loadBackendData();
              await renderAccount();
            } catch (error) {
              showToast(`Lỗi: ${error.message}`, 'error');
            }
          }
        });
      });
    });
  }

  if (reviewsBox) {
    const myReviews = state.currentUser
      ? state.reviews.filter((review) => Number(review.user?.id) === Number(state.currentUser.id))
      : [];

    const reviewsCountLabel = byId('reviewsCountLabel');
    if (reviewsCountLabel) reviewsCountLabel.textContent = `${myReviews.length} đánh giá của bạn`;

    reviewsBox.innerHTML = state.currentUser ? myReviews.map((review) => `
      <div class="review-item">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
          <span class="review-author">${escapeHtml(review.component?.name || review.component?.baseComponent?.name || 'Linh kiện')}</span>
          <span class="review-stars">${'★'.repeat(Number(review.ratingStar || review.rating || 0))}${'☆'.repeat(Math.max(0, 5 - Number(review.ratingStar || review.rating || 0)))}</span>
        </div>
        <p class="review-text">${escapeHtml(review.commentText || review.comment || '')}</p>
        <div class="account-item-actions">
          <button class="btn outline btn-sm account-edit-review-btn" type="button" data-review-id="${review.id}">✏️ Sửa</button>
          <button class="btn outline btn-sm account-delete-review-btn" type="button" data-review-id="${review.id}">🗑️ Xóa</button>
        </div>
      </div>
    `).join('') || '<div class="empty"><div class="empty-icon">⭐</div><span>Bạn chưa có review nào.</span></div>'
      : '<div class="empty"><div class="empty-icon">🔒</div><span>Đăng nhập để xem đánh giá của bạn.</span></div>';

    reviewsBox.querySelectorAll('.account-edit-review-btn').forEach((button) => {
      button.addEventListener('click', () => {
        if (!state.currentUser) return;
        const reviewId = Number(button.dataset.reviewId || 0);
        const review = myReviews.find((entry) => Number(entry.id) === reviewId);
        if (!review) return;
        const componentId = Number(review.component?.id || review.componentId || 0);
        if (!componentId) { showToast('Không xác định được linh kiện của review này.', 'error'); return; }

        showInputModal({
          title: '✏️ Sửa đánh giá',
          fields: [
            { key: 'ratingStar', label: 'Điểm sao (1–5)', type: 'number', value: String(review.ratingStar || review.rating || 5), placeholder: '5' },
            { key: 'commentText', label: 'Nội dung', type: 'textarea', value: review.commentText || review.comment || '', placeholder: 'Nội dung đánh giá...' }
          ],
          confirmLabel: 'Lưu thay đổi',
          onConfirm: async ({ ratingStar, commentText }) => {
            const star = Number(ratingStar || 0);
            if (!Number.isInteger(star) || star < 1 || star > 5) {
              showToast('Điểm sao phải từ 1 đến 5.', 'error'); return;
            }
            try {
              await requestJson(`/reviews/${reviewId}`, {
                method: 'PUT',
                body: JSON.stringify({ userId: state.currentUser.id, componentId, ratingStar: star, commentText })
              });
              showToast('Đã cập nhật review.', 'success');
              await loadBackendData();
              await renderAccount();
            } catch (error) {
              showToast(`Lỗi: ${error.message}`, 'error');
            }
          }
        });
      });
    });

    reviewsBox.querySelectorAll('.account-delete-review-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const reviewId = Number(button.dataset.reviewId || 0);
        if (!reviewId) return;
        showModal({
          title: 'Xóa đánh giá',
          body: 'Bạn chắc chắn muốn xóa đánh giá này?',
          confirmLabel: 'Xóa', danger: true,
          onConfirm: async () => {
            try {
              await requestJson(`/reviews/${reviewId}`, { method: 'DELETE' });
              showToast('Đã xóa review.', 'success');
              await loadBackendData();
              await renderAccount();
            } catch (error) {
              showToast(`Lỗi: ${error.message}`, 'error');
            }
          }
        });
      });
    });
  }

  saveBtn?.addEventListener('click', async () => {
    if (!state.currentUser) { showToast('Hãy đăng nhập trước.', 'error'); return; }
    const btn = saveBtn;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Đang lưu...'; }
    try {
      await createBackendBuild(state.workspace);
      showToast('Đã lưu cấu hình lên backend.', 'success');
      await loadBackendData();
      await renderAccount();
      syncHeader();
    } catch (error) {
      showToast(`Không thể lưu cấu hình: ${error.message}`, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Lưu build từ Workspace'; }
    }
  });
}

async function renderComponentPrices(baseComponentId) {
  const pricesContainer = byId('adminPricesContainer');
  const pricesEmpty = byId('adminPricesEmpty');
  const componentPricesList = byId('adminComponentPricesList');
  const addPriceBtn = byId('adminAddPriceBtn');
  const sourceNameInput = byId('adminCrawlSourceName');
  const sourceNameOptions = byId('adminSourceNameOptions');
  const crawlUrl = byId('adminCrawlUrl');
  const priceMsg = byId('adminPriceMessage');

  if (!baseComponentId) {
    if (pricesContainer) pricesContainer.style.display = 'none';
    if (pricesEmpty) pricesEmpty.style.display = 'block';
    return;
  }

  if (sourceNameOptions) {
    sourceNameOptions.innerHTML = (state.sourceNames || []).map((name) => `<option value="${escapeHtml(name)}"></option>`).join('');
  }

  try {
    const prices = await requestJson(`/crawled-prices/component/${baseComponentId}`);
    
    if (pricesContainer) pricesContainer.style.display = 'block';
    if (pricesEmpty) pricesEmpty.style.display = 'none';

    if (componentPricesList) {
      const sortedPrices = [...(prices || [])].sort((left, right) => {
        const leftTime = parseDateValue(left.crawledAt);
        const rightTime = parseDateValue(right.crawledAt);
        return rightTime - leftTime || Number(right.id || 0) - Number(left.id || 0);
      });

      componentPricesList.innerHTML = sortedPrices.map((price) => `
        <div class="price-source-item">
          <div>
            <div class="source-name">${escapeHtml(price.sourceName)}</div>
            <div class="source-time">${escapeHtml(formatDateTime(price.crawledAt) || '-')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span class="source-price">${money(price.priceValue)}</span>
            <button class="btn outline btn-sm delete-price-btn" data-price-id="${price.id}" style="color:var(--crimson);border-color:rgba(192,57,43,.3);white-space:nowrap">🗑️ Xóa</button>
          </div>
        </div>
      `).join('') || '<div class="empty"><div class="empty-icon">💰</div><span>Chưa có giá crawl nào.</span></div>';

      // Add delete price listeners
      document.querySelectorAll('.delete-price-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          const priceId = Number(btn.dataset.priceId);
          if (!confirm('Bạn chắc chắn muốn xóa giá này?')) return;
          try {
            await requestJson(`/crawled-prices/${priceId}`, { method: 'DELETE' });
            await renderComponentPrices(baseComponentId);
            if (priceMsg) priceMsg.textContent = 'Đã xóa giá crawl.';
          } catch (error) {
            if (priceMsg) priceMsg.textContent = `Lỗi: ${error.message}`;
          }
        });
      });
    }

    // Setup add price button
    if (addPriceBtn) {
      addPriceBtn.onclick = async () => {
        const url = crawlUrl?.value.trim();
        const sourceName = sourceNameInput?.value.trim();

        if (!url) {
          if (priceMsg) priceMsg.textContent = 'Vui lòng nhập URL sản phẩm hợp lệ.';
          return;
        }

        try {
          const result = await requestJson('/crawled-prices/crawl', {
            method: 'POST',
            body: JSON.stringify({
              componentId: baseComponentId,
              sourceUrl: url,
              sourceName
            })
          });
          if (sourceName && !state.sourceNames.includes(sourceName)) {
            state.sourceNames = [...state.sourceNames, sourceName].sort((left, right) => left.localeCompare(right));
          }
          if (crawlUrl) crawlUrl.value = '';
          if (sourceNameInput) sourceNameInput.value = '';
          if (priceMsg) priceMsg.textContent = `Đã crawl giá ${money(result?.priceValue)} từ ${result?.sourceName || 'nguồn'}.`;
          await renderComponentPrices(baseComponentId);
        } catch (error) {
          if (priceMsg) priceMsg.textContent = `Lỗi: ${error.message}`;
        }
      };
    }
  } catch (error) {
    if (pricesContainer) pricesContainer.style.display = 'block';
    if (componentPricesList) componentPricesList.innerHTML = `<div class="notice">${escapeHtml(error.message)}</div>`;
  }
}

function renderAdmin() {
  const stats = byId('adminStats');
  const editSelect = byId('adminEditComponentSelect');
  const editFields = byId('adminEditComponentFields');
  const editMsg = byId('adminEditMessage');
  const buildsList = byId('adminBuildsList');

  if (stats) {
    stats.innerHTML = `
      <article class="admin-stat"><span>Linh kiện</span><strong>${catalogItems().length}</strong></article>
      <article class="admin-stat"><span>Người dùng</span><strong>${state.users.length}</strong></article>
      <article class="admin-stat"><span>Đánh giá</span><strong>${state.reviews.length}</strong></article>
      <article class="admin-stat"><span>Build</span><strong>${state.builds.length}</strong></article>
    `;
  }

  if (buildsList) {
    buildsList.innerHTML = (state.builds || []).map((build) => `
      <div class="stack-item" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <div>
          <strong>${escapeHtml(build.title || build.buildName || build.name || `Build #${build.id}`)}</strong>
          <div style="font-size:13px;color:var(--text-3);margin-top:3px">👤 ${escapeHtml(build.user?.email || 'N/A')}</div>
        </div>
        <div style="text-align:right">
          <div style="font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--crimson)">${money(build.totalPrice || 0)}</div>
          <div style="font-size:12px;color:var(--text-3);margin-top:2px">${build.compatible ? '✅ Tương thích' : '⚠️ Cần xem lại'}</div>
        </div>
      </div>
    `).join('') || '<div class="empty"><div class="empty-icon">🔧</div><span>Không có build nào.</span></div>';
  }

  // Render reviews tab
  const reviewsList = byId('adminReviewsList');
  if (reviewsList) {
    reviewsList.innerHTML = (state.reviews || []).map((review) => `
      <div class="stack-item" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
            <strong style="font-size:14px">${escapeHtml(review.component?.name || review.component?.baseComponent?.name || 'Linh kiện')}</strong>
            <span style="color:#f59e0b;font-size:13px">${'★'.repeat(Number(review.ratingStar || review.rating || 0))}${'☆'.repeat(Math.max(0,5-Number(review.ratingStar||review.rating||0)))}</span>
          </div>
          <div style="font-size:13px;color:var(--text-3)">👤 ${escapeHtml(review.user?.email || 'Người dùng')}</div>
          <p style="font-size:14px;color:var(--text-2);margin-top:6px;line-height:1.5">${escapeHtml(review.commentText || review.comment || '')}</p>
        </div>
        <button class="btn outline btn-sm admin-delete-review-btn" data-review-id="${review.id}">🗑️ Xóa</button>
      </div>
    `).join('') || '<div class="empty"><div class="empty-icon">⭐</div><span>Không có đánh giá nào.</span></div>';

    reviewsList.querySelectorAll('.admin-delete-review-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const reviewId = Number(btn.dataset.reviewId);
        if (!confirm('Xóa đánh giá này?')) return;
        try {
          await requestJson(`/reviews/${reviewId}`, { method: 'DELETE' });
          await loadBackendData();
          renderAdmin();
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });
  }



  function currentSelection() {
    const selected = editSelect?.value || '';
    const [type, id] = selected.split(':');
    if (!type || !id) return null;
    return { type, id: Number(id), item: findComponentEntity(type, id) };
  }

  if (editSelect) {
    const options = catalogItems();
    editSelect.innerHTML = '<option value="">Chọn linh kiện...</option>' + options.map((item) => `<option value="${item.type}:${item.id}">${componentTypeToLabel(item.type)} - ${escapeHtml(item.name)}</option>`).join('');

    editSelect.addEventListener('change', async () => {
      const selection = currentSelection();
      if (!editFields) return;
      if (!selection?.item) {
        editFields.innerHTML = '<div class="empty">Chọn một linh kiện để sửa.</div>';
        byId('adminPricesContainer').style.display = 'none';
        byId('adminPricesEmpty').style.display = 'block';
        return;
      }

      editFields.innerHTML = renderComponentEditFields(selection.type, selection.item);

      // Load and render prices for this component
      await renderComponentPrices(selection.item.baseComponent?.id);
    });

    if (!editSelect.value && options.length) {
      editSelect.value = `${options[0].type}:${options[0].id}`;
    }
    editSelect.dispatchEvent(new Event('change'));
  }

  // ===== THÊM COMPONENT MỚI =====
  const addBtn = byId('adminAddComponentBtn');
  const addMsg = byId('adminAddMessage');
  const addTypeSelect = byId('adminNewComponentType');
  const addFields = byId('adminNewComponentFields');

  function refreshAddFields() {
    if (!addFields || !addTypeSelect) return;
    const type = addTypeSelect.value.toLowerCase();
    addFields.innerHTML = renderComponentCreateFields(type);
  }

  addTypeSelect?.addEventListener('change', refreshAddFields);
  refreshAddFields();

  addBtn?.addEventListener('click', async () => {
    const type = byId('adminNewComponentType')?.value.toLowerCase();
    const name = byId('adminNewComponentName')?.value.trim();
    const brand = byId('adminNewComponentBrand')?.value.trim();

    if (!name || !type) {
      if (addMsg) addMsg.textContent = 'Vui lòng nhập loại và tên.';
      return;
    }

    try {
      const baseComponent = await requestJson('/base-components', {
        method: 'POST',
        body: JSON.stringify({ name, brand })
      });

      const payload = componentCreatePayload(type);
      payload.baseComponentId = baseComponent.id;
      if (type === 'cpu') {
        payload.socketType = payload.socketType || '';
        payload.tdpWattage = Number(payload.tdpWattage || 0);
      } else if (type === 'mainboard') {
        payload.socketType = payload.socketType || '';
        payload.ramGeneration = payload.ramGeneration || '';
      } else if (type === 'ram') {
        payload.ramGeneration = payload.ramGeneration || '';
        payload.capacityGb = Number(payload.capacityGb || 0);
      } else if (type === 'gpu') {
        payload.vramSizeGb = Number(payload.vramSizeGb || 0);
        payload.tdpWattage = Number(payload.tdpWattage || 0);
      } else if (type === 'psu') {
        payload.powerOutputWatt = Number(payload.powerOutputWatt || 0);
      }

      const newComponent = await requestJson(`/${type}s`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      await loadBackendData();
      await renderAdmin();
      if (addMsg) addMsg.textContent = `Đã thêm ${name}.`;
      byId('adminNewComponentName').value = '';
      byId('adminNewComponentBrand').value = '';
    } catch (error) {
      if (addMsg) addMsg.textContent = `Lỗi: ${error.message}`;
    }
  });

  const updateBtn = byId('adminUpdateComponentBtn');
  const deleteBtn = byId('adminDeleteComponentBtn');

  updateBtn?.addEventListener('click', async () => {
    const selection = currentSelection();
    if (!selection?.item) {
      if (editMsg) editMsg.textContent = 'Vui lòng chọn component.';
      return;
    }

    const { type, item } = selection;
    const baseComponentId = Number(byId('adminEditBaseComponentId')?.value || item.baseComponent?.id || 0);
    const basePayload = {
      name: byId('adminEditBaseName')?.value.trim() || '',
      brand: byId('adminEditBaseBrand')?.value.trim() || ''
    };

    try {
      if (baseComponentId) {
        await requestJson(`/base-components/${baseComponentId}`, {
          method: 'PUT',
          body: JSON.stringify(basePayload)
        });
      }

      await requestJson(`/${type}s/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(componentUpdatePayload(type))
      });

      await loadBackendData();
      await renderAdmin();
      if (editMsg) editMsg.textContent = 'Đã cập nhật component.';
    } catch (error) {
      if (editMsg) editMsg.textContent = `Lỗi: ${error.message}`;
    }
  });

  deleteBtn?.addEventListener('click', async () => {
    const selection = currentSelection();
    if (!selection?.item) {
      if (editMsg) editMsg.textContent = 'Vui lòng chọn component.';
      return;
    }

    if (!confirm('Bạn chắc chắn muốn xóa component này?')) return;

    try {
      await requestJson(`/${selection.type}s/${selection.item.id}`, { method: 'DELETE' });
      await loadBackendData();
      await renderAdmin();
      if (editMsg) editMsg.textContent = 'Đã xóa component.';
    } catch (error) {
      if (editMsg) editMsg.textContent = `Lỗi: ${error.message}`;
    }
  });

  // ===== QUẢN LÝ NGƯỜI DÙNG =====
  const usersList = byId('adminUsersList');
  if (usersList) {
    usersList.innerHTML = (state.users || []).map((user) => {
      const isAdmin = String(user.role || '').toUpperCase() === 'ADMIN';
      return `
        <div class="stack-item" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:38px;height:38px;border-radius:50%;background:var(--ice);border:1px solid var(--ice-mid);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--navy);flex-shrink:0">${escapeHtml((user.email||'?').charAt(0).toUpperCase())}</div>
            <div>
              <div style="font-size:14px;font-weight:600;color:var(--navy)">${escapeHtml(user.email)}</div>
              <div style="margin-top:3px">${isAdmin ? '<span class="badge badge-navy">ADMIN</span>' : '<span class="badge badge-ice">USER</span>'}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn outline btn-sm change-role-btn" data-user-id="${user.id}">⇄ ${isAdmin ? 'Hạ USER' : 'Lên ADMIN'}</button>
            <button class="btn outline btn-sm admin-delete-user-btn" data-user-id="${user.id}" style="color:var(--crimson);border-color:rgba(192,57,43,.3)">🗑️ Xóa</button>
          </div>
        </div>`;
    }).join('') || '<div class="empty"><div class="empty-icon">👥</div><span>Không có người dùng.</span></div>';

    usersList.querySelectorAll('.change-role-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = Number(btn.dataset.userId);
        const user = state.users.find((u) => Number(u.id) === userId);
        if (!user) return;
        const newRole = String(user.role || 'USER').toUpperCase() === 'ADMIN' ? 'USER' : 'ADMIN';
        try {
          await requestJson(`/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
          });
          await loadBackendData();
          renderAdmin();
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });

    usersList.querySelectorAll('.admin-delete-user-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const userId = Number(btn.dataset.userId);
        if (!confirm('Bạn chắc chắn muốn xóa người dùng này?')) return;
        try {
          await requestJson(`/users/${userId}`, { method: 'DELETE' });
          await loadBackendData();
          renderAdmin();
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });
  }

  // ===== TAB SYSTEM =====
  document.querySelectorAll('.admin-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      document.querySelectorAll('.admin-tab-content').forEach((content) => {
        content.classList.remove('active');
      });
      document.querySelectorAll('.admin-tab-btn').forEach((b) => {
        b.classList.remove('active');
      });
      const tabContent = byId(`tab-${tabName}`);
      if (tabContent) tabContent.classList.add('active');
      btn.classList.add('active');
    });
  });
}

async function renderAuth() {
  const loginBtn    = byId('loginBtn');
  const registerBtn = byId('registerBtn');
  const message     = byId('authMessage');

  function showMsg(text, type) {
    if (!message) return;
    message.textContent = text;
    message.className = `auth-message ${type}`;
  }

  loginBtn?.addEventListener('click', async () => {
    const email    = byId('loginEmail')?.value.trim();
    const password = byId('loginPassword')?.value.trim();
    if (!email || !password) { showMsg('Vui lòng nhập email và mật khẩu.', 'err'); return; }

    loginBtn.disabled = true; loginBtn.textContent = 'Đang đăng nhập...';
    try {
      const users = Array.isArray(await requestJson('/users')) ? await requestJson('/users') : [];
      const user  = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) { showMsg('Không tìm thấy tài khoản, hãy đăng ký trước.', 'err'); return; }
      persistCurrentUser(user.id);
      syncHeader();
      showMsg(`✅ Đăng nhập thành công: ${user.email}`, 'ok');
      setTimeout(() => {
        location.href = String(user.role || '').toUpperCase() === 'ADMIN'
          ? pageHref('admin') : pageHref('home');
      }, 700);
    } catch (error) {
      showMsg(`Không đăng nhập được: ${error.message}`, 'err');
    } finally {
      loginBtn.disabled = false; loginBtn.textContent = 'Đăng nhập';
    }
  });

  registerBtn?.addEventListener('click', async () => {
    const email           = byId('registerEmail')?.value.trim();
    const password        = byId('registerPassword')?.value.trim();
    const passwordConfirm = byId('registerPasswordConfirm')?.value.trim();
    if (!email || !password || !passwordConfirm) { showMsg('Vui lòng nhập đầy đủ thông tin.', 'err'); return; }
    if (password !== passwordConfirm) { showMsg('Mật khẩu xác nhận không khớp.', 'err'); return; }

    registerBtn.disabled = true; registerBtn.textContent = 'Đang tạo tài khoản...';
    try {
      const user = await requestJson('/users', {
        method: 'POST',
        body: JSON.stringify({ email, password, role: 'USER' })
      });
      await loadBackendData();
      persistCurrentUser(user.id);
      syncHeader();
      showMsg(`✅ Tạo tài khoản thành công: ${user.email}`, 'ok');
      setTimeout(() => { location.href = pageHref('home'); }, 700);
    } catch (error) {
      showMsg(`Không thể tạo tài khoản: ${error.message}`, 'err');
    } finally {
      registerBtn.disabled = false; registerBtn.textContent = 'Tạo tài khoản';
    }
  });
}

async function boot() {
  try {
    await loadShell();
    await loadBackendData();
    
    // Khôi phục currentUser từ localStorage
    const userId = getSelectedUserId();
    if (userId) {
      state.currentUser = state.users.find((user) => Number(user.id) === Number(userId)) || null;
    }
    
    syncHeader();
    initFloatingAssistant();

    const page = pageName();
    if (page === 'home') renderHome();
    if (page === 'catalog') renderCatalog();
    if (page === 'detail') renderDetail();
    if (page === 'workspace') await renderWorkspace();
    if (page === 'compare') renderCompare();
    if (page === 'account') await renderAccount();
    if (page === 'admin') renderAdmin();
    if (page === 'auth') await renderAuth();
  } catch (error) {
    console.error(error);
    const message = byId('appMessage');
    if (message) {
      message.textContent = `Không thể tải frontend: ${error.message}`;
      message.style.display = 'block';
    }
  }
}

window.addEventListener('DOMContentLoaded', boot);