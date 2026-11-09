'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { DATA_DIR } = require('./db');
const UPLOADS_ROOT = path.join(DATA_DIR, 'uploads');

function lerBufferRequisicao(req, limiteBytes = 20 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    let total = 0;
    req.on('data', chunk => {
      total += chunk.length;
      if (total > limiteBytes) {
        reject(new Error('Arquivo ou formulário excede o tamanho máximo permitido (20 MB).'));
        req.destroy();
        return;
      }
      pedacos.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(pedacos)));
    req.on('error', reject);
  });
}

function adicionarCampo(campos, nome, valor) {
  if (Object.prototype.hasOwnProperty.call(campos, nome)) {
    if (Array.isArray(campos[nome])) campos[nome].push(valor);
    else campos[nome] = [campos[nome], valor];
  } else {
    campos[nome] = valor;
  }
}

async function lerCorpoFormulario(req) {
  const contentType = String(req.headers['content-type'] || '');
  const buffer = await lerBufferRequisicao(req);
  const campos = {};
  const arquivos = {};

  if (!buffer.length) return { campos, arquivos };

  if (contentType.includes('multipart/form-data')) {
    const matchBoundary = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = matchBoundary ? (matchBoundary[1] || matchBoundary[2]).trim() : '';
    if (!boundary) return { campos, arquivos };

    const delimitador = Buffer.from(`--${boundary}`);
    const separadorCabecalho = Buffer.from('\r\n\r\n');

    let pos = buffer.indexOf(delimitador);
    while (pos !== -1) {
      const inicioParte = pos + delimitador.length;
      if (buffer.slice(inicioParte, inicioParte + 2).toString() === '--') break;

      const inicioConteudoBloco = buffer.slice(inicioParte, inicioParte + 2).toString() === '\r\n'
        ? inicioParte + 2
        : inicioParte;

      const proximoBoundary = buffer.indexOf(delimitador, inicioConteudoBloco);
      if (proximoBoundary === -1) break;

      // Remove \r\n antes do próximo boundary
      const fimBloco = (buffer[proximoBoundary - 2] === 13 && buffer[proximoBoundary - 1] === 10)
        ? proximoBoundary - 2
        : proximoBoundary;

      const bloco = buffer.slice(inicioConteudoBloco, fimBloco);
      const idxSep = bloco.indexOf(separadorCabecalho);
      if (idxSep !== -1) {
        const cabecalhoTxt = bloco.slice(0, idxSep).toString('utf8');
        const dadosCorpo = bloco.slice(idxSep + 4);

        const matchName = cabecalhoTxt.match(/name="([^"]+)"/i);
        const matchFile = cabecalhoTxt.match(/filename="([^"]*)"/i);
        const matchMime = cabecalhoTxt.match(/Content-Type:\s*([^\r\n]+)/i);

        if (matchName) {
          const nomeCampo = matchName[1];
          if (matchFile !== null) {
            const nomeOriginal = matchFile[1].trim();
            if (nomeOriginal && dadosCorpo.length > 0) {
              const objArq = {
                nomeOriginal,
                mime: matchMime ? matchMime[1].trim().toLowerCase() : 'application/octet-stream',
                buffer: dadosCorpo
              };
              if (!arquivos[nomeCampo]) arquivos[nomeCampo] = [];
              arquivos[nomeCampo].push(objArq);
            }
          } else {
            adicionarCampo(campos, nomeCampo, dadosCorpo.toString('utf8'));
          }
        }
      }

      pos = proximoBoundary;
    }
    return { campos, arquivos };
  }

  // Padrão application/x-www-form-urlencoded
  const params = new URLSearchParams(buffer.toString('utf8'));
  for (const [chave, valor] of params.entries()) {
    adicionarCampo(campos, chave, valor);
  }
  return { campos, arquivos };
}

function salvarArquivoUpload(arquivo, subpasta, extensoesPermitidas = ['.png', '.jpg', '.jpeg', '.webp']) {
  if (!arquivo || !arquivo.buffer || !arquivo.buffer.length) return null;
  const ext = path.extname(arquivo.nomeOriginal || '').toLowerCase();
  if (!extensoesPermitidas.includes(ext)) {
    throw new Error(`Formato de arquivo não permitido (${ext || 'desconhecido'}). Permitidos: ${extensoesPermitidas.join(', ')}`);
  }

  const pastaDestino = path.join(UPLOADS_ROOT, subpasta);
  if (!fs.existsSync(pastaDestino)) {
    fs.mkdirSync(pastaDestino, { recursive: true });
  }

  const nomeSeguro = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
  const caminhoCompleto = path.join(pastaDestino, nomeSeguro);
  fs.writeFileSync(caminhoCompleto, arquivo.buffer);

  return `/assets/uploads/${subpasta}/${nomeSeguro}`;
}

module.exports = {
  lerCorpoFormulario,
  salvarArquivoUpload
};
