// src/server.js
const express = require('express');
const cors = require('cors');
//require('dotenv').config();

const sequelize = require('./config/db');
require('./models/App'); // Importa os modelos para criar as tabelas no banco de dados
//const buscarEProcessarEmails = require('./service/emailautomation');
//buscarEProcessarEmails.buscarEProcessarEmails(); // Inicia o processo de busca e processamento de emails


const aplicativosRoute = require('./routes/aplicativosRoute');
const corridasRoute = require('./routes/corridasRoute');
const formasPagamentosRoute = require('./routes/formasPagamentosRoute');
const usuariosRoute = require('./routes/usuariosRoute'); 

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas públicas
app.use('/api', aplicativosRoute);
app.use('/api', corridasRoute);
app.use('/api', formasPagamentosRoute);
app.use('/api', usuariosRoute);

// Rota principal
app.get('/', (req, res) => {
  res.send('🚀 servidor rodando!');
});

//*Sincroniza com o banco e inicia o servidor
const PORT = process.env.PORT || 5000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`🔥 Servidor rodando na porta ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Erro ao conectar com o banco de dados:', err);
});