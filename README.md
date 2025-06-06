# Projeto de Controle de Gastos com Automação de E-mails e Chatbot WhatsApp 📊📧🤖

## 🚀 Visão Geral

Este projeto é um sistema de controlo de gastos pessoais que consiste em três componentes principais:
1.  **API de Controlo de Gastos (Node.js & Express.js):** Um backend robusto para gerir utilizadores, aplicações (ex: Uber, 99), formas de pagamento e registos de corridas/gastos.
2.  **Automação de E-mails (Python):** Um script Python que lê automaticamente e-mails de serviços de corrida (como Uber e 99), extrai os detalhes dos gastos e envia esses dados para a API de Controlo de Gastos.
3.  **Backend do Chatbot WhatsApp (Node.js & Express.js):** Um servidor que se integra com a Cloud API da WhatsApp Business Platform (Meta) para permitir que os utilizadores interajam com o sistema de controlo de gastos através de mensagens no WhatsApp.

O objetivo é fornecer uma forma automatizada e conversacional de gerir e consultar despesas pessoais.

## ✨ Funcionalidades

### 1. API de Controlo de Gastos (Node.js) ⚙️
* **Gestão de Utilizadores:**
    * Registo de novos utilizadores (com hashing de senha usando `bcrypt`).
    * Login de utilizadores (com geração de `JWT`).
    * Configuração segura de credenciais IMAP por utilizador (e-mail de login e senha de aplicação encriptada usando AES-256).
    * Endpoint para fornecer credenciais IMAP encriptadas para a automação Python (protegido por API Key).
* **Gestão de Aplicações** (fontes de gastos, ex: Uber, 99):
    * Criação e listagem de aplicações, identificadas pelo e-mail do remetente.
* **Gestão de Formas de Pagamento:**
    * Criação e listagem de formas de pagamento (ex: Visa, Mastercard, Cartão de Crédito/Débito).
* **Gestão de Corridas/Gastos:**
    * Criação de novos registos de gastos, associados a um utilizador, aplicação e forma de pagamento.
    * Listagem de gastos com filtros por utilizador, data (ano/mês/dia exato), aplicação, forma de pagamento e últimos dígitos do cartão.

### 2. Automação de E-mails (Python) 🐍📧
* Conexão segura a contas de e-mail IMAP (usando credenciais obtidas da API de Controlo de Gastos).
* Busca por e-mails não lidos de remetentes configurados (ex: Uber, 99).
* Parsing do conteúdo do e-mail (HTML e texto).
* Extração de dados relevantes: valor do gasto, data, últimos dígitos do cartão (se disponível), e inferência da forma de pagamento.
* Comunicação com a API de Controlo de Gastos para:
    * Obter/criar `Id_apps` com base no e-mail do remetente.
    * Obter/criar `id_forma_pagamento` com base na descrição inferida.
    * Enviar os dados da corrida extraídos para registo.
* Execução contínua em loop com intervalos configuráveis.
* Marcação de e-mails como lidos após o processamento (funcionalidade a ser ativada).

### 3. Backend do Chatbot WhatsApp (Node.js) 💬🤖
* Integração com a Cloud API da WhatsApp Business Platform (Meta).
* Verificação de Webhook com a Meta.
* Recebimento de mensagens de utilizadores via webhook.
* Identificação do utilizador com base no número de WhatsApp (consultando a API de Controlo de Gastos).
* Processamento de comandos de texto e respostas a botões interativos.
* Lógica de conversação para:
    * Saudação personalizada 👋.
    * Apresentação de menu com botões de resposta rápida.
    * Consulta de soma de gastos mensais 💰 (chamando a API de Controlo de Gastos).
    * (Em desenvolvimento 🚧) Adicionar novos gastos.
    * (Em desenvolvimento 🚧) Filtrar gastos por forma de pagamento.
    * (Em desenvolvimento 🚧) Configurar e enviar resumos programados e alertas de gastos.
* Envio de mensagens de texto e interativas (botões) de volta para o utilizador através da API da Meta.
* Arquitetura em camadas (Rotas, Controladores, Serviços).

## 🛠️ Tecnologias Utilizadas

* **Backend Principal (API de Controlo de Gastos & Backend do Chatbot):**
    * Node.js <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="Node.js" width="20" height="20"/>
    * Express.js <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original-wordmark.svg" alt="Express.js" width="20" height="20"/>
    * Sequelize (ORM) <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/sequelize/sequelize-original.svg" alt="Sequelize" width="20" height="20"/>
    * MySQL (ou PostgreSQL, SQLite) <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mysql/mysql-original-wordmark.svg" alt="MySQL" width="20" height="20"/>
    * `bcryptjs` (hashing)
    * `jsonwebtoken` (JWT)
    * `dotenv` (variáveis de ambiente)
    * `crypto` (encriptação AES)
    * `axios` ou `node-fetch` (chamadas HTTP)
* **Automação de E-mails:**
    * Python 3 <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/python/python-original.svg" alt="Python" width="20" height="20"/>
    * `imaplib` & `email` (IMAP & MIME)
    * `requests` (chamadas HTTP)
    * `beautifulsoup4` & `lxml` (parsing HTML)
    * `python-dotenv` (variáveis de ambiente)
    * `cryptography` (decriptação)
* **Comunicação com WhatsApp:**
    * Cloud API da WhatsApp Business Platform (Meta)
    * `ngrok` (desenvolvimento de webhook)

## 📁 Estrutura do Projeto (Alto Nível)

