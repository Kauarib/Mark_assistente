# email_automation.py

import imaplib
import email
from email.header import decode_header
import webbrowser
import re
import os
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup
from datetime import datetime
import time 
import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding as sym_padding # Para padding PKCS7

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

# --- Configurações ---
IMAP_HOST = 'imap.gmail.com'
API_CORRIDAS_ENDPOINT_URL = os.getenv('API_CORRIDAS_ENDPOINT_URL')
API_APPS_ENDPOINT_URL = os.getenv('API_APPS_ENDPOINT_URL')
API_FORMAS_PAGAMENTO_ENDPOINT_URL = os.getenv('API_FORMAS_PAGAMENTO_ENDPOINT_URL')
PYTHON_SCRIPT_API_KEY = os.getenv('PYTHON_SCRIPT_API_KEY')

# Novas configurações para credenciais IMAP por usuário
TARGET_USER_ID = os.getenv('TARGET_USER_ID')
API_USER_IMAP_CREDS_ENDPOINT_URL_TEMPLATE = os.getenv('API_USER_IMAP_CREDS_ENDPOINT_URL_TEMPLATE')
IMAP_ENCRYPTION_KEY_HEX = os.getenv('IMAP_ENCRYPTION_KEY')

if IMAP_ENCRYPTION_KEY_HEX and len(IMAP_ENCRYPTION_KEY_HEX) == 64:
    ENCRYPTION_KEY = bytes.fromhex(IMAP_ENCRYPTION_KEY_HEX) # Chave de 32 bytes
else:
    print("[ERRO FATAL] IMAP_ENCRYPTION_KEY não está definida corretamente no .env ou não tem 32 bytes (64 caracteres hex).")
    ENCRYPTION_KEY = None # Ou saia do script

INTERVALO_VERIFICACAO_SEGUNDOS = int(os.getenv('INTERVALO_VERIFICACAO_SEGUNDOS', 300)) 

FP_DESCRICAO_VISA = "Visa"
FP_DESCRICAO_MASTERCARD = "Mastercard"
# ... (outras constantes de forma de pagamento) ...
FP_DESCRICAO_CARTAO_PADRAO = "Cartão de Crédito/Débito"
FP_DESCRICAO_DESCONHECIDO = "Desconhecido"

BANDEIRA_KEYWORDS_REGEX_MAP = {
    FP_DESCRICAO_VISA: [r'visa\b', r'visa credit', r'visa_3x\.png'],
    FP_DESCRICAO_MASTERCARD: [r'mastercard', r'master\scard'],
    # ... (outros mapeamentos) ...
}

# --- Funções Auxiliares de Criptografia (Compatível com Node.js AES-256-CBC) ---
def decrypt_imap_password(encrypted_password_with_iv):
    if not encrypted_password_with_iv or not ENCRYPTION_KEY:
        print("  [DECRYPT] Senha encriptada ou chave de encriptação ausente.")
        return None
    try:
        parts = encrypted_password_with_iv.split(':')
        if len(parts) != 2:
            print("  [DECRYPT] Formato inválido para senha encriptada com IV. Esperado 'iv:textoEncriptado'.")
            return None
        
        iv = bytes.fromhex(parts[0])
        encrypted_text_hex = parts[1]
        encrypted_text_bytes = bytes.fromhex(encrypted_text_hex)

        cipher = Cipher(algorithms.AES(ENCRYPTION_KEY), modes.CBC(iv), backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_padded_bytes = decryptor.update(encrypted_text_bytes) + decryptor.finalize()
        
        # Remover padding PKCS7
        unpadder = sym_padding.PKCS7(algorithms.AES.block_size).unpadder()
        decrypted_bytes = unpadder.update(decrypted_padded_bytes) + unpadder.finalize()
        
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"  [DECRYPT] Erro ao decriptar senha IMAP: {e}")
        import traceback
        traceback.print_exc()
        return None

