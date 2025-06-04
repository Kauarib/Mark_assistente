const express = require('express');
const router = express.Router();
const { CriarCorrida, ListarCorridas } = require('../controllers/corridasController');
 
// Rota para criar uma nova corrida
router.post('/corridas', CriarCorrida);

// Rota para listar corridas por id
router.get('/corridas', ListarCorridas);

module.exports = router;