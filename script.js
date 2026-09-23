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

  enterBtn.addEventListener('click', async () => {
    boot.classList.add('done');
    body.classList.remove('is-locked');
    heroVideo.play().catch(()=>{});
    setTimeout(() => boot.remove(), 1000);
	music.volume = .62;
      await music.play();
      musicBtn.classList.add('playing'); musicLabel.textContent='MUSIC ON';
  });

  // Cursor
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  let mouseX = innerWidth/2, mouseY = innerHeight/2, ringX = mouseX, ringY = mouseY;
  window.addEventListener('pointermove', (e) => {
    mouseX = e.clientX; mouseY = e.clientY;
    dot.style.transform = `translate(${mouseX}px,${mouseY}px) translate(-50%,-50%)`;
  }, {passive:true});
  const cursorLoop = () => {
    ringX += (mouseX-ringX)*.16; ringY += (mouseY-ringY)*.16;
    ring.style.transform = `translate(${ringX}px,${ringY}px) translate(-50%,-50%)`;
    requestAnimationFrame(cursorLoop);
  }; cursorLoop();
  $$('.magnetic').forEach(el => {
    el.addEventListener('pointerenter',()=>{ring.style.width='60px';ring.style.height='60px';ring.style.borderColor='rgba(92,231,255,.75)'});
    el.addEventListener('pointerleave',()=>{ring.style.width='38px';ring.style.height='38px';ring.style.borderColor='rgba(255,255,255,.45)'});
  });

  // Hero cursor-linked scene.
  // Desktop uses a predecoded frame sequence instead of seeking the MP4 on every pointer event.
  // This removes the stutter that happens when browsers repeatedly decode keyframes during fast mouse movement.
  let scrubMode = false;
  const canHover = matchMedia('(hover:hover) and (pointer:fine)').matches;

  if (canHover && heroCanvas) {
    const ctx = heroCanvas.getContext('2d', { alpha: false });
    const FRAME_COUNT = 91;
    const frames = new Array(FRAME_COUNT);
    let loadedFrames = 0;
    let pointerNX = .5;
    let pointerNY = .5;
    let smoothNX = .5;
    let smoothNY = .5;
    let lastFrame = -1;
    let canvasW = 0;
    let canvasH = 0;

    const resizeHeroCanvas = () => {
      const rect = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvasW = Math.max(1, Math.round(rect.width * dpr));
      canvasH = Math.max(1, Math.round(rect.height * dpr));
      if (heroCanvas.width !== canvasW || heroCanvas.height !== canvasH) {
        heroCanvas.width = canvasW;
        heroCanvas.height = canvasH;
      }
      lastFrame = -1;
    };

    const drawCover = (img) => {
      if (!img || !img.complete || !img.naturalWidth) return;
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const scale = Math.max(canvasW / iw, canvasH / ih);
      const dw = iw * scale, dh = ih * scale;
      const dx = (canvasW - dw) / 2;
      const dy = (canvasH - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const nearestLoadedFrame = (index) => {
      if (frames[index]?.complete && frames[index].naturalWidth) return frames[index];
      for (let d = 1; d < FRAME_COUNT; d++) {
        const a = index - d, b = index + d;
        if (a >= 0 && frames[a]?.complete && frames[a].naturalWidth) return frames[a];
        if (b < FRAME_COUNT && frames[b]?.complete && frames[b].naturalWidth) return frames[b];
      }
      return null;
    };

    resizeHeroCanvas();
    window.addEventListener('resize', resizeHeroCanvas, { passive: true });

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `assets/hero-frames/frame_${String(i + 1).padStart(3, '0')}.webp`;
      img.onload = () => {
        loadedFrames++;
        if (i === Math.round((FRAME_COUNT - 1) / 2) && lastFrame < 0) {
          drawCover(img);
        }
        if (loadedFrames === FRAME_COUNT) {
          heroScene.classList.add('frames-ready');
          heroVideo.pause();
        }
      };
      frames[i] = img;
    }

    hero.addEventListener('pointerenter', () => {
      scrubMode = true;
      cursorStatus.textContent = 'TRACKING';
    });

    hero.addEventListener('pointerleave', () => {
      scrubMode = false;
      pointerNX = .5;
      pointerNY = .5;
      cursorStatus.textContent = 'STANDBY';
    });

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      pointerNX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      pointerNY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
      document.documentElement.style.setProperty('--mx', `${pointerNX * 100}%`);
      document.documentElement.style.setProperty('--my', `${pointerNY * 100}%`);
    }, { passive: true });

    const heroRenderLoop = () => {
      // Framerate-independent-ish easing: fast enough to follow, slow enough to feel cinematic.
      smoothNX += ((scrubMode ? pointerNX : .5) - smoothNX) * .115;
      smoothNY += ((scrubMode ? pointerNY : .5) - smoothNY) * .115;

      const frameIndex = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(smoothNX * (FRAME_COUNT - 1))));
      if (frameIndex !== lastFrame && loadedFrames) {
        const img = nearestLoadedFrame(frameIndex);
        if (img) {
          drawCover(img);
          lastFrame = frameIndex;
        }
      }

      const rx = (smoothNY - .5) * -2.2;
      const ry = (smoothNX - .5) * 3.2;
      heroScene.style.transform = `scale(1.055) rotateX(${rx}deg) rotateY(${ry}deg)`;
      target.style.left = `${smoothNX * 100}%`;
      target.style.top = `${smoothNY * 100}%`;
      requestAnimationFrame(heroRenderLoop);
    };
    requestAnimationFrame(heroRenderLoop);
  } else {
    // Touch devices: no expensive cursor interaction; keep the original animation centered and looping.
    heroVideo.loop = true;
    heroVideo.play().catch(()=>{});
  }

  heroVideo.addEventListener('ended',()=>{
    if(!scrubMode){
      heroVideo.currentTime=0;
      heroVideo.play().catch(()=>{});
    }
  });

  // Roast / respect mode
  modeSwitch.addEventListener('click', () => {
    const next = body.dataset.mode === 'roast' ? 'respect' : 'roast';
    body.dataset.mode = next;
    modeLabel.textContent = next === 'roast' ? 'ROAST MODE' : 'RESPECT MODE';
    $$('[data-roast][data-respect]').forEach(el => {
      el.animate([{opacity:.25,filter:'blur(4px)'},{opacity:1,filter:'blur(0)'}],{duration:280});
      el.textContent = el.dataset[next];
    });
  });

  // Music: put your file at assets/music.mp3
  musicBtn.addEventListener('click', async () => {
    if (!music.paused) {
      music.pause(); musicBtn.classList.remove('playing'); musicLabel.textContent='MUSIC OFF'; return;
    }
    try {
      music.volume = .62;
      await music.play();
      musicBtn.classList.add('playing'); musicLabel.textContent='MUSIC ON';
    } catch {
      musicLabel.textContent='ADD MP3';
      musicBtn.title='Добавь файл assets/music.mp3';
    }
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
    const q=document.createElement('p'); q.innerHTML=`<i>$</i> ${cmd}`; out.appendChild(q);
    if(cmd==='clear'){out.innerHTML='';input.value='';return;}
    const a=document.createElement('p'); a.className='console-response'; a.textContent=commands[cmd] || `command not found: ${cmd}. type help`; out.appendChild(a);
    input.value=''; out.scrollTop=out.scrollHeight;
  });

  // Tilt card
  $$('.tilt-card').forEach(card => {
    card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.transform=`perspective(900px) rotateX(${y*-5}deg) rotateY(${x*7}deg)`});
    card.addEventListener('pointerleave',()=>card.style.transform='');
  });

  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero-ui .reveal',{y:35,opacity:0,stagger:.12,duration:1,ease:'power3.out',delay:.35});
    gsap.utils.toArray('.section-head').forEach(el=>gsap.from(el.children,{scrollTrigger:{trigger:el,start:'top 82%'},y:35,opacity:0,stagger:.08,duration:.75,ease:'power3.out'}));
    gsap.utils.toArray('.stat .bar i').forEach(el=>gsap.to(el,{scrollTrigger:{trigger:el,start:'top 88%'},width:getComputedStyle(el).getPropertyValue('--v'),duration:1.1,ease:'power3.out'}));
    gsap.to('.route-line i',{scrollTrigger:{trigger:'.route',start:'top 75%',end:'bottom 75%',scrub:true},height:'100%'});
    gsap.utils.toArray('.route-node').forEach(el=>gsap.from(el,{scrollTrigger:{trigger:el,start:'top 82%'},x:30,opacity:0,duration:.65}));
    gsap.from('.quote-him',{scrollTrigger:{trigger:'.quote-scene',start:'top 70%'},scale:.6,opacity:0,duration:.75,ease:'back.out(1.7)'});
    gsap.from('.terminal[data-terminal="history"] .terminal-body p',{scrollTrigger:{trigger:'.git .terminal',start:'top 75%'},y:8,opacity:0,stagger:.08,duration:.3});
    const strip=$('.arc-strip');
    const arcCards=gsap.utils.toArray('.arc-card');
    const desktopArcs=window.matchMedia('(min-width: 701px)').matches;

    if(strip && desktopArcs){
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
    } else if(strip){
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
    gsap.from('.achievement',{scrollTrigger:{trigger:'.achievement-grid',start:'top 80%'},y:45,opacity:0,stagger:.07,duration:.6});
    gsap.from('.bug-list article',{scrollTrigger:{trigger:'.bug-list',start:'top 80%'},x:-25,opacity:0,stagger:.08,duration:.45});
    gsap.from('.message-wrap > *',{scrollTrigger:{trigger:'.real-talk',start:'top 65%'},y:35,opacity:0,stagger:.15,duration:.8});
    gsap.from('.level-number',{scrollTrigger:{trigger:'.finale',start:'top 60%'},scale:.45,opacity:0,duration:1.1,ease:'power4.out'});
    gsap.to('.hero-video',{scrollTrigger:{trigger:'.hero',start:'top top',end:'bottom top',scrub:true},scale:1.12,yPercent:5});
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
    if (window.gsap) {
      gsap.fromTo('.birthday-new-headphones',{rotation:-18,scale:.55},{rotation:-5,scale:1,duration:.9,ease:'back.out(1.7)'});
      gsap.fromTo('.birthday-confetti',{opacity:.05,scale:.96},{opacity:.62,scale:1,duration:.7,yoyo:true,repeat:1});
    }
  };
  gift.addEventListener('click', openGift);
  action.addEventListener('click', openGift);

  if (window.gsap && window.ScrollTrigger) {
    gsap.from('.birthday-26',{scrollTrigger:{trigger:'.birthday-drop',start:'top 70%'},y:50,scale:.84,opacity:0,duration:1,ease:'back.out(1.35)'});
    gsap.from('.birthday-balloons',{scrollTrigger:{trigger:'.birthday-drop',start:'top 70%'},y:80,opacity:0,duration:1.1,ease:'power3.out'});
    gsap.from('.birthday-cake',{scrollTrigger:{trigger:'.birthday-visual',start:'top 76%'},x:-40,opacity:0,duration:.85,ease:'power3.out'});
  }
})();
