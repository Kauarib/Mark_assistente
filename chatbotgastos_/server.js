const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config(); // Carrega variáveis de ambiente do ficheiro .env

// Importa as rotas do webhook
const webhookRoutes = require('./routes/webhookRoute'); // Ajuste o caminho se a sua estrutura de pastas for diferente

const app = express();

// Middleware para analisar o corpo das requisições JSON
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000; // Usa a porta definida no .env ou 3000 como padrão

// Rota principal para verificar se o servidor está no ar (opcional)
app.get('/', (req, res) => {
    res.send('Servidor do Chatbot WhatsApp está no ar e a funcionar!');
});

// Usar as rotas do webhook com o prefixo /webhook
// Todas as rotas definidas em webhookRoutes.js (ex: GET / e POST /)
// serão acessíveis como GET /webhook e POST /webhook
app.use('/webhook', webhookRoutes);

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`[INFO] Backend do Chatbot rodando na porta ${PORT}`);
    console.log(`[INFO] Webhook esperando em http://localhost:${PORT}/webhook`);

    // Verificações de variáveis de ambiente essenciais
    if (!process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN === "SEU_TOKEN_DE_VERIFICACAO_SECRETO_AQUI") {
        console.warn("[ALERTA] WHATSAPP_VERIFY_TOKEN não foi definido corretamente no seu ficheiro .env! Use um token seguro e único.");
    } else {
        console.log(`[INFO] WHATSAPP_VERIFY_TOKEN está configurado.`);
    }

    if (!process.env.WHATSAPP_ACCESS_TOKEN) {
        console.warn("[ALERTA] WHATSAPP_ACCESS_TOKEN não definido no seu ficheiro .env! O chatbot não poderá enviar mensagens de resposta.");
    } else {
        console.log(`[INFO] WHATSAPP_ACCESS_TOKEN está configurado (primeiros caracteres: ${process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 5)}...).`);
    }

    // Adicione verificações para outras URLs de API se necessário
    if (!process.env.API_USUARIOS_URL) {
        console.warn("[ALERTA] API_USUARIOS_URL não definida no .env. A identificação de usuários pode falhar.");
    }
    if (!process.env.API_GASTOS_URL) {
        console.warn("[ALERTA] API_GASTOS_URL não definida no .env. As funcionalidades de gastos podem falhar.");
    }
});