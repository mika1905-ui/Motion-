/* Mini-Laufzeit für exportierte Design-Seiten (.dc.html → eigenständige Seite).
   Unterstützt {{ pfad }} in Text und Attributen, <sc-for list as>, <sc-if value>,
   onClick/onChange-Handler, value/checked-Bindungen und setState mit DOM-Abgleich. */
(() => {
  const tpl = document.getElementById('dc-template');
  const root = document.getElementById('dc-root');
  let comp = null, queued = false;
  window.DCLogic = class { constructor(props) { this.props = props || {}; this.state = {}; }
    setState(u) { Object.assign(this.state, typeof u === 'function' ? u(this.state) : u); if (!queued) { queued = true; requestAnimationFrame(render); } } };
  const get = (scope, expr) => {
    expr = expr.trim();
    if (expr === 'true') return true; if (expr === 'false') return false;
    return expr.split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
  };
  const ONLY = /^\s*\{\{([^}]*)\}\}\s*$/;
  const interp = (s, scope) => s.replace(/\{\{([^}]*)\}\}/g, (_, e) => { const v = get(scope, e); return v == null || v === false ? '' : String(v); });
  const EVT = { onclick: 'click', onchange: 'change', oninput: 'input' };
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.appendChild(document.createTextNode(interp(node.nodeValue, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = get(scope, (node.getAttribute('list') || '').replace(/[{}]/g, '')) || [];
      const as = node.getAttribute('as');
      list.forEach(item => { const s = Object.assign(Object.create(scope), { [as]: item }); node.childNodes.forEach(c => build(c, s, out)); });
      return;
    }
    if (tag === 'sc-if') {
      if (get(scope, (node.getAttribute('value') || '').replace(/[{}]/g, ''))) node.childNodes.forEach(c => build(c, scope, out));
      return;
    }
    const el = document.createElement(tag);
    el.__h = {};
    for (const a of node.attributes) {
      const n = a.name.toLowerCase();
      if (n.startsWith('hint-')) continue;
      const m = a.value.match(ONLY);
      if (EVT[n] && m) { el.__h[EVT[n]] = get(scope, m[1]); continue; }
      if (n === 'checked' && m) { el.__checked = !!get(scope, m[1]); continue; }
      if (n === 'value' && m) { const v = get(scope, m[1]); el.__value = v == null ? '' : String(v); el.setAttribute('value', el.__value); continue; }
      el.setAttribute(a.name, interp(a.value, scope));
    }
    // range inputs fire continuously
    if (el.__h.change && tag === 'input' && (node.getAttribute('type') || '') === 'range') el.__h.input = el.__h.change;
    node.childNodes.forEach(c => build(c, scope, el));
    out.appendChild(el);
  }
  const dispatch = e => { const f = e.currentTarget.__h && e.currentTarget.__h[e.type]; if (typeof f === 'function') f(e); };
  function bind(el) { ['click', 'change', 'input'].forEach(t => { if (!el.__bound) {} }); if (!el.__bound) { el.__bound = true; ['click', 'change', 'input'].forEach(t => el.addEventListener(t, dispatch)); } }
  function morph(oldN, newN) {
    if (oldN.nodeType !== newN.nodeType || oldN.nodeName !== newN.nodeName) { oldN.replaceWith(newN); prep(newN); return; }
    if (oldN.nodeType === 3) { if (oldN.nodeValue !== newN.nodeValue) oldN.nodeValue = newN.nodeValue; return; }
    for (const a of [...oldN.attributes]) if (!newN.hasAttribute(a.name)) oldN.removeAttribute(a.name);
    for (const a of newN.attributes) if (oldN.getAttribute(a.name) !== a.value) oldN.setAttribute(a.name, a.value);
    oldN.__h = newN.__h; bind(oldN);
    if (newN.__checked !== undefined) oldN.checked = newN.__checked;
    if (newN.__value !== undefined && oldN.value !== newN.__value && document.activeElement !== oldN) oldN.value = newN.__value;
    const oc = [...oldN.childNodes], nc = [...newN.childNodes];
    nc.forEach((c, i) => { if (oc[i]) morph(oc[i], c); else { oldN.appendChild(c); prep(c); } });
    for (let i = nc.length; i < oc.length; i++) oc[i].remove();
  }
  function prep(n) { if (n.nodeType !== 1) return; bind(n); if (n.__checked !== undefined) n.checked = n.__checked; if (n.__value !== undefined) n.value = n.__value; n.querySelectorAll('*').forEach(prep1); }
  function prep1(n) { bind(n); if (n.__checked !== undefined) n.checked = n.__checked; if (n.__value !== undefined) n.value = n.__value; }
  function render() {
    queued = false;
    const vals = comp.renderVals();
    const frag = document.createElement('div');
    tpl.content.childNodes.forEach(c => build(c, vals, frag));
    if (!root.firstChild) { while (frag.firstChild) { const c = frag.firstChild; root.appendChild(c); prep(c); } }
    else morph(root, Object.assign(frag, {}), true);
  }
  // morph() expects same node names: compare container children only
  const _morph = morph;
  morph = function (oldN, newN, isRoot) {
    if (isRoot) { const oc = [...oldN.childNodes], nc = [...newN.childNodes]; nc.forEach((c, i) => { if (oc[i]) _morph(oc[i], c); else { oldN.appendChild(c); prep(c); } }); for (let i = nc.length; i < oc.length; i++) oc[i].remove(); return; }
    return _morph(oldN, newN);
  };
  window.addEventListener('DOMContentLoaded', () => { comp = new window.Component({}); render(); });
})();
