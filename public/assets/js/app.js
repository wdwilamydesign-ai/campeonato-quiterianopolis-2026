'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Confirmações seguras
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', e => {
      if (!window.confirm(el.dataset.confirm || 'Confirmar esta ação?')) {
        e.preventDefault();
      }
    });
  });

  // Auto-refresh configurável em páginas públicas ao vivo
  document.querySelectorAll('[data-auto-refresh]').forEach(el => {
    const ms = parseInt(el.dataset.autoRefresh || '30000', 10);
    if (ms >= 5000) setTimeout(() => window.location.reload(), ms);
  });

  // Impressão limpa
  document.querySelectorAll('[data-print]').forEach(el => {
    el.addEventListener('click', () => window.print());
  });

  // Abas genéricas
  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.tabGroup;
      document.querySelectorAll(`[data-tab-group="${group}"]`).forEach(b => b.classList.remove('active'));
      document.querySelectorAll(`[data-tab-panel="${group}"]`).forEach(p => { p.hidden = true; });
      btn.classList.add('active');
      const panel = document.querySelector(`[data-tab-panel="${group}"][data-tab-id="${btn.dataset.tab}"]`);
      if (panel) panel.hidden = false;
    });
  });

  // Filtros rápidos de jogos (Fase / Chave)
  const filterChips = [...document.querySelectorAll('[data-match-filter]')];
  if (filterChips.length) {
    const cards = [...document.querySelectorAll('[data-match-item]')];
    filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const val = chip.dataset.matchFilter;
        cards.forEach(card => {
          if (val === 'todos') {
            card.hidden = false;
          } else if (val.startsWith('chave:')) {
            card.hidden = card.dataset.chave !== val.slice(6);
          } else {
            card.hidden = card.dataset.fase !== val;
          }
        });
      });
    });
  }

  // Máscaras de CPF e Telefone
  const onlyDigits = v => (v || '').replace(/\D/g, '');
  const maskCpf = v => {
    const d = onlyDigits(v).slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };
  const maskPhone = v => {
    const d = onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  document.querySelectorAll('[data-mask="cpf"]').forEach(el => {
    if (el.value) el.value = maskCpf(el.value);
    el.addEventListener('input', () => { el.value = maskCpf(el.value); });
  });
  document.querySelectorAll('[data-mask="phone"]').forEach(el => {
    if (el.value) el.value = maskPhone(el.value);
    el.addEventListener('input', () => { el.value = maskPhone(el.value); });
  });

  // Automação de cadastro de atleta (Local de Quiterianópolis vs Fora)
  const origemSelect = document.querySelector('#origem-atleta');
  const criterioWrap = document.querySelector('#criterio-local-wrap');
  const vagaForaWrap = document.querySelector('#vaga-fora-wrap');
  if (origemSelect) {
    const syncOrigem = () => {
      const isFora = origemSelect.value === 'fora';
      if (criterioWrap) criterioWrap.hidden = isFora;
      if (vagaForaWrap) vagaForaWrap.hidden = !isFora;
    };
    origemSelect.addEventListener('change', syncOrigem);
    syncOrigem();
  }

  // Busca instantânea na Central de Ajuda (FAQ) sem acentos
  const faqSearch = document.querySelector('#faq-search');
  if (faqSearch) {
    const norm = v => (v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const items = [...document.querySelectorAll('[data-faq]')];
    const sections = [...document.querySelectorAll('[data-faq-section]')];
    const empty = document.querySelector('#faq-empty');
    faqSearch.addEventListener('input', () => {
      const term = norm(faqSearch.value.trim());
      let visible = 0;
      items.forEach(item => {
        const show = !term || norm(item.textContent).includes(term);
        item.hidden = !show;
        if (show) { visible++; if (term) item.open = true; } else item.open = false;
      });
      sections.forEach(sec => {
        sec.hidden = ![...sec.querySelectorAll('[data-faq]')].some(i => !i.hidden);
      });
      if (empty) empty.hidden = visible !== 0;
    });
  }

  // Lightbox da Galeria de Fotos
  const thumbs = [...document.querySelectorAll('[data-gallery-photo]')];
  const lightbox = document.getElementById('galeria-lightbox');
  if (lightbox && thumbs.length) {
    const imgEl = lightbox.querySelector('[data-gallery-large]');
    const counterEl = lightbox.querySelector('[data-gallery-counter]');
    const descEl = lightbox.querySelector('[data-gallery-description]');
    let idxAtual = 0;
    const abrirFoto = i => {
      idxAtual = (i + thumbs.length) % thumbs.length;
      imgEl.src = thumbs[idxAtual].dataset.galleryUrl;
      descEl.textContent = thumbs[idxAtual].dataset.galleryCaption || '';
      counterEl.textContent = `${idxAtual + 1} / ${thumbs.length}`;
      lightbox.hidden = false;
    };
    const fecharFoto = () => { lightbox.hidden = true; imgEl.removeAttribute('src'); };
    thumbs.forEach((t, i) => t.addEventListener('click', () => abrirFoto(i)));
    lightbox.querySelector('[data-gallery-close]')?.addEventListener('click', fecharFoto);
    lightbox.querySelector('[data-gallery-prev]')?.addEventListener('click', () => abrirFoto(idxAtual - 1));
    lightbox.querySelector('[data-gallery-next]')?.addEventListener('click', () => abrirFoto(idxAtual + 1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) fecharFoto(); });
    document.addEventListener('keydown', e => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') fecharFoto();
      if (e.key === 'ArrowLeft') abrirFoto(idxAtual - 1);
      if (e.key === 'ArrowRight') abrirFoto(idxAtual + 1);
    });
  }

  // Notificações públicas ao vivo (Polling 4s + Som de Apito Sintetizado via Web Audio API)
  const publicChamp = parseInt(document.body?.dataset?.publicChampionship || '0', 10);
  if (publicChamp > 0) {
    const liveKey = `quiteria_live_ev_${publicChamp}`;
    let lastEventId = parseInt(sessionStorage.getItem(liveKey) || '0', 10) || 0;
    let liveReady = sessionStorage.getItem(`${liveKey}_ready`) === '1';
    let polling = false;
    const fila = [];
    let exibindo = false;
    let audioCtx = null;
    let audioLiberado = false;

    const liberarAudio = () => {
      if (audioLiberado) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtx = audioCtx || new Ctx();
        if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
        audioLiberado = true;
      } catch (_) {}
    };
    ['pointerdown', 'touchstart', 'keydown'].forEach(ev =>
      window.addEventListener(ev, liberarAudio, { once: true, passive: true })
    );

    const tocarApitoGol = () => {
      if (!audioLiberado || !audioCtx) return;
      try {
        const now = audioCtx.currentTime;
        const master = audioCtx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
        master.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);
        master.connect(audioCtx.destination);
        [0, 8].forEach(detune => {
          const osc = audioCtx.createOscillator();
          osc.type = 'sine';
          osc.detune.value = detune;
          osc.frequency.setValueAtTime(1800, now);
          osc.frequency.exponentialRampToValueAtTime(2420, now + 0.18);
          osc.frequency.exponentialRampToValueAtTime(1980, now + 0.52);
          osc.connect(master);
          osc.start(now);
          osc.stop(now + 0.7);
        });
      } catch (_) {}
    };

    const escapar = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

    const apresentacaoEvento = ev => {
      if (ev.tipo === 'gol') return { icon: '⚽', kicker: 'GOOOL NO TUALDÃO!', title: ev.equipe || 'Gol confirmado!', goal: true };
      if (ev.tipo === 'gol_contra') return { icon: '⚽', kicker: 'Gol contra', title: ev.equipe || 'Gol contra', goal: true };
      if (ev.tipo === 'amarelo') return { icon: '🟨', kicker: 'Cartão amarelo', title: ev.atleta || ev.equipe || 'Advertência' };
      if (ev.tipo === 'vermelho') return { icon: '🟥', kicker: 'Cartão vermelho', title: ev.atleta || ev.equipe || 'Expulsão' };
      if (ev.tipo === 'substituicao') return { icon: '🔄', kicker: 'Substituição', title: ev.equipe || 'Alteração' };
      if (ev.tipo === 'acrescimo') return { icon: '⏱️', kicker: 'Acréscimos', title: ev.detalhe || 'Tempo adicional' };
      return { icon: '📝', kicker: 'Lance da partida', title: ev.equipe || 'Nova ocorrência' };
    };

    const exibirProximo = () => {
      if (exibindo || !fila.length) return;
      exibindo = true;
      const ev = fila.shift();
      const meta = apresentacaoEvento(ev);
      const toast = document.createElement('a');
      toast.className = `live-event-toast${meta.goal ? ' goal' : ''}`;
      toast.href = ev.url_publica || '#';
      toast.innerHTML = `
        <span class="live-event-toast-icon">${meta.icon}</span>
        <span style="min-width:0;display:grid;gap:2px;flex:1">
          <span style="font-size:.72rem;font-weight:900;text-transform:uppercase;color:var(--blue)">${escapar(meta.kicker)}</span>
          <strong style="font-size:1rem;color:var(--blue-deep)">${escapar(meta.title)}</strong>
          <span class="small muted">${escapar(ev.detalhe || '')}</span>
        </span>
        ${ev.placar ? `<strong style="font-size:1.1rem;color:var(--blue-deep);white-space:nowrap">${escapar(ev.placar.mandante)} × ${escapar(ev.placar.visitante)}</strong>` : ''}
      `;
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      if (meta.goal) tocarApitoGol();
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { toast.remove(); exibindo = false; exibirProximo(); }, 250);
      }, meta.goal ? 6500 : 5000);
    };

    const consultarEventos = async () => {
      if (polling) return;
      polling = true;
      try {
        const res = await fetch(`/api/v1/eventos-ao-vivo?campeonato=${publicChamp}&apos=${lastEventId}${liveReady ? '' : '&inicial=1'}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        const dados = json?.dados || {};
        const ultimoServidor = parseInt(dados.ultimo_id || '0', 10) || 0;
        if (!liveReady) {
          lastEventId = Math.max(lastEventId, ultimoServidor);
          sessionStorage.setItem(liveKey, String(lastEventId));
          sessionStorage.setItem(`${liveKey}_ready`, '1');
          liveReady = true;
          return;
        }
        (dados.eventos || []).forEach(ev => {
          const id = parseInt(ev.id || '0', 10) || 0;
          if (id > lastEventId) { lastEventId = id; fila.push(ev); }
        });
        if (ultimoServidor > lastEventId) lastEventId = ultimoServidor;
        sessionStorage.setItem(liveKey, String(lastEventId));
        exibirProximo();
      } catch (_) {} finally { polling = false; }
    };

    consultarEventos();
    setInterval(consultarEventos, 4000);
  }

  // Ocultar botão do simulador quando a própria página está rodando dentro do quadro Android/iOS
  if (window.self !== window.top) {
    document.querySelectorAll('.no-sim').forEach(el => { el.style.display = 'none'; });
  }

  // Centralizar item ativo automaticamente nas barras de menu em sequência horizontal (mobile/tablet)
  document.querySelectorAll('.public-links a.active').forEach(linkAtivo => {
    const container = linkAtivo.parentElement;
    if (container && container.scrollWidth > container.clientWidth) {
      const destino = linkAtivo.offsetLeft - (container.clientWidth / 2) + (linkAtivo.offsetWidth / 2);
      container.scrollLeft = Math.max(0, destino);
    }
  });

  // Registro do Service Worker PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  }

  // Botão de instalar aplicativo PWA (Android nativo + Guia visual iPhone/iOS e Android)
  let deferredPrompt = null;
  const installBtns = [...document.querySelectorAll('[data-install-app]')];
  const modalPwa = document.getElementById('pwa-guide-modal');

  // Se já estiver rodando instalado em tela cheia (standalone), ocultar botão de instalar
  const jaInstalado = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  if (jaInstalado) {
    installBtns.forEach(b => { b.hidden = true; });
  }

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtns.forEach(b => { b.hidden = false; });
  });

  installBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (_) {}
        deferredPrompt = null;
        return;
      }
      if (modalPwa) {
        modalPwa.hidden = false;
      }
    });
  });

  document.querySelectorAll('[data-close-pwa-modal]').forEach(btn => {
    btn.addEventListener('click', () => { if (modalPwa) modalPwa.hidden = true; });
  });
  if (modalPwa) {
    modalPwa.addEventListener('click', e => { if (e.target === modalPwa) modalPwa.hidden = true; });
  }

  // Auto-submit em seletores de divisão/campeonato
  document.querySelectorAll('[data-auto-submit]').forEach(el => {
    el.addEventListener('change', () => { if (el.form) el.form.submit(); });
  });

  // Alternância de visibilidade de senha (mostrar/ocultar senha)
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-toggle-password');
    if (btn) {
      e.preventDefault();
      togglePasswordVisibility(btn);
    }
  });
});

function togglePasswordVisibility(button) {
  if (!button) return;
  const wrapper = button.closest('.password-field-wrapper') || button.parentElement;
  if (!wrapper) return;
  const input = wrapper.querySelector('input');
  if (!input) return;

  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  button.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Ver senha');
  button.setAttribute('title', isPassword ? 'Ocultar senha' : 'Ver senha');

  const svgEyeOpen = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
  const svgEyeOff = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';

  button.innerHTML = isPassword ? svgEyeOff : svgEyeOpen;
  input.focus();
}
window.togglePasswordVisibility = togglePasswordVisibility;

// Alternador de Jogos da Rodada Dupla no Hero
function switchHeroMatch(index, btn) {
  const box = document.getElementById('hero-next-box-carousel');
  if (!box) return;
  const tabs = box.querySelectorAll('.hero-tab-pill');
  tabs.forEach((b, i) => {
    const active = i === index;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  const p0 = document.getElementById('hero-panel-0');
  const p1 = document.getElementById('hero-panel-1');
  if (index === 0) {
    if (p0) p0.style.display = 'flex';
    if (p1) p1.style.display = 'none';
  } else {
    if (p0) p0.style.display = 'none';
    if (p1) p1.style.display = 'flex';
  }
}
window.switchHeroMatch = switchHeroMatch;

// Rotação automática suave dos jogos do dia no Hero a cada 6s (pausa se o usuário passar o mouse/clicar)
document.addEventListener('DOMContentLoaded', () => {
  const heroBox = document.getElementById('hero-next-box-carousel');
  if (!heroBox) return;
  const tabs = heroBox.querySelectorAll('.hero-tab-pill');
  if (tabs.length < 2) return;

  let currentIdx = 0;
  let userInteracted = false;

  heroBox.addEventListener('mouseenter', () => { userInteracted = true; });
  heroBox.addEventListener('click', () => { userInteracted = true; });

  setInterval(() => {
    if (userInteracted) return;
    currentIdx = (currentIdx + 1) % tabs.length;
    switchHeroMatch(currentIdx, tabs[currentIdx]);
  }, 6000);
});
