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
    addEventListener(type, fn, capture) { const list=(listeners[type] ||= []); capture ? list.unshift(fn) : list.push(fn); },
    classList: {
      toggle(name, on) { on ? classes.add(name) : classes.delete(name); },
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); }
    },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return {left: 0, top: 0, width: 400, height: 240}; },
    dispatchEvent(event) { event.preventDefault ||= () => {}; event.stopImmediatePropagation = () => {event.stopped=true;}; for (const fn of listeners[event.type] || []) {if(event.stopped)break;fn(event);} },
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
  $('printerPreset').value = 'a1mini';
  $('printerPreset').dispatchEvent({type:'change'});
  if (['bedW','bedD','bedH'].some(id => Number($(id).value) !== 180)) throw new Error('A1 mini dimensions failed');
  if (!findBedPlacement(180,180,180,180,180,180)) throw new Error('A1 mini boundary should fit');
  if (findBedPlacement(181,100,50,180,180,180)) throw new Error('Oversized A1 mini box should fail');
  $('printerPreset').value = 'p1s';
  $('printerPreset').dispatchEvent({type:'change'});
  if (['bedW','bedD','bedH'].some(id => Number($(id).value) !== 256)) throw new Error('P1S dimensions failed');
  $('wall').value = '2';
  $('base').value = '2';
  $('modeDrawer').checked = true;
  $('modeShelf').checked = false;
  render();
  $('drawVertical').click();
  if (drawerTool !== 'x') throw new Error('Vertical drawing mode did not start');
  $('selectEqual').click();
  if (drawerTool !== 'equal') throw new Error('Equal division did not cancel line drawing mode');
  $('drawVertical').click();
  if (drawerTool !== 'x') throw new Error('Line drawing did not cancel equal division mode');
  splitDrawerAt('x', .6, .5);
  const beforeMove = calculateDrawer().boxes.map(box => box.w);
  activeDividerId = drawerDividers[0].id;
  moveDrawerDivider(1);
  const afterMove = calculateDrawer().boxes.map(box => box.w);
  if (Math.abs((afterMove[0] - beforeMove[0]) - 1) > .11) throw new Error('The left box did not grow by 1 mm');
  if (Math.abs((afterMove[1] - beforeMove[1]) + 1) > .11) throw new Error('The right box did not shrink by 1 mm');
  $('dividerMoveAmount').value='5';
  $('dividerMoveAmount').dispatchEvent({type:'input'});
  const beforeNumeric=drawerDividers[0].pos;
  $('moveForward').click();
  const usable=value('drawerW')-2*value('edge');
  if(Math.abs((drawerDividers[0].pos-beforeNumeric)*usable-5)>1e-7)throw new Error('Numeric movement failed');
  const historyBeforeDrag=drawerHistory.length,positionBeforeDrag=drawerDividers[0].pos,cellCount=drawerCells.length;
  const target={closest(){return {dataset:{divider:String(drawerDividers[0].id)}}}};
  $('drawVertical').click();
  $('drawerEditor').dispatchEvent({type:'pointerdown',clientX:200,clientY:100,pointerId:1,target});
  if(drawerTool!==null)throw new Error('Dragging existing line must cancel drawing');
  $('drawerEditor').dispatchEvent({type:'pointermove',clientX:220,clientY:100});
  $('drawerEditor').dispatchEvent({type:'pointermove',clientX:240,clientY:100});
  $('drawerEditor').dispatchEvent({type:'pointerup',clientX:240,clientY:100});
  $('drawerEditor').dispatchEvent({type:'click',clientX:240,clientY:100});
  if(drawerCells.length!==cellCount)throw new Error('Drag added new divider');
  if(Math.abs(drawerDividers[0].pos-positionBeforeDrag-.1)>1e-7)throw new Error('Drag position incorrect');
  if(drawerHistory.length!==historyBeforeDrag+1)throw new Error('Drag must be one undo action');
  undoDrawerLayout();
  if(Math.abs(drawerDividers[0].pos-positionBeforeDrag)>1e-7)throw new Error('Drag undo failed');
  $('dividerMoveAmount').value='';
  $('dividerMoveAmount').dispatchEvent({type:'input'});
  if(!$('moveForward').disabled)throw new Error('Empty movement must disable buttons');
  const validPosition=drawerDividers[0].pos;
  moveDrawerDivider(10000);
  if(drawerDividers[0].pos!==validPosition)throw new Error('Out-of-bounds move changed layout');
  $('dividerMoveAmount').value='1';
  $('drawHorizontal').click();
  splitDrawerAt('y', .2, .34);
  undoDrawerLayout();
  resetDrawerLayout();
  activeCellId = drawerCells[0].id;
  $('equalCount').value = '4';
  divideSelectedCell('x');
  if (drawerCells.length !== 4 || drawerDividers.length !== 3) throw new Error('Four-way equal split failed');
  if (drawerTool !== 'equal') throw new Error('Equal division mode did not remain active');
  if (drawerCells.some(cell => Math.abs(cell.w - .25) > 1e-8)) throw new Error('Four-way split is not equal');
  activeCellId = drawerCells[1].id;
  $('equalCount').value = '3';
  divideSelectedCell('y');
  if (drawerCells.length !== 6 || drawerDividers.length !== 5) throw new Error('Selected-cell equal split failed');
  const nested = drawerCells.filter(cell => Math.abs(cell.x - .25) < 1e-8);
  if (nested.length !== 3 || nested.some(cell => Math.abs(cell.h - 1/3) > 1e-8)) throw new Error('Nested split is not equal');
  undoDrawerLayout();
  if (drawerCells.length !== 4) throw new Error('Undo after equal split failed');
  resetDrawerLayout();
  activeCellId=drawerCells[0].id;
  $('equalCount').value='3';divideSelectedCell('x');
  activeDividerId=drawerDividers[0].id;render();
  if($('deleteDivider').disabled)throw new Error('Delete must be enabled for selected line');
  const beforeDelete=drawerSnapshot();
  $('deleteDivider').click();
  if(drawerCells.length!==2||drawerDividers.length!==1)throw new Error('Delete failed to merge boxes');
  if(Math.abs(drawerCells.reduce((sum,c)=>sum+c.w*c.h,0)-1)>1e-8)throw new Error('Delete lost drawer area');
  undoDrawerLayout();
  if(JSON.stringify(drawerCells)!==JSON.stringify(beforeDelete.cells)||drawerDividers.length!==2)throw new Error('Delete undo failed');
  resetDrawerLayout();
  splitDrawerAt('x',.5,.5);
  const parentDivider=drawerDividers[0].id;
  splitDrawerAt('y',.2,.5);
  activeDividerId=parentDivider;deleteDrawerDivider();
  if(drawerCells.length!==3)throw new Error('T-junction deletion must preserve rectangular boxes');
  activeDividerId=drawerDividers[1].id;deleteDrawerDivider();
  activeDividerId=parentDivider;deleteDrawerDivider();
  if(drawerCells.length!==1||drawerDividers.length!==0)throw new Error('Nested deletion failed');
  if(!$('deleteDivider').disabled)throw new Error('Delete should be disabled without a selection');
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
