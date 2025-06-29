require('dotenv').config();
const axios = require('axios');

const appId = process.env.APP_ID;
const appSecret = process.env.APP_SECRET;
const shortLivedToken = process.env.SHOT_LIVED_TOKEN;

const gerarTokenLongoPrazo = async () => {
  try {
    const res = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = res.data.access_token;

    console.log('\n✅ Token de longo prazo gerado com sucesso:');
    console.log(longLivedToken, '\n');

    console.log('⏳ Esse token dura aproximadamente 60 dias.');
    console.log('💡 Guarde com segurança e use no seu backend!\n');
  } catch (error) {
    console.error('❌ Erro ao gerar token:', error.response?.data || error.message);
  }
};

gerarTokenLongoPrazo();