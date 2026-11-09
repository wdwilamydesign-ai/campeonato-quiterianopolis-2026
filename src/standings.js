'use strict';

const { db } = require('./db');

function obterVencedorPerdedorPartida(partida) {
  if (!partida || partida.status !== 'encerrada' || !partida.mandante_id || !partida.visitante_id) {
    return { vencedorId: null, perdedorId: null };
  }
  const gm = Number(partida.gols_mandante ?? 0);
  const gv = Number(partida.gols_visitante ?? 0);
  if (gm > gv) return { vencedorId: partida.mandante_id, perdedorId: partida.visitante_id };
  if (gv > gm) return { vencedorId: partida.visitante_id, perdedorId: partida.mandante_id };

  const pm = partida.penaltis_mandante;
  const pv = partida.penaltis_visitante;
  if (pm !== null && pv !== null && pm !== undefined && pv !== undefined && Number(pm) !== Number(pv)) {
    return Number(pm) > Number(pv)
      ? { vencedorId: partida.mandante_id, perdedorId: partida.visitante_id }
      : { vencedorId: partida.visitante_id, perdedorId: partida.mandante_id };
  }

  if (partida.vencedor_definido_id) {
    const venc = Number(partida.vencedor_definido_id);
    if (venc === partida.mandante_id) return { vencedorId: partida.mandante_id, perdedorId: partida.visitante_id };
    if (venc === partida.visitante_id) return { vencedorId: partida.visitante_id, perdedorId: partida.mandante_id };
  }

  // Caso empate em jogo inaugural de grupo sem critério manual definido ainda, aguarda definição da Comissão
  return { vencedorId: null, perdedorId: null };
}

