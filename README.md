# 🏆 Portal Oficial — Campeonato Municipal de Futebol de Quiterianópolis 2026

Plataforma web e PWA completa (**Portal Público do Torcedor + Área das Equipes + Painel Administrativo com Operação Ao Vivo**) desenvolvida sob medida para a **Prefeitura Municipal de Quiterianópolis • Secretaria Municipal de Esportes** (Estádio Tualdão).

## 🚀 Como executar localmente no computador

```powershell
cd C:\Users\SeLigaTV\.gemini\antigravity\scratch\campeonato-quiterianopolis-2026
node src/server.js
```

Acesse no navegador:
- **Portal Público:** http://localhost:3000
- **Área do Representante da Equipe:** http://localhost:3000/dirigente
  - Senha inicial padrão das 12 equipes: `equipe2026` (CPFs iniciais listados na tela de login para homologação)
- **Painel Administrativo (Comissão Organizadora):** http://localhost:3000/admin
  - CPF inicial: `000.000.000-00`
  - Senha inicial: `admin2026`

## ☁️ Como hospedar na nuvem (ex.: Railway ou Render)

1. Suba esta pasta em um repositório GitHub privado.
2. No **Railway** (ou Render), conecte o repositório:
   - Comando de inicialização: `npm start` (`node src/server.js`)
   - Variável `PORT`: atribuída automaticamente pela hospedagem
   - Crie um **Volume Persistente** montado em `/data` e defina a variável de ambiente `DATA_DIR=/data` para manter o banco SQLite intacto entre atualizações.
3. Antes da estreia oficial, altere a senha administrativa em `/admin/configuracoes` e defina os CPFs/senhas reais dos 12 dirigentes em `/admin/equipes`.
