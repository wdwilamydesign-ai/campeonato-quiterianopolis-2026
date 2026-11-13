'use strict';

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const SEED_DB = path.join(__dirname, '..', 'data', 'campeonato_quiterianopolis.sqlite');
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'campeonato_quiterianopolis.sqlite');
if (!fs.existsSync(DB_PATH) && fs.existsSync(SEED_DB) && path.resolve(DB_PATH) !== path.resolve(SEED_DB)) {
  try {
    fs.copyFileSync(SEED_DB, DB_PATH);
  } catch (e) {
    console.error('Aviso ao copiar banco seed:', e);
  }
}
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(senha), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verificarSenha(senha, armazenado) {
  if (!armazenado || !armazenado.includes(':')) return false;
  const [salt, hashHex] = armazenado.split(':');
  const tentativa = crypto.scryptSync(String(senha), salt, 64);
  const original = Buffer.from(hashHex, 'hex');
  if (tentativa.length !== original.length) return false;
  return crypto.timingSafeEqual(tentativa, original);
}

function limparCpf(cpf) {
  return String(cpf || '').replace(/\D/g, '').slice(0, 11);
}

function formatarCpf(cpf) {
  const d = limparCpf(cpf);
  if (d.length !== 11) return cpf || '';
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function inicializarBanco() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS campeonatos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      nome_curto TEXT NOT NULL,
      subtitulo TEXT NOT NULL,
      divisao_rotulo TEXT NOT NULL DEFAULT 'Divisão Principal',
      ano INTEGER NOT NULL DEFAULT 2026,
      cidade TEXT NOT NULL DEFAULT 'Quiterianópolis - CE',
      orgao TEXT NOT NULL DEFAULT 'Prefeitura Municipal de Quiterianópolis • Secretaria de Esportes',
      slogan_orgao TEXT NOT NULL DEFAULT 'Avançando juntos, cuidando de todos.',
      endereco_orgao TEXT NOT NULL DEFAULT 'Rua Maria Francisca de Sousa – Cidade Nova – Quiterianópolis – CE, CEP: 63650-000 • CNPJ: 07.551.179/0001-14',
      secretario_nome TEXT NOT NULL DEFAULT 'Raimundo Coutinho de Sousa',
      estadio_padrao TEXT NOT NULL DEFAULT 'Estádio Tualdão',
      data_abertura TEXT NOT NULL DEFAULT '07/11/2026',
      data_final TEXT NOT NULL DEFAULT '30/12/2026',
      tempo_periodo_min INTEGER NOT NULL DEFAULT 40,
      vagas_fora_limite INTEGER NOT NULL DEFAULT 5,
      elenco_max INTEGER NOT NULL DEFAULT 25,
      comissao_max INTEGER NOT NULL DEFAULT 3,
      amarelos_suspensao INTEGER NOT NULL DEFAULT 3,
      bloqueio_horas_antes INTEGER NOT NULL DEFAULT 4,
      modo_quartas TEXT NOT NULL DEFAULT 'geral_top8',
      youtube_url TEXT DEFAULT 'https://www.youtube.com/@SeeLigaaTV',
      exibir_premiacao INTEGER NOT NULL DEFAULT 1,
      incentivo_por_equipe REAL NOT NULL DEFAULT 0,
      premiacao_1 REAL NOT NULL DEFAULT 10000,
      premiacao_2 REAL NOT NULL DEFAULT 5000,
      premiacao_3 REAL NOT NULL DEFAULT 2500,
      premiacao_4 REAL NOT NULL DEFAULT 1500,
      modo_homologacao INTEGER NOT NULL DEFAULT 0,
      campeao_equipe_id INTEGER DEFAULT NULL,
      vice_equipe_id INTEGER DEFAULT NULL,
      regulamento_texto TEXT NOT NULL DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS usuarios_admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT NOT NULL UNIQUE,
      cargo TEXT NOT NULL DEFAULT 'Comissão Organizadora',
      senha_hash TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS equipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      sigla TEXT NOT NULL,
      localidade TEXT NOT NULL DEFAULT 'Quiterianópolis',
      chave TEXT NOT NULL DEFAULT 'A',
      escudo_url TEXT DEFAULT '',
      cor_primaria TEXT NOT NULL DEFAULT '#06286E',
      uniforme_descricao TEXT DEFAULT '',
      uniforme_foto_url TEXT DEFAULT '',
      dirigente_nome TEXT DEFAULT '',
      dirigente_cpf TEXT DEFAULT '',
      dirigente_telefone TEXT DEFAULT '',
      dirigente_senha_hash TEXT DEFAULT '',
      janela_aberta_manual INTEGER DEFAULT NULL,
      ordem_sorteio INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS atletas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      apelido TEXT DEFAULT '',
      cpf TEXT NOT NULL,
      data_nascimento TEXT DEFAULT '',
      naturalidade TEXT DEFAULT 'Quiterianópolis - CE',
      menor_idade INTEGER NOT NULL DEFAULT 0,
      termo_menor_validado INTEGER NOT NULL DEFAULT 0,
      posicao TEXT NOT NULL DEFAULT 'Meia',
      numero INTEGER DEFAULT NULL,
      origem TEXT NOT NULL DEFAULT 'local',
      criterio_local TEXT DEFAULT 'natural',
      titulo_eleitor TEXT DEFAULT '',
      comprovante_residencia_tipo TEXT DEFAULT '',
      vaga_fora_num INTEGER DEFAULT NULL,
      foto_url TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmado',
      ja_atuou INTEGER NOT NULL DEFAULT 0,
      suspenso_manual INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS comissao_tecnica (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      cpf TEXT DEFAULT '',
      funcao TEXT NOT NULL DEFAULT 'Técnico',
      ativo INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS partidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      numero_jogo INTEGER NOT NULL,
      fase TEXT NOT NULL DEFAULT 'grupos',
      titulo_fase TEXT NOT NULL DEFAULT 'Fase de Grupos',
      rodada_rotulo TEXT DEFAULT '',
      chave TEXT DEFAULT '',
      data_jogo TEXT NOT NULL,
      hora_jogo TEXT NOT NULL,
      data_iso TEXT NOT NULL,
      local TEXT NOT NULL DEFAULT 'Estádio Tualdão',
      mandante_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
      visitante_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
      mandante_placeholder TEXT DEFAULT '',
      visitante_placeholder TEXT DEFAULT '',
      origem_mandante_tipo TEXT DEFAULT '',
      origem_mandante_ref INTEGER DEFAULT NULL,
      origem_visitante_tipo TEXT DEFAULT '',
      origem_visitante_ref INTEGER DEFAULT NULL,
      gols_mandante INTEGER DEFAULT NULL,
      gols_visitante INTEGER DEFAULT NULL,
      penaltis_mandante INTEGER DEFAULT NULL,
      penaltis_visitante INTEGER DEFAULT NULL,
      vencedor_definido_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'agendada',
      periodo_atual TEXT NOT NULL DEFAULT 'PRE',
      cronometro_segundos_base INTEGER NOT NULL DEFAULT 0,
      cronometro_rodando INTEGER NOT NULL DEFAULT 0,
      cronometro_iniciado_em INTEGER DEFAULT NULL,
      acrescimos_min INTEGER NOT NULL DEFAULT 0,
      arbitro_principal TEXT DEFAULT '',
      assistente_1 TEXT DEFAULT '',
      assistente_2 TEXT DEFAULT '',
      quarto_arbitro TEXT DEFAULT '',
      mesario TEXT DEFAULT '',
      craque_atleta_id INTEGER REFERENCES atletas(id) ON DELETE SET NULL,
      sumula_pdf_url TEXT DEFAULT '',
      sumula_publicada_em TEXT DEFAULT '',
      observacoes_sumula TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS partida_relacionados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partida_id INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
      equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
      atleta_id INTEGER NOT NULL REFERENCES atletas(id) ON DELETE CASCADE,
      numero_camisa INTEGER DEFAULT NULL,
      condicao TEXT NOT NULL DEFAULT 'titular',
      UNIQUE(partida_id, atleta_id)
    );

    CREATE TABLE IF NOT EXISTS eventos_partida (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      partida_id INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
      equipe_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
      atleta_id INTEGER REFERENCES atletas(id) ON DELETE SET NULL,
      atleta_secundario_id INTEGER REFERENCES atletas(id) ON DELETE SET NULL,
      tipo TEXT NOT NULL,
      periodo TEXT NOT NULL DEFAULT '1T',
      minuto TEXT DEFAULT '',
      observacao TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS galeria_albuns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      partida_id INTEGER REFERENCES partidas(id) ON DELETE SET NULL,
      titulo TEXT NOT NULL,
      descricao TEXT DEFAULT '',
      capa_url TEXT DEFAULT '',
      publicado INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS galeria_fotos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      album_id INTEGER NOT NULL REFERENCES galeria_albuns(id) ON DELETE CASCADE,
      arquivo_url TEXT NOT NULL,
      legenda TEXT DEFAULT '',
      ordem INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS avaliacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      nome TEXT NOT NULL DEFAULT 'Torcedor',
      nota INTEGER NOT NULL,
      comentario TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      navegador_hash TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS adiamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      partida_id INTEGER NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
      equipe_solicitante_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
      equipe_adversaria_id INTEGER REFERENCES equipes(id) ON DELETE SET NULL,
      motivo TEXT NOT NULL,
      nova_data_sugerida TEXT DEFAULT '',
      status_adversario TEXT NOT NULL DEFAULT 'aguardando',
      manifestacao_adversario TEXT DEFAULT '',
      status_comissao TEXT NOT NULL DEFAULT 'pendente',
      parecer_comissao TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS documentos_internos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      tipo_origem TEXT NOT NULL DEFAULT 'texto',
      conteudo_texto TEXT DEFAULT '',
      arquivo_pdf_url TEXT DEFAULT '',
      exige_assinatura INTEGER NOT NULL DEFAULT 1,
      chancela_secretario INTEGER NOT NULL DEFAULT 1,
      publicado INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS documentos_assinaturas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      documento_id INTEGER NOT NULL REFERENCES documentos_internos(id) ON DELETE CASCADE,
      equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
      dirigente_nome TEXT NOT NULL,
      dirigente_cpf TEXT NOT NULL,
      ip TEXT DEFAULT '',
      assinado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(documento_id, equipe_id)
    );

    CREATE TABLE IF NOT EXISTS financeiro_lancamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      equipe_id INTEGER NOT NULL REFERENCES equipes(id) ON DELETE CASCADE,
      tipo TEXT NOT NULL DEFAULT 'incentivo',
      valor REAL NOT NULL DEFAULT 0,
      data_pagamento TEXT DEFAULT '',
      referencia TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'previsto',
      observacao TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS faq_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL REFERENCES campeonatos(id) ON DELETE CASCADE,
      categoria TEXT NOT NULL DEFAULT 'geral',
      pergunta TEXT NOT NULL,
      resposta TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS visitas_portal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campeonato_id INTEGER NOT NULL DEFAULT 1,
      visitante_hash TEXT NOT NULL,
      pagina TEXT NOT NULL DEFAULT '/',
      data_dia TEXT NOT NULL DEFAULT (date('now', 'localtime')),
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(visitante_hash, data_dia)
    );

    CREATE TABLE IF NOT EXISTS auditoria_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      perfil TEXT NOT NULL,
      usuario_nome TEXT NOT NULL,
      cpf TEXT DEFAULT '',
      equipe_id INTEGER DEFAULT NULL,
      acao TEXT NOT NULL,
      detalhes TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      criado_em TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  popularDadosIniciais();

  // Garantir restauração de partidas já realizadas caso ainda constem como agendadas
  try {
    const p1 = db.prepare('SELECT status, gols_mandante, gols_visitante, vencedor_definido_id FROM partidas WHERE numero_jogo = 1').get();
    if (p1 && p1.status === 'agendada' && p1.gols_mandante === null) {
      db.prepare(`
        UPDATE partidas
        SET status = 'encerrada', gols_mandante = 1, gols_visitante = 1, cronometro_rodando = 0
        WHERE numero_jogo = 1
      `).run();
    }
    const p2 = db.prepare('SELECT status, gols_mandante, gols_visitante, vencedor_definido_id FROM partidas WHERE numero_jogo = 2').get();
    if (p2 && p2.status === 'agendada' && p2.gols_mandante === null) {
      const roque = db.prepare('SELECT id FROM equipes WHERE nome LIKE "%Roque%" LIMIT 1').get();
      db.prepare(`
        UPDATE partidas
        SET status = 'encerrada', gols_mandante = 3, gols_visitante = 1, vencedor_definido_id = ?, cronometro_rodando = 0
        WHERE numero_jogo = 2
      `).run(roque ? roque.id : 1);
    }

    // Garantir Super Administrador Oficial com Acesso Total
    const cpfMaster = '06104415318';
    const adminMaster = db.prepare('SELECT id FROM usuarios_admin WHERE cpf = ?').get(cpfMaster);
    if (!adminMaster) {
      db.prepare(`
        INSERT INTO usuarios_admin (nome, cpf, cargo, senha_hash, ativo)
        VALUES (?, ?, ?, ?, 1)
      `).run(
        'Administrador Geral',
        cpfMaster,
        'Super Administrador / Acesso Total',
        hashSenha('7kqqukGT@')
      );
    }
  } catch (err) {
    console.error('Aviso ao sincronizar dados iniciais:', err);
  }
}

