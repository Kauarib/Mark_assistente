// seu_arquivo_de_modelo_formas_pagamentos.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Seu arquivo de configuração do Sequelize

const FormasPagamentos = sequelize.define('FormasPagamentos', {
    id_forma_pagamento: { 
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    descricao: {
        type: DataTypes.STRING(100), 
        allowNull: false,
        unique: true // IMPORTANTE: para garantir que as descrições sejam únicas
    },
    bandeira: { 
        type: DataTypes.STRING(50), 
        allowNull: true //  opcional
    },
    ativo: { // Adicionando a coluna 'ativo' que discutimos
        type: DataTypes.BOOLEAN,
        defaultValue: true, // Valor padrão
        allowNull: false // Geralmente não se quer um 'ativo' nulo
    }
}, {
    timestamps: false, // para não ter createdAt e updatedAt
    tableName: 'formas_pagamentos' //  nome da tabela no banco de dados
});

module.exports = FormasPagamentos;