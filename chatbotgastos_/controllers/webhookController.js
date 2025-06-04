require('dotenv').config();
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "SEU_TOKEN_DE_VERIFICACAO_SECRETO_AQUI"; 
const chatbotService = require('../service/chatbotService');
// whatsappApiService não é mais chamado diretamente pelo controller, mas pelo chatbotService

const verificarWebhook = (req, res) => {
    console.log('[CONTROLLER] Recebida requisição de verificação do webhook.');
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('[CONTROLLER] VERIFY_TOKEN verificado com sucesso.');
            res.status(200).send(challenge);
        } else {
            console.error('[CONTROLLER] Falha na verificação. Tokens não correspondem.');
            res.sendStatus(403);
        }
    } else {
        console.error('[CONTROLLER] Requisição de verificação incompleta.');
        res.sendStatus(400);
    }
};

const processarEventoWebhook = async (req, res) => {
    console.log('[CONTROLLER] Recebida notificação do WhatsApp via POST.');
    const corpoRequisicao = req.body;
    res.sendStatus(200); // Responde OK para a Meta imediatamente

    try {
        if (corpoRequisicao.object) {
            for (const entry of corpoRequisicao.entry) {
                for (const change of entry.changes) {
                    if (change.value && change.value.messages && change.value.messages[0]) {
                        const mensagemInfo = change.value.messages[0];
                        const metadata = change.value.metadata;
                        // Delega todo o processamento e envio de resposta para o chatbotService
                        await chatbotService.gerirMensagemRecebida(mensagemInfo, metadata);
                    } else if (change.value && change.value.statuses) {
                        // Lidar com atualizações de status da mensagem (enviada, entregue, lida) se necessário
                        console.log("[CONTROLLER] Recebida atualização de status:", JSON.stringify(change.value.statuses, null, 2));
                    } else {
                        console.log("[CONTROLLER] Notificação não era uma mensagem de usuário esperada ou status:", change.value);
                    }
                }
            }
        } else {
            console.warn("[CONTROLLER] Payload do WhatsApp não reconhecido (sem campo 'object').");
        }
    } catch (error) {
        console.error('[CONTROLLER] Erro ao processar evento do webhook:', error);
    }
};

module.exports = {
    verificarWebhook,
    processarEventoWebhook
};
