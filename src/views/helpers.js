'use strict';

function esc(val) {
  return String(val ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[ch]));
}

function moeda(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function segundosAtuaisCronometro(partida) {
  let base = Number(partida.cronometro_segundos_base || 0);
  if (partida.cronometro_rodando && partida.cronometro_iniciado_em) {
    const decorrido = Math.max(0, Math.floor((Date.now() - Number(partida.cronometro_iniciado_em)) / 1000));
    base += decorrido;
  }
  return base;
}

function renderCronometro(partida, tempoPeriodoMin = 40, classeExtra = '') {
  if (partida.status !== 'ao_vivo') return '';
  const isInt = partida.periodo_atual === 'INT';
  const seg = segundosAtuaisCronometro(partida);
  const rotuloFase = {
    '1T': '1º Tempo',
    'INT': 'Intervalo',
    '2T': '2º Tempo',
    'PEN': 'Pênaltis'
  }[partida.periodo_atual] || 'Ao Vivo';

  if (partida.periodo_atual === 'PEN') {
    return `<div class="${classeExtra}"><span class="match-clock"><span class="match-clock-phase">⚽ Disputa de Pênaltis</span></span></div>`;
  }

  return `
    <div class="${classeExtra}">
      <span class="match-clock" data-match-clock data-reg-minutes="${Number(tempoPeriodoMin || 40)}" data-seconds="${seg}" data-running="${partida.cronometro_rodando ? '1' : '0'}" data-interval="${isInt ? '1' : '0'}">
        <span class="match-clock-phase">${esc(rotuloFase)}</span>
        <span class="match-clock-value">00:00</span>
        <span class="small muted">/ ${Number(tempoPeriodoMin || 40)}:00</span>
        ${partida.acrescimos_min > 0 ? `<span class="match-clock-added">+${Number(partida.acrescimos_min)}'</span>` : ''}
      </span>
    </div>
  `;
}

function renderBadgeEscudo(equipe, tamanho = '') {
  const cls = `team-badge ${tamanho}`.trim();
  if (equipe && equipe.escudo_url) {
    return `<span class="${cls}"><img src="${esc(equipe.escudo_url)}" alt="Escudo de ${esc(equipe.nome)}" loading="lazy" decoding="async"></span>`;
  }
  const iniciais = equipe?.sigla || (equipe?.nome ? equipe.nome.slice(0, 3).toUpperCase() : '?');
  return `<span class="${cls}">${esc(iniciais)}</span>`;
}

function renderSlotPlaceholder(placeholder) {
  const txt = String(placeholder || 'A definir');
  let tipo = 'seed';
  if (/vencedor/i.test(txt)) tipo = 'win';
  else if (/perdedor/i.test(txt)) tipo = 'lose';
  return `<span class="slot-badge ${tipo}">${esc(txt)}</span>`;
}

function renderCardJogo(p, { equipesMap, tempoPeriodoMin = 40, mostrarBotaoArte = true, divQuery = '' } = {}) {
  const m = p.mandante_id ? equipesMap[p.mandante_id] : null;
  const v = p.visitante_id ? equipesMap[p.visitante_id] : null;
  const nomeM = m ? m.nome : (p.mandante_placeholder || 'A definir');
  const nomeV = v ? v.nome : (p.visitante_placeholder || 'A definir');

  const temPlacar = p.status === 'encerrada' || p.status === 'ao_vivo';
  const placarTxt = temPlacar ? `${Number(p.gols_mandante ?? 0)} × ${Number(p.gols_visitante ?? 0)}` : '×';
  const penTxt = (p.penaltis_mandante !== null && p.penaltis_visitante !== null && p.penaltis_mandante !== undefined && p.penaltis_visitante !== undefined)
    ? `<div class="tiny muted">Pênaltis: ${p.penaltis_mandante} × ${p.penaltis_visitante}</div>`
    : '';

  let statusPill = `<span class="pill">${esc(p.data_jogo)} • ${esc(p.hora_jogo)}</span>`;
  if (p.status === 'ao_vivo') statusPill = `<span class="pill live">● AO VIVO</span>`;
  else if (p.status === 'encerrada') statusPill = `<span class="pill ok">Encerrada</span>`;
  else if (p.status === 'adiada') statusPill = `<span class="pill warn">Adiada</span>`;

  const numFmt = String(p.numero_jogo).padStart(2, '0');
  const chaveTag = p.chave ? `<span class="pill chave-tag">Chave ${esc(p.chave)}</span>` : `<span class="pill gold">${esc(p.fase.toUpperCase())}</span>`;

  const tituloArte = p.status === 'encerrada' ? 'FIM DE JOGO' : (p.status === 'ao_vivo' ? 'JOGO AO VIVO' : 'DIA DE JOGO');
  const etiquetaArte = `JOGO ${numFmt} • ${p.chave ? 'CHAVE ' + p.chave : p.fase.toUpperCase()}`;

  return `
    <div class="score-card-wrap" data-match-item data-fase="${esc(p.fase)}" data-chave="${esc(p.chave || '')}">
      <div class="score-card-top">
        <span><strong>JOGO ${numFmt}</strong> • ${esc(p.local || 'Estádio Tualdão')}</span>
        ${chaveTag}
      </div>
      <a class="score-card" href="/jogo/${p.id}${divQuery}">
        <div class="team-side">
          ${m ? renderBadgeEscudo(m) : `<span class="team-badge">⚽</span>`}
          <div>
            ${m ? `<strong>${esc(m.nome)}</strong><span class="tiny muted" style="display:block">Mandante</span>` : renderSlotPlaceholder(p.mandante_placeholder)}
          </div>
        </div>
        <div class="score-box">
          <div class="score">${placarTxt}</div>
          ${penTxt}
          <div class="match-meta">${statusPill}</div>
          ${p.status === 'ao_vivo' ? renderCronometro(p, tempoPeriodoMin, 'mt-1') : ''}
        </div>
        <div class="team-side right">
          <div>
            ${v ? `<strong>${esc(v.nome)}</strong><span class="tiny muted" style="display:block">Visitante</span>` : renderSlotPlaceholder(p.visitante_placeholder)}
          </div>
          ${v ? renderBadgeEscudo(v) : `<span class="team-badge">⚽</span>`}
        </div>
      </a>
      <div class="score-card-bottom">
        <span class="muted">${esc(p.data_jogo)} às ${esc(p.hora_jogo)}</span>
        <div class="actions">
          ${mostrarBotaoArte ? `
            <button type="button" class="btn btn-light btn-xs"
              data-share-card
              data-jogo-numero="${numFmt}"
              data-titulo-arte="${esc(tituloArte)}"
              data-etiqueta="${esc(etiquetaArte)}"
              data-mandante-nome="${esc(nomeM)}"
              data-visitante-nome="${esc(nomeV)}"
              data-mandante-escudo="${esc(m?.escudo_url || '')}"
              data-visitante-escudo="${esc(v?.escudo_url || '')}"
              data-placar-texto="${esc(placarTxt)}"
              data-chave-texto="${esc(p.chave ? 'Chave ' + p.chave : p.titulo_fase)}"
              data-data-hora="${esc(p.data_jogo + ' às ' + p.hora_jogo)}"
              data-local="${esc(p.local || 'Estádio Tualdão')}">
              📲 Baixar Arte
            </button>
          ` : ''}
          <a class="tiny" style="font-weight:850;color:var(--blue)" href="/jogo/${p.id}${divQuery}">Detalhes →</a>
        </div>
      </div>
    </div>
  `;
}

function renderFlash(flash) {
  if (!flash || !flash.mensagem) return '';
  const tipo = ['success', 'error', 'warning', 'info'].includes(flash.tipo) ? flash.tipo : 'info';
  return `<div class="flash flash-${tipo}">${esc(flash.mensagem)}</div>`;
}

function renderModalInstalacaoMobile(nomeApp = 'Futebol 2026') {
  return `
    <div class="pwa-guide-modal" id="pwa-guide-modal" hidden>
      <div class="pwa-guide-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <img src="/assets/icons/apple-touch-icon.png" alt="Ícone do App" style="width:48px;height:48px;border-radius:12px">
            <div>
              <span class="tiny" style="font-weight:900;color:var(--blue);text-transform:uppercase">Aplicativo Oficial</span>
              <strong style="display:block;font-size:1.05rem;color:var(--blue-deep)">Instalar ${esc(nomeApp)}</strong>
            </div>
          </div>
          <button type="button" class="btn btn-light btn-xs" data-close-pwa-modal aria-label="Fechar">✕</button>
        </div>

        <div class="grid" style="gap:12px">
          <div style="background:#f4f8ff;border:1px solid #d4e3f8;border-radius:14px;padding:13px">
            <strong style="color:var(--blue-deep);display:block;margin-bottom:4px">🍎 No iPhone / iPad (iOS — Safari)</strong>
            <ol class="small mb-0" style="margin:0;padding-left:18px;line-height:1.6;color:#334663">
              <li>Toque no ícone <strong>Compartilhar (⬆️)</strong> na barra inferior do Safari.</li>
              <li>Role a lista e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
              <li>Confirme em <strong>"Adicionar"</strong> no canto superior direito.</li>
            </ol>
          </div>

          <div style="background:#f3fbf7;border:1px solid #bde9d2;border-radius:14px;padding:13px">
            <strong style="color:#065f46;display:block;margin-bottom:4px">🤖 No Android (Chrome / Samsung Internet)</strong>
            <ol class="small mb-0" style="margin:0;padding-left:18px;line-height:1.6;color:#334663">
              <li>Toque no menu <strong>⋮ (três pontos)</strong> no canto superior do navegador.</li>
              <li>Selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
            </ol>
          </div>
        </div>

        <button type="button" class="btn btn-primary btn-block mt-2" data-close-pwa-modal>Entendi</button>
      </div>
    </div>
  `;
}

function renderCampoSenha({ id = '', name = 'senha', placeholder = 'Digite sua senha', required = true, autocomplete = 'current-password', minlength = null, valor = '', extraClasses = '' } = {}) {
  const svgEyeOpen = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  return `
    <div class="password-field-wrapper">
      <input ${id ? `id="${esc(id)}"` : ''} class="input ${extraClasses}" type="password" name="${esc(name)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${minlength ? `minlength="${minlength}"` : ''} autocomplete="${esc(autocomplete)}" value="${esc(valor)}">
      <button type="button" class="btn-toggle-password" onclick="togglePasswordVisibility(this)" aria-label="Ver senha" title="Ver senha" tabindex="-1">
        ${svgEyeOpen}
      </button>
    </div>
  `;
}

function layoutPublico({ titulo, abaAtiva = 'inicio', campeonato, campeonatosAtivos = [], totalVisitas = 1, flash = null, autoRefresh = 0, conteudo }) {
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';
  const youtubeUrl = (campeonato.youtube_url || 'https://www.youtube.com/@SeeLigaaTV').trim();

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#06286E">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Futebol 2026">
  <meta name="format-detection" content="telephone=no">
  <meta name="description" content="${esc(campeonato.nome)} — ${esc(campeonato.orgao)}">
  <meta property="og:title" content="${esc(campeonato.nome)}">
  <meta property="og:description" content="Portal Oficial • Jogos ao vivo, classificação, chaveamento, artilharia, equipes e súmulas no ${esc(campeonato.estadio_padrao)}">
  <meta property="og:image" content="/assets/branding/escudo-campeonato-2026.png">
  <title>${esc(titulo ? `${titulo} • ${campeonato.nome_curto}` : campeonato.nome)}</title>
  <script src="/assets/js/device.js?v=3.0.0"></script>
  <link rel="stylesheet" href="/assets/css/app.css?v=3.0.0">
  <style>
    .brand-stack.brand-stack-3lines strong {
      font-family: 'Lufga', sans-serif;
      font-size: 0.74rem;
      font-weight: 800;
      line-height: 1.12;
      letter-spacing: 0.01em;
      text-transform: uppercase;
      color: var(--blue-deep);
    }
    .team-login-btn {
      position: relative; z-index: 1; overflow: hidden;
      display: inline-flex; align-items: center; justify-content: center;
      padding: 7px 15px; border-radius: 999px;
      background: transparent !important;
      color: #fff; font-family: 'Lufga', sans-serif; font-weight: 800; font-size: 0.75rem; white-space: nowrap;
      letter-spacing: -0.01em;
      box-shadow: 0 4px 14px rgba(6, 40, 110, 0.18);
      transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
      will-change: transform;
    }
    .team-login-btn .team-login-text {
      position: relative; z-index: 2;
    }
    .team-login-btn::before {
      content: ""; position: absolute; z-index: 0;
      left: 50%; top: 50%; width: 220px; height: 220px;
      background: conic-gradient(
        from 0deg,
        #ffd000 0deg,
        #7be495 65deg,
        #00c469 125deg,
        #38bdf8 200deg,
        #009fe3 265deg,
        #5eead4 315deg,
        #ffd000 360deg
      );
      transform: translate(-50%, -50%) rotate(0deg);
      animation: teamBorderSpin 6.5s linear infinite;
    }
    .team-login-btn::after {
      content: ""; position: absolute; z-index: 1;
      inset: 1.8px; border-radius: 999px;
      background: linear-gradient(135deg, #0057d9 0%, #06286e 60%, #083b8a 100%);
      transition: background 0.3s ease;
    }
    .team-login-btn:hover {
      transform: translateY(-1px) scale(1.05) rotate(-1.5deg);
      box-shadow: 0 10px 22px rgba(0, 159, 227, 0.32), 0 0 14px rgba(255, 208, 0, 0.35);
    }
    .team-login-btn:hover::before {
      animation-duration: 3.2s;
    }
    .team-login-btn:active {
      transform: translateY(0) scale(0.97) rotate(0deg);
    }
    @keyframes teamBorderSpin {
      from { transform: translate(-50%, -50%) rotate(0deg); }
      to { transform: translate(-50%, -50%) rotate(360deg); }
    }
    .hero-next-box {
      position: relative; z-index: 1; overflow: hidden;
      background: transparent !important;
      border: 0 !important;
      border-radius: 20px;
      padding: 16px 18px; min-width: 265px; text-align: center;
      box-shadow: 0 10px 26px rgba(4, 29, 82, 0.32);
      transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.35s ease;
      will-change: transform;
    }
    .hero-next-box > * {
      position: relative; z-index: 2;
    }
    .hero-next-box::before {
      content: ""; position: absolute; z-index: 0;
      left: 50%; top: 50%; width: 520px; height: 520px;
      background: conic-gradient(
        from 0deg,
        #ffd000 0deg,
        #7be495 65deg,
        #00c469 125deg,
        #38bdf8 200deg,
        #009fe3 265deg,
        #5eead4 315deg,
        #ffd000 360deg
      );
      transform: translate(-50%, -50%) rotate(0deg);
      animation: teamBorderSpin 6.5s linear infinite;
    }
    .hero-next-box::after {
      content: ""; position: absolute; z-index: 1;
      inset: 2px; border-radius: 18px;
      background: linear-gradient(
        135deg,
        rgba(6, 40, 110, 0.92) 0%,
        rgba(0, 87, 217, 0.88) 35%,
        rgba(0, 159, 227, 0.82) 68%,
        rgba(5, 110, 95, 0.86) 100%
      );
      background-size: 240% 240%;
      animation: nextMatchSurfaceFlow 7s ease-in-out infinite;
      backdrop-filter: blur(10px);
    }
    .hero-next-box:hover {
      transform: scale(1.06) rotate(-1.8deg);
      box-shadow: 0 16px 34px rgba(0, 159, 227, 0.38), 0 0 18px rgba(255, 208, 0, 0.35);
    }
    .hero-next-box:hover::before {
      animation-duration: 3.2s;
    }
    .hero-next-box:active {
      transform: scale(0.98) rotate(0deg);
    }
    @keyframes nextMatchSurfaceFlow {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
  </style>
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
</head>
<body data-public-championship="${campeonato.id}">
  ${campeonato.modo_homologacao ? `
    <div style="background:#fff3cd;border-bottom:1px solid #f2cf68;color:#6e5300;padding:8px 0;font-size:.82rem;text-align:center;font-weight:800">
      ⚠️ AMBIENTE EM MODO DE HOMOLOGAÇÃO / TESTES DA COMISSÃO ORGANIZADORA
    </div>
  ` : ''}
  <header class="public-top">
    <div class="container public-nav">
      <!-- 1. ESQUERDA: MARCA E TÍTULO DO CAMPEONATO -->
      <a class="brand" href="/${divQuery}">
        <img class="brand-championship-shield" src="/assets/branding/escudo-campeonato-2026.png" alt="Logo ${esc(campeonato.nome)}">
        <span class="brand-stack brand-stack-3lines">
          <strong>CAMPEONATO<br>QUITERIANOPOLENSE<br>DE FUTEBOL <span class="brand-year">${esc(campeonato.ano || 2026)}</span></strong>
        </span>
      </a>

      <!-- 2. CENTRO: CHANCELA INSTITUCIONAL (PREFEITURA & SECRETARIA) -->
      <div class="nav-center-gov">
        <img class="prefeitura-nav-logo" src="/assets/branding/logo-prefeitura.svg" alt="Prefeitura de Quiterianópolis">
        <div class="nav-gov-stack">
          <strong>Secretaria Municipal de Esportes</strong>
          <span>Avançando juntos, cuidando de todos.</span>
        </div>
      </div>

      <!-- 3. DIREITA: FERRAMENTAS E AÇÕES NOBRES -->
      <div class="nav-right-tools">
        ${youtubeUrl ? `
          <a class="public-youtube-link" href="${esc(youtubeUrl)}" target="_blank" rel="noopener noreferrer" title="Transmissão pelo YouTube" aria-label="Transmissão pelo YouTube">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>
          </a>
        ` : ''}
        <button type="button" class="btn-install-header" data-install-app>
          <span>📲</span> <strong>Instalar Aplicativo</strong>
        </button>
        <a class="team-login-btn" href="/dirigente">
          <span class="team-login-text">🛡️ Área da Equipe</span>
        </a>
      </div>
    </div>
    <div class="seq-menu-strip">
      <nav class="container public-links" aria-label="Menu principal em sequência">
        <a class="${abaAtiva === 'inicio' ? 'active' : ''}" href="/${divQuery}">Início</a>
        <a class="${abaAtiva === 'jogos' ? 'active' : ''}" href="/jogos${divQuery}">Jogos</a>
        <a class="${abaAtiva === 'classificacao' ? 'active' : ''}" href="/classificacao${divQuery}">Classificação</a>
        <a class="${abaAtiva === 'chaveamento' ? 'active' : ''}" href="/chaveamento${divQuery}">Mata-mata</a>
        <a class="${abaAtiva === 'artilharia' ? 'active' : ''}" href="/artilharia${divQuery}">Artilharia</a>
        <a class="${abaAtiva === 'equipes' ? 'active' : ''}" href="/equipes${divQuery}">Equipes</a>
        <a class="${abaAtiva === 'sumulas' ? 'active' : ''}" href="/sumulas${divQuery}">Súmulas</a>
        <a class="${abaAtiva === 'galeria' ? 'active' : ''}" href="/galeria${divQuery}">📸 Galeria</a>
        <a class="${abaAtiva === 'regulamento' ? 'active' : ''}" href="/regulamento${divQuery}">Regulamento</a>
        <a class="public-review-nav ${abaAtiva === 'avaliacoes' ? 'active' : ''}" href="/avaliacoes${divQuery}">★ Avaliações</a>
        <a class="${abaAtiva === 'ajuda' ? 'active' : ''}" href="/ajuda${divQuery}">Ajuda</a>
      </nav>
    </div>
    ${campeonatosAtivos.length > 1 ? `
      <div class="division-strip">
        <div class="container division-switch" role="navigation" aria-label="Selecionar competição">
          <span>Competição:</span>
          ${campeonatosAtivos.map(c => `
            <a class="${c.id === campeonato.id ? 'active' : ''}" href="?divisao=${c.id}">${esc(c.divisao_rotulo)}</a>
          `).join('')}
        </div>
      </div>
    ` : ''}
  </header>

  <main class="public-main" ${autoRefresh > 0 ? `data-auto-refresh="${autoRefresh}"` : ''}>
    ${flash ? `<div class="container mt-2">${renderFlash(flash)}</div>` : ''}
    ${conteudo}
  </main>

  <footer class="public-footer">
    <div class="container">
      <div class="public-footer-card">
        <div class="public-footer-grid">
          <div class="footer-branding">
            <img class="footer-championship-shield" src="/assets/branding/escudo-campeonato-2026.png" alt="Escudo Oficial">
            <div>
              <strong style="color:var(--blue-deep);font-size:1rem">${esc(campeonato.nome)}</strong>
              <div class="small mt-1">Acompanhe jogos ao vivo no ${esc(campeonato.estadio_padrao)}, classificação das chaves, mata-mata, artilharia, equipes e súmulas oficiais.</div>
              <div class="footer-metrics">
                <div class="footer-visit-counter" title="Acessos diários únicos registrados no portal">
                  <span>👁</span><strong style="color:var(--blue-deep)">${Number(totalVisitas).toLocaleString('pt-BR')}</strong><span>acessos</span>
                </div>
                <a class="pill gold" href="/avaliacoes${divQuery}">★ Avaliar o portal</a>
                <a class="pill" href="/dirigente">🛡️ Área do dirigente</a>
                <a class="pill" href="/admin">⚙️ Administração</a>
              </div>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <img src="/assets/branding/logo-prefeitura.svg" alt="Prefeitura de Quiterianópolis" style="max-height:58px;width:auto">
            <div class="small text-right">
              <strong style="color:var(--purple-gov)">Secretaria Municipal de Esportes</strong><br>
              Secretário: ${esc(campeonato.secretario_nome)}
            </div>
          </div>
        </div>
        <div class="footer-address">
          ${esc(campeonato.endereco_orgao)}
        </div>
      </div>
    </div>
  </footer>

  <a class="floating-help" href="/ajuda${divQuery}" aria-label="Central de Ajuda">
    <span>?</span><strong>Ajuda</strong>
  </a>

  <nav class="mobile-bottom">
    <a class="${abaAtiva === 'inicio' ? 'active' : ''}" href="/${divQuery}"><span>⌂</span>Início</a>
    <a class="${abaAtiva === 'jogos' ? 'active' : ''}" href="/jogos${divQuery}"><span>◫</span>Jogos</a>
    <a class="${abaAtiva === 'classificacao' ? 'active' : ''}" href="/classificacao${divQuery}"><span>≡</span>Tabela</a>
    <a class="${abaAtiva === 'chaveamento' ? 'active' : ''}" href="/chaveamento${divQuery}"><span>🏆</span>Finais</a>
    <a class="${abaAtiva === 'artilharia' ? 'active' : ''}" href="/artilharia${divQuery}"><span>⚽</span>Gols</a>
    <a class="${abaAtiva === 'equipes' ? 'active' : ''}" href="/equipes${divQuery}"><span>🛡️</span>Clubes</a>
  </nav>

  ${renderModalInstalacaoMobile('Futebol Quiterianópolis 2026')}

  <script src="/assets/js/cronometro.js?v=2.1.0" defer></script>
  <script src="/assets/js/card-social.js?v=2.1.0" defer></script>
  <script src="/assets/js/app.js?v=2.1.0" defer></script>
</body>
</html>`;
}

function layoutAdmin({ titulo, subtitulo = '', secao = 'dashboard', campeonato, todosCampeonatos = [], admin, flash = null, conteudo }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#06286E">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Admin Esporte">
  <title>${esc(titulo)} • Administração Quiterianópolis 2026</title>
  <script src="/assets/js/device.js?v=3.0.0"></script>
  <link rel="stylesheet" href="/assets/css/app.css?v=3.0.0">
  <link rel="manifest" href="/admin-manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
</head>
<body>
  <div class="admin-layout">
    <header class="public-top">
      <div class="container public-nav">
        <a class="brand" href="/admin">
          <img class="brand-championship-shield" src="/assets/branding/escudo-campeonato-2026.png" alt="Logo">
          <span class="brand-stack">
            <small>Comissão Organizadora • Admin</small>
            <strong>${esc(titulo)}</strong>
          </span>
        </a>
        <div class="nav-right-tools">
          ${todosCampeonatos.length > 1 ? `
            <form method="get" action="/admin/trocar-campeonato" style="margin:0">
              <select class="select" name="id" data-auto-submit style="padding:7px 12px;font-weight:800;font-size:.82rem">
                ${todosCampeonatos.map(c => `<option value="${c.id}" ${c.id === campeonato.id ? 'selected' : ''}>${esc(c.divisao_rotulo)} (${c.ano})</option>`).join('')}
              </select>
            </form>
          ` : `<span class="pill gold mobile-preview-text">${esc(campeonato.divisao_rotulo)}</span>`}
          <a class="btn btn-light btn-sm" href="/" target="_blank">🌐 <span class="mobile-preview-text">Portal Público</span></a>
          <a class="btn btn-danger btn-sm" href="/admin/sair">🚪 Sair</a>
        </div>
      </div>
      <div class="seq-menu-strip">
        <nav class="container public-links" aria-label="Menu administrativo em sequência">
          <a class="${secao === 'dashboard' ? 'active' : ''}" href="/admin">📊 Visão Geral</a>
          <a class="${secao === 'partidas' ? 'active' : ''}" href="/admin/partidas">⚽ Partidas e Ao Vivo</a>
          <a class="${secao === 'equipes' ? 'active' : ''}" href="/admin/equipes">🛡️ Equipes</a>
          <a class="${secao === 'atletas' ? 'active' : ''}" href="/admin/atletas">👟 Atletas</a>
          <a class="${secao === 'galeria' ? 'active' : ''}" href="/admin/galeria">📸 Galeria</a>
          <a class="${secao === 'adiamentos' ? 'active' : ''}" href="/admin/adiamentos">📅 Adiamentos</a>
          <a class="${secao === 'documentos' ? 'active' : ''}" href="/admin/documentos">✍️ Docs</a>
          <a class="${secao === 'avaliacoes' ? 'active' : ''}" href="/admin/avaliacoes">★ Avaliações</a>
          <a class="${secao === 'financeiro' ? 'active' : ''}" href="/admin/financeiro">💰 Financeiro</a>
          <a class="${secao === 'relatorios' ? 'active' : ''}" href="/admin/relatorios">🖨️ Relatórios</a>
          <a class="${secao === 'configuracoes' ? 'active' : ''}" href="/admin/configuracoes">⚙️ Configurações</a>
        </nav>
      </div>
    </header>
    <div class="admin-main">
      <div class="admin-content">
        ${subtitulo ? `<p class="muted small mt-0 mb-2">${esc(subtitulo)}</p>` : ''}
        ${renderFlash(flash)}
        ${conteudo}
      </div>
    </div>
  </div>
  <nav class="admin-mobile-nav">
    <a class="${secao === 'dashboard' ? 'active' : ''}" href="/admin"><span>📊</span>Início</a>
    <a class="${secao === 'partidas' ? 'active' : ''}" href="/admin/partidas"><span>⚽</span>Jogos</a>
    <a class="${secao === 'atletas' ? 'active' : ''}" href="/admin/atletas"><span>👟</span>Atletas</a>
    <a class="${secao === 'equipes' ? 'active' : ''}" href="/admin/equipes"><span>🛡️</span>Clubes</a>
    <a class="${secao === 'configuracoes' ? 'active' : ''}" href="/admin/configuracoes"><span>⚙️</span>Ajustes</a>
  </nav>
  ${renderModalInstalacaoMobile('Admin Esporte 2026')}
  <script src="/assets/js/cronometro.js?v=2.1.0" defer></script>
  <script src="/assets/js/card-social.js?v=2.1.0" defer></script>
  <script src="/assets/js/app.js?v=2.1.0" defer></script>
</body>
</html>`;
}

module.exports = {
  esc,
  moeda,
  segundosAtuaisCronometro,
  renderCronometro,
  renderBadgeEscudo,
  renderSlotPlaceholder,
  renderCardJogo,
  renderFlash,
  renderModalInstalacaoMobile,
  renderCampoSenha,
  layoutPublico,
  layoutAdmin
};
