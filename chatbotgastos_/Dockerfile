# 1. Usar uma imagem base oficial do Node.js.
# A variante 'alpine' é mais leve, ideal para produção.
FROM node:18-alpine

# 2. Definir o diretório de trabalho.
WORKDIR /usr/src/app

# 3. Copiar os ficheiros de dependências.
COPY package*.json ./

# 4. Instalar as dependências de produção.
# 'npm ci' é mais rápido e seguro para builds consistentes usando o package-lock.json.
RUN npm ci --only=production

# 5. Copiar o resto do código da aplicação.
COPY . .

# 6. Expor a porta em que a sua aplicação corre.
# Esta porta deve corresponder à variável PORT no seu .env do chatbot (ex: 3000).
EXPOSE 3000

# 7. Definir o comando para executar a aplicação.
# Assumindo que o seu package.json tem um script "start": "node server.js".
CMD [ "npm", "start" ]