function calcularClassificacao(campeonatoId) {
  const campeonato = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(campeonatoId);
  if (!campeonato) return { chaves: {}, geral: [], confrontosQuartas: [], todosGruposEncerrados: false };

  const equipes = db.prepare('SELECT * FROM equipes WHERE campeonato_id = ? AND ativo = 1 ORDER BY chave ASC, ordem_sorteio ASC, nome ASC').all(campeonatoId);
  const partidasGrupos = db.prepare("SELECT * FROM partidas WHERE campeonato_id = ? AND fase = 'grupos'").all(campeonatoId);

  const cartoes = db.prepare(`
    SELECT equipe_id,
      SUM(CASE WHEN tipo = 'amarelo' THEN 1 ELSE 0 END) AS amarelos,
      SUM(CASE WHEN tipo = 'vermelho' THEN 1 ELSE 0 END) AS vermelhos
    FROM eventos_partida
    WHERE campeonato_id = ?
    GROUP BY equipe_id
  `).all(campeonatoId);

  const mapaCartoes = {};
  for (const c of cartoes) {
    if (c.equipe_id) mapaCartoes[c.equipe_id] = { ca: Number(c.amarelos || 0), cv: Number(c.vermelhos || 0) };
  }

  const stats = {};
  const confrontoDireto = {};

  for (const eq of equipes) {
    stats[eq.id] = {
      equipe: eq,
      id: eq.id,
      nome: eq.nome,
      sigla: eq.sigla,
      chave: eq.chave || 'A',
      escudo_url: eq.escudo_url,
      localidade: eq.localidade,
      ordem_sorteio: eq.ordem_sorteio || eq.id,
      j: 0,
      v: 0,
      e: 0,
      d: 0,
      gp: 0,
      gc: 0,
      sg: 0,
      p: 0,
      ca: mapaCartoes[eq.id]?.ca || 0,
      cv: mapaCartoes[eq.id]?.cv || 0,
      aproveitamento: 0
    };
  }

  let encerradosGrupos = 0;
  for (const p of partidasGrupos) {
    if (p.status === 'encerrada') encerradosGrupos++;
    if (p.status !== 'encerrada' || !p.mandante_id || !p.visitante_id) continue;
    const m = stats[p.mandante_id];
    const v = stats[p.visitante_id];
    if (!m || !v) continue;

    const gm = Number(p.gols_mandante ?? 0);
    const gv = Number(p.gols_visitante ?? 0);

    m.j++; v.j++;
    m.gp += gm; m.gc += gv;
    v.gp += gv; v.gc += gm;

    const chavePar = `${m.id}_${v.id}`;
    const chaveParInv = `${v.id}_${m.id}`;

    if (gm > gv) {
      m.v++; m.p += 3;
      v.d++;
      confrontoDireto[chavePar] = (confrontoDireto[chavePar] || 0) + 1;
      confrontoDireto[chaveParInv] = (confrontoDireto[chaveParInv] || 0) - 1;
    } else if (gv > gm) {
      v.v++; v.p += 3;
      m.d++;
      confrontoDireto[chavePar] = (confrontoDireto[chavePar] || 0) - 1;
      confrontoDireto[chaveParInv] = (confrontoDireto[chaveParInv] || 0) + 1;
    } else {
      m.e++; v.e++;
      m.p += 1; v.p += 1;
    }
  }

  for (const st of Object.values(stats)) {
    st.sg = st.gp - st.gc;
    st.aproveitamento = st.j > 0 ? Math.round((st.p / (st.j * 3)) * 100) : 0;
  }

  const compararBase = (a, b, usarConfrontoDireto = false) => {
    if (b.p !== a.p) return b.p - a.p;
    if (b.v !== a.v) return b.v - a.v;
    if (b.sg !== a.sg) return b.sg - a.sg;
    if (b.gp !== a.gp) return b.gp - a.gp;
    if (usarConfrontoDireto && a.chave === b.chave) {
      const cd = confrontoDireto[`${a.id}_${b.id}`] || 0;
      if (cd !== 0) return -cd;
    }
    if (a.cv !== b.cv) return a.cv - b.cv;
    if (a.ca !== b.ca) return a.ca - b.ca;
    return a.ordem_sorteio - b.ordem_sorteio;
  };

  // Agrupar por chave
  const chaves = {};
  for (const st of Object.values(stats)) {
    if (!chaves[st.chave]) chaves[st.chave] = [];
    chaves[st.chave].push({ ...st });
  }

  const idsDoisPorChave = new Set();
  for (const nomeChave of Object.keys(chaves).sort()) {
    chaves[nomeChave].sort((a, b) => compararBase(a, b, true));
    chaves[nomeChave].forEach((item, idx) => {
      item.posicaoChave = idx + 1;
      if (idx < 2) idsDoisPorChave.add(item.id);
    });
  }

  // Classificação Geral
  let geral = Object.values(stats).map(s => ({ ...s }));
  geral.sort((a, b) => compararBase(a, b, false));

  if (campeonato.modo_quartas === '2_por_chave') {
    const classificados = geral.filter(item => idsDoisPorChave.has(item.id));
    const demais = geral.filter(item => !idsDoisPorChave.has(item.id));
    geral = [...classificados, ...demais];
  }

  geral.forEach((item, idx) => {
    item.posicaoGeral = idx + 1;
    item.classificado = idx < 8;
  });

  // Propagar marcação de classificado para dentro das tabelas das chaves também
  const setClassificados = new Set(geral.filter(g => g.classificado).map(g => g.id));
  for (const lista of Object.values(chaves)) {
    for (const item of lista) {
      item.classificado = setClassificados.has(item.id);
      const posGeralObj = geral.find(g => g.id === item.id);
      item.posicaoGeral = posGeralObj ? posGeralObj.posicaoGeral : null;
    }
  }

  const top8 = geral.slice(0, 8);
  const confrontosQuartas = top8.length === 8 ? [
    { jogo: 13, mandante: top8[0], visitante: top8[7], rotulo: '1º Geral × 8º Geral' },
    { jogo: 14, mandante: top8[1], visitante: top8[6], rotulo: '2º Geral × 7º Geral' },
    { jogo: 15, mandante: top8[2], visitante: top8[5], rotulo: '3º Geral × 6º Geral' },
    { jogo: 16, mandante: top8[3], visitante: top8[4], rotulo: '4º Geral × 5º Geral' }
  ] : [];

  const todosGruposEncerrados = partidasGrupos.length > 0 && encerradosGrupos === partidasGrupos.length;

  return {
    chaves,
    geral,
    confrontosQuartas,
    todosGruposEncerrados,
    totalJogosGrupos: partidasGrupos.length,
    encerradosGrupos
  };
}

