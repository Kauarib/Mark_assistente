const express = require ('express');
const router =  express.Router();
const {CriarFormaPagamento, ListarFormasPagamentos} = require('../controllers/formasPagamentosController');

//rota para criar forma de pagamento
router.post('/formas-pagamentos', CriarFormaPagamento);

//rota para listar forams de pagamentos
router.get('/formas-pagamentos', ListarFormasPagamentos);

module.exports = router;