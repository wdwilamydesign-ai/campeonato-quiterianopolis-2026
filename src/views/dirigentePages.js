'use strict';

const {
  esc,
  renderBadgeEscudo,
  renderCardJogo,
  renderFlash,
  renderModalInstalacaoMobile
} = require('./helpers');
const { formatarCpf } = require('../db');

function layoutDirigente({ titulo, campeonato, equipe = null, flash = null, aba = 'visao', docsPendentes = 0, conteudo }) {
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
  <meta name="apple-mobile-web-app-title" content="Equipe 2026">
  <title>${esc(titulo)} • Área da Equipe • ${esc(campeonato.nome_curto)}</title>
  <script src="/assets/js/device.js?v=3.0.0"></script>
  <link rel="stylesheet" href="/assets/css/app.css?v=3.0.0">
  <link rel="manifest" href="/dirigente-manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/icons/apple-touch-icon.png">
</head>
<body>
  <header class="public-top">
    <div class="container public-nav">
      <a class="brand" href="${equipe ? '/dirigente' : '/'}">
        <img class="brand-championship-shield" src="/assets/branding/escudo-campeonato-2026.png" alt="Logo ${esc(campeonato.nome)}">
        <span class="brand-stack">
          <small>Portal do Representante • Quiterianópolis</small>
          <strong>${esc(equipe ? `${equipe.nome} (Chave ${equipe.chave})` : campeonato.nome_curto)}</strong>
        </span>
      </a>
      <div class="nav-right-tools">
        <a class="mobile-preview-btn no-sim" href="/celular?rota=/dirigente">📱 <span class="mobile-preview-text">Prévia Mobile</span></a>
        <button type="button" class="btn btn-gold btn-sm" data-install-app>📲 <span class="mobile-preview-text">Instalar App</span></button>
        <a class="btn btn-light btn-sm" href="/">🌐 <span class="mobile-preview-text">Portal Público</span></a>
        ${equipe ? `<a class="btn btn-danger btn-sm" href="/dirigente/sair">Sair</a>` : ''}
      </div>
    </div>
    ${equipe ? `
      <div class="seq-menu-strip">
        <nav class="container public-links" aria-label="Menu da equipe em sequência">
          <a class="${aba === 'visao' ? 'active' : ''}" href="/dirigente?aba=visao">🏠 Visão Geral</a>
          <a class="${aba === 'atletas' ? 'active' : ''}" href="/dirigente?aba=atletas">👟 Elenco / Atletas</a>
          <a class="${aba === 'comissao' ? 'active' : ''}" href="/dirigente?aba=comissao">📋 Comissão Técnica</a>
          <a class="${aba === 'uniforme' ? 'active' : ''}" href="/dirigente?aba=uniforme">👕 Uniforme</a>
          <a class="${aba === 'adiamentos' ? 'active' : ''}" href="/dirigente?aba=adiamentos">📅 Adiamentos</a>
          <a class="${aba === 'documentos' ? 'active' : ''}" href="/dirigente?aba=documentos">
            ✍️ Documentos ${docsPendentes > 0 ? `<span class="pill warn" style="padding:1px 6px;margin-left:4px">${docsPendentes}</span>` : ''}
          </a>
        </nav>
      </div>
    ` : ''}
  </header>

  <main class="public-main">
    <div class="container mt-3">
      ${renderFlash(flash)}
      ${conteudo}
    </div>
  </main>

  ${equipe ? `
    <nav class="mobile-bottom">
      <a class="${aba === 'visao' ? 'active' : ''}" href="/dirigente?aba=visao"><span>🏠</span>Painel</a>
      <a class="${aba === 'atletas' ? 'active' : ''}" href="/dirigente?aba=atletas"><span>👟</span>Elenco</a>
      <a class="${aba === 'comissao' ? 'active' : ''}" href="/dirigente?aba=comissao"><span>📋</span>Comissão</a>
      <a class="${aba === 'uniforme' ? 'active' : ''}" href="/dirigente?aba=uniforme"><span>👕</span>Uniforme</a>
      <a class="${aba === 'adiamentos' ? 'active' : ''}" href="/dirigente?aba=adiamentos"><span>📅</span>Adiar</a>
      <a class="${aba === 'documentos' ? 'active' : ''}" href="/dirigente?aba=documentos"><span>✍️</span>Docs</a>
    </nav>
  ` : ''}

  ${renderModalInstalacaoMobile('Equipe Quiterianópolis 2026')}

  <script src="/assets/js/cronometro.js?v=2.1.0" defer></script>
  <script src="/assets/js/card-social.js?v=2.1.0" defer></script>
  <script src="/assets/js/app.js?v=2.1.0" defer></script>
</body>
</html>`;
}

function paginaLoginDirigente({ campeonato, csrfToken, flash, equipes = [], modoInicial = 'login' }) {
  const isCadastro = modoInicial === 'cadastro';
  const conteudo = `
    <div style="max-width:600px;margin:20px auto 40px">
      <div class="card" style="padding:28px">
        <div class="text-center mb-3">
          <img src="/assets/branding/escudo-campeonato-2026.png" alt="Logo" style="width:88px;height:88px;object-fit:contain;margin:0 auto 10px">
          <span class="pill gold">ÁREA OFICIAL DAS EQUIPES</span>
          <h1 style="margin:10px 0 6px;font-size:1.55rem;color:var(--blue-deep)">Portal das Equipes e Dirigentes</h1>
          <p class="muted small mb-0">Entre com suas credenciais ou cadastre sua equipe para gerenciar atletas, comissão técnica, uniforme e documentos.</p>
        </div>

        <!-- Seletor Entrar vs Cadastrar Equipe -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f1f5f9;padding:6px;border-radius:14px;margin-bottom:22px">
          <button type="button" id="tab-btn-login" onclick="alternarAbaDirigente('login')"
            style="border:0;padding:11px 14px;border-radius:10px;font-weight:800;font-size:.9rem;cursor:pointer;transition:all .2s;${!isCadastro ? 'background:var(--blue-deep);color:#fff;box-shadow:0 4px 12px rgba(6,40,110,.22)' : 'background:transparent;color:#475569'}">
            🔑 Já tenho acesso (Entrar)
          </button>
          <button type="button" id="tab-btn-cadastro" onclick="alternarAbaDirigente('cadastro')"
            style="border:0;padding:11px 14px;border-radius:10px;font-weight:800;font-size:.9rem;cursor:pointer;transition:all .2s;${isCadastro ? 'background:var(--green-dark,#008748);color:#fff;box-shadow:0 4px 12px rgba(0,135,72,.25)' : 'background:transparent;color:#475569'}">
            ➕ Cadastrar Equipe
          </button>
        </div>

        <!-- ABA 1: LOGIN -->
        <div id="painel-dirigente-login" style="display:${!isCadastro ? 'block' : 'none'}">
          <form method="post" action="/dirigente/login" class="grid">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <div class="form-group">
              <label for="cpf-dirigente">CPF do Representante Credenciado</label>
              <input id="cpf-dirigente" class="input" type="text" name="cpf" data-mask="cpf" placeholder="000.000.000-00" required autocomplete="username">
            </div>
            <div class="form-group">
              <label for="senha-dirigente">Senha de Acesso</label>
              <input id="senha-dirigente" class="input" type="password" name="senha" placeholder="Digite sua senha" required autocomplete="current-password">
            </div>
            <button type="submit" class="btn btn-primary btn-block">🛡️ Entrar no Painel da Equipe</button>
          </form>

          <div style="margin-top:16px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <span class="small" style="color:#14532d;font-weight:700">Sua equipe ainda não está cadastrada?</span>
            <button type="button" onclick="alternarAbaDirigente('cadastro')" class="btn btn-success btn-sm" style="border:0;cursor:pointer">➕ Fazer Cadastro da Equipe</button>
          </div>
        </div>

        <!-- ABA 2: CADASTRO DE NOVA EQUIPE -->
        <div id="painel-dirigente-cadastro" style="display:${isCadastro ? 'block' : 'none'}">
          <div style="padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;margin-bottom:16px" class="small">
            <strong style="color:var(--blue-deep)">📋 Inscrição Oficial de Equipe e Representante:</strong>
            <div class="tiny muted mt-1">Preencha os dados abaixo para cadastrar sua equipe no campeonato. Após salvar, você já entra direto no painel para inscrever seus atletas e comissão técnica.</div>
          </div>

          <form method="post" action="/dirigente/cadastro" enctype="multipart/form-data" class="grid">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">

            <div class="grid grid-2">
              <div class="form-group">
                <label>Nome Oficial da Equipe *</label>
                <input class="input" type="text" name="nome" placeholder="Ex: Real Quiterianópolis FC" required>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label>Sigla (3 letras) *</label>
                  <input class="input" type="text" name="sigla" maxlength="5" placeholder="Ex: RQT" style="text-transform:uppercase" required>
                </div>
                <div class="form-group">
                  <label>Chave / Grupo *</label>
                  <select class="select" name="chave" required>
                    <option value="A">Chave A</option>
                    <option value="B">Chave B</option>
                    <option value="C">Chave C</option>
                    <option value="D">Chave D</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="grid grid-2">
              <div class="form-group">
                <label>Localidade / Bairro / Sede *</label>
                <input class="input" type="text" name="localidade" value="Quiterianópolis - CE" placeholder="Ex: Centro - Quiterianópolis" required>
              </div>
              <div class="form-group">
                <label>Escudo da Equipe (PNG/JPG - opcional)</label>
                <input class="input" type="file" name="escudo" accept=".png,.jpg,.jpeg,.webp,.svg">
              </div>
            </div>

            <hr style="border:0;border-top:1px dashed var(--line);margin:6px 0">

            <div class="grid grid-2">
              <div class="form-group">
                <label>Nome Completo do Representante *</label>
                <input class="input" type="text" name="dirigente_nome" placeholder="Nome do dirigente responsável" required>
              </div>
              <div class="form-group">
                <label>WhatsApp / Telefone *</label>
                <input class="input" type="text" name="dirigente_telefone" data-mask="phone" placeholder="(88) 99999-0000" required>
              </div>
            </div>

            <div class="grid grid-2">
              <div class="form-group">
                <label>CPF do Representante (Será seu Login) *</label>
                <input class="input" type="text" name="dirigente_cpf" data-mask="cpf" placeholder="000.000.000-00" required autocomplete="username">
              </div>
              <div class="form-group">
                <label>Criar Senha de Acesso *</label>
                <input class="input" type="password" name="senha" minlength="4" placeholder="Crie uma senha (mín. 4 dígitos)" required autocomplete="new-password">
              </div>
            </div>

            <button type="submit" class="btn btn-success btn-block" style="padding:13px 18px;font-size:.98rem">
              ✅ Concluir Cadastro e Acessar Painel da Equipe
            </button>
          </form>
        </div>

        <script>
          function alternarAbaDirigente(modo) {
            var pLogin = document.getElementById('painel-dirigente-login');
            var pCad = document.getElementById('painel-dirigente-cadastro');
            var bLogin = document.getElementById('tab-btn-login');
            var bCad = document.getElementById('tab-btn-cadastro');
            if (modo === 'cadastro') {
              pLogin.style.display = 'none';
              pCad.style.display = 'block';
              bCad.style.background = 'var(--green-dark, #008748)';
              bCad.style.color = '#fff';
              bCad.style.boxShadow = '0 4px 12px rgba(0,135,72,.25)';
              bLogin.style.background = 'transparent';
              bLogin.style.color = '#475569';
              bLogin.style.boxShadow = 'none';
            } else {
              pLogin.style.display = 'block';
              pCad.style.display = 'none';
              bLogin.style.background = 'var(--blue-deep)';
              bLogin.style.color = '#fff';
              bLogin.style.boxShadow = '0 4px 12px rgba(6,40,110,.22)';
              bCad.style.background = 'transparent';
              bCad.style.color = '#475569';
              bCad.style.boxShadow = 'none';
            }
          }
        </script>

        <hr style="border:0;border-top:1px solid var(--line);margin:20px 0">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px" class="small">
          <a href="/" style="color:var(--blue);font-weight:800">← Voltar ao Portal Público</a>
          <a href="/admin/equipes" class="muted">Gerenciar Equipes na Comissão Organizadora →</a>
        </div>

        ${equipes.length ? `
          <details class="mt-3" style="background:#f8fbff;border:1px dashed #cbd5e1;border-radius:12px;padding:10px 14px">
            <summary class="small" style="cursor:pointer;font-weight:800;color:var(--blue-deep)">🔑 Equipes já cadastradas e credenciais iniciais (${equipes.length})</summary>
            <div class="tiny muted mt-1">Senha inicial padrão das equipes pré-cadastradas: <code>equipe2026</code> (ou a senha criada no momento do cadastro).</div>
            <div class="table-wrap mt-1">
              <table class="table" style="font-size:.78rem">
                <thead><tr><th>Equipe</th><th>Chave</th><th>CPF Login</th></tr></thead>
                <tbody>
                  ${equipes.map(eq => `
                    <tr>
                      <td><strong>${esc(eq.nome)}</strong></td>
                      <td>Chave ${esc(eq.chave)}</td>
                      <td><code>${esc(formatarCpf(eq.dirigente_cpf))}</code></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </details>
        ` : ''}
      </div>
    </div>
  `;

  return layoutDirigente({
    titulo: isCadastro ? 'Cadastrar Equipe' : 'Login da Equipe',
    campeonato,
    flash,
    conteudo
  });
}

function paginaPainelDirigente(ctx) {
  const {
    campeonato,
    equipe,
    equipesMap,
    janela,
    proxPartida,
    partidasEquipe,
    atletas,
    comissao,
    adiamentos,
    documentos,
    assinaturasMap,
    disciplinaEquipe,
    csrfToken,
    flash,
    aba = 'visao'
  } = ctx;

  const ativos = atletas.filter(a => a.status !== 'inativo');
  const foraAtivos = ativos.filter(a => a.origem === 'fora');
  const limiteElenco = Number(campeonato.elenco_max || 25);
  const limiteFora = Number(campeonato.vagas_fora_limite || 5);
  const limiteComissao = Number(campeonato.comissao_max || 3);

  const docsPendentes = documentos.filter(d => d.exige_assinatura && !assinaturasMap[d.id]).length;

  const cabecalhoEquipe = `
    <div class="card mb-3" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;background:linear-gradient(135deg,#fff,#f2f7ff)">
      <div style="display:flex;gap:14px;align-items:center">
        ${renderBadgeEscudo(equipe, 'team-badge-lg')}
        <div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="pill chave-tag">Chave ${esc(equipe.chave)}</span>
            <span class="pill ${janela.aberta ? 'ok' : 'danger'}">${janela.aberta ? '🔓 Janela Aberta' : '🔒 Janela Bloqueada'}</span>
          </div>
          <h1 style="margin:6px 0 2px;font-size:1.45rem;color:var(--blue-deep)">${esc(equipe.nome)}</h1>
          <div class="small muted">Representante: <strong>${esc(equipe.dirigente_nome || 'Dirigente')}</strong> • ${esc(janela.motivo)}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <div class="pill">👟 Elenco: <strong>${ativos.length}/${limiteElenco}</strong></div>
        <div class="pill ${foraAtivos.length >= limiteFora ? 'warn' : 'ok'}">🌍 De Fora: <strong>${foraAtivos.length}/${limiteFora}</strong></div>
        <div class="pill">📋 Comissão: <strong>${comissao.length}/${limiteComissao}</strong></div>
      </div>
    </div>
  `;

  let corpoAba = '';

  if (aba === 'visao') {
    const suspensos = disciplinaEquipe.filter(d => d.suspenso);
    const pendurados = disciplinaEquipe.filter(d => d.pendurado);

    corpoAba = `
      ${docsPendentes > 0 ? `
        <div class="flash flash-warning">
          ✍️ Sua equipe possui <strong>${docsPendentes} documento(s) oficial(is)</strong> aguardando assinatura eletrônica.
          <a href="/dirigente?aba=documentos" style="font-weight:900;text-decoration:underline;margin-left:6px">Assinar agora →</a>
        </div>
      ` : ''}

      <div class="grid grid-2">
        <div>
          <div class="section-head" style="margin-top:0"><div><h2>Próximo Compromisso</h2><p>Agenda oficial no ${esc(campeonato.estadio_padrao)}</p></div></div>
          ${proxPartida
            ? renderCardJogo(proxPartida, { equipesMap, tempoPeriodoMin: campeonato.tempo_periodo_min })
            : `<div class="card empty">Nenhuma partida agendada diretamente no momento (aguardando definição de fase ou encerramento).</div>`}

          <div class="section-head"><div><h2>Situação Disciplinar do Elenco</h2><p>Controle automático de cartões e suspensões</p></div></div>
          <div class="card">
            ${suspensos.length || pendurados.length ? `
              <div class="grid">
                ${suspensos.map(s => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:12px">
                    <div>
                      <strong>${esc(s.apelido || s.nome)}</strong>
                      <div class="tiny muted">${esc(s.motivoSuspensao)}</div>
                    </div>
                    <span class="pill danger">SUSPENSO</span>
                  </div>
                `).join('')}
                ${pendurados.map(p => `
                  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px">
                    <div>
                      <strong>${esc(p.apelido || p.nome)}</strong>
                      <div class="tiny muted">${p.amarelos} cartão(ões) amarelo(s) acumulado(s)</div>
                    </div>
                    <span class="pill warn">⚠️ Pendurado</span>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="empty small">✅ Nenhum atleta suspenso ou pendurado para a próxima partida!</div>`}
          </div>
        </div>

        <div>
          <div class="section-head" style="margin-top:0"><div><h2>Acesso Rápido da Equipe</h2><p>Atalhos de gestão do clube</p></div></div>
          <div class="grid grid-2">
            <a class="card" href="/dirigente?aba=atletas">
              <div style="font-size:1.6rem">👟</div>
              <strong style="color:var(--blue-deep);display:block;margin-top:6px">Gerenciar Elenco</strong>
              <span class="tiny muted">Cadastrar atletas locais e de fora</span>
            </a>
            <a class="card" href="/dirigente?aba=comissao">
              <div style="font-size:1.6rem">📋</div>
              <strong style="color:var(--blue-deep);display:block;margin-top:6px">Comissão Técnica</strong>
              <span class="tiny muted">Credenciar até ${limiteComissao} membros</span>
            </a>
            <a class="card" href="/dirigente?aba=uniforme">
              <div style="font-size:1.6rem">👕</div>
              <strong style="color:var(--blue-deep);display:block;margin-top:6px">Uniforme Oficial</strong>
              <span class="tiny muted">Informar cores e foto do fardamento</span>
            </a>
            <a class="card" href="/dirigente?aba=documentos">
              <div style="font-size:1.6rem">✍️</div>
              <strong style="color:var(--blue-deep);display:block;margin-top:6px">Documentos (${documentos.length})</strong>
              <span class="tiny muted">Termos e comunicados oficiais</span>
            </a>
          </div>

          <div class="card mt-3">
            <h3 class="card-title">🛡️ Dados da Equipe, Escudo e Credenciais do Dirigente</h3>
            <form method="post" action="/dirigente/perfil" enctype="multipart/form-data" class="grid">
              <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
              <div class="grid grid-3">
                <div class="form-group">
                  <label>Nome da Equipe *</label>
                  <input class="input" name="equipe_nome" value="${esc(equipe.nome || '')}" required>
                </div>
                <div class="form-group">
                  <label>Sigla (3 letras) *</label>
                  <input class="input" name="equipe_sigla" maxlength="5" value="${esc(equipe.sigla || '')}" style="text-transform:uppercase" required>
                </div>
                <div class="form-group">
                  <label>Localidade / Bairro</label>
                  <input class="input" name="equipe_localidade" value="${esc(equipe.localidade || '')}">
                </div>
              </div>
              <div class="grid grid-3">
                <div class="form-group">
                  <label>Nome do Representante *</label>
                  <input class="input" name="dirigente_nome" value="${esc(equipe.dirigente_nome || '')}" required>
                </div>
                <div class="form-group">
                  <label>WhatsApp / Telefone</label>
                  <input class="input" name="dirigente_telefone" data-mask="phone" value="${esc(equipe.dirigente_telefone || '')}" placeholder="(88) 99999-0000">
                </div>
                <div class="form-group">
                  <label>Trocar Escudo (PNG/JPG)</label>
                  <input class="input" type="file" name="escudo" accept=".png,.jpg,.jpeg,.webp,.svg">
                </div>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label>Nova Senha (deixe em branco para manter)</label>
                  <input class="input" type="password" name="nova_senha" minlength="4" placeholder="Mínimo 4 caracteres">
                </div>
                <div class="form-group" style="display:flex;align-items:flex-end">
                  <button type="submit" class="btn btn-primary btn-block">💾 Salvar Dados da Equipe e Dirigente</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  } else if (aba === 'atletas') {
    const vagasOcupadasSet = new Set(foraAtivos.map(a => Number(a.vaga_fora_num)).filter(Boolean));

    corpoAba = `
      <div class="grid grid-2">
        <section class="card">
          <h3 class="card-title">➕ Inscrever Novo Atleta</h3>
          ${!janela.aberta ? `
            <div class="flash flash-error mb-0">🔒 Janela fechada para alterações neste momento (${esc(janela.motivo)}).</div>
          ` : (ativos.length >= limiteElenco ? `
            <div class="flash flash-warning mb-0">Limite máximo de ${limiteElenco} atletas ativos atingido. Inative um atleta caso precise substituir dentro do prazo regulamentar.</div>
          ` : `
            <form method="post" action="/dirigente/atletas/adicionar" enctype="multipart/form-data" class="grid">
              <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
              <div class="grid grid-2">
                <div class="form-group">
                  <label>Nome Completo *</label>
                  <input class="input" name="nome" required maxlength="90" placeholder="Nome completo conforme RG/CPF">
                </div>
                <div class="form-group">
                  <label>Apelido Esportivo</label>
                  <input class="input" name="apelido" maxlength="40" placeholder="Ex.: Carlinhos">
                </div>
              </div>
              <div class="grid grid-3">
                <div class="form-group">
                  <label>CPF *</label>
                  <input class="input" name="cpf" data-mask="cpf" required placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                  <label>Data de Nasc.</label>
                  <input class="input" type="date" name="data_nascimento">
                </div>
                <div class="form-group">
                  <label>Nº Camisa</label>
                  <input class="input" type="number" name="numero" min="1" max="99" placeholder="10">
                </div>
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label>Posição *</label>
                  <select class="select" name="posicao">
                    <option value="Goleiro">Goleiro</option>
                    <option value="Zagueiro">Zagueiro</option>
                    <option value="Lateral">Lateral</option>
                    <option value="Volante">Volante</option>
                    <option value="Meia" selected>Meia</option>
                    <option value="Atacante">Atacante</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Enquadramento / Origem *</label>
                  <select id="origem-atleta" class="select" name="origem">
                    <option value="local">Atleta de Quiterianópolis (Local)</option>
                    <option value="fora" ${foraAtivos.length >= limiteFora ? 'disabled' : ''}>Atleta de Fora (${foraAtivos.length}/${limiteFora} usadas)</option>
                  </select>
                </div>
              </div>

              <div id="criterio-local-wrap" class="grid grid-2">
                <div class="form-group">
                  <label>Critério de Vínculo com Quiterianópolis</label>
                  <select class="select" name="criterio_local">
                    <option value="natural">Natural de Quiterianópolis</option>
                    <option value="eleitor">Título Eleitoral em Quiterianópolis</option>
                    <option value="residente">Residência Fixa Comprovada</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nº Título Eleitoral / Obs. Vínculo</label>
                  <input class="input" name="titulo_eleitor" maxlength="50" placeholder="Opcional">
                </div>
              </div>

              <div id="vaga-fora-wrap" hidden>
                <div class="form-group">
                  <label>Slot de Vaga de Fora (Máx. ${limiteFora})</label>
                  <select class="select" name="vaga_fora_num">
                    ${Array.from({ length: limiteFora }, (_, i) => i + 1).map(n => `
                      <option value="${n}" ${vagasOcupadasSet.has(n) ? 'disabled' : ''}>Vaga de Fora #${n} ${vagasOcupadasSet.has(n) ? '(Ocupada)' : '(Disponível)'}</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="grid grid-2">
                <div class="form-group">
                  <label>Cidade Natal</label>
                  <input class="input" name="naturalidade" value="Quiterianópolis - CE" maxlength="60">
                </div>
                <div class="form-group">
                  <label>Foto 3x4 / Perfil (opcional)</label>
                  <input class="input" type="file" name="foto" accept=".png,.jpg,.jpeg,.webp">
                </div>
              </div>

              <label class="small" style="display:flex;gap:8px;align-items:center">
                <input type="checkbox" name="menor_idade" value="1">
                Atleta menor de 18 anos (exige termo de autorização assinado pelos responsáveis)
              </label>

              <button type="submit" class="btn btn-primary btn-block">Salvar Inscrição de Atleta</button>
            </form>
          `)}
        </section>

        <section class="card">
          <h3 class="card-title">📋 Elenco Inscrito (${ativos.length} ativos)</h3>
          ${atletas.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Nº</th><th>Atleta</th><th>Origem</th><th>Status</th><th>Ação</th></tr></thead>
                <tbody>
                  ${atletas.map(a => `
                    <tr style="${a.status === 'inativo' ? 'opacity:.55' : ''}">
                      <td><strong>${a.numero ?? '—'}</strong></td>
                      <td>
                        <strong>${esc(a.apelido || a.nome)}</strong>
                        <div class="tiny muted">${esc(a.posicao)} • CPF ${esc(formatarCpf(a.cpf))}</div>
                      </td>
                      <td>
                        ${a.origem === 'fora'
                          ? `<span class="pill warn">Fora #${a.vaga_fora_num || ''}</span>`
                          : `<span class="pill ok">Local</span>`}
                      </td>
                      <td>
                        ${a.status === 'confirmado'
                          ? `<span class="pill ok">Confirmado</span>`
                          : (a.status === 'pendente' ? `<span class="pill warn">Em análise</span>` : `<span class="pill">Inativo</span>`)}
                      </td>
                      <td>
                        ${janela.aberta && a.status !== 'inativo' ? `
                          <form method="post" action="/dirigente/atletas/remover" style="margin:0">
                            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                            <input type="hidden" name="atleta_id" value="${a.id}">
                            <button type="submit" class="btn btn-danger btn-xs" data-confirm="Deseja retirar/inativar este atleta do elenco ativo?">
                              ${a.ja_atuou ? 'Inativar' : 'Excluir'}
                            </button>
                          </form>
                        ` : '<span class="tiny muted">—</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty">Nenhum atleta cadastrado ainda nesta equipe.</div>`}
        </section>
      </div>
    `;
  } else if (aba === 'comissao') {
    corpoAba = `
      <div class="grid grid-2">
        <section class="card">
          <h3 class="card-title">➕ Credenciar Comissão Técnica (Máx. ${limiteComissao})</h3>
          ${!janela.aberta ? `
            <div class="flash flash-error mb-0">🔒 Janela bloqueada (${esc(janela.motivo)}).</div>
          ` : (comissao.length >= limiteComissao ? `
            <div class="flash flash-warning mb-0">Sua equipe já atingiu o limite de ${limiteComissao} integrantes na comissão técnica.</div>
          ` : `
            <form method="post" action="/dirigente/comissao/adicionar" class="grid">
              <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
              <div class="form-group">
                <label>Nome Completo *</label>
                <input class="input" name="nome" required maxlength="80" placeholder="Nome do integrante">
              </div>
              <div class="grid grid-2">
                <div class="form-group">
                  <label>CPF</label>
                  <input class="input" name="cpf" data-mask="cpf" placeholder="000.000.000-00">
                </div>
                <div class="form-group">
                  <label>Função na Área Técnica *</label>
                  <select class="select" name="funcao">
                    <option value="Técnico">Técnico</option>
                    <option value="Auxiliar Técnico">Auxiliar Técnico</option>
                    <option value="Massagista / Preparador">Massagista / Preparador</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Adicionar à Comissão Técnica</button>
            </form>
          `)}
        </section>

        <section class="card">
          <h3 class="card-title">Integrantes Ativos (${comissao.length}/${limiteComissao})</h3>
          ${comissao.length ? `
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>Nome</th><th>Função</th><th>CPF</th><th>Ação</th></tr></thead>
                <tbody>
                  ${comissao.map(c => `
                    <tr>
                      <td><strong>${esc(c.nome)}</strong></td>
                      <td><span class="pill ok">${esc(c.funcao)}</span></td>
                      <td>${esc(formatarCpf(c.cpf))}</td>
                      <td>
                        ${janela.aberta ? `
                          <form method="post" action="/dirigente/comissao/remover" style="margin:0">
                            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                            <input type="hidden" name="comissao_id" value="${c.id}">
                            <button type="submit" class="btn btn-danger btn-xs" data-confirm="Remover integrante da comissão técnica?">Remover</button>
                          </form>
                        ` : '—'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `<div class="empty">Nenhum integrante cadastrado na comissão técnica.</div>`}
        </section>
      </div>
    `;
  } else if (aba === 'uniforme') {
    corpoAba = `
      <div class="grid grid-2">
        <section class="card">
          <h3 class="card-title">👕 Cadastrar / Atualizar Uniforme Oficial</h3>
          <p class="small muted">Informe as cores predominantes de camisa, calção e meiões para evitar conflito visual de arbitragem no Estádio Tualdão.</p>
          <form method="post" action="/dirigente/uniforme" enctype="multipart/form-data" class="grid">
            <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
            <div class="form-group">
              <label>Descrição do Uniforme Principal e Reserva *</label>
              <textarea class="textarea" name="uniforme_descricao" required placeholder="Ex.: Camisa azul royal com detalhes amarelos, calção azul marinho e meiões brancos.">${esc(equipe.uniforme_descricao || '')}</textarea>
            </div>
            <div class="form-group">
              <label>Foto do Uniforme (PNG/JPG opcional)</label>
              <input class="input" type="file" name="uniforme_foto" accept=".png,.jpg,.jpeg,.webp">
            </div>
            <button type="submit" class="btn btn-primary btn-block">Salvar Uniforme</button>
          </form>
        </section>

        <section class="card text-center">
          <h3 class="card-title">Prévia Registrada</h3>
          ${equipe.uniforme_foto_url ? `
            <img src="${esc(equipe.uniforme_foto_url)}" alt="Uniforme de ${esc(equipe.nome)}" style="max-height:260px;margin:0 auto 12px;border-radius:14px;border:1px solid var(--line)">
          ` : `<div class="empty mb-2">Nenhuma foto de uniforme enviada ainda.</div>`}
          <p class="small mb-0"><strong>Descrição atual:</strong> ${esc(equipe.uniforme_descricao || 'Não informada.')}</p>
        </section>
      </div>
    `;
  } else if (aba === 'adiamentos') {
    const jogosAgendados = partidasEquipe.filter(p => p.status === 'agendada');

    corpoAba = `
      <div class="grid grid-2">
        <section class="card">
          <h3 class="card-title">📅 Protocolar Pedido de Adiamento</h3>
          <p class="small muted">O pedido será notificado à equipe adversária para manifestação e analisado pela Comissão Organizadora.</p>
          ${jogosAgendados.length ? `
            <form method="post" action="/dirigente/adiamentos/solicitar" class="grid">
              <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
              <div class="form-group">
                <label>Selecione a Partida *</label>
                <select class="select" name="partida_id" required>
                  ${jogosAgendados.map(p => {
                    const m = p.mandante_id ? equipesMap[p.mandante_id]?.nome : p.mandante_placeholder;
                    const v = p.visitante_id ? equipesMap[p.visitante_id]?.nome : p.visitante_placeholder;
                    return `<option value="${p.id}">Jogo ${String(p.numero_jogo).padStart(2, '0')} — ${esc(m)} × ${esc(v)} (${esc(p.data_jogo)} ${esc(p.hora_jogo)})</option>`;
                  }).join('')}
                </select>
              </div>
              <div class="form-group">
                <label>Nova Data/Horário Sugerido (opcional)</label>
                <input class="input" name="nova_data_sugerida" placeholder="Ex.: Domingo seguinte às 17:00">
              </div>
              <div class="form-group">
                <label>Justificativa Fundamentada *</label>
                <textarea class="textarea" name="motivo" required placeholder="Descreva o motivo oficial para análise da Secretaria de Esportes..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-block">Protocolar Solicitação</button>
            </form>
          ` : `<div class="empty">Não há jogos agendados disponíveis para solicitação de adiamento.</div>`}
        </section>

        <section class="card">
          <h3 class="card-title">Histórico e Manifestações (${adiamentos.length})</h3>
          ${adiamentos.length ? `
            <div class="grid">
              ${adiamentos.map(ad => {
                const ehAdversario = ad.equipe_adversaria_id === equipe.id;
                return `
                  <div style="border:1px solid var(--line);border-radius:14px;padding:14px">
                    <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                      <strong>Jogo ${String(ad.numero_jogo).padStart(2, '0')} (${esc(ad.data_jogo)})</strong>
                      <span class="pill ${ad.status_comissao === 'deferido' ? 'ok' : (ad.status_comissao === 'indeferido' ? 'danger' : 'warn')}">
                        Comissão: ${esc(ad.status_comissao.toUpperCase())}
                      </span>
                    </div>
                    <div class="small mt-1">Solicitante: <strong>${esc(ad.solicitante_nome)}</strong></div>
                    <div class="small muted mt-1">"${esc(ad.motivo)}"</div>
                    ${ad.nova_data_sugerida ? `<div class="tiny mt-1">Sugestão: ${esc(ad.nova_data_sugerida)}</div>` : ''}
                    <div class="tiny mt-1">Posição do adversário: <strong>${esc(ad.status_adversario)}</strong> ${ad.manifestacao_adversario ? `— ${esc(ad.manifestacao_adversario)}` : ''}</div>
                    ${ad.parecer_comissao ? `<div class="tiny mt-1" style="color:var(--blue-deep)">Parecer da Comissão: <strong>${esc(ad.parecer_comissao)}</strong></div>` : ''}

                    ${ehAdversario && ad.status_adversario === 'aguardando' && ad.status_comissao === 'pendente' ? `
                      <form method="post" action="/dirigente/adiamentos/manifestar" class="mt-2" style="background:#f8fbff;padding:10px;border-radius:10px">
                        <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                        <input type="hidden" name="adiamento_id" value="${ad.id}">
                        <input class="input mb-1" name="manifestacao" placeholder="Observação da sua equipe (opcional)">
                        <div class="actions">
                          <button type="submit" name="decisao" value="concordou" class="btn btn-success btn-xs">✅ Concordar com adiamento</button>
                          <button type="submit" name="decisao" value="discordou" class="btn btn-danger btn-xs">❌ Discordar</button>
                        </div>
                      </form>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : `<div class="empty">Nenhuma solicitação de adiamento envolvendo sua equipe.</div>`}
        </section>
      </div>
    `;
  } else if (aba === 'documentos') {
    corpoAba = `
      <div class="section-head" style="margin-top:0">
        <div>
          <h2>✍️ Documentos e Comunicados Oficiais</h2>
          <p>Leia atentamente e registre o aceite digital autenticado pela senha da equipe</p>
        </div>
      </div>
      <div class="grid">
        ${documentos.length ? documentos.map(doc => {
          const assinatura = assinaturasMap[doc.id];
          return `
            <article class="card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
                <div>
                  <span class="pill ${assinatura ? 'ok' : (doc.exige_assinatura ? 'warn' : '')}">
                    ${assinatura ? '✅ Assinado Eletronicamente' : (doc.exige_assinatura ? '⏳ Assinatura Pendente' : 'Informativo')}
                  </span>
                  <h3 class="mt-1 mb-1" style="color:var(--blue-deep)">${esc(doc.titulo)}</h3>
                  <div class="tiny muted">Publicado em ${esc(doc.criado_em)} ${doc.chancela_secretario ? `• Chancelado por ${esc(campeonato.secretario_nome)} (Secretário de Esportes)` : ''}</div>
                </div>
                ${doc.arquivo_pdf_url ? `<a class="btn btn-light btn-sm" href="${esc(doc.arquivo_pdf_url)}" target="_blank">📄 Abrir PDF Anexo</a>` : ''}
              </div>

              ${doc.conteudo_texto ? `
                <div style="background:#f8fafc;border:1px solid var(--line);border-radius:12px;padding:16px;margin-top:12px;white-space:pre-line;line-height:1.6" class="small">${esc(doc.conteudo_texto)}</div>
              ` : ''}

              ${assinatura ? `
                <div class="mt-2 small" style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;padding:10px 14px;border-radius:10px">
                  ✔ Assinado digitalmente por <strong>${esc(assinatura.dirigente_nome)}</strong> (CPF ${esc(formatarCpf(assinatura.dirigente_cpf))}) em <strong>${esc(assinatura.assinado_em)}</strong> • IP: ${esc(assinatura.ip || 'local')}
                </div>
              ` : (doc.exige_assinatura ? `
                <form method="post" action="/dirigente/documentos/assinar" class="mt-2" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;background:#fffbeb;border:1px solid #fde68a;padding:12px;border-radius:12px">
                  <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
                  <input type="hidden" name="documento_id" value="${doc.id}">
                  <div style="flex:1;min-width:220px">
                    <label class="tiny" style="display:block;font-weight:800;margin-bottom:4px">Confirme sua senha de dirigente para assinar em nome de ${esc(equipe.nome)}:</label>
                    <input class="input" type="password" name="senha_confirmacao" required placeholder="Sua senha de acesso">
                  </div>
                  <button type="submit" class="btn btn-gold">✍️ Assinar Documento Oficial</button>
                </form>
              ` : '')}
            </article>
          `;
        }).join('') : `<div class="card empty">Nenhum documento interno publicado até o momento.</div>`}
      </div>
    `;
  }

  return layoutDirigente({
    titulo: `Painel — ${equipe.nome}`,
    campeonato,
    equipe,
    flash,
    aba,
    docsPendentes,
    conteudo: cabecalhoEquipe + corpoAba
  });
}

module.exports = {
  paginaLoginDirigente,
  paginaPainelDirigente
};