function sincronizarTabelaCondicional(campeonatoId, { forcarQuartas = false } = {}) {
  const todasPartidas = db.prepare('SELECT * FROM partidas WHERE campeonato_id = ? ORDER BY numero_jogo ASC').all(campeonatoId);
  const porNumero = {};
  for (const p of todasPartidas) {
    porNumero[p.numero_jogo] = p;
  }

  const classif = calcularClassificacao(campeonatoId);
  const podePreencherQuartas = forcarQuartas || classif.todosGruposEncerrados;

  const updMandante = db.prepare('UPDATE partidas SET mandante_id = ? WHERE id = ?');
  const updVisitante = db.prepare('UPDATE partidas SET visitante_id = ? WHERE id = ?');

  for (const p of todasPartidas) {
    if (p.status !== 'agendada') continue;

    // Resolver origem do Mandante
    if (p.origem_mandante_tipo === 'vencedor_jogo' || p.origem_mandante_tipo === 'perdedor_jogo') {
      const ref = porNumero[p.origem_mandante_ref];
      const { vencedorId, perdedorId } = obterVencedorPerdedorPartida(ref);
      const novoId = p.origem_mandante_tipo === 'vencedor_jogo' ? vencedorId : perdedorId;
      if (novoId !== p.mandante_id) {
        updMandante.run(novoId, p.id);
        p.mandante_id = novoId;
      }
    } else if (p.origem_mandante_tipo === 'rank_geral' && podePreencherQuartas) {
      const pos = Number(p.origem_mandante_ref);
      const item = classif.geral[pos - 1];
      if (item && item.id !== p.mandante_id) {
        updMandante.run(item.id, p.id);
        p.mandante_id = item.id;
      }
    }

    // Resolver origem do Visitante
    if (p.origem_visitante_tipo === 'vencedor_jogo' || p.origem_visitante_tipo === 'perdedor_jogo') {
      const ref = porNumero[p.origem_visitante_ref];
      const { vencedorId, perdedorId } = obterVencedorPerdedorPartida(ref);
      const novoId = p.origem_visitante_tipo === 'vencedor_jogo' ? vencedorId : perdedorId;
      if (novoId !== p.visitante_id) {
        updVisitante.run(novoId, p.id);
        p.visitante_id = novoId;
      }
    } else if (p.origem_visitante_tipo === 'rank_geral' && podePreencherQuartas) {
      const pos = Number(p.origem_visitante_ref);
      const item = classif.geral[pos - 1];
      if (item && item.id !== p.visitante_id) {
        updVisitante.run(item.id, p.id);
        p.visitante_id = item.id;
      }
    }
  }

  // Se a Grande Final (fase = 'final') estiver encerrada, atualizar Campeão e Vice
  const finalJogo = todasPartidas.find(p => p.fase === 'final');
  if (finalJogo && finalJogo.status === 'encerrada') {
    const { vencedorId, perdedorId } = obterVencedorPerdedorPartida(finalJogo);
    if (vencedorId) {
      db.prepare('UPDATE campeonatos SET campeao_equipe_id = ?, vice_equipe_id = ? WHERE id = ?')
        .run(vencedorId, perdedorId, campeonatoId);
    }
  }
}

