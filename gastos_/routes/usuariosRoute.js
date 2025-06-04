// routes/usuariosRoutes.js (ou o nome do seu arquivo de rotas)

const express = require('express');
const router = express.Router();
const { 
    registrarUsuario,
    loginUsuario,
    configurarCredenciaisIMAP,
    obterCredenciaisIMAPParaAutomacao,
    listarUsuarios
} = require('../controllers/usuariosController'); 

// Middleware de autenticação JWT (Exemplo - você precisará criar este arquivo/função)
// const authMiddleware = require('../middleware/authMiddleware'); 

// Rota para registrar um novo usuário
// POST /api/usuarios/registrar
router.post('/usuarios/registrar', registrarUsuario);

// Rota para fazer login
// POST /api/usuarios/login
router.post('/usuarios/login', loginUsuario);


router.post('/usuarios/configurar-imap', (req, res, next) => {
   
    configurarCredenciaisIMAP(req, res, next);
});



router.get('/usuarios/:id_usuario/obter-credenciais-imap', obterCredenciaisIMAPParaAutomacao);

router.get('/usuarios', listarUsuarios);




module.exports = router;