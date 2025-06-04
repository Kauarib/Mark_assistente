const Aplicativos = require('../models/Aplicativos');

const CriarAplicativo = async (req, res) => {
    try {
        const { nome_apps, email } = req.body;

        // Validação corrigida: verifica se nome_apps OU email estão ausentes
        if (!nome_apps || !email) {
            // Log para depuração do que foi recebido
            console.log('[CriarAplicativo] Dados recebidos para validação:', { nome_apps, email });
            return res.status(400).json({ message: 'Nome do aplicativo e email são obrigatórios' });
        }

        // Verifica se já existe um aplicativo com este e-mail
        const appExistente = await Aplicativos.findOne({ where: { email: email } });
        if (appExistente) {
            console.log('[CriarAplicativo] Tentativa de criar app com e-mail já existente:', email);
            return res.status(409).json({ 
                message: 'Já existe um aplicativo cadastrado com este e-mail.',
                aplicativo: appExistente // Opcional: retornar o app existente
            });
        }

        console.log('[CriarAplicativo] Tentando criar com:', { nome_apps, email });
        const novoApp = await Aplicativos.create({ nome_apps, email });
        
        // Certifique-se que 'novoApp' contém o campo 'Id_apps' ou o ID que o Python espera.
        // Se o nome do campo ID no modelo for diferente (ex: 'id'), ajuste a resposta ou o Python.
        console.log('[CriarAplicativo] Aplicativo criado:', novoApp);
        return res.status(201).json(novoApp); // Retorna o objeto completo do novo app
        
    } catch (error) {
        console.error('Erro detalhado ao criar aplicativo no Node.js:', error); // Log mais detalhado do erro
        // Verifica se é um erro de validação do Sequelize para dar uma resposta mais específica
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ 
                message: 'Erro de validação ao criar aplicativo.', 
                errors: error.errors.map(e => ({ field: e.path, message: e.message })) 
            });
        }
        return res.status(500).json({ message: 'Erro interno ao criar aplicativo', error: error.message });
    }
};
const ListarAplicativos = async (req, res) => {
    try {
        const { email } = req.query; 
        let queryOptions = {};

        if (email) {
        
            queryOptions.where = { email: email };
            console.log(`[ListarAplicativos] Buscando aplicativo com email: ${email}`);
        } else {
            console.log('[ListarAplicativos] Buscando todos os aplicativos.');
        }

        const aplicativos = await Aplicativos.findAll(queryOptions);

     
        if (email && (!aplicativos || aplicativos.length === 0)) {
            console.log(`[ListarAplicativos] Nenhum aplicativo encontrado para o email: ${email}`);
            return res.status(404).json({ message: 'Nenhum aplicativo encontrado para o e-mail fornecido' });
        }
        
        if (!email && (!aplicativos || aplicativos.length === 0)) {
            console.log('[ListarAplicativos] Nenhum aplicativo cadastrado no sistema.');
            return res.status(404).json({ message: 'Nenhum aplicativo encontrado' });
        }
        
  
        console.log(`[ListarAplicativos] Aplicativos encontrados: ${aplicativos.length}`);
        if (email && aplicativos.length > 0) {
            return res.status(200).json(aplicativos[0]); // Retorna o objeto único
        } else {
            return res.status(200).json(aplicativos); // Retorna a lista de aplicativos
        }

    } catch (error) {
        console.error('Erro ao listar aplicativos:', error);
        return res.status(500).json({ message: 'Erro ao listar aplicativos', error: error.message });
    }  
}
const AtualizarAplicativo = async (req, res) => {
    try {
        const { id_apps } = req.params;
        const { nome_apps } = req.body;

        if (!id_apps || !nome_apps) {
            return res.status(400).json({ message: 'ID do aplicativo e nome são obrigatórios' });
        }

        const aplicativo = await Aplicativos.findByPk(id_apps);
        if (!aplicativo) {
            return res.status(404).json({ message: 'Aplicativo não encontrado' });
        }

        aplicativo.nome_apps = nome_apps;
        await aplicativo.save();

        return res.status(200).json(aplicativo);
    } catch (error) {
        console.error('Erro ao atualizar aplicativo:', error);
        return res.status(500).json({ message: 'Erro ao atualizar aplicativo', error });
    }
}
const DeletarAplicativo = async (req, res) => {
    try {
        const { id_apps } = req.params;

        if (!id_apps) {
            return res.status(400).json({ message: 'ID do aplicativo é obrigatório' });
        }

        const aplicativo = await Aplicativos.findByPk(id_apps);
        if (!aplicativo) {
            return res.status(404).json({ message: 'Aplicativo não encontrado' });
        }

        await aplicativo.destroy();

        return res.status(200).json({ message: 'Aplicativo deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar aplicativo:', error);
        return res.status(500).json({ message: 'Erro ao deletar aplicativo', error });
    }
}
module.exports = {
    CriarAplicativo,
    ListarAplicativos,
    AtualizarAplicativo,
    DeletarAplicativo
}