# --- Outras Funções Auxiliares (limpar_texto, decodificar_assunto, etc. - mantidas como antes) ---
def limpar_texto(texto):
    if not texto: return ""
    return re.sub(r'\s+', ' ', texto).strip()

def decodificar_assunto(assunto_codificado):
    if not assunto_codificado: return ""
    partes_decodificadas = decode_header(assunto_codificado)
    assunto = []
    for parte, charset in partes_decodificadas:
        if isinstance(parte, bytes):
            assunto.append(parte.decode(charset or 'utf-8', errors='replace'))
        else:
            assunto.append(parte)
    return "".join(assunto)

def extrair_dados_email(msg):
    remetente = ""
    partes_from = decode_header(msg.get("From", ""))
    for parte, charset in partes_from:
        if isinstance(parte, bytes):
            remetente += parte.decode(charset or 'utf-8', errors='replace')
        else:
            remetente += parte
    match_email_remetente = re.search(r'<([^>]+)>', remetente)
    remetente_final = match_email_remetente.group(1).lower() if match_email_remetente else remetente.strip().lower()
    assunto = decodificar_assunto(msg.get("Subject", ""))
    data_email_str = msg.get("Date", "")
    data_email_obj = None
    if data_email_str:
        try:
            data_email_obj = email.utils.parsedate_to_datetime(data_email_str)
        except Exception as e:
            print(f"  [AVISO] Não foi possível parsear a data (tentativa 1): {data_email_str} - Erro: {e}")
            for fmt in ('%a, %d %b %Y %H:%M:%S %z (%Z)', '%a, %d %b %Y %H:%M:%S %z', '%d %b %Y %H:%M:%S %z'):
                try:
                    data_email_obj = datetime.strptime(data_email_str, fmt)
                    print(f"  [INFO] Data parseada com formato alternativo: {fmt}")
                    break
                except ValueError: continue
            if not data_email_obj: print(f"  [AVISO] Formato de data não reconhecido: {data_email_str}")
    return remetente_final, assunto, data_email_obj

def extrair_conteudo_principal(msg):
    corpo_html, corpo_texto = None, None
    if msg.is_multipart():
        for part in msg.walk():
            ctype, cdisp = part.get_content_type(), str(part.get("Content-Disposition"))
            if "attachment" not in cdisp:
                try:
                    payload = part.get_payload(decode=True)
                    charset = part.get_content_charset() or 'utf-8'
                    if ctype == "text/html" and not corpo_html: corpo_html = payload.decode(charset, errors='replace')
                    elif ctype == "text/plain" and not corpo_texto: corpo_texto = payload.decode(charset, errors='replace')
                except Exception as e: print(f"  [ERRO] ao decodificar parte: {e}")
    else:
        ctype = msg.get_content_type()
        try:
            payload = msg.get_payload(decode=True)
            charset = msg.get_content_charset() or 'utf-8'
            if ctype == "text/html": corpo_html = payload.decode(charset, errors='replace')
            elif ctype == "text/plain": corpo_texto = payload.decode(charset, errors='replace')
        except Exception as e: print(f"  [ERRO] ao decodificar payload simples: {e}")
    if corpo_html and len(corpo_html) > 100: return corpo_html, "html"
    elif corpo_texto: return corpo_texto, "text"
    return "", "nenhum"

def _get_api_headers():
    headers = {'Content-Type': 'application/json'}
    if PYTHON_SCRIPT_API_KEY:
        headers['x-api-key'] = PYTHON_SCRIPT_API_KEY
    else:
        print("[AVISO API] PYTHON_SCRIPT_API_KEY não definida no .env.")
    return headers

