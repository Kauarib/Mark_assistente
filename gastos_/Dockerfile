# 1. Usar uma imagem base oficial do Node.js.

FROM node:18-alpine

# 2. Definir o diretório de trabalho dentro do contentor.
# Este é o diretório onde todos os comandos seguintes serão executados.
WORKDIR /usr/src/app

# 3. Copiar os ficheiros de dependências primeiro para aproveitar o cache do Docker.
# Isto permite que o Docker não precise reinstalar as dependências se apenas o código da aplicação mudar.
COPY package*.json ./

# 4. Instalar as dependências da aplicação.
# Usar npm ci para instalar as dependências de produção.
# Isto garante que as dependências são instaladas de acordo com o package-lock.json.
RUN npm ci --only=production

# 5. Copiar o resto do código da aplicação para o diretório de trabalho.
# Isto inclui o código da aplicação, ficheiros de configuração, etc.
COPY . .

# 6. Expor a porta em que a sua aplicação corre dentro do contentor.
# Esta porta deve corresponder à variável PORT no seu .env. Assumindo que é 5000.
EXPOSE 5000

# 7. Definir o comando para executar a aplicação quando o contentor iniciar.
CMD [ "npm", "start" ]
