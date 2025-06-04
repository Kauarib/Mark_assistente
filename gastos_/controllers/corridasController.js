const db = require('../models/App');
const sequelize = require('../config/db');
const { Op, Sequelize } = require('sequelize');
const Corridas = db.Corridas;
const Aplicativos = db.Aplicativos;
const FormasPagamentos = db.FormasPagamentos;
const Usuarios = db.Usuarios;


const CriarCorrida = async (req, res) => {
    try {
        const { data, valor, cartao, id_forma_pagamento, id_apps, id_usuario } = req.body;

        if (!data || !valor || !id_apps) {
            return res.status(400).json({ message: 'Data, valor, pagamentos e id_apps são obrigatórios' });
        }

        const corrida = await Corridas.create({ data, valor, cartao, id_apps, id_forma_pagamento, id_usuario });
        return res.status(201).json({ message: 'Corrida registrada com sucesso', corrida });

    } catch (error) {
        console.error('Erro ao registrar corrida:', error);
        return res.status(500).json({ message: 'Erro ao registrar corrida', error });
    }
};


const ListarCorridas = async (req, res) => {
    try {
        const { 
            id_usuario, // Essencial para o chatbot
            ano,        // Essencial para o chatbot (ex: 2024)
            mes,        // Essencial para o chatbot (ex: 5 para Maio)
            data,       // Para buscar por uma data exata (YYYY-MM-DD)
            ultimos_digitos_cartao, // Nome corrigido da coluna
            id_forma_pagamento,
            id_apps 
        } = req.query;

        let queryOptions = {
            where: {},
            include: [ // Opcional: inclua modelos associados se quiser retornar mais detalhes
                { model: Aplicativos, as: 'aplicativo' }, // Defina 'as' no seu modelo Corridas
                { model: FormasPagamentos, as: 'formaDePagamento' }, // Defina 'as' no seu modelo Corridas
                
            ] 
        };

        // Filtro OBRIGATÓRIO para o chatbot (e boa prática em geral)
        if (id_usuario) {
            queryOptions.where.id_usuario = id_usuario;
            console.log(`[ListarCorridas] Filtrando por id_usuario: ${id_usuario}`);
        } else {
           
            console.warn('[ListarCorridas] ATENÇÃO: id_usuario não fornecido.');
            return res.status(400).json({ message: 'id_usuario é obrigatório para listar corridas.' }); //
        }

        // Filtro por data exata
        if (data) {
            // Valide o formato da data se necessário (ex: YYYY-MM-DD)
            queryOptions.where.data = data;
            console.log(`[ListarCorridas] Filtrando por data exata: ${data}`);
        }

        // Filtro por ano e mês (para o chatbot)
        if (ano && mes) {
            const anoNum = parseInt(ano);
            const mesNum = parseInt(mes);

            if (!isNaN(anoNum) && !isNaN(mesNum) && mesNum >= 1 && mesNum <= 12) {
                // Adiciona ao array 'Op.and' se já existir, ou cria um novo
                queryOptions.where[Op.and] = queryOptions.where[Op.and] || [];
                queryOptions.where[Op.and].push(
                    sequelize.where(sequelize.fn('YEAR', sequelize.col('data')), anoNum),
                    sequelize.where(sequelize.fn('MONTH', sequelize.col('data')), mesNum)
                );
                console.log(`[ListarCorridas] Filtrando por Ano: ${anoNum}, Mês: ${mesNum}`);
            } else {
                console.warn(`[ListarCorridas] Ano ou Mês inválido fornecido: ano=${ano}, mes=${mes}`);
            }
        } else if (ano) { // Filtro apenas por ano
            const anoNum = parseInt(ano);
            if (!isNaN(anoNum)) {
                queryOptions.where[Op.and] = queryOptions.where[Op.and] || [];
                queryOptions.where[Op.and].push(
                    sequelize.where(sequelize.fn('YEAR', sequelize.col('data')), anoNum)
                );
                console.log(`[ListarCorridas] Filtrando por Ano: ${anoNum}`);
            }
        }


        // Filtro por últimos dígitos do cartão
        if (ultimos_digitos_cartao) {
            queryOptions.where.ultimos_digitos_cartao = ultimos_digitos_cartao;
            console.log(`[ListarCorridas] Filtrando por ultimos_digitos_cartao: ${ultimos_digitos_cartao}`);
        }

        // Filtro por forma de pagamento
        if (id_forma_pagamento) {
            queryOptions.where.id_forma_pagamento = id_forma_pagamento;
            console.log(`[ListarCorridas] Filtrando por id_forma_pagamento: ${id_forma_pagamento}`);
        }

        // Filtro por aplicativo
        if (id_apps) {
            queryOptions.where.Id_apps = id_apps; // Note a capitalização 'Id_apps' conforme seu modelo
            console.log(`[ListarCorridas] Filtrando por Id_apps: ${id_apps}`);
        }
        
        // Se nenhum filtro específico foi aplicado (além de id_usuario, se obrigatório),
        // queryOptions.where pode estar vazio, o que é ok para findAll.
        if (Object.keys(queryOptions.where).length === 0 && !id_usuario) { // Adicionado !id_usuario para evitar log desnecessário se id_usuario for o único filtro
             console.log('[ListarCorridas] Buscando todas as corridas (sem filtros específicos).');
        }


        const corridas = await Corridas.findAll(queryOptions);

        if (!corridas || corridas.length === 0) {
            // Retorna 200 com array vazio se filtros foram aplicados e nada encontrado,
            // ou 404 se realmente não há nada ou o recurso principal não existe.
            // Para o chatbot, um array vazio é uma resposta válida.
            console.log('[ListarCorridas] Nenhuma corrida encontrada para os filtros aplicados.');
            return res.status(200).json([]); // Retorna array vazio para o chatbot processar
        }

        return res.status(200).json(corridas);

    } catch (error) {
        console.error('Erro ao listar corridas:', error);
        return res.status(500).json({ message: 'Erro ao listar corridas', error: error.message });
    }
};
const DeletarCorrida = async (req, res) => {
    try {
        const { id_corrida } = req.params;

        if (!id_corrida) {
            return res.status(400).json({ message: 'ID da corrida é obrigatório' });
        }

        const corrida = await Corridas.findByPk(id_corrida);
        if (!corrida) {
            return res.status(404).json({ message: 'Corrida não encontrada' });
        }

        await corrida.destroy();
        return res.status(200).json({ message: 'Corrida deletada com sucesso' });

    } catch (error) {
        console.error('Erro ao deletar corrida:', error);
        return res.status(500).json({ message: 'Erro ao deletar corrida', error });
    }
};

module.exports = {
    CriarCorrida,
    ListarCorridas,
    DeletarCorrida
};
