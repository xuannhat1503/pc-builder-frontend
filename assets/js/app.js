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

  return '/';
}
function pageHref(page, query = '') {
  const map = {
    home: `/index.html`,
    auth: `/pages/auth.html`,
    catalog: `/pages/catalog.html`,
    detail: `/pages/detail.html`,
    workspace: `/pages/workspace.html`,
    compare: `/pages/compare.html`,
    account: `/pages/account.html`,
    admin: `/pages/admin.html`
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

  // Đảm bảo đường dẫn này khớp với cấu trúc thư mục thực tế trên Vercel
  // Nếu file đang ở /components/header.html, hãy bỏ chữ /frontend đi
  await Promise.all([
    headerTarget ? fetch(`/components/header.html`).then(r => r.text()).then(html => headerTarget.innerHTML = html) : Promise.resolve(),
    footerTarget ? fetch(`/components/footer.html`).then(r => r.text()).then(html => footerTarget.innerHTML = html) : Promise.resolve()
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
  ctx.fillStyle = '#f8fff9';
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

  ctx.strokeStyle = '#cfe8d4';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + drawHeight);
  ctx.lineTo(padding.left + drawWidth, padding.top + drawHeight);
  ctx.stroke();

  ctx.fillStyle = '#61806a';
  ctx.font = '12px Segoe UI, Tahoma, sans-serif';
  ctx.fillText(money(maxValue), 10, padding.top + 6);
  ctx.fillText(money(minValue), 10, padding.top + drawHeight);

  ctx.strokeStyle = '#1f9d4c';
  ctx.lineWidth = 3;
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
    ctx.fillStyle = '#1f9d4c';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
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
    userMenu.innerHTML = `
      <div style="position: relative; display: flex; align-items: center;">
        <a class="header-state" href="javascript:void(0)" id="userMenuBtn" style="cursor: pointer; margin-right: 10px;">${escapeHtml(email)}</a>
        <div id="userMenuDropdown" class="user-menu-dropdown" style="display:none; position: absolute; top: 100%; left: 0; background: white; border: 1px solid #ddd; border-radius: 4px; min-width: 150px; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <a href="${pageHref('account')}" style="display: block; padding: 10px 15px; text-decoration: none; color: #333; border-bottom: 1px solid #eee;">T\u00e0i kho\u1ea3n</a>
          <a href="javascript:void(0)" id="logoutBtn" style="display: block; padding: 10px 15px; text-decoration: none; color: #d32f2f; cursor: pointer;">Đăng xuất</a>
        </div>
      </div>
    `;
    
    const userMenuBtn = byId('userMenuBtn');
    const dropdown = byId('userMenuDropdown');
    const logoutBtn = byId('logoutBtn');
    
    userMenuBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });
    
    logoutBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      localStorage.removeItem(STORAGE_KEYS.currentUserId);
      state.currentUser = null;
      syncHeader();
      location.href = pageHref('home');
    });
    
    document.addEventListener('click', (e) => {
      if (userMenuBtn && dropdown && !userMenuBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  } else {
    userMenu.innerHTML = `<a class="header-state" href="${pageHref('auth')}" style="margin: 0;">Đăng nhập</a>`;
  }
  
  // Hiển thị "Quản lý" cho admin, còn "So sánh" luôn bật cho mọi vai trò
  const navCompare = byId('navCompare');
  const navAdmin = byId('navAdmin');
  if (state.currentUser) {
    const role = String(state.currentUser.role || 'USER').toUpperCase();
    if (role === 'ADMIN') {
      if (navCompare) navCompare.style.display = 'inline-block';
      if (navAdmin) navAdmin.style.display = 'inline-block';
    } else {
      if (navCompare) navCompare.style.display = 'inline-block';
      if (navAdmin) navAdmin.style.display = 'none';
    }
  } else {
    if (navCompare) navCompare.style.display = 'inline-block';
    if (navAdmin) navAdmin.style.display = 'none';
  }
  
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
  const grid = byId('homeScreenGrid');
  if (!grid) return;
  const firstDetailId = catalogItems()[0]?.id || 1;
  const screens = [
    { title: 'Đăng nhập / đăng ký', href: pageHref('auth'), desc: 'Quản lý tài khoản người dùng.' },
    { title: 'Danh sách linh kiện', href: pageHref('catalog'), desc: 'Hiển thị giá thấp nhất từ nhiều nguồn.' },
    { title: 'Chi tiết linh kiện', href: componentHref(firstDetailId), desc: 'Thông số, giá nhiều nguồn, đánh giá.' },
    { title: 'Workspace', href: pageHref('workspace'), desc: 'Chọn linh kiện và chat với AI.' },
    { title: 'So sánh linh kiện', href: pageHref('compare'), desc: 'Đối chiếu thông số kỹ thuật.' },
    { title: 'Tài khoản & cấu hình', href: pageHref('account'), desc: 'Xem cấu hình đã lưu.' },
    { title: 'Quản trị', href: pageHref('admin'), desc: 'Quản lý linh kiện, người dùng, review và build.' }
  ];

  grid.innerHTML = screens.map((screen) => `
    <article class="screen-card">
      <strong>${escapeHtml(screen.title)}</strong>
      <span>${escapeHtml(screen.desc)}</span>
      <a class="btn outline" href="${screen.href}">Mở màn hình</a>
    </article>
  `).join('');
}

function renderCatalog() {
  const filters = byId('catalogFilters');
  const search = byId('catalogSearch');
  const grid = byId('catalogGrid');
  const count = byId('catalogCount');
  const cheapest = byId('catalogCheapest');
  const items = catalogItems();
  let activeType = 'all';

  function draw() {
    const keyword = (search?.value || '').trim().toLowerCase();
    const visible = items.filter((item) => (activeType === 'all' || item.type === activeType) && [item.name, item.brand, item.description, item.type].join(' ').toLowerCase().includes(keyword));
    if (count) count.textContent = `${visible.length} linh kiện`;
    if (cheapest) {
      const top = visible.reduce((best, item) => (!best || item.lowestPrice < best.lowestPrice ? item : best), null);
      cheapest.textContent = top ? `${top.name} - ${money(top.lowestPrice)}` : 'Không có dữ liệu';
    }
    if (grid) {
      grid.innerHTML = visible.map((item) => `
        <article class="product-card">
          <div class="product-top">
            <span class="pill">${escapeHtml(componentTypeToLabel(item.type))}</span>
            <span class="price">${money(item.lowestPrice)}</span>
          </div>
          <h3>${escapeHtml(item.name)}</h3>
          <p class="muted">${escapeHtml(item.description)}</p>
          <div class="card-meta">${escapeHtml(item.brand)} • ${escapeHtml(item.lowestSource)}</div>
          <a class="btn outline" href="${componentHref(item.id)}">Xem chi tiết</a>
        </article>
      `).join('') || '<div class="empty">Không tìm thấy linh kiện phù hợp.</div>';
    }
  }

  if (filters) {
    const filterList = ['all', 'cpu', 'mainboard', 'ram', 'gpu', 'psu'];
    filters.innerHTML = filterList.map((type) => `<button type="button" class="chip ${type === 'all' ? 'active' : ''}" data-filter="${type}">${escapeHtml(type === 'all' ? 'Tất cả' : componentTypeToLabel(type))}</button>`).join('');
    filters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      activeType = button.dataset.filter;
      filters.querySelectorAll('.chip').forEach((chip) => chip.classList.toggle('active', chip.dataset.filter === activeType));
      draw();
    });
  }

  search?.addEventListener('input', draw);
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

  byId('detailSpecs').innerHTML = Object.entries(item.specs).map(([key, value]) => `<div class="spec-row"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('') || '<div class="empty">Chưa có thông số.</div>';
  byId('detailPrices').innerHTML = history.map((price) => `
    <div class="stack-item">
      <strong>${escapeHtml(price.sourceName)}</strong>
      <div>${money(price.priceValue)}</div>
      <div class="muted">${escapeHtml(formatDateTime(price.crawledAt) || 'Không rõ thời gian')}</div>
    </div>
  `).join('') || '<div class="empty">Chưa có dữ liệu giá.</div>';

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
    <article class="review-item">
      <strong>${escapeHtml(review.user?.email || review.user?.name || 'Người dùng')}</strong>
      <span>${'★'.repeat(Number(review.ratingStar || review.rating || 0))}</span>
      <p>${escapeHtml(review.commentText || review.comment || '')}</p>
    </article>
  `).join('') : '<div class="empty">Chưa có đánh giá.</div>';

  byId('submitReviewBtn')?.addEventListener('click', async () => {
    if (!state.currentUser) {
      alert('Hãy đăng nhập trước khi đánh giá.');
      return;
    }
    const commentText = byId('reviewText')?.value.trim();
    if (!commentText) return;
    try {
      await requestJson('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          userId: state.currentUser.id,
          componentId: item.id,
          ratingStar: 5,
          commentText
        })
      });
      byId('reviewText').value = '';
      await loadBackendData();
      renderDetail();
      syncHeader();
    } catch (error) {
      alert(`Không thể gửi đánh giá: ${error.message}`);
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
  const summary = byId('workspaceSummary');
  const result = byId('workspaceResult');
  if (summary) {
    summary.innerHTML = report.components.map((item) => `<div class="stack-item"><strong>${escapeHtml(item.name)}</strong><span>${money(item.lowestPrice)}</span></div>`).join('');
  }
  if (result) {
    if (report.compatible) {
      result.innerHTML = `<div class="notice">Cấu hình phù hợp. Tổng chi phí: <strong>${money(report.totalPrice)}</strong>.</div>`;
    } else {
      result.innerHTML = `<div class="notice">Cần điều chỉnh cấu hình. ${(report.issues || []).map((item) => escapeHtml(item.message || item)).join(' | ')}</div>`;
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
    container.innerHTML = '<div class="empty">Xin chao, toi co the goi y cau hinh va gia linh kien cho ban.</div>';
    return;
  }

  container.innerHTML = lines.map((item) => `
    <div class="chat-line ${item.role}">
      <strong>${item.role === 'assistant' ? 'AI' : 'Ban'}:</strong> ${escapeHtml(item.message)}
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
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
    <button id="assistantFloatToggle" class="assistant-float-toggle" type="button" aria-expanded="false">AI</button>
    <section id="assistantFloatPanel" class="assistant-float-panel" aria-hidden="true">
      <header class="assistant-float-header">
        <strong>Tro ly AI</strong>
        <div class="assistant-float-actions">
          <button id="assistantFloatClear" class="assistant-float-clear" type="button">Clear chat</button>
          <button id="assistantFloatClose" class="assistant-float-close" type="button" aria-label="Dong chat">x</button>
        </div>
      </header>
      <div id="assistantFloatMessages" class="assistant-float-messages"></div>
      <div class="assistant-float-compose">
        <div class="assistant-float-context">
          <label>Nguon phan tich
            <select id="assistantFloatContextMode">
              <option value="workspace">Workspace hien tai</option>
              <option value="build">Build da luu cua toi</option>
            </select>
          </label>
          <label id="assistantFloatBuildWrap" style="display: none;">Chon build
            <select id="assistantFloatBuild"></select>
          </label>
          <div id="assistantFloatBuildPreview" class="assistant-build-preview" style="display: none;"></div>
        </div>
        <textarea id="assistantFloatInput" placeholder="Hoi ve cau hinh, gia, tuong thich..." rows="2"></textarea>
        <button id="assistantFloatSend" class="button primary" type="button">Gui</button>
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
    select.innerHTML = groups[type].map((item) => `<option value="${item.id}">${escapeHtml(item.name)} - ${money(item.lowestPrice)}</option>`).join('');
    const saved = state.workspace[type] || groups[type][0]?.id || '';
    select.value = String(saved);
    state.workspace[type] = Number(select.value || 0);
    select.addEventListener('change', () => {
      state.workspace[type] = Number(select.value || 0);
      saveJSON(STORAGE_KEYS.workspace, state.workspace);
    });
  });

  async function updateWorkspace() {
    const report = await checkWorkspaceCompatibility();
    renderWorkspaceSummary({
      components: workspaceComponentsFromSelection(workspaceSelectionFromUI()),
      compatible: Boolean(report.compatible),
      totalPrice: Number(report.totalPrice || 0),
      issues: report.issues || []
    });
  }

  byId('checkCompatibilityBtn')?.addEventListener('click', updateWorkspace);
  renderWorkspaceSummary({ components: workspaceComponentsFromSelection(workspaceSelectionFromUI()), compatible: true, totalPrice: workspaceComponentsFromSelection(workspaceSelectionFromUI()).reduce((sum, item) => sum + item.lowestPrice, 0), issues: [] });
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
  const userBox = byId('accountUser');
  const buildsBox = byId('savedBuilds');
  const reviewsBox = byId('myReviews');
  const saveBtn = byId('saveWorkspaceBuildBtn');

  if (userBox) {
    userBox.innerHTML = state.currentUser
      ? `<div class="stack-item"><strong>${escapeHtml(state.currentUser.email)}</strong><div>Vai trò: ${escapeHtml(state.currentUser.role)}</div></div>`
      : '<div class="empty">Chọn tài khoản ở trang đăng nhập để lưu cấu hình.</div>';
  }

  const userBuilds = state.currentUser ? await getJson(`/builds/user/${state.currentUser.id}`, []) : [];
  const buildDetailsMap = new Map();
  await Promise.all(userBuilds.map(async (build) => {
    buildDetailsMap.set(Number(build.id), await loadBuildDetails(build.id));
  }));

  if (buildsBox) {
    buildsBox.innerHTML = userBuilds.length ? userBuilds.map((build) => {
      const parts = (buildDetailsMap.get(Number(build.id)) || []).map((detail) => detail.component?.name || detail.component?.baseComponent?.name || '').filter(Boolean);
      return `
        <article class="stack-item">
          <strong>${escapeHtml(build.title || `Build #${build.id}`)}</strong>
          <div>${escapeHtml(parts.join(', ') || 'Chưa có linh kiện')}</div>
          <div>${money(build.totalPrice)}</div>
          <div>${build.compatible ? 'Tương thích' : 'Cần xem lại'}</div>
          <div class="account-item-actions">
            <button class="button ghost account-edit-build-btn" type="button" data-build-id="${build.id}">Sửa build</button>
            <button class="button ghost account-delete-build-btn" type="button" data-build-id="${build.id}">Xóa build</button>
          </div>
        </article>
      `;
    }).join('') : '<div class="empty">Chưa có cấu hình nào được lưu.</div>';

    buildsBox.querySelectorAll('.account-edit-build-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!state.currentUser) return;
        const buildId = Number(button.dataset.buildId || 0);
        const build = userBuilds.find((entry) => Number(entry.id) === buildId);
        if (!build) return;

        const title = prompt('Tên build mới:', build.title || '');
        if (title === null) return;
        const description = prompt('Mô tả build:', build.description || '');
        if (description === null) return;

        try {
          await requestJson(`/builds/${buildId}`, {
            method: 'PUT',
            body: JSON.stringify({
              userId: state.currentUser.id,
              title,
              description,
              totalPrice: build.totalPrice,
              compatible: Boolean(build.compatible)
            })
          });
          await loadBackendData();
          await renderAccount();
          alert('Đã cập nhật build.');
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });

    buildsBox.querySelectorAll('.account-delete-build-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const buildId = Number(button.dataset.buildId || 0);
        if (!buildId) return;
        if (!confirm('Bạn chắc chắn muốn xóa build này?')) return;
        try {
          await requestJson(`/builds/${buildId}`, { method: 'DELETE' });
          await loadBackendData();
          await renderAccount();
          alert('Đã xóa build.');
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });
  }

  if (reviewsBox) {
    const myReviews = state.currentUser
      ? state.reviews.filter((review) => Number(review.user?.id) === Number(state.currentUser.id))
      : [];

    reviewsBox.innerHTML = state.currentUser ? myReviews.map((review) => `
      <article class="stack-item">
        <strong>${escapeHtml(review.component?.name || review.component?.baseComponent?.name || 'Linh kiện')}</strong>
        <div>${'★'.repeat(Number(review.ratingStar || review.rating || 0))}</div>
        <p>${escapeHtml(review.commentText || review.comment || '')}</p>
        <div class="account-item-actions">
          <button class="button ghost account-edit-review-btn" type="button" data-review-id="${review.id}">Sửa review</button>
          <button class="button ghost account-delete-review-btn" type="button" data-review-id="${review.id}">Xóa review</button>
        </div>
      </article>
    `).join('') || '<div class="empty">Bạn chưa có review nào.</div>' : '<div class="empty">Đăng nhập để xem đánh giá của bạn.</div>';

    reviewsBox.querySelectorAll('.account-edit-review-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!state.currentUser) return;
        const reviewId = Number(button.dataset.reviewId || 0);
        const review = myReviews.find((entry) => Number(entry.id) === reviewId);
        if (!review) return;

        const oldRating = Number(review.ratingStar || review.rating || 5);
        const ratingRaw = prompt('Điểm sao (1-5):', String(oldRating));
        if (ratingRaw === null) return;
        const ratingStar = Number(ratingRaw || 0);
        if (!Number.isInteger(ratingStar) || ratingStar < 1 || ratingStar > 5) {
          alert('Điểm sao phải từ 1 đến 5.');
          return;
        }

        const oldComment = review.commentText || review.comment || '';
        const commentText = prompt('Nội dung review:', oldComment);
        if (commentText === null) return;

        const componentId = Number(review.component?.id || review.componentId || 0);
        if (!componentId) {
          alert('Không xác định được linh kiện của review này.');
          return;
        }

        try {
          await requestJson(`/reviews/${reviewId}`, {
            method: 'PUT',
            body: JSON.stringify({
              userId: state.currentUser.id,
              componentId,
              ratingStar,
              commentText
            })
          });
          await loadBackendData();
          await renderAccount();
          alert('Đã cập nhật review.');
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });

    reviewsBox.querySelectorAll('.account-delete-review-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        const reviewId = Number(button.dataset.reviewId || 0);
        if (!reviewId) return;
        if (!confirm('Bạn chắc chắn muốn xóa review này?')) return;
        try {
          await requestJson(`/reviews/${reviewId}`, { method: 'DELETE' });
          await loadBackendData();
          await renderAccount();
          alert('Đã xóa review.');
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });
  }

  saveBtn?.addEventListener('click', async () => {
    if (!state.currentUser) {
      alert('Hãy đăng nhập trước.');
      return;
    }
    try {
      await createBackendBuild(state.workspace);
      await loadBackendData();
      await renderAccount();
      syncHeader();
      alert('Đã lưu cấu hình lên backend.');
    } catch (error) {
      alert(`Không thể lưu cấu hình: ${error.message}`);
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
        <article class="stack-item" style="display: flex; justify-content: space-between; align-items: start; gap: 12px;">
          <div>
            <strong>${escapeHtml(price.sourceName)}</strong>
            <div>Giá: ${money(price.priceValue)}</div>
            <div>Thời gian crawl: ${escapeHtml(formatDateTime(price.crawledAt) || '-')}</div>
          </div>
          <button class="delete-price-btn" data-price-id="${price.id}" style="padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">Xóa</button>
        </article>
      `).join('') || '<div class="empty">Chưa có giá crawl nào.</div>';

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
      <article class="stat-card"><span>Linh kiện</span><strong>${catalogItems().length}</strong></article>
      <article class="stat-card"><span>Người dùng</span><strong>${state.users.length}</strong></article>
      <article class="stat-card"><span>Đánh giá</span><strong>${state.reviews.length}</strong></article>
      <article class="stat-card"><span>Build</span><strong>${state.builds.length}</strong></article>
    `;
  }

  if (buildsList) {
    buildsList.innerHTML = (state.builds || []).map((build) => `
      <article class="stack-item">
        <strong>${escapeHtml(build.buildName || build.name || `Build #${build.id}`)}</strong>
        <div>User: ${escapeHtml(build.user?.email || 'N/A')}</div>
        <div>${(build.buildDetails || []).length} linh kiện</div>
      </article>
    `).join('') || '<div class="empty">Không có build nào.</div>';
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
    usersList.innerHTML = (state.users || []).map((user) => `
      <article class="stack-item" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${escapeHtml(user.email)}</strong>
          <p>Vai trò: ${user.role || 'USER'}</p>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="change-role-btn" data-user-id="${user.id}" style="padding: 5px 10px; background: #1f9d4c; color: white; border: none; border-radius: 4px; cursor: pointer;">Đổi role</button>
          <button class="delete-user-btn" data-user-id="${user.id}" style="padding: 5px 10px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">Xóa</button>
        </div>
      </article>
    `).join('') || '<div class="empty">Không có người dùng.</div>';

    document.querySelectorAll('.change-role-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const userId = Number(btn.dataset.userId);
        const user = state.users.find((u) => u.id === userId);
        if (!user) return;
        const currentRole = String(user.role || 'USER').toUpperCase();
        const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
        try {
          await requestJson(`/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role: newRole })
          });
          await loadBackendData();
          await renderAdmin();
          alert(`Đã đổi vai trò thành ${newRole}.`);
        } catch (error) {
          alert(`Lỗi: ${error.message}`);
        }
      });
    });

    document.querySelectorAll('.delete-user-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const userId = Number(btn.dataset.userId);
        if (!confirm('Bạn chắc chắn muốn xóa người dùng này?')) return;
        try {
          await requestJson(`/users/${userId}`, { method: 'DELETE' });
          await loadBackendData();
          await renderAdmin();
          alert('Đã xóa người dùng.');
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
      // Ẩn tất cả tabs
      document.querySelectorAll('.admin-tab-content').forEach((content) => {
        content.style.display = 'none';
      });
      // Xóa active từ tất cả buttons
      document.querySelectorAll('.admin-tab-btn').forEach((b) => {
        b.classList.remove('active');
        b.style.borderBottomColor = 'transparent';
        b.style.color = '#555';
      });
      // Hiển thị tab được chọn
      const tabContent = byId(`tab-${tabName}`);
      if (tabContent) {
        tabContent.style.display = 'block';
      }
      // Active button được chọn
      btn.classList.add('active');
      btn.style.borderBottomColor = '#1f9d4c';
      btn.style.color = '#1f9d4c';
    });
  });
}

