'use strict';

const {
  esc,
  moeda,
  segundosAtuaisCronometro,
  renderCronometro,
  renderBadgeEscudo,
  renderFlash,
  layoutAdmin
} = require('./helpers');
const { formatarCpf } = require('../db');

function paginaLoginAdmin({ campeonato, csrfToken, flash }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#06286E">
  <title>Acesso Administrativo • ${esc(campeonato.nome_curto)}</title>
  <script src="/assets/js/device.js?v=3.0.0"></script>
  <link rel="stylesheet" href="/assets/css/app.css?v=3.0.0">
  <link rel="manifest" href="/admin-manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
</head>
<body style="background:radial-gradient(circle at 20% 10%,#0057D9 0%,#06286E 65%,#03163d 100%);min-height:100vh;display:grid;place-items:center;padding:20px">
  <div class="card" style="width:100%;max-width:460px;padding:30px">
    <div class="text-center mb-3">
      <img src="/assets/branding/escudo-campeonato-2026.png" alt="Logo" style="width:92px;height:92px;object-fit:contain;margin:0 auto 10px">
      <span class="pill gold">SECRETARIA MUNICIPAL DE ESPORTES</span>
      <h1 style="margin:10px 0 6px;font-size:1.5rem;color:var(--blue-deep)">Painel da Comissão Organizadora</h1>
      <p class="muted small mb-0">Operação de jogos ao vivo no ${esc(campeonato.estadio_padrao)}, súmulas, elencos, galeria, documentos e relatórios.</p>
    </div>

    ${renderFlash(flash)}

    <form method="post" action="/admin/login" class="grid">
      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
      <div class="form-group">
        <label for="cpf-admin">Identificador de Acesso (CPF cadastrado)</label>
        <input id="cpf-admin" class="input" type="text" name="cpf" data-mask="cpf" placeholder="000.000.000-00" required autocomplete="username">
      </div>
      <div class="form-group">
        <label for="senha-admin">Senha de Acesso</label>
        <input id="senha-admin" class="input" type="password" name="senha" placeholder="Digite sua senha" required autocomplete="current-password">
      </div>
      <button type="submit" class="btn btn-primary btn-block">⚙️ Acessar Painel Administrativo</button>
    </form>

    <div class="mt-3 text-center tiny muted" style="line-height:1.4">
      🔒 Ambiente operacional esportivo exclusivo da comissão organizadora e mesários do Campeonato Quiterianopolense de Futebol 2026. Este sistema não coleta nem solicita dados bancários ou senhas pessoais de cidadãos.
    </div>

    <div class="mt-3 text-center small">
      <a href="/" style="color:var(--blue);font-weight:800">← Voltar ao Portal Público</a>
    </div>
  </div>
  <script src="/assets/js/app.js?v=2.0.0" defer></script>
</body>
</html>`;
}

function paginaDashboardAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, kpis, aoVivo, proximas, logsRecentes, csrfToken } = ctx;

  const conteudo = `
    <div class="grid grid-4">
      <div class="card kpi">
        <div class="icon">⚽</div>
        <div class="value">${kpis.jogosEncerrados}/${kpis.totalJogos}</div>
        <div class="label">Partidas Encerradas (${kpis.totalGols} gols)</div>
      </div>
      <div class="card kpi">
        <div class="icon">👟</div>
        <div class="value">${kpis.totalAtletas}</div>
        <div class="label">Atletas Ativos (${kpis.atletasPendentes} pendentes)</div>
      </div>
      <div class="card kpi">
        <div class="icon">📅</div>
        <div class="value">${kpis.adiamentosPendentes}</div>
        <div class="label">Adiamentos Pendentes • ${kpis.avaliacoesPendentes} Avaliações</div>
      </div>
      <div class="card kpi">
        <div class="icon">👁</div>
        <div class="value">${Number(kpis.totalVisitas).toLocaleString('pt-BR')}</div>
        <div class="label">Acessos Únicos no Portal</div>
      </div>
    </div>

    ${aoVivo.length ? `
      <div class="card mt-3" style="border-color:#fca5a5;background:#fff5f5">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <span class="pill live">● PARTIDA(S) AO VIVO AGORA</span>
            <h3 class="mt-1 mb-0" style="color:var(--blue-deep)">Mesa Operadora Ativa no ${esc(campeonato.estadio_padrao)}</h3>
          </div>
        </div>
        <div class="grid grid-2 mt-2">
          ${aoVivo.map(p => `
            <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
              <div>
                <span class="tiny muted">JOGO ${String(p.numero_jogo).padStart(2, '0')}</span>
                <strong style="display:block;font-size:1.05rem">${esc(p.mandante_nome || p.mandante_placeholder)} ${Number(p.gols_mandante ?? 0)} × ${Number(p.gols_visitante ?? 0)} ${esc(p.visitante_nome || p.visitante_placeholder)}</strong>
                ${renderCronometro(p, campeonato.tempo_periodo_min, 'mt-1')}
              </div>
              <a class="btn btn-danger btn-sm" href="/admin/partida/${p.id}">🎛️ Operar Ao Vivo</a>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div class="grid grid-2 mt-3">
      <section class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
          <h3 class="card-title mb-0">📅 Próximos Jogos na Tabela</h3>
          <form method="post" action="/admin/partidas/sincronizar" style="margin:0">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <button type="submit" class="btn btn-light btn-xs" title="Atualizar cruzamentos automáticos">🔄 Sincronizar Cruzamentos</button>
          </form>
        </div>
        ${proximas.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Jogo</th><th>Confronto</th><th>Data/Hora</th><th>Ação</th></tr></thead>
              <tbody>
                ${proximas.map(p => `
                  <tr>
                    <td><span class="pill gold">#${String(p.numero_jogo).padStart(2, '0')}</span></td>
                    <td><strong>${esc(p.mandante_nome || p.mandante_placeholder)} × ${esc(p.visitante_nome || p.visitante_placeholder)}</strong></td>
                    <td>${esc(p.data_jogo)} ${esc(p.hora_jogo)}</td>
                    <td><a class="btn btn-primary btn-xs" href="/admin/partida/${p.id}">Operar / Editar</a></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty small">Todos os jogos programados foram concluídos!</div>`}
      </section>

      <section class="card">
        <h3 class="card-title">🛡️ Últimas Ações Registradas (Auditoria)</h3>
        ${logsRecentes.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Data/Hora</th><th>Perfil</th><th>Usuário</th><th>Ação</th></tr></thead>
              <tbody>
                ${logsRecentes.map(l => `
                  <tr>
                    <td class="tiny muted">${esc(l.criado_em)}</td>
                    <td><span class="pill">${esc(l.perfil)}</span></td>
                    <td><strong>${esc(l.usuario_nome)}</strong></td>
                    <td class="small">${esc(l.acao)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty small">Nenhuma ação de auditoria registrada ainda.</div>`}
      </section>
    </div>
  `;

  return layoutAdmin({
    titulo: 'Visão Geral da Competição',
    subtitulo: `${campeonato.nome} • ${campeonato.estadio_padrao}`,
    secao: 'dashboard',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaPartidasAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, partidas, equipes, csrfToken } = ctx;
  const eqMap = {};
  for (const e of equipes) eqMap[e.id] = e;

  const conteudo = `
    <div class="card mb-3" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div>
        <strong>Automação da Tabela Oficial (19 Jogos)</strong>
        <div class="small muted">Os confrontos condicionais (Vencedor/Perdedor Jogo 01–04, Quartas 1º×8º..4º×5º, Semifinais e Final) são preenchidos automaticamente ao encerrar cada partida.</div>
      </div>
      <div class="actions">
        <form method="post" action="/admin/partidas/sincronizar" style="margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <button type="submit" class="btn btn-primary btn-sm">🔄 Sincronizar Vencedores/Perdedores</button>
        </form>
        <form method="post" action="/admin/partidas/sincronizar" style="margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="forcar_quartas" value="1">
          <button type="submit" class="btn btn-gold btn-sm" data-confirm="Deseja projetar/preencher imediatamente os confrontos das Quartas de Final com base na classificação atual?">🏆 Preencher Quartas Agora</button>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Fase / Chave</th>
              <th>Data e Hora</th>
              <th>Mandante</th>
              <th>Placar</th>
              <th>Visitante</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${partidas.map(p => {
              const m = p.mandante_id ? eqMap[p.mandante_id] : null;
              const v = p.visitante_id ? eqMap[p.visitante_id] : null;
              const numFmt = String(p.numero_jogo).padStart(2, '0');
              const placar = (p.status === 'ao_vivo' || p.status === 'encerrada')
                ? `${Number(p.gols_mandante ?? 0)} × ${Number(p.gols_visitante ?? 0)}`
                : '×';
              return `
                <tr>
                  <td><strong>#${numFmt}</strong></td>
                  <td>
                    ${p.chave ? `<span class="pill chave-tag">Chave ${esc(p.chave)}</span>` : `<span class="pill gold">${esc(p.fase.toUpperCase())}</span>`}
                  </td>
                  <td>${esc(p.data_jogo)}<div class="tiny muted">${esc(p.hora_jogo)}</div></td>
                  <td><strong>${esc(m ? m.nome : p.mandante_placeholder)}</strong></td>
                  <td>
                    <strong style="font-size:1.05rem">${placar}</strong>
                    ${p.penaltis_mandante !== null && p.penaltis_visitante !== null ? `<div class="tiny muted">Pên: ${p.penaltis_mandante}×${p.penaltis_visitante}</div>` : ''}
                  </td>
                  <td><strong>${esc(v ? v.nome : p.visitante_placeholder)}</strong></td>
                  <td>
                    ${p.status === 'ao_vivo'
                      ? `<span class="pill live">● AO VIVO (${esc(p.periodo_atual)})</span>`
                      : (p.status === 'encerrada' ? `<span class="pill ok">Encerrada</span>` : (p.status === 'adiada' ? `<span class="pill warn">Adiada</span>` : `<span class="pill">Agendada</span>`))}
                  </td>
                  <td class="actions">
                    <a class="btn ${p.status === 'ao_vivo' ? 'btn-danger' : 'btn-primary'} btn-xs" href="/admin/partida/${p.id}">🎛️ Operar</a>
                    <a class="btn btn-light btn-xs" href="/sumula/${p.id}" target="_blank">📄 Súmula</a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <details class="card mt-3">
      <summary style="cursor:pointer;font-weight:850;color:var(--blue-deep)">➕ Cadastrar Partida Extra / Amistoso na Tabela</summary>
      <form method="post" action="/admin/partidas/criar" class="grid mt-2">
        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
        <div class="grid grid-4">
          <div class="form-group">
            <label>Nº do Jogo *</label>
            <input class="input" type="number" name="numero_jogo" value="${partidas.length + 1}" required>
          </div>
          <div class="form-group">
            <label>Fase *</label>
            <select class="select" name="fase">
              <option value="grupos">Fase de Grupos</option>
              <option value="quartas">Quartas de Final</option>
              <option value="semifinal">Semifinal</option>
              <option value="terceiro">Disputa de 3º Lugar</option>
              <option value="final">Grande Final</option>
            </select>
          </div>
          <div class="form-group">
            <label>Chave (se grupos)</label>
            <input class="input" name="chave" maxlength="2" placeholder="A, B, C ou D">
          </div>
          <div class="form-group">
            <label>Local</label>
            <input class="input" name="local" value="${esc(campeonato.estadio_padrao)}">
          </div>
        </div>
        <div class="grid grid-4">
          <div class="form-group">
            <label>Data (DD/MM/AAAA) *</label>
            <input class="input" name="data_jogo" placeholder="25/12/2026" required>
          </div>
          <div class="form-group">
            <label>Horário (HH:MM) *</label>
            <input class="input" name="hora_jogo" placeholder="17:00" required>
          </div>
          <div class="form-group">
            <label>Mandante</label>
            <select class="select" name="mandante_id">
              <option value="">A definir (Placeholder)</option>
              ${equipes.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Visitante</label>
            <select class="select" name="visitante_id">
              <option value="">A definir (Placeholder)</option>
              ${equipes.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group"><label>Texto Placeholder Mandante (opcional)</label><input class="input" name="mandante_placeholder" placeholder="Ex.: Perdedor Jogo 17"></div>
          <div class="form-group"><label>Texto Placeholder Visitante (opcional)</label><input class="input" name="visitante_placeholder" placeholder="Ex.: Perdedor Jogo 18"></div>
        </div>
        <button type="submit" class="btn btn-primary">Adicionar Partida</button>
      </form>
    </details>
  `;

  return layoutAdmin({
    titulo: 'Partidas e Operação Ao Vivo',
    subtitulo: 'Gerencie datas, placares, cronômetro em tempo real e súmulas',
    secao: 'partidas',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaOperarPartidaAdmin(ctx) {
  const {
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    partida,
    equipes,
    atletasMandante,
    atletasVisitante,
    relacionadosIds,
    eventos,
    csrfToken
  } = ctx;

  const eqMap = {};
  for (const e of equipes) eqMap[e.id] = e;
  const m = partida.mandante_id ? eqMap[partida.mandante_id] : null;
  const v = partida.visitante_id ? eqMap[partida.visitante_id] : null;
  const numFmt = String(partida.numero_jogo).padStart(2, '0');
  const minSugerido = Math.max(1, Math.ceil(segundosAtuaisCronometro(partida) / 60));

  const todosAtletasJogo = [
    ...atletasMandante.map(a => ({ ...a, equipeNome: m?.nome || 'Mandante' })),
    ...atletasVisitante.map(a => ({ ...a, equipeNome: v?.nome || 'Visitante' }))
  ];

  const ehJogoInauguralChave = partida.numero_jogo >= 1 && partida.numero_jogo <= 4;
  const ehMataMata = partida.fase !== 'grupos';

  const conteudo = `
    <div class="actions mb-2" style="justify-content:space-between">
      <a class="btn btn-light btn-sm" href="/admin/partidas">← Todas as Partidas</a>
      <div class="actions">
        <a class="btn btn-outline btn-sm" href="/jogo/${partida.id}" target="_blank">🌐 Ver no Portal</a>
        <a class="btn btn-outline btn-sm" href="/sumula/${partida.id}" target="_blank">🖨️ Súmula Eletrônica</a>
        <button type="button" class="btn btn-gold btn-sm"
          data-share-card
          data-jogo-numero="${numFmt}"
          data-titulo-arte="${partida.status === 'encerrada' ? 'FIM DE JOGO' : (partida.status === 'ao_vivo' ? 'JOGO AO VIVO' : 'DIA DE JOGO')}"
          data-etiqueta="JOGO ${numFmt} • ${esc(partida.chave ? 'CHAVE ' + partida.chave : partida.fase.toUpperCase())}"
          data-mandante-nome="${esc(m?.nome || partida.mandante_placeholder)}"
          data-visitante-nome="${esc(v?.nome || partida.visitante_placeholder)}"
          data-mandante-escudo="${esc(m?.escudo_url || '')}"
          data-visitante-escudo="${esc(v?.escudo_url || '')}"
          data-placar-texto="${partida.status === 'agendada' ? '×' : `${Number(partida.gols_mandante ?? 0)} × ${Number(partida.gols_visitante ?? 0)}`}"
          data-chave-texto="${esc(partida.chave ? 'Chave ' + partida.chave : partida.titulo_fase)}"
          data-data-hora="${esc(partida.data_jogo + ' às ' + partida.hora_jogo)}"
          data-local="${esc(partida.local)}">
          📲 Gerar Arte Social (PNG)
        </button>
      </div>
    </div>

    <!-- Placar e Controle Ao Vivo -->
    <div class="card mb-3" style="border:2px solid ${partida.status === 'ao_vivo' ? '#ef4444' : 'var(--line)'}">
      <div class="text-center mb-2">
        <span class="pill ${partida.status === 'ao_vivo' ? 'live' : (partida.status === 'encerrada' ? 'ok' : 'gold')}">
          JOGO ${numFmt} • ${partida.status === 'ao_vivo' ? `AO VIVO (${partida.periodo_atual})` : partida.status.toUpperCase()}
        </span>
        <div class="small muted mt-1">${esc(partida.data_jogo)} às ${esc(partida.hora_jogo)} • ${esc(partida.local)}</div>
      </div>

      <div class="score-card" style="max-width:760px;margin:0 auto">
        <div class="team-side">
          ${m ? renderBadgeEscudo(m, 'team-badge-lg') : `<span class="team-badge team-badge-lg">⚽</span>`}
          <div><strong>${esc(m?.nome || partida.mandante_placeholder)}</strong><span class="tiny muted" style="display:block">Mandante</span></div>
        </div>
        <div class="score-box">
          <div class="score" style="font-size:2.4rem">${Number(partida.gols_mandante ?? 0)} × ${Number(partida.gols_visitante ?? 0)}</div>
          ${partida.penaltis_mandante !== null && partida.penaltis_visitante !== null ? `<div class="tiny muted">Pênaltis: ${partida.penaltis_mandante} × ${partida.penaltis_visitante}</div>` : ''}
          ${renderCronometro(partida, campeonato.tempo_periodo_min, 'mt-1')}
        </div>
        <div class="team-side right">
          <div><strong>${esc(v?.nome || partida.visitante_placeholder)}</strong><span class="tiny muted" style="display:block">Visitante</span></div>
          ${v ? renderBadgeEscudo(v, 'team-badge-lg') : `<span class="team-badge team-badge-lg">⚽</span>`}
        </div>
      </div>

      <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">

      <!-- Botões de Cronômetro e Período -->
      <div style="display:flex;justify-content:center;gap:8px;flex-wrap:wrap">
        <form method="post" action="/admin/partida/${partida.id}/cronometro" style="margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="acao" value="iniciar_1t">
          <button type="submit" class="btn btn-success btn-sm">▶️ Iniciar 1º Tempo</button>
        </form>
        <form method="post" action="/admin/partida/${partida.id}/cronometro" style="margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="acao" value="intervalo">
          <button type="submit" class="btn btn-gold btn-sm">⏸️ Intervalo</button>
        </form>
        <form method="post" action="/admin/partida/${partida.id}/cronometro" style="margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="acao" value="iniciar_2t">
          <button type="submit" class="btn btn-success btn-sm">▶️ Iniciar 2º Tempo</button>
        </form>
        ${partida.status === 'ao_vivo' ? `
          <form method="post" action="/admin/partida/${partida.id}/cronometro" style="margin:0">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <input type="hidden" name="acao" value="${partida.cronometro_rodando ? 'pausar' : 'retomar'}">
            <button type="submit" class="btn btn-outline btn-sm">${partida.cronometro_rodando ? '⏸️ Pausar Relógio' : '▶️ Retomar Relógio'}</button>
          </form>
        ` : ''}
        <form method="post" action="/admin/partida/${partida.id}/cronometro" style="margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="acao" value="penaltis">
          <button type="submit" class="btn btn-light btn-sm">🥅 Ir para Pênaltis</button>
        </form>
        <form method="post" action="/admin/partida/${partida.id}/cronometro" style="display:flex;gap:4px;margin:0">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="acao" value="acrescimos">
          <input class="input" type="number" name="minutos" min="0" max="25" value="${partida.acrescimos_min || 3}" style="width:68px;padding:6px 8px">
          <button type="submit" class="btn btn-light btn-sm">+ Acréscimos</button>
        </form>
        ${partida.status === 'encerrada' ? `
          <form method="post" action="/admin/partida/${partida.id}/cronometro" style="margin:0">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <input type="hidden" name="acao" value="reabrir">
            <button type="submit" class="btn btn-outline btn-sm" data-confirm="Reabrir partida para ajustes?">🔓 Reabrir Jogo</button>
          </form>
        ` : ''}
      </div>
    </div>

    <div class="grid grid-2">
      <!-- Lançador de Eventos Ao Vivo -->
      <section class="card">
        <h3 class="card-title">⚡ Lançar Evento na Partida (Notifica o Portal em 4s!)</h3>
        ${(!m || !v) ? `
          <div class="flash flash-warning">Defina as duas equipes da partida antes de lançar gols ou cartões individuais.</div>
        ` : ''}
        <form method="post" action="/admin/partida/${partida.id}/evento" class="grid">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <div class="grid grid-3">
            <div class="form-group">
              <label>Tipo de Evento *</label>
              <select class="select" name="tipo" required>
                <option value="gol">⚽ Gol (soma no placar)</option>
                <option value="amarelo">🟨 Cartão Amarelo</option>
                <option value="vermelho">🟥 Cartão Vermelho</option>
                <option value="substituicao">🔄 Substituição</option>
                <option value="gol_contra">⚽ Gol Contra (soma p/ adversário)</option>
                <option value="ocorrencia">📝 Ocorrência de Súmula</option>
              </select>
            </div>
            <div class="form-group">
              <label>Período</label>
              <select class="select" name="periodo">
                <option value="1T" ${partida.periodo_atual === '1T' ? 'selected' : ''}>1º Tempo</option>
                <option value="2T" ${partida.periodo_atual === '2T' ? 'selected' : ''}>2º Tempo</option>
                <option value="INT" ${partida.periodo_atual === 'INT' ? 'selected' : ''}>Intervalo</option>
                <option value="PEN" ${partida.periodo_atual === 'PEN' ? 'selected' : ''}>Pênaltis</option>
              </select>
            </div>
            <div class="form-group">
              <label>Minuto</label>
              <input class="input" name="minuto" value="${partida.status === 'ao_vivo' ? minSugerido : ''}" placeholder="Ex.: 23">
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>Equipe do Evento *</label>
              <select class="select" name="equipe_id">
                ${m ? `<option value="${m.id}">${esc(m.nome)} (Mandante)</option>` : ''}
                ${v ? `<option value="${v.id}">${esc(v.nome)} (Visitante)</option>` : ''}
              </select>
            </div>
            <div class="form-group">
              <label>Atleta Principal (Autor / Advertido / Sai)</label>
              <select class="select" name="atleta_id">
                <option value="">— Sem atleta específico / Geral —</option>
                ${m && atletasMandante.length ? `<optgroup label="${esc(m.nome)}">${atletasMandante.map(a => `<option value="${a.id}">${a.numero ? `#${a.numero} ` : ''}${esc(a.apelido || a.nome)}</option>`).join('')}</optgroup>` : ''}
                ${v && atletasVisitante.length ? `<optgroup label="${esc(v.nome)}">${atletasVisitante.map(a => `<option value="${a.id}">${a.numero ? `#${a.numero} ` : ''}${esc(a.apelido || a.nome)}</option>`).join('')}</optgroup>` : ''}
              </select>
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>2º Atleta (Assistência ou Quem Entra)</label>
              <select class="select" name="atleta_secundario_id">
                <option value="">— Nenhum —</option>
                ${m && atletasMandante.length ? `<optgroup label="${esc(m.nome)}">${atletasMandante.map(a => `<option value="${a.id}">${a.numero ? `#${a.numero} ` : ''}${esc(a.apelido || a.nome)}</option>`).join('')}</optgroup>` : ''}
                ${v && atletasVisitante.length ? `<optgroup label="${esc(v.nome)}">${atletasVisitante.map(a => `<option value="${a.id}">${a.numero ? `#${a.numero} ` : ''}${esc(a.apelido || a.nome)}</option>`).join('')}</optgroup>` : ''}
              </select>
            </div>
            <div class="form-group">
              <label>Detalhe / Observação (opcional)</label>
              <input class="input" name="observacao" placeholder="Ex.: Cobrança de falta no ângulo">
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block">⚡ Registrar Evento Agora</button>
        </form>

        <hr style="border:0;border-top:1px solid var(--line);margin:18px 0">
        <h4 class="card-title mb-1">Linha do Tempo Registrada (${eventos.length})</h4>
        ${eventos.length ? `
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Min</th><th>Tipo</th><th>Equipe / Atleta</th><th>Ação</th></tr></thead>
              <tbody>
                ${eventos.map(ev => `
                  <tr>
                    <td>${esc(ev.periodo)} ${ev.minuto ? `${esc(ev.minuto)}'` : ''}</td>
                    <td><strong>${esc(ev.tipo.toUpperCase())}</strong></td>
                    <td>
                      ${esc(ev.equipe_nome || '')}
                      ${ev.atleta_nome ? ` • <strong>${esc(ev.atleta_nome)}</strong>` : ''}
                      ${ev.atleta_sec_nome ? ` (${esc(ev.atleta_sec_nome)})` : ''}
                    </td>
                    <td>
                      <form method="post" action="/admin/partida/${partida.id}/evento/remover" style="margin:0">
                        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                        <input type="hidden" name="evento_id" value="${ev.id}">
                        <button type="submit" class="btn btn-danger btn-xs" data-confirm="Remover este evento? Se for gol, o placar será recalculado.">×</button>
                      </form>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty small">Nenhum evento lançado ainda.</div>`}
      </section>

      <!-- Fechamento de Placar, Súmula e Dados da Partida -->
      <section class="card">
        <h3 class="card-title">🏁 Placar Oficial, Encerramento e Dados de Súmula</h3>
        <form method="post" action="/admin/partida/${partida.id}/salvar" enctype="multipart/form-data" class="grid">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">

          <div class="grid grid-3">
            <div class="form-group">
              <label>Status da Partida</label>
              <select class="select" name="status">
                <option value="agendada" ${partida.status === 'agendada' ? 'selected' : ''}>Agendada</option>
                <option value="ao_vivo" ${partida.status === 'ao_vivo' ? 'selected' : ''}>Ao Vivo</option>
                <option value="encerrada" ${partida.status === 'encerrada' ? 'selected' : ''}>Encerrada (Homologada)</option>
                <option value="adiada" ${partida.status === 'adiada' ? 'selected' : ''}>Adiada</option>
              </select>
            </div>
            <div class="form-group">
              <label>Gols Mandante</label>
              <input class="input" type="number" min="0" max="50" name="gols_mandante" value="${partida.gols_mandante ?? ''}" placeholder="0">
            </div>
            <div class="form-group">
              <label>Gols Visitante</label>
              <input class="input" type="number" min="0" max="50" name="gols_visitante" value="${partida.gols_visitante ?? ''}" placeholder="0">
            </div>
          </div>

          ${(ehJogoInauguralChave || ehMataMata) ? `
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px" class="grid">
              <div class="tiny" style="font-weight:850;color:#855500">
                ⚖️ Critério de Desempate / Cruzamento (${ehJogoInauguralChave ? 'Em caso de empate nos Jogos 01–04, defina quem assume a vaga VENCEDOR vs PERDEDOR da chave' : 'Em caso de empate no Mata-mata, informe os pênaltis'}):
              </div>
              <div class="grid grid-3">
                <div class="form-group">
                  <label>Pênaltis Mandante</label>
                  <input class="input" type="number" min="0" max="30" name="penaltis_mandante" value="${partida.penaltis_mandante ?? ''}">
                </div>
                <div class="form-group">
                  <label>Pênaltis Visitante</label>
                  <input class="input" type="number" min="0" max="30" name="penaltis_visitante" value="${partida.penaltis_visitante ?? ''}">
                </div>
                <div class="form-group">
                  <label>Vencedor p/ Cruzamento</label>
                  <select class="select" name="vencedor_definido_id">
                    <option value="">Automático (Placar/Pênaltis)</option>
                    ${m ? `<option value="${m.id}" ${partida.vencedor_definido_id === m.id ? 'selected' : ''}>${esc(m.nome)}</option>` : ''}
                    ${v ? `<option value="${v.id}" ${partida.vencedor_definido_id === v.id ? 'selected' : ''}>${esc(v.nome)}</option>` : ''}
                  </select>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="grid grid-2">
            <div class="form-group">
              <label>Mandante</label>
              <select class="select" name="mandante_id">
                <option value="">A definir (${esc(partida.mandante_placeholder || 'Placeholder')})</option>
                ${equipes.map(e => `<option value="${e.id}" ${partida.mandante_id === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Visitante</label>
              <select class="select" name="visitante_id">
                <option value="">A definir (${esc(partida.visitante_placeholder || 'Placeholder')})</option>
                ${equipes.map(e => `<option value="${e.id}" ${partida.visitante_id === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-3">
            <div class="form-group">
              <label>Data (DD/MM/AAAA)</label>
              <input class="input" name="data_jogo" value="${esc(partida.data_jogo)}" required>
            </div>
            <div class="form-group">
              <label>Horário (HH:MM)</label>
              <input class="input" name="hora_jogo" value="${esc(partida.hora_jogo)}" required>
            </div>
            <div class="form-group">
              <label>Estádio / Local</label>
              <input class="input" name="local" value="${esc(partida.local)}">
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>Árbitro Principal</label>
              <input class="input" name="arbitro_principal" value="${esc(partida.arbitro_principal || '')}">
            </div>
            <div class="form-group">
              <label>Quarto Árbitro / Mesário</label>
              <input class="input" name="mesario" value="${esc(partida.mesario || '')}">
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>Assistente 1</label>
              <input class="input" name="assistente_1" value="${esc(partida.assistente_1 || '')}">
            </div>
            <div class="form-group">
              <label>Assistente 2</label>
              <input class="input" name="assistente_2" value="${esc(partida.assistente_2 || '')}">
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>⭐ Craque da Partida</label>
              <select class="select" name="craque_atleta_id">
                <option value="">— Não selecionado —</option>
                ${todosAtletasJogo.map(a => `<option value="${a.id}" ${partida.craque_atleta_id === a.id ? 'selected' : ''}>${esc(a.apelido || a.nome)} (${esc(a.equipeNome)})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>📑 Anexar Súmula Assinada (PDF)</label>
              <input class="input" type="file" name="sumula_pdf" accept=".pdf">
              ${partida.sumula_pdf_url ? `<a href="${esc(partida.sumula_pdf_url)}" target="_blank" class="tiny" style="color:var(--green)">✔ PDF atual publicado</a>` : ''}
            </div>
          </div>

          <div class="form-group">
            <label>Observações Oficiais de Súmula</label>
            <textarea class="textarea" name="observacoes_sumula" style="min-height:74px">${esc(partida.observacoes_sumula || '')}</textarea>
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary">💾 Salvar Dados da Partida</button>
            ${partida.status !== 'encerrada' ? `
              <button type="submit" name="encerrar_agora" value="1" class="btn btn-success" data-confirm="Confirmar encerramento da partida e atualização automática da classificação e cruzamentos?">🏁 Encerrar e Homologar Jogo</button>
            ` : ''}
          </div>
        </form>
      </section>
    </div>

    ${(m || v) ? `
      <section class="card mt-3">
        <h3 class="card-title">👟 Relação Nominal de Atletas na Súmula (Marca automaticamente quem atuou)</h3>
        <form method="post" action="/admin/partida/${partida.id}/relacionados">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <div class="grid grid-2">
            <div>
              <h4 class="mb-1">${esc(m?.nome || 'Mandante')}</h4>
              ${atletasMandante.length ? atletasMandante.map(a => `
                <label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)" class="small">
                  <input type="checkbox" name="atletas_ids" value="${a.id}" ${relacionadosIds.has(a.id) ? 'checked' : ''}>
                  <strong>#${a.numero ?? '—'}</strong> ${esc(a.apelido || a.nome)} <span class="tiny muted">(${esc(a.posicao)})</span>
                </label>
              `).join('') : `<div class="small muted">Sem atletas ativos cadastrados nesta equipe.</div>`}
            </div>
            <div>
              <h4 class="mb-1">${esc(v?.nome || 'Visitante')}</h4>
              ${atletasVisitante.length ? atletasVisitante.map(a => `
                <label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)" class="small">
                  <input type="checkbox" name="atletas_ids" value="${a.id}" ${relacionadosIds.has(a.id) ? 'checked' : ''}>
                  <strong>#${a.numero ?? '—'}</strong> ${esc(a.apelido || a.nome)} <span class="tiny muted">(${esc(a.posicao)})</span>
                </label>
              `).join('') : `<div class="small muted">Sem atletas ativos cadastrados nesta equipe.</div>`}
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-sm mt-2">Salvar Relação da Partida</button>
        </form>
      </section>
    ` : ''}
  `;

  return layoutAdmin({
    titulo: `Operar Jogo ${numFmt}`,
    subtitulo: `${m?.nome || partida.mandante_placeholder} × ${v?.nome || partida.visitante_placeholder}`,
    secao: 'partidas',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaEquipesAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, equipes, equipeEditando, csrfToken } = ctx;

  const conteudo = `
    <div class="card mb-3" style="border-left:4px solid var(--green)">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div>
          <h3 class="card-title mb-0">➕ Cadastrar Nova Equipe na Competição</h3>
          <div class="tiny muted">Cadastre a equipe e as credenciais do dirigente por aqui ou envie o link de cadastro direto: <a href="/dirigente/login?modo=cadastro" target="_blank" style="color:var(--blue);font-weight:800">/dirigente/login?modo=cadastro ↗</a></div>
        </div>
      </div>
      <form method="post" action="/admin/equipes/salvar" enctype="multipart/form-data" class="grid">
        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
        <div class="grid grid-4">
          <div class="form-group"><label>Nome da Equipe *</label><input class="input" name="nome" placeholder="Ex: Real Quiterianópolis" required></div>
          <div class="form-group"><label>Sigla (3 letras) *</label><input class="input" name="sigla" maxlength="5" placeholder="Ex: RQT" style="text-transform:uppercase" required></div>
          <div class="form-group">
            <label>Chave *</label>
            <select class="select" name="chave" required>
              <option value="A">Chave A</option>
              <option value="B">Chave B</option>
              <option value="C">Chave C</option>
              <option value="D">Chave D</option>
            </select>
          </div>
          <div class="form-group"><label>Localidade / Bairro</label><input class="input" name="localidade" value="Quiterianópolis - CE"></div>
        </div>
        <div class="grid grid-4">
          <div class="form-group"><label>Nome do Dirigente *</label><input class="input" name="dirigente_nome" placeholder="Nome do representante" required></div>
          <div class="form-group"><label>CPF de Login *</label><input class="input" name="dirigente_cpf" data-mask="cpf" placeholder="000.000.000-00" required></div>
          <div class="form-group"><label>Senha Inicial *</label><input class="input" type="text" name="nova_senha" value="equipe2026" required></div>
          <div class="form-group"><label>Escudo (PNG/JPG)</label><input class="input" type="file" name="escudo" accept=".png,.jpg,.jpeg,.webp,.svg"></div>
        </div>
        <div>
          <button type="submit" class="btn btn-success">✅ Cadastrar Nova Equipe</button>
        </div>
      </form>
    </div>

    ${equipeEditando ? `
      <div class="card mb-3" style="border:2px solid var(--blue)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <h3 class="card-title mb-0">✏️ Editando Equipe: ${esc(equipeEditando.nome)}</h3>
          <a class="btn btn-light btn-xs" href="/admin/equipes">Cancelar Edição</a>
        </div>
        <form method="post" action="/admin/equipes/salvar" enctype="multipart/form-data" class="grid">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <input type="hidden" name="equipe_id" value="${equipeEditando.id}">
          <div class="grid grid-4">
            <div class="form-group"><label>Nome Oficial *</label><input class="input" name="nome" value="${esc(equipeEditando.nome)}" required></div>
            <div class="form-group"><label>Sigla (3 letras) *</label><input class="input" name="sigla" maxlength="5" value="${esc(equipeEditando.sigla)}" required></div>
            <div class="form-group"><label>Chave *</label><input class="input" name="chave" maxlength="2" value="${esc(equipeEditando.chave)}" required></div>
            <div class="form-group"><label>Localidade / Bairro</label><input class="input" name="localidade" value="${esc(equipeEditando.localidade)}"></div>
          </div>
          <div class="grid grid-4">
            <div class="form-group"><label>Nome do Dirigente</label><input class="input" name="dirigente_nome" value="${esc(equipeEditando.dirigente_nome || '')}"></div>
            <div class="form-group"><label>CPF de Login do Dirigente</label><input class="input" name="dirigente_cpf" data-mask="cpf" value="${esc(formatarCpf(equipeEditando.dirigente_cpf))}"></div>
            <div class="form-group"><label>Telefone / WhatsApp</label><input class="input" name="dirigente_telefone" data-mask="phone" value="${esc(equipeEditando.dirigente_telefone || '')}"></div>
            <div class="form-group"><label>Redefinir Senha (opcional)</label><input class="input" type="password" name="nova_senha" placeholder="Deixe vazio p/ manter"></div>
          </div>
          <div class="grid grid-3">
            <div class="form-group">
              <label>Controle de Janela de Inscrição</label>
              <select class="select" name="janela_aberta_manual">
                <option value="" ${equipeEditando.janela_aberta_manual === null ? 'selected' : ''}>Automático (bloqueia ${campeonato.bloqueio_horas_antes}h antes do jogo)</option>
                <option value="1" ${equipeEditando.janela_aberta_manual === 1 ? 'selected' : ''}>🔓 Forçar Janela Aberta</option>
                <option value="0" ${equipeEditando.janela_aberta_manual === 0 ? 'selected' : ''}>🔒 Forçar Janela Bloqueada</option>
              </select>
            </div>
            <div class="form-group">
              <label>Ordem de Sorteio</label>
              <input class="input" type="number" name="ordem_sorteio" value="${equipeEditando.ordem_sorteio || 1}">
            </div>
            <div class="form-group">
              <label>Trocar Escudo (PNG/JPG opcional)</label>
              <input class="input" type="file" name="escudo" accept=".png,.jpg,.jpeg,.webp,.svg">
            </div>
          </div>
          <button type="submit" class="btn btn-primary">💾 Salvar Alterações da Equipe</button>
        </form>
      </div>
    ` : ''}

    <div class="card">
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Escudo</th><th>Equipe</th><th>Chave</th><th>Dirigente / CPF Login</th><th>Elenco</th><th>Janela</th><th>Ações</th></tr></thead>
          <tbody>
            ${equipes.map(eq => `
              <tr>
                <td>${renderBadgeEscudo(eq)}</td>
                <td><strong>${esc(eq.nome)}</strong><div class="tiny muted">${esc(eq.localidade)} • ${esc(eq.sigla)}</div></td>
                <td><span class="pill chave-tag">Chave ${esc(eq.chave)}</span></td>
                <td>
                  <strong>${esc(eq.dirigente_nome || '—')}</strong>
                  <div class="tiny muted">CPF: <code>${esc(formatarCpf(eq.dirigente_cpf))}</code></div>
                </td>
                <td><span class="pill">${eq.total_atletas || 0} atletas</span></td>
                <td>
                  ${eq.janela_aberta_manual === 1
                    ? `<span class="pill ok">Aberta (Manual)</span>`
                    : (eq.janela_aberta_manual === 0 ? `<span class="pill danger">Fechada (Manual)</span>` : `<span class="pill">Automática</span>`)}
                </td>
                <td class="actions">
                  <a class="btn btn-primary btn-xs" href="/admin/equipes?editar=${eq.id}">✏️ Editar</a>
                  <a class="btn btn-light btn-xs" href="/equipe/${eq.id}" target="_blank">Ver</a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return layoutAdmin({
    titulo: 'Equipes e Credenciais de Dirigentes',
    subtitulo: 'Gerencie escudos, chaves, CPFs de acesso e janelas de inscrição',
    secao: 'equipes',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaAtletasAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, atletas, equipes, filtroEquipeId, csrfToken } = ctx;

  const conteudo = `
    <div class="card mb-3">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <form method="get" action="/admin/atletas" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <label class="small" style="font-weight:800">Filtrar por Equipe:</label>
          <select class="select" name="equipe" data-auto-submit style="width:auto;min-width:220px">
            <option value="">Todas as Equipes (${atletas.length})</option>
            ${equipes.map(e => `<option value="${e.id}" ${Number(filtroEquipeId) === e.id ? 'selected' : ''}>${esc(e.nome)} (Chave ${esc(e.chave)})</option>`).join('')}
          </select>
        </form>
      </div>
    </div>

    <details class="card mb-3">
      <summary style="cursor:pointer;font-weight:850;color:var(--blue-deep)">➕ Inscrever Atleta Diretamente pela Comissão Organizadora</summary>
      <form method="post" action="/admin/atletas/adicionar" enctype="multipart/form-data" class="grid mt-2">
        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
        <div class="grid grid-4">
          <div class="form-group">
            <label>Equipe *</label>
            <select class="select" name="equipe_id" required>
              ${equipes.map(e => `<option value="${e.id}" ${Number(filtroEquipeId) === e.id ? 'selected' : ''}>${esc(e.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Nome Completo *</label><input class="input" name="nome" required></div>
          <div class="form-group"><label>Apelido</label><input class="input" name="apelido"></div>
          <div class="form-group"><label>CPF *</label><input class="input" name="cpf" data-mask="cpf" required></div>
        </div>
        <div class="grid grid-4">
          <div class="form-group"><label>Nº Camisa</label><input class="input" type="number" name="numero" min="1" max="99"></div>
          <div class="form-group">
            <label>Posição</label>
            <select class="select" name="posicao">
              <option>Goleiro</option><option>Zagueiro</option><option>Lateral</option><option>Volante</option><option selected>Meia</option><option>Atacante</option>
            </select>
          </div>
          <div class="form-group">
            <label>Origem</label>
            <select class="select" name="origem">
              <option value="local">Local (Quiterianópolis)</option>
              <option value="fora">De Fora</option>
            </select>
          </div>
          <div class="form-group"><label>Foto (opcional)</label><input class="input" type="file" name="foto" accept=".png,.jpg,.jpeg,.webp"></div>
        </div>
        <button type="submit" class="btn btn-primary">Cadastrar e Homologar Atleta</button>
      </form>
    </details>

    <div class="card">
      ${atletas.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Equipe</th><th>Nº / Atleta</th><th>CPF</th><th>Origem</th><th>Status</th><th>Suspensão</th><th>Ações</th></tr></thead>
            <tbody>
              ${atletas.map(a => `
                <tr>
                  <td><strong>${esc(a.equipe_nome)}</strong></td>
                  <td>
                    <strong>#${a.numero ?? '—'} ${esc(a.apelido || a.nome)}</strong>
                    <div class="tiny muted">${esc(a.nome)} • ${esc(a.posicao)}</div>
                  </td>
                  <td class="small"><code>${esc(formatarCpf(a.cpf))}</code></td>
                  <td>${a.origem === 'fora' ? `<span class="pill warn">De Fora</span>` : `<span class="pill ok">Local</span>`}</td>
                  <td>
                    ${a.status === 'confirmado'
                      ? `<span class="pill ok">Confirmado</span>`
                      : (a.status === 'pendente' ? `<span class="pill warn">Pendente</span>` : `<span class="pill">Inativo</span>`)}
                  </td>
                  <td>
                    ${a.suspenso_manual ? `<span class="pill danger">Suspenso (Comissão)</span>` : '<span class="tiny muted">Automático</span>'}
                  </td>
                  <td class="actions">
                    ${a.status !== 'confirmado' ? `
                      <form method="post" action="/admin/atletas/status" style="margin:0">
                        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                        <input type="hidden" name="atleta_id" value="${a.id}">
                        <input type="hidden" name="status" value="confirmado">
                        <button type="submit" class="btn btn-success btn-xs">✔ Aprovar</button>
                      </form>
                    ` : ''}
                    <form method="post" action="/admin/atletas/suspensao" style="margin:0">
                      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                      <input type="hidden" name="atleta_id" value="${a.id}">
                      <button type="submit" class="btn btn-light btn-xs">${a.suspenso_manual ? 'Liberar Susp.' : '⚖️ Suspender'}</button>
                    </form>
                    <form method="post" action="/admin/atletas/excluir" style="margin:0">
                      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                      <input type="hidden" name="atleta_id" value="${a.id}">
                      <button type="submit" class="btn btn-danger btn-xs" data-confirm="Excluir/inativar atleta?">×</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Nenhum atleta encontrado para o filtro selecionado.</div>`}
    </div>
  `;

  return layoutAdmin({
    titulo: 'Atletas e Homologação de Elencos',
    subtitulo: 'Aprove atletas inscritos pelos clubes, gerencie vagas de fora e suspensões',
    secao: 'atletas',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaGaleriaAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, albuns, partidas, csrfToken } = ctx;

  const conteudo = `
    <div class="grid grid-2 mb-3">
      <section class="card">
        <h3 class="card-title">📸 Criar Novo Álbum de Fotos</h3>
        <form method="post" action="/admin/galeria/album" enctype="multipart/form-data" class="grid">
          <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
          <div class="form-group"><label>Título do Álbum *</label><input class="input" name="titulo" required placeholder="Ex.: Rodada de Abertura no Estádio Tualdão"></div>
          <div class="form-group">
            <label>Vincular a uma Partida (opcional)</label>
            <select class="select" name="partida_id">
              <option value="">— Álbum Geral —</option>
              ${partidas.map(p => `<option value="${p.id}">Jogo ${String(p.numero_jogo).padStart(2, '0')} (${esc(p.data_jogo)})</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Descrição</label><input class="input" name="descricao" placeholder="Breve resumo do álbum"></div>
          <div class="form-group"><label>Fotos Iniciais (pode selecionar várias)</label><input class="input" type="file" name="fotos" accept=".png,.jpg,.jpeg,.webp" multiple></div>
          <button type="submit" class="btn btn-primary">Criar Álbum</button>
        </form>
      </section>

      <section class="card">
        <h3 class="card-title">📤 Enviar Mais Fotos para Álbum Existente</h3>
        ${albuns.length ? `
          <form method="post" action="/admin/galeria/fotos" enctype="multipart/form-data" class="grid">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <div class="form-group">
              <label>Selecione o Álbum *</label>
              <select class="select" name="album_id" required>
                ${albuns.map(a => `<option value="${a.id}">${esc(a.titulo)} (${a.total_fotos} fotos)</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label>Legenda Padrão (opcional)</label><input class="input" name="legenda" placeholder="Ex.: Estádio Tualdão lotado"></div>
            <div class="form-group"><label>Selecionar Fotos *</label><input class="input" type="file" name="fotos" accept=".png,.jpg,.jpeg,.webp" multiple required></div>
            <button type="submit" class="btn btn-success">Enviar Fotos</button>
          </form>
        ` : `<div class="empty">Crie primeiro um álbum ao lado para enviar fotos.</div>`}
      </section>
    </div>

    <div class="card">
      <h3 class="card-title">Álbuns Publicados (${albuns.length})</h3>
      ${albuns.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Capa</th><th>Título</th><th>Fotos</th><th>Ações</th></tr></thead>
            <tbody>
              ${albuns.map(a => `
                <tr>
                  <td>${a.capa_url ? `<img src="${esc(a.capa_url)}" alt="" style="width:56px;height:40px;object-fit:cover;border-radius:6px">` : '📸'}</td>
                  <td><strong>${esc(a.titulo)}</strong><div class="tiny muted">${esc(a.descricao || '')}</div></td>
                  <td><span class="pill">${a.total_fotos} fotos</span></td>
                  <td class="actions">
                    <a class="btn btn-light btn-xs" href="/galeria?album=${a.id}" target="_blank">Ver no Portal</a>
                    <form method="post" action="/admin/galeria/excluir-album" style="margin:0">
                      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                      <input type="hidden" name="album_id" value="${a.id}">
                      <button type="submit" class="btn btn-danger btn-xs" data-confirm="Excluir álbum e todas as suas fotos?">Excluir</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Nenhum álbum cadastrado.</div>`}
    </div>
  `;

  return layoutAdmin({
    titulo: 'Galeria Oficial de Fotos',
    subtitulo: 'Publique registros fotográficos das rodadas no Estádio Tualdão',
    secao: 'galeria',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaAdiamentosAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, adiamentos, csrfToken } = ctx;

  const conteudo = `
    <div class="card">
      <h3 class="card-title">Solicitações de Adiamento Protocoladas (${adiamentos.length})</h3>
      ${adiamentos.length ? `
        <div class="grid">
          ${adiamentos.map(ad => `
            <div style="border:1px solid var(--line);border-radius:14px;padding:16px">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <strong>Jogo ${String(ad.numero_jogo).padStart(2, '0')} (${esc(ad.data_jogo)} às ${esc(ad.hora_jogo)}) — Solicitante: ${esc(ad.solicitante_nome)}</strong>
                <span class="pill ${ad.status_comissao === 'deferido' ? 'ok' : (ad.status_comissao === 'indeferido' ? 'danger' : 'warn')}">
                  ${esc(ad.status_comissao.toUpperCase())}
                </span>
              </div>
              <p class="small mb-1 mt-1"><strong>Motivo:</strong> ${esc(ad.motivo)}</p>
              <div class="tiny muted">Sugestão de data: ${esc(ad.nova_data_sugerida || 'Não informada')} • Manifestação do adversário (${esc(ad.adversario_nome || '—')}): <strong>${esc(ad.status_adversario)}</strong> ${ad.manifestacao_adversario ? `(${esc(ad.manifestacao_adversario)})` : ''}</div>

              ${ad.status_comissao === 'pendente' ? `
                <form method="post" action="/admin/adiamentos/decidir" class="grid mt-2" style="background:#f8fbff;padding:12px;border-radius:12px">
                  <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                  <input type="hidden" name="adiamento_id" value="${ad.id}">
                  <div class="grid grid-3">
                    <div class="form-group"><label>Parecer Oficial da Comissão</label><input class="input" name="parecer_comissao" placeholder="Despacho fundamentado..."></div>
                    <div class="form-group"><label>Nova Data (se deferido, DD/MM/AAAA)</label><input class="input" name="nova_data_jogo" placeholder="Ex.: 15/11/2026"></div>
                    <div class="form-group"><label>Novo Horário (HH:MM)</label><input class="input" name="nova_hora_jogo" placeholder="Ex.: 17:00"></div>
                  </div>
                  <div class="actions">
                    <button type="submit" name="status_comissao" value="deferido" class="btn btn-success btn-sm">✅ Deferir Adiamento</button>
                    <button type="submit" name="status_comissao" value="indeferido" class="btn btn-danger btn-sm">❌ Indeferir Pedido</button>
                  </div>
                </form>
              ` : `<div class="tiny mt-1"><strong>Parecer registrado:</strong> ${esc(ad.parecer_comissao || '—')}</div>`}
            </div>
          `).join('')}
        </div>
      ` : `<div class="empty">Nenhum pedido de adiamento protocolado pelas equipes até o momento.</div>`}
    </div>
  `;

  return layoutAdmin({
    titulo: 'Análise de Adiamentos',
    subtitulo: 'Julgue pedidos de remarcação com visualização da anuência do adversário',
    secao: 'adiamentos',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaDocumentosAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, documentos, equipes, assinaturasPorDoc, csrfToken } = ctx;

  const conteudo = `
    <div class="card mb-3">
      <h3 class="card-title">✍️ Publicar Novo Documento / Circular Oficial para as Equipes</h3>
      <form method="post" action="/admin/documentos/criar" enctype="multipart/form-data" class="grid">
        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
        <div class="grid grid-2">
          <div class="form-group"><label>Título Oficial do Documento *</label><input class="input" name="titulo" required placeholder="Ex.: Nota Oficial Nº 02/2026 — Orientações de Arbitragem"></div>
          <div class="form-group"><label>Anexo PDF (opcional)</label><input class="input" type="file" name="arquivo_pdf" accept=".pdf"></div>
        </div>
        <div class="form-group">
          <label>Texto Integral do Comunicado / Termo</label>
          <textarea class="textarea" name="conteudo_texto" placeholder="Digite o conteúdo que será exibido no painel de todos os dirigentes..."></textarea>
        </div>
        <div class="actions">
          <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="exige_assinatura" value="1" checked> Exigir assinatura eletrônica dos 12 clubes</label>
          <label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" name="chancela_secretario" value="1" checked> Incluir chancela do Secretário (${esc(campeonato.secretario_nome)})</label>
          <button type="submit" class="btn btn-primary" style="margin-left:auto">Publicar Documento</button>
        </div>
      </form>
    </div>

    <div class="grid">
      ${documentos.map(doc => {
        const assMap = assinaturasPorDoc[doc.id] || {};
        const totalAss = Object.keys(assMap).length;
        return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
              <div>
                <span class="pill gold">${totalAss}/${equipes.length} Equipes Assinaram</span>
                <h3 class="mt-1 mb-0" style="color:var(--blue-deep)">${esc(doc.titulo)}</h3>
              </div>
              <form method="post" action="/admin/documentos/excluir" style="margin:0">
                <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                <input type="hidden" name="documento_id" value="${doc.id}">
                <button type="submit" class="btn btn-danger btn-xs" data-confirm="Excluir este documento?">Excluir</button>
              </form>
            </div>
            <div class="grid grid-4 mt-2">
              ${equipes.map(eq => {
                const a = assMap[eq.id];
                return `
                  <div style="padding:8px 10px;border-radius:10px;border:1px solid ${a ? '#a7f3d0' : 'var(--line)'};background:${a ? '#ecfdf5' : '#f8fafc'}" class="tiny">
                    <strong>${esc(eq.nome)}</strong><br>
                    ${a ? `<span style="color:#065f46">✔ ${esc(a.assinado_em)}</span>` : `<span class="muted">⏳ Pendente</span>`}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  return layoutAdmin({
    titulo: 'Documentos Internos e Assinaturas',
    subtitulo: 'Controle de ciência eletrônica dos representantes das 12 equipes',
    secao: 'documentos',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaAvaliacoesAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, avaliacoes, csrfToken } = ctx;

  const conteudo = `
    <div class="card">
      <h3 class="card-title">Moderação de Avaliações do Portal (${avaliacoes.length})</h3>
      ${avaliacoes.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Data</th><th>Torcedor</th><th>Nota</th><th>Comentário</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              ${avaliacoes.map(av => `
                <tr>
                  <td class="tiny muted">${esc(av.criado_em)}</td>
                  <td><strong>${esc(av.nome)}</strong></td>
                  <td><span class="pill gold">${av.nota}/10</span></td>
                  <td class="small">${esc(av.comentario)}</td>
                  <td>
                    <span class="pill ${av.status === 'aprovada' ? 'ok' : (av.status === 'oculta' ? 'danger' : 'warn')}">${esc(av.status)}</span>
                  </td>
                  <td class="actions">
                    ${av.status !== 'aprovada' ? `
                      <form method="post" action="/admin/avaliacoes/status" style="margin:0">
                        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                        <input type="hidden" name="avaliacao_id" value="${av.id}">
                        <input type="hidden" name="status" value="aprovada">
                        <button type="submit" class="btn btn-success btn-xs">✔ Aprovar</button>
                      </form>
                    ` : `
                      <form method="post" action="/admin/avaliacoes/status" style="margin:0">
                        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                        <input type="hidden" name="avaliacao_id" value="${av.id}">
                        <input type="hidden" name="status" value="oculta">
                        <button type="submit" class="btn btn-light btn-xs">Ocultar</button>
                      </form>
                    `}
                    <form method="post" action="/admin/avaliacoes/excluir" style="margin:0">
                      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                      <input type="hidden" name="avaliacao_id" value="${av.id}">
                      <button type="submit" class="btn btn-danger btn-xs" data-confirm="Excluir avaliação permanentemente?">×</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Nenhuma avaliação enviada ainda.</div>`}
    </div>
  `;

  return layoutAdmin({
    titulo: 'Moderação de Avaliações',
    subtitulo: 'Aprove ou oculte comentários enviados pelos torcedores no mural público',
    secao: 'avaliacoes',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaFinanceiroAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, lancamentos, equipes, csrfToken } = ctx;
  const totalPago = lancamentos.filter(l => l.status === 'pago').reduce((s, l) => s + Number(l.valor || 0), 0);
  const totalPrevisto = lancamentos.reduce((s, l) => s + Number(l.valor || 0), 0);

  const conteudo = `
    <div class="grid grid-3 mb-3">
      <div class="card kpi"><div class="icon">💰</div><div class="value">${moeda(totalPrevisto)}</div><div class="label">Total Lançado / Previsto</div></div>
      <div class="card kpi"><div class="icon">✅</div><div class="value">${moeda(totalPago)}</div><div class="label">Total Pago / Quitado</div></div>
      <div class="card kpi"><div class="icon">⏳</div><div class="value">${moeda(totalPrevisto - totalPago)}</div><div class="label">Saldo Pendente</div></div>
    </div>

    <div class="card mb-3">
      <h3 class="card-title">➕ Registrar Repasse de Incentivo ou Premiação</h3>
      <form method="post" action="/admin/financeiro/adicionar" class="grid">
        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
        <div class="grid grid-4">
          <div class="form-group">
            <label>Equipe Beneficiada *</label>
            <select class="select" name="equipe_id" required>
              ${equipes.map(e => `<option value="${e.id}">${esc(e.nome)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Natureza *</label>
            <select class="select" name="tipo">
              <option value="incentivo">Incentivo de Participação</option>
              <option value="premiacao">Premiação Final</option>
              <option value="apoio_uniforme">Apoio de Material / Uniforme</option>
            </select>
          </div>
          <div class="form-group"><label>Valor (R$) *</label><input class="input" type="number" step="0.01" name="valor" required placeholder="1000.00"></div>
          <div class="form-group">
            <label>Status</label>
            <select class="select" name="status">
              <option value="previsto">Previsto / Empenhado</option>
              <option value="pago">Pago</option>
            </select>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group"><label>Data Pagamento / Previsão</label><input class="input" type="date" name="data_pagamento"></div>
          <div class="form-group"><label>Referência / Nº Processo / Observação</label><input class="input" name="observacao" placeholder="Ex.: Cota de apoio 1ª Fase"></div>
        </div>
        <button type="submit" class="btn btn-primary">Salvar Lançamento</button>
      </form>
    </div>

    <div class="card">
      <h3 class="card-title">Histórico Financeiro (${lancamentos.length})</h3>
      ${lancamentos.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Equipe</th><th>Tipo</th><th>Valor</th><th>Data</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              ${lancamentos.map(l => `
                <tr>
                  <td><strong>${esc(l.equipe_nome)}</strong></td>
                  <td>${esc(l.tipo)}<div class="tiny muted">${esc(l.observacao || '')}</div></td>
                  <td><strong>${moeda(l.valor)}</strong></td>
                  <td>${esc(l.data_pagamento || '—')}</td>
                  <td><span class="pill ${l.status === 'pago' ? 'ok' : 'warn'}">${esc(l.status.toUpperCase())}</span></td>
                  <td class="actions">
                    ${l.status !== 'pago' ? `
                      <form method="post" action="/admin/financeiro/quitar" style="margin:0">
                        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                        <input type="hidden" name="lancamento_id" value="${l.id}">
                        <button type="submit" class="btn btn-success btn-xs">Marcar Pago</button>
                      </form>
                    ` : ''}
                    <form method="post" action="/admin/financeiro/excluir" style="margin:0">
                      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                      <input type="hidden" name="lancamento_id" value="${l.id}">
                      <button type="submit" class="btn btn-danger btn-xs" data-confirm="Remover lançamento?">×</button>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty">Nenhum lançamento financeiro registrado.</div>`}
    </div>
  `;

  return layoutAdmin({
    titulo: 'Controle Financeiro Interno',
    subtitulo: 'Gestão interna de incentivos às equipes e pagamento de premiações',
    secao: 'financeiro',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaRelatoriosAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, classificacao, estatisticas, equipes } = ctx;

  const conteudo = `
    <div class="actions mb-3 no-print">
      <button type="button" class="btn btn-primary" data-print>🖨️ Imprimir / Exportar Relatório Geral em PDF</button>
    </div>

    <div class="card mb-3">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--blue-deep);padding-bottom:12px;margin-bottom:14px">
        <div>
          <h2 class="mt-0 mb-0" style="color:var(--blue-deep)">${esc(campeonato.nome)}</h2>
          <div class="small muted">${esc(campeonato.orgao)} • Secretário: ${esc(campeonato.secretario_nome)}</div>
        </div>
        <img src="/assets/branding/escudo-campeonato-2026.png" alt="" style="width:60px;height:60px;object-fit:contain">
      </div>

      <h3 class="card-title">1. Classificação Geral Oficial (${equipes.length} Equipes)</h3>
      <div class="table-wrap mb-3">
        <table class="table">
          <thead><tr><th>Pos</th><th>Equipe</th><th>Chave</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>GP</th><th>GC</th><th>SG</th><th>CA</th><th>CV</th></tr></thead>
          <tbody>
            ${classificacao.geral.map(item => `
              <tr>
                <td><strong>${item.posicaoGeral}º</strong></td>
                <td><strong>${esc(item.nome)}</strong></td>
                <td>Chave ${esc(item.chave)}</td>
                <td><strong>${item.p}</strong></td>
                <td>${item.j}</td><td>${item.v}</td><td>${item.e}</td><td>${item.d}</td>
                <td>${item.gp}</td><td>${item.gc}</td><td>${item.sg}</td>
                <td>${item.ca}</td><td>${item.cv}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <h3 class="card-title">2. Artilharia e Controle Disciplinar</h3>
      <div class="grid grid-2">
        <div>
          <h4>Principais Artilheiros</h4>
          ${estatisticas.artilharia.length ? `
            <table class="table">
              <thead><tr><th>Atleta</th><th>Equipe</th><th>Gols</th></tr></thead>
              <tbody>
                ${estatisticas.artilharia.slice(0, 15).map(a => `<tr><td><strong>${esc(a.apelido || a.nome)}</strong></td><td>${esc(a.equipe_nome)}</td><td><strong>${a.gols}</strong></td></tr>`).join('')}
              </tbody>
            </table>
          ` : `<div class="small muted">Sem gols registrados.</div>`}
        </div>
        <div>
          <h4>Suspensos e Pendurados</h4>
          ${estatisticas.disciplina.length ? `
            <table class="table">
              <thead><tr><th>Atleta</th><th>Equipe</th><th>CA/CV</th><th>Situação</th></tr></thead>
              <tbody>
                ${estatisticas.disciplina.map(d => `
                  <tr>
                    <td><strong>${esc(d.apelido || d.nome)}</strong></td>
                    <td>${esc(d.equipe_nome)}</td>
                    <td>${d.amarelos} CA / ${d.vermelhos} CV</td>
                    <td>${d.suspenso ? 'SUSPENSO' : (d.pendurado ? 'Pendurado' : 'Regular')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : `<div class="small muted">Sem cartões registrados.</div>`}
        </div>
      </div>
    </div>
  `;

  return layoutAdmin({
    titulo: 'Relatórios Oficiais Imprimíveis',
    subtitulo: 'Boletim consolidado da Secretaria Municipal de Esportes de Quiterianópolis',
    secao: 'relatorios',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

function paginaConfiguracoesAdmin(ctx) {
  const { campeonato, todosCampeonatos, admin, flash, csrfToken } = ctx;

  const conteudo = `
    <form method="post" action="/admin/configuracoes/salvar" class="grid">
      <input type="hidden" name="_csrf" value="${esc(csrfToken)}">

      <section class="card">
        <h3 class="card-title">🏛️ Identidade Oficial e Regras da Competição</h3>
        <div class="grid grid-3">
          <div class="form-group"><label>Nome Oficial *</label><input class="input" name="nome" value="${esc(campeonato.nome)}" required></div>
          <div class="form-group"><label>Nome Curto (Topo) *</label><input class="input" name="nome_curto" value="${esc(campeonato.nome_curto)}" required></div>
          <div class="form-group"><label>Rótulo da Divisão</label><input class="input" name="divisao_rotulo" value="${esc(campeonato.divisao_rotulo)}"></div>
        </div>
        <div class="grid grid-3">
          <div class="form-group"><label>Órgão Realizador</label><input class="input" name="orgao" value="${esc(campeonato.orgao)}"></div>
          <div class="form-group"><label>Secretário(a) de Esportes</label><input class="input" name="secretario_nome" value="${esc(campeonato.secretario_nome)}"></div>
          <div class="form-group"><label>Estádio Padrão</label><input class="input" name="estadio_padrao" value="${esc(campeonato.estadio_padrao)}"></div>
        </div>
        <div class="grid grid-4">
          <div class="form-group"><label>Minutos por Tempo</label><input class="input" type="number" name="tempo_periodo_min" value="${campeonato.tempo_periodo_min}"></div>
          <div class="form-group"><label>Limite Atletas de Fora</label><input class="input" type="number" name="vagas_fora_limite" value="${campeonato.vagas_fora_limite}"></div>
          <div class="form-group"><label>Amarelos p/ Suspensão</label><input class="input" type="number" name="amarelos_suspensao" value="${campeonato.amarelos_suspensao}"></div>
          <div class="form-group"><label>Bloqueio Horas Antes</label><input class="input" type="number" name="bloqueio_horas_antes" value="${campeonato.bloqueio_horas_antes}"></div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>Critério de Classificação para as Quartas de Final</label>
            <select class="select" name="modo_quartas">
              <option value="geral_top8" ${campeonato.modo_quartas === 'geral_top8' ? 'selected' : ''}>8 Melhores na Classificação Geral (1º×8º, 2º×7º, 3º×6º, 4º×5º)</option>
              <option value="2_por_chave" ${campeonato.modo_quartas === '2_por_chave' ? 'selected' : ''}>2 Melhores de Cada Chave ranqueados de 1º a 8º Geral</option>
            </select>
          </div>
          <div class="form-group">
            <label>Link de Transmissão ao Vivo no YouTube (opcional)</label>
            <input class="input" name="youtube_url" value="${esc(campeonato.youtube_url || '')}" placeholder="https://www.youtube.com/@...">
          </div>
        </div>
      </section>

      <section class="card">
        <h3 class="card-title">🏆 Premiação Oficial no Portal Público</h3>
        <label class="small mb-2" style="display:flex;gap:8px;align-items:center">
          <input type="checkbox" name="exibir_premiacao" value="1" ${campeonato.exibir_premiacao ? 'checked' : ''}>
          Exibir vitrine de premiação na página inicial do portal
        </label>
        <div class="grid grid-4">
          <div class="form-group"><label>Campeão (1º Lugar R$)</label><input class="input" type="number" step="0.01" name="premiacao_1" value="${campeonato.premiacao_1}"></div>
          <div class="form-group"><label>Vice-Campeão (2º R$)</label><input class="input" type="number" step="0.01" name="premiacao_2" value="${campeonato.premiacao_2}"></div>
          <div class="form-group"><label>3º Colocado (R$)</label><input class="input" type="number" step="0.01" name="premiacao_3" value="${campeonato.premiacao_3}"></div>
          <div class="form-group"><label>4º / Incentivo Equipe (R$)</label><input class="input" type="number" step="0.01" name="premiacao_4" value="${campeonato.premiacao_4}"></div>
        </div>
        <div class="grid grid-2">
          <div class="form-group"><label>Incentivo por Equipe Participante (R$)</label><input class="input" type="number" step="0.01" name="incentivo_por_equipe" value="${campeonato.incentivo_por_equipe}"></div>
          <div class="form-group" style="display:flex;align-items:flex-end">
            <label class="small" style="display:flex;gap:8px;align-items:center;padding-bottom:10px">
              <input type="checkbox" name="modo_homologacao" value="1" ${campeonato.modo_homologacao ? 'checked' : ''}>
              Exibir faixa amarela de "Modo de Homologação / Testes" no topo do portal
            </label>
          </div>
        </div>
      </section>

      <section class="card">
        <h3 class="card-title">📜 Texto do Regulamento Oficial</h3>
        <textarea class="textarea" name="regulamento_texto" style="min-height:260px">${esc(campeonato.regulamento_texto || '')}</textarea>
      </section>

      <div>
        <button type="submit" class="btn btn-primary">💾 Salvar Todas as Configurações</button>
      </div>
    </form>

    <section class="card mt-3">
      <h3 class="card-title">🔐 Alterar Minha Senha de Administrador</h3>
      <form method="post" action="/admin/configuracoes/senha" class="grid grid-3" style="align-items:flex-end">
        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
        <div class="form-group"><label>Senha Atual *</label><input class="input" type="password" name="senha_atual" required></div>
        <div class="form-group"><label>Nova Senha (mín. 6 dígitos) *</label><input class="input" type="password" name="nova_senha" minlength="6" required></div>
        <div><button type="submit" class="btn btn-outline btn-block">Atualizar Senha Admin</button></div>
      </form>
    </section>
  `;

  return layoutAdmin({
    titulo: 'Configurações Gerais e Regulamento',
    subtitulo: 'Personalize parâmetros oficiais, premiação, YouTube e critérios de classificação',
    secao: 'configuracoes',
    campeonato,
    todosCampeonatos,
    admin,
    flash,
    conteudo
  });
}

module.exports = {
  paginaLoginAdmin,
  paginaDashboardAdmin,
  paginaPartidasAdmin,
  paginaOperarPartidaAdmin,
  paginaEquipesAdmin,
  paginaAtletasAdmin,
  paginaGaleriaAdmin,
  paginaAdiamentosAdmin,
  paginaDocumentosAdmin,
  paginaAvaliacoesAdmin,
  paginaFinanceiroAdmin,
  paginaRelatoriosAdmin,
  paginaConfiguracoesAdmin
};
