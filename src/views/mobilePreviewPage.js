'use strict';

const { esc } = require('./helpers');

function paginaSimuladorMobile({ campeonato, rotaInicial = '/', urlRedeLocal = 'http://192.168.0.9:3000' }) {
  const rotaSegura = String(rotaInicial || '/').startsWith('/') ? rotaInicial : '/';

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Prévia Celular (Android & iOS) • ${esc(campeonato.nome_curto)}</title>
  <script src="/assets/js/device.js?v=3.0.0"></script>
  <link rel="stylesheet" href="/assets/css/app.css?v=3.0.0">
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/icons/favicon-32.png">
  <style>
    body {
      background: radial-gradient(circle at 18% 12%, #0d3b9e 0%, #051c4d 58%, #03102e 100%);
      color: #fff;
      min-height: 100vh;
    }
    .sim-header {
      position: sticky; top: 0; z-index: 80;
      background: rgba(4, 21, 59, 0.94); backdrop-filter: blur(14px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.14);
    }
    .sim-header::before { content: ""; display: block; height: 5px; background: var(--gov-ribbon); }
    .sim-top-row {
      display: flex; flex-wrap: nowrap; align-items: center; justify-content: space-between;
      gap: 12px; padding: 10px 0; overflow-x: auto; scrollbar-width: none;
    }
    .sim-top-row::-webkit-scrollbar { display: none; }
    .sim-routes-row {
      display: flex; flex-wrap: nowrap; align-items: center; gap: 6px;
      padding: 8px 0 10px; border-top: 1px solid rgba(255, 255, 255, 0.1);
      overflow-x: auto; scrollbar-width: none;
    }
    .sim-routes-row::-webkit-scrollbar { display: none; }
    .sim-chip {
      flex: 0 0 auto; white-space: nowrap;
      border: 1px solid rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.08);
      color: #e0ecff; border-radius: 999px; padding: 6px 13px;
      font: inherit; font-size: 0.79rem; font-weight: 800; cursor: pointer;
      transition: 0.15s ease;
    }
    .sim-chip:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
    .sim-chip.active { background: var(--gold); color: var(--blue-deep); border-color: var(--gold); font-weight: 900; }

    .sim-stage {
      display: flex; justify-content: center; align-items: flex-start;
      gap: 36px; flex-wrap: wrap; padding: 28px 18px 42px;
    }
    .device-col { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .device-label {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 16px; border-radius: 999px;
      background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.18);
      font-size: 0.85rem; font-weight: 850;
    }

    /* Moldura Comum */
    .phone-shell {
      --phone-w: 390px;
      --phone-h: 800px;
      width: calc(var(--phone-w) + 26px);
      height: calc(var(--phone-h) + 28px);
      padding: 13px;
      position: relative;
      display: flex; flex-direction: column;
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.58), inset 0 0 0 2px rgba(255, 255, 255, 0.22);
      transition: width 0.22s ease, height 0.22s ease;
    }
    .phone-screen {
      width: 100%; height: 100%; background: #fff; overflow: hidden;
      display: flex; flex-direction: column; position: relative;
    }
    .phone-iframe { width: 100%; flex: 1; border: 0; background: #f3f6fc; }

    /* Android (Samsung Galaxy / Pixel) */
    .phone-android {
      background: linear-gradient(145deg, #242936, #11151d);
      border-radius: 36px;
    }
    .phone-android .phone-screen { border-radius: 25px; }
    .android-statusbar {
      height: 30px; background: #06286e; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 16px; font-size: 0.72rem; font-weight: 800; position: relative; flex-shrink: 0;
    }
    .android-camera {
      width: 11px; height: 11px; border-radius: 50%; background: #05070b;
      border: 1px solid #283347; position: absolute; left: 50%; transform: translateX(-50%);
    }
    .android-gesture-bar {
      height: 18px; background: #fff; border-top: 1px solid #e5edf8;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .android-gesture-bar span { width: 108px; height: 4px; border-radius: 99px; background: #64748b; }

    /* iPhone 16 Pro (iOS + Dynamic Island) */
    .phone-ios {
      background: linear-gradient(145deg, #3b3a36, #1b1b19);
      border-radius: 52px;
      box-shadow: 0 32px 80px rgba(0, 0, 0, 0.58), inset 0 0 0 3px #7a766d;
    }
    .phone-ios .phone-screen { border-radius: 40px; }
    .ios-statusbar {
      height: 40px; background: #06286e; color: #fff;
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 22px 0; font-size: 0.76rem; font-weight: 800; position: relative; flex-shrink: 0;
    }
    .ios-dynamic-island {
      width: 104px; height: 25px; border-radius: 999px; background: #000;
      position: absolute; left: 50%; top: 7px; transform: translateX(-50%);
      display: flex; align-items: center; justify-content: flex-end; padding-right: 9px;
    }
    .ios-dynamic-island::after {
      content: ""; width: 9px; height: 9px; border-radius: 50%;
      background: radial-gradient(circle, #1e3a8a 25%, #090d16 70%);
    }
    .ios-home-bar {
      height: 20px; background: #fff;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .ios-home-bar span { width: 132px; height: 5px; border-radius: 99px; background: #0f172a; }

    /* Cartão de Acesso no Aparelho Real */
    .wifi-banner {
      width: min(1160px, calc(100% - 28px)); margin: 0 auto 44px;
      background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 22px; padding: 20px 24px;
      display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap;
    }
    .wifi-url-box {
      display: inline-flex; align-items: center; gap: 10px;
      background: rgba(4, 16, 46, 0.75); border: 1px solid rgba(255, 208, 0, 0.45);
      padding: 10px 16px; border-radius: 14px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      color: var(--gold); font-weight: 900; font-size: 1rem;
    }
  </style>
</head>
<body>
  <header class="sim-header">
    <div class="container">
      <div class="sim-top-row">
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
          <a class="btn btn-light btn-sm" href="${esc(rotaSegura)}">← Tela Cheia</a>
          <img src="/assets/branding/escudo-campeonato-2026.png" alt="" style="width:36px;height:36px;object-fit:contain">
          <div>
            <strong style="display:block;font-size:.92rem;line-height:1.1">Estúdio Mobile • Android &amp; iOS</strong>
            <span style="font-size:.72rem;color:#93c5fd">Prévia interativa em tempo real</span>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-size:.75rem;color:#cbd5e1;font-weight:800">Aparelhos:</span>
          <button type="button" class="sim-chip active" data-view-mode="ambos">📱 Ambos (Android + iOS)</button>
          <button type="button" class="sim-chip" data-view-mode="android">🤖 Só Android</button>
          <button type="button" class="sim-chip" data-view-mode="ios">🍎 Só iPhone (iOS)</button>
        </div>

        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
          <span style="font-size:.75rem;color:#cbd5e1;font-weight:800">Tela:</span>
          <button type="button" class="sim-chip" data-size="375x740">Compacta (375px)</button>
          <button type="button" class="sim-chip active" data-size="390x800">Padrão (390px)</button>
          <button type="button" class="sim-chip" data-size="430x860">Max / Ultra (430px)</button>
        </div>
      </div>

      <div class="sim-routes-row" aria-label="Navegação rápida sincronizada nos dois celulares">
        <span style="font-size:.73rem;color:var(--gold);font-weight:900;text-transform:uppercase;flex-shrink:0;margin-right:4px">Abrir nos 2 celulares:</span>
        <button type="button" class="sim-chip ${rotaSegura === '/' ? 'active' : ''}" data-sim-route="/">⌂ Início</button>
        <button type="button" class="sim-chip ${rotaSegura === '/jogos' ? 'active' : ''}" data-sim-route="/jogos">⚽ Jogos</button>
        <button type="button" class="sim-chip ${rotaSegura === '/classificacao' ? 'active' : ''}" data-sim-route="/classificacao">📊 Classificação</button>
        <button type="button" class="sim-chip ${rotaSegura === '/chaveamento' ? 'active' : ''}" data-sim-route="/chaveamento">🏆 Mata-mata</button>
        <button type="button" class="sim-chip ${rotaSegura === '/artilharia' ? 'active' : ''}" data-sim-route="/artilharia">🥇 Artilharia</button>
        <button type="button" class="sim-chip ${rotaSegura === '/equipes' ? 'active' : ''}" data-sim-route="/equipes">🛡️ Equipes</button>
        <button type="button" class="sim-chip ${rotaSegura === '/sumulas' ? 'active' : ''}" data-sim-route="/sumulas">📄 Súmulas</button>
        <button type="button" class="sim-chip ${rotaSegura === '/avaliacoes' ? 'active' : ''}" data-sim-route="/avaliacoes">★ Avaliações</button>
        <button type="button" class="sim-chip ${rotaSegura.startsWith('/dirigente') ? 'active' : ''}" data-sim-route="/dirigente">🛡️ Área da Equipe</button>
        <button type="button" class="sim-chip ${rotaSegura.startsWith('/admin') ? 'active' : ''}" data-sim-route="/admin">⚙️ Painel Admin</button>
      </div>
    </div>
  </header>

  <section class="sim-stage">
    <!-- Aparelho 1: Android -->
    <div class="device-col" id="col-android">
      <div class="device-label">🤖 <span>Android • Chrome / WebApp Instalável</span></div>
      <div class="phone-shell phone-android" data-phone-shell>
        <div class="phone-screen">
          <div class="android-statusbar">
            <span data-sim-clock>14:00</span>
            <span class="android-camera"></span>
            <span>5G ▴ 🔋 100%</span>
          </div>
          <iframe class="phone-iframe" id="frame-android" src="${esc(rotaSegura)}" title="Prévia Android"></iframe>
          <div class="android-gesture-bar"><span></span></div>
        </div>
      </div>
    </div>

    <!-- Aparelho 2: iPhone (iOS) -->
    <div class="device-col" id="col-ios">
      <div class="device-label">🍎 <span>iPhone (iOS) • Safari / Tela de Início</span></div>
      <div class="phone-shell phone-ios" data-phone-shell>
        <div class="phone-screen">
          <div class="ios-statusbar">
            <span data-sim-clock>14:00</span>
            <span class="ios-dynamic-island"></span>
            <span>Wi-Fi 🔋</span>
          </div>
          <iframe class="phone-iframe" id="frame-ios" src="${esc(rotaSegura)}" title="Prévia iPhone iOS"></iframe>
          <div class="ios-home-bar"><span></span></div>
        </div>
      </div>
    </div>
  </section>

  <section class="wifi-banner">
    <div style="max-width:680px">
      <span class="pill gold mb-1">📲 TESTAR DIRETO NO SEU APARELHO FÍSICO (ANDROID OU IPHONE)</span>
      <h3 style="margin:6px 0;font-size:1.18rem">Quer abrir agora na mão, no seu próprio celular?</h3>
      <p style="margin:0;color:#cbd5e1;font-size:.88rem;line-height:1.55">
        Conecte seu <strong>Android</strong> ou <strong>iPhone</strong> na mesma rede Wi-Fi deste computador e digite o endereço ao lado no Chrome ou Safari. Você também pode tocar em <strong>"📲 Instalar App"</strong> no topo para testar o ícone oficial na tela inicial do celular!
      </p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
      <div class="wifi-url-box">
        <span id="wifi-url-txt">${esc(urlRedeLocal)}</span>
        <button type="button" class="btn btn-gold btn-xs" id="btn-copy-wifi">Copiar Link</button>
      </div>
      <span style="font-size:.74rem;color:#93c5fd">Servidor ativo na rede local (porta 3000 liberada)</span>
    </div>
  </section>

  <script>
    (function () {
      const fAndroid = document.getElementById('frame-android');
      const fIos = document.getElementById('frame-ios');
      const colAndroid = document.getElementById('col-android');
      const colIos = document.getElementById('col-ios');
      const shells = document.querySelectorAll('[data-phone-shell]');

      // Relógio real na barra de status dos celulares
      const atualizarHora = () => {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        document.querySelectorAll('[data-sim-clock]').forEach(el => { el.textContent = hh; });
      };
      atualizarHora();
      setInterval(atualizarHora, 15000);

      // Alternar modo (Ambos / Android / iOS)
      const modeBtns = document.querySelectorAll('[data-view-mode]');
      modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          modeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const m = btn.dataset.viewMode;
          colAndroid.style.display = (m === 'ios') ? 'none' : 'flex';
          colIos.style.display = (m === 'android') ? 'none' : 'flex';
        });
      });

      // Alternar tamanho de tela
      const sizeBtns = document.querySelectorAll('[data-size]');
      sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          sizeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const [w, h] = btn.dataset.size.split('x');
          shells.forEach(s => {
            s.style.setProperty('--phone-w', w + 'px');
            s.style.setProperty('--phone-h', h + 'px');
          });
        });
      });

      // Trocar rota nos dois aparelhos ao mesmo tempo
      const routeBtns = document.querySelectorAll('[data-sim-route]');
      routeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          routeBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const r = btn.dataset.simRoute;
          fAndroid.src = r;
          fIos.src = r;
        });
      });

      // Copiar URL da rede Wi-Fi
      const btnCopy = document.getElementById('btn-copy-wifi');
      const txtUrl = document.getElementById('wifi-url-txt');
      if (btnCopy && txtUrl) {
        btnCopy.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(txtUrl.textContent.trim());
            btnCopy.textContent = '✔ Copiado!';
            setTimeout(() => { btnCopy.textContent = 'Copiar Link'; }, 2000);
          } catch (_) {}
        });
      }
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  paginaSimuladorMobile
};
