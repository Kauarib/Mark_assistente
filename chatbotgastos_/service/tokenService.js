const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { log } = require('../utils/logger');
const dotenv = require('dotenv').config();

const TOKEN_FILE = path.join(__dirname, '..', 'token.json');


/**
 * Gera um token de longa duração usando um token curto da Meta API
 */
async function gerarTokenLongoPrazo() {

  const { APP_ID, APP_SECRET, FB_SHORT_TOKEN } = process.env;
  console.log("APP_ID:", process.env.APP_ID);
  console.log("APP_SECRET:", process.env.APP_SECRET);

  if (!APP_ID || !APP_SECRET || !FB_SHORT_TOKEN) {
    log('❌ Variáveis de ambiente APP_ID, APP_SECRET ou FB_SHORT_TOKEN não estão definidas!');
    return null;
  }

  try {
    const { data } = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: APP_ID,
        client_secret: APP_SECRET,
        fb_exchange_token: FB_SHORT_TOKEN,
      },
    });

    if (!data.access_token) {
      log('❌ Resposta da Meta não contém access_token!');
      return null;
    }

    const tokenLongo = {
      access_token: data.access_token,
      created_at: new Date().toISOString(),
      expires_in: 60 * 24 * 60 * 60 // 60 dias em segundos
    };

    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenLongo, null, 2));
    log('✅ Token de longa duração salvo com sucesso!');
    return tokenLongo;
  } catch (err) {
    log(`❌ Erro ao gerar token: ${err.response?.data?.error?.message || err.message}`);
    return null;
  }
}

/**
 * Verifica se o token atual é válido com base na data de criação
 */
function verificarValidadeToken() {
  if (!fs.existsSync(TOKEN_FILE)) return false;

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));

    if (!token.access_token || !token.created_at || !token.expires_in) {
      log('⚠️ token.json está incompleto ou inválido.');
      return false;
    }

    const criadoEm = new Date(token.created_at);
    const agora = new Date();

    const diasPassados = Math.floor((agora - criadoEm) / (1000 * 60 * 60 * 24));
    const diasRestantes = 60 - diasPassados;

    if (diasRestantes <= 10) {
      log('⚠️ Token está perto de expirar. Gere um novo!');
      return false;
    }

    log(`ℹ️ Token válido. Dias restantes: ${diasRestantes}`);
    return true;
  } catch (err) {
    log(`❌ Erro ao ler token.json: ${err.message}`);
    return false;
  }
}

/**
 * Retorna o token atual salvo no arquivo
 */
function getTokenAtual() {
  if (!fs.existsSync(TOKEN_FILE)) return null;

  try {
    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return token.access_token || null;
  } catch (err) {
    log(`❌ Erro ao ler token.json: ${err.message}`);
    return null;
  }
}

module.exports = {
  gerarTokenLongoPrazo,
  verificarValidadeToken,
  getTokenAtual
};

