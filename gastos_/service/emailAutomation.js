const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');
const { CriarCorrida } = require('../controllers/corridasController');
require('dotenv').config();

const remetenteParaAppId = {
  'noreply@uber.com': 1,
  'voude99@99app.com': 2
};

const config = {
  imap: {
    user: process.env.EMAIL,
    password: process.env.SENHA_APP,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false
    },
    authTimeout: 15000
  }
};

async function buscarEProcessarEmails() {
  let connection;
  try {
    connection = await imaps.connect({ imap: config.imap });
    await connection.openBox('INBOX');

    const emails = await connection.search(['UNSEEN'], { bodies: [''], markSeen: true });

    for (const email of emails) {
      const emailPart = email.parts.find(part => part.which === '');
      if (!emailPart || !emailPart.body) {
        console.log(`Corpo completo do e-mail ${email.attributes.uid} não encontrado. Pulando.`);
        continue;
      }
      const rawEmailBody = emailPart.body;

      try {
        const parsed = await simpleParser(rawEmailBody);
        let from = parsed.from?.value?.[0]?.address;

        if (!from) {
            const headerPart = email.parts.find(part => part.which === 'HEADER');
            if (headerPart && headerPart.body && headerPart.body.from && headerPart.body.from[0]) {
                const match = String(headerPart.body.from[0]).match(/<([^>]+)>/);
                from = match ? match[1] : String(headerPart.body.from[0]).trim();
                console.log(`[DEBUG] 'from' obtido via fallback do HEADER: ${from}`);
            }
        }
        
        if (!from || !remetenteParaAppId[from]) {
          console.log(`Remetente não reconhecido (${from || 'desconhecido'}) ou ausente. Ignorando e-mail UID: ${email.attributes.uid}.`);
          continue;
        }

        console.log('--- E-MAIL PROCESSADO ---');
        console.log('FROM (final):', from);
        console.log('SUBJECT:', parsed.subject);
        console.log('DATE:', parsed.date);
        console.log('PARSED.TEXT disponível:', !!parsed.text, parsed.text ? `(Length: ${parsed.text.length})` : '');
        console.log('PARSED.HTML disponível:', !!parsed.html, parsed.html ? `(Length: ${parsed.html.length})` : '');

        let conteudoPrincipal;
        let fonteConteudo = '';

        if (parsed.html && parsed.html.length > 100) {
            conteudoPrincipal = parsed.html;
            fonteConteudo = 'parsed.html';
        } else if (parsed.text) {
            conteudoPrincipal = parsed.text;
            fonteConteudo = 'parsed.text';
        } else if (parsed.textAsHtml) {
            conteudoPrincipal = parsed.textAsHtml;
            fonteConteudo = 'parsed.textAsHtml';
        } else {
            conteudoPrincipal = '';
            fonteConteudo = 'nenhum';
        }
        
        console.log(`[DEBUG] Fonte do conteúdo principal para extração (${from}): ${fonteConteudo}`);

        if (!conteudoPrincipal) {
            console.log(`Conteúdo principal do e-mail de ${from} está vazio após o parse. Pulando.`);
            continue;
        }

        let valor;
        let cartaoString; // Renomeado para indicar que é a string dos 4 dígitos
        const appId = remetenteParaAppId[from];

        if (from === 'noreply@uber.com') {
          console.log(`\n--- DEBUG TENTATIVAS DE EXTRAÇÃO UBER (UID: ${email.attributes.uid}) ---`);
          
          let valorMatchUber = conteudoPrincipal.match(/R\$ ?(\d+,\d{2})/);
          if (valorMatchUber && valorMatchUber[0]) {
              valor = valorMatchUber[0];
              console.log('[DEBUG UBER] Valor (tentativa 1 - geral):', valor);
          } else {
              console.log('[DEBUG UBER] Valor (tentativa 1 - geral) FALHOU.');
              const valorTotalHtmlMatch = conteudoPrincipal.match(/<td class="Uber18_p3 total_head"[^>]*>R\$\s*([\d,]+)<\/td>/i);
              if (valorTotalHtmlMatch && valorTotalHtmlMatch[1]) {
                  valor = `R$ ${valorTotalHtmlMatch[1].replace('.', ',')}`;
                  console.log('[DEBUG UBER] Valor (tentativa 2 - HTML específico):', valor);
              } else {
                  console.log('[DEBUG UBER] Valor (tentativa 2 - HTML específico) FALHOU.');
                  const valorCabecalhoMatch = conteudoPrincipal.match(/Total\s*<span class="Uber18_text_p2"[^>]*>R\$\s*([\d,]+)<\/span>/i);
                  if (valorCabecalhoMatch && valorCabecalhoMatch[1]) {
                    valor = `R$ ${valorCabecalhoMatch[1].replace('.', ',')}`;
                    console.log('[DEBUG UBER] Valor (tentativa 3 - HTML cabeçalho):', valor);
                  } else {
                    console.log('[DEBUG UBER] Valor (tentativa 3 - HTML cabeçalho) FALHOU.');
                  }
              }
          }

          const cartaoMatchUber = conteudoPrincipal.match(/[•*]{4}(\d{4})/);
          cartaoString = cartaoMatchUber ? cartaoMatchUber[1] : undefined; // String: "7009"
          if (cartaoString) {
            console.log('[DEBUG UBER] Cartão (string):', cartaoString);
          } else {
            console.log('[DEBUG UBER] Cartão: FALHOU EXTRAÇÃO.');
          }

        } else if (from === 'voude99@99app.com') {
          console.log(`\n--- DEBUG TENTATIVAS DE EXTRAÇÃO 99APP (UID: ${email.attributes.uid}) ---`);
          const valorMatch99 = conteudoPrincipal.match(/R\$ ?(\d+,\d{2})/);
          valor = valorMatch99 ? valorMatch99[0] : undefined;
           if (valor) {
            console.log('[DEBUG 99APP] Valor:', valor);
          } else {
            console.log('[DEBUG 99APP] Valor: FALHOU EXTRAÇÃO.');
          }
          
          cartaoString = undefined; 
          console.log('[DEBUG 99APP] Cartão (string): Definido como undefined (informação não disponível no e-mail).');
        }

        console.log('--- DADOS EXTRAÍDOS (FINAL) ---');
        console.log('FROM:', from);
        console.log('VALOR:', valor);
        console.log('CARTÃO (string):', cartaoString); // Log da string do cartão
        
        if (valor && appId && parsed.date) {
          let pagamentoInt = null; // Valor padrão para pagamento como INT
          if (cartaoString) {
            const parsedCartao = parseInt(cartaoString, 10);
            if (!isNaN(parsedCartao)) {
              pagamentoInt = parsedCartao;
            } else {
              console.warn(`[WARN] Não foi possível converter cartaoString "${cartaoString}" para INT.`);
            }
          }
          console.log('PAGAMENTO (INT a ser enviado):', pagamentoInt);


          const mockReq = {
            body: {
              data: parsed.date.toISOString().split('T')[0],
              valor: parseFloat(valor.replace('R$', '').replace(',', '.').trim()),
              pagamento: pagamentoInt, // Envia o INT ou null
              id_apps: appId
            }
          };

          const mockRes = {
            status: function(statusCode) {
              console.log(`[CriarCorrida MOCK RES] Status Code: ${statusCode}`);
              return this; 
            },
            json: function(data) {
              console.log('[CriarCorrida MOCK RES] JSON Response:', data);
            },
            send: function(data) {
              console.log('[CriarCorrida MOCK RES] Send Response:', data);
            }
          };

          try {
            console.log('[DEBUG] Chamando CriarCorrida com mockReq.body:', mockReq.body);
            await CriarCorrida(mockReq, mockRes); 
            console.log('Chamada para CriarCorrida concluída (verifique logs de mockRes).');

          } catch (err) {
            console.error('Erro DURANTE a chamada para CriarCorrida:', err.message, err.stack);
          }
        } else {
            console.log('Dados insuficientes para registrar corrida (verifique VALOR, APPID, DATA):');
            console.log(`  Valor: ${valor}, Cartão (string): ${cartaoString}, AppId: ${appId}, Data: ${parsed.date}`);
        }

      } catch (parseError) {
        console.error(`Erro ao parsear e-mail UID: ${email.attributes.uid}:`, parseError);
      }
    }
  } catch (err) {
    console.error('Erro na conexão IMAP ou processamento de e-mails:', err);
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

module.exports = { buscarEProcessarEmails };

// Para testar localmente (descomente e execute este arquivo com node seuArquivo.js):

/*(async () => {
  try {
    await buscarEProcessarEmails();
    console.log('Processamento de e-mails concluído.');
  } catch (e) {
    console.error('Erro geral ao executar buscarEProcessarEmails:', e);
  }
})(); 
*/

