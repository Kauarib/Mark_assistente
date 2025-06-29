const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Seu arquivo de configuração do Sequelize
const Aplicativos = require('./Aplicativos'); // Importe o modelo Aplicativos
const FormasPagamentos = require('./FormasPagamentos'); // Importe o modelo FormasPagamentos
const Usuarios = require('./Usuarios'); // Importe o modelo Usuarios

const Corridas = sequelize.define('Corridas', {
    id: { // Renomeado de id_corrida para id, conforme o seu log
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    data: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    // Os campos 'Id_apps', 'id_forma_pagamento' e 'id_usuario' foram REMOVIDOS daqui.
    // As associações 'belongsTo' abaixo irão criar estas colunas automaticamente.

    cartao: { // Nome da coluna para os últimos dígitos, conforme seu modelo
        type: DataTypes.STRING(4),
        allowNull: true,
        defaultValue: '0000'
    }
}, {
    timestamps: false,
    tableName: 'Corridas'
});

// --- Definindo as Associações (a forma correta) ---
// A associação irá adicionar automaticamente as colunas 'Id_apps', 'id_forma_pagamento' e 'id_usuario' à tabela Corridas.

// Relação com Aplicativos
Corridas.belongsTo(Aplicativos, { 
    foreignKey: 'Id_apps', // Especifica o nome da chave estrangeira
    as: 'aplicativo',      // <-- ADICIONADO ALIAS EXPLÍCITO AQUI
    onDelete: 'SET NULL', 
    onUpdate: 'CASCADE' 
});
Aplicativos.hasMany(Corridas, { 
    foreignKey: 'Id_apps',
    as: 'aplicativo'       // <-- ADICIONADO ALIAS EXPLÍCITO AQUI
});

// Relação com FormasPagamentos
Corridas.belongsTo(FormasPagamentos, { 
    foreignKey: 'id_forma_pagamento',
    as: 'formaDePagamento', // 'as' é opcional, mas útil para includes
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});
FormasPagamentos.hasMany(Corridas, { foreignKey: 'id_forma_pagamento' });

// Relação com Usuarios
Corridas.belongsTo(Usuarios, { 
    foreignKey: 'id_usuario',
    onDelete: 'NO ACTION', // Ou 'RESTRICT'
    onUpdate: 'CASCADE'
});
Usuarios.hasMany(Corridas, { foreignKey: 'id_usuario' });


module.exports = Corridas;