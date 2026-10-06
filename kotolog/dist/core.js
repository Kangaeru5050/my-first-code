(function(root){
function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function parseNote(text,today=localDate()){
const s=text.normalize('NFKC');const w=s.match(/(?:体重(?:は|が|[:：])?\s*|今朝(?:は|の体重は)?\s*|^\s*)(\d{1,3}(?:\.\d+)?)\s*(?:キロ(?:グラム)?|kg)/i);const h=s.match(/(\d{1,2}(?:\.\d+)?)\s*時間(?:半)?\s*(?:眠|寝|睡眠)/);const reverse=s.match(/(?:睡眠|眠った|寝た)(?:は|が|[:：])?\s*(\d{1,2}(?:\.\d+)?)\s*時間(?:半)?/);
const d=new Date(today+'T12:00:00');if(/一昨日|おととい/.test(s))d.setDate(d.getDate()-2);else if(/昨日/.test(s))d.setDate(d.getDate()-1);
const sleep=h||reverse;return {date:localDate(d),weight:w&&Number(w[1])>0&&Number(w[1])<=500?Number(w[1]):'',sleep:sleep&&Number(sleep[1])<=24?Number(sleep[1])+(/時間半/.test(sleep[0])?.5:0):'',kind:/朝食|朝ご[は飯]ん/.test(s)?'朝食':/昼食|昼ご[は飯]ん/.test(s)?'昼食':/夕食|晩ご[は飯]ん|夕ご[は飯]ん/.test(s)?'夕食':/間食|おやつ/.test(s)?'間食':'日々の記録',feeling:/だるさはなし|体調はいい|体調は良い|元気/.test(s)?'よい':'',easy:'',note:text};}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function validRecord(r){return r&&typeof r.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&typeof r.note==='string'&&['日々の記録','朝食','昼食','夕食','間食'].includes(r.kind)&&(!r.photo||/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(r.photo))&&(r.weight===''||(typeof r.weight==='number'&&r.weight>0&&r.weight<=500))&&(r.sleep===''||(typeof r.sleep==='number'&&r.sleep>=0&&r.sleep<=24));}
root.KotoCore={localDate,parseNote,escapeHTML,validRecord};if(typeof module!=='undefined')module.exports=root.KotoCore;
})(typeof window!=='undefined'?window:globalThis);