function obterEstatisticasAtletas(campeonatoId) {
  const campeonato = db.prepare('SELECT * FROM campeonatos WHERE id = ?').get(campeonatoId);
  const limiteAmarelos = Number(campeonato?.amarelos_suspensao || 3);

  const artilharia = db.prepare(`
    SELECT a.id, a.nome, a.apelido, a.numero, a.origem, a.status, a.foto_url,
           e.id AS equipe_id, e.nome AS equipe_nome, e.escudo_url,
           COUNT(ev.id) AS gols
    FROM eventos_partida ev
    JOIN atletas a ON a.id = ev.atleta_id
    JOIN equipes e ON e.id = a.equipe_id
    WHERE ev.campeonato_id = ? AND ev.tipo = 'gol'
    GROUP BY a.id
    HAVING gols > 0
    ORDER BY gols DESC, a.nome ASC
  `).all(campeonatoId);

  const assistencias = db.prepare(`
    SELECT a.id, a.nome, a.apelido, a.numero, a.origem, a.status, a.foto_url,
           e.id AS equipe_id, e.nome AS equipe_nome, e.escudo_url,
           COUNT(ev.id) AS total_assist
    FROM eventos_partida ev
    JOIN atletas a ON a.id = ev.atleta_secundario_id
    JOIN equipes e ON e.id = a.equipe_id
    WHERE ev.campeonato_id = ? AND ev.tipo = 'gol' AND ev.atleta_secundario_id IS NOT NULL
    GROUP BY a.id
    HAVING total_assist > 0
    ORDER BY total_assist DESC, a.nome ASC
  `).all(campeonatoId);

  const craques = db.prepare(`
    SELECT a.id, a.nome, a.apelido, a.numero, a.foto_url,
           e.id AS equipe_id, e.nome AS equipe_nome, e.escudo_url,
           COUNT(p.id) AS premios
    FROM partidas p
    JOIN atletas a ON a.id = p.craque_atleta_id
    JOIN equipes e ON e.id = a.equipe_id
    WHERE p.campeonato_id = ? AND p.craque_atleta_id IS NOT NULL
    GROUP BY a.id
    ORDER BY premios DESC, a.nome ASC
  `).all(campeonatoId);

  // Controle disciplinar inteligente (cartões, suspensos e pendurados)
  const todosAtletas = db.prepare(`
    SELECT a.*, e.nome AS equipe_nome, e.escudo_url
    FROM atletas a
    JOIN equipes e ON e.id = a.equipe_id
    WHERE a.campeonato_id = ?
  `).all(campeonatoId);

  const eventosCartoes = db.prepare(`
    SELECT ev.*, p.data_iso, p.status AS partida_status
    FROM eventos_partida ev
    JOIN partidas p ON p.id = ev.partida_id
    WHERE ev.campeonato_id = ? AND ev.tipo IN ('amarelo', 'vermelho') AND ev.atleta_id IS NOT NULL
    ORDER BY p.data_iso ASC, ev.id ASC
  `).all(campeonatoId);

  const ultimaPartidaEncerradaPorEquipe = {};
  const partidasEnc = db.prepare(`
    SELECT id, mandante_id, visitante_id, data_iso
    FROM partidas
    WHERE campeonato_id = ? AND status = 'encerrada'
    ORDER BY data_iso ASC, id ASC
  `).all(campeonatoId);

  for (const pe of partidasEnc) {
    if (pe.mandante_id) ultimaPartidaEncerradaPorEquipe[pe.mandante_id] = pe.id;
    if (pe.visitante_id) ultimaPartidaEncerradaPorEquipe[pe.visitante_id] = pe.id;
  }

  const cartoesPorAtleta = {};
  for (const ev of eventosCartoes) {
    if (!cartoesPorAtleta[ev.atleta_id]) {
      cartoesPorAtleta[ev.atleta_id] = { amarelos: 0, vermelhos: 0, amarelosAntesUltima: 0, recebeuVermelhoNaUltima: false, atingiuSerieAmarelosNaUltima: false };
    }
    const reg = cartoesPorAtleta[ev.atleta_id];
    const atletaObj = todosAtletas.find(x => x.id === ev.atleta_id);
    const ultJogoEq = atletaObj ? ultimaPartidaEncerradaPorEquipe[atletaObj.equipe_id] : null;

    if (ev.tipo === 'amarelo') {
      reg.amarelos++;
      if (ultJogoEq && ev.partida_id === ultJogoEq && reg.amarelos % limiteAmarelos === 0) {
        reg.atingiuSerieAmarelosNaUltima = true;
      }
    } else if (ev.tipo === 'vermelho') {
      reg.vermelhos++;
      if (ultJogoEq && ev.partida_id === ultJogoEq) {
        reg.recebeuVermelhoNaUltima = true;
      }
    }
  }

  const disciplina = [];
  for (const a of todosAtletas) {
    const c = cartoesPorAtleta[a.id] || { amarelos: 0, vermelhos: 0, recebeuVermelhoNaUltima: false, atingiuSerieAmarelosNaUltima: false };
    const suspensoAuto = c.recebeuVermelhoNaUltima || c.atingiuSerieAmarelosNaUltima;
    const suspenso = Boolean(a.suspenso_manual) || suspensoAuto;
    const pendurado = !suspenso && limiteAmarelos > 1 && (c.amarelos % limiteAmarelos === limiteAmarelos - 1);

    if (c.amarelos > 0 || c.vermelhos > 0 || suspenso) {
      disciplina.push({
        ...a,
        amarelos: c.amarelos,
        vermelhos: c.vermelhos,
        suspenso,
        motivoSuspensao: a.suspenso_manual ? 'Decisão da Comissão' : (c.recebeuVermelhoNaUltima ? 'Cartão Vermelho' : (c.atingiuSerieAmarelosNaUltima ? `${limiteAmarelos}º Cartão Amarelo` : '')),
        pendurado
      });
    }
  }

  disciplina.sort((a, b) => {
    if (a.suspenso !== b.suspenso) return a.suspenso ? -1 : 1;
    if (a.pendurado !== b.pendurado) return a.pendurado ? -1 : 1;
    if (b.vermelhos !== a.vermelhos) return b.vermelhos - a.vermelhos;
    return b.amarelos - a.amarelos;
  });

  return { artilharia, assistencias, craques, disciplina, limiteAmarelos };
}