def obter_ou_criar_id_via_api(endpoint_url, params_get=None, payload_post=None, campo_id_resposta='id', nome_entidade="Item"):
    if not endpoint_url:
        print(f"  [ERRO API] URL do endpoint para {nome_entidade} não configurada.")
        return None
    headers = _get_api_headers() 
    item_id, tentar_criar = None, False
    if params_get:
        try:
            print(f"  [API GET {nome_entidade}] Consultando {endpoint_url} com params: {params_get}")
            response_get = requests.get(endpoint_url, params=params_get, headers=headers, timeout=10)
            if response_get.status_code == 200:
                dados_resposta = response_get.json()
                item_encontrado = dados_resposta[0] if isinstance(dados_resposta, list) and dados_resposta else (dados_resposta if isinstance(dados_resposta, dict) and dados_resposta else None)
                if item_encontrado and campo_id_resposta in item_encontrado:
                    item_id = item_encontrado[campo_id_resposta]
                    print(f"  [API GET {nome_entidade}] {nome_entidade} encontrado: {campo_id_resposta} = {item_id}")
                    return item_id 
                else:
                    print(f"  [API GET {nome_entidade}] {nome_entidade} não encontrado (200 mas '{campo_id_resposta}' ausente ou dados inválidos).")
                    tentar_criar = bool(payload_post)
            elif response_get.status_code == 404:
                print(f"  [API GET {nome_entidade}] {nome_entidade} não encontrado (404).")
                tentar_criar = bool(payload_post)
            else: 
                print(f"  [ERRO API GET {nome_entidade}] {response_get.status_code} - {response_get.text}")
                return None 
        except requests.exceptions.RequestException as e:
            print(f"  [ERRO API GERAL {nome_entidade}] GET: {e}")
            return None 
    if (not params_get or tentar_criar) and payload_post:
        try:
            print(f"  [API POST {nome_entidade}] Criando {nome_entidade} em {endpoint_url} payload: {payload_post}")
            response_post = requests.post(endpoint_url, json=payload_post, headers=headers, timeout=10)
            if response_post.status_code == 409 and params_get:
                 print(f"  [API POST {nome_entidade}] Conflito (409). Buscando novamente...")
                 return obter_ou_criar_id_via_api(endpoint_url, params_get=params_get, payload_post=None, campo_id_resposta=campo_id_resposta, nome_entidade=nome_entidade)
            response_post.raise_for_status() 
            novo_item = response_post.json()
            if campo_id_resposta in novo_item:
                item_id = novo_item[campo_id_resposta]
                print(f"  [API POST {nome_entidade}] Criado: {campo_id_resposta} = {item_id}")
                return item_id
            else:
                print(f"  [ERRO API POST {nome_entidade}] Campo '{campo_id_resposta}' não na resposta: {novo_item}")
                return None
        except requests.exceptions.HTTPError as http_err:
            if not (http_err.response and http_err.response.status_code == 409): 
                 print(f"  [ERRO API HTTP POST {nome_entidade}] {http_err} - Resposta: {http_err.response.text if http_err.response else 'Sem resposta'}")
            return None 
        except requests.exceptions.RequestException as e:
            print(f"  [ERRO API GERAL {nome_entidade}] POST: {e}")
            return None
    return item_id

def inferir_forma_pagamento_e_digitos(remetente, conteudo_bruto, tipo_conteudo):
    descricao_fp_inferida = FP_DESCRICAO_DESCONHECIDO
    ultimos_digitos_cartao_str = "0000" 
    texto_para_busca_keywords = conteudo_bruto.lower()
    if tipo_conteudo == 'html':
        try:
            soup = BeautifulSoup(conteudo_bruto, 'lxml')
            texto_para_busca_keywords = soup.get_text(separator=" ", strip=True).lower()
        except Exception as e: print(f"  [AVISO] Erro BeautifulSoup para inferir FP: {e}")
    for bandeira, patterns in BANDEIRA_KEYWORDS_REGEX_MAP.items():
        for pattern in patterns:
            source_text = conteudo_bruto if ".png" in pattern else texto_para_busca_keywords
            if re.search(pattern, source_text, re.IGNORECASE):
                descricao_fp_inferida = bandeira; break
        if descricao_fp_inferida not in [FP_DESCRICAO_DESCONHECIDO, FP_DESCRICAO_CARTAO_PADRAO]: break
    if descricao_fp_inferida == FP_DESCRICAO_DESCONHECIDO:
        if any(term in texto_para_busca_keywords for term in ["cartão de crédito", "cartao de credito", "credit card", "cartão de débito", "cartao de debito", "debit card"]):
            descricao_fp_inferida = FP_DESCRICAO_CARTAO_PADRAO
    if remetente == 'noreply@uber.com':
        match_cartao = re.search(r'[•*]{4}(\d{4})', conteudo_bruto)
        if match_cartao: ultimos_digitos_cartao_str = match_cartao.group(1)
        print(f"    [UBER] Dígitos cartão: {ultimos_digitos_cartao_str if match_cartao else 'não encontrados, padrão 0000'}.")
    elif remetente == 'voude99@99app.com':
        print(f"    [99APP] Dígitos cartão: não disponíveis, padrão '{ultimos_digitos_cartao_str}'.")
    print(f"    Descrição FP Inferida Final: {descricao_fp_inferida}")
    return descricao_fp_inferida, ultimos_digitos_cartao_str

