// controllers/usuariosController.js
const Usuarios = require('../models/Usuarios'); 
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Para encriptação/decriptação
require('dotenv').config(); // Para JWT_SECRET e ENCRYPTION_KEY

const JWT_SECRET = process.env.JWT_SECRET || 'seu_jwt_secret_super_secreto_padrao'; // Mude para algo forte no .env
const ENCRYPTION_KEY_HEX = process.env.IMAP_ENCRYPTION_KEY; // Deve ser uma string hexadecimal de 64 caracteres para AES-256 (32 bytes)
const IV_LENGTH = 16; // Para AES, o IV é geralmente de 16 bytes (128 bits)

let encryptionKey;
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    console.error("ALERTA: IMAP_ENCRYPTION_KEY não está definida corretamente no .env ou não tem 32 bytes (64 caracteres hex). A encriptação/decriptação pode falhar ou ser insegura.");
    // Gerar uma chave de fallback para desenvolvimento APENAS se não definida, NUNCA use em produção.
    encryptionKey = crypto.randomBytes(32); // Chave de 32 bytes para AES-256
    console.warn(`ALERTA: Usando uma chave de encriptação gerada dinamicamente para IMAP. Defina IMAP_ENCRYPTION_KEY no seu .env para produção: ${encryptionKey.toString('hex')}`);
} else {
    encryptionKey = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
}


// --- Funções Auxiliares de Encriptação/Decriptação ---
// Usando AES-256-CBC como exemplo.
// Considere AES-GCM para autenticação adicional da cifra.

function encrypt(text) {
    if (!text) return null;
    try {
        const iv = crypto.randomBytes(IV_LENGTH); // Gera um IV aleatório para cada encriptação
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Retorna o IV concatenado com o texto encriptado, separados por ':', ambos em formato hexadecimal.
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error("Erro ao encriptar:", error);
        // Em produção, você pode querer lançar o erro ou retornar um erro específico.
        return null;
    }
}

function decrypt(textWithIv) {
    if (!textWithIv) return null;
    try {
        const parts = textWithIv.split(':');
        if (parts.length !== 2) {
            // Lançar um erro ou logar, pois o formato está incorreto.
            console.error("Formato inválido para texto encriptado com IV. Esperado 'iv:textoEncriptado'.");
            return null;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Erro ao decriptar:", error);
        // Pode ser um IV incorreto, chave incorreta, ou dados corrompidos.
        return null;
    }
}


// --- Funções do Controller ---

const registrarUsuario = async (req, res) => {
    try {
        const { nome_usuario, numero_whatsapp, password, email_login, email_app_password } = req.body;

        if (!numero_whatsapp || !password) {
            return res.status(400).json({ message: 'Número do WhatsApp e senha do sistema são obrigatórios.' });
        }

        const usuarioExistente = await Usuarios.findOne({ where: { numero_whatsapp } });
        if (usuarioExistente) {
            return res.status(409).json({ message: 'Usuário já cadastrado com este número de WhatsApp.' });
        }

        let encryptedImapPassword = null;
        if (email_login && email_app_password) {
            encryptedImapPassword = encrypt(email_app_password);
            if (!encryptedImapPassword) {
                 // O erro já foi logado pela função encrypt
                 return res.status(500).json({ message: 'Erro ao encriptar senha de aplicativo IMAP.' });
            }
        }

        const novoUsuario = await Usuarios.create({
            nome_usuario,
            numero_whatsapp,
            password, // O hook beforeCreate no modelo vai hashear esta senha
            email_login: email_login || null,
            email_app_password_encrypted: encryptedImapPassword
        });

        // Não retorne a senha (mesmo hasheada) ou a senha IMAP encriptada na resposta
        const { password: _, email_app_password_encrypted: __, ...usuarioParaRetorno } = novoUsuario.get({ plain: true });

        return res.status(201).json({ message: 'Usuário registrado com sucesso!', usuario: usuarioParaRetorno });

    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                message: 'Erro de validação ao registrar usuário.',
                errors: error.errors ? error.errors.map(e => ({ field: e.path, message: e.message })) : [{ message: error.message }]
            });
        }
        return res.status(500).json({ message: 'Erro interno ao registrar usuário.', error: error.message });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { numero_whatsapp, password } = req.body;

        if (!numero_whatsapp || !password) {
            return res.status(400).json({ message: 'Número do WhatsApp e senha são obrigatórios.' });
        }

        const usuario = await Usuarios.findOne({ where: { numero_whatsapp } });
        if (!usuario) {
            return res.status(401).json({ message: 'Autenticação falhou. Usuário não encontrado.' }); // Alterado para 401
        }

        const senhaValida = await usuario.validarSenhaSistema(password);
        if (!senhaValida) {
            return res.status(401).json({ message: 'Autenticação falhou. Senha inválida.' });
        }

        const payload = {
            id_usuario: usuario.id_usuario,
            numero_whatsapp: usuario.numero_whatsapp
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); 

        const { password: _, email_app_password_encrypted: __, ...usuarioParaRetorno } = usuario.get({ plain: true });

        return res.status(200).json({
            message: 'Login bem-sucedido!',
            usuario: usuarioParaRetorno,
            token
        });

    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return res.status(500).json({ message: 'Erro interno ao fazer login.', error: error.message });
    }
};

