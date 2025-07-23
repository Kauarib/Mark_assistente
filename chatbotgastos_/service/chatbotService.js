const whatsappApiService = require('./whatsappService'); // Para enviar mensagens
const axios = require('axios'); // Usaremos axios para chamar outras APIs
require('dotenv').config(); // Para carregar variáveis de ambiente

const API_USUARIOS_URL = process.env.API_USUARIOS_URL; 
const API_GASTOS_URL = process.env.API_GASTOS_URL; 
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY; // Chave para proteger chamadas internas à sua API

async function identificarUsuarioPorWhatsapp(numeroWhatsapp) {
    if (!API_USUARIOS_URL) {
        console.error("[CHATBOT SERVICE] API_USUARIOS_URL não definida no .env.");
        return null;
    }
    if (!numeroWhatsapp) {
        console.error("[CHATBOT SERVICE] Número do WhatsApp não fornecido para identificação.");
        return null;
    }
    try {
        console.log(`[CHATBOT SERVICE] Identificando usuário com WhatsApp: ${numeroWhatsapp}`);
        const headers = { 'Content-Type': 'application/json' };
        if (INTERNAL_API_KEY) {
            headers['x-api-key'] = INTERNAL_API_KEY; 
        }
        const response = await axios.get(`${API_USUARIOS_URL}`, { 
            params: { numero_whatsapp: numeroWhatsapp },
            headers: headers 
        });
        
        let usuarioEncontrado = null;
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            usuarioEncontrado = response.data[0];
        } else if (response.data && typeof response.data === 'object' && response.data.id_usuario) { // Assumindo que sua API pode retornar um objeto único
            usuarioEncontrado = response.data;
        }

        if (usuarioEncontrado && usuarioEncontrado.id_usuario) {
            const infoUsuario = {
                id: usuarioEncontrado.id_usuario,
                nome: usuarioEncontrado.nome_usuario || "Usuário" // Fallback se nome_usuario não existir/for nulo
            };
            console.log(`[CHATBOT SERVICE] Usuário encontrado: ID=${infoUsuario.id}, Nome=${infoUsuario.nome}`);
            return infoUsuario;
        } else {
            console.log(`[CHATBOT SERVICE] Nenhum usuário encontrado para o WhatsApp: ${numeroWhatsapp}. Resposta API:`, response.data);
            return null;
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.log(`[CHATBOT SERVICE] Usuário não encontrado (404) para WhatsApp: ${numeroWhatsapp}`);
        } else {
            console.error("[CHATBOT SERVICE] Erro ao identificar usuário via API:", error.message);
            if(error.response) console.error("Detalhes do erro API Usuários:", error.response.data);
        }
        return null;
    }
}

