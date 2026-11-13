'use strict';

const {
  esc,
  moeda,
  renderCronometro,
  renderBadgeEscudo,
  renderSlotPlaceholder,
  renderCardJogo,
  layoutPublico
} = require('./helpers');

function montarMapaEquipes(equipes) {
  const m = {};
  for (const e of equipes) m[e.id] = e;
  return m;
}

function paginaInicial(ctx) {
  const { campeonato, campeonatosAtivos, equipes, partidas, classificacao, estatisticas, totalVisitas, flash } = ctx;
  const equipesMap = montarMapaEquipes(equipes);
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const aoVivo = partidas.filter(p => p.status === 'ao_vivo');
  const proximos = partidas.filter(p => p.status === 'agendada');
  const encerrados = [...partidas.filter(p => p.status === 'encerrada')].reverse().slice(0, 6);

  const campeao = campeonato.campeao_equipe_id ? equipesMap[campeonato.campeao_equipe_id] : null;
  const vice = campeonato.vice_equipe_id ? equipesMap[campeonato.vice_equipe_id] : null;

  const totalIncentivos = Number(campeonato.incentivo_por_equipe || 0) * equipes.length;
  const totalPremios = Number(campeonato.premiacao_1 || 0) + Number(campeonato.premiacao_2 || 0) + Number(campeonato.premiacao_3 || 0) + Number(campeonato.premiacao_4 || 0);
  const somaGeralPremiacao = totalIncentivos + totalPremios;

  let proxBoxHtml = '';
  if (aoVivo.length) {
    const p = aoVivo[0];
    const m = p.mandante_id ? equipesMap[p.mandante_id] : null;
    const v = p.visitante_id ? equipesMap[p.visitante_id] : null;
    proxBoxHtml = `
      <a class="hero-next-box" href="/jogo/${p.id}${divQuery}">
        <div class="hero-next-header">
          <span class="hero-next-badge" style="background:#dc2626;color:#fff;border-color:#fca5a5">
            🔴 ACONTECENDO AGORA • JOGO ${String(p.numero_jogo).padStart(2, '0')}
          </span>
        </div>
        <div class="hero-next-teams">
          <div class="hero-next-team-item">
            ${m?.escudo_url ? `<img src="${esc(m.escudo_url)}" alt="${esc(m.nome)}">` : ''}
            <span class="team-name">${esc(m ? m.nome : p.mandante_placeholder)}</span>
          </div>
          <span class="hero-next-vs">${Number(p.gols_mandante ?? 0)} × ${Number(p.gols_visitante ?? 0)}</span>
          <div class="hero-next-team-item">
            ${v?.escudo_url ? `<img src="${esc(v.escudo_url)}" alt="${esc(v.nome)}">` : ''}
            <span class="team-name">${esc(v ? v.nome : p.visitante_placeholder)}</span>
          </div>
        </div>
        <div class="hero-next-meta">
          <span>📍 ${esc(p.local || campeonato.estadio_padrao)}</span>
          <span class="meta-dot">•</span>
          <span>Acompanhe o lance a lance</span>
        </div>
      </a>
    `;
  } else if (proximos.length) {
    const dataProx = proximos[0].data_jogo;
    const jogosData = proximos.filter(p => p.data_jogo === dataProx);

    if (jogosData.length >= 2) {
      // RODADA DUPLA COM SWITCHER HARMONIOSO (Mantém proporção idêntica e perfeita do card)
      const j1 = jogosData[0];
      const j2 = jogosData[1];
      const m1 = j1.mandante_id ? equipesMap[j1.mandante_id] : null;
      const v1 = j1.visitante_id ? equipesMap[j1.visitante_id] : null;
      const m2 = j2.mandante_id ? equipesMap[j2.mandante_id] : null;
      const v2 = j2.visitante_id ? equipesMap[j2.visitante_id] : null;

      proxBoxHtml = `
        <div class="hero-next-box hero-next-box-carousel" id="hero-next-box-carousel">
          <div class="hero-next-header">
            <div class="hero-switcher-tabs" role="tablist">
              <button type="button" class="hero-tab-pill active" onclick="switchHeroMatch(0, this)" role="tab" aria-selected="true">
                <span>JOGO ${String(j1.numero_jogo).padStart(2, '0')}</span> • <strong>${esc(j1.hora_jogo)}</strong>
              </button>
              <button type="button" class="hero-tab-pill" onclick="switchHeroMatch(1, this)" role="tab" aria-selected="false">
                <span>JOGO ${String(j2.numero_jogo).padStart(2, '0')}</span> • <strong>${esc(j2.hora_jogo)}</strong>
              </button>
            </div>
          </div>

          <!-- JOGO 1: 17:00 -->
          <a class="hero-match-panel active" id="hero-panel-0" href="/jogo/${j1.id}${divQuery}">
            <div class="hero-panel-subbadge">⚽ SÁBADO, ${esc(dataProx)} • ${esc(j1.chave ? 'CHAVE ' + j1.chave : j1.fase)}</div>
            <div class="hero-next-teams">
              <div class="hero-next-team-item">
                ${m1?.escudo_url ? `<img src="${esc(m1.escudo_url)}" alt="${esc(m1.nome)}">` : '<div class="shield-mini-ph">⚽</div>'}
                <span class="team-name">${esc(m1 ? m1.nome : j1.mandante_placeholder || 'A definir')}</span>
              </div>
              <span class="hero-next-vs">×</span>
              <div class="hero-next-team-item">
                ${v1?.escudo_url ? `<img src="${esc(v1.escudo_url)}" alt="${esc(v1.nome)}">` : '<div class="shield-mini-ph">⚽</div>'}
                <span class="team-name">${esc(v1 ? v1.nome : j1.visitante_placeholder || 'A definir')}</span>
              </div>
            </div>
            <div class="hero-next-meta">
              <span>📅 ${esc(dataProx)} às ${esc(j1.hora_jogo)}</span>
              <span class="meta-dot">•</span>
              <span>📍 ${esc(j1.local || campeonato.estadio_padrao)}</span>
            </div>
          </a>

          <!-- JOGO 2: 18:45 -->
          <a class="hero-match-panel" id="hero-panel-1" href="/jogo/${j2.id}${divQuery}" style="display:none">
            <div class="hero-panel-subbadge">⚽ SÁBADO, ${esc(dataProx)} • ${esc(j2.chave ? 'CHAVE ' + j2.chave : j2.fase)}</div>
            <div class="hero-next-teams">
              <div class="hero-next-team-item">
                ${m2?.escudo_url ? `<img src="${esc(m2.escudo_url)}" alt="${esc(m2.nome)}">` : '<div class="shield-mini-ph">⚽</div>'}
                <span class="team-name">${esc(m2 ? m2.nome : j2.mandante_placeholder || 'A definir')}</span>
              </div>
              <span class="hero-next-vs">×</span>
              <div class="hero-next-team-item">
                ${v2?.escudo_url ? `<img src="${esc(v2.escudo_url)}" alt="${esc(v2.nome)}">` : '<div class="shield-mini-ph">⚽</div>'}
                <span class="team-name">${esc(v2 ? v2.nome : j2.visitante_placeholder || 'A definir')}</span>
              </div>
            </div>
            <div class="hero-next-meta">
              <span>📅 ${esc(dataProx)} às ${esc(j2.hora_jogo)}</span>
              <span class="meta-dot">•</span>
              <span>📍 ${esc(j2.local || campeonato.estadio_padrao)}</span>
            </div>
          </a>
        </div>
      `;
    } else {
      // JOGO ÚNICO
      const proxDestaque = proximos[0];
      const m = proxDestaque.mandante_id ? equipesMap[proxDestaque.mandante_id] : null;
      const v = proxDestaque.visitante_id ? equipesMap[proxDestaque.visitante_id] : null;
      proxBoxHtml = `
        <a class="hero-next-box" href="/jogo/${proxDestaque.id}${divQuery}">
          <div class="hero-next-header">
            <span class="hero-next-badge">
              ⚽ PRÓXIMO JOGO • JOGO ${String(proxDestaque.numero_jogo).padStart(2, '0')}
            </span>
          </div>
          <div class="hero-next-teams">
            <div class="hero-next-team-item">
              ${m?.escudo_url ? `<img src="${esc(m.escudo_url)}" alt="${esc(m.nome)}">` : ''}
              <span class="team-name">${esc(m ? m.nome : proxDestaque.mandante_placeholder)}</span>
            </div>
            <span class="hero-next-vs">×</span>
            <div class="hero-next-team-item">
              ${v?.escudo_url ? `<img src="${esc(v.escudo_url)}" alt="${esc(v.nome)}">` : ''}
              <span class="team-name">${esc(v ? v.nome : proxDestaque.visitante_placeholder)}</span>
            </div>
          </div>
          <div class="hero-next-meta">
            <span>📅 ${esc(proxDestaque.data_jogo)} às ${esc(proxDestaque.hora_jogo)}</span>
            <span class="meta-dot">•</span>
            <span>📍 ${esc(proxDestaque.local)}</span>
          </div>
        </a>
      `;
    }
  }

  const conteudo = `
    <section class="quiteria-hero">
      <div class="container quiteria-hero-grid">
        <img class="hero-shield-3d" src="/assets/branding/escudo-campeonato-2026.png" alt="Logo Oficial ${esc(campeonato.nome)}">
        <div>
          <h1>CAMPEONATO<br>QUITERIANOPOLENSE<br><span>DE FUTEBOL ${esc(campeonato.ano)}</span></h1>
          <p>Acompanhe em tempo real os 19 jogos oficiais no <strong>${esc(campeonato.estadio_padrao)}</strong>, tabelas das Chaves A, B, C e D, chaveamento das finais, artilharia, elencos e súmulas.</p>
          <div class="actions">
            <a class="btn btn-gold btn-sm" href="/jogos${divQuery}">⚽ Ver Tabela</a>
            <a class="btn btn-outline btn-sm" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.32);backdrop-filter:blur(6px)" href="/classificacao${divQuery}">📊 Classificação</a>
            <a class="btn btn-outline btn-sm" style="background:rgba(255,255,255,.14);color:#fff;border-color:rgba(255,255,255,.32);backdrop-filter:blur(6px)" href="/chaveamento${divQuery}">🏆 Mata-mata</a>
          </div>
        </div>
        ${proxBoxHtml}
      </div>
    </section>

    <div class="container">
      ${campeao ? `
        <div class="card mt-3" style="background:linear-gradient(135deg,#06286E,#0057D9 60%,#00A859);color:#fff;display:flex;align-items:center;gap:18px;flex-wrap:wrap">
          <div style="font-size:2.8rem;background:#fff8d6;width:72px;height:72px;border-radius:20px;display:grid;place-items:center">🏆</div>
          <div>
            <span class="pill gold">CAMPEÃO OFICIAL ${esc(campeonato.ano)}</span>
            <h2 style="margin:6px 0 4px;font-size:1.7rem">${esc(campeao.nome)}</h2>
            <div class="small" style="color:#e0f2fe">${vice ? `Vice-campeão: ${esc(vice.nome)} • ` : ''}${esc(campeonato.estadio_padrao)}</div>
          </div>
        </div>
      ` : ''}

      ${aoVivo.length ? `
        <section class="live-home-showcase">
          <div class="live-home-topline">
            <span class="live-home-badge"><span class="live-home-dot"></span> Partida ao vivo no ${esc(campeonato.estadio_padrao)}</span>
            <span class="tiny muted">Atualização automática em tempo real</span>
          </div>
          ${aoVivo.map(j => {
            const m = j.mandante_id ? equipesMap[j.mandante_id] : null;
            const v = j.visitante_id ? equipesMap[j.visitante_id] : null;
            return `
              <a class="live-home-match" href="/jogo/${j.id}${divQuery}">
                <div class="team-side">
                  ${renderBadgeEscudo(m, 'team-badge-lg')}
                  <div>
                    <small class="tiny muted">MANDANTE</small>
                    <strong style="display:block;font-size:1.1rem">${esc(m?.nome || j.mandante_placeholder)}</strong>
                  </div>
                </div>
                <div class="text-center">
                  <span class="pill live">JOGO ${String(j.numero_jogo).padStart(2, '0')} ${j.chave ? '• CHAVE ' + esc(j.chave) : ''}</span>
                  <div class="live-home-score">
                    <span>${Number(j.gols_mandante ?? 0)}</span>
                    <b style="font-size:1.2rem;color:var(--muted)">×</b>
                    <span>${Number(j.gols_visitante ?? 0)}</span>
                  </div>
                  ${renderCronometro(j, campeonato.tempo_periodo_min)}
                </div>
                <div class="team-side right">
                  <div>
                    <small class="tiny muted">VISITANTE</small>
                    <strong style="display:block;font-size:1.1rem">${esc(v?.nome || j.visitante_placeholder)}</strong>
                  </div>
                  ${renderBadgeEscudo(v, 'team-badge-lg')}
                </div>
              </a>
            `;
          }).join('')}
        </section>
      ` : ''}

      <div class="grid grid-4 mt-3">
        <div class="card kpi">
          <div class="icon">🛡️</div>
          <div class="value">${equipes.length} Equipes</div>
          <div class="label">4 Chaves (A, B, C e D)</div>
        </div>
        <div class="card kpi">
          <div class="icon">📅</div>
          <div class="value">${esc(campeonato.data_abertura.slice(0, 5))}</div>
          <div class="label">Abertura • Final em ${esc(campeonato.data_final.slice(0, 5))}</div>
        </div>
        <div class="card kpi">
          <div class="icon">🏟️</div>
          <div class="value">${partidas.length} Jogos</div>
          <div class="label">${esc(campeonato.estadio_padrao)}</div>
        </div>
        <div class="card kpi">
          <div class="icon">🏆</div>
          <div class="value">Top 8</div>
          <div class="label">Avançam às Quartas de Final</div>
        </div>
      </div>

      ${campeonato.exibir_premiacao ? `
        <div class="prize-showcase mt-3">
          <div>
            <span class="pill gold">PREMIAÇÃO E INCENTIVOS OFICIAIS</span>
            <h2 style="margin:10px 0 6px;font-size:2rem">${moeda(somaGeralPremiacao)} previstos</h2>
            <p class="small" style="color:#dbeafe;margin:0;line-height:1.55">
              ${totalIncentivos > 0 ? `Incentivos às equipes: <strong>${moeda(totalIncentivos)}</strong> + ` : ''}
              Premiação oficial: <strong>${moeda(totalPremios)}</strong>.
            </p>
          </div>
          <div class="prize-grid">
            <div class="prize-item champion"><span>🏆</span><small>Campeão</small><strong>${moeda(campeonato.premiacao_1)}</strong></div>
            <div class="prize-item"><span>🥈</span><small>Vice</small><strong>${moeda(campeonato.premiacao_2)}</strong></div>
            ${campeonato.premiacao_3 > 0 ? `<div class="prize-item"><span>🥉</span><small>3º Lugar</small><strong>${moeda(campeonato.premiacao_3)}</strong></div>` : ''}
            ${campeonato.premiacao_4 > 0 ? `<div class="prize-item"><span>🏅</span><small>4º Lugar</small><strong>${moeda(campeonato.premiacao_4)}</strong></div>` : ''}
          </div>
        </div>
      ` : ''}

      <div class="grid grid-2 mt-3">
        <section>
          <div class="section-head" style="margin-top:4px">
            <div>
              <h2>Próximos jogos</h2>
              <p>Agenda oficial • ${esc(campeonato.estadio_padrao)}</p>
            </div>
            <a class="small" style="font-weight:850;color:var(--blue)" href="/jogos${divQuery}">Ver todos os 19 jogos →</a>
          </div>
          <div class="grid">
            ${proximos.length
              ? proximos.map(p => renderCardJogo(p, { equipesMap, tempoPeriodoMin: campeonato.tempo_periodo_min, divQuery })).join('')
              : `<div class="card empty">Não há jogos agendados pendentes no momento.</div>`}
          </div>
        </section>

        <section>
          <div class="section-head" style="margin-top:4px">
            <div>
              <h2>Últimos resultados</h2>
              <p>Partidas encerradas e homologadas</p>
            </div>
            <a class="small" style="font-weight:850;color:var(--blue)" href="/sumulas${divQuery}">Súmulas →</a>
          </div>
          <div class="grid">
            ${encerrados.length
              ? encerrados.map(p => renderCardJogo(p, { equipesMap, tempoPeriodoMin: campeonato.tempo_periodo_min, divQuery })).join('')
              : `
                <div class="card" style="text-align:center;padding:28px 20px">
                  <div style="font-size:2.4rem;margin-bottom:8px">⚽</div>
                  <h3 class="card-title mb-1">Abertura Oficial em ${esc(campeonato.data_abertura)}!</h3>
                  <p class="muted small mb-2">Os resultados, estatísticas, súmulas e chaveamentos serão atualizados automaticamente aqui assim que as partidas forem encerradas no ${esc(campeonato.estadio_padrao)}.</p>
                  <a class="btn btn-light btn-sm" href="/documentos/Tabela_Oficial_Quiterianopolis_2026.pdf" target="_blank">📄 Baixar Tabela Oficial em PDF</a>
                </div>
              `}
          </div>
        </section>
      </div>

      <div class="section-head">
        <div>
          <h2>Chaves e Classificação</h2>
          <p>4 chaves de 3 equipes • As 8 melhores campanhas avançam às Quartas de Final (1º×8º, 2º×7º, 3º×6º e 4º×5º)</p>
        </div>
        <a class="small" style="font-weight:850;color:var(--blue)" href="/classificacao${divQuery}">Classificação Geral completa →</a>
      </div>
      <div class="grid grid-2">
        ${Object.keys(classificacao.chaves).sort().map(ch => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span class="pill chave-tag">CHAVE ${esc(ch)}</span>
              <span class="tiny muted">Triangular • 2 jogos por clube</span>
            </div>
            <div class="table-wrap">
              <table class="table standings">
                <thead>
                  <tr><th>#</th><th>Equipe</th><th>J</th><th>V</th><th>SG</th><th>P</th></tr>
                </thead>
                <tbody>
                  ${classificacao.chaves[ch].map(item => `
                    <tr class="${item.classificado ? 'qualified' : ''}">
                      <td>${item.posicaoChave}</td>
                      <td>
                        <a href="/equipe/${item.id}${divQuery}" style="display:flex;align-items:center;gap:9px">
                          ${renderBadgeEscudo(item.equipe)}
                          <div>
                            <strong>${esc(item.nome)}</strong>
                            <span class="tiny muted" style="display:block">${item.posicaoGeral}º no Geral</span>
                          </div>
                        </a>
                      </td>
                      <td>${item.j}</td>
                      <td>${item.v}</td>
                      <td>${item.sg > 0 ? `+${item.sg}` : item.sg}</td>
                      <td><strong style="color:var(--blue-deep);font-size:.98rem">${item.p}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid grid-2 mt-3">
        <div>
          <div class="section-head" style="margin-top:0">
            <div>
              <h2>Artilharia</h2>
              <p>Principais goleadores no ${esc(campeonato.estadio_padrao)}</p>
            </div>
            <a class="small" style="font-weight:850;color:var(--blue)" href="/artilharia${divQuery}">Estatísticas completas →</a>
          </div>
          <div class="card">
            ${estatisticas.artilharia.length ? `
              <div class="table-wrap">
                <table class="table">
                  <thead><tr><th>#</th><th>Atleta</th><th>Equipe</th><th>Gols</th></tr></thead>
                  <tbody>
                    ${estatisticas.artilharia.slice(0, 5).map((a, idx) => `
                      <tr>
                        <td><strong>${idx + 1}º</strong></td>
                        <td><strong>${esc(a.apelido || a.nome)}</strong></td>
                        <td>${esc(a.equipe_nome)}</td>
                        <td><span class="pill ok">⚽ ${a.gols}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `<div class="empty">Os gols marcados aparecerão aqui a partir da rodada de abertura.</div>`}
          </div>
        </div>

        <div>
          <div class="section-head" style="margin-top:0">
            <div>
              <h2>Participação e Dúvidas</h2>
              <p>Avalie o portal ou consulte as normas oficiais</p>
            </div>
          </div>
          <div class="grid">
            <div class="card" style="background:linear-gradient(135deg,#fffef7,#fff8dc);border-color:#efd36c;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
              <div>
                <span class="tiny" style="font-weight:900;color:#8a6800;text-transform:uppercase">★ Participe do Portal</span>
                <strong style="display:block;font-size:1.02rem;margin-top:2px">O que está achando do Campeonato 2026?</strong>
                <span class="small muted">Dê sua nota de 0 a 10 e deixe um comentário no mural da torcida.</span>
              </div>
              <a class="btn btn-gold btn-sm" href="/avaliacoes${divQuery}">Avaliar agora</a>
            </div>
            <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap">
              <div>
                <span class="tiny" style="font-weight:900;color:var(--blue);text-transform:uppercase">Central de Ajuda & Tabela PDF</span>
                <strong style="display:block;font-size:1.02rem;margin-top:2px">Entenda o formato das chaves e cruzamentos</strong>
                <span class="small muted">Veja como funcionam Vencedor/Perdedor Jogo 01–04 e as Quartas de Final.</span>
              </div>
              <div class="actions">
                <a class="btn btn-primary btn-sm" href="/ajuda${divQuery}">Tirar dúvidas</a>
                <a class="btn btn-light btn-sm" href="/documentos/Tabela_Oficial_Quiterianopolis_2026.pdf" target="_blank">📄 PDF Oficial</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: '',
    abaAtiva: 'inicio',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    autoRefresh: 30000,
    conteudo
  });
}