/projeto_gastos/||-- /api_controle_gastos_nodejs/  (Backend Principal) ⚙️|   |-- config/|   |-- controllers/|   |   |-- usuariosController.js|   |   |-- corridasController.js|   |   |-- aplicativosController.js|   |   |-- formasPagamentosController.js|   |-- middleware/|   |   |-- authMiddleware.js (para JWT)|   |-- models/|   |   |-- Usuarios.js|   |   |-- Corridas.js|   |   |-- Aplicativos.js|   |   |-- FormasPagamentos.js|   |   |-- index.js (configuração do Sequelize e associações)|   |-- routes/|   |   |-- usuariosRoutes.js|   |   |-- corridasRoutes.js|   |   |-- ... (outras rotas)|   |-- .env|   |-- server.js (ou app.js)|   |-- package.json||-- /automacao_emails_python/ 🐍|   |-- .env|   |-- email_automation.py|   |-- requirements.txt||-- /chatbot_whatsapp_nodejs/  (Backend do Chatbot) 🤖|   |-- controllers/|   |   |-- webhookController.js|   |-- routes/|   |   |-- webhookRoutes.js|   |-- services/|   |   |-- chatbotService.js|   |   |-- whatsappApiService.js|   |-- .env|   |-- server.js (ou app.js)|   |-- package.json
## ⚙️ Configuração e Instalação

### 1. API de Controlo de Gastos (Node.js)
   * Clone o repositório (se aplicável).
   * Navegue para a pasta `api_controle_gastos_nodejs`.
   * Crie um ficheiro `.env` (veja `.env.example`) e configure:
     * Credenciais da base de dados.
     * `JWT_SECRET`.
     * `IMAP_ENCRYPTION_KEY`.
     * `PYTHON_SCRIPT_API_KEY`.
   * Instale as dependências: `npm install`
   * Execute as migrações: `npx sequelize-cli db:migrate` (ou `sequelize.sync()`).

### 2. Automação de E-mails (Python)
   * Navegue para a pasta `automacao_emails_python`.
   * Crie um ambiente virtual: `python -m venv venv` e ative-o.
   * Instale as dependências: `pip install -r requirements.txt`.
   * Crie um ficheiro `.env` e configure as URLs da API, `PYTHON_SCRIPT_API_KEY`, `TARGET_USER_ID`, `IMAP_ENCRYPTION_KEY`, `INTERVALO_VERIFICACAO_SEGUNDOS`.

### 3. Backend do Chatbot WhatsApp (Node.js)
   * Navegue para a pasta `chatbot_whatsapp_nodejs`.
   * Crie um ficheiro `.env` e configure: `PORT`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, URLs das APIs internas, `INTERNAL_API_KEY`.
   * Instale as dependências: `npm install`.

## ▶️ Executar a Aplicação

1.  **API de Controlo de Gastos (Node.js):**
    ```bash
    cd api_controle_gastos_nodejs
    npm start
    ```
    API rodando (ex: `http://localhost:5000`).

2.  **Backend do Chatbot WhatsApp (Node.js):**
    ```bash
    cd chatbot_whatsapp_nodejs
    npm start
    ```
    Servidor do chatbot rodando (ex: `http://localhost:3000`).
    * Use `ngrok http 3000` para expor o webhook.
    * Configure a URL do `ngrok` e o `WHATSAPP_VERIFY_TOKEN` na Meta.
    * Subscreva ao evento `messages`.

3.  **Automação de E-mails (Python):**
    ```bash
    cd automacao_emails_python
    source venv/bin/activate # Ou venv\Scripts\activate
    python email_automation.py
    ```
    Script a verificar e-mails.

## 📲 Endpoints da API de Controlo de Gastos (Exemplos)

* `POST /api/usuarios/registrar`
* `POST /api/usuarios/login`
* `POST /api/usuarios/configurar-imap` (Protegido por JWT)
* `GET /api/usuarios/{id_usuario}/obter-credenciais-imap` (Protegido por API Key)
* `POST /api/aplicativos`
* `GET /api/aplicativos?email=...`
* `POST /api/formas-pagamento`
* `GET /api/formas-pagamento?descricao=...`
* `POST /api/corridas`
* `GET /api/corridas?id_usuario=...&ano=...&mes=...`

## 💬 Comandos do Chatbot WhatsApp (Exemplos Iniciais)

* "menu", "olá", "ajuda": Mostra mensagem de boas-vindas com botões.
* (Botão) "Gastos do Mês" / Texto "gastos mensais": Retorna soma dos gastos do mês.
* (Botão) "Adicionar Gasto": Inicia fluxo para adicionar gasto (🚧).
* (Botão) "Alertas de Gastos": Lógica para configurar alertas (🚧).

## 🔮 Melhorias Futuras

* **Chatbot:**
    * Implementar todas as funcionalidades planeadas.
    * Usar NLP para comandos mais complexos.
    * Gestão de estado da conversa.
    * Mais tipos de mensagens interativas.
    * Registo/vinculação de WhatsApp via chat.
* **Automação de E-mails:**
    * Suporte a mais provedores/formatos de e-mail.
    * Melhorar extração de dados.
    * Interface para gestão de contas monitorizadas.
* **API de Controlo de Gastos:**
    * Endpoints para relatórios detalhados.
    * Paginação.
* **Segurança:**
    
    * Reforçar segurança dos endpoints.
    * Considerar OAuth 2.0 para IMAP.
* **Frontend Web:** 🖥️ Criar uma interface web.


