'use strict';

const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const {
  db,
  DATA_DIR,
  hashSenha,
  verificarSenha,
  limparCpf,
  registrarAuditoria
} = require('./db');

const {
  calcularClassificacao,
  sincronizarTabelaCondicional,
  obterEstatisticasAtletas,
  obterVencedorPerdedorPartida,
  verificarJanelaEquipeAberta
} = require('./standings');

const { segundosAtuaisCronometro } = require('./views/helpers');
const publicPages = require('./views/publicPages');
const dirigentePages = require('./views/dirigentePages');
const adminPages = require('./views/adminPages');
const { paginaSimuladorMobile } = require('./views/mobilePreviewPage');
const { lerCorpoFormulario, salvarArquivoUpload } = require('./multipart');

function obterUrlRedeLocal() {
  try {
    const redes = os.networkInterfaces();
    for (const lista of Object.values(redes)) {
      for (const item of (lista || [])) {
        if (item.family === 'IPv4' && !item.internal) {
          return `http://${item.address}:${PORT}`;
        }
      }
    }
  } catch (_) {}
  return `http://localhost:${PORT}`;
}

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Sessões em memória (com limpeza periódica)
const sessoes = new Map();
const NOME_COOKIE_SESSAO = 'quiteria_sessao';

function parsearCookies(req) {
  const obj = {};
  const cab = req.headers.cookie || '';
  cab.split(';').forEach(par => {
    const idx = par.indexOf('=');
    if (idx > 0) {
      const k = par.slice(0, idx).trim();
      const v = decodeURIComponent(par.slice(idx + 1).trim());
      obj[k] = v;
    }
  });
  return obj;
}

