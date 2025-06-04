// models/Usuarios.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 
const bcrypt = require('bcryptjs');

const Usuarios = sequelize.define('Usuarios', {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome_usuario: {
        type: DataTypes.STRING(100),
        allowNull: true   // Permite nulo, caso o nome não seja fornecido
    },
    numero_whatsapp: {
        type: DataTypes.STRING(25), // Para armazenar o número de telefone do WhatsApp
        allowNull: false,
        unique: true,
        comment: 'Número do WhatsApp do usuário, usado para identificação no chatbot.'
    },
    password: { // Senha para o usuário logar no SEU sistema (se houver uma interface web/app)
        type: DataTypes.STRING,
        allowNull: false, // Assumindo que uma senha para o sistema é obrigatória
        comment: 'Senha do usuário para o sistema de controle de gastos (armazenada com hash bcrypt).'
    },
    email_login: { // E-mail que será usado para a automação ler os e-mails do usuário
        type: DataTypes.STRING, // ex: DataTypes.STRING(255)
        allowNull: true,
        unique: true, // Se fornecido, deve ser único
        validate: { 
            isEmail: {
                msg: "Formato de e-mail inválido para login IMAP."
            }
        },
        comment: 'E-mail do usuário para login no serviço IMAP (ex: Gmail).'
    },
    email_app_password_encrypted: { // Senha de aplicativo para o e-mail acima, ENCRIPTADA
        type: DataTypes.STRING(512), // O tamanho pode variar dependendo da encriptação + codificação (ex: Base64)
        allowNull: true,
        comment: 'Senha de aplicativo IMAP do usuário, armazenada de forma encriptada.'
    },
    // Você pode adicionar um campo para o Vetor de Inicialização (IV) se sua cifra de encriptação exigir
    // email_app_password_iv: {
    //     type: DataTypes.STRING(255), // Ou DataTypes.BLOB
    //     allowNull: true
    // },
    data_cadastro: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false, // Se você não quer createdAt e updatedAt automáticos
    tableName: 'Usuarios', // Nome exato da tabela no banco de dados
    hooks: {
        beforeCreate: async (usuario) => {
            if (usuario.password) {
                const salt = await bcrypt.genSalt(10);
                usuario.password = await bcrypt.hash(usuario.password, salt);
            }
        },
        beforeUpdate: async (usuario) => {
            // Hashear a senha apenas se ela foi modificada
            if (usuario.changed('password') && usuario.password) {
                const salt = await bcrypt.genSalt(10);
                usuario.password = await bcrypt.hash(usuario.password, salt);
            }
        }
    }
});

// Método de instância para verificar a senha do sistema
Usuarios.prototype.validarSenhaSistema = function(senhaEnviada) {
    return bcrypt.compare(senhaEnviada, this.password);
};

module.exports = Usuarios;