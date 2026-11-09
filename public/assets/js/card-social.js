'use strict';

// Gerador automático de Arte Oficial 1080x1080 (PNG) para WhatsApp e Instagram
(function () {
  function carregarImagem(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function retanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function quebrarTexto(ctx, texto, x, y, maxW, lineHeight) {
    const palavras = String(texto || '').split(' ');
    let linha = '';
    const linhas = [];
    for (const p of palavras) {
      const teste = linha ? `${linha} ${p}` : p;
      if (ctx.measureText(teste).width > maxW && linha) {
        linhas.push(linha);
        linha = p;
      } else {
        linha = teste;
      }
    }
    if (linha) linhas.push(linha);
    linhas.slice(0, 2).forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
  }

  async function gerarCardJogo(btn) {
    const dados = btn.dataset;
    const textoOriginal = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Gerando arte...';

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Fundo Azul Royal Profundo com luzes douradas e celestes
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#041B4D');
      grad.addColorStop(0.55, '#073286');
      grad.addColorStop(1, '#0057D9');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Círculo decorativo superior
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 208, 0, 0.14)';
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.arc(980, 110, 260, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0, 159, 227, 0.18)';
      ctx.beginPath();
      ctx.arc(100, 960, 240, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Faixa superior oficial de 4 cores da Prefeitura
      const coresFaixa = ['#009FE3', '#FFD000', '#E6007E', '#00A859'];
      coresFaixa.forEach((cor, idx) => {
        ctx.fillStyle = cor;
        ctx.fillRect(idx * 270, 0, 270, 14);
        ctx.fillRect(idx * 270, 1066, 270, 14);
      });

      const [logoCamp, escudoM, escudoV] = await Promise.all([
        carregarImagem('/assets/branding/escudo-campeonato-2026.png'),
        carregarImagem(dados.mandanteEscudo || ''),
        carregarImagem(dados.visitanteEscudo || '')
      ]);

      // Escudo 3D do Campeonato no topo
      if (logoCamp) {
        const lh = 175;
        const lw = (logoCamp.width / logoCamp.height) * lh;
        ctx.drawImage(logoCamp, (1080 - lw) / 2, 36, lw, lh);
      }

      // Etiqueta da Fase / Jogo
      ctx.fillStyle = '#FFD000';
      retanguloArredondado(ctx, 290, 232, 500, 48, 24);
      ctx.fill();
      ctx.fillStyle = '#041B4D';
      ctx.font = '900 22px Inter, Segoe UI, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((dados.etiqueta || 'CAMPEONATO QUITERIANOPOLENSE 2026').toUpperCase(), 540, 264);

      // Título principal (DIA DE JOGO / FIM DE JOGO / AO VIVO)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 54px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillText((dados.tituloArte || 'DIA DE JOGO').toUpperCase(), 540, 344);

      // Card central branco translúcido do confronto
      ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
      retanguloArredondado(ctx, 70, 385, 940, 430, 36);
      ctx.fill();

      // Caixa do Escudo Mandante
      ctx.fillStyle = '#F3F7FD';
      retanguloArredondado(ctx, 130, 435, 230, 230, 32);
      ctx.fill();
      if (escudoM) {
        ctx.drawImage(escudoM, 150, 455, 190, 190);
      } else {
        ctx.fillStyle = '#06286E';
        ctx.font = '900 44px Inter, Arial, sans-serif';
        ctx.fillText((dados.mandanteNome || 'EQ1').slice(0, 3).toUpperCase(), 245, 565);
      }

      // Caixa do Escudo Visitante
      ctx.fillStyle = '#F3F7FD';
      retanguloArredondado(ctx, 720, 435, 230, 230, 32);
      ctx.fill();
      if (escudoV) {
        ctx.drawImage(escudoV, 740, 455, 190, 190);
      } else {
        ctx.fillStyle = '#06286E';
        ctx.font = '900 44px Inter, Arial, sans-serif';
        ctx.fillText((dados.visitanteNome || 'EQ2').slice(0, 3).toUpperCase(), 835, 565);
      }

      // Centro (Placar ou VS)
      ctx.fillStyle = '#06286E';
      ctx.font = '900 84px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillText(dados.placarTexto || '×', 540, 578);

      if (dados.chaveTexto) {
        ctx.fillStyle = '#0057D9';
        ctx.font = '800 24px Inter, Arial, sans-serif';
        ctx.fillText(dados.chaveTexto.toUpperCase(), 540, 632);
      }

      // Nomes das Equipes
      ctx.fillStyle = '#102341';
      ctx.font = '900 30px Inter, Segoe UI, Arial, sans-serif';
      quebrarTexto(ctx, (dados.mandanteNome || '').toUpperCase(), 245, 718, 290, 34);
      quebrarTexto(ctx, (dados.visitanteNome || '').toUpperCase(), 835, 718, 290, 34);

      // Faixa de Data, Hora e Estádio Tualdão
      ctx.fillStyle = 'rgba(4, 27, 77, 0.55)';
      retanguloArredondado(ctx, 140, 845, 800, 96, 24);
      ctx.fill();
      ctx.fillStyle = '#FFD000';
      ctx.font = '900 30px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillText(`${dados.dataHora || ''} • ${(dados.local || 'ESTÁDIO TUALDÃO').toUpperCase()}`, 540, 892);
      ctx.fillStyle = '#DBEAFE';
      ctx.font = '700 21px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillText('PREFEITURA DE QUITERIANÓPOLIS • SECRETARIA MUNICIPAL DE ESPORTES', 540, 926);

      // Rodapé do portal
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 22px Inter, Segoe UI, Arial, sans-serif';
      ctx.fillText('PORTAL OFICIAL — CAMPEONATO QUITERIANOPOLENSE DE FUTEBOL 2026', 540, 1020);

      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `jogo-${dados.jogoNumero || 'oficial'}-quiterianopolis-2026.png`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert('Não foi possível gerar a imagem neste navegador.');
    } finally {
      btn.disabled = false;
      btn.textContent = textoOriginal;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-share-card]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        gerarCardJogo(btn);
      });
    });
  });
})();
