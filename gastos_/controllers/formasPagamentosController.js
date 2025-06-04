const FormasPagamentos = require('../models/FormasPagamentos');


const CriarFormaPagamento = async (req, res) => {
     
    try{
        const{
           descricao,
           bandeira,
           ativo 
        } = req.body;
        if(!descricao ) {
            return res.status(400).json({ message: 'Descrição da forma de pagamento é obrigatória' });
        }
        const novaFormaPagamento = await FormasPagamentos.create({descricao, bandeira, ativo});
        return res.status(201).json(novaFormaPagamento);
    }catch(error){
        console.error('Erro ao criar forma de pagamento:', error);
        return res.status(500).json({ message: 'Erro ao criar forma de pagamento', error });
    }
}


const ListarFormasPagamentos = async (req, res) => {
    try {
        const { descricao } = req.query; // Pega 'descricao' da query string
        let queryOptions = {};

        if (descricao) {
            queryOptions.where = { descricao: descricao };
        }

        const formasPagamentos = await FormasPagamentos.findAll(queryOptions);

       
        if (!formasPagamentos || formasPagamentos.length === 0) {
            
            return res.status(404).json({ message: 'Nenhuma forma de pagamento encontrada' });
        }

        
        return res.status(200).json(formasPagamentos);

    } catch (error) {
        console.error('Erro ao listar formas de pagamento:', error);
        return res.status(500).json({ message: 'Erro ao listar formas de pagamento', error });
    }
}
module.exports = {
    CriarFormaPagamento,
    ListarFormasPagamentos
}