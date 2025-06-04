const { DataTypes} = require('sequelize');
const sequelize = require('../config/db');

const Aplicativos = sequelize.define('Aplicativos', {
    id_apps: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome_apps: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email:{
        type: DataTypes.STRING,
        allowNull: false
    }
    
  
}, {
    timestamps: false
});

module.exports = Aplicativos;