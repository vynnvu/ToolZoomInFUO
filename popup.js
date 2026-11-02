const status = document.getElementById('status');
const zoom = document.getElementById('zoom');
const zoomText = document.getElementById('zoomText');
const formatZoom = value => `${Number(value).toLocaleString('vi-VN', {minimumFractionDigits:1,maximumFractionDigits:1})}×`;

chrome.storage.sync.get({enabled:true,zoom:2.5,mode:'fixed'},v=>{
  for(const key of ['enabled','zoom','mode']) {
    const el=document.getElementById(key);
    el[el.type==='checkbox'?'checked':'value']=v[key];
    el.addEventListener('change',()=>chrome.storage.sync.set({[key]:el.type==='checkbox'?el.checked:key==='zoom'?Number(el.value):el.value}));
  }
  zoomText.textContent=formatZoom(v.zoom);
});

zoom.addEventListener('input',e=>{
  zoomText.textContent=formatZoom(e.target.value);
});

async function send(action){
  try {
    const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    if(!tab?.id || !/^https:\/\/(?:[^/]+\.)?fuoverflow\.com\//.test(tab.url||'')) {status.textContent='Hãy mở tab fuoverflow.com trước.';return;}
    const result=await chrome.tabs.sendMessage(tab.id,{fuoMagnifierAction:action});
    if(!result?.ok) throw new Error('Không nhận được phản hồi');
    window.close();
  } catch (e) { status.textContent='Chưa kết nối được với trang. Nhấn F5 để tải lại trang rồi thử lại.'; }
}
document.getElementById('selectRegion').onclick=()=>send('select');