async function obterSomaGastosMensais(idUsuario, ano, mes) {
    if (!API_GASTOS_URL) {
        console.error("[CHATBOT SERVICE] API_GASTOS_URL não definida no .env.");
        return { soma: null, erro: "Configuração da API de gastos ausente." };
    }
    if (!idUsuario || !ano || !mes) {
        console.error("[CHATBOT SERVICE] Parâmetros ausentes para obterSomaGastosMensais (idUsuario, ano, mes).");
        return { soma: null, erro: "Dados insuficientes para buscar gastos." };
    }
    try {
        console.log(`[CHATBOT SERVICE] Buscando gastos para usuário ID: ${idUsuario}, Ano: ${ano}, Mês: ${mes}`);
        const headers = { 'Content-Type': 'application/json' };
        if (INTERNAL_API_KEY) {
            headers['x-api-key'] = INTERNAL_API_KEY;
        }
        const response = await axios.get(`${API_GASTOS_URL}`, {
            params: { id_usuario: idUsuario, ano: ano, mes: mes },
            headers: headers,
            timeout: 10000
        });
        if (response.data && Array.isArray(response.data)) {
            const corridasDoMes = response.data;
            let somaTotal = 0;
            if (corridasDoMes.length === 0) {
                console.log(`[CHATBOT SERVICE] Nenhum gasto encontrado para usuário ${idUsuario} em ${ano}-${mes}.`);
                return { soma: 0, erro: null };
            }
            corridasDoMes.forEach(corrida => {
                const valorNumerico = parseFloat(corrida.valor);
                if (!isNaN(valorNumerico)) {
                    somaTotal += valorNumerico;
                } else {
                    console.warn(`[CHATBOT SERVICE] Valor inválido encontrado na corrida ID ${corrida.id}: ${corrida.valor}`);
                }
            });
            console.log(`[CHATBOT SERVICE] Soma dos gastos para ${ano}-${mes} do usuário ${idUsuario}: ${somaTotal.toFixed(2)}`);
            return { soma: somaTotal, erro: null };
        } else {
            console.log(`[CHATBOT SERVICE] Resposta inesperada da API de gastos para ${ano}-${mes}. Recebido:`, response.data);
            return { soma: null, erro: "Resposta inesperada da API de gastos." };
        }
    } catch (error) {
        console.error(`[CHATBOT SERVICE] Erro ao buscar gastos mensais da API (${API_GASTOS_URL}):`, error.message);
        if (error.response) {
            console.error("Detalhes do erro API Gastos:", error.response.status, error.response.data);
            return { soma: null, erro: `Erro da API de gastos: ${error.response.status}` };
        }
        return { soma: null, erro: "Erro de comunicação com a API de gastos." };
    }
}
async function obterSomaGastosTrimestral(idUsuario, ano, trimestre) {
    if (!API_GASTOS_URL) {
        console.error("[CHATBOT SERVICE] API_GASTOS_URL não definida no .env.");
        return { soma: null, erro: "Configuração da API de gastos ausente." };
    }
    if (!idUsuario || !ano || !trimestre) {
        console.error("[CHATBOT SERVICE] Parâmetros ausentes para obterSomaGastosTrimestral (idUsuario, ano, trimestre).");
        return { soma: null, erro: "Dados insuficientes para buscar gastos." };
    }
    try {
        console.log(`[CHATBOT SERVICE] Buscando gastos trimestrais para usuário ID: ${idUsuario}, Ano: ${ano}, Trimestre: ${trimestre}`);
        const headers = { 'Content-Type': 'application/json' };
        if (INTERNAL_API_KEY) {
            headers['x-api-key'] = INTERNAL_API_KEY;
        }
        const response = await axios.get(`${API_GASTOS_URL}`, {
            params: { id_usuario: idUsuario, ano: ano, trimestre: trimestre },
            headers: headers,
            timeout: 10000
        });
        if (response.data && Array.isArray(response.data)) {
            const corridasDoTrimestre = response.data;
            let somaTotal = 0;
            if (corridasDoTrimestre.length === 0) {
                console.log(`[CHATBOT SERVICE] Nenhum gasto encontrado para usuário ${idUsuario} no trimestre ${trimestre} de ${ano}.`);
                return { soma: 0, erro: null };
            }
            corridasDoTrimestre.forEach(corrida => {
                const valorNumerico = parseFloat(corrida.valor);
                if (!isNaN(valorNumerico)) {
                    somaTotal += valorNumerico;
                } else {
                    console.warn(`[CHATBOT SERVICE] Valor inválido encontrado na corrida ID ${corrida.id}: ${corrida.valor}`);
                }
            });
            console.log(`[CHATBOT SERVICE] Soma dos gastos trimestrais para o trimestre ${trimestre} de ${ano} do usuário ${idUsuario}: R$ ${somaTotal.toFixed(2)}`);
            return { soma: somaTotal, erro: null };
        } else {
            console.log(`[CHATBOT SERVICE] Resposta inesperada da API de gastos para o trimestre ${trimestre} de ${ano}. Recebido:`, response.data);
            return { soma: null, erro: "Resposta inesperada da API de gastos." };
        }

    } catch (error) {
        console.error(`[CHATBOT SERVICE] Erro ao buscar gastos trimestrais da API (${API_GASTOS_URL}):`, error.message);
        if (error.response) {
            console.error("Detalhes do erro API Gastos:", error.response.status, error.response.data);
            return { soma: null, erro: `Erro da API de gastos: ${error.response.status}` };
        }
        return { soma: null, erro: "Erro de comunicação com a API de gastos." };
    }
  
    
}
async function obterSomaGastosAnual(idUsuario, ano, opcao) {
     
    if (!API_GASTOS_URL) {
        console.error("[CHATBOT SERVICE] API_GASTOS_URL não definida no .env.");
        return { soma: null, erro: "Configuração da API de gastos ausente." };
    }
    if (!idUsuario || !ano || opcao === undefined) {
        console.error("[CHATBOT SERVICE] Parâmetros ausentes para obterSomaGastosAnual (idUsuario, ano, opcao).");
        return { soma: null, erro: "Dados insuficientes para buscar gastos." };
    }
    try {
        console.log(`[CHATBOT SERVICE] Buscando gastos anuais para usuário ID: ${idUsuario}, Ano: ${ano}, Opção: ${opcao}`);
        const headers = { 'Content-Type': 'application/json' };
        if (INTERNAL_API_KEY) {
            headers['x-api-key'] = INTERNAL_API_KEY;
        }
        const response = await axios.get(`${API_GASTOS_URL}`, {
            params: { id_usuario: idUsuario, ano: ano, opcao: opcao },
            headers: headers,
            timeout: 10000
        });
        if (response.data && Array.isArray(response.data)) {
            const corridasDoAno = response.data;
            let somaTotal = 0;
            if (corridasDoAno.length === 0) {
                console.log(`[CHATBOT SERVICE] Nenhum gasto encontrado para usuário ${idUsuario} no ano ${ano}.`);
                return { soma: 0, erro: null };
            }
            corridasDoAno.forEach(corrida => {
                const valorNumerico = parseFloat(corrida.valor);
                if (!isNaN(valorNumerico)) {
                    somaTotal += valorNumerico;
                } else {
                    console.warn(`[CHATBOT SERVICE] Valor inválido encontrado na corrida ID ${corrida.id}: ${corrida.valor}`);
                }
            });
            console.log(`[CHATBOT SERVICE] Soma dos gastos anuais para o ano ${ano} do usuário ${idUsuario}: R$ ${somaTotal.toFixed(2)}`);
            return { soma: somaTotal, erro: null };
        } else {
            console.log(`[CHATBOT SERVICE] Resposta inesperada da API de gastos para o ano ${ano}. Recebido:`, response.data);
            return { soma: null, erro: "Resposta inesperada da API de gastos."};
        }
    } catch (error) {
        console.error(`[CHATBOT SERVICE] Erro ao buscar gastos anuais da API (${API_GASTOS_URL}):`, error.message);
        if (error.response) {
            console.error("Detalhes do erro API Gastos:", error.response.status, error.response.data);
            return { soma: null, erro: `Erro da API de gastos: ${error.response.status}` };
        }
        return { soma: null, erro: "Erro de comunicação com a API de gastos." };
    }
}
async function obterGastosPeriodoPersonalizado(idUsuario, dataInicio, dataFim) {
    if (!API_GASTOS_URL) {
        console.error("[CHATBOT SERVICE] API_GASTOS_URL não definida no .env.");
        return { soma: null, erro: "Configuração da API de gastos ausente." };
    }
    if (!idUsuario || !dataInicio || !dataFim) {
        console.error("[CHATBOT SERVICE] Parâmetros ausentes para obterGastosPeriodoPersonalizado (idUsuario, dataInicio, dataFim).");
        return { soma: null, erro: "Dados insuficientes para buscar gastos." };
    }
    try {
        console.log(`[CHATBOT SERVICE] Buscando gastos personalizados para usuário ID: ${idUsuario}, Data Início: ${dataInicio}, Data Fim: ${dataFim}`);
        const headers = { 'Content-Type': 'application/json' };
        if (INTERNAL_API_KEY) {
            headers['x-api-key'] = INTERNAL_API_KEY;
        }
        const response = await axios.get(`${API_GASTOS_URL}`, {
            params: { id_usuario: idUsuario, data_inicio: dataInicio, data_fim: dataFim },
            headers: headers,
            timeout: 10000
        });
        if (response.data && Array.isArray(response.data)) {
            const corridasDoPeriodo = response.data;
            let somaTotal = 0;
            if (corridasDoPeriodo.length === 0) {
                console.log(`[CHATBOT SERVICE] Nenhum gasto encontrado para usuário ${idUsuario} no período de ${dataInicio} a ${dataFim}.`);
                return { soma: 0, erro: null };
            }
            corridasDoPeriodo.forEach(corrida => {
                const valorNumerico = parseFloat(corrida.valor);
                if (!isNaN(valorNumerico)) {
                    somaTotal += valorNumerico;
                } else {
                    console.warn(`[CHATBOT SERVICE] Valor inválido encontrado na corrida ID ${corrida.id}: ${corrida.valor}`);
                }
            });
            console.log(`[CHATBOT SERVICE] Soma dos gastos no período de ${dataInicio} a ${dataFim} do usuário ${idUsuario}: R$ ${somaTotal.toFixed(2)}`);
            return { soma: somaTotal, erro: null };
        } else {
            console.log(`[CHATBOT SERVICE] Resposta inesperada da API de gastos para o período. Recebido:`, response.data);
            return { soma: null, erro: "Resposta inesperada da API de gastos." };
        }
    } catch (error) {
        console.error(`[CHATBOT SERVICE] Erro ao buscar gastos do período personalizado da API (${API_GASTOS_URL}):`, error.message);
        if (error.response) {
            console.error("Detalhes do erro API Gastos:", error.response.status, error.response.data);
            return { soma: null, erro: `Erro da API de gastos: ${error.response.status}` };
        }
        return { soma: null, erro: "Erro de comunicação com a API de gastos." };
    }
    
}

