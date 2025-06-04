const sequelize = require('../config/db');
const Aplicativos = require('./Aplicativos');
const Corridas = require('./Corridas');
const FormasPagamentos = require('./FormasPagamentos');
const usuarios = require('./Usuarios');

module.exports = {
    Aplicativos,
    Corridas,
    FormasPagamentos,
    usuarios
};