const axios = require('axios'); 

const enviarMensagemTexto = async (idNumeroTelefoneBot, paraNumero, textoMensagem) => {
    const TOKEN_ACESSO_WHATSAPP = process.env.WHATSAPP_ACCESS_TOKEN; 
    if (!TOKEN_ACESSO_WHATSAPP) {
        console.error("[WHATSAPP API SERVICE] WHATSAPP_ACCESS_TOKEN não configurado.");
        return false;
    }
    if (!idNumeroTelefoneBot || !paraNumero || !textoMensagem) {
        console.error("[WHATSAPP API SERVICE] Parâmetros ausentes para enviarMensagemTexto.");
        return false;
    }
    const url = `https://graph.facebook.com/v19.0/${idNumeroTelefoneBot}/messages`;
    const payload = { 
        messaging_product: "whatsapp", 
        to: paraNumero, 
        type: "text", 
        text: { body: textoMensagem } 
    };
    const configAxios = { // Renomeado para configAxios para clareza
        headers: { 
            'Authorization': `Bearer ${TOKEN_ACESSO_WHATSAPP}`, 
            'Content-Type': 'application/json' 
        },
        timeout: 10000
    };
    try {
        console.log(`[WHATSAPP API SERVICE] Enviando texto para ${paraNumero}: "${textoMensagem}"`);
        console.log(`[WHATSAPP API SERVICE] Payload para Meta: ${JSON.stringify(payload)}`);
        // Chamada axios.post corrigida:
        const response = await axios.post(url, payload, configAxios); 
        console.log("[WHATSAPP API SERVICE] Texto enviado. Resposta Meta:", response.data); 
        return true;
    } catch (error) {
        console.error("[WHATSAPP API SERVICE] Exceção ao enviar texto:", error.isAxiosError ? error.toJSON() : error);
        if (error.response) {
            console.error("[WHATSAPP API SERVICE] Detalhes do erro da API Meta:", error.response.data);
        }
        return false;
    }
};

const enviarMensagemComBotoesRespostaRapida = async (idNumeroTelefoneBot, paraNumero, textoCorpo, botoes) => {
    const TOKEN_ACESSO_WHATSAPP = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!TOKEN_ACESSO_WHATSAPP) {
        console.error("[WHATSAPP API SERVICE] WHATSAPP_ACCESS_TOKEN não configurado.");
        return false;
    }
    if (!idNumeroTelefoneBot || !paraNumero || !textoCorpo || !botoes || botoes.length === 0 || botoes.length > 5) {
        console.error("[WHATSAPP API SERVICE] Parâmetros inválidos para enviarMensagemComBotoesRespostaRapida.");
        return false;
    }
    const url = `https://graph.facebook.com/v19.0/${idNumeroTelefoneBot}/messages`;
    const payload = {
        messaging_product: "whatsapp",
        to: paraNumero,
        type: "interactive",
        interactive: {
            type: "button",
            body: { text: textoCorpo },
            action: {
                buttons: botoes.map(btn => ({
                    type: "reply",
                    reply: { id: btn.id, title: btn.title }
                }))
            }
        }
    };
    const configAxios = { // Renomeado para configAxios
        headers: { 
            'Authorization': `Bearer ${TOKEN_ACESSO_WHATSAPP}`, 
            'Content-Type': 'application/json' 
        },
        timeout: 10000
    };
    try {
        console.log(`[WHATSAPP API SERVICE] Enviando mensagem com botões para ${paraNumero}: "${textoCorpo}"`);
        const response = await axios.post(url, payload, configAxios); // Uso correto do axios
        console.log("[WHATSAPP API SERVICE] Mensagem com botões enviada. Resposta Meta:", response.data); 
        return true;
    } catch (error) {
        console.error("[WHATSAPP API SERVICE] Exceção ao enviar mensagem com botões:", error.isAxiosError ? error.toJSON() : error);
        if (error.response) {
            console.error("[WHATSAPP API SERVICE] Detalhes do erro da API Meta:", error.response.data);
        }
        return false;
    }
};

module.exports = {
    enviarMensagemTexto,
    enviarMensagemComBotoesRespostaRapida
};