// Esta função assume que o usuário já está autenticado (ex: via JWT)
// e o id_usuario é obtido do token de autenticação (um middleware de autenticação faria isso)
const configurarCredenciaisIMAP = async (req, res) => {
    // Exemplo: Supondo que um middleware de autenticação já colocou req.usuarioAutenticado.id_usuario
    const id_usuario_autenticado = req.usuarioAutenticado ? req.usuarioAutenticado.id_usuario : null; 
    
    if (!id_usuario_autenticado) {
        return res.status(401).json({ message: 'Não autorizado. Faça login primeiro.'});
    }

    try {
        const { email_login, email_app_password } = req.body;

        if (!email_login || !email_app_password) {
            return res.status(400).json({ message: 'E-mail de login IMAP e senha de aplicativo são obrigatórios.' });
        }

        const usuario = await Usuarios.findByPk(id_usuario_autenticado);
        if (!usuario) {
            // Isso não deveria acontecer se o token JWT for válido e o usuário existir
            return res.status(404).json({ message: 'Usuário autenticado não encontrado no banco de dados.' });
        }

        const encryptedPassword = encrypt(email_app_password);
        if (!encryptedPassword) {
            return res.status(500).json({ message: 'Erro ao encriptar a senha de aplicativo.' });
        }

        usuario.email_login = email_login;
        usuario.email_app_password_encrypted = encryptedPassword;
        // Se você estiver armazenando o IV separadamente:
        // const parts = encryptedPassword.split(':');
        // usuario.email_app_password_iv = parts[0]; 
        // usuario.email_app_password_encrypted = parts[1];
        await usuario.save();

        return res.status(200).json({ message: 'Credenciais IMAP configuradas com sucesso!' });

    } catch (error) {
        console.error('Erro ao configurar credenciais IMAP:', error);
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                message: 'Erro de validação ao configurar credenciais IMAP.',
                errors: error.errors ? error.errors.map(e => ({ field: e.path, message: e.message })) : [{ message: error.message }]
            });
        }
        return res.status(500).json({ message: 'Erro interno ao configurar credenciais IMAP.', error: error.message });
    }
};

// Endpoint para o script Python obter as credenciais (deve ser protegido!)
const obterCredenciaisIMAPParaAutomacao = async (req, res) => {
    // FORMA SIMPLES DE PROTEGER ESTE ENDPOINT (substitua por algo mais robusto em produção)
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.PYTHON_SCRIPT_API_KEY) {
       console.warn('[obterCredenciaisIMAPParaAutomacao] Tentativa de acesso não autorizado ou API Key ausente/inválida.');
       return res.status(403).json({ message: "Acesso não autorizado." });
    }

    const { id_usuario } = req.params; 
    if (!id_usuario) {
        return res.status(400).json({ message: "ID do usuário é obrigatório."});
    }

    try {
        const usuario = await Usuarios.findByPk(id_usuario, {
            attributes: ['email_login', 'email_app_password_encrypted'] // Apenas os campos necessários
        });

        if (!usuario || !usuario.email_login|| !usuario.email_app_password_encrypted) {
            return res.status(404).json({ message: 'Credenciais IMAP não configuradas para este usuário ou usuário não encontrado.' });
        }
        
        // A senha já está encriptada (com IV prefixado). O Python irá decriptá-la.
        return res.status(200).json({
            email_login: usuario.email_login,
            encrypted_password_with_iv: usuario.email_app_password_encrypted 
        });

    } catch (error) {
        console.error('Erro ao obter credenciais IMAP para automação:', error);
        return res.status(500).json({ message: 'Erro interno.', error: error.message });
    }
};
const listarUsuarios = async (req, res) => {
   try {
        const { numero_whatsapp, email } = req.query; // Permite filtrar por WhatsApp ou e-mail
        let queryOptions = {
            where: {}
        };
        let usuarioEncontrado = false;

        if (numero_whatsapp) {
            console.log(`[ListarUsuarios] Buscando usuário com numero_whatsapp: ${numero_whatsapp}`);
            queryOptions.where.numero_whatsapp = numero_whatsapp; 
            usuarioEncontrado = true;
        } else if (email) { l
            console.log(`[ListarUsuarios] Buscando usuário com email: ${email}`);
            queryOptions.where.email_login_imap = email; 
            usuarioEncontrado = true;
        } else {
          
            console.log('[ListarUsuarios] Nenhum filtro específico fornecido. Listando todos os usuários .');
            
            // return res.status(400).json({ message: "Filtro (numero_whatsapp ou email) é obrigatório." });
        }

        const usuarios = await Usuarios.findAll(queryOptions);

        if (!usuarios || usuarios.length === 0) {
            console.log('[ListarUsuarios] Nenhum usuário encontrado para os filtros aplicados.');
            // Se um filtro específico foi usado e nada encontrado, 404 é apropriado.
            // Se nenhum filtro foi usado e a tabela está vazia, 404 também.
            return res.status(404).json({ message: 'Nenhum usuário encontrado' });
        }

        // Se um filtro específico foi usado (numero_whatsapp ou email), e estamos aqui, significa que encontramos.
        // É provável que você queira retornar apenas o primeiro (e único, se houver constraint UNIQUE)
        if (usuarioEncontrado && usuarios.length > 0) {
            console.log(`[ListarUsuarios] Usuário encontrado: ${JSON.stringify(usuarios[0])}`);
            return res.status(200).json(usuarios[0]); // Retorna o primeiro (e único esperado) usuário como objeto
        }
        
        // Se chegou aqui sem filtros específicos, retorna a lista completa (se permitido pela lógica acima)
        console.log(`[ListarUsuarios] Retornando ${usuarios.length} usuários.`);
        return res.status(200).json(usuarios);

    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        return res.status(500).json({ message: 'Erro interno ao listar usuários.', error: error.message });
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    configurarCredenciaisIMAP,
    obterCredenciaisIMAPParaAutomacao,
    listarUsuarios
};