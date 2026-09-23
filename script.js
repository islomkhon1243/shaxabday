(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const boot = $('#boot');
  const bootLog = $('#bootLog');
  const enterBtn = $('#enterBtn');
  const hero = $('#hero');
  const heroScene = $('#heroScene');
  const heroVideo = $('#heroVideo');
  const heroCanvas = $('#heroCanvas');
  const target = $('#target');
  const cursorStatus = $('#cursorStatus');
  const music = $('#bgMusic');
  const musicBtn = $('#musicBtn');
  const musicLabel = $('#musicLabel');
  const modeSwitch = $('#modeSwitch');
  const modeLabel = $('#modeLabel');

  const bootLines = [
    ['Loading personality', 'OK'],
    ['Loading anime database', 'OK'],
    ['Loading spicy-food resistance', '92%'],
    ['Loading Kaspi employee mode', 'OK'],
    ['Checking headphone quality', 'CRITICAL'],
    ['Loading social protocol from 2019', 'NO'],
  ];

  let line = 0;
  const bootTimer = setInterval(() => {
    if (line >= bootLines.length) return clearInterval(bootTimer);
    const p = document.createElement('p');
    const [label, state] = bootLines[line++];
    p.innerHTML = `&gt; ${label.padEnd(38,'.')} <b>${state}</b>`;
    bootLog.appendChild(p);
  }, 220);

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover:hover) and (pointer:fine)');
  const header = $('.topbar');
  const main = $('main');
  const soundEntry = $('#enterSoundBtn');
  let entered = false;
  let heroVisible = true;
  let started = false;
  let videoFallback = false;
  let heroRAF = 0;
  let cursorRAF = 0;
  let toastTimer;
  body.classList.add('is-locked', 'js-ready');
  header.inert = main.inert = true;
  enterBtn.focus({preventScroll:true});
  boot.addEventListener('keydown', e => {
    if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === enterBtn ? soundEntry : enterBtn).focus();
    }
  });
  const announce = message => {
    const toast = $('#achievementToast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 5000);
  };
  const syncMusic = () => {
    const playing = !music.paused;
    musicBtn.classList.toggle('playing', playing);
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicLabel.textContent = playing ? 'ЗВУК ВКЛ' : 'ЗВУК ВЫКЛ';
  };
  music.addEventListener('play', syncMusic);
  music.addEventListener('pause', syncMusic);
  const playMusic = async () => {
    try { music.volume = .35; await music.play(); }
    catch { announce('Музыка недоступна. Поздравление продолжается без звука.'); }
    syncMusic();
  };
  const enter = withSound => {
    if (entered) return;
    entered = true;
    boot.classList.add('done');
    body.classList.remove('is-locked');
    header.inert = main.inert = false;
    $('.hero-title').focus({preventScroll:true});
    setTimeout(() => boot.remove(), motion.matches ? 0 : 1000);
    syncHero();
    if (withSound) playMusic();
  };
  enterBtn.addEventListener('click', () => enter(false));
  soundEntry.addEventListener('click', () => enter(true));
  syncMusic();

  // Cursor only animates after mouse movement and stops when it catches up.
  const dot = $('.cursor-dot'), ring = $('.cursor-ring');
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;
  const cursorLoop = () => {
    ringX += (mouseX-ringX)*.2; ringY += (mouseY-ringY)*.2;
    ring.style.transform = `translate(${ringX}px,${ringY}px) translate(-50%,-50%)`;
    cursorRAF = Math.abs(mouseX-ringX)+Math.abs(mouseY-ringY) > .5
      ? requestAnimationFrame(cursorLoop) : 0;
  };
  window.addEventListener('pointermove', e => {
    if (!pointer.matches || motion.matches || e.pointerType !== 'mouse') return;
    mouseX=e.clientX; mouseY=e.clientY;
    body.classList.add('custom-cursor');
    dot.style.transform = `translate(${mouseX}px,${mouseY}px) translate(-50%,-50%)`;
    if (!cursorRAF) cursorRAF = requestAnimationFrame(cursorLoop);
  }, {passive:true});
  const stopCursor = () => {
    cancelAnimationFrame(cursorRAF); cursorRAF=0;
    body.classList.remove('custom-cursor');
  };
  document.documentElement.addEventListener('pointerleave', stopCursor);
  window.addEventListener('blur', stopCursor);

  // Load a bounded frame queue after entry. Video is a separate touch/failure fallback.
  const FRAME_COUNT = 91;
  const frames = new Array(FRAME_COUNT);
  const queue = Array.from({length:FRAME_COUNT}, (_, i) => i)
    .sort((a,b) => Math.abs(a-45)-Math.abs(b-45));
  const ctx = heroCanvas.getContext('2d', {alpha:false});
  let activeLoads=0, settled=0, loaded=0, lastFrame=-1;
  let pointerNX=.5, pointerNY=.5, smoothNX=.5, smoothNY=.5;
  const activeHero = () => entered && heroVisible && !document.hidden && !motion.matches;
  const useFrames = () => pointer.matches && !!ctx && !videoFallback;
  const resizeCanvas = () => {
    const rect=hero.getBoundingClientRect(), dpr=Math.min(devicePixelRatio || 1, 1.5);
    heroCanvas.width=Math.max(1,Math.round(rect.width*dpr));
    heroCanvas.height=Math.max(1,Math.round(rect.height*dpr));
    lastFrame=-1;
    requestHeroRender();
  };
  const renderHero = () => {
    heroRAF=0;
    if (!activeHero() || !useFrames()) return;
    smoothNX+=(pointerNX-smoothNX)*.115; smoothNY+=(pointerNY-smoothNY)*.115;
    const desired=Math.round(smoothNX*(FRAME_COUNT-1));
    let index=-1;
    for(let d=0;d<FRAME_COUNT;d++) {
      if(frames[desired-d]) {index=desired-d;break;}
      if(frames[desired+d]) {index=desired+d;break;}
    }
    if(index>=0 && index!==lastFrame) {
      const img=frames[index], scale=Math.max(heroCanvas.width/img.naturalWidth,heroCanvas.height/img.naturalHeight);
      const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
      ctx.drawImage(img,(heroCanvas.width-w)/2,(heroCanvas.height-h)/2,w,h);
      lastFrame=index;
      heroScene.classList.add('frames-ready');
    }
    heroScene.style.transform=`scale(1.055) rotateX(${(smoothNY-.5)*-2.2}deg) rotateY(${(smoothNX-.5)*3.2}deg)`;
    target.style.left=`${smoothNX*100}%`; target.style.top=`${smoothNY*100}%`;
    if(Math.abs(pointerNX-smoothNX)+Math.abs(pointerNY-smoothNY)>.0005) requestHeroRender();
  };
  function requestHeroRender() {
    if(!heroRAF && activeHero() && useFrames()) heroRAF=requestAnimationFrame(renderHero);
  }
  function pumpFrames() {
    if(!activeHero() || !useFrames()) return;
    while(activeLoads<4 && queue.length) {
      const index=queue.shift(), img=new Image(); activeLoads++;
      img.decoding='async';
      const finish=success => {
        activeLoads--; settled++;
        if(success) {frames[index]=img; loaded++; requestHeroRender();}
        if(settled===FRAME_COUNT && !loaded) {videoFallback=true; syncHero();}
        else pumpFrames();
      };
      img.onload=()=>finish(true); img.onerror=()=>finish(false);
      img.src=`assets/hero-frames/frame_${String(index+1).padStart(3,'0')}.webp`;
    }
  }
  function syncHero() {
    cancelAnimationFrame(heroRAF); heroRAF=0;
    heroVideo.pause();
    if(!activeHero()) {
      if(motion.matches) {
        heroScene.classList.remove('frames-ready'); heroScene.style.transform='';
      }
      return;
    }
    if(useFrames()) {
      if(!started) {started=true; resizeCanvas();}
      pumpFrames(); requestHeroRender();
    } else {
      heroScene.classList.remove('frames-ready'); heroScene.style.transform='';
      const source=heroVideo.querySelector('source');
      if(!source.hasAttribute('src')) {source.src=source.dataset.src; heroVideo.load();}
      heroVideo.loop=true; heroVideo.play().catch(()=>{});
    }
  }
  new IntersectionObserver(entries => {
    heroVisible=entries[0].isIntersecting; syncHero();
  }).observe(hero);
  document.addEventListener('visibilitychange', () => {stopCursor();syncHero();});
  [motion,pointer].forEach(query => query.addEventListener('change', () => {stopCursor();lastFrame=-1;syncHero();}));
  window.addEventListener('resize', () => {if(started) resizeCanvas();}, {passive:true});
  hero.addEventListener('pointermove', e => {
    if(!activeHero() || !useFrames()) return;
    const r=hero.getBoundingClientRect();
    pointerNX=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    pointerNY=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
    cursorStatus.textContent='TRACKING'; requestHeroRender();
  }, {passive:true});
  hero.addEventListener('pointerleave', () => {
    pointerNX=pointerNY=.5; cursorStatus.textContent='STANDBY'; requestHeroRender();
  });

  // Roast / respect mode
  modeSwitch.addEventListener('click', () => {
    const next = body.dataset.mode === 'roast' ? 'respect' : 'roast';
    body.dataset.mode = next;
    modeLabel.textContent = next === 'roast' ? 'ROAST' : 'RESPECT';
    modeSwitch.setAttribute('aria-pressed', String(next === 'respect'));
    $$('[data-roast][data-respect]').forEach(el => {
      if (!motion.matches) el.animate([{opacity:.25,filter:'blur(4px)'},{opacity:1,filter:'blur(0)'}],{duration:280});
      el.textContent = el.dataset[next];
    });
  });

  musicBtn.addEventListener('click', () => {
    if (!music.paused) music.pause(); else playMusic();
  });

  // Food mini-game
  const foodVariants = [
    'Лапша, уровень остроты которой обозначен не цифрой, а предупреждением врача.',
    'Что-то из меню, где ты не понимаешь ни одного ингредиента, но выглядит интересно.',
    'Блюдо, после которого официант спрашивает: «Вы точно уверены?»',
    'Неизвестная штука с перцем, соусом и очень сомнительным будущим.',
    'Еда, которую нормальный человек сначала сфотографирует, а Шаха сначала съест.'
  ];
  $$('.choice').forEach(btn => btn.addEventListener('click', () => {
    $('#foodPrompt').textContent = foodVariants[Math.floor(Math.random()*foodVariants.length)];
    $('#foodResult').textContent = btn.dataset.answer === 'yes' ? 'PREDICTION: YES. OBVIOUSLY.' : 'CORRECT ANSWER DETECTED: ALSO YES.';
  }));

  // Console
  const commands = {
    help: 'commands: whoami, origin, anime, food, headphones, wife, friend, future, clear',
    whoami: 'SHAKHA // level 26 // developer // manga enjoyer // food explorer // certified tall person',
    origin: 'KENTAU -> ALMATY -> МУИТ -> KASPI -> LEVEL 26',
    anime: 'database too large. operation aborted to protect browser memory.',
    food: 'status: hungry. recommendation engine: anything spicy and weird.',
    headphones: 'ERROR: hardware too ancient to identify. replacement strongly recommended.',
    wife: 'ACCESS DENIED. Married-mode data protected by administrator privileges.',
    friend: 'first response: «Нет». current status: somehow still friends.',
    future: 'prediction: more work, more food, more arguments, more stories. confidence 99.9%.'
  };
  $('#consoleForm').addEventListener('submit', (e) => {
    e.preventDefault(); const input=$('#consoleInput'); const cmd=input.value.trim().toLowerCase(); if(!cmd)return;
    const out=$('#consoleOutput');
    const q=document.createElement('p'); q.textContent=`$ ${cmd}`; out.appendChild(q);
    if(cmd==='clear'){out.innerHTML='';input.value='';return;}
    const a=document.createElement('p'); a.className='console-response'; a.textContent=commands[cmd] || `command not found: ${cmd}. type help`; out.appendChild(a);
    while(out.children.length>100) out.firstElementChild.remove();
    input.value=''; out.scrollTop=out.scrollHeight;
  });

  // Tilt card
  $$('.tilt-card').forEach(card => {
    card.addEventListener('pointermove',e=>{if(motion.matches || !pointer.matches)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-5}deg) rotateY(${x*7}deg)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const animations = gsap.matchMedia();
    animations.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.hero-ui .reveal',{y:35,opacity:0,stagger:.12,duration:1,ease:'power3.out',delay:.35});
    gsap.utils.toArray('.section-head').forEach(el=>gsap.from(el.children,{scrollTrigger:{trigger:el,start:'top 82%'},y:35,opacity:0,stagger:.08,duration:.75,ease:'power3.out'}));
    gsap.utils.toArray('.stat .bar i').forEach(el=>gsap.fromTo(el,{width:0},{scrollTrigger:{trigger:el,start:'top 88%'},width:getComputedStyle(el).getPropertyValue('--v'),duration:1.1,ease:'power3.out'}));
    gsap.to('.route-line i',{scrollTrigger:{trigger:'.route',start:'top 75%',end:'bottom 75%',scrub:true},height:'100%'});
    gsap.utils.toArray('.route-node').forEach(el=>gsap.from(el,{scrollTrigger:{trigger:el,start:'top 82%'},x:30,opacity:0,duration:.65}));
    gsap.from('.quote-him',{scrollTrigger:{trigger:'.quote-scene',start:'top 70%'},scale:.6,opacity:0,duration:.75,ease:'back.out(1.7)'});
    gsap.from('.terminal[data-terminal="history"] .terminal-body p',{scrollTrigger:{trigger:'.git .terminal',start:'top 75%'},y:8,opacity:0,stagger:.08,duration:.3});
    const strip=$('.arc-strip');
    const arcCards=gsap.utils.toArray('.arc-card');
    const arcMedia=gsap.matchMedia();
    arcMedia.add('(min-width: 701px)', () => {
    if(strip){
      strip.classList.add('is-scroll-animated');
      gsap.to(strip,{
        x:()=>-(strip.scrollWidth-innerWidth+innerWidth*.12),
        ease:'none',
        scrollTrigger:{
          trigger:'.arcs',
          start:'top top',
          end:()=>`+=${strip.scrollWidth*.7}`,
          pin:true,
          scrub:1,
          invalidateOnRefresh:true
        }
      });
    }
    return () => strip?.classList.remove('is-scroll-animated');
    });
    arcMedia.add('(max-width: 700px)', () => {
    if(strip){
      // Mobile: cards are stacked vertically and reveal independently.
      // No pinning/horizontal scrub here — it is unreliable on touch browsers.
      gsap.set(strip,{clearProps:'transform'});
      arcCards.forEach(card=>{
        gsap.fromTo(card,
          {y:46,opacity:0,scale:.965},
          {
            y:0,opacity:1,scale:1,duration:.72,ease:'power3.out',
            scrollTrigger:{
              trigger:card,
              start:'top 88%',
              once:true
            }
          }
        );
      });
    }
    });
    gsap.from('.achievement',{scrollTrigger:{trigger:'.achievement-grid',start:'top 80%'},y:45,opacity:0,stagger:.07,duration:.6});
    gsap.from('.bug-list article',{scrollTrigger:{trigger:'.bug-list',start:'top 80%'},x:-25,opacity:0,stagger:.08,duration:.45});
    gsap.from('.message-wrap > *',{scrollTrigger:{trigger:'.real-talk',start:'top 65%'},y:35,opacity:0,stagger:.15,duration:.8});
    gsap.from('.level-number',{scrollTrigger:{trigger:'.finale',start:'top 60%'},scale:.45,opacity:0,duration:1.1,ease:'power4.out'});
    return () => arcMedia.revert();
    });
  }
})();

// Birthday gift interaction — generated asset scene
(() => {
  const visual = document.getElementById('birthdayVisual');
  const gift = document.getElementById('giftBox');
  const action = document.getElementById('giftAction');
  if (!visual || !gift || !action) return;
  const openGift = () => {
    if (visual.classList.contains('is-open')) return;
    visual.classList.add('is-open');
    action.textContent = 'UPGRADE UNLOCKED';
    action.setAttribute('aria-expanded','true');
    action.disabled=true;
    gift.setAttribute('tabindex','-1');
    gift.setAttribute('aria-disabled','true');
    if(document.activeElement===gift) document.getElementById('giftCaption').focus();
    const achievement=document.getElementById('headphoneAchievement');
    achievement.classList.remove('locked-achievement');
    achievement.classList.add('unlocked-achievement');
    achievement.querySelector('small').textContent='UNLOCKED';
    achievement.querySelector('p').textContent='Виртуальный апгрейд получен. Осталось повторить в реальности.';
    document.getElementById('headphonePatch').textContent='+ legendary headphones unlocked';
    const toast=document.getElementById('achievementToast');
    toast.textContent='Достижение разблокировано: NEW HEADPHONES';
    toast.classList.add('visible');
    setTimeout(()=>toast.classList.remove('visible'),5000);
    if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo('.birthday-new-headphones',{rotation:-18,scale:.55},{rotation:-5,scale:1,duration:.9,ease:'back.out(1.7)'});
      gsap.fromTo('.birthday-confetti',{opacity:.05,scale:.96},{opacity:.62,scale:1,duration:.7,yoyo:true,repeat:1});
    }
  };
  gift.addEventListener('click', openGift);
  gift.addEventListener('keydown', e => {if(e.key==='Enter' || e.key===' ') {e.preventDefault();openGift();}});
  action.addEventListener('click', openGift);

  if (window.gsap && window.ScrollTrigger) {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.birthday-26',{scrollTrigger:{trigger:'.birthday-drop',start:'top 70%'},y:50,scale:.84,opacity:0,duration:1,ease:'back.out(1.35)'});
    gsap.from('.birthday-balloons',{scrollTrigger:{trigger:'.birthday-drop',start:'top 70%'},y:80,opacity:0,duration:1.1,ease:'power3.out'});
    gsap.from('.birthday-cake',{scrollTrigger:{trigger:'.birthday-visual',start:'top 76%'},x:-40,opacity:0,duration:.85,ease:'power3.out'});
    });
  }
})();