function popularDadosIniciais() {
  const existeCamp = db.prepare('SELECT COUNT(*) AS total FROM campeonatos').get();
  if (existeCamp.total > 0) return;

  const regulamentoPadrao = `REGULAMENTO GERAL — CAMPEONATO MUNICIPAL DE FUTEBOL DE QUITERIANÓPOLIS – 2026

CAPÍTULO I — DA ORGANIZAÇÃO E FINALIDADE
Art. 1º O Campeonato Municipal de Futebol de Quiterianópolis – 2026 (Campeonato Quiterianopolense de Futebol) é promovido pela Prefeitura Municipal de Quiterianópolis, por intermédio da Secretaria Municipal de Esportes, sob coordenação da Comissão Organizadora, visando incentivar o esporte, a integração comunitária, a disciplina e o jogo limpo.
Art. 2º Todas as partidas oficiais serão disputadas no Estádio Municipal Tualdão, conforme tabela oficial homologada pela Secretaria de Esportes em 14 de outubro de 2026, assinada pelo Secretário de Esportes Raimundo Coutinho de Sousa.

CAPÍTULO II — DAS EQUIPES E FÓRMULA DE DISPUTA
Art. 3º A competição conta com 12 (doze) equipes divididas em 4 (quatro) chaves de 3 (três) clubes cada:
• CHAVE A: Roque Clube, Sítio e Catras;
• CHAVE B: Santa Maria, Jardim e Baixio;
• CHAVE C: São Miguel, Cealeza e CQ Quiterianópolis;
• CHAVE D: Besouro, Os Feras e Caeiras.
Art. 4º Na Fase Classificatória (Jogos 01 a 12), cada chave disputa um triangular dinâmico em que cada equipe realiza 2 (duas) partidas:
I — Rodada inaugural da chave (Jogos 01 a 04): confronto entre as duas primeiras equipes sorteadas da chave;
II — Segunda rodada da chave (Jogos 05 a 08): a terceira equipe da chave enfrenta o VENCEDOR do jogo inaugural da respectiva chave;
III — Terceira rodada da chave (Jogos 09 a 12): a terceira equipe da chave enfrenta o PERDEDOR do jogo inaugural da respectiva chave.
Parágrafo único. Em caso de empate na partida inaugural da chave (Jogos 01 a 04), a pontuação na tabela permanece de 1 (um) ponto para cada clube, definindo-se apenas a ordem de enfrentamento dos Jogos 05 a 12 conforme critério oficial registrado pela Comissão Organizadora na súmula da partida.

CAPÍTULO III — DA PONTUAÇÃO E CLASSIFICAÇÃO ÀS QUARTAS DE FINAL
Art. 5º A pontuação na fase classificatória segue o padrão oficial: Vitória = 3 pontos; Empate = 1 ponto; Derrota = 0 ponto.
Art. 6º Encerrados os 12 jogos da primeira fase, avançam às Quartas de Final 8 (oito) equipes ordenadas pela Classificação Geral (1º ao 8º Geral), observando-se os seguintes critérios de desempate:
I — Maior número de vitórias;
II — Maior saldo de gols;
III — Maior número de gols marcados;
IV — Menor número de cartões vermelhos;
V — Menor número de cartões amarelos;
VI — Sorteio oficial pela Comissão Organizadora.

CAPÍTULO IV — DAS FASES ELIMINATÓRIAS (MATA-MATA)
Art. 7º As Quartas de Final serão disputadas em partida única no Estádio Tualdão nos dias 12 e 13 de dezembro de 2026:
• Jogo 13 (12/12 – 17:00): 1º Geral × 8º Geral;
• Jogo 14 (12/12 – 18:45): 2º Geral × 7º Geral;
• Jogo 15 (13/12 – 17:00): 3º Geral × 6º Geral;
• Jogo 16 (13/12 – 18:45): 4º Geral × 5º Geral.
Art. 8º As Semifinais serão disputadas em partida única:
• Jogo 17 – Semifinal 01 (19/12 – 18:30): Vencedor do Jogo 13 × Vencedor do Jogo 16;
• Jogo 18 – Semifinal 02 (22/12 – 19:15): Vencedor do Jogo 14 × Vencedor do Jogo 15.
Art. 9º A Grande Final (Jogo 19) será realizada em 30 de dezembro de 2026, às 18:30, no Estádio Tualdão, entre Vencedor do Jogo 17 × Vencedor do Jogo 18. Persistindo empate no tempo normal em qualquer fase eliminatória, a vaga ou título será decidido em cobranças de pênaltis.

CAPÍTULO V — DAS INSCRIÇÕES, COMISSÃO TÉCNICA, CARTÕES E SÚMULAS
Art. 10. Cada equipe terá acesso individual na Área da Equipe por CPF e senha do representante cadastrado, podendo inscrever seu elenco, até 3 integrantes da comissão técnica e informar o uniforme dentro da janela operacional antes da partida.
Art. 11. O atleta punido com 3 (três) cartões amarelos ou 1 (um) cartão vermelho cumprirá suspensão automática na partida subsequente de sua equipe.
Art. 12. As súmulas oficiais, ocorrências, estatísticas de gols, assistências e cartões serão registradas pela Comissão Organizadora e publicadas no Portal Oficial da Secretaria de Esportes.`;

  const insCamp = db.prepare(`
    INSERT INTO campeonatos (
      nome, nome_curto, subtitulo, divisao_rotulo, ano, cidade, orgao, slogan_orgao,
      endereco_orgao, secretario_nome, estadio_padrao, data_abertura, data_final,
      tempo_periodo_min, vagas_fora_limite, elenco_max, comissao_max, amarelos_suspensao,
      bloqueio_horas_antes, modo_quartas, youtube_url, exibir_premiacao,
      incentivo_por_equipe, premiacao_1, premiacao_2, premiacao_3, premiacao_4,
      regulamento_texto
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const resCamp = insCamp.run(
    'Campeonato Municipal de Futebol de Quiterianópolis – 2026',
    'Campeonato Municipal Quiterianópolis 2026',
    'Portal Oficial • Secretaria Municipal de Esportes',
    'Edição Oficial 2026',
    2026,
    'Quiterianópolis - CE',
    'Prefeitura Municipal de Quiterianópolis • Secretaria de Esportes',
    'Avançando juntos, cuidando de todos.',
    'Rua Maria Francisca de Sousa – Cidade Nova – Quiterianópolis – CE • CEP: 63650-000 • CNPJ: 07.551.179/0001-14',
    'Raimundo Coutinho de Sousa',
    'Estádio Tualdão',
    '07/11/2026',
    '30/12/2026',
    40,
    5,
    25,
    3,
    3,
    4,
    'geral_top8',
    'https://www.youtube.com/@SeeLigaaTV',
    0,
    0,
    10000,
    5000,
    2500,
    1500,
    regulamentoPadrao
  );
  const campId = Number(resCamp.lastInsertRowid);

  // Admin padrão
  db.prepare(`
    INSERT INTO usuarios_admin (nome, cpf, cargo, senha_hash)
    VALUES (?, ?, ?, ?)
  `).run(
    'Raimundo Coutinho de Sousa',
    '00000000000',
    'Secretário de Esportes / Comissão Organizadora',
    hashSenha('admin2026')
  );

  // 12 Equipes oficiais extraídas da Tabela e Arte Oficial
  const clubes = [
    // Chave A
    { nome: 'Roque Clube', sigla: 'ROQ', chave: 'A', localidade: 'Quiterianópolis', escudo: '/assets/uploads/equipes/roque-clube.png', cpf: '11111111101' },
    { nome: 'Sítio', sigla: 'SIT', chave: 'A', localidade: 'Sítio', escudo: '/assets/uploads/equipes/sitio.png', cpf: '11111111102' },
    { nome: 'Catras', sigla: 'CAT', chave: 'A', localidade: 'Quiterianópolis', escudo: '/assets/uploads/equipes/catras.png', cpf: '11111111103' },
    // Chave B
    { nome: 'Santa Maria', sigla: 'STM', chave: 'B', localidade: 'Santa Maria', escudo: '/assets/uploads/equipes/santa-maria.png', cpf: '11111111104' },
    { nome: 'Jardim', sigla: 'JAR', chave: 'B', localidade: 'Jardim', escudo: '/assets/uploads/equipes/jardim.png', cpf: '11111111105' },
    { nome: 'Baixio', sigla: 'BAI', chave: 'B', localidade: 'Baixio', escudo: '/assets/uploads/equipes/baixio.png', cpf: '11111111106' },
    // Chave C
    { nome: 'São Miguel', sigla: 'SMG', chave: 'C', localidade: 'São Miguel', escudo: '/assets/uploads/equipes/sao-miguel.png', cpf: '11111111107' },
    { nome: 'Cealeza', sigla: 'CEA', chave: 'C', localidade: 'Sede', escudo: '/assets/uploads/equipes/cealeza.png', cpf: '11111111108' },
    { nome: 'CQ Quiterianópolis', sigla: 'CQQ', chave: 'C', localidade: 'Sede • Cidade', escudo: '/assets/uploads/equipes/cq-quiterianopolis.png', cpf: '11111111109' },
    // Chave D
    { nome: 'Besouro', sigla: 'BES', chave: 'D', localidade: 'Quiterianópolis', escudo: '/assets/uploads/equipes/besouro.png', cpf: '11111111110' },
    { nome: 'Os Feras', sigla: 'FER', chave: 'D', localidade: 'Quiterianópolis', escudo: '/assets/uploads/equipes/os-feras.png', cpf: '11111111111' },
    { nome: 'Caeiras', sigla: 'CAE', chave: 'D', localidade: 'Caeiras', escudo: '/assets/uploads/equipes/caeiras.png', cpf: '11111111112' }
  ];

  const insEquipe = db.prepare(`
    INSERT INTO equipes (
      campeonato_id, nome, sigla, localidade, chave, escudo_url,
      dirigente_nome, dirigente_cpf, dirigente_senha_hash, ordem_sorteio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const idPorNome = {};
  const senhaDirigentePadrao = hashSenha('equipe2026');
  clubes.forEach((c, idx) => {
    const r = insEquipe.run(
      campId,
      c.nome,
      c.sigla,
      c.localidade,
      c.chave,
      c.escudo,
      `Representante ${c.nome}`,
      c.cpf,
      senhaDirigentePadrao,
      idx + 1
    );
    idPorNome[c.nome] = Number(r.lastInsertRowid);
  });

  // 19 Jogos Oficiais do PDF da Secretaria de Esportes
  const jogos = [
    // ABERTURA - 07 DE NOVEMBRO - SÁBADO
    { num: 1, fase: 'grupos', titulo: 'Abertura • 07 de Novembro (Sábado)', chave: 'C', data: '07/11/2026', hora: '17:00', iso: '2026-11-07T17:00', m: 'São Miguel', v: 'Cealeza' },
    { num: 2, fase: 'grupos', titulo: 'Abertura • 07 de Novembro (Sábado)', chave: 'A', data: '07/11/2026', hora: '18:45', iso: '2026-11-07T18:45', m: 'Roque Clube', v: 'Catras' },
    // 12 DE NOVEMBRO - QUINTA-FEIRA
    { num: 3, fase: 'grupos', titulo: '1ª Fase • 12 de Novembro (Quinta-feira)', chave: 'B', data: '12/11/2026', hora: '19:15', iso: '2026-11-12T19:15', m: 'Santa Maria', v: 'Baixio' },
    // 14 DE NOVEMBRO - SÁBADO
    { num: 4, fase: 'grupos', titulo: '1ª Fase • 14 de Novembro (Sábado)', chave: 'D', data: '14/11/2026', hora: '17:00', iso: '2026-11-14T17:00', m: 'Besouro', v: 'Caeiras' },
    { num: 5, fase: 'grupos', titulo: '1ª Fase • 14 de Novembro (Sábado)', chave: 'C', data: '14/11/2026', hora: '18:45', iso: '2026-11-14T18:45', m: 'CQ Quiterianópolis', vp: 'VENCEDOR JOGO 01', ovt: 'vencedor_jogo', ovr: 1 },
    // 19 DE NOVEMBRO - QUINTA-FEIRA
    { num: 6, fase: 'grupos', titulo: '1ª Fase • 19 de Novembro (Quinta-feira)', chave: 'A', data: '19/11/2026', hora: '19:15', iso: '2026-11-19T19:15', m: 'Sítio', vp: 'VENCEDOR JOGO 02', ovt: 'vencedor_jogo', ovr: 2 },
    // 21 DE NOVEMBRO - SÁBADO
    { num: 7, fase: 'grupos', titulo: '1ª Fase • 21 de Novembro (Sábado)', chave: 'B', data: '21/11/2026', hora: '17:00', iso: '2026-11-21T17:00', m: 'Jardim', vp: 'VENCEDOR JOGO 03', ovt: 'vencedor_jogo', ovr: 3 },
    { num: 8, fase: 'grupos', titulo: '1ª Fase • 21 de Novembro (Sábado)', chave: 'D', data: '21/11/2026', hora: '18:45', iso: '2026-11-21T18:45', m: 'Os Feras', vp: 'VENCEDOR JOGO 04', ovt: 'vencedor_jogo', ovr: 4 },
    // 26 DE NOVEMBRO - QUINTA-FEIRA
    { num: 9, fase: 'grupos', titulo: '1ª Fase • 26 de Novembro (Quinta-feira)', chave: 'C', data: '26/11/2026', hora: '19:15', iso: '2026-11-26T19:15', mp: 'PERDEDOR JOGO 01', omt: 'perdedor_jogo', omr: 1, v: 'CQ Quiterianópolis' },
    // 28 DE NOVEMBRO - SÁBADO
    { num: 10, fase: 'grupos', titulo: '1ª Fase • 28 de Novembro (Sábado)', chave: 'B', data: '28/11/2026', hora: '17:00', iso: '2026-11-28T17:00', mp: 'PERDEDOR JOGO 03', omt: 'perdedor_jogo', omr: 3, v: 'Jardim' },
    { num: 11, fase: 'grupos', titulo: '1ª Fase • 28 de Novembro (Sábado)', chave: 'A', data: '28/11/2026', hora: '18:45', iso: '2026-11-28T18:45', mp: 'PERDEDOR JOGO 02', omt: 'perdedor_jogo', omr: 2, v: 'Sítio' },
    // 05 DE DEZEMBRO - SÁBADO
    { num: 12, fase: 'grupos', titulo: 'Encerramento da 1ª Fase • 05 de Dezembro (Sábado)', chave: 'D', data: '05/12/2026', hora: '18:00', iso: '2026-12-05T18:00', mp: 'PERDEDOR JOGO 04', omt: 'perdedor_jogo', omr: 4, v: 'Os Feras' },
    // QUARTAS DE FINAIS - 12 E 13 DE DEZEMBRO
    { num: 13, fase: 'quartas', titulo: 'Quartas de Final • 12 de Dezembro (Sábado)', chave: '', data: '12/12/2026', hora: '17:00', iso: '2026-12-12T17:00', mp: '1º GERAL', omt: 'rank_geral', omr: 1, vp: '8º GERAL', ovt: 'rank_geral', ovr: 8 },
    { num: 14, fase: 'quartas', titulo: 'Quartas de Final • 12 de Dezembro (Sábado)', chave: '', data: '12/12/2026', hora: '18:45', iso: '2026-12-12T18:45', mp: '2º GERAL', omt: 'rank_geral', omr: 2, vp: '7º GERAL', ovt: 'rank_geral', ovr: 7 },
    { num: 15, fase: 'quartas', titulo: 'Quartas de Final • 13 de Dezembro (Domingo)', chave: '', data: '13/12/2026', hora: '17:00', iso: '2026-12-13T17:00', mp: '3º GERAL', omt: 'rank_geral', omr: 3, vp: '6º GERAL', ovt: 'rank_geral', ovr: 6 },
    { num: 16, fase: 'quartas', titulo: 'Quartas de Final • 13 de Dezembro (Domingo)', chave: '', data: '13/12/2026', hora: '18:45', iso: '2026-12-13T18:45', mp: '4º GERAL', omt: 'rank_geral', omr: 4, vp: '5º GERAL', ovt: 'rank_geral', ovr: 5 },
    // SEMIFINAIS - 19 E 22 DE DEZEMBRO
    { num: 17, fase: 'semifinal', titulo: 'Semifinal 01 • 19 de Dezembro (Sábado)', chave: '', data: '19/12/2026', hora: '18:30', iso: '2026-12-19T18:30', mp: 'VENCEDOR JOGO 13', omt: 'vencedor_jogo', omr: 13, vp: 'VENCEDOR JOGO 16', ovt: 'vencedor_jogo', ovr: 16 },
    { num: 18, fase: 'semifinal', titulo: 'Semifinal 02 • 22 de Dezembro (Terça-feira)', chave: '', data: '22/12/2026', hora: '19:15', iso: '2026-12-22T19:15', mp: 'VENCEDOR JOGO 14', omt: 'vencedor_jogo', omr: 14, vp: 'VENCEDOR JOGO 15', ovt: 'vencedor_jogo', ovr: 15 },
    // FINAL - 30 DE DEZEMBRO - QUARTA-FEIRA
    { num: 19, fase: 'final', titulo: 'Grande Final • 30 de Dezembro (Quarta-feira)', chave: '', data: '30/12/2026', hora: '18:30', iso: '2026-12-30T18:30', mp: 'VENCEDOR JOGO 17', omt: 'vencedor_jogo', omr: 17, vp: 'VENCEDOR JOGO 18', ovt: 'vencedor_jogo', ovr: 18 }
  ];

  const insJogo = db.prepare(`
    INSERT INTO partidas (
      campeonato_id, numero_jogo, fase, titulo_fase, chave, data_jogo, hora_jogo, data_iso, local,
      mandante_id, visitante_id, mandante_placeholder, visitante_placeholder,
      origem_mandante_tipo, origem_mandante_ref, origem_visitante_tipo, origem_visitante_ref
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Estádio Tualdão', ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const j of jogos) {
    insJogo.run(
      campId,
      j.num,
      j.fase,
      j.titulo,
      j.chave || '',
      j.data,
      j.hora,
      j.iso,
      j.m ? idPorNome[j.m] : null,
      j.v ? idPorNome[j.v] : null,
      j.mp || '',
      j.vp || '',
      j.omt || '',
      j.omr ?? null,
      j.ovt || '',
      j.ovr ?? null
    );
  }

  // Perguntas Frequentes (Central de Ajuda) adaptadas para Quiterianópolis 2026
  const faqs = [
    ['geral', 'Quando começa e quando termina o Campeonato Municipal de Quiterianópolis 2026?', 'A abertura oficial acontece no sábado, 07 de novembro de 2026, com rodada dupla no Estádio Tualdão (São Miguel × Cealeza às 17:00 e Roque Clube × Catras às 18:45). A Grande Final está marcada para 30 de dezembro de 2026, às 18:30.'],
    ['geral', 'Como estão divididas as 12 equipes?', 'As 12 equipes estão divididas em 4 chaves de 3 clubes cada: Chave A (Roque Clube, Sítio, Catras), Chave B (Santa Maria, Jardim, Baixio), Chave C (São Miguel, Cealeza, CQ Quiterianópolis) e Chave D (Besouro, Os Feras, Caeiras).'],
    ['jogos', 'Como funcionam os confrontos "Vencedor Jogo 01" e "Perdedor Jogo 01" na 1ª Fase?', 'Em cada chave de 3 clubes, duas equipes estreiam entre si (Jogos 01 a 04). A terceira equipe da chave enfrenta primeiro o Vencedor do jogo de estreia (Jogos 05 a 08) e, na rodada seguinte, enfrenta o Perdedor (Jogos 09 a 12). Assim que o resultado é confirmado pela Comissão Organizadora, o sistema preenche os confrontos automaticamente!'],
    ['jogos', 'Onde serão realizados todos os jogos?', 'Todas as 19 partidas oficiais da competição (1ª Fase, Quartas de Final, Semifinais e Final) serão disputadas no Estádio Municipal Tualdão, em Quiterianópolis – CE.'],
    ['classificacao', 'Quantas equipes avançam para as Quartas de Final?', 'Avançam 8 equipes para as Quartas de Final, cruzando pela Classificação Geral: Jogo 13 (1º × 8º Geral), Jogo 14 (2º × 7º Geral), Jogo 15 (3º × 6º Geral) e Jogo 16 (4º × 5º Geral).'],
    ['classificacao', 'Como funcionam as Semifinais e a Grande Final?', 'Na Semifinal 01 (19/12) enfrentam-se Vencedor do Jogo 13 × Vencedor do Jogo 16. Na Semifinal 02 (22/12) enfrentam-se Vencedor do Jogo 14 × Vencedor do Jogo 15. Os vencedores decidem o título em jogo único no dia 30/12 às 18:30. Empate no mata-mata é decidido nos pênaltis.'],
    ['atletas', 'Como o representante da equipe cadastra atletas, comissão e uniforme?', 'Basta clicar em "Área da equipe" no topo do portal, entrar com o CPF e a senha do dirigente responsável e gerenciar elenco, até 3 membros da comissão técnica, uniforme e solicitações dentro do prazo regulamentar.'],
    ['disciplina', 'Como funciona o controle de cartões e suspensões?', 'O portal calcula automaticamente os cartões registrados em súmula. Ao acumular o limite regulamentar de cartões amarelos ou receber cartão vermelho, o atleta aparece sinalizado como suspenso para a partida seguinte da sua equipe.'],
    ['sumulas', 'Onde consultar as súmulas oficiais e a tabela assinada?', 'Na aba "Súmulas" e dentro da página de cada jogo encerrado você pode consultar a súmula eletrônica detalhada e o PDF assinado pela Comissão Organizadora, além de baixar a Tabela Oficial na aba "Regulamento".']
  ];

  const insFaq = db.prepare(`
    INSERT INTO faq_itens (campeonato_id, categoria, pergunta, resposta, ordem)
    VALUES (?, ?, ?, ?, ?)
  `);
  faqs.forEach((f, idx) => insFaq.run(campId, f[0], f[1], f[2], idx + 1));

  // Documento interno inicial para ciência dos dirigentes
  db.prepare(`
    INSERT INTO documentos_internos (campeonato_id, titulo, tipo_origem, conteudo_texto, exige_assinatura, chancela_secretario)
    VALUES (?, ?, 'texto', ?, 1, 1)
  `).run(
    campId,
    'Termo de Ciência da Tabela Oficial e Normas — Edição 2026',
    'Declaramos ciência da Tabela Oficial do Campeonato Municipal de Futebol de Quiterianópolis 2026 (19 jogos no Estádio Tualdão, de 07/11/2026 a 30/12/2026), comprometendo-nos com o cumprimento dos horários, respeito à arbitragem, zelo pelo patrimônio público e espírito esportivo.'
  );

  // Avaliação pública inicial de boas-vindas
  db.prepare(`
    INSERT INTO avaliacoes (campeonato_id, nome, nota, comentario, status)
    VALUES (?, ?, ?, ?, 'aprovada')
  `).run(
    campId,
    'Comissão Organizadora • Quiterianópolis',
    10,
    'Sejam bem-vindos ao Portal Oficial do Campeonato Quiterianopolense de Futebol 2026! Acompanhe todos os jogos no Estádio Tualdão em tempo real.'
  );
}

function registrarAuditoria({ perfil, usuarioNome, cpf = '', equipeId = null, acao, detalhes = '', ip = '' }) {
  try {
    db.prepare(`
      INSERT INTO auditoria_logs (perfil, usuario_nome, cpf, equipe_id, acao, detalhes, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(perfil, usuarioNome, limparCpf(cpf), equipeId, acao, detalhes, ip);
  } catch (_) {}
}

inicializarBanco();

module.exports = {
  db,
  DATA_DIR,
  hashSenha,
  verificarSenha,
  limparCpf,
  formatarCpf,
  registrarAuditoria
};