def enviar_dados_corrida_para_api(dados_corrida):
    if not API_CORRIDAS_ENDPOINT_URL:
        print("  [ERRO API CORRIDAS] URL não configurada.")
        return False
    headers = _get_api_headers()
    try:
        print(f"  [API CORRIDAS] Enviando: {API_CORRIDAS_ENDPOINT_URL}, Payload: {dados_corrida}")
        response = requests.post(API_CORRIDAS_ENDPOINT_URL, json=dados_corrida, headers=headers, timeout=10)
        response.raise_for_status()
        print(f"  [API CORRIDAS] Sucesso! Status: {response.status_code}, Resposta: {response.json()}")
        return True
    except requests.exceptions.HTTPError as http_err:
        try:
            error_details = http_err.response.json() if http_err.response else None
            print(f"  [ERRO API CORRIDAS] HTTP: {http_err} - Detalhes: {error_details}")
        except json.JSONDecodeError:
            print(f"  [ERRO API CORRIDAS] HTTP: {http_err} - Resposta (não JSON): {http_err.response.text if http_err.response else 'Sem resposta'}")
    except requests.exceptions.RequestException as e:
        print(f"  [ERRO API CORRIDAS] Requisição: {e}")
    return False

# --- NOVA FUNÇÃO PARA OBTER CREDENCIAIS IMAP DO USUÁRIO ---
def obter_credenciais_imap_usuario(id_usuario_alvo):
    if not API_USER_IMAP_CREDS_ENDPOINT_URL_TEMPLATE:
        print("  [ERRO FATAL] API_USER_IMAP_CREDS_ENDPOINT_URL_TEMPLATE não definido no .env")
        return None, None
    if not id_usuario_alvo:
        print("  [ERRO] ID do usuário alvo não fornecido para buscar credenciais IMAP.")
        return None, None

    endpoint_url = API_USER_IMAP_CREDS_ENDPOINT_URL_TEMPLATE.replace("{id_usuario}", str(id_usuario_alvo))
    headers = _get_api_headers()
    
    print(f"  [API IMAP CREDS] Buscando credenciais IMAP para usuário ID {id_usuario_alvo} em {endpoint_url}")
    try:
        response = requests.get(endpoint_url, headers=headers, timeout=10)
        response.raise_for_status() # Lança erro para status ruins (4xx, 5xx)
        
        credenciais_encriptadas = response.json()
        email_login = credenciais_encriptadas.get('email_login')
        encrypted_password_with_iv = credenciais_encriptadas.get('encrypted_password_with_iv')

        if not email_login or not encrypted_password_with_iv:
            print("  [ERRO API IMAP CREDS] Resposta da API não continha email_login ou encrypted_password_with_iv.")
            return None, None

        print("  [API IMAP CREDS] Credenciais encriptadas recebidas. Tentando decriptar...")
        decrypted_password = decrypt_imap_password(encrypted_password_with_iv)

        if not decrypted_password:
            print("  [ERRO] Falha ao decriptar a senha do aplicativo IMAP.")
            return None, None
        
        print("  [API IMAP CREDS] Senha IMAP decriptada com sucesso.")
        return email_login, decrypted_password

    except requests.exceptions.HTTPError as http_err:
        print(f"  [ERRO API IMAP CREDS] Erro HTTP: {http_err} - Resposta: {http_err.response.text if http_err.response else 'Sem resposta'}")
    except requests.exceptions.RequestException as e:
        print(f"  [ERRO API IMAP CREDS] Erro na Requisição: {e}")
    except Exception as e:
        print(f"  [ERRO INESPERADO em obter_credenciais_imap_usuario]: {e}")
    return None, None