function verificarJanelaEquipeAberta(campeonato, equipe) {
  if (equipe.janela_aberta_manual === 1) return { aberta: true, motivo: 'Liberada manualmente pela Comissão Organizadora' };
  if (equipe.janela_aberta_manual === 0) return { aberta: false, motivo: 'Bloqueada pela Comissão Organizadora' };

  const proxPartida = db.prepare(`
    SELECT * FROM partidas
    WHERE campeonato_id = ? AND status IN ('agendada', 'ao_vivo')
      AND (mandante_id = ? OR visitante_id = ?)
    ORDER BY data_iso ASC LIMIT 1
  `).get(campeonato.id, equipe.id, equipe.id);

  if (!proxPartida) {
    return { aberta: true, motivo: 'Sem bloqueio de jogo imediato' };
  }
  if (proxPartida.status === 'ao_vivo') {
    return { aberta: false, motivo: `Partida Jogo ${String(proxPartida.numero_jogo).padStart(2, '0')} em andamento` };
  }

  const horasAntes = Number(campeonato.bloqueio_horas_antes || 4);
  const tsPartida = new Date(`${proxPartida.data_iso}:00-03:00`).getTime();
  const agora = Date.now();
  const limiteTs = tsPartida - (horasAntes * 3600 * 1000);

  if (!Number.isNaN(tsPartida) && agora >= limiteTs && agora <= tsPartida + 4 * 3600 * 1000) {
    return {
      aberta: false,
      motivo: `Janela encerrada (${horasAntes}h antes do Jogo ${String(proxPartida.numero_jogo).padStart(2, '0')} — ${proxPartida.data_jogo} às ${proxPartida.hora_jogo})`
    };
  }

  return {
    aberta: true,
    motivo: `Aberta até ${horasAntes}h antes do Jogo ${String(proxPartida.numero_jogo).padStart(2, '0')} (${proxPartida.data_jogo} ${proxPartida.hora_jogo})`
  };
}

module.exports = {
  calcularClassificacao,
  sincronizarTabelaCondicional,
  obterEstatisticasAtletas,
  obterVencedorPerdedorPartida,
  verificarJanelaEquipeAberta
};