const gerirMensagemRecebida = async (mensagemInfoWhatsapp, metadataWhatsapp) => {
    const numeroRemetente = mensagemInfoWhatsapp.from;
    const idNumeroTelefoneBot = metadataWhatsapp.phone_number_id;
    console.log(`[CHATBOT SERVICE] Gerindo mensagem de: ${numeroRemetente} para o bot ${idNumeroTelefoneBot}`);
    
    const infoUsuario = await identificarUsuarioPorWhatsapp(numeroRemetente); // Agora retorna { id, nome } ou null

    if (!infoUsuario) {
        console.log(`[CHATBOT SERVICE] Usuário com WhatsApp ${numeroRemetente} não registrado ou não identificado.`);
        await whatsappApiService.enviarMensagemTexto(idNumeroTelefoneBot, numeroRemetente, "Olá! Para utilizar o assistente de controle de gastos, por favor, primeiro realize seu cadastro ou vincule seu número WhatsApp em nosso sistema.");
        return;
    }
    console.log(`[CHATBOT SERVICE] Usuário identificado: ID=${infoUsuario.id}, Nome=${infoUsuario.nome}`);

    const tipoMensagem = mensagemInfoWhatsapp.type;
    let comandoRecebido = ''; 
    let textoResposta = `Desculpe, ${infoUsuario.nome}, não entendi o que você disse. Digite 'menu' para opções.`; 

    if (tipoMensagem === 'text') {
        comandoRecebido = mensagemInfoWhatsapp.text.body.trim().toLowerCase();
    } else if (tipoMensagem === 'interactive') {
        const interactive = mensagemInfoWhatsapp.interactive;
        if (interactive.type === 'button_reply') {
            comandoRecebido = interactive.button_reply.id; 
            console.log(`  [CHATBOT SERVICE] Botão clicado: ID=${comandoRecebido}, Título=${interactive.button_reply.title}`);
        } else if (interactive.type === 'list_reply') {
            comandoRecebido = interactive.list_reply.id;
            console.log(`  [CHATBOT SERVICE] Item da lista: ID=${comandoRecebido}, Título=${interactive.list_reply.title}`);
        } else {
            console.log(`  [CHATBOT SERVICE] Tipo interativo '${interactive.type}' não processado.`);
            await whatsappApiService.enviarMensagemTexto(idNumeroTelefoneBot, numeroRemetente, "Recebi uma interação que ainda não sei processar.");
            return;
        }
    } else {
        console.log(`  [CHATBOT SERVICE] Tipo de mensagem '${tipoMensagem}' não suportado.`);
        await whatsappApiService.enviarMensagemTexto(idNumeroTelefoneBot, numeroRemetente, `Recebi uma mensagem do tipo ${tipoMensagem}, mas só entendo texto ou botões/listas.`);
        return;
    }
    console.log(`  [CHATBOT SERVICE] Comando/Texto recebido do usuário ID ${infoUsuario.id} (${infoUsuario.nome}): "${comandoRecebido}"`);

    // Lógica de roteamento de comandos
    if(comandoRecebido === "Oi" || comandoRecebido === "olá" || comandoRecebido === "Olá" || comandoRecebido === "oi" ){
        const nomeSaudacao = infoUsuario.nome || " "; // Usa o nome do usuário, ou um espaço se não houver nome
        const textoBoasVindas = `Olá, ${nomeSaudacao.split(' ')[0]}! Sou Mark, seu assistente de controle de gastos. 😊\nPara ver serviços disponíveis digite: menu`;
        textoResposta = textoBoasVindas;
        
    }
    else if (comandoRecebido === "menu" || comandoRecebido === "Menu" || comandoRecebido === "MENU" || comandoRecebido === "CMD_VOLTAR_MENU" ) {
        const nomeSaudacao = infoUsuario.nome || " "; // Usa o nome do usuário, ou um espaço se não houver nome
        const textoResposta = `${nomeSaudacao.split(' ')[0]}, aqui estão algumas opções que você pode escolher:\n\n` ;
        
        const botoesBoasVindas = [
            { id: "CMD_GASTOS", title: " Ver Meus Gastos" },
            { id: "CMD_ADD_GASTO", title: "Adicionar Gasto" },
            { id: "CMD_ALERTAS_GASTOS", title: " Configurar Alertas" }
        ];
        await whatsappApiService.enviarMensagemComBotoesRespostaRapida(
            idNumeroTelefoneBot,
            numeroRemetente,
            textoResposta,
            botoesBoasVindas
        );
        return; 
    } else if(comandoRecebido === "CMD_GASTOS" || comandoRecebido === "gastos" || comandoRecebido === "Gastos" || comandoRecebido ==="GASTOS"){
        const nomeCurto = infoUsuario.nome.split(' ')[0];
        const respostaGastos = `Claro, ${nomeCurto}! Aqui estão algumas opções que você pode escolher:\n\n` ;

        const botoesGastos = [
            { id: "CMD_GASTOS_MENSAIS", title: "Mensal" },
            { id: "CMD_GASTOS_TRIMESTRAL", title: "Trimestral" },
            { id: "CMD_GASTOS_ANUAL", title: "Anual" },
            { id: "CMD_PERIODO_PERSONALIZADO", title: "Período Personalizado" },

           // { id: "CMD_GASTOS_ULTIMOS_30_DIAS", title: "Gastos Últimos 30 Dias" },
           // { id: "CMD_VOLTAR_MENU", title: "Voltar ao Menu Principal" }


        ]
        await whatsappApiService.enviarMensagemComBotoesRespostaRapida(
            idNumeroTelefoneBot,
            numeroRemetente,
            respostaGastos,
            botoesGastos
        );
        return;

    }
    else if (comandoRecebido === "CMD_GASTOS_MENSAIS" || comandoRecebido === "gastos mensais") {
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const mesAtual = dataAtual.getMonth() + 1; 

        const resultadoGastos = await obterSomaGastosMensais(infoUsuario.id, anoAtual, mesAtual);

        if (resultadoGastos.erro) {
            textoResposta = `Desculpe, ${infoUsuario.nome.split(' ')[0]}, não consegui calcular seus gastos mensais. (Erro: ${resultadoGastos.erro})`;
        } else if (resultadoGastos.soma !== null) {
            const nomeCurto = infoUsuario.nome.split(' ')[0];
            textoResposta = `${nomeCurto}, seus gastos para ${mesAtual.toString().padStart(2, '0')}/${anoAtual} são de R$ ${resultadoGastos.soma.toFixed(2).replace('.', ',')}.`;
        } else {
             textoResposta = `Houve um problema ao buscar seus gastos mensais, ${infoUsuario.nome.split(' ')[0]}. Tente novamente.`;
        }
    } else if (comandoRecebido === "CMD_ADD_GASTO" || comandoRecebido.startsWith("adicionar gasto")) {
        textoResposta = `Ok, ${infoUsuario.nome.split(' ')[0]}, vamos adicionar um novo gasto... (em desenvolvimento)`;
    } 
    
    
    else if(comandoRecebido === "CMD_GASTOS_TRIMESTRAL" || comandoRecebido === "Gastos trimestral") {
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();
        const trimestreAtual = Math.ceil((dataAtual.getMonth() + 1) / 3); 

        const resultadoGastosTrimestral = await obterSomaGastosTrimestral(infoUsuario.id, anoAtual, trimestreAtual);

        if (resultadoGastosTrimestral.erro) {
            textoResposta = `Desculpe, ${infoUsuario.nome.split(' ')[0]}, não consegui calcular seus gastos trimestrais. (Erro: ${resultadoGastosTrimestral.erro})`;
        } else if (resultadoGastosTrimestral.soma !== null) {
            const nomeCurto = infoUsuario.nome.split(' ')[0];
            textoResposta = `${nomeCurto}, seus gastos para os últimos 3 meses de ${anoAtual} são de R$ ${resultadoGastosTrimestral.soma.toFixed(2).replace('.', ',')}.`;
        } else {
             textoResposta = `Houve um problema ao buscar seus gastos trimestrais, ${infoUsuario.nome.split(' ')[0]}. Tente novamente.`;
        }
    }
    else if(comandoRecebido === "CMD_GASTOS_ANUAL" || comandoRecebido === "Gastos anual") {
        const dataAtual = new Date();
        const anoAtual = dataAtual.getFullYear();

        const resultadoGastosAnual = await obterSomaGastosAnual(infoUsuario.id, anoAtual, 0); // 0 para indicar anual

        if (resultadoGastosAnual.erro) {
            textoResposta = `Desculpe, ${infoUsuario.nome.split(' ')[0]}, não consegui calcular seus gastos anuais. (Erro: ${resultadoGastosAnual.erro})`;
        } else if (resultadoGastosAnual.soma !== null) {
            const nomeCurto = infoUsuario.nome.split(' ')[0];
            textoResposta = `${nomeCurto}, seus gastos para o ano de ${anoAtual} são de R$ ${resultadoGastosAnual.soma.toFixed(2).replace('.', ',')}.`;
        } else {
             textoResposta = `Houve um problema ao buscar seus gastos anuais, ${infoUsuario.nome.split(' ')[0]}. Tente novamente.`;
        }
    } else if(comandoRecebido === "CMD_PERIODO_PERSONALIZADO" || comandoRecebido === "Gastos período personalizado") {
        textoResposta = `Para calcular seus gastos em um período personalizado, por favor, envie as datas no formato: "DD/MM/AAAA - DD/MM/AAAA". Exemplo: "01/01/2023 - 31/01/2023"`;
    } else if( /^\d{2}\/\d{2}\/\d{4} - \d{2}\/\d{2}\/\d{4}$/.test(comandoRecebido) || comandoRecebido.includes(" - ")) {
        const [dataInicio, dataFim] = comandoRecebido.split(' - ').map(data => data.trim());
        if (!dataInicio || !dataFim) {
            textoResposta = `Formato inválido. Por favor, envie as datas no formato: "DD/MM/AAAA - DD/MM/AAAA". Exemplo: "01/01/2023 - 31/01/2023"`;
        } else {
            const resultadoGastosPeriodo = await obterGastosPeriodoPersonalizado(infoUsuario.id, dataInicio, dataFim);
            if (resultadoGastosPeriodo.erro) {
                textoResposta = `Desculpe, ${infoUsuario.nome.split(' ')[0]}, não consegui calcular seus gastos nesse período. (Erro: ${resultadoGastosPeriodo.erro})`;
            } else if (resultadoGastosPeriodo.soma !== null) {
                const nomeCurto = infoUsuario.nome.split(' ')[0];
                textoResposta = `${nomeCurto}, seus gastos de ${dataInicio} a ${dataFim} são de R$ ${resultadoGastosPeriodo.soma.toFixed(2).replace('.', ',')}.`;
            } else {
                 textoResposta = `Houve um problema ao buscar seus gastos nesse período, ${infoUsuario.nome.split(' ')[0]}. Tente novamente.`;
            }
        }
    }
     else {
        console.log(`[CHATBOT SERVICE] Comando não reconhecido: ${comandoRecebido}`);
    }
    if (textoResposta) {
        await whatsappApiService.enviarMensagemTexto(idNumeroTelefoneBot, numeroRemetente, textoResposta);
    }
};

module.exports = {
    gerirMensagemRecebida
};