# --- Função Principal de Processamento ---
def processar_emails():
    # Obter credenciais IMAP para o TARGET_USER_ID no início
    if not TARGET_USER_ID:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ERRO] TARGET_USER_ID não definido no .env. Não é possível buscar e-mails.")
        return

    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Tentando obter credenciais IMAP para o usuário ID: {TARGET_USER_ID}")
    usuario_email_login, usuario_imap_password = obter_credenciais_imap_usuario(TARGET_USER_ID)

    if not usuario_email_login or not usuario_imap_password:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ERRO] Não foi possível obter/decriptar credenciais IMAP para o usuário {TARGET_USER_ID}. Verificação de e-mail abortada para este ciclo.")
        return
    
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Credenciais IMAP obtidas para {usuario_email_login}. Iniciando verificação de e-mails...")

    try:
        mail = imaplib.IMAP4_SSL(IMAP_HOST)
        mail.login(usuario_email_login, usuario_imap_password) # USA AS CREDENCIAIS DO USUÁRIO
        print("[INFO] Login IMAP OK.")
        mail.select("inbox")
        status, messages_ids_bytes = mail.search(None, "UNSEEN")
        if status != "OK":
            print("[ERRO] Falha ao buscar e-mails."); mail.logout(); return
        email_ids = messages_ids_bytes[0].split()
        if not email_ids or email_ids == [b'']:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Nenhum e-mail novo para {usuario_email_login}.")
        else:
            print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] {len(email_ids)} e-mails novos para {usuario_email_login}.")
            for email_id_bytes in email_ids:
                email_id_str = email_id_bytes.decode()
                print(f"\n--- Processando E-mail ID: {email_id_str} ---")
                status, msg_data = mail.fetch(email_id_bytes, "(RFC822)")
                if status != "OK": print(f"  [ERRO] Falha ao buscar e-mail ID {email_id_str}"); continue
                for response_part in msg_data:
                    if not isinstance(response_part, tuple): continue
                    msg = email.message_from_bytes(response_part[1])
                    remetente, assunto, data_email = extrair_dados_email(msg)
                    print(f"  De: {remetente}\n  Assunto: {assunto}\n  Data: {data_email.strftime('%Y-%m-%d %H:%M:%S') if data_email else 'N/A'}")

                    payload_criar_app = {"email": remetente, "nome_apps": f"App_{remetente.split('@')[0]}"} 
                    app_id = obter_ou_criar_id_via_api(API_APPS_ENDPOINT_URL, params_get={"email": remetente}, payload_post=payload_criar_app, campo_id_resposta='id_apps', nome_entidade="Aplicativo")
                    if not app_id: print(f"  [INFO] App ID não obtido/criado para '{remetente}'. Pulando."); continue
                    
                    conteudo_bruto, tipo_conteudo = extrair_conteudo_principal(msg)
                    print(f"  [DEBUG] Conteúdo principal: {tipo_conteudo}")
                    if not conteudo_bruto: print("  [AVISO] Conteúdo vazio. Pulando."); continue
                    
                    descricao_fp_inferida, ultimos_digitos_cartao_str = inferir_forma_pagamento_e_digitos(remetente, conteudo_bruto, tipo_conteudo)
                    payload_criar_fp = {"descricao": descricao_fp_inferida, "bandeira": descricao_fp_inferida, "ativo": True }
                    id_fp = obter_ou_criar_id_via_api(API_FORMAS_PAGAMENTO_ENDPOINT_URL, params_get={"descricao": descricao_fp_inferida}, payload_post=payload_criar_fp, campo_id_resposta='id_forma_pagamento', nome_entidade="FormaPagamento")
                    if not id_fp: print(f"  [AVISO] ID Forma Pagamento não obtido/criado para '{descricao_fp_inferida}'.")
                    
                    valor_extraido_str = None
                    if remetente == 'noreply@uber.com':
                        match_valor_uber_total = re.search(r'<td class="Uber18_p3 total_head"[^>]*>R\$\s*([\d,]+)<\/td>', conteudo_bruto, re.IGNORECASE)
                        if match_valor_uber_total: valor_extraido_str = f"R$ {match_valor_uber_total.group(1).replace('.', ',')}"
                        else:
                            match_valor_geral = re.search(r'R\$\s*(\d+,\d{2})', conteudo_bruto)
                            if match_valor_geral: valor_extraido_str = f"R$ {match_valor_geral.group(1)}"
                    elif remetente == 'voude99@99app.com':
                        match_valor = re.search(r'R\$\s*(\d+,\d{2})', conteudo_bruto)
                        if match_valor: valor_extraido_str = f"R$ {match_valor.group(1)}"
                    
                    if valor_extraido_str: print(f"    Valor extraído: {valor_extraido_str}")
                    else: print("    Valor não extraído.")

                    if valor_extraido_str and data_email and app_id:
                        valor_float = None
                        try:
                            valor_float = float(valor_extraido_str.replace('R$', '').replace(',', '.').strip())
                        except (ValueError, AttributeError): print(f"  [ERRO] Conversão de valor '{valor_extraido_str}' falhou."); continue
                        
                        dados_para_api = {"data": data_email.strftime('%Y-%m-%d'), "valor": valor_float, "cartao": ultimos_digitos_cartao_str, "id_forma_pagamento": id_fp, "id_apps": app_id, "id_usuario": int(TARGET_USER_ID) } # Adiciona id_usuario
                        enviar_dados_corrida_para_api(dados_para_api)
                    else: print("  [AVISO] Dados insuficientes para API de Corridas.")
                # mail.store(email_id_bytes, '+FLAGS', '\\Seen') 
        mail.close()
        mail.logout()
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Verificação concluída.")
    except imaplib.IMAP4.error as e: print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ERRO IMAP] {e}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ERRO GERAL] {e}")
        import traceback; traceback.print_exc()

if __name__ == "__main__":
    if not all([API_CORRIDAS_ENDPOINT_URL, API_APPS_ENDPOINT_URL, API_FORMAS_PAGAMENTO_ENDPOINT_URL, PYTHON_SCRIPT_API_KEY, TARGET_USER_ID, API_USER_IMAP_CREDS_ENDPOINT_URL_TEMPLATE, IMAP_ENCRYPTION_KEY_HEX]):
        print("[ERRO FATAL] Configurações ausentes no .env. Verifique todas as URLs de API, PYTHON_SCRIPT_API_KEY, TARGET_USER_ID, IMAP_ENCRYPTION_KEY e credenciais de e-mail (se ainda usadas globalmente).")
    else:
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Automação iniciada. Verificando a cada {INTERVALO_VERIFICACAO_SEGUNDOS}s.")
        try:
            while True:
                processar_emails()
                print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Próxima verificação em {INTERVALO_VERIFICACAO_SEGUNDOS}s...")
                time.sleep(INTERVALO_VERIFICACAO_SEGUNDOS) 
        except KeyboardInterrupt: print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Interrompido.")
        except Exception as e: print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [ERRO FATAL LOOP] {e}"); import traceback; traceback.print_exc()
        finally: print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Execução finalizada.")

# --- Fim do arquivo email_automation.py ---