async function renderAuth() {
  const loginBtn = byId('loginBtn');
  const registerBtn = byId('registerBtn');
  const message = byId('authMessage');

  if (message) {
    message.innerHTML = state.users.length
      ? `Có <strong>${state.users.length}</strong> tài khoản trong hệ thống.`
      : 'Chưa tải được danh sách tài khoản từ backend.';
  }

  loginBtn?.addEventListener('click', async () => {
    const email = byId('loginEmail')?.value.trim();
    const password = byId('loginPassword')?.value.trim();
    if (!email || !password) {
      if (message) message.textContent = 'Vui lòng nhập email và mật khẩu.';
      return;
    }

    try {
      const response = await requestJson('/users', { method: 'GET' });
      const users = Array.isArray(response) ? response : [];
      const user = users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        if (message) message.textContent = 'Không tìm thấy tài khoản, hãy đăng ký trước.';
        return;
      }

      persistCurrentUser(user.id);
      syncHeader();
      if (message) message.textContent = `Đã đăng nhập: ${user.email}`;

      const role = String(user.role || 'USER').toUpperCase();
      if (role === 'ADMIN') {
        setTimeout(() => {
          location.href = pageHref('admin');
        }, 500);
      }
    } catch (error) {
      if (message) message.textContent = `Không đăng nhập được: ${error.message}`;
    }
  });

  registerBtn?.addEventListener('click', async () => {
    const email = byId('registerEmail')?.value.trim();
    const password = byId('registerPassword')?.value.trim();
    const passwordConfirm = byId('registerPasswordConfirm')?.value.trim();
    if (!email || !password || !passwordConfirm) {
      if (message) message.textContent = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }
    if (password !== passwordConfirm) {
      if (message) message.textContent = 'Mật khẩu xác nhận không khớp.';
      return;
    }

    try {
      const user = await requestJson('/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          role: 'USER'
        })
      });
      await loadBackendData();
      persistCurrentUser(user.id);
      syncHeader();
      if (message) message.textContent = `Đã tạo và đăng nhập: ${user.email}`;
    } catch (error) {
      if (message) message.textContent = `Không thể tạo tài khoản: ${error.message}`;
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