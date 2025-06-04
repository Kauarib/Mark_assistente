// seu_arquivo_de_modelo_corridas.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); // Seu arquivo de configuração do Sequelize
const Aplicativos = require('./Aplicativos'); // Importe o modelo Aplicativos
const FormasPagamentos = require('./FormasPagamentos'); // Importe o modelo FormasPagamentos
const Usuarios = require('./Usuarios'); // Importe o modelo Usuarios                                                               

const Corridas = sequelize.define('Corridas', {
    id: { 
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    data: {
        type: DataTypes.DATEONLY, 
        allowNull: false
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2), // Exemplo: DECIMAL com 10 dígitos no total, 2 após a vírgula
        allowNull: false
    },
    
    id_apps: { 
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Aplicativos, // Referencia o modelo importado
            key: 'Id_apps'      // Chave primária na tabela Aplicativos
        }
    },
   
    id_forma_pagamento: {
        type: DataTypes.INTEGER,
        allowNull: true, // Permite nulo, caso uma corrida não tenha uma forma de pagamento associada
        references: {
            model: FormasPagamentos, // Referencia o modelo FormasPagamentos importado
            key: 'id_forma_pagamento'  // Chave primária na tabela FormasPagamentos
        }
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Usuarios', // Nome da tabela de usuários
            key: 'id_usuario'  // Chave primária na tabela Usuarios
        }
    },
    cartao: {
        type: DataTypes.STRING(4), // Para armazenar os 4 dígitos
        allowNull: true,       // Permite nulo
        defaultValue: '0000'   // Define "0000" como padrão se nenhum valor for fornecido
                              
    }
   
}, {
    timestamps: false, // Se você não usa timestamps para corridas
    tableName: 'Corridas' // Ou o nome exato da sua tabela no banco
});

// Definindo as associações (se ainda não estiverem definidas em outro lugar)
// Isso ajuda o Sequelize a entender as relações para joins, includes, etc.
Corridas.belongsTo(Aplicativos, { foreignKey: 'Id_apps', as: 'aplicativo' }); 
Aplicativos.hasMany(Corridas, { foreignKey: 'Id_apps' });

Corridas.belongsTo(FormasPagamentos, { foreignKey: 'id_forma_pagamento', as: 'formaDePagamento' }); // 'as' é opcional, mas útil
FormasPagamentos.hasMany(Corridas, { foreignKey: 'id_forma_pagamento' });

Corridas.belongsTo(Usuarios, { foreignKey: 'id_usuario', as: 'usuario' });
Usuarios.hasMany(Corridas, { foreignKey: 'id_usuario' });

module.exports = Corridas;
