/* COLOR.M 제품 디자인 메이커 — 정확한 컬러 지정 (메인 · 서브 · 포인트)
 * - 컬러피커 + HEX + 색 이름
 * - 제품 분야에 맞는 추천 컬러 (누르면 메인 컬러로 적용)
 * - 메인 컬러 기준 배색 추천 (톤온톤 · 유사색 · 보색 · 3색, 누르면 서브·포인트 적용 + 배색 방식 칩 자동 선택)
 * index.html의 buildColorClauseKo/En 에서 paletteClause()로 프롬프트에 HEX 값을 넣는다.
 */
(function () {
  const pal = { main: { hex: '', name: '' }, sub: { hex: '', name: '' }, point: { hex: '', name: '' } };
  const ROLE = { main: ['메인', 'main'], sub: ['서브', 'secondary'], point: ['포인트', 'accent'] };
  const validHex = (h) => /^#[0-9a-f]{6}$/i.test(h || '');
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- 색 계산 ---------- */
  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
    const max = Math.max(r, g, b); const min = Math.min(r, g, b);
    let h = 0; let s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0); else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s: s * 100, l: l * 100 };
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return '#' + [f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function colorName(hex) {
    const { h, s, l } = hexToHsl(hex);
    let base;
    if (s < 10) base = l > 85 ? 'White' : l < 20 ? 'Black' : 'Gray';
    else if (l < 45 && h >= 15 && h < 50 && s < 70) base = 'Brown';
    else if (h < 12 || h >= 345) base = 'Red';
    else if (h < 40) base = 'Orange';
    else if (h < 65) base = 'Yellow';
    else if (h < 165) base = 'Green';
    else if (h < 205) base = 'Sky Blue';
    else if (h < 235) base = l < 35 ? 'Navy' : 'Blue';
    else if (h < 300) base = 'Purple';
    else base = 'Pink';
    if (s >= 10 && l > 80) return `Light ${base}`;
    if (s >= 10 && l < 30 && base !== 'Navy') return `Deep ${base}`;
    return base;
  }
  const HARMONIES = [
    { key: 'mono', ko: '톤온톤', desc: '같은 색의 밝기 차이 — 통일감', scheme: '톤온톤' },
    { key: 'analog', ko: '유사색', desc: '이웃한 색 — 자연스러움', scheme: '유사색 배색' },
    { key: 'comp', ko: '보색 대비', desc: '반대 색 — 포인트가 눈에 띔', scheme: '보색·대비 배색' },
    { key: 'triad', ko: '3색 배색', desc: '120° 간격 — 활기참', scheme: '3색 배색' },
  ];
  function harmony(mainHex, key) {
    const { h, s, l } = hexToHsl(mainHex);
    const ss = Math.max(s, 40);
    switch (key) {
      case 'mono': return { sub: hslToHex(h, ss * 0.45, 90), point: hslToHex(h, ss, Math.max(22, l - 25)) };
      case 'analog': return { sub: hslToHex(h + 30, ss * 0.55, 88), point: hslToHex(h - 35, ss, 52) };
      case 'comp': return { sub: hslToHex(h, ss * 0.3, 93), point: hslToHex(h + 180, Math.max(ss, 65), 52) };
      default: return { sub: hslToHex(h + 120, ss * 0.5, 87), point: hslToHex(h + 240, Math.max(ss, 65), 55) };
    }
  }

  /* ---------- 제품 분야별 추천 컬러 ---------- */
  const ADVICE = {
    '생활·가전': { why: '집 안 어디에 두어도 어울리는 밝고 차분한 색', c: [['#F4F2EE', '오프화이트', 'Off White'], ['#B9B2A6', '웜그레이', 'Warm Gray'], ['#9DB4A0', '세이지 그린', 'Sage Green']] },
    'IT·스마트': { why: '기술적이고 정돈된 인상의 무채색 + 선명한 포인트', c: [['#2E3138', '차콜', 'Charcoal'], ['#C9CDD2', '실버', 'Silver'], ['#2F6BFF', '일렉트릭 블루', 'Electric Blue']] },
    '가구·공간': { why: '공간에 녹아드는 자연 소재 톤', c: [['#C49A6C', '오크', 'Oak'], ['#EFEAE2', '린넨', 'Linen'], ['#7A8450', '올리브', 'Olive']] },
    '헬스·뷰티': { why: '깨끗하고 부드러운 인상의 저채도 파스텔', c: [['#E8B4B8', '더스티 로즈', 'Dusty Rose'], ['#F6F0E6', '아이보리', 'Ivory'], ['#A8D8C8', '민트', 'Mint']] },
    '모빌리티': { why: '속도감 있는 그래파이트 + 눈에 띄는 시그널 컬러', c: [['#3A3F47', '그래파이트', 'Graphite'], ['#FF6B2C', '시그널 오렌지', 'Signal Orange'], ['#C9CDD2', '실버', 'Silver']] },
    '키즈·시니어': { why: '알아보기 쉬운 밝고 대비가 분명한 색', c: [['#FFD966', '버터 옐로', 'Butter Yellow'], ['#8EC9F0', '스카이 블루', 'Sky Blue'], ['#FF8A7A', '코랄', 'Coral']] },
    '반려동물': { why: '따뜻하고 편안한 자연 톤', c: [['#E3CBA8', '웜 베이지', 'Warm Beige'], ['#C8714F', '테라코타', 'Terracotta'], ['#9DB4A0', '세이지 그린', 'Sage Green']] },
    '스포츠·아웃도어': { why: '자연 속에서 어울리고 위급할 때 눈에 띄는 색', c: [['#6B7445', '올리브', 'Olive'], ['#D8C3A5', '샌드', 'Sand'], ['#FF7A1A', '세이프티 오렌지', 'Safety Orange']] },
    '산업·공공': { why: '안전과 식별성이 중요한 고대비 색', c: [['#F5C400', '세이프티 옐로', 'Safety Yellow'], ['#3C3C3C', '다크 그레이', 'Dark Gray'], ['#1F5FAF', '퍼블릭 블루', 'Public Blue']] },
  };
  const PRESETS = [
    { name: '미니멀', c: [['#F4F2EE', 'Off White'], ['#C9CDD2', 'Silver'], ['#2E3138', 'Charcoal']] },
    { name: '내추럴', c: [['#C49A6C', 'Oak'], ['#EFEAE2', 'Linen'], ['#7A8450', 'Olive']] },
    { name: '파스텔', c: [['#A8D8C8', 'Mint'], ['#F6F0E6', 'Ivory'], ['#E8B4B8', 'Dusty Rose']] },
    { name: '테크', c: [['#2E3138', 'Charcoal'], ['#E6E8EB', 'Light Gray'], ['#2F6BFF', 'Electric Blue']] },
    { name: '아웃도어', c: [['#6B7445', 'Olive'], ['#D8C3A5', 'Sand'], ['#FF7A1A', 'Safety Orange']] },
  ];

  function category() {
    const on = document.querySelector('#category .c.on');
    return on ? on.textContent.trim() : '';
  }

  /* ---------- 렌더링 ---------- */
  function render() {
    const box = document.getElementById('paletteBox');
    if (!box) return;
    const cat = category();
    const adv = ADVICE[cat];
    const main = validHex(pal.main.hex) ? pal.main.hex : '';
    const rows = ['main', 'sub', 'point'].map((k) => {
      const c = pal[k];
      return `<div class="pal-row">
        <span class="pal-role">${ROLE[k][0]}</span>
        <input type="color" data-pal="pick" data-k="${k}" value="${validHex(c.hex) ? c.hex.toLowerCase() : '#ffffff'}" aria-label="${ROLE[k][0]} 컬러 선택">
        <input type="text" class="pal-hex" data-pal="hex" data-k="${k}" value="${esc(c.hex)}" placeholder="#HEX" maxlength="7" aria-label="${ROLE[k][0]} HEX">
        <input type="text" data-pal="name" data-k="${k}" value="${esc(c.name)}" placeholder="색 이름 (예: Sage Green)" aria-label="${ROLE[k][0]} 색 이름">
        ${c.hex ? `<button type="button" class="pal-x" data-pal="clear" data-k="${k}" title="지우기">✕</button>` : '<span></span>'}
      </div>`;
    }).join('');
    box.innerHTML = `
      <label>EXACT COLOR | 정확한 컬러 지정 <span class="pal-opt">선택</span></label>
      <p class="hint" style="margin-top:-4px">메인·서브·포인트를 HEX 값으로 정하면 프롬프트에 정확한 색이 들어가요. 위의 색 이름·톤 선택과 함께 쓸 수 있어요.</p>
      <div class="pal-advice">
        <b>✨ ${adv ? `${esc(cat)} 제품에 어울리는 컬러` : '추천 컬러'}</b>
        ${adv
          ? `<span class="hint">${esc(adv.why)} — 누르면 메인 컬러로 적용</span>
             <div class="pal-adv-list">${adv.c.map(([h, n, en]) => `<button type="button" class="pal-adv" data-pal="advice" data-hex="${h}" data-name="${esc(en || n)}"><i style="background:${h}"></i>${esc(n)}</button>`).join('')}</div>`
          : '<span class="hint">STEP 01에서 제품 분야를 고르면 그 분야에 어울리는 컬러를 추천해 드려요.</span>'}
      </div>
      <div class="pal-rows">${rows}</div>
      <div class="pal-sub-label"><b>🎨 배색 추천</b> <span class="hint">${main ? '메인 컬러 기준 · 누르면 서브·포인트 적용 (배색 방식도 자동 선택)' : '메인 컬러를 정하면 배색 방식별 조합을 계산해 드려요.'}</span></div>
      ${main ? `<div class="pal-harm">${HARMONIES.map((h) => {
        const p = harmony(main, h.key);
        return `<button type="button" class="pal-hcard" data-pal="harmony" data-k="${h.key}">
          <span class="pal-bar"><i style="background:${main}"></i><i style="background:${p.sub}"></i><i style="background:${p.point}"></i></span>
          <b>${h.ko}</b><small>${h.desc}</small></button>`;
      }).join('')}</div>` : ''}
      <div class="pal-presets"><span class="hint">팔레트 프리셋</span>${PRESETS.map((p, i) => `<button type="button" class="pal-preset" data-pal="preset" data-i="${i}">${p.c.map((x) => `<i style="background:${x[0]}"></i>`).join('')}<span>${p.name}</span></button>`).join('')}</div>`;
  }

  /* 배색 방식 칩(기존 UI)도 함께 선택 */
  function selectScheme(name) {
    const wrap = document.getElementById('scheme');
    if (!wrap) return;
    [...wrap.children].forEach((b) => b.classList.toggle('on', b.textContent.trim() === name));
  }

  function set(k, hex, name) { pal[k] = { hex: hex.toUpperCase(), name: name || colorName(hex) }; }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-pal]');
    if (el) {
      const act = el.dataset.pal;
      const k = el.dataset.k;
      if (act === 'advice') set('main', el.dataset.hex, el.dataset.name);
      else if (act === 'clear') pal[k] = { hex: '', name: '' };
      else if (act === 'preset') { const p = PRESETS[+el.dataset.i]; ['main', 'sub', 'point'].forEach((r, i) => set(r, p.c[i][0], p.c[i][1])); }
      else if (act === 'harmony') {
        const h = HARMONIES.find((x) => x.key === k);
        const p = harmony(pal.main.hex, k);
        set('sub', p.sub); set('point', p.point);
        selectScheme(h.scheme);
      } else return;
      render();
      if (typeof window.autosave === 'function') window.autosave(); // 기존 자동 저장에 포함
      return;
    }
    /* 제품 분야를 바꾸면 추천 컬러도 바뀜 */
    if (e.target.closest('#category')) setTimeout(render, 0);
  });
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.pal) return;
    const k = el.dataset.k;
    if (el.dataset.pal === 'pick') {
      pal[k].hex = el.value.toUpperCase();
      if (!pal[k].name) pal[k].name = colorName(el.value);
      const hex = document.querySelector(`[data-pal="hex"][data-k="${k}"]`);
      if (hex) hex.value = pal[k].hex;
    } else if (el.dataset.pal === 'hex') {
      let v = el.value.trim();
      if (v && v[0] !== '#') v = '#' + v;
      pal[k].hex = v.toUpperCase();
      if (validHex(v)) { const pick = document.querySelector(`[data-pal="pick"][data-k="${k}"]`); if (pick) pick.value = v.toLowerCase(); }
    } else if (el.dataset.pal === 'name') pal[k].name = el.value;
    /* main의 자동 저장이 이 핸들러보다 먼저 실행되므로, 바뀐 값으로 한 번 더 저장 */
    if (typeof window.autosave === 'function') window.autosave();
  });
  document.addEventListener('change', (e) => {
    /* 컬러피커·HEX 입력을 마치면 배색 추천 갱신 */
    if (e.target.dataset && (e.target.dataset.pal === 'pick' || e.target.dataset.pal === 'hex')) {
      const k = e.target.dataset.k;
      if (validHex(pal[k].hex) && !pal[k].name) pal[k].name = colorName(pal[k].hex);
      render();
      if (typeof window.autosave === 'function') window.autosave();
    }
  });

  /* ---------- index.html에서 쓰는 함수 ---------- */
  window.paletteClause = function (lang) {
    const list = ['main', 'sub', 'point'].filter((k) => validHex(pal[k].hex));
    if (!list.length) return '';
    const parts = list.map((k) => `${ROLE[k][lang === 'ko' ? 0 : 1]} ${pal[k].hex}${pal[k].name ? ` (${pal[k].name})` : ''}`);
    return lang === 'ko' ? `정확한 컬러: ${parts.join(', ')}` : `exact colors — ${parts.join(', ')}`;
  };
  window.palGet = () => JSON.parse(JSON.stringify(pal));
  window.palSet = (d) => {
    ['main', 'sub', 'point'].forEach((k) => { pal[k] = d && d[k] ? { hex: d[k].hex || '', name: d[k].name || '' } : { hex: '', name: '' }; });
    render();
  };

  /* ---------- 스타일 (제품 메이커 디자인에 맞춤) ---------- */
  const css = `
  #paletteBox{margin-top:6px;padding-top:4px}
  .pal-opt{font-size:11px;font-weight:bold;color:var(--a);background:#ffe6f1;border-radius:10px;padding:1px 8px;margin-left:4px}
  .pal-advice{background:#fff8fb;border:1px dashed #f3b7d1;border-radius:12px;padding:11px 13px;margin:8px 0 10px;display:flex;flex-direction:column;gap:6px}
  .pal-advice b{font-size:13px}
  .pal-adv-list{display:flex;flex-wrap:wrap;gap:6px}
  .pal-adv,.pal-preset,.pal-hcard{font:inherit;cursor:pointer;background:white;border:1px solid var(--l);border-radius:20px;transition:border-color .15s,background .15s}
  .pal-adv{display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 6px;font-size:12.5px}
  .pal-adv i{width:18px;height:18px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.08)}
  .pal-preset i{width:24px;height:24px;border-radius:50%;display:inline-block;border:1px solid rgba(0,0,0,.08)}
  .pal-adv:hover,.pal-preset:hover,.pal-hcard:hover{border-color:var(--a);background:#fff5fa}
  .pal-rows{display:flex;flex-direction:column;gap:7px}
  .pal-row{display:grid;grid-template-columns:52px 44px 96px minmax(0,1fr) 28px;gap:7px;align-items:center}
  .pal-role{font-size:13px;font-weight:bold}
  .pal-row input[type=color]{width:44px;height:40px;padding:3px;border:1px solid #e3ddd0;border-radius:9px;background:white;cursor:pointer}
  .pal-hex{font-family:Consolas,monospace;text-transform:uppercase}
  .pal-x{border:0;background:none;color:var(--m);cursor:pointer;font-size:14px}
  .pal-x:hover{color:var(--a)}
  .pal-sub-label{margin:13px 0 6px;font-size:13px}
  .pal-harm{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:7px}
  .pal-hcard{border-radius:12px;padding:9px;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left}
  .pal-hcard b{font-size:13px}.pal-hcard small{font-size:11.5px;color:var(--m)}
  .pal-bar{display:flex;width:100%;height:22px;border-radius:7px;overflow:hidden;border:1px solid rgba(0,0,0,.06)}
  .pal-bar i{flex:1}.pal-bar i:first-child{flex:1.6}
  .pal-presets{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:12px;width:100%}
  .pal-preset{display:inline-flex;align-items:center;padding:8px 16px 8px 8px;font-size:13.5px;flex:1 1 auto;justify-content:center}
  .pal-preset i{margin-right:-6px;border:2px solid white}
  .pal-preset span{margin-left:11px;white-space:nowrap}
  @media(max-width:600px){.pal-row{grid-template-columns:44px 40px 1fr 24px}.pal-row input[data-pal=name]{grid-column:2/-1;grid-row:2}}`;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render); else render();
})();
