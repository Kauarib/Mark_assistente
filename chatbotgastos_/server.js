const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const {
  getTokenAtual,
  verificarValidadeToken,
  gerarTokenLongoPrazo
} = require('./service/tokenService');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Rota de teste
app.get('/', (req, res) => {
  res.send('Servidor do Chatbot WhatsApp está no ar e a funcionar!');
});

// Webhook
const webhookRoutes = require('./routes/webhookRoute');
app.use('/webhook', webhookRoutes);

// Inicializa verificação de token
async function inicializarToken() {
  const tokenValido = verificarValidadeToken();

  if (!tokenValido) {
    console.log('[INFO] Token inválido ou vencido. Gerando novo token de longa duração...');
    const novoToken = await gerarTokenLongoPrazo(
      process.env.APP_ID,
      process.env.APP_SECRET,
      process.env.FB_SHORT_TOKEN
    );

    if (!novoToken || !novoToken.access_token) {
      console.error('[FATAL] Não foi possível gerar o token de acesso. Encerrando o servidor...');
      process.exit(1);
    } else {
      console.log(`[INFO] Novo token gerado com sucesso (prefixo: ${novoToken.access_token.substring(0, 5)}...)`);
    }
  } else {
    const token = getTokenAtual();

    if (!token || typeof token !== 'string') {
      console.warn('[ALERTA] Token inválido ou não definido no token.json!');
    } else {
      console.log(`[INFO] Token já é válido (prefixo: ${token.substring(0, 5)}...)`);
    }
  }
}

// Inicia servidor e validações
app.listen(PORT, async () => {
  console.log(`[INFO] Backend rodando na porta ${PORT}`);
  console.log(`[INFO] Webhook disponível em http://localhost:${PORT}/webhook`);

  // Verificação do token de verificação do webhook
  if (!process.env.WHATSAPP_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN === "SEU_TOKEN_DE_VERIFICACAO_SECRETO_AQUI") {
    console.warn("[ALERTA] WHATSAPP_VERIFY_TOKEN não foi definido corretamente!");
  } else {
    console.log(`[INFO] WHATSAPP_VERIFY_TOKEN está configurado.`);
  }

  // URLs das APIs
  if (!process.env.API_USUARIOS_URL) {
    console.warn("[ALERTA] API_USUARIOS_URL não está definida no .env.");
  }
  if (!process.env.API_GASTOS_URL) {
    console.warn("[ALERTA] API_GASTOS_URL não está definida no .env.");
  }

  // Inicializa a lógica do token do WhatsApp
  await inicializarToken();
});