function paginaJogos(ctx) {
  const { campeonato, campeonatosAtivos, equipes, partidas, totalVisitas, flash } = ctx;
  const equipesMap = montarMapaEquipes(equipes);
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Tabela Oficial de Jogos (${partidas.length} Partidas)</h2>
          <p>${esc(campeonato.nome)} • Todas as partidas no ${esc(campeonato.estadio_padrao)}</p>
        </div>
        <div class="actions">
          <a class="btn btn-light btn-sm" href="/documentos/Tabela_Oficial_Quiterianopolis_2026.pdf" target="_blank">📄 Tabela Assinada (PDF)</a>
          <button type="button" class="btn btn-outline btn-sm no-print" data-print>🖨️ Imprimir</button>
        </div>
      </div>

      <div class="filter-bar no-print">
        <button type="button" class="filter-chip active" data-match-filter="todos">Todos (${partidas.length})</button>
        <button type="button" class="filter-chip" data-match-filter="grupos">1ª Fase (Jogos 01–12)</button>
        <button type="button" class="filter-chip" data-match-filter="chave:A">Chave A</button>
        <button type="button" class="filter-chip" data-match-filter="chave:B">Chave B</button>
        <button type="button" class="filter-chip" data-match-filter="chave:C">Chave C</button>
        <button type="button" class="filter-chip" data-match-filter="chave:D">Chave D</button>
        <button type="button" class="filter-chip" data-match-filter="quartas">Quartas (13–16)</button>
        <button type="button" class="filter-chip" data-match-filter="semifinal">Semifinais (17–18)</button>
        <button type="button" class="filter-chip" data-match-filter="final">Grande Final (19)</button>
      </div>

      <div class="grid grid-2">
        ${partidas.map(p => renderCardJogo(p, { equipesMap, tempoPeriodoMin: campeonato.tempo_periodo_min, divQuery })).join('')}
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: 'Jogos',
    abaAtiva: 'jogos',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    autoRefresh: 30000,
    conteudo
  });
}

function paginaDetalheJogo(ctx) {
  const { campeonato, campeonatosAtivos, equipes, partida, eventos, relacionados, comissaoMandante, comissaoVisitante, craque, totalVisitas, flash } = ctx;
  const equipesMap = montarMapaEquipes(equipes);
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';
  const m = partida.mandante_id ? equipesMap[partida.mandante_id] : null;
  const v = partida.visitante_id ? equipesMap[partida.visitante_id] : null;

  const numFmt = String(partida.numero_jogo).padStart(2, '0');
  const temPlacar = partida.status === 'ao_vivo' || partida.status === 'encerrada';
  const placarTxt = temPlacar ? `${Number(partida.gols_mandante ?? 0)} × ${Number(partida.gols_visitante ?? 0)}` : '×';

  const relM = relacionados.filter(r => r.equipe_id === partida.mandante_id);
  const relV = relacionados.filter(r => r.equipe_id === partida.visitante_id);

  const iconeEvento = t => ({
    gol: '⚽', gol_contra: '⚽', amarelo: '🟨', vermelho: '🟥',
    substituicao: '🔄', acrescimo: '⏱️', ocorrencia: '📝'
  }[t] || '📝');

  const rotuloEvento = t => ({
    gol: 'Gol', gol_contra: 'Gol Contra', amarelo: 'Cartão Amarelo', vermelho: 'Cartão Vermelho',
    substituicao: 'Substituição', acrescimo: 'Acréscimos', ocorrencia: 'Ocorrência'
  }[t] || 'Lance');

  const conteudo = `
    <div class="container mt-3">
      <div class="card text-center">
        <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
          <span class="pill gold">JOGO ${numFmt} • ${esc(partida.chave ? 'Chave ' + partida.chave : partida.titulo_fase)}</span>
          ${partida.status === 'ao_vivo' ? `<span class="pill live">● AO VIVO</span>` : (partida.status === 'encerrada' ? `<span class="pill ok">Partida Encerrada</span>` : `<span class="pill">Agendada</span>`)}
        </div>
        <p class="muted small mt-0">${esc(partida.data_jogo)} às ${esc(partida.hora_jogo)} • <strong>${esc(partida.local)}</strong></p>

        <div class="score-card" style="max-width:780px;margin:0 auto">
          <div class="team-side">
            ${m ? renderBadgeEscudo(m, 'team-badge-xl') : `<span class="team-badge team-badge-xl">⚽</span>`}
            <div>
              ${m ? `<h2 class="mt-0 mb-0" style="font-size:1.35rem"><a href="/equipe/${m.id}${divQuery}">${esc(m.nome)}</a></h2><span class="tiny muted">Mandante</span>` : renderSlotPlaceholder(partida.mandante_placeholder)}
            </div>
          </div>
          <div class="score-box">
            <div class="score" style="font-size:2.5rem">${placarTxt}</div>
            ${partida.penaltis_mandante !== null && partida.penaltis_visitante !== null ? `<div class="pill warn mt-1">Pênaltis: ${partida.penaltis_mandante} × ${partida.penaltis_visitante}</div>` : ''}
            ${renderCronometro(partida, campeonato.tempo_periodo_min, 'mt-1')}
          </div>
          <div class="team-side right">
            <div>
              ${v ? `<h2 class="mt-0 mb-0" style="font-size:1.35rem"><a href="/equipe/${v.id}${divQuery}">${esc(v.nome)}</a></h2><span class="tiny muted">Visitante</span>` : renderSlotPlaceholder(partida.visitante_placeholder)}
            </div>
            ${v ? renderBadgeEscudo(v, 'team-badge-xl') : `<span class="team-badge team-badge-xl">⚽</span>`}
          </div>
        </div>

        <div class="actions mt-2" style="justify-content:center">
          <button type="button" class="btn btn-gold btn-sm"
            data-share-card
            data-jogo-numero="${numFmt}"
            data-titulo-arte="${partida.status === 'encerrada' ? 'FIM DE JOGO' : (partida.status === 'ao_vivo' ? 'AO VIVO' : 'DIA DE JOGO')}"
            data-etiqueta="JOGO ${numFmt} • ${esc(partida.chave ? 'CHAVE ' + partida.chave : partida.fase.toUpperCase())}"
            data-mandante-nome="${esc(m?.nome || partida.mandante_placeholder)}"
            data-visitante-nome="${esc(v?.nome || partida.visitante_placeholder)}"
            data-mandante-escudo="${esc(m?.escudo_url || '')}"
            data-visitante-escudo="${esc(v?.escudo_url || '')}"
            data-placar-texto="${esc(placarTxt)}"
            data-chave-texto="${esc(partida.chave ? 'Chave ' + partida.chave : partida.titulo_fase)}"
            data-data-hora="${esc(partida.data_jogo + ' às ' + partida.hora_jogo)}"
            data-local="${esc(partida.local)}">
            📲 Baixar Card Oficial (WhatsApp / Instagram)
          </button>
          <a class="btn btn-light btn-sm" href="/sumula/${partida.id}" target="_blank">📄 Visualizar / Imprimir Súmula</a>
          ${partida.sumula_pdf_url ? `<a class="btn btn-success btn-sm" href="${esc(partida.sumula_pdf_url)}" target="_blank">📑 Súmula Assinada (PDF)</a>` : ''}
        </div>
      </div>

      ${craque ? `
        <div class="card mt-3" style="background:linear-gradient(135deg,#fffef5,#fff5cc);border-color:var(--gold);display:flex;align-items:center;gap:14px">
          <span style="font-size:2rem">⭐</span>
          <div>
            <span class="tiny" style="font-weight:900;color:#855500;text-transform:uppercase">Destaque Oficial</span>
            <strong style="display:block;font-size:1.1rem;color:var(--blue-deep)">Craque da Partida: ${esc(craque.apelido || craque.nome)} (${esc(craque.equipe_nome)})</strong>
          </div>
        </div>
      ` : ''}

      <div class="grid grid-2 mt-3">
        <section class="card">
          <h3 class="card-title">⏱️ Linha do Tempo da Partida</h3>
          ${eventos.length ? `
            <div class="timeline">
              ${eventos.map(ev => `
                <div class="timeline-item">
                  <div class="timeline-min">${esc(ev.minuto ? `${ev.minuto}'` : ev.periodo)}</div>
                  <div>
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      <span>${iconeEvento(ev.tipo)}</span>
                      <strong>${rotuloEvento(ev.tipo)}</strong>
                      ${ev.equipe_nome ? `<span class="pill">${esc(ev.equipe_nome)}</span>` : ''}
                    </div>
                    ${ev.atleta_nome ? `<div style="font-weight:750;margin-top:3px">${ev.tipo === 'substituicao' ? `Sai ${esc(ev.atleta_nome)}${ev.atleta_sec_nome ? ` → Entra ${esc(ev.atleta_sec_nome)}` : ''}` : `${esc(ev.atleta_nome)}${ev.atleta_sec_nome && ev.tipo === 'gol' ? ` (Assist.: ${esc(ev.atleta_sec_nome)})` : ''}`}</div>` : ''}
                    ${ev.observacao ? `<div class="small muted mt-1">${esc(ev.observacao)}</div>` : ''}
                  </div>
                  <span class="tiny muted">${esc(ev.periodo)}</span>
                </div>
              `).join('')}
            </div>
          ` : `<div class="empty">Nenhum evento registrado nesta partida até o momento.</div>`}
        </section>

        <section class="card">
          <h3 class="card-title">⚖️ Arbitragem e Súmula Oficial</h3>
          <p class="small"><strong>Árbitro Principal:</strong> ${esc(partida.arbitro_principal || 'A definir pela Comissão')}</p>
          <p class="small"><strong>Assistente 1:</strong> ${esc(partida.assistente_1 || '—')}</p>
          <p class="small"><strong>Assistente 2:</strong> ${esc(partida.assistente_2 || '—')}</p>
          <p class="small"><strong>Quarto Árbitro / Mesário:</strong> ${esc(partida.quarto_arbitro || partida.mesario || '—')}</p>
          ${partida.observacoes_sumula ? `<hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><p class="small muted"><strong>Observações da Súmula:</strong> ${esc(partida.observacoes_sumula)}</p>` : ''}
          <hr style="border:0;border-top:1px solid var(--line);margin:14px 0">
          <div class="actions">
            <a class="btn btn-primary btn-sm" href="/sumula/${partida.id}" target="_blank">📄 Abrir Súmula Eletrônica</a>
            <a class="btn btn-outline btn-sm" href="/sumula/${partida.id}?em_branco=1" target="_blank">📝 Súmula em Branco</a>
          </div>
        </section>
      </div>

      ${(comissaoMandante.length || comissaoVisitante.length) ? `
        <div class="section-head"><div><h2>Comissão Técnica</h2><p>Integrantes ativos vinculados às equipes</p></div></div>
        <div class="grid grid-2">
          <div class="card">
            <div class="card-title">${esc(m?.nome || 'Mandante')}</div>
            ${comissaoMandante.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Função</th></tr></thead><tbody>${comissaoMandante.map(c => `<tr><td><strong>${esc(c.nome)}</strong></td><td>${esc(c.funcao)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="small muted">Sem integrantes cadastrados.</div>`}
          </div>
          <div class="card">
            <div class="card-title">${esc(v?.nome || 'Visitante')}</div>
            ${comissaoVisitante.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Nome</th><th>Função</th></tr></thead><tbody>${comissaoVisitante.map(c => `<tr><td><strong>${esc(c.nome)}</strong></td><td>${esc(c.funcao)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="small muted">Sem integrantes cadastrados.</div>`}
          </div>
        </div>
      ` : ''}

      <div class="section-head"><div><h2>Atletas Relacionados na Partida</h2><p>Titulares e reservas registrados em súmula</p></div></div>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">${esc(m?.nome || 'Mandante')}</div>
          ${relM.length ? `
            <div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Atleta</th><th>Condição</th></tr></thead><tbody>
              ${relM.map(r => `<tr><td><strong>${r.numero_camisa ?? r.numero ?? '—'}</strong></td><td>${esc(r.apelido || r.nome)}</td><td><span class="pill ${r.condicao === 'titular' ? 'ok' : ''}">${r.condicao === 'titular' ? 'Titular' : 'Reserva'}</span></td></tr>`).join('')}
            </tbody></table></div>
          ` : `<div class="empty small">Relação nominal ainda não publicada para esta equipe.</div>`}
        </div>
        <div class="card">
          <div class="card-title">${esc(v?.nome || 'Visitante')}</div>
          ${relV.length ? `
            <div class="table-wrap"><table class="table"><thead><tr><th>Nº</th><th>Atleta</th><th>Condição</th></tr></thead><tbody>
              ${relV.map(r => `<tr><td><strong>${r.numero_camisa ?? r.numero ?? '—'}</strong></td><td>${esc(r.apelido || r.nome)}</td><td><span class="pill ${r.condicao === 'titular' ? 'ok' : ''}">${r.condicao === 'titular' ? 'Titular' : 'Reserva'}</span></td></tr>`).join('')}
            </tbody></table></div>
          ` : `<div class="empty small">Relação nominal ainda não publicada para esta equipe.</div>`}
        </div>
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: `Jogo ${numFmt}`,
    abaAtiva: 'jogos',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    autoRefresh: partida.status === 'ao_vivo' ? 15000 : 30000,
    conteudo
  });
}

function paginaClassificacao(ctx) {
  const { campeonato, campeonatosAtivos, classificacao, totalVisitas, flash } = ctx;
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Classificação por Chaves</h2>
          <p>${esc(campeonato.nome)} • Chaves A, B, C e D</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm no-print" data-print>🖨️ Imprimir Classificação</button>
      </div>

      <div class="grid grid-2">
        ${Object.keys(classificacao.chaves).sort().map(ch => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
              <span class="pill chave-tag">CHAVE ${esc(ch)}</span>
              <span class="tiny muted">Critérios: P → V → SG → GP → CD → Cartões</span>
            </div>
            <div class="table-wrap">
              <table class="table standings">
                <thead>
                  <tr><th>#</th><th>Equipe</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>P</th></tr>
                </thead>
                <tbody>
                  ${classificacao.chaves[ch].map(item => `
                    <tr class="${item.classificado ? 'qualified' : 'eliminated'}">
                      <td>${item.posicaoChave}</td>
                      <td>
                        <a href="/equipe/${item.id}${divQuery}" style="display:flex;align-items:center;gap:8px">
                          ${renderBadgeEscudo(item.equipe)}
                          <strong>${esc(item.nome)}</strong>
                        </a>
                      </td>
                      <td>${item.j}</td><td>${item.v}</td><td>${item.e}</td><td>${item.d}</td>
                      <td>${item.gp}</td><td>${item.gc}</td><td>${item.sg > 0 ? `+${item.sg}` : item.sg}</td>
                      <td><strong style="color:var(--blue-deep)">${item.p}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section-head">
        <div>
          <h2>Classificação Geral Consolidada (1º ao 12º Geral)</h2>
          <p>Os 8 primeiros avançam às Quartas de Final no ${esc(campeonato.estadio_padrao)} (1º×8º, 2º×7º, 3º×6º e 4º×5º)</p>
        </div>
        <a class="btn btn-primary btn-sm" href="/chaveamento${divQuery}">🏆 Ver Árvore do Mata-mata</a>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="table standings">
            <thead>
              <tr>
                <th>Geral</th><th>Equipe</th><th>Chave</th><th>J</th><th>V</th><th>E</th><th>D</th>
                <th>GP</th><th>GC</th><th>SG</th><th>CA</th><th>CV</th><th>%</th><th>P</th><th>Situação</th>
              </tr>
            </thead>
            <tbody>
              ${classificacao.geral.map(item => `
                <tr class="${item.classificado ? 'qualified' : 'eliminated'}">
                  <td>${item.posicaoGeral}º</td>
                  <td>
                    <a href="/equipe/${item.id}${divQuery}" style="display:flex;align-items:center;gap:9px">
                      ${renderBadgeEscudo(item.equipe)}
                      <strong>${esc(item.nome)}</strong>
                    </a>
                  </td>
                  <td><span class="pill chave-tag">Chave ${esc(item.chave)}</span></td>
                  <td>${item.j}</td><td>${item.v}</td><td>${item.e}</td><td>${item.d}</td>
                  <td>${item.gp}</td><td>${item.gc}</td><td>${item.sg > 0 ? `+${item.sg}` : item.sg}</td>
                  <td>${item.ca}</td><td>${item.cv}</td><td>${item.aproveitamento}%</td>
                  <td><strong style="font-size:1rem;color:var(--blue-deep)">${item.p}</strong></td>
                  <td>${item.classificado ? `<span class="pill ok">Zona Quartas (${item.posicaoGeral}º)</span>` : `<span class="pill">Fora do G-8</span>`}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      ${classificacao.confrontosQuartas.length ? `
        <div class="section-head">
          <div>
            <h2>Projeção / Cruzamentos das Quartas de Final</h2>
            <p>${classificacao.todosGruposEncerrados ? 'Confrontos oficiais definidos!' : 'Simulação em tempo real com base na classificação atual'}</p>
          </div>
        </div>
        <div class="grid grid-4">
          ${classificacao.confrontosQuartas.map(c => `
            <div class="card text-center">
              <span class="pill gold mb-1">JOGO ${c.jogo} • ${esc(c.rotulo)}</span>
              <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:8px">
                ${renderBadgeEscudo(c.mandante.equipe)}
                <strong>×</strong>
                ${renderBadgeEscudo(c.visitante.equipe)}
              </div>
              <div class="small mt-1"><strong>${esc(c.mandante.nome)}</strong> × <strong>${esc(c.visitante.nome)}</strong></div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  return layoutPublico({
    titulo: 'Classificação',
    abaAtiva: 'classificacao',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    autoRefresh: 30000,
    conteudo
  });
}

function paginaChaveamento(ctx) {
  const { campeonato, campeonatosAtivos, equipes, partidas, obterVencedorPerdedorPartida, totalVisitas, flash } = ctx;
  const equipesMap = montarMapaEquipes(equipes);
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const porNum = {};
  for (const p of partidas) porNum[p.numero_jogo] = p;

  const renderNoBracket = (numJogo, isFinal = false) => {
    const p = porNum[numJogo];
    if (!p) return '';
    const m = p.mandante_id ? equipesMap[p.mandante_id] : null;
    const v = p.visitante_id ? equipesMap[p.visitante_id] : null;
    const { vencedorId } = obterVencedorPerdedorPartida(p);
    const temPlacar = p.status === 'ao_vivo' || p.status === 'encerrada';

    return `
      <a class="bracket-match ${isFinal ? 'final-card' : ''}" href="/jogo/${p.id}${divQuery}">
        <div class="bracket-match-head">
          <span>JOGO ${String(p.numero_jogo).padStart(2, '0')}</span>
          <span>${esc(p.data_jogo)} • ${esc(p.hora_jogo)}</span>
        </div>
        <div class="bracket-team ${vencedorId && m && vencedorId === m.id ? 'winner' : ''}">
          <div class="bracket-team-info">
            ${m?.escudo_url ? `<img src="${esc(m.escudo_url)}" alt="">` : '<span>🛡️</span>'}
            <span>${esc(m ? m.nome : p.mandante_placeholder)}</span>
          </div>
          <span class="bracket-score">${temPlacar ? Number(p.gols_mandante ?? 0) : '—'}${p.penaltis_mandante !== null && p.penaltis_mandante !== undefined ? ` (${p.penaltis_mandante})` : ''}</span>
        </div>
        <div class="bracket-team ${vencedorId && v && vencedorId === v.id ? 'winner' : ''}">
          <div class="bracket-team-info">
            ${v?.escudo_url ? `<img src="${esc(v.escudo_url)}" alt="">` : '<span>🛡️</span>'}
            <span>${esc(v ? v.nome : p.visitante_placeholder)}</span>
          </div>
          <span class="bracket-score">${temPlacar ? Number(p.gols_visitante ?? 0) : '—'}${p.penaltis_visitante !== null && p.penaltis_visitante !== undefined ? ` (${p.penaltis_visitante})` : ''}</span>
        </div>
      </a>
    `;
  };

  const eliminatorias = partidas.filter(p => p.fase !== 'grupos');

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Árvore do Mata-mata • Fase Final</h2>
          <p>Quartas de Final (12 e 13/12), Semifinais (19 e 22/12) e Grande Final (30/12) no ${esc(campeonato.estadio_padrao)}</p>
        </div>
      </div>

      <div class="bracket-board">
        <div class="bracket-col">
          <div class="bracket-col-header">Quartas de Final</div>
          ${renderNoBracket(13)}
          ${renderNoBracket(16)}
          ${renderNoBracket(14)}
          ${renderNoBracket(15)}
        </div>
        <div class="bracket-col">
          <div class="bracket-col-header">Semifinais</div>
          ${renderNoBracket(17)}
          ${renderNoBracket(18)}
        </div>
        <div class="bracket-col">
          <div class="bracket-col-header final-header">🏆 Grande Final • 30/12</div>
          ${renderNoBracket(19, true)}
        </div>
      </div>

      <div class="section-head">
        <div>
          <h2>Cartões Detalhados das Fases Eliminatórias</h2>
          <p>Clique em qualquer confronto para abrir a súmula ou baixar a arte oficial</p>
        </div>
      </div>
      <div class="grid grid-2">
        ${eliminatorias.map(p => renderCardJogo(p, { equipesMap, tempoPeriodoMin: campeonato.tempo_periodo_min, divQuery })).join('')}
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: 'Mata-mata',
    abaAtiva: 'chaveamento',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    autoRefresh: 30000,
    conteudo
  });
}

function paginaArtilharia(ctx) {
  const { campeonato, campeonatosAtivos, estatisticas, totalVisitas, flash } = ctx;

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Artilharia, Assistências e Controle Disciplinar</h2>
          <p>Estatísticas individuais oficiais • Limite de suspensão: ${estatisticas.limiteAmarelos} cartões amarelos</p>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <h3 class="card-title">⚽ Artilharia</h3>
          ${estatisticas.artilharia.length ? `
            <div class="table-wrap"><table class="table"><thead><tr><th>Pos.</th><th>Atleta</th><th>Equipe</th><th>Gols</th></tr></thead><tbody>
              ${estatisticas.artilharia.map((a, i) => `
                <tr>
                  <td><strong>${i + 1}º</strong></td>
                  <td><strong>${esc(a.apelido || a.nome)}</strong>${a.status === 'inativo' ? ' <span class="tiny muted">(histórico)</span>' : ''}</td>
                  <td>${esc(a.equipe_nome)}</td>
                  <td><span class="pill ok">⚽ ${a.gols}</span></td>
                </tr>
              `).join('')}
            </tbody></table></div>
          ` : `<div class="empty">Ainda não há gols registrados.</div>`}
        </div>

        <div class="card">
          <h3 class="card-title">🎯 Assistências & ⭐ Craques da Partida</h3>
          ${estatisticas.assistencias.length ? `
            <div class="table-wrap mb-2"><table class="table"><thead><tr><th>Pos.</th><th>Atleta</th><th>Equipe</th><th>Assist.</th></tr></thead><tbody>
              ${estatisticas.assistencias.map((a, i) => `
                <tr><td><strong>${i + 1}º</strong></td><td><strong>${esc(a.apelido || a.nome)}</strong></td><td>${esc(a.equipe_nome)}</td><td><span class="pill">🎯 ${a.total_assist}</span></td></tr>
              `).join('')}
            </tbody></table></div>
          ` : `<div class="empty small">Ainda não há assistências registradas.</div>`}

          ${estatisticas.craques.length ? `
            <h4 class="card-title mt-2">⭐ Eleitos Craque da Partida</h4>
            <div class="table-wrap"><table class="table"><thead><tr><th>Atleta</th><th>Equipe</th><th>Troféus</th></tr></thead><tbody>
              ${estatisticas.craques.map(c => `<tr><td><strong>${esc(c.apelido || c.nome)}</strong></td><td>${esc(c.equipe_nome)}</td><td><span class="pill gold">⭐ ${c.premios}</span></td></tr>`).join('')}
            </tbody></table></div>
          ` : ''}
        </div>
      </div>

      <div class="section-head">
        <div>
          <h2>🟨🟥 Controle Público de Cartões, Suspensos e Pendurados</h2>
          <p>Transparência automática para clubes, dirigentes, arbitragem e torcedores</p>
        </div>
      </div>
      <div class="card">
        ${estatisticas.disciplina.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Atleta</th><th>Equipe</th><th>🟨 Amarelos</th><th>🟥 Vermelhos</th><th>Situação Próximo Jogo</th></tr></thead>
              <tbody>
                ${estatisticas.disciplina.map(d => `
                  <tr>
                    <td><strong>${esc(d.apelido || d.nome)}</strong></td>
                    <td>${esc(d.equipe_nome)}</td>
                    <td>${d.amarelos}</td>
                    <td>${d.vermelhos}</td>
                    <td>
                      ${d.suspenso
                        ? `<span class="pill danger">SUSPENSO (${esc(d.motivoSuspensao)})</span>`
                        : (d.pendurado ? `<span class="pill warn">⚠️ Pendurado</span>` : `<span class="pill ok">Regular</span>`)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">Nenhum cartão ou suspensão registrada até o momento.</div>`}
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: 'Artilharia e Disciplina',
    abaAtiva: 'artilharia',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaEquipes(ctx) {
  const { campeonato, campeonatosAtivos, equipes, totalVisitas, flash } = ctx;
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Equipes Participantes (${equipes.length} Clubes)</h2>
          <p>Clique em uma equipe para ver comissão técnica, elenco confirmado, jogos e estatísticas</p>
        </div>
      </div>

      <div class="grid grid-3">
        ${equipes.map(eq => `
          <a class="card" href="/equipe/${eq.id}${divQuery}" style="display:flex;gap:14px;align-items:center;transition:.18s ease transform">
            ${renderBadgeEscudo(eq, 'team-badge-lg')}
            <div>
              <span class="pill chave-tag mb-1">Chave ${esc(eq.chave)}</span>
              <div class="card-title mb-0">${esc(eq.nome)}</div>
              <div class="muted small">${esc(eq.localidade)}</div>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: 'Equipes',
    abaAtiva: 'equipes',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaDetalheEquipe(ctx) {
  const { campeonato, campeonatosAtivos, equipes, equipe, comissao, atletasAtivos, atletasHistorico, jogosEquipe, itemClassif, totalVisitas, flash } = ctx;
  const equipesMap = montarMapaEquipes(equipes);
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const conteudo = `
    <div class="container mt-3">
      <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap">
        <div style="display:flex;gap:18px;align-items:center">
          ${renderBadgeEscudo(equipe, 'team-badge-xl')}
          <div>
            <span class="pill chave-tag">Chave ${esc(equipe.chave)}</span>
            <h2 class="mt-1 mb-0" style="font-size:1.75rem;color:var(--blue-deep)">${esc(equipe.nome)}</h2>
            <p class="muted small mb-0">${esc(equipe.localidade)} • Sigla: ${esc(equipe.sigla)}</p>
          </div>
        </div>
        ${itemClassif ? `
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <div class="pill gold">${itemClassif.posicaoChave}º na Chave ${esc(equipe.chave)}</div>
            <div class="pill">${itemClassif.posicaoGeral}º no Geral • ${itemClassif.p} pts (${itemClassif.v}V ${itemClassif.e}E ${itemClassif.d}D)</div>
          </div>
        ` : ''}
      </div>

      <div class="section-head"><div><h2>Jogos de ${esc(equipe.nome)}</h2><p>Agenda e resultados da equipe no ${esc(campeonato.estadio_padrao)}</p></div></div>
      <div class="grid grid-2">
        ${jogosEquipe.length
          ? jogosEquipe.map(p => renderCardJogo(p, { equipesMap, tempoPeriodoMin: campeonato.tempo_periodo_min, divQuery })).join('')
          : `<div class="card empty">Nenhum jogo vinculado diretamente ainda.</div>`}
      </div>

      <div class="section-head"><div><h2>Comissão Técnica</h2><p>Integrantes ativos credenciados na área técnica</p></div></div>
      <div class="card">
        ${comissao.length ? `
          <div class="grid grid-3">
            ${comissao.map(c => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px">
                <div><strong>${esc(c.nome)}</strong><div class="tiny muted">${esc(c.funcao)}</div></div>
                <span class="pill ok">Ativo</span>
              </div>
            `).join('')}
          </div>
        ` : `<div class="empty small">Comissão técnica ainda não cadastrada no portal.</div>`}
      </div>

      <div class="section-head"><div><h2>Elenco Confirmado (${atletasAtivos.length})</h2><p>Atletas homologados pela Comissão Organizadora</p></div></div>
      <div class="card">
        ${atletasAtivos.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Nº</th><th>Jogador</th><th>Posição</th><th>Enquadramento</th><th>Gols</th><th>Assist.</th></tr></thead>
              <tbody>
                ${atletasAtivos.map(a => `
                  <tr>
                    <td><strong>${a.numero ?? '—'}</strong></td>
                    <td><strong>${esc(a.apelido || a.nome)}</strong></td>
                    <td>${esc(a.posicao)}</td>
                    <td>${a.origem === 'fora' ? `<span class="pill warn">De Fora</span>` : `<span class="pill ok">Quiterianópolis</span>`}</td>
                    <td>${a.gols || 0}</td>
                    <td>${a.assistencias || 0}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">Os atletas confirmados desta equipe aparecerão aqui assim que homologados.</div>`}
      </div>

      ${atletasHistorico.length ? `
        <div class="section-head"><div><h2>Histórico de Atletas Substituídos / Inativados</h2></div></div>
        <div class="card">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Nº</th><th>Jogador</th><th>Origem</th><th>Gols</th><th>Situação</th></tr></thead>
              <tbody>
                ${atletasHistorico.map(a => `<tr><td>${a.numero ?? '—'}</td><td><strong>${esc(a.apelido || a.nome)}</strong></td><td>${a.origem === 'fora' ? 'De Fora' : 'Local'}</td><td>${a.gols || 0}</td><td><span class="pill">Histórico</span></td></tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  return layoutPublico({
    titulo: equipe.nome,
    abaAtiva: 'equipes',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaSumulas(ctx) {
  const { campeonato, campeonatosAtivos, equipes, partidas, totalVisitas, flash } = ctx;
  const equipesMap = montarMapaEquipes(equipes);

  const lista = partidas.filter(p => p.status === 'encerrada' || p.sumula_pdf_url);

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Súmulas Oficiais</h2>
          <p>Consulte a súmula eletrônica detalhada ou o PDF assinado publicado pela Comissão Organizadora</p>
        </div>
      </div>
      <div class="card">
        ${lista.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Jogo</th><th>Partida</th><th>Placar</th><th>Data</th><th>Ações</th></tr></thead>
              <tbody>
                ${lista.map(p => {
                  const m = p.mandante_id ? equipesMap[p.mandante_id] : null;
                  const v = p.visitante_id ? equipesMap[p.visitante_id] : null;
                  return `
                    <tr>
                      <td><span class="pill gold">Jogo ${String(p.numero_jogo).padStart(2, '0')}</span></td>
                      <td><strong>${esc(m?.nome || p.mandante_placeholder)} × ${esc(v?.nome || p.visitante_placeholder)}</strong></td>
                      <td><strong>${Number(p.gols_mandante ?? 0)} × ${Number(p.gols_visitante ?? 0)}</strong></td>
                      <td>${esc(p.data_jogo)} ${esc(p.hora_jogo)}</td>
                      <td class="actions">
                        <a class="btn btn-light btn-xs" href="/sumula/${p.id}" target="_blank">📄 Súmula Eletrônica</a>
                        ${p.sumula_pdf_url ? `<a class="btn btn-success btn-xs" href="${esc(p.sumula_pdf_url)}" target="_blank">📑 PDF Assinado</a>` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">As súmulas oficiais aparecerão aqui conforme as partidas forem encerradas e homologadas.</div>`}
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: 'Súmulas',
    abaAtiva: 'sumulas',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaImprimirSumula({ campeonato, partida, mandante, visitante, eventos, atletasMandante, atletasVisitante, emBranco = false }) {
  const numFmt = String(partida.numero_jogo).padStart(2, '0');
  const linhasEmBranco = Array.from({ length: 18 }, (_, i) => `<tr><td style="height:24px">${i + 1}</td><td></td><td></td><td></td><td></td></tr>`).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Súmula Oficial — Jogo ${numFmt} • ${esc(campeonato.nome_curto)}</title>
  <script src="/assets/js/device.js?v=3.0.0"></script>
  <link rel="stylesheet" href="/assets/css/app.css?v=3.0.0">
</head>
<body style="background:#fff;padding:20px">
  <div class="container" style="max-width:980px">
    <div class="actions mb-2 no-print" style="justify-content:space-between">
      <a class="btn btn-light btn-sm" href="/jogo/${partida.id}">← Voltar à Partida</a>
      <div class="actions">
        <a class="btn btn-outline btn-sm" href="/sumula/${partida.id}${emBranco ? '' : '?em_branco=1'}">${emBranco ? 'Ver Preenchida' : 'Versão em Branco'}</a>
        <button type="button" class="btn btn-primary btn-sm" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
      </div>
    </div>

    <div class="sumula-sheet">
      <div class="sumula-header">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="/assets/branding/escudo-campeonato-2026.png" alt="" style="width:68px;height:68px;object-fit:contain">
          <div>
            <strong style="font-size:1.15rem;display:block;color:#06286E">${esc(campeonato.nome)}</strong>
            <span class="small muted">${esc(campeonato.orgao)}</span>
          </div>
        </div>
        <div class="text-right">
          <span class="pill gold">SÚMULA OFICIAL • JOGO ${numFmt}</span>
          <div class="small mt-1"><strong>${esc(partida.data_jogo)} às ${esc(partida.hora_jogo)}</strong> • ${esc(partida.local)}</div>
        </div>
      </div>

      <div class="grid grid-3 mb-2" style="align-items:center;text-align:center;border:1px solid #cbd5e1;border-radius:10px;padding:12px">
        <div><small class="muted">MANDANTE</small><h3 class="mt-0 mb-0">${esc(mandante?.nome || partida.mandante_placeholder)}</h3></div>
        <div>
          <small class="muted">PLACAR FINAL</small>
          <div style="font-size:1.85rem;font-weight:950">${emBranco ? '____ × ____' : `${partida.gols_mandante ?? '—'} × ${partida.gols_visitante ?? '—'}`}</div>
        </div>
        <div><small class="muted">VISITANTE</small><h3 class="mt-0 mb-0">${esc(visitante?.nome || partida.visitante_placeholder)}</h3></div>
      </div>

      <div class="small mb-2" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;border:1px solid #cbd5e1;border-radius:10px;padding:10px">
        <div><strong>Árbitro:</strong> ${emBranco ? '____________________________________' : esc(partida.arbitro_principal || '—')}</div>
        <div><strong>Assistente 1:</strong> ${emBranco ? '____________________________________' : esc(partida.assistente_1 || '—')}</div>
        <div><strong>Assistente 2:</strong> ${emBranco ? '____________________________________' : esc(partida.assistente_2 || '—')}</div>
        <div><strong>4º Árbitro / Mesário:</strong> ${emBranco ? '_____________________________' : esc(partida.quarto_arbitro || partida.mesario || '—')}</div>
      </div>

      <div class="grid grid-2 mb-2">
        <div>
          <h4 class="card-title mb-1">Relação — ${esc(mandante?.nome || 'Mandante')}</h4>
          <table class="table" style="border:1px solid #cbd5e1">
            <thead><tr><th>Nº</th><th>Atleta</th><th>G</th><th>CA</th><th>CV</th></tr></thead>
            <tbody>
              ${!emBranco && atletasMandante.length
                ? atletasMandante.map(a => `<tr><td>${a.numero ?? ''}</td><td>${esc(a.nome)}</td><td></td><td></td><td></td></tr>`).join('')
                : linhasEmBranco}
            </tbody>
          </table>
        </div>
        <div>
          <h4 class="card-title mb-1">Relação — ${esc(visitante?.nome || 'Visitante')}</h4>
          <table class="table" style="border:1px solid #cbd5e1">
            <thead><tr><th>Nº</th><th>Atleta</th><th>G</th><th>CA</th><th>CV</th></tr></thead>
            <tbody>
              ${!emBranco && atletasVisitante.length
                ? atletasVisitante.map(a => `<tr><td>${a.numero ?? ''}</td><td>${esc(a.nome)}</td><td></td><td></td><td></td></tr>`).join('')
                : linhasEmBranco}
            </tbody>
          </table>
        </div>
      </div>

      ${!emBranco && eventos.length ? `
        <h4 class="card-title mb-1">Eventos Registrados Eletronicamente</h4>
        <table class="table mb-2" style="border:1px solid #cbd5e1">
          <thead><tr><th>Tempo/Min</th><th>Tipo</th><th>Equipe</th><th>Atleta / Detalhe</th></tr></thead>
          <tbody>
            ${eventos.map(ev => `<tr><td>${esc(ev.periodo)} ${ev.minuto ? `${esc(ev.minuto)}'` : ''}</td><td>${esc(ev.tipo.toUpperCase())}</td><td>${esc(ev.equipe_nome || '—')}</td><td>${esc(ev.atleta_nome || '')} ${esc(ev.observacao || '')}</td></tr>`).join('')}
          </tbody>
        </table>
      ` : `
        <h4 class="card-title mb-1">Relatório de Ocorrências / Observações</h4>
        <div style="border:1px solid #cbd5e1;height:90px;border-radius:8px;padding:8px">${esc(emBranco ? '' : (partida.observacoes_sumula || ''))}</div>
      `}

      <div class="sumula-signatures">
        <div class="sumula-sign-line">Árbitro Principal</div>
        <div class="sumula-sign-line">Capitão / Rep. Mandante</div>
        <div class="sumula-sign-line">Capitão / Rep. Visitante</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function paginaGaleria(ctx) {
  const { campeonato, campeonatosAtivos, albuns, albumSelecionado, fotosAlbum, totalVisitas, flash } = ctx;
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>📸 Galeria Oficial de Fotos</h2>
          <p>Registros fotográficos das partidas no ${esc(campeonato.estadio_padrao)}</p>
        </div>
        ${albumSelecionado ? `<a class="btn btn-light btn-sm" href="/galeria${divQuery}">← Todos os álbuns</a>` : ''}
      </div>

      ${albumSelecionado ? `
        <div class="card mb-3">
          <h3 class="card-title mb-1">${esc(albumSelecionado.titulo)}</h3>
          ${albumSelecionado.descricao ? `<p class="muted small mb-0">${esc(albumSelecionado.descricao)}</p>` : ''}
        </div>
        ${fotosAlbum.length ? `
          <div class="galeria-grid">
            ${fotosAlbum.map(f => `
              <button type="button" class="galeria-thumb" data-gallery-photo data-gallery-url="${esc(f.arquivo_url)}" data-gallery-caption="${esc(f.legenda || albumSelecionado.titulo)}">
                <img src="${esc(f.arquivo_url)}" alt="${esc(f.legenda || albumSelecionado.titulo)}" loading="lazy">
                ${f.legenda ? `<span class="galeria-thumb-caption">${esc(f.legenda)}</span>` : ''}
              </button>
            `).join('')}
          </div>
          <div class="galeria-lightbox" id="galeria-lightbox" hidden>
            <button type="button" class="galeria-lightbox-close" data-gallery-close aria-label="Fechar">×</button>
            <button type="button" class="galeria-lightbox-prev" data-gallery-prev aria-label="Anterior">‹</button>
            <figure>
              <img data-gallery-large alt="Foto ampliada">
              <figcaption><strong data-gallery-counter></strong> — <span data-gallery-description></span></figcaption>
            </figure>
            <button type="button" class="galeria-lightbox-next" data-gallery-next aria-label="Próxima">›</button>
          </div>
        ` : `<div class="card empty">Nenhuma foto enviada neste álbum ainda.</div>`}
      ` : (
        albuns.length ? `
          <div class="galeria-grid">
            ${albuns.map(a => `
              <a class="card" style="padding:0;overflow:hidden" href="/galeria?album=${a.id}${campeonatosAtivos.length > 1 ? `&divisao=${campeonato.id}` : ''}">
                <div style="height:185px;background:#e6eef9;position:relative">
                  ${a.capa_url ? `<img src="${esc(a.capa_url)}" alt="${esc(a.titulo)}" style="width:100%;height:100%;object-fit:cover">` : `<div style="height:100%;display:grid;place-items:center;font-size:2.5rem">📸</div>`}
                  <span class="pill gold" style="position:absolute;top:10px;right:10px">${a.total_fotos} fotos</span>
                </div>
                <div style="padding:14px">
                  <strong style="color:var(--blue-deep);display:block">${esc(a.titulo)}</strong>
                  <span class="small muted">${esc(a.descricao || 'Ver álbum completo →')}</span>
                </div>
              </a>
            `).join('')}
          </div>
        ` : `<div class="card empty">Nenhum álbum publicado até o momento. As fotos das rodadas aparecerão aqui!</div>`
      )}
    </div>
  `;

  return layoutPublico({
    titulo: 'Galeria de Fotos',
    abaAtiva: 'galeria',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaRegulamento(ctx) {
  const { campeonato, campeonatosAtivos, totalVisitas, flash } = ctx;
  const divQuery = campeonatosAtivos.length > 1 ? `?divisao=${campeonato.id}` : '';

  const textoFormatado = esc(campeonato.regulamento_texto || '')
    .split('\n')
    .map(linha => {
      const t = linha.trim();
      if (!t) return '<br>';
      if (/^(REGULAMENTO|CAPÍTULO)/i.test(t)) return `<h3 style="color:var(--blue-deep);margin:20px 0 8px">${t}</h3>`;
      return `<p style="margin:6px 0;line-height:1.7">${t}</p>`;
    })
    .join('');

  const conteudo = `
    <div class="container">
      <div class="section-head">
        <div>
          <h2>Regulamento e Documentos Oficiais</h2>
          <p>${esc(campeonato.nome)} • Secretaria Municipal de Esportes</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm no-print" data-print>🖨️ Imprimir</button>
      </div>

      <div class="grid grid-3 mb-3 no-print">
        <a class="card" href="/documentos/Tabela_Oficial_Quiterianopolis_2026.pdf" target="_blank" style="display:flex;gap:12px;align-items:center">
          <span style="font-size:2rem">📄</span>
          <div><strong style="color:var(--blue-deep)">Tabela Oficial 2026 (PDF)</strong><div class="small muted">Documento assinado pela Secretaria de Esportes</div></div>
        </a>
        <a class="card" href="/assets/branding/arte-chaves-2026.jpg" target="_blank" style="display:flex;gap:12px;align-items:center">
          <span style="font-size:2rem">🖼️</span>
          <div><strong style="color:var(--blue-deep)">Pôster Oficial das Chaves</strong><div class="small muted">Arte oficial das Chaves A, B, C e D</div></div>
        </a>
        <a class="card" href="/ajuda${divQuery}" style="display:flex;gap:12px;align-items:center">
          <span style="font-size:2rem">❓</span>
          <div><strong style="color:var(--blue-deep)">Central de Ajuda</strong><div class="small muted">Perguntas e respostas rápidas</div></div>
        </a>
      </div>

      <article class="card" style="padding:26px">
        ${textoFormatado}
      </article>
    </div>
  `;

  return layoutPublico({
    titulo: 'Regulamento',
    abaAtiva: 'regulamento',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaAvaliacoes(ctx) {
  const { campeonato, campeonatosAtivos, avaliacoes, mediaNota, distribuicao, desafioSoma, csrfToken, totalVisitas, flash } = ctx;

  const conteudo = `
    <div class="container mt-3">
      <section class="card" style="display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;background:linear-gradient(135deg,#fff,#f0f7ff 65%,#fffbeb)">
        <div>
          <span class="pill gold">Mural da Torcida Quiterianopolense</span>
          <h1 style="margin:8px 0 6px;color:var(--blue-deep);font-size:1.9rem">Avalie o Portal do Campeonato</h1>
          <p class="muted mb-0" style="max-width:660px">Dê uma nota de 0 a 10 e deixe sua mensagem sobre o portal e o Campeonato Municipal 2026. Comentários passam por moderação antes da publicação.</p>
        </div>
        <div class="card text-center" style="min-width:170px;box-shadow:none">
          <div style="font-size:2.8rem;font-weight:950;color:var(--blue-deep);line-height:1">${mediaNota}</div>
          <div class="small" style="font-weight:800;margin-top:4px">média de 10</div>
          <div class="tiny muted mt-1">${avaliacoes.length} avaliações aprovadas</div>
        </div>
      </section>

      <div class="grid grid-2 mt-3">
        <section class="card">
          <h3 class="card-title">Deixe sua avaliação</h3>
          <form method="post" action="/avaliacoes" class="grid" autocomplete="off">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <div class="review-hp" aria-hidden="true"><label>Site <input type="text" name="website" tabindex="-1"></label></div>
            <div>
              <label style="display:block;margin-bottom:8px">Sua nota (0 a 10)</label>
              <div class="review-rating-buttons">
                ${Array.from({ length: 11 }, (_, n) => `
                  <label><input type="radio" name="nota" value="${n}" ${n === 10 ? 'checked' : ''} required><span>${n}</span></label>
                `).join('')}
              </div>
            </div>
            <div class="form-group">
              <label>Seu nome ou apelido (opcional)</label>
              <input class="input" name="nome" maxlength="60" placeholder="Ex.: João da Cidade Nova">
            </div>
            <div class="form-group">
              <label>Comentário</label>
              <textarea class="textarea" name="comentario" maxlength="800" minlength="5" required placeholder="Conte o que está achando do portal e dos jogos no Estádio Tualdão!"></textarea>
            </div>
            <div class="form-group">
              <label>Confirmação anti-spam: quanto é <strong>${desafioSoma.a} + ${desafioSoma.b}</strong>?</label>
              <input class="input" type="number" name="desafio_resposta" required min="0" max="40">
            </div>
            <button class="btn btn-primary btn-block" type="submit">Enviar Avaliação</button>
          </form>
        </section>

        <aside class="card">
          <h3 class="card-title">Distribuição das Notas</h3>
          ${Array.from({ length: 11 }, (_, idx) => 10 - idx).map(nota => {
            const qtd = distribuicao[nota] || 0;
            const perc = avaliacoes.length ? Math.round((qtd / avaliacoes.length) * 100) : 0;
            return `
              <div class="review-dist-row">
                <strong>${nota}</strong>
                <div class="review-dist-bar"><span style="width:${perc}%"></span></div>
                <span class="muted text-right">${qtd}</span>
              </div>
            `;
          }).join('')}
        </aside>
      </div>

      <div class="section-head"><div><h2>Comentários Aprovados</h2></div></div>
      <div class="grid">
        ${avaliacoes.map(av => `
          <article class="card" style="display:flex;gap:14px;align-items:flex-start">
            <div style="width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:var(--blue-deep);color:var(--gold);display:grid;place-items:center;font-weight:950;font-size:1.1rem">
              ${esc((av.nome || 'T').trim().charAt(0).toUpperCase())}
            </div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <strong>${esc(av.nome)}</strong>
                <span class="pill gold">${av.nota}/10</span>
                <span class="tiny muted" style="margin-left:auto">${esc(av.criado_em)}</span>
              </div>
              <p class="mb-0 mt-1" style="line-height:1.55">${esc(av.comentario)}</p>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  `;

  return layoutPublico({
    titulo: 'Avaliações',
    abaAtiva: 'avaliacoes',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

function paginaAjuda(ctx) {
  const { campeonato, campeonatosAtivos, faqs, totalVisitas, flash } = ctx;

  const nomesCat = {
    geral: 'Formato Geral da Competição',
    jogos: 'Jogos, Triangulares e Estádio Tualdão',
    classificacao: 'Classificação e Mata-mata',
    atletas: 'Atletas, Equipes e Área do Dirigente',
    disciplina: 'Cartões e Suspensões',
    sumulas: 'Súmulas e Documentos Oficiais'
  };

  const porCat = {};
  for (const f of faqs) {
    if (!porCat[f.categoria]) porCat[f.categoria] = [];
    porCat[f.categoria].push(f);
  }

  const conteudo = `
    <div class="container mt-3">
      <section class="card" style="background:linear-gradient(135deg,#06286E,#0057D9);color:#fff;padding:28px">
        <span class="pill gold">CENTRAL DE AJUDA • QUITERIANÓPOLIS 2026</span>
        <h1 style="margin:10px 0 8px;font-size:2rem">Tire suas dúvidas sobre o Campeonato</h1>
        <p style="color:#dbeafe;max-width:680px;margin:0 0 16px">Pesquise rapidamente sobre chaves, cruzamentos automáticos, vagas das quartas de final, cartões, súmulas e acesso das equipes.</p>
        <input id="faq-search" class="input" type="search" placeholder="🔍 Digite sua dúvida aqui (ex.: quartas, vencedor jogo 01, cartões)..." style="max-width:640px">
      </section>

      <div id="faq-empty" class="card empty mt-3" hidden>Nenhuma resposta encontrada para o termo pesquisado.</div>

      ${Object.keys(porCat).map(cat => `
        <section class="mt-3" data-faq-section>
          <div class="section-head" style="margin-top:10px"><div><h2>${esc(nomesCat[cat] || cat)}</h2></div></div>
          <div class="faq-list">
            ${porCat[cat].map(item => `
              <details class="faq-item" data-faq>
                <summary>${esc(item.pergunta)}</summary>
                <div class="faq-answer">${esc(item.resposta)}</div>
              </details>
            `).join('')}
          </div>
        </section>
      `).join('')}
    </div>
  `;

  return layoutPublico({
    titulo: 'Ajuda e Dúvidas Frequentes',
    abaAtiva: 'ajuda',
    campeonato,
    campeonatosAtivos,
    totalVisitas,
    flash,
    conteudo
  });
}

module.exports = {
  paginaInicial,
  paginaJogos,
  paginaDetalheJogo,
  paginaClassificacao,
  paginaChaveamento,
  paginaArtilharia,
  paginaEquipes,
  paginaDetalheEquipe,
  paginaSumulas,
  paginaImprimirSumula,
  paginaGaleria,
  paginaRegulamento,
  paginaAvaliacoes,
  paginaAjuda
};
