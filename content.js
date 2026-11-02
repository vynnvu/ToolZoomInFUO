(() => {
  if (window.__fuoMagnifierV4) return;
  window.__fuoMagnifierV4 = true;
  const defaults = {enabled:true, zoom:2.5, mode:'fixed', region:{x:.02,y:.045,w:.70,h:.40}, panelSize:{w:710,h:275}};
  let s={...defaults}, img=null, selecting=false, start=null, lastKey='', panel, body, cropEl, imageEl, regionEl, zoomBadge;
  const own = el => Boolean(el?.closest?.('[data-fuo-magnifier]'));
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  function store(obj){s={...s,...obj}; chrome.storage.sync.set(obj); refresh(true);}
  function pickImage(){
    const imgs=[...document.images].filter(e=>!own(e)&&e.complete&&e.naturalWidth>150&&e.naturalHeight>80);
    imgs.sort((a,b)=>{const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect(); const score=r=>Math.max(0,Math.min(r.right,innerWidth)-Math.max(0,r.left))*Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(0,r.top));return score(br)-score(ar);});
    return imgs[0]||null;
  }
  function make(tag,cls,parent,text){const e=document.createElement(tag);e.className=cls;e.dataset.fuoMagnifier='';if(text)e.textContent=text;parent.appendChild(e);return e;  }
  function setup(){
    panel=make('div','fuo-fixed-panel',document.documentElement);
    applyPanelSize();
    const header=make('div','fuo-fixed-header',panel);
    const title=make('span','fuo-fixed-title',header,'🔍 Vùng câu hỏi');
    title.title='Kéo thanh tiêu đề để di chuyển khung';
    const controls=make('div','fuo-fixed-controls',header);
    zoomBadge=make('span','fuo-fixed-zoom',controls);
    const close=make('button','fuo-fixed-close',controls,'×');
    close.title='Ẩn khung phóng đại';
    close.setAttribute('aria-label','Ẩn khung phóng đại');
    close.onclick=()=>store({enabled:false});
    body=make('div','fuo-fixed-body',panel);cropEl=make('div','fuo-fixed-crop',body);imageEl=make('img','fuo-fixed-source',cropEl);imageEl.alt='Vùng ảnh được phóng đại';imageEl.draggable=false;
    regionEl=make('div','fuo-selection-rect',document.documentElement);
    const grip=make('div','fuo-resize-grip',panel,'');
    grip.title='Kéo góc này để thay đổi kích thước khung';
    grip.setAttribute('aria-label','Thay đổi kích thước khung');
    let resizing=null;
    grip.addEventListener('pointerdown',e=>{
      e.preventDefault();e.stopPropagation();
      resizing={x:e.clientX,y:e.clientY,w:panel.getBoundingClientRect().width,h:panel.getBoundingClientRect().height};
      grip.setPointerCapture(e.pointerId);
      panel.classList.add('fuo-is-resizing');
    });
    grip.addEventListener('pointermove',e=>{
      if(!resizing)return;
      const w=clamp(resizing.w+e.clientX-resizing.x,280,Math.max(280,innerWidth-panel.getBoundingClientRect().left-8));
      const h=clamp(resizing.h+e.clientY-resizing.y,130,Math.max(130,innerHeight-panel.getBoundingClientRect().top-8));
      panel.style.width=`${w}px`;panel.style.height=`${h}px`;
    });
    function finishResize(){
      if(!resizing)return;
      resizing=null;panel.classList.remove('fuo-is-resizing');
      const dimensions={w:Math.round(panel.getBoundingClientRect().width),h:Math.round(panel.getBoundingClientRect().height)};
      s.panelSize=dimensions;chrome.storage.sync.set({panelSize:dimensions});
    }
    grip.addEventListener('pointerup',finishResize);
    grip.addEventListener('pointercancel',finishResize);
    
    let drag=null;
    header.addEventListener('pointerdown',e=>{if(e.target===close)return;drag={x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};header.setPointerCapture(e.pointerId);});
    header.addEventListener('pointermove',e=>{if(!drag)return;panel.style.left=`${clamp(drag.left+e.clientX-drag.x,0,innerWidth-120)}px`;panel.style.top=`${clamp(drag.top+e.clientY-drag.y,0,innerHeight-70)}px`;panel.dataset.moved='1';});
    header.addEventListener('pointerup',()=>drag=null);
    refresh(true);
  }
  function applyPanelSize(){if(!panel)return;const d=s.panelSize||defaults.panelSize;panel.style.width=`${clamp(d.w,280,Math.max(280,innerWidth-16))}px`;panel.style.height=`${clamp(d.h,130,Math.max(130,innerHeight-16))}px`;}
  function beginSelection(){ selecting=true;start=null;store({enabled:true,mode:'fixed'});document.body.style.cursor='crosshair'; }
  function rectFor(im){const r=im.getBoundingClientRect(), fit=getComputedStyle(im).objectFit;let w=r.width,h=r.height,x=r.left,y=r.top;
    if(['contain','scale-down'].includes(fit)){const ratio=im.naturalWidth/im.naturalHeight;if(w/h>ratio){w=h*ratio;x+=(r.width-w)/2;}else{h=w/ratio;y+=(r.height-h)/2;}if(fit==='scale-down'&&w>im.naturalWidth){w=im.naturalWidth;h=im.naturalHeight;x=r.left+(r.width-w)/2;y=r.top+(r.height-h)/2;}}
    return{x,y,w,h};
  }
  function refresh(force=false){
    if(!panel)return;const next=pickImage();    if(!s.enabled||!next){panel.style.display='none';regionEl.style.display='none';return;}
    img=next;const r=rectFor(img);if(r.w<100||r.h<70)return;
    const key=(img.currentSrc||img.src)+'|'+r.x+'|'+r.y+'|'+r.w+'|'+r.h+'|'+JSON.stringify(s.region)+'|'+s.zoom+'|'+s.mode;
    if(!force&&key===lastKey)return;lastKey=key;
    panel.style.display='block';
    zoomBadge.textContent=`${Number(s.zoom).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1})}×`;
    const a=s.region;
    regionEl.style.display=s.mode==='fixed'?'block':'none';
    regionEl.style.left=`${r.x+a.x*r.w}px`;regionEl.style.top=`${r.y+a.y*r.h}px`;
    regionEl.style.width=`${a.w*r.w}px`;regionEl.style.height=`${a.h*r.h}px`;
    if(!panel.dataset.moved){panel.style.left=`${clamp(r.x+r.w-panel.offsetWidth-20,8,Math.max(8,innerWidth-panel.offsetWidth-8))}px`;panel.style.top=`${clamp(r.y+r.h-panel.offsetHeight-25,8,Math.max(8,innerHeight-panel.offsetHeight-8))}px`;}
    imageEl.src=img.currentSrc||img.src;
    imageEl.style.width=`${r.w*s.zoom}px`;imageEl.style.height=`${r.h*s.zoom}px`;
    imageEl.style.left=`${-a.x*r.w*s.zoom}px`;imageEl.style.top=`${-a.y*r.h*s.zoom}px`;
    cropEl.style.width=`${a.w*r.w*s.zoom}px`;
    cropEl.style.height=`${a.h*r.h*s.zoom}px`;
    body.scrollLeft=0;body.scrollTop=0;
  }
  document.addEventListener('pointerdown',e=>{
    if(!selecting||own(e.target))return;const target=pickImage();if(!target)return;const r=rectFor(target);
    if(e.clientX<r.x||e.clientX>r.x+r.w||e.clientY<r.y||e.clientY>r.y+r.h)return;
    e.preventDefault();e.stopPropagation();start={x:clamp((e.clientX-r.x)/r.w,0,1),y:clamp((e.clientY-r.y)/r.h,0,1),r};
  },true);
  document.addEventListener('pointermove',e=>{
    if(selecting&&start){e.preventDefault();const x=clamp((e.clientX-start.r.x)/start.r.w,0,1),y=clamp((e.clientY-start.r.y)/start.r.h,0,1);
      const a={x:Math.min(start.x,x),y:Math.min(start.y,y),w:Math.abs(start.x-x),h:Math.abs(start.y-y)};
      s.region=a;refresh(true);return;}
    if(s.enabled&&s.mode==='follow'&&img&&!own(e.target)){
      const r=rectFor(img);if(e.clientX>=r.x&&e.clientX<=r.x+r.w&&e.clientY>=r.y&&e.clientY<=r.y+r.h){
        s.region={...s.region,x:clamp((e.clientX-r.x)/r.w-s.region.w/2,0,1-s.region.w),y:clamp((e.clientY-r.y)/r.h-s.region.h/2,0,1-s.region.h)};refresh(true);
      }
    }
  },true);
  document.addEventListener('pointerup',()=>{if(!selecting||!start)return;selecting=false;start=null;document.body.style.cursor='';
    if(s.region.w<.025||s.region.h<.025)s.region=defaults.region;store({region:s.region});},true);
  document.addEventListener('keydown',e=>{if(e.altKey&&e.key.toLowerCase()==='m'){e.preventDefault();store({enabled:!s.enabled});}if(e.key==='Escape'&&selecting){selecting=false;start=null;document.body.style.cursor='';}},true);
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(message?.fuoMagnifierAction==='select'){beginSelection();reply({ok:true});}});
  chrome.storage.sync.get(defaults,value=>{s={...defaults,...value};setup();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='sync')return;for(const [k,v]of Object.entries(changes))s[k]=v.newValue;if(changes.panelSize)applyPanelSize();refresh(true);});
  new MutationObserver(()=>refresh()).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset','style','class']});
  window.addEventListener('resize',()=>{if(panel){applyPanelSize();panel.dataset.moved='';}refresh(true);});
  document.addEventListener('scroll',()=>refresh(true),{passive:true,capture:true});
  setInterval(()=>refresh(),800);
})();
