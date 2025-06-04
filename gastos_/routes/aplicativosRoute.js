const express = require('express');
const router = express.Router();
const {CriarAplicativo, ListarAplicativos, AtualizarAplicativo, DeletarAplicativo} = require('../controllers/aplicativosController');
//rota para criar aplicativo
router.post('/aplicativos', CriarAplicativo);

//rota para listar aplicativos por id
router.get('/aplicativos', ListarAplicativos);

//rota para atualizar aplicativo 
router.put('/aplicativos/:id_apps', AtualizarAplicativo);

//rota para deletar aplicativo
router.delete('/aplicativos/:id_apps', DeletarAplicativo);

module.exports = router;