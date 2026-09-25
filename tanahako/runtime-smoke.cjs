const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const attrs = {};
for (const match of html.matchAll(/<[^>]+\sid="([^"]+)"[^>]*>/g)) {
  const tag = match[0];
  attrs[match[1]] = {
    value: (tag.match(/\bvalue="([^"]*)"/) || [])[1] || '',
    checked: /\bchecked\b/.test(tag),
    disabled: /\bdisabled\b/.test(tag),
    className: (tag.match(/\bclass="([^"]*)"/) || [])[1] || ''
  };
}
const elements = new Map();
function makeElement(id, initial = {}) {
  const listeners = {};
  const classes = new Set((initial.className || '').split(/\s+/).filter(Boolean));
  const element = {
    id,
    value: initial.value || '',
    checked: !!initial.checked,
    disabled: !!initial.disabled,
    textContent: '',
    className: initial.className || '',
    dataset: {},
    style: {},
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    classList: {
      toggle(name, on) { on ? classes.add(name) : classes.delete(name); },
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); }
    },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return {left: 0, top: 0, width: 400, height: 240}; },
    click() {
      for (const fn of listeners.click || []) {
        fn({clientX: 240, clientY: 120, preventDefault() {}});
      }
    }
  };
  Object.defineProperty(element, 'innerHTML', {
    get() { return this._html || ''; },
    set(value) {
      this._html = value;
      for (const match of value.matchAll(/id="([^"]+)"/g)) {
        if (!elements.has(match[1])) elements.set(match[1], makeElement(match[1]));
      }
    }
  });
  return element;
}
for (const [id, initial] of Object.entries(attrs)) elements.set(id, makeElement(id, initial));
const document = {
  getElementById(id) { return elements.get(id) || null; },
  querySelectorAll() { return []; },
  createElement() { return makeElement('temporary'); }
};
const context = {
  document,
  window: {alert() {}, prompt() {}},
  navigator: {clipboard: {writeText: async () => {}}},
  URL: {createObjectURL() { return 'blob:test'; }, revokeObjectURL() {}},
  Blob,
  setTimeout() {},
  console
};
const app = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const scenario = `
  $('printerPreset').value = 'p1s';
  $('wall').value = '2';
  $('base').value = '2';
  $('modeDrawer').checked = true;
  $('modeShelf').checked = false;
  render();
  $('drawVertical').click();
  splitDrawerAt('x', .6, .5);
  const beforeMove = calculateDrawer().boxes.map(box => box.w);
  activeDividerId = drawerDividers[0].id;
  moveDrawerDivider(1);
  const afterMove = calculateDrawer().boxes.map(box => box.w);
  if (Math.abs((afterMove[0] - beforeMove[0]) - 1) > .11) throw new Error('The left box did not grow by 1 mm');
  if (Math.abs((afterMove[1] - beforeMove[1]) + 1) > .11) throw new Error('The right box did not shrink by 1 mm');
  $('drawHorizontal').click();
  splitDrawerAt('y', .2, .34);
  undoDrawerLayout();
  resetDrawerLayout();
  if (!$('resultBody').innerHTML.includes('市販品')) throw new Error('Drawer product search is missing');
  $('printerPreset').value = 'none';
  render();
  if (!$('resultBody').innerHTML.includes('プリンター未設定')) throw new Error('No-printer drawer state is missing');
  $('modeDrawer').checked = false;
  $('modeShelf').checked = true;
  render();
  if (!$('resultBody').innerHTML.includes('Webで正確に探す')) throw new Error('Shelf product search is missing');
  if (decodeURIComponent(productUrl(current, 'yahoo')).includes('高さ')) throw new Error('Marketplace query should omit height');
  if (!decodeURIComponent(productUrl(current, 'rakuten')).includes('幅20cm 奥行40cm')) throw new Error('Marketplace query should use rounded centimeters');
  if (!$('resultBody').innerHTML.includes('STLは必要ならそのまま保存')) throw new Error('No-printer shelf state is missing');
  const mesh = buildAsciiStl(current);
  if (!mesh.startsWith('solid tanahako') || !mesh.trimEnd().endsWith('endsolid tanahako') || !mesh.includes('facet normal')) throw new Error('STL generation failed: ' + mesh.length + ' chars');
  console.log(JSON.stringify({
    boxes: drawerCells.length,
    tool: drawerTool,
    summary: $('summary').textContent,
    status: $('status').textContent
  }));
`;
vm.runInNewContext(app + scenario, context);
console.log('runtime smoke: ok');