function obterSessao(req, res) {
  const cookies = parsearCookies(req);
  let id = cookies[NOME_COOKIE_SESSAO];
  let sessao = id ? sessoes.get(id) : null;

  if (!sessao) {
    id = crypto.randomBytes(24).toString('hex');
    sessao = {
      id,
      csrfToken: crypto.randomBytes(20).toString('hex'),
      flash: null,
      adminId: null,
      adminCampeonatoId: null,
      dirigenteEquipeId: null,
      desafioSoma: null,
      atualizadoEm: Date.now()
    };
    sessoes.set(id, sessao);
    res.setHeader('Set-Cookie', `${NOME_COOKIE_SESSAO}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
  } else {
    sessao.atualizadoEm = Date.now();
  }
  return sessao;
}

setInterval(() => {
  const exp = Date.now() - 24 * 3600 * 1000;
  for (const [k, s] of sessoes.entries()) {
    if (s.atualizadoEm < exp) sessoes.delete(k);
  }
}, 30 * 60 * 1000).unref();

function definirFlash(sessao, tipo, mensagem) {
  sessao.flash = { tipo, mensagem };
}

function consumirFlash(sessao) {
  const f = sessao.flash;
  sessao.flash = null;
  return f;
}

function aplicarCabecalhosSeguranca(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; font-src 'self' data:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; media-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self';"
  );
}

function enviarHtml(res, status, html) {
  aplicarCabecalhosSeguranca(res);
  const buf = zlib.gzipSync(Buffer.from(html, 'utf8'));
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Encoding': 'gzip',
    'Content-Length': buf.length,
    'Cache-Control': 'no-cache'
  });
  res.end(buf);
}

function enviarJson(res, status, obj) {
  aplicarCabecalhosSeguranca(res);
  const buf = zlib.gzipSync(Buffer.from(JSON.stringify(obj), 'utf8'));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Encoding': 'gzip',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store'
  });
  res.end(buf);
}

function redirecionar(res, destino) {
  aplicarCabecalhosSeguranca(res);
  res.writeHead(303, { Location: destino });
  res.end();
}

function obterIpCliente(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

function converterDataParaIso(dataBr, horaBr) {
  const m = String(dataBr || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const h = String(horaBr || '17:00').trim().match(/^(\d{2}):(\d{2})/);
  const hh = h ? `${h[1]}:${h[2]}` : '17:00';
  if (m) return `${m[3]}-${m[2]}-${m[1]}T${hh}`;
  return `2026-11-07T${hh}`;
}

function obterCampeonatoPublico(urlObj) {
  const campeonatosAtivos = db.prepare('SELECT * FROM campeonatos WHERE ativo = 1 ORDER BY id ASC').all();
  const idParam = Number(urlObj.searchParams.get('divisao') || 0);
  const campeonato = campeonatosAtivos.find(c => c.id === idParam) || campeonatosAtivos[0];
  return { campeonato, campeonatosAtivos };
}

function registrarVisitaQualificada(req, campeonatoId, rota) {
  const ua = String(req.headers['user-agent'] || '');
  if (/bot|crawl|spider|slurp|curl|wget/i.test(ua)) return;
  const ip = obterIpCliente(req);
  const hash = crypto.createHash('sha256').update(`${ip}|${ua}|quiteria2026`).digest('hex').slice(0, 32);
  try {
    db.prepare(`
      INSERT OR IGNORE INTO visitas_portal (campeonato_id, visitante_hash, pagina)
      VALUES (?, ?, ?)
    `).run(campeonatoId, hash, rota);
  } catch (_) {}
}

function obterTotalVisitas(campeonatoId) {
  const r = db.prepare('SELECT COUNT(*) AS total FROM visitas_portal WHERE campeonato_id = ?').get(campeonatoId);
  return Math.max(1, Number(r?.total || 1));
}

function recalcularPlacarPorEventos(partidaId) {
  const p = db.prepare('SELECT * FROM partidas WHERE id = ?').get(partidaId);
  if (!p || !p.mandante_id || !p.visitante_id) return;

  const evs = db.prepare("SELECT * FROM eventos_partida WHERE partida_id = ? AND tipo IN ('gol', 'gol_contra')").all(partidaId);
  let gm = 0;
  let gv = 0;
  for (const ev of evs) {
    if (ev.tipo === 'gol') {
      if (ev.equipe_id === p.mandante_id) gm++;
      else if (ev.equipe_id === p.visitante_id) gv++;
    } else if (ev.tipo === 'gol_contra') {
      if (ev.equipe_id === p.mandante_id) gv++;
      else if (ev.equipe_id === p.visitante_id) gm++;
    }
  }
  db.prepare('UPDATE partidas SET gols_mandante = ?, gols_visitante = ? WHERE id = ?').run(gm, gv, partidaId);
}

const cacheEstaticos = new Map();

function tentarServirEstatico(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const limpo = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!limpo || limpo.includes('..')) return false;

  let item = cacheEstaticos.get(limpo);
  if (!item) {
    let caminho = path.join(PUBLIC_DIR, limpo);
    if (!caminho.startsWith(PUBLIC_DIR)) return false;

    if (!fs.existsSync(caminho) && limpo.startsWith('assets/uploads/')) {
      const relUpload = limpo.slice('assets/uploads/'.length);
      const raizUploads = path.join(DATA_DIR, 'uploads');
      const candidato = path.join(raizUploads, relUpload);
      if (candidato.startsWith(raizUploads) && fs.existsSync(candidato)) {
        caminho = candidato;
      } else {
        return false;
      }
    } else if (!fs.existsSync(caminho)) {
      return false;
    }
    const stat = fs.statSync(caminho);
    if (!stat.isFile()) return false;

    const ext = path.extname(caminho).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const raw = fs.readFileSync(caminho);
    const comprimivel = /\.(css|js|json|svg|webmanifest|html)$/i.test(ext);
    const body = comprimivel ? zlib.gzipSync(raw) : raw;
    const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;

    item = { mime, body, comprimivel, etag };
    if (raw.length < 4 * 1024 * 1024) {
      cacheEstaticos.set(limpo, item);
    }
  }

  aplicarCabecalhosSeguranca(res);
  if (req.headers['if-none-match'] === item.etag) {
    res.writeHead(304, { ETag: item.etag, 'Cache-Control': 'public, max-age=86400' });
    res.end();
    return true;
  }

  const headers = {
    'Content-Type': item.mime,
    'Content-Length': item.body.length,
    'ETag': item.etag,
    'Cache-Control': 'public, max-age=86400'
  };
  if (item.comprimivel) headers['Content-Encoding'] = 'gzip';

  res.writeHead(200, headers);
  if (req.method === 'HEAD') {
    res.end();
  } else {
    res.end(item.body);
  }
  return true;
}

function validarCsrf(sessao, campos) {
  return Boolean(campos && campos._csrf && campos._csrf === sessao.csrfToken);
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname.replace(/\/+$/, '') || '/';

    // 1. Arquivos estáticos (CSS, JS, escudos, ícones PWA, PDFs, manifestos)
    if (pathname !== '/' && tentarServirEstatico(req, res, pathname)) {
      return;
    }

    const sessao = obterSessao(req, res);
    const ip = obterIpCliente(req);

    // =========================================================================
    // 2. API PÚBLICA AO VIVO (POLLING 4s)
    // =========================================================================
    if (pathname === '/api/v1/eventos-ao-vivo' && req.method === 'GET') {
      const campId = Number(urlObj.searchParams.get('campeonato') || 1);
      const apos = Number(urlObj.searchParams.get('apos') || 0);
      const inicial = urlObj.searchParams.get('inicial') === '1';

      const ultRow = db.prepare('SELECT COALESCE(MAX(id), 0) AS max_id FROM eventos_partida WHERE campeonato_id = ?').get(campId);
      const ultimoId = Number(ultRow?.max_id || 0);

      if (inicial) {
        return enviarJson(res, 200, { ok: true, dados: { ultimo_id: ultimoId, eventos: [] } });
      }

      const novos = db.prepare(`
        SELECT ev.*, p.id AS pid, p.gols_mandante, p.gols_visitante, p.numero_jogo,
               e.nome AS equipe_nome, a.nome AS atleta_nome, a.apelido AS atleta_apelido,
               a2.nome AS sec_nome, a2.apelido AS sec_apelido
        FROM eventos_partida ev
        JOIN partidas p ON p.id = ev.partida_id
        LEFT JOIN equipes e ON e.id = ev.equipe_id
        LEFT JOIN atletas a ON a.id = ev.atleta_id
        LEFT JOIN atletas a2 ON a2.id = ev.atleta_secundario_id
        WHERE ev.campeonato_id = ? AND ev.id > ?
        ORDER BY ev.id ASC
        LIMIT 10
      `).all(campId, apos);

      const eventosFmt = novos.map(ev => {
        const nomeAtleta = ev.atleta_apelido || ev.atleta_nome || '';
        const nomeSec = ev.sec_apelido || ev.sec_nome || '';
        let detalhe = `Jogo ${String(ev.numero_jogo).padStart(2, '0')} • ${ev.periodo}${ev.minuto ? ` ${ev.minuto}'` : ''}`;
        if (nomeAtleta) detalhe += ` • ${nomeAtleta}`;
        if (nomeSec && ev.tipo === 'gol') detalhe += ` (Assist.: ${nomeSec})`;
        if (ev.observacao) detalhe += ` — ${ev.observacao}`;

        return {
          id: ev.id,
          tipo: ev.tipo,
          equipe: ev.equipe_nome || '',
          atleta: nomeAtleta,
          detalhe,
          placar: {
            mandante: Number(ev.gols_mandante ?? 0),
            visitante: Number(ev.gols_visitante ?? 0)
          },
          url_publica: `/jogo/${ev.pid}`
        };
      });

      return enviarJson(res, 200, {
        ok: true,
        dados: { ultimo_id: ultimoId, eventos: eventosFmt }
      });
    }

    // =========================================================================
    // 3. ÁREA DO REPRESENTANTE / DIRIGENTE (/dirigente...)
    // =========================================================================
    if (pathname === '/dirigente/login' || pathname === '/dirigente/cadastro') {
      const { campeonato } = obterCampeonatoPublico(urlObj);
      if (req.method === 'GET') {
        const modoInicial = (pathname === '/dirigente/cadastro' || urlObj.searchParams.get('modo') === 'cadastro') ? 'cadastro' : 'login';
        return enviarHtml(res, 200, dirigentePages.paginaLoginDirigente({
          campeonato,
          csrfToken: sessao.csrfToken,
          flash: consumirFlash(sessao),
          modoInicial
        }));
      }
      if (req.method === 'POST' && pathname === '/dirigente/login') {
        const { campos } = await lerCorpoFormulario(req);
        if (!validarCsrf(sessao, campos)) {
          definirFlash(sessao, 'error', 'Sessão expirada. Tente novamente.');
          return redirecionar(res, '/dirigente/login');
        }
        const cpf = limparCpf(campos.cpf);
        const senha = String(campos.senha || '');
        const equipe = db.prepare('SELECT * FROM equipes WHERE dirigente_cpf = ? AND ativo = 1').get(cpf);
        if (!equipe) {
          const admin = db.prepare('SELECT * FROM usuarios_admin WHERE cpf = ? AND ativo = 1').get(cpf);
          if (admin && verificarSenha(senha, admin.senha_hash)) {
            sessao.adminId = admin.id;
            registrarAuditoria({
              perfil: 'admin',
              usuarioNome: admin.nome,
              cpf: admin.cpf,
              acao: 'Login com Acesso Total pelo portal',
              ip
            });
            definirFlash(sessao, 'success', `Bem-vindo, ${admin.nome}! Acesso Total Administrativo ativado.`);
            return redirecionar(res, '/admin');
          }
          definirFlash(sessao, 'error', 'CPF ou senha não encontrados no sistema.');
          return redirecionar(res, '/dirigente/login');
        }
        if (!verificarSenha(senha, equipe.dirigente_senha_hash)) {
          const admin = db.prepare('SELECT * FROM usuarios_admin WHERE cpf = ? AND ativo = 1').get(cpf);
          if (admin && verificarSenha(senha, admin.senha_hash)) {
            sessao.adminId = admin.id;
            definirFlash(sessao, 'success', `Bem-vindo, ${admin.nome}! Acesso Total Administrativo ativado.`);
            return redirecionar(res, '/admin');
          }
          definirFlash(sessao, 'error', 'CPF ou senha inválidos.');
          return redirecionar(res, '/dirigente/login');
        }
        sessao.dirigenteEquipeId = equipe.id;
        registrarAuditoria({
          perfil: 'dirigente',
          usuarioNome: equipe.dirigente_nome || equipe.nome,
          cpf,
          equipeId: equipe.id,
          acao: `Login na Área da Equipe (${equipe.nome})`,
          ip
        });
        definirFlash(sessao, 'success', `Bem-vindo ao painel oficial do ${equipe.nome}!`);
        return redirecionar(res, '/dirigente');
      }
      if (req.method === 'POST' && pathname === '/dirigente/cadastro') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (!validarCsrf(sessao, campos)) {
          definirFlash(sessao, 'error', 'Sessão expirada. Tente novamente.');
          return redirecionar(res, '/dirigente/login?modo=cadastro');
        }
        const nomeEquipe = String(campos.nome || '').trim();
        const sigla = String(campos.sigla || nomeEquipe.slice(0, 3) || 'EQP').trim().toUpperCase();
        const chave = String(campos.chave || 'A').trim().toUpperCase();
        const localidade = String(campos.localidade || 'Quiterianópolis - CE').trim();
        const dirigenteNome = String(campos.dirigente_nome || '').trim();
        const dirigenteTel = String(campos.dirigente_telefone || '').trim();
        const cpf = limparCpf(campos.dirigente_cpf);
        const senha = String(campos.senha || '');

        if (!nomeEquipe || !dirigenteNome || cpf.length !== 11 || senha.length < 4) {
          definirFlash(sessao, 'error', 'Preencha todos os campos obrigatórios (CPF com 11 dígitos e senha com pelo menos 4 caracteres).');
          return redirecionar(res, '/dirigente/login?modo=cadastro');
        }

        const cpfExistente = db.prepare('SELECT id, nome FROM equipes WHERE dirigente_cpf = ? AND ativo = 1').get(cpf);
        if (cpfExistente) {
          definirFlash(sessao, 'error', `Este CPF já está vinculado à equipe "${cpfExistente.nome}". Faça login na aba "Já tenho acesso".`);
          return redirecionar(res, '/dirigente/login');
        }

        let escudoUrl = '';
        if (arquivos.escudo && arquivos.escudo[0]) {
          escudoUrl = salvarArquivoUpload(arquivos.escudo[0], 'equipes', ['.png', '.jpg', '.jpeg', '.webp', '.svg']);
        }

        const maxOrdemRow = db.prepare('SELECT COALESCE(MAX(ordem_sorteio), 0) AS m FROM equipes WHERE campeonato_id = ? AND chave = ?').get(campeonato.id, chave);
        const novaOrdem = Number(maxOrdemRow?.m || 0) + 1;

        const r = db.prepare(`
          INSERT INTO equipes (
            campeonato_id, nome, sigla, chave, localidade, escudo_url,
            dirigente_nome, dirigente_cpf, dirigente_telefone, dirigente_senha_hash, ordem_sorteio, ativo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(
          campeonato.id,
          nomeEquipe,
          sigla,
          chave,
          localidade,
          escudoUrl,
          dirigenteNome,
          cpf,
          dirigenteTel,
          hashSenha(senha),
          novaOrdem
        );

        const novoId = Number(r.lastInsertRowid);
        sessao.dirigenteEquipeId = novoId;

        registrarAuditoria({
          perfil: 'dirigente',
          usuarioNome: dirigenteNome,
          cpf,
          equipeId: novoId,
          acao: `Cadastrou nova equipe: ${nomeEquipe} (Chave ${chave})`,
          ip
        });

        definirFlash(sessao, 'success', `🎉 Equipe "${nomeEquipe}" cadastrada com sucesso! Agora você já pode inscrever atletas, comissão técnica e uniforme.`);
        return redirecionar(res, '/dirigente');
      }
    }

    if (pathname === '/dirigente/sair') {
      sessao.dirigenteEquipeId = null;
      definirFlash(sessao, 'info', 'Você saiu da Área da Equipe com segurança.');
      return redirecionar(res, '/dirigente/login');
    }

    if (pathname.startsWith('/dirigente')) {
      if (!sessao.dirigenteEquipeId) {
        return redirecionar(res, '/dirigente/login');
      }
      const equipe = db.prepare('SELECT * FROM equipes WHERE id = ? AND ativo = 1').get(sessao.dirigenteEquipeId);
      if (!equipe) {
        sessao.dirigenteEquipeId = null;
        return redirecionar(res, '/dirigente/login');
      }
      const campeonato = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(equipe.campeonato_id);
      const janela = verificarJanelaEquipeAberta(campeonato, equipe);

      if (req.method === 'POST') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (!validarCsrf(sessao, campos)) {
          definirFlash(sessao, 'error', 'Token de segurança inválido. Atualize a página.');
          return redirecionar(res, '/dirigente');
        }

        if (pathname === '/dirigente/perfil') {
          const eqNome = String(campos.equipe_nome || equipe.nome).trim();
          const eqSigla = String(campos.equipe_sigla || equipe.sigla).trim().toUpperCase();
          const eqLocal = String(campos.equipe_localidade || equipe.localidade).trim();
          const nome = String(campos.dirigente_nome || equipe.dirigente_nome).trim();
          const tel = String(campos.dirigente_telefone || '').trim();
          const novaSenha = String(campos.nova_senha || '');
          let escudoUrl = equipe.escudo_url || '';
          if (arquivos.escudo && arquivos.escudo[0]) {
            escudoUrl = salvarArquivoUpload(arquivos.escudo[0], 'equipes', ['.png', '.jpg', '.jpeg', '.webp', '.svg']) || escudoUrl;
          }
          if (nome && eqNome) {
            if (novaSenha && novaSenha.length >= 4) {
              db.prepare('UPDATE equipes SET nome = ?, sigla = ?, localidade = ?, escudo_url = ?, dirigente_nome = ?, dirigente_telefone = ?, dirigente_senha_hash = ? WHERE id = ?')
                .run(eqNome, eqSigla, eqLocal, escudoUrl, nome, tel, hashSenha(novaSenha), equipe.id);
            } else {
              db.prepare('UPDATE equipes SET nome = ?, sigla = ?, localidade = ?, escudo_url = ?, dirigente_nome = ?, dirigente_telefone = ? WHERE id = ?')
                .run(eqNome, eqSigla, eqLocal, escudoUrl, nome, tel, equipe.id);
            }
            definirFlash(sessao, 'success', 'Dados da equipe e do representante atualizados com sucesso!');
          }
          return redirecionar(res, '/dirigente?aba=visao');
        }

        if (pathname === '/dirigente/atletas/adicionar') {
          if (!janela.aberta) {
            definirFlash(sessao, 'error', `Alteração bloqueada: ${janela.motivo}`);
            return redirecionar(res, '/dirigente?aba=atletas');
          }
          const ativosCount = db.prepare("SELECT COUNT(*) AS c FROM atletas WHERE equipe_id = ? AND status != 'inativo'").get(equipe.id).c;
          if (ativosCount >= campeonato.elenco_max) {
            definirFlash(sessao, 'error', `Limite máximo de ${campeonato.elenco_max} atletas atingido.`);
            return redirecionar(res, '/dirigente?aba=atletas');
          }
          const origem = campos.origem === 'fora' ? 'fora' : 'local';
          if (origem === 'fora') {
            const foraCount = db.prepare("SELECT COUNT(*) AS c FROM atletas WHERE equipe_id = ? AND status != 'inativo' AND origem = 'fora'").get(equipe.id).c;
            if (foraCount >= campeonato.vagas_fora_limite) {
              definirFlash(sessao, 'error', `Sua equipe já utiliza o limite máximo de ${campeonato.vagas_fora_limite} atletas de fora.`);
              return redirecionar(res, '/dirigente?aba=atletas');
            }
          }
          const cpfAtleta = limparCpf(campos.cpf);
          if (cpfAtleta.length !== 11) {
            definirFlash(sessao, 'error', 'Informe um CPF válido com 11 dígitos para o atleta.');
            return redirecionar(res, '/dirigente?aba=atletas');
          }
          const duplicado = db.prepare("SELECT e.nome FROM atletas a JOIN equipes e ON e.id = a.equipe_id WHERE a.campeonato_id = ? AND a.cpf = ? AND a.status != 'inativo'").get(campeonato.id, cpfAtleta);
          if (duplicado) {
            definirFlash(sessao, 'error', `Este CPF já está inscrito ativamente na equipe ${duplicado.nome}.`);
            return redirecionar(res, '/dirigente?aba=atletas');
          }

          let fotoUrl = '';
          if (arquivos.foto && arquivos.foto[0]) {
            fotoUrl = salvarArquivoUpload(arquivos.foto[0], 'atletas');
          }

          db.prepare(`
            INSERT INTO atletas (
              campeonato_id, equipe_id, nome, apelido, cpf, data_nascimento, naturalidade,
              menor_idade, posicao, numero, origem, criterio_local, titulo_eleitor, vaga_fora_num, foto_url, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
          `).run(
            campeonato.id,
            equipe.id,
            String(campos.nome || '').trim(),
            String(campos.apelido || '').trim(),
            cpfAtleta,
            String(campos.data_nascimento || ''),
            String(campos.naturalidade || 'Quiterianópolis - CE').trim(),
            campos.menor_idade === '1' ? 1 : 0,
            String(campos.posicao || 'Meia'),
            campos.numero ? Number(campos.numero) : null,
            origem,
            origem === 'local' ? String(campos.criterio_local || 'natural') : '',
            String(campos.titulo_eleitor || '').trim(),
            origem === 'fora' ? Number(campos.vaga_fora_num || 1) : null,
            fotoUrl
          );

          registrarAuditoria({
            perfil: 'dirigente',
            usuarioNome: equipe.dirigente_nome || equipe.nome,
            cpf: equipe.dirigente_cpf,
            equipeId: equipe.id,
            acao: `Inscreveu atleta ${campos.nome} (${origem})`,
            ip
          });
          definirFlash(sessao, 'success', 'Atleta inscrito com sucesso! Aguardando homologação da Comissão Organizadora.');
          return redirecionar(res, '/dirigente?aba=atletas');
        }

        if (pathname === '/dirigente/atletas/remover') {
          if (!janela.aberta) {
            definirFlash(sessao, 'error', 'Janela fechada no momento.');
            return redirecionar(res, '/dirigente?aba=atletas');
          }
          const atleta = db.prepare('SELECT * FROM atletas WHERE id = ? AND equipe_id = ?').get(Number(campos.atleta_id), equipe.id);
          if (atleta) {
            if (atleta.ja_atuou) {
              db.prepare("UPDATE atletas SET status = 'inativo' WHERE id = ?").run(atleta.id);
              definirFlash(sessao, 'info', 'Atleta inativado (mantido no histórico oficial pois já constou em súmula).');
            } else {
              db.prepare('DELETE FROM atletas WHERE id = ?').run(atleta.id);
              definirFlash(sessao, 'success', 'Inscrição do atleta removida com sucesso.');
            }
          }
          return redirecionar(res, '/dirigente?aba=atletas');
        }

        if (pathname === '/dirigente/comissao/adicionar') {
          if (!janela.aberta) {
            definirFlash(sessao, 'error', 'Janela fechada no momento.');
            return redirecionar(res, '/dirigente?aba=comissao');
          }
          const qtd = db.prepare('SELECT COUNT(*) AS c FROM comissao_tecnica WHERE equipe_id = ? AND ativo = 1').get(equipe.id).c;
          if (qtd >= campeonato.comissao_max) {
            definirFlash(sessao, 'error', `Limite de ${campeonato.comissao_max} integrantes atingido.`);
            return redirecionar(res, '/dirigente?aba=comissao');
          }
          db.prepare('INSERT INTO comissao_tecnica (equipe_id, nome, cpf, funcao) VALUES (?, ?, ?, ?)')
            .run(equipe.id, String(campos.nome || '').trim(), limparCpf(campos.cpf), String(campos.funcao || 'Técnico'));
          definirFlash(sessao, 'success', 'Integrante adicionado à comissão técnica!');
          return redirecionar(res, '/dirigente?aba=comissao');
        }

        if (pathname === '/dirigente/comissao/remover') {
          if (janela.aberta) {
            db.prepare('DELETE FROM comissao_tecnica WHERE id = ? AND equipe_id = ?').run(Number(campos.comissao_id), equipe.id);
            definirFlash(sessao, 'success', 'Integrante removido da comissão técnica.');
          }
          return redirecionar(res, '/dirigente?aba=comissao');
        }

        if (pathname === '/dirigente/uniforme') {
          const desc = String(campos.uniforme_descricao || '').trim();
          let fotoUnif = equipe.uniforme_foto_url || '';
          if (arquivos.uniforme_foto && arquivos.uniforme_foto[0]) {
            fotoUnif = salvarArquivoUpload(arquivos.uniforme_foto[0], 'uniformes');
          }
          db.prepare('UPDATE equipes SET uniforme_descricao = ?, uniforme_foto_url = ? WHERE id = ?').run(desc, fotoUnif, equipe.id);
          definirFlash(sessao, 'success', 'Uniforme oficial da equipe atualizado!');
          return redirecionar(res, '/dirigente?aba=uniforme');
        }

        if (pathname === '/dirigente/adiamentos/solicitar') {
          const partida = db.prepare('SELECT * FROM partidas WHERE id = ? AND campeonato_id = ?').get(Number(campos.partida_id), campeonato.id);
          if (partida && (partida.mandante_id === equipe.id || partida.visitante_id === equipe.id)) {
            const advId = partida.mandante_id === equipe.id ? partida.visitante_id : partida.mandante_id;
            db.prepare(`
              INSERT INTO adiamentos (campeonato_id, partida_id, equipe_solicitante_id, equipe_adversaria_id, motivo, nova_data_sugerida)
              VALUES (?, ?, ?, ?, ?, ?)
            `).run(campeonato.id, partida.id, equipe.id, advId || null, String(campos.motivo || '').trim(), String(campos.nova_data_sugerida || '').trim());
            definirFlash(sessao, 'success', 'Solicitação de adiamento protocolada para ciência do adversário e análise da Comissão.');
          }
          return redirecionar(res, '/dirigente?aba=adiamentos');
        }

        if (pathname === '/dirigente/adiamentos/manifestar') {
          const ad = db.prepare('SELECT * FROM adiamentos WHERE id = ? AND equipe_adversaria_id = ?').get(Number(campos.adiamento_id), equipe.id);
          if (ad && ad.status_comissao === 'pendente') {
            const dec = campos.decisao === 'concordou' ? 'concordou' : 'discordou';
            db.prepare('UPDATE adiamentos SET status_adversario = ?, manifestacao_adversario = ? WHERE id = ?')
              .run(dec, String(campos.manifestacao || '').trim(), ad.id);
            definirFlash(sessao, 'success', 'Manifestação da sua equipe registrada com sucesso!');
          }
          return redirecionar(res, '/dirigente?aba=adiamentos');
        }

        if (pathname === '/dirigente/documentos/assinar') {
          const senhaConf = String(campos.senha_confirmacao || '');
          if (!verificarSenha(senhaConf, equipe.dirigente_senha_hash)) {
            definirFlash(sessao, 'error', 'Senha incorreta. Confirme sua senha de dirigente para assinar.');
            return redirecionar(res, '/dirigente?aba=documentos');
          }
          const doc = db.prepare('SELECT * FROM documentos_internos WHERE id = ? AND campeonato_id = ?').get(Number(campos.documento_id), campeonato.id);
          if (doc) {
            db.prepare(`
              INSERT OR IGNORE INTO documentos_assinaturas (documento_id, equipe_id, dirigente_nome, dirigente_cpf, ip)
              VALUES (?, ?, ?, ?, ?)
            `).run(doc.id, equipe.id, equipe.dirigente_nome || equipe.nome, equipe.dirigente_cpf, ip);
            registrarAuditoria({
              perfil: 'dirigente',
              usuarioNome: equipe.dirigente_nome || equipe.nome,
              cpf: equipe.dirigente_cpf,
              equipeId: equipe.id,
              acao: `Assinou digitalmente: ${doc.titulo}`,
              ip
            });
            definirFlash(sessao, 'success', 'Documento assinado eletronicamente com sucesso!');
          }
          return redirecionar(res, '/dirigente?aba=documentos');
        }
      }

      // GET /dirigente
      const todasEquipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ?').all(campeonato.id);
      const equipesMap = {};
      for (const e of todasEquipes) equipesMap[e.id] = e;

      const partidasEquipe = db.prepare(`
        SELECT * FROM partidas
        WHERE campeonato_id = ? AND (mandante_id = ? OR visitante_id = ?)
        ORDER BY data_iso ASC, numero_jogo ASC
      `).all(campeonato.id, equipe.id, equipe.id);

      const proxPartida = partidasEquipe.find(p => p.status === 'ao_vivo' || p.status === 'agendada') || null;
      const atletas = db.prepare('SELECT * FROM atletas WHERE equipe_id = ? ORDER BY status ASC, numero ASC, nome ASC').all(equipe.id);
      const comissao = db.prepare('SELECT * FROM comissao_tecnica WHERE equipe_id = ? AND ativo = 1 ORDER BY id ASC').all(equipe.id);

      const adiamentos = db.prepare(`
        SELECT ad.*, p.numero_jogo, p.data_jogo, es.nome AS solicitante_nome
        FROM adiamentos ad
        JOIN partidas p ON p.id = ad.partida_id
        JOIN equipes es ON es.id = ad.equipe_solicitante_id
        WHERE ad.equipe_solicitante_id = ? OR ad.equipe_adversaria_id = ?
        ORDER BY ad.id DESC
      `).all(equipe.id, equipe.id);

      const documentos = db.prepare('SELECT * FROM documentos_internos WHERE campeonato_id = ? AND publicado = 1 ORDER BY id DESC').all(campeonato.id);
      const assinaturas = db.prepare('SELECT * FROM documentos_assinaturas WHERE equipe_id = ?').all(equipe.id);
      const assinaturasMap = {};
      for (const a of assinaturas) assinaturasMap[a.documento_id] = a;

      const est = obterEstatisticasAtletas(campeonato.id);
      const disciplinaEquipe = est.disciplina.filter(d => d.equipe_id === equipe.id);

      return enviarHtml(res, 200, dirigentePages.paginaPainelDirigente({
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
        csrfToken: sessao.csrfToken,
        flash: consumirFlash(sessao),
        aba: urlObj.searchParams.get('aba') || 'visao'
      }));
    }

    // =========================================================================
    // 4. PAINEL ADMINISTRATIVO (/admin...)
    // =========================================================================
    if (pathname === '/admin/login') {
      const { campeonato } = obterCampeonatoPublico(urlObj);
      if (req.method === 'GET') {
        return enviarHtml(res, 200, adminPages.paginaLoginAdmin({
          campeonato,
          csrfToken: sessao.csrfToken,
          flash: consumirFlash(sessao)
        }));
      }
      if (req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (!validarCsrf(sessao, campos)) {
          definirFlash(sessao, 'error', 'Sessão expirada. Tente novamente.');
          return redirecionar(res, '/admin/login');
        }
        const cpf = limparCpf(campos.cpf);
        const senha = String(campos.senha || '');
        const admin = db.prepare('SELECT * FROM usuarios_admin WHERE cpf = ? AND ativo = 1').get(cpf);
        if (!admin || !verificarSenha(senha, admin.senha_hash)) {
          definirFlash(sessao, 'error', 'CPF ou senha administrativos inválidos.');
          return redirecionar(res, '/admin/login');
        }
        sessao.adminId = admin.id;
        registrarAuditoria({
          perfil: 'admin',
          usuarioNome: admin.nome,
          cpf: admin.cpf,
          acao: 'Login no Painel Administrativo',
          ip
        });
        definirFlash(sessao, 'success', `Bem-vindo, ${admin.nome}!`);
        return redirecionar(res, '/admin');
      }
    }

    if (pathname === '/admin/sair') {
      sessao.adminId = null;
      definirFlash(sessao, 'info', 'Sessão administrativa encerrada.');
      return redirecionar(res, '/admin/login');
    }

    if (pathname.startsWith('/admin')) {
      if (!sessao.adminId) {
        return redirecionar(res, '/admin/login');
      }
      const admin = db.prepare('SELECT * FROM usuarios_admin WHERE id = ? AND ativo = 1').get(sessao.adminId);
      if (!admin) {
        sessao.adminId = null;
        return redirecionar(res, '/admin/login');
      }

      const todosCampeonatos = db.prepare('SELECT * FROM campeonatos ORDER BY id ASC').all();
      const campeonato = todosCampeonatos.find(c => c.id === sessao.adminCampeonatoId) || todosCampeonatos[0];
      sessao.adminCampeonatoId = campeonato.id;

      if (pathname === '/admin/trocar-campeonato') {
        const novoId = Number(urlObj.searchParams.get('id') || 0);
        if (todosCampeonatos.some(c => c.id === novoId)) {
          sessao.adminCampeonatoId = novoId;
        }
        return redirecionar(res, '/admin');
      }

      // Dashboard Admin
      if (pathname === '/admin' && req.method === 'GET') {
        const totalJogos = db.prepare('SELECT COUNT(*) AS c FROM partidas WHERE campeonato_id = ?').get(campeonato.id).c;
        const jogosEncerrados = db.prepare("SELECT COUNT(*) AS c FROM partidas WHERE campeonato_id = ? AND status = 'encerrada'").get(campeonato.id).c;
        const somaGolsRow = db.prepare("SELECT COALESCE(SUM(COALESCE(gols_mandante,0) + COALESCE(gols_visitante,0)), 0) AS g FROM partidas WHERE campeonato_id = ? AND status IN ('ao_vivo','encerrada')").get(campeonato.id);
        const totalAtletas = db.prepare("SELECT COUNT(*) AS c FROM atletas WHERE campeonato_id = ? AND status != 'inativo'").get(campeonato.id).c;
        const atletasPendentes = db.prepare("SELECT COUNT(*) AS c FROM atletas WHERE campeonato_id = ? AND status = 'pendente'").get(campeonato.id).c;
        const adiamentosPendentes = db.prepare("SELECT COUNT(*) AS c FROM adiamentos WHERE campeonato_id = ? AND status_comissao = 'pendente'").get(campeonato.id).c;
        const avaliacoesPendentes = db.prepare("SELECT COUNT(*) AS c FROM avaliacoes WHERE campeonato_id = ? AND status = 'pendente'").get(campeonato.id).c;

        const aoVivo = db.prepare(`
          SELECT p.*, em.nome AS mandante_nome, ev.nome AS visitante_nome
          FROM partidas p
          LEFT JOIN equipes em ON em.id = p.mandante_id
          LEFT JOIN equipes ev ON ev.id = p.visitante_id
          WHERE p.campeonato_id = ? AND p.status = 'ao_vivo'
          ORDER BY p.numero_jogo ASC
        `).all(campeonato.id);

        const proximas = db.prepare(`
          SELECT p.*, em.nome AS mandante_nome, ev.nome AS visitante_nome
          FROM partidas p
          LEFT JOIN equipes em ON em.id = p.mandante_id
          LEFT JOIN equipes ev ON ev.id = p.visitante_id
          WHERE p.campeonato_id = ? AND p.status = 'agendada'
          ORDER BY p.data_iso ASC, p.numero_jogo ASC
          LIMIT 8
        `).all(campeonato.id);

        const logsRecentes = db.prepare('SELECT * FROM auditoria_logs ORDER BY id DESC LIMIT 10').all();

        return enviarHtml(res, 200, adminPages.paginaDashboardAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          kpis: {
            totalJogos,
            jogosEncerrados,
            totalGols: somaGolsRow.g,
            totalAtletas,
            atletasPendentes,
            adiamentosPendentes,
            avaliacoesPendentes,
            totalVisitas: obterTotalVisitas(campeonato.id)
          },
          aoVivo,
          proximas,
          logsRecentes,
          csrfToken: sessao.csrfToken
        }));
      }

      // Lista de Partidas Admin
      if (pathname === '/admin/partidas' && req.method === 'GET') {
        const partidas = db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id);
        const equipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave, nome').all(campeonato.id);
        return enviarHtml(res, 200, adminPages.paginaPartidasAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          partidas,
          equipes,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/partidas/sincronizar' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          sincronizarTabelaCondicional(campeonato.id, { forcarQuartas: campos.forcar_quartas === '1' });
          definirFlash(sessao, 'success', 'Cruzamentos condicionais e chaveamento sincronizados com sucesso!');
        }
        return redirecionar(res, '/admin/partidas');
      }

      if (pathname === '/admin/partidas/criar' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          const dataIso = converterDataParaIso(campos.data_jogo, campos.hora_jogo);
          db.prepare(`
            INSERT INTO partidas (
              campeonato_id, numero_jogo, fase, titulo_fase, chave, data_jogo, hora_jogo, data_iso, local,
              mandante_id, visitante_id, mandante_placeholder, visitante_placeholder
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            campeonato.id,
            Number(campos.numero_jogo || 20),
            String(campos.fase || 'grupos'),
            `Partida Oficial • ${campos.data_jogo}`,
            String(campos.chave || '').toUpperCase().trim(),
            String(campos.data_jogo || '').trim(),
            String(campos.hora_jogo || '17:00').trim(),
            dataIso,
            String(campos.local || campeonato.estadio_padrao).trim(),
            campos.mandante_id ? Number(campos.mandante_id) : null,
            campos.visitante_id ? Number(campos.visitante_id) : null,
            String(campos.mandante_placeholder || '').trim(),
            String(campos.visitante_placeholder || '').trim()
          );
          definirFlash(sessao, 'success', 'Nova partida adicionada à tabela!');
        }
        return redirecionar(res, '/admin/partidas');
      }

      // Operação de Partida Específica (/admin/partida/:id...)
      const matchPartidaAdmin = pathname.match(/^\/admin\/partida\/(\d+)(?:\/([a-z-]+))?(?:\/([a-z-]+))?$/);
      if (matchPartidaAdmin) {
        const partidaId = Number(matchPartidaAdmin[1]);
        const subacao = matchPartidaAdmin[2] || '';
        const subacao2 = matchPartidaAdmin[3] || '';
        const partida = db.prepare('SELECT * FROM partidas WHERE id = ? AND campeonato_id = ?').get(partidaId, campeonato.id);
        if (!partida) return redirecionar(res, '/admin/partidas');

        if (req.method === 'GET' && !subacao) {
          const equipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave, nome').all(campeonato.id);
          const atletasMandante = partida.mandante_id
            ? db.prepare("SELECT * FROM atletas WHERE equipe_id = ? AND status != 'inativo' ORDER BY numero ASC, nome ASC").all(partida.mandante_id)
            : [];
          const atletasVisitante = partida.visitante_id
            ? db.prepare("SELECT * FROM atletas WHERE equipe_id = ? AND status != 'inativo' ORDER BY numero ASC, nome ASC").all(partida.visitante_id)
            : [];
          const rels = db.prepare('SELECT atleta_id FROM partida_relacionados WHERE partida_id = ?').all(partida.id);
          const relacionadosIds = new Set(rels.map(r => r.atleta_id));

          const eventos = db.prepare(`
            SELECT ev.*, e.nome AS equipe_nome,
                   COALESCE(a.apelido, a.nome) AS atleta_nome,
                   COALESCE(a2.apelido, a2.nome) AS atleta_sec_nome
            FROM eventos_partida ev
            LEFT JOIN equipes e ON e.id = ev.equipe_id
            LEFT JOIN atletas a ON a.id = ev.atleta_id
            LEFT JOIN atletas a2 ON a2.id = ev.atleta_secundario_id
            WHERE ev.partida_id = ?
            ORDER BY ev.id DESC
          `).all(partida.id);

          return enviarHtml(res, 200, adminPages.paginaOperarPartidaAdmin({
            campeonato,
            todosCampeonatos,
            admin,
            flash: consumirFlash(sessao),
            partida,
            equipes,
            atletasMandante,
            atletasVisitante,
            relacionadosIds,
            eventos,
            csrfToken: sessao.csrfToken
          }));
        }

        if (req.method === 'POST') {
          const { campos, arquivos } = await lerCorpoFormulario(req);
          if (!validarCsrf(sessao, campos)) return redirecionar(res, `/admin/partida/${partida.id}`);

          if (subacao === 'cronometro') {
            const acao = campos.acao;
            const agoraMs = Date.now();
            if (acao === 'iniciar_1t') {
              db.prepare(`
                UPDATE partidas
                SET status = 'ao_vivo', periodo_atual = '1T',
                    gols_mandante = COALESCE(gols_mandante, 0), gols_visitante = COALESCE(gols_visitante, 0),
                    cronometro_segundos_base = 0, cronometro_rodando = 1, cronometro_iniciado_em = ?, acrescimos_min = 0
                WHERE id = ?
              `).run(agoraMs, partida.id);
              definirFlash(sessao, 'success', '🔴 1º Tempo iniciado ao vivo!');
            } else if (acao === 'intervalo') {
              db.prepare(`
                UPDATE partidas
                SET status = 'ao_vivo', periodo_atual = 'INT', cronometro_segundos_base = 0, cronometro_rodando = 0, cronometro_iniciado_em = NULL, acrescimos_min = 0
                WHERE id = ?
              `).run(partida.id);
              definirFlash(sessao, 'info', 'Partida em Intervalo.');
            } else if (acao === 'iniciar_2t') {
              db.prepare(`
                UPDATE partidas
                SET status = 'ao_vivo', periodo_atual = '2T', cronometro_segundos_base = 0, cronometro_rodando = 1, cronometro_iniciado_em = ?, acrescimos_min = 0
                WHERE id = ?
              `).run(agoraMs, partida.id);
              definirFlash(sessao, 'success', '🔴 2º Tempo iniciado ao vivo!');
            } else if (acao === 'pausar') {
              const acum = segundosAtuaisCronometro(partida);
              db.prepare('UPDATE partidas SET cronometro_segundos_base = ?, cronometro_rodando = 0, cronometro_iniciado_em = NULL WHERE id = ?')
                .run(acum, partida.id);
            } else if (acao === 'retomar') {
              db.prepare('UPDATE partidas SET cronometro_rodando = 1, cronometro_iniciado_em = ? WHERE id = ?')
                .run(agoraMs, partida.id);
            } else if (acao === 'penaltis') {
              db.prepare("UPDATE partidas SET status = 'ao_vivo', periodo_atual = 'PEN', cronometro_rodando = 0, cronometro_iniciado_em = NULL WHERE id = ?")
                .run(partida.id);
              definirFlash(sessao, 'warning', 'Disputa de pênaltis ativada!');
            } else if (acao === 'acrescimos') {
              const min = Math.max(0, Number(campos.minutos || 0));
              db.prepare('UPDATE partidas SET acrescimos_min = ? WHERE id = ?').run(min, partida.id);
              if (min > 0) {
                db.prepare(`
                  INSERT INTO eventos_partida (campeonato_id, partida_id, tipo, periodo, observacao)
                  VALUES (?, ?, 'acrescimo', ?, ?)
                `).run(campeonato.id, partida.id, partida.periodo_atual || '2T', `+${min} min de acréscimos`);
              }
              definirFlash(sessao, 'info', `Acréscimos definidos: +${min} min.`);
            } else if (acao === 'reabrir') {
              db.prepare("UPDATE partidas SET status = 'ao_vivo', cronometro_rodando = 0 WHERE id = ?").run(partida.id);
              definirFlash(sessao, 'warning', 'Partida reaberta para ajustes.');
            }
            return redirecionar(res, `/admin/partida/${partida.id}`);
          }

          if (subacao === 'evento' && !subacao2) {
            const tipo = String(campos.tipo || 'ocorrencia');
            const eqId = campos.equipe_id ? Number(campos.equipe_id) : null;
            const atId = campos.atleta_id ? Number(campos.atleta_id) : null;
            const atSecId = campos.atleta_secundario_id ? Number(campos.atleta_secundario_id) : null;

            db.prepare(`
              INSERT INTO eventos_partida (campeonato_id, partida_id, equipe_id, atleta_id, atleta_secundario_id, tipo, periodo, minuto, observacao)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              campeonato.id,
              partida.id,
              eqId,
              atId,
              atSecId,
              tipo,
              String(campos.periodo || '1T'),
              String(campos.minuto || '').trim(),
              String(campos.observacao || '').trim()
            );

            if (atId) db.prepare('UPDATE atletas SET ja_atuou = 1 WHERE id = ?').run(atId);
            if (atSecId) db.prepare('UPDATE atletas SET ja_atuou = 1 WHERE id = ?').run(atSecId);

            if (tipo === 'gol' || tipo === 'gol_contra') {
              recalcularPlacarPorEventos(partida.id);
            }

            sincronizarTabelaCondicional(campeonato.id);
            definirFlash(sessao, 'success', 'Evento registrado e publicado em tempo real!');
            return redirecionar(res, `/admin/partida/${partida.id}`);
          }

          if (subacao === 'evento' && subacao2 === 'remover') {
            const ev = db.prepare('SELECT * FROM eventos_partida WHERE id = ? AND partida_id = ?').get(Number(campos.evento_id), partida.id);
            if (ev) {
              db.prepare('DELETE FROM eventos_partida WHERE id = ?').run(ev.id);
              if (ev.tipo === 'gol' || ev.tipo === 'gol_contra') {
                recalcularPlacarPorEventos(partida.id);
              }
              definirFlash(sessao, 'info', 'Evento removido da linha do tempo.');
            }
            return redirecionar(res, `/admin/partida/${partida.id}`);
          }

          if (subacao === 'salvar') {
            const encerrarAgora = campos.encerrar_agora === '1';
            const novoStatus = encerrarAgora ? 'encerrada' : String(campos.status || partida.status);
            const gm = campos.gols_mandante !== '' && campos.gols_mandante !== undefined ? Number(campos.gols_mandante) : (encerrarAgora ? Number(partida.gols_mandante ?? 0) : null);
            const gv = campos.gols_visitante !== '' && campos.gols_visitante !== undefined ? Number(campos.gols_visitante) : (encerrarAgora ? Number(partida.gols_visitante ?? 0) : null);
            const pm = campos.penaltis_mandante !== '' && campos.penaltis_mandante !== undefined ? Number(campos.penaltis_mandante) : null;
            const pv = campos.penaltis_visitante !== '' && campos.penaltis_visitante !== undefined ? Number(campos.penaltis_visitante) : null;
            const vencDef = campos.vencedor_definido_id ? Number(campos.vencedor_definido_id) : null;

            let sumulaPdfUrl = partida.sumula_pdf_url || '';
            let sumulaPubEm = partida.sumula_publicada_em || '';
            if (arquivos.sumula_pdf && arquivos.sumula_pdf[0]) {
              sumulaPdfUrl = salvarArquivoUpload(arquivos.sumula_pdf[0], 'sumulas', ['.pdf']);
              sumulaPubEm = new Date().toLocaleString('pt-BR');
            }

            const dataJogo = String(campos.data_jogo || partida.data_jogo).trim();
            const horaJogo = String(campos.hora_jogo || partida.hora_jogo).trim();
            const dataIso = converterDataParaIso(dataJogo, horaJogo);

            db.prepare(`
              UPDATE partidas
              SET status = ?, gols_mandante = ?, gols_visitante = ?, penaltis_mandante = ?, penaltis_visitante = ?,
                  vencedor_definido_id = ?, mandante_id = ?, visitante_id = ?, data_jogo = ?, hora_jogo = ?, data_iso = ?,
                  local = ?, arbitro_principal = ?, assistente_1 = ?, assistente_2 = ?, mesario = ?,
                  craque_atleta_id = ?, sumula_pdf_url = ?, sumula_publicada_em = ?, observacoes_sumula = ?,
                  cronometro_rodando = CASE WHEN ? = 'encerrada' THEN 0 ELSE cronometro_rodando END
              WHERE id = ?
            `).run(
              novoStatus,
              gm,
              gv,
              pm,
              pv,
              vencDef,
              campos.mandante_id ? Number(campos.mandante_id) : null,
              campos.visitante_id ? Number(campos.visitante_id) : null,
              dataJogo,
              horaJogo,
              dataIso,
              String(campos.local || campeonato.estadio_padrao).trim(),
              String(campos.arbitro_principal || '').trim(),
              String(campos.assistente_1 || '').trim(),
              String(campos.assistente_2 || '').trim(),
              String(campos.mesario || '').trim(),
              campos.craque_atleta_id ? Number(campos.craque_atleta_id) : null,
              sumulaPdfUrl,
              sumulaPubEm,
              String(campos.observacoes_sumula || '').trim(),
              novoStatus,
              partida.id
            );

            sincronizarTabelaCondicional(campeonato.id);

            registrarAuditoria({
              perfil: 'admin',
              usuarioNome: admin.nome,
              cpf: admin.cpf,
              acao: `Salvou Jogo ${String(partida.numero_jogo).padStart(2, '0')} (${novoStatus}: ${gm ?? '-'}x${gv ?? '-'})`,
              ip
            });

            definirFlash(sessao, 'success', encerrarAgora
              ? '🏁 Partida encerrada! Classificação das chaves e cruzamentos atualizados automaticamente.'
              : 'Dados da partida salvos com sucesso!');
            return redirecionar(res, `/admin/partida/${partida.id}`);
          }

          if (subacao === 'relacionados') {
            const brutos = campos.atletas_ids ? (Array.isArray(campos.atletas_ids) ? campos.atletas_ids : [campos.atletas_ids]) : [];
            const ids = brutos.map(Number).filter(Boolean);
            db.prepare('DELETE FROM partida_relacionados WHERE partida_id = ?').run(partida.id);
            const ins = db.prepare('INSERT OR IGNORE INTO partida_relacionados (partida_id, equipe_id, atleta_id, numero_camisa, condicao) VALUES (?, ?, ?, ?, ?)');
            for (const aid of ids) {
              const at = db.prepare('SELECT id, equipe_id, numero FROM atletas WHERE id = ?').get(aid);
              if (at) {
                ins.run(partida.id, at.equipe_id, at.id, at.numero, 'titular');
                db.prepare('UPDATE atletas SET ja_atuou = 1 WHERE id = ?').run(at.id);
              }
            }
            definirFlash(sessao, 'success', `Relação nominal salva (${ids.length} atletas marcados em súmula).`);
            return redirecionar(res, `/admin/partida/${partida.id}`);
          }
        }
      }

      // Equipes Admin
      if (pathname === '/admin/equipes' && req.method === 'GET') {
        const equipes = db.prepare(`
          SELECT e.*, (SELECT COUNT(*) FROM atletas a WHERE a.equipe_id = e.id AND a.status != 'inativo') AS total_atletas
          FROM equipes e
          WHERE e.campeonato_id = ? AND e.ativo = 1
          ORDER BY e.chave ASC, e.ordem_sorteio ASC, e.nome ASC
        `).all(campeonato.id);
        const editarId = Number(urlObj.searchParams.get('editar') || 0);
        const equipeEditando = equipes.find(e => e.id === editarId) || null;
        return enviarHtml(res, 200, adminPages.paginaEquipesAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          equipes,
          equipeEditando,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/equipes/salvar' && req.method === 'POST') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          const eqId = Number(campos.equipe_id || 0);
          let escudoUrl = null;
          if (arquivos.escudo && arquivos.escudo[0]) {
            escudoUrl = salvarArquivoUpload(arquivos.escudo[0], 'equipes', ['.png', '.jpg', '.jpeg', '.webp', '.svg']);
          }
          const janelaManual = campos.janela_aberta_manual === '1' ? 1 : (campos.janela_aberta_manual === '0' ? 0 : null);
          const cpfDir = limparCpf(campos.dirigente_cpf);

          if (eqId > 0) {
            const atual = db.prepare('SELECT * FROM equipes WHERE id = ? AND campeonato_id = ?').get(eqId, campeonato.id);
            if (atual) {
              const senhaHash = campos.nova_senha ? hashSenha(campos.nova_senha) : atual.dirigente_senha_hash;
              db.prepare(`
                UPDATE equipes
                SET nome = ?, sigla = ?, chave = ?, localidade = ?, dirigente_nome = ?, dirigente_cpf = ?,
                    dirigente_telefone = ?, dirigente_senha_hash = ?, janela_aberta_manual = ?, ordem_sorteio = ?, escudo_url = ?
                WHERE id = ?
              `).run(
                String(campos.nome || atual.nome).trim(),
                String(campos.sigla || atual.sigla).trim().toUpperCase(),
                String(campos.chave || atual.chave).trim().toUpperCase(),
                String(campos.localidade || atual.localidade).trim(),
                String(campos.dirigente_nome || '').trim(),
                cpfDir,
                String(campos.dirigente_telefone || '').trim(),
                senhaHash,
                janelaManual,
                Number(campos.ordem_sorteio || atual.ordem_sorteio || 1),
                escudoUrl || atual.escudo_url,
                atual.id
              );
              definirFlash(sessao, 'success', 'Equipe atualizada com sucesso!');
            }
          } else {
            db.prepare(`
              INSERT INTO equipes (campeonato_id, nome, sigla, chave, localidade, dirigente_nome, dirigente_cpf, dirigente_senha_hash, escudo_url)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              campeonato.id,
              String(campos.nome || '').trim(),
              String(campos.sigla || 'CLB').trim().toUpperCase(),
              String(campos.chave || 'A').trim().toUpperCase(),
              String(campos.localidade || 'Quiterianópolis - CE').trim(),
              String(campos.dirigente_nome || '').trim(),
              cpfDir,
              hashSenha(campos.nova_senha || 'equipe2026'),
              escudoUrl || ''
            );
            definirFlash(sessao, 'success', 'Nova equipe cadastrada na competição!');
          }
        }
        return redirecionar(res, '/admin/equipes');
      }

      // Atletas Admin
      if (pathname === '/admin/atletas' && req.method === 'GET') {
        const filtroEquipeId = urlObj.searchParams.get('equipe') || '';
        const equipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave, nome').all(campeonato.id);
        const atletas = filtroEquipeId
          ? db.prepare('SELECT a.*, e.nome AS equipe_nome FROM atletas a JOIN equipes e ON e.id = a.equipe_id WHERE a.campeonato_id = ? AND a.equipe_id = ? ORDER BY a.status ASC, a.nome ASC').all(campeonato.id, Number(filtroEquipeId))
          : db.prepare('SELECT a.*, e.nome AS equipe_nome FROM atletas a JOIN equipes e ON e.id = a.equipe_id WHERE a.campeonato_id = ? ORDER BY e.nome ASC, a.nome ASC').all(campeonato.id);

        return enviarHtml(res, 200, adminPages.paginaAtletasAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          atletas,
          equipes,
          filtroEquipeId,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/atletas/adicionar' && req.method === 'POST') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          let fotoUrl = '';
          if (arquivos.foto && arquivos.foto[0]) fotoUrl = salvarArquivoUpload(arquivos.foto[0], 'atletas');
          db.prepare(`
            INSERT INTO atletas (campeonato_id, equipe_id, nome, apelido, cpf, numero, posicao, origem, foto_url, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmado')
          `).run(
            campeonato.id,
            Number(campos.equipe_id),
            String(campos.nome || '').trim(),
            String(campos.apelido || '').trim(),
            limparCpf(campos.cpf),
            campos.numero ? Number(campos.numero) : null,
            String(campos.posicao || 'Meia'),
            campos.origem === 'fora' ? 'fora' : 'local',
            fotoUrl
          );
          definirFlash(sessao, 'success', 'Atleta inscrito e homologado com sucesso!');
        }
        return redirecionar(res, `/admin/atletas?equipe=${campos.equipe_id || ''}`);
      }

      if (pathname === '/admin/atletas/status' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('UPDATE atletas SET status = ? WHERE id = ? AND campeonato_id = ?')
            .run(String(campos.status || 'confirmado'), Number(campos.atleta_id), campeonato.id);
          definirFlash(sessao, 'success', 'Status do atleta atualizado!');
        }
        return redirecionar(res, '/admin/atletas');
      }

      if (pathname === '/admin/atletas/suspensao' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('UPDATE atletas SET suspenso_manual = CASE WHEN suspenso_manual = 1 THEN 0 ELSE 1 END WHERE id = ? AND campeonato_id = ?')
            .run(Number(campos.atleta_id), campeonato.id);
          definirFlash(sessao, 'info', 'Condição de suspensão manual alterada.');
        }
        return redirecionar(res, '/admin/atletas');
      }

      if (pathname === '/admin/atletas/excluir' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          const at = db.prepare('SELECT * FROM atletas WHERE id = ? AND campeonato_id = ?').get(Number(campos.atleta_id), campeonato.id);
          if (at) {
            if (at.ja_atuou) db.prepare("UPDATE atletas SET status = 'inativo' WHERE id = ?").run(at.id);
            else db.prepare('DELETE FROM atletas WHERE id = ?').run(at.id);
            definirFlash(sessao, 'info', 'Atleta inativado/excluído.');
          }
        }
        return redirecionar(res, '/admin/atletas');
      }

      // Galeria Admin
      if (pathname === '/admin/galeria' && req.method === 'GET') {
        const albuns = db.prepare(`
          SELECT a.*, (SELECT COUNT(*) FROM galeria_fotos f WHERE f.album_id = a.id) AS total_fotos
          FROM galeria_albuns a
          WHERE a.campeonato_id = ?
          ORDER BY a.id DESC
        `).all(campeonato.id);
        const partidas = db.prepare('SELECT id, numero_jogo, data_jogo FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id);
        return enviarHtml(res, 200, adminPages.paginaGaleriaAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          albuns,
          partidas,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/galeria/album' && req.method === 'POST') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          const fotos = arquivos.fotos || [];
          let capaUrl = '';
          const urlsSalvas = [];
          for (const arq of fotos) {
            const u = salvarArquivoUpload(arq, 'galeria');
            if (u) urlsSalvas.push(u);
          }
          if (urlsSalvas.length) capaUrl = urlsSalvas[0];

          const r = db.prepare('INSERT INTO galeria_albuns (campeonato_id, partida_id, titulo, descricao, capa_url) VALUES (?, ?, ?, ?, ?)')
            .run(campeonato.id, campos.partida_id ? Number(campos.partida_id) : null, String(campos.titulo || '').trim(), String(campos.descricao || '').trim(), capaUrl);
          const albumId = Number(r.lastInsertRowid);
          const insFoto = db.prepare('INSERT INTO galeria_fotos (album_id, arquivo_url, legenda) VALUES (?, ?, ?)');
          urlsSalvas.forEach(u => insFoto.run(albumId, u, String(campos.titulo || '').trim()));
          definirFlash(sessao, 'success', `Álbum criado com ${urlsSalvas.length} foto(s)!`);
        }
        return redirecionar(res, '/admin/galeria');
      }

      if (pathname === '/admin/galeria/fotos' && req.method === 'POST') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          const albumId = Number(campos.album_id);
          const fotos = arquivos.fotos || [];
          const insFoto = db.prepare('INSERT INTO galeria_fotos (album_id, arquivo_url, legenda) VALUES (?, ?, ?)');
          let primeira = '';
          let cont = 0;
          for (const arq of fotos) {
            const u = salvarArquivoUpload(arq, 'galeria');
            if (u) {
              if (!primeira) primeira = u;
              insFoto.run(albumId, u, String(campos.legenda || '').trim());
              cont++;
            }
          }
          if (primeira) {
            db.prepare("UPDATE galeria_albuns SET capa_url = CASE WHEN capa_url = '' OR capa_url IS NULL THEN ? ELSE capa_url END WHERE id = ?")
              .run(primeira, albumId);
          }
          definirFlash(sessao, 'success', `${cont} foto(s) adicionada(s) ao álbum!`);
        }
        return redirecionar(res, '/admin/galeria');
      }

      if (pathname === '/admin/galeria/excluir-album' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('DELETE FROM galeria_albuns WHERE id = ? AND campeonato_id = ?').run(Number(campos.album_id), campeonato.id);
          definirFlash(sessao, 'info', 'Álbum removido.');
        }
        return redirecionar(res, '/admin/galeria');
      }

      // Adiamentos Admin
      if (pathname === '/admin/adiamentos' && req.method === 'GET') {
        const adiamentos = db.prepare(`
          SELECT ad.*, p.numero_jogo, p.data_jogo, p.hora_jogo,
                 es.nome AS solicitante_nome, ea.nome AS adversario_nome
          FROM adiamentos ad
          JOIN partidas p ON p.id = ad.partida_id
          JOIN equipes es ON es.id = ad.equipe_solicitante_id
          LEFT JOIN equipes ea ON ea.id = ad.equipe_adversaria_id
          WHERE ad.campeonato_id = ?
          ORDER BY ad.id DESC
        `).all(campeonato.id);
        return enviarHtml(res, 200, adminPages.paginaAdiamentosAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          adiamentos,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/adiamentos/decidir' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          const ad = db.prepare('SELECT * FROM adiamentos WHERE id = ? AND campeonato_id = ?').get(Number(campos.adiamento_id), campeonato.id);
          if (ad) {
            const st = campos.status_comissao === 'deferido' ? 'deferido' : 'indeferido';
            db.prepare('UPDATE adiamentos SET status_comissao = ?, parecer_comissao = ? WHERE id = ?')
              .run(st, String(campos.parecer_comissao || '').trim(), ad.id);
            if (st === 'deferido' && campos.nova_data_jogo) {
              const nd = String(campos.nova_data_jogo).trim();
              const nh = String(campos.nova_hora_jogo || '17:00').trim();
              db.prepare('UPDATE partidas SET data_jogo = ?, hora_jogo = ?, data_iso = ? WHERE id = ?')
                .run(nd, nh, converterDataParaIso(nd, nh), ad.partida_id);
            }
            definirFlash(sessao, 'success', `Pedido de adiamento ${st} com sucesso.`);
          }
        }
        return redirecionar(res, '/admin/adiamentos');
      }

      // Documentos Admin
      if (pathname === '/admin/documentos' && req.method === 'GET') {
        const documentos = db.prepare('SELECT * FROM documentos_internos WHERE campeonato_id = ? ORDER BY id DESC').all(campeonato.id);
        const equipes = db.prepare('SELECT id, nome, chave FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave, nome').all(campeonato.id);
        const todasAss = db.prepare('SELECT da.* FROM documentos_assinaturas da JOIN documentos_internos di ON di.id = da.documento_id WHERE di.campeonato_id = ?').all(campeonato.id);
        const assinaturasPorDoc = {};
        for (const a of todasAss) {
          if (!assinaturasPorDoc[a.documento_id]) assinaturasPorDoc[a.documento_id] = {};
          assinaturasPorDoc[a.documento_id][a.equipe_id] = a;
        }
        return enviarHtml(res, 200, adminPages.paginaDocumentosAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          documentos,
          equipes,
          assinaturasPorDoc,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/documentos/criar' && req.method === 'POST') {
        const { campos, arquivos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          let pdfUrl = '';
          if (arquivos.arquivo_pdf && arquivos.arquivo_pdf[0]) {
            pdfUrl = salvarArquivoUpload(arquivos.arquivo_pdf[0], 'documentos', ['.pdf']);
          }
          db.prepare(`
            INSERT INTO documentos_internos (campeonato_id, titulo, tipo_origem, conteudo_texto, arquivo_pdf_url, exige_assinatura, chancela_secretario)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            campeonato.id,
            String(campos.titulo || '').trim(),
            pdfUrl ? 'pdf' : 'texto',
            String(campos.conteudo_texto || '').trim(),
            pdfUrl,
            campos.exige_assinatura === '1' ? 1 : 0,
            campos.chancela_secretario === '1' ? 1 : 0
          );
          definirFlash(sessao, 'success', 'Documento oficial publicado no painel das 12 equipes!');
        }
        return redirecionar(res, '/admin/documentos');
      }

      if (pathname === '/admin/documentos/excluir' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('DELETE FROM documentos_internos WHERE id = ? AND campeonato_id = ?').run(Number(campos.documento_id), campeonato.id);
          definirFlash(sessao, 'info', 'Documento excluído.');
        }
        return redirecionar(res, '/admin/documentos');
      }

      // Avaliações Admin
      if (pathname === '/admin/avaliacoes' && req.method === 'GET') {
        const avaliacoes = db.prepare('SELECT * FROM avaliacoes WHERE campeonato_id = ? ORDER BY id DESC').all(campeonato.id);
        return enviarHtml(res, 200, adminPages.paginaAvaliacoesAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          avaliacoes,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/avaliacoes/status' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('UPDATE avaliacoes SET status = ? WHERE id = ? AND campeonato_id = ?')
            .run(campos.status === 'aprovada' ? 'aprovada' : 'oculta', Number(campos.avaliacao_id), campeonato.id);
          definirFlash(sessao, 'success', 'Avaliação atualizada!');
        }
        return redirecionar(res, '/admin/avaliacoes');
      }

      if (pathname === '/admin/avaliacoes/excluir' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('DELETE FROM avaliacoes WHERE id = ? AND campeonato_id = ?').run(Number(campos.avaliacao_id), campeonato.id);
          definirFlash(sessao, 'info', 'Avaliação excluída.');
        }
        return redirecionar(res, '/admin/avaliacoes');
      }

      // Financeiro Admin
      if (pathname === '/admin/financeiro' && req.method === 'GET') {
        const lancamentos = db.prepare(`
          SELECT f.*, e.nome AS equipe_nome
          FROM financeiro_lancamentos f
          JOIN equipes e ON e.id = f.equipe_id
          WHERE f.campeonato_id = ?
          ORDER BY f.id DESC
        `).all(campeonato.id);
        const equipes = db.prepare('SELECT id, nome FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY nome').all(campeonato.id);
        return enviarHtml(res, 200, adminPages.paginaFinanceiroAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          lancamentos,
          equipes,
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/financeiro/adicionar' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare(`
            INSERT INTO financeiro_lancamentos (campeonato_id, equipe_id, tipo, valor, data_pagamento, status, observacao)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            campeonato.id,
            Number(campos.equipe_id),
            String(campos.tipo || 'incentivo'),
            Number(campos.valor || 0),
            String(campos.data_pagamento || ''),
            campos.status === 'pago' ? 'pago' : 'previsto',
            String(campos.observacao || '').trim()
          );
          definirFlash(sessao, 'success', 'Lançamento financeiro registrado!');
        }
        return redirecionar(res, '/admin/financeiro');
      }

      if (pathname === '/admin/financeiro/quitar' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare("UPDATE financeiro_lancamentos SET status = 'pago', data_pagamento = COALESCE(NULLIF(data_pagamento,''), date('now','localtime')) WHERE id = ? AND campeonato_id = ?")
            .run(Number(campos.lancamento_id), campeonato.id);
          definirFlash(sessao, 'success', 'Pagamento marcado como quitado!');
        }
        return redirecionar(res, '/admin/financeiro');
      }

      if (pathname === '/admin/financeiro/excluir' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare('DELETE FROM financeiro_lancamentos WHERE id = ? AND campeonato_id = ?').run(Number(campos.lancamento_id), campeonato.id);
          definirFlash(sessao, 'info', 'Lançamento removido.');
        }
        return redirecionar(res, '/admin/financeiro');
      }

      // Relatórios Admin
      if (pathname === '/admin/relatorios' && req.method === 'GET') {
        const equipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave, nome').all(campeonato.id);
        return enviarHtml(res, 200, adminPages.paginaRelatoriosAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          classificacao: calcularClassificacao(campeonato.id),
          estatisticas: obterEstatisticasAtletas(campeonato.id),
          equipes
        }));
      }

      // Configurações Admin
      if (pathname === '/admin/configuracoes' && req.method === 'GET') {
        return enviarHtml(res, 200, adminPages.paginaConfiguracoesAdmin({
          campeonato,
          todosCampeonatos,
          admin,
          flash: consumirFlash(sessao),
          csrfToken: sessao.csrfToken
        }));
      }

      if (pathname === '/admin/configuracoes/salvar' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          db.prepare(`
            UPDATE campeonatos
            SET nome = ?, nome_curto = ?, divisao_rotulo = ?, orgao = ?, secretario_nome = ?, estadio_padrao = ?,
                tempo_periodo_min = ?, vagas_fora_limite = ?, amarelos_suspensao = ?, bloqueio_horas_antes = ?,
                modo_quartas = ?, youtube_url = ?, exibir_premiacao = ?, premiacao_1 = ?, premiacao_2 = ?,
                premiacao_3 = ?, premiacao_4 = ?, incentivo_por_equipe = ?, modo_homologacao = ?, regulamento_texto = ?
            WHERE id = ?
          `).run(
            String(campos.nome || campeonato.nome).trim(),
            String(campos.nome_curto || campeonato.nome_curto).trim(),
            String(campos.divisao_rotulo || campeonato.divisao_rotulo).trim(),
            String(campos.orgao || campeonato.orgao).trim(),
            String(campos.secretario_nome || campeonato.secretario_nome).trim(),
            String(campos.estadio_padrao || campeonato.estadio_padrao).trim(),
            Number(campos.tempo_periodo_min || 40),
            Number(campos.vagas_fora_limite || 5),
            Number(campos.amarelos_suspensao || 3),
            Number(campos.bloqueio_horas_antes || 4),
            campos.modo_quartas === '2_por_chave' ? '2_por_chave' : 'geral_top8',
            String(campos.youtube_url || '').trim(),
            campos.exibir_premiacao === '1' ? 1 : 0,
            Number(campos.premiacao_1 || 0),
            Number(campos.premiacao_2 || 0),
            Number(campos.premiacao_3 || 0),
            Number(campos.premiacao_4 || 0),
            Number(campos.incentivo_por_equipe || 0),
            campos.modo_homologacao === '1' ? 1 : 0,
            String(campos.regulamento_texto || ''),
            campeonato.id
          );
          sincronizarTabelaCondicional(campeonato.id);
          definirFlash(sessao, 'success', 'Configurações gerais e regulamento salvos com sucesso!');
        }
        return redirecionar(res, '/admin/configuracoes');
      }

      if (pathname === '/admin/configuracoes/senha' && req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (validarCsrf(sessao, campos)) {
          if (!verificarSenha(campos.senha_atual, admin.senha_hash)) {
            definirFlash(sessao, 'error', 'Senha atual incorreta.');
          } else if (String(campos.nova_senha || '').length < 6) {
            definirFlash(sessao, 'error', 'A nova senha deve ter no mínimo 6 caracteres.');
          } else {
            db.prepare('UPDATE usuarios_admin SET senha_hash = ? WHERE id = ?').run(hashSenha(campos.nova_senha), admin.id);
            definirFlash(sessao, 'success', 'Senha administrativa atualizada!');
          }
        }
        return redirecionar(res, '/admin/configuracoes');
      }
    }

    // =========================================================================
    // 5. ROTAS PÚBLICAS DO PORTAL DO TORCEDOR
    // =========================================================================
    const { campeonato, campeonatosAtivos } = obterCampeonatoPublico(urlObj);
    if (!campeonato) {
      return enviarHtml(res, 500, '<h1>Campeonato não encontrado</h1>');
    }

    if (pathname === '/celular' && req.method === 'GET') {
      return enviarHtml(res, 200, paginaSimuladorMobile({
        campeonato,
        rotaInicial: urlObj.searchParams.get('rota') || '/',
        urlRedeLocal: obterUrlRedeLocal()
      }));
    }

    if (req.method === 'GET') {
      registrarVisitaQualificada(req, campeonato.id, pathname);
    }
    const totalVisitas = obterTotalVisitas(campeonato.id);
    const equipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave ASC, ordem_sorteio ASC, nome ASC').all(campeonato.id);

    if (pathname === '/' && req.method === 'GET') {
      const partidas = db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id);
      return enviarHtml(res, 200, publicPages.paginaInicial({
        campeonato,
        campeonatosAtivos,
        equipes,
        partidas,
        classificacao: calcularClassificacao(campeonato.id),
        estatisticas: obterEstatisticasAtletas(campeonato.id),
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/jogos' && req.method === 'GET') {
      const partidas = db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id);
      return enviarHtml(res, 200, publicPages.paginaJogos({
        campeonato,
        campeonatosAtivos,
        equipes,
        partidas,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    const matchJogoPub = pathname.match(/^\/jogo\/(\d+)$/);
    if (matchJogoPub && req.method === 'GET') {
      const partida = db.prepare('SELECT * FROM partidas WHERE id = ?').get(Number(matchJogoPub[1]));
      if (!partida) return redirecionar(res, '/jogos');
      const campJogo = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(partida.campeonato_id) || campeonato;
      const eqsJogo = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ?').all(campJogo.id);

      const eventos = db.prepare(`
        SELECT ev.*, e.nome AS equipe_nome,
               COALESCE(a.apelido, a.nome) AS atleta_nome,
               COALESCE(a2.apelido, a2.nome) AS atleta_sec_nome
        FROM eventos_partida ev
        LEFT JOIN equipes e ON e.id = ev.equipe_id
        LEFT JOIN atletas a ON a.id = ev.atleta_id
        LEFT JOIN atletas a2 ON a2.id = ev.atleta_secundario_id
        WHERE ev.partida_id = ?
        ORDER BY ev.id ASC
      `).all(partida.id);

      const relacionados = db.prepare(`
        SELECT pr.*, a.nome, a.apelido, a.numero
        FROM partida_relacionados pr
        JOIN atletas a ON a.id = pr.atleta_id
        WHERE pr.partida_id = ?
        ORDER BY pr.condicao DESC, pr.numero_camisa ASC, a.nome ASC
      `).all(partida.id);

      const comissaoMandante = partida.mandante_id ? db.prepare('SELECT * FROM comissao_tecnica WHERE equipe_id = ? AND ativo = 1').all(partida.mandante_id) : [];
      const comissaoVisitante = partida.visitante_id ? db.prepare('SELECT * FROM comissao_tecnica WHERE equipe_id = ? AND ativo = 1').all(partida.visitante_id) : [];
      const craque = partida.craque_atleta_id
        ? db.prepare('SELECT a.*, e.nome AS equipe_nome FROM atletas a JOIN equipes e ON e.id = a.equipe_id WHERE a.id = ?').get(partida.craque_atleta_id)
        : null;

      return enviarHtml(res, 200, publicPages.paginaDetalheJogo({
        campeonato: campJogo,
        campeonatosAtivos,
        equipes: eqsJogo,
        partida,
        eventos,
        relacionados,
        comissaoMandante,
        comissaoVisitante,
        craque,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/classificacao' && req.method === 'GET') {
      return enviarHtml(res, 200, publicPages.paginaClassificacao({
        campeonato,
        campeonatosAtivos,
        classificacao: calcularClassificacao(campeonato.id),
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/chaveamento' && req.method === 'GET') {
      const partidas = db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id);
      return enviarHtml(res, 200, publicPages.paginaChaveamento({
        campeonato,
        campeonatosAtivos,
        equipes,
        partidas,
        obterVencedorPerdedorPartida,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/artilharia' && req.method === 'GET') {
      return enviarHtml(res, 200, publicPages.paginaArtilharia({
        campeonato,
        campeonatosAtivos,
        estatisticas: obterEstatisticasAtletas(campeonato.id),
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/equipes' && req.method === 'GET') {
      return enviarHtml(res, 200, publicPages.paginaEquipes({
        campeonato,
        campeonatosAtivos,
        equipes,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    const matchEquipePub = pathname.match(/^\/equipe\/(\d+)$/);
    if (matchEquipePub && req.method === 'GET') {
      const equipe = db.prepare('SELECT * FROM equipes WHERE id = ? AND ativo = 1').get(Number(matchEquipePub[1]));
      if (!equipe) return redirecionar(res, '/equipes');
      const campEq = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(equipe.campeonato_id) || campeonato;
      const eqsCamp = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1').all(campEq.id);
      const comissao = db.prepare('SELECT * FROM comissao_tecnica WHERE equipe_id = ? AND ativo = 1').all(equipe.id);

      const todosAtletas = db.prepare(`
        SELECT a.*,
          (SELECT COUNT(*) FROM eventos_partida ev WHERE ev.atleta_id = a.id AND ev.tipo = 'gol') AS gols,
          (SELECT COUNT(*) FROM eventos_partida ev WHERE ev.atleta_secundario_id = a.id AND ev.tipo = 'gol') AS assistencias
        FROM atletas a
        WHERE a.equipe_id = ?
        ORDER BY a.numero ASC, a.nome ASC
      `).all(equipe.id);

      const atletasAtivos = todosAtletas.filter(a => a.status === 'confirmado');
      const atletasHistorico = todosAtletas.filter(a => a.status === 'inativo' && a.ja_atuou);

      const jogosEquipe = db.prepare(`
        SELECT * FROM partidas
        WHERE campeonato_id = ? AND (mandante_id = ? OR visitante_id = ?)
        ORDER BY numero_jogo ASC
      `).all(campEq.id, equipe.id, equipe.id);

      const classif = calcularClassificacao(campEq.id);
      const itemClassif = (classif.chaves[equipe.chave] || []).find(i => i.id === equipe.id) || null;

      return enviarHtml(res, 200, publicPages.paginaDetalheEquipe({
        campeonato: campEq,
        campeonatosAtivos,
        equipes: eqsCamp,
        equipe,
        comissao,
        atletasAtivos,
        atletasHistorico,
        jogosEquipe,
        itemClassif,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/sumulas' && req.method === 'GET') {
      const partidas = db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id);
      return enviarHtml(res, 200, publicPages.paginaSumulas({
        campeonato,
        campeonatosAtivos,
        equipes,
        partidas,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    const matchSumula = pathname.match(/^\/sumula\/(\d+)$/);
    if (matchSumula && req.method === 'GET') {
      const partida = db.prepare('SELECT * FROM partidas WHERE id = ?').get(Number(matchSumula[1]));
      if (!partida) return redirecionar(res, '/sumulas');
      const campSum = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(partida.campeonato_id) || campeonato;
      const mandante = partida.mandante_id ? db.prepare('SELECT * FROM equipes WHERE id = ?').get(partida.mandante_id) : null;
      const visitante = partida.visitante_id ? db.prepare('SELECT * FROM equipes WHERE id = ?').get(partida.visitante_id) : null;

      const atletasMandante = partida.mandante_id
        ? db.prepare("SELECT * FROM atletas WHERE equipe_id = ? AND status = 'confirmado' ORDER BY numero ASC, nome ASC").all(partida.mandante_id)
        : [];
      const atletasVisitante = partida.visitante_id
        ? db.prepare("SELECT * FROM atletas WHERE equipe_id = ? AND status = 'confirmado' ORDER BY numero ASC, nome ASC").all(partida.visitante_id)
        : [];

      const eventos = db.prepare(`
        SELECT ev.*, e.nome AS equipe_nome, COALESCE(a.apelido, a.nome) AS atleta_nome
        FROM eventos_partida ev
        LEFT JOIN equipes e ON e.id = ev.equipe_id
        LEFT JOIN atletas a ON a.id = ev.atleta_id
        WHERE ev.partida_id = ?
        ORDER BY ev.id ASC
      `).all(partida.id);

      return enviarHtml(res, 200, publicPages.paginaImprimirSumula({
        campeonato: campSum,
        partida,
        mandante,
        visitante,
        eventos,
        atletasMandante,
        atletasVisitante,
        emBranco: urlObj.searchParams.get('em_branco') === '1'
      }));
    }

    if (pathname === '/galeria' && req.method === 'GET') {
      const albuns = db.prepare(`
        SELECT a.*, (SELECT COUNT(*) FROM galeria_fotos f WHERE f.album_id = a.id) AS total_fotos
        FROM galeria_albuns a
        WHERE a.campeonato_id = ? AND a.publicado = 1
        ORDER BY a.id DESC
      `).all(campeonato.id);

      const albumId = Number(urlObj.searchParams.get('album') || 0);
      const albumSelecionado = albumId ? albuns.find(a => a.id === albumId) || null : null;
      const fotosAlbum = albumSelecionado
        ? db.prepare('SELECT * FROM galeria_fotos WHERE album_id = ? ORDER BY ordem ASC, id ASC').all(albumSelecionado.id)
        : [];

      return enviarHtml(res, 200, publicPages.paginaGaleria({
        campeonato,
        campeonatosAtivos,
        albuns,
        albumSelecionado,
        fotosAlbum,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/regulamento' && req.method === 'GET') {
      return enviarHtml(res, 200, publicPages.paginaRegulamento({
        campeonato,
        campeonatosAtivos,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/avaliacoes') {
      if (req.method === 'POST') {
        const { campos } = await lerCorpoFormulario(req);
        if (!validarCsrf(sessao, campos) || campos.website) {
          return redirecionar(res, '/avaliacoes');
        }
        const esperado = sessao.desafioSoma ? (sessao.desafioSoma.a + sessao.desafioSoma.b) : -1;
        if (Number(campos.desafio_resposta) !== esperado) {
          definirFlash(sessao, 'error', 'Resposta da soma anti-spam incorreta. Tente novamente.');
          return redirecionar(res, '/avaliacoes');
        }
        const nota = Math.max(0, Math.min(10, Number(campos.nota ?? 10)));
        const nome = String(campos.nome || '').trim() || 'Torcedor de Quiterianópolis';
        const comentario = String(campos.comentario || '').trim();
        if (comentario.length < 5) {
          definirFlash(sessao, 'error', 'Escreva um comentário com pelo menos 5 caracteres.');
          return redirecionar(res, '/avaliacoes');
        }
        db.prepare('INSERT INTO avaliacoes (campeonato_id, nome, nota, comentario, status) VALUES (?, ?, ?, ?, ?)')
          .run(campeonato.id, nome.slice(0, 60), nota, comentario.slice(0, 800), 'pendente');
        definirFlash(sessao, 'success', 'Obrigado! Sua avaliação foi enviada e será publicada após moderação da Comissão.');
        return redirecionar(res, '/avaliacoes');
      }

      const avaliacoes = db.prepare("SELECT * FROM avaliacoes WHERE campeonato_id = ? AND status = 'aprovada' ORDER BY id DESC").all(campeonato.id);
      const distribuicao = {};
      let soma = 0;
      for (const av of avaliacoes) {
        distribuicao[av.nota] = (distribuicao[av.nota] || 0) + 1;
        soma += Number(av.nota);
      }
      const mediaNota = avaliacoes.length ? (soma / avaliacoes.length).toFixed(1).replace('.', ',') : '10,0';
      sessao.desafioSoma = {
        a: Math.floor(Math.random() * 8) + 2,
        b: Math.floor(Math.random() * 7) + 1
      };

      return enviarHtml(res, 200, publicPages.paginaAvaliacoes({
        campeonato,
        campeonatosAtivos,
        avaliacoes,
        mediaNota,
        distribuicao,
        desafioSoma: sessao.desafioSoma,
        csrfToken: sessao.csrfToken,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    if (pathname === '/ajuda' && req.method === 'GET') {
      const faqs = db.prepare('SELECT * FROM faq_itens WHERE campeonato_id = ? ORDER BY ordem ASC, id ASC').all(campeonato.id);
      return enviarHtml(res, 200, publicPages.paginaAjuda({
        campeonato,
        campeonatosAtivos,
        faqs,
        totalVisitas,
        flash: consumirFlash(sessao)
      }));
    }

    // 404 amigável
    return enviarHtml(res, 404, publicPages.paginaInicial({
      campeonato,
      campeonatosAtivos,
      equipes,
      partidas: db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonato.id),
      classificacao: calcularClassificacao(campeonato.id),
      estatisticas: obterEstatisticasAtletas(campeonato.id),
      totalVisitas,
      flash: { tipo: 'warning', mensagem: 'Página não encontrada — redirecionado para a página inicial.' }
    }));
  } catch (erro) {
    console.error('Erro na requisição:', erro);
    return enviarHtml(res, 500, `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Erro Interno</title><link rel="stylesheet" href="/assets/css/app.css"></head><body style="padding:30px"><div class="container card"><h2>Ops! Ocorreu um erro ao processar sua solicitação</h2><p class="muted">${String(erro.message || erro)}</p><a class="btn btn-primary" href="/">Voltar ao Início</a></div></body></html>`);
  }
});

try {
  sincronizarTabelaCondicional(1);
} catch (_) {}

server.listen(PORT, () => {
  console.log(`✅ Portal Oficial Campeonato Quiterianopolense 2026 rodando em http://127.0.0.1:${PORT} e http://localhost:${PORT}`);
});
