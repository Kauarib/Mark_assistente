# 1. Usar uma imagem base oficial do Python.
# É recomendável usar uma imagem leve como 'python:3.9-slim' para reduzir o tamanho do contentor.
FROM python:3.9-slim

# 2. Definir o diretório de trabalho dentro do contentor.
WORKDIR /usr/src/app

# 3. Copiar o ficheiro de requisitos primeiro para aproveitar o cache do Docker.
# É crucial que você tenha um ficheiro 'requirements.txt' nesta pasta.
# Gere-o no seu ambiente local com: pip freeze > requirements.txt
COPY requirements.txt ./

# 4. Instalar as dependências Python.
# O '--no-cache-dir' reduz o tamanho da imagem ao não armazenar o cache do pip.
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar o resto do código da sua aplicação para o diretório de trabalho.
COPY . .

# 6. Definir o comando para executar a aplicação quando o contentor iniciar.
CMD [ "python", "./email_automation.py" ]