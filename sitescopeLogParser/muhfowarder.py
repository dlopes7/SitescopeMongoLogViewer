import re
import time

from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError, BulkWriteError
from dateutil import parser


def criar_log_local(sitescope):
    """
    Read the remote sitescope log files
    Create a single log file with all alerts

    :param sitescope: FQDN of the sitescope server
    :return: None
    """
    log_sis = []
    log_sis_old = []

    caminho_log = r'\\' + sitescope + r'\logs\\'

    print('Reading ' + r'\\' + sitescope + r'\logs\alert.log')
    try:
        with open(caminho_log + 'alert.log', 'r', encoding='utf8') as arquivo:
            log_sis = arquivo.readlines()
    except UnicodeDecodeError:
        with open(caminho_log + 'alert.log', 'r', encoding='latin-1') as arquivo:
            log_sis = arquivo.readlines()

    print('Reading ' + r'\\' + sitescope + r'\logs\alert.log.old')
    try:
        with open(caminho_log + 'alert.log.old', 'r', encoding='utf8') as arquivo:
            log_sis_old = arquivo.readlines()
    except UnicodeDecodeError:
        with open(caminho_log + 'alert.log.old', 'r', encoding='latin-1') as arquivo:
            log_sis_old = arquivo.readlines()
    except FileNotFoundError:
        pass

    print('Writing to ' + r'logs_local\sitescope\\' + sitescope + '.log')
    with open(r'logs_local\sitescope\\' + sitescope + '.log', 'w', encoding='utf8') as novo_arquivo:
        novo_arquivo.write(''.join(log_sis_old))
        novo_arquivo.write(''.join(log_sis))


def converter_log_para_json(sitescope):
    """
    Read the new log file and create an array of alerts.

    :param sitescope: FQDN of Sitescope server
    :return: an array of dictionaries, each dictionary is an alert
    """
    with open(r'logs_local\sitescope\\' + sitescope + '.log', 'r', encoding='utf8') as arquivo:
        alertas = []
        num_alertas = -1

        print('Criando Alertas! ')
        for line in arquivo.readlines():
            line = line.rstrip('\n')

            novo_alerta = re.match('(^[0-9][0-9]:[0-9][0-9]:[0-9][0-9] [0-9][0-9]/[0-9][0-9]/[0-9][0-9][0-9][0-9])',
                                   line)
            if novo_alerta:
                num_alertas += 1
                horario = parser.parse(novo_alerta.group(1))
                alertas.append({'horario': horario})

                alertas[num_alertas]['sitescope'] = sitescope

            elif (' alert-' in line or ' action-' in line) and ' alert-body' not in line:
                line_split = line.split(':', 1)
                metrica = line_split[0].lstrip(' ')
                valor = line_split[1].lstrip(' ')
                alertas[num_alertas][metrica] = valor

    return alertas


def gerar_ids(alertas):
    for alerta in alertas:
        alerta['id'] = alerta['alert-id'] + ' - ' + alerta['action-name'] + ' - ' + alerta['alert-type'] + ' - ' + str(
            alerta['horario'])
    return alertas


def deletar_event_console(alertas):
    print('{} alertas totais'.format(len(alertas)))
    alertas_novo = []
    for alerta in alertas:
        if alerta['alert-type'] != 'EventConsole':
            alertas_novo.append(alerta)
    print('{} alertas sem event console'.format(len(alertas_novo)))
    return alertas_novo


def inserir_alertas(alertas):
    servidor = '127.0.0.1'
    database = 'sitescope'
    collection = 'alerta_sem_event_console'

    client = MongoClient(servidor, 27017)
    client.admin.authenticate('david', 'david')

    db = client[database]
    resultado = db[collection]

    resultado.ensure_index('id', unique=True)

    print('Inserindo {} alertas no mongo'.format(len(alertas)))

    try:
        resultado.insert(alertas, continue_on_error=True)
    except BulkWriteError as e:
        pass
    except DuplicateKeyError as d:
        pass

    client.close()


def get_alerta(query):
    servidor = '127.0.0.1'
    database = 'sitescope'
    collection = 'alerta_sem_event_console_v2'

    client = MongoClient(servidor, 27017)
    client.admin.authenticate('david', 'david')

    db = client[database]
    resultado = db[collection]

    client.close()
    return resultado.find(query)


if __name__ == '__main__':

    sitescopes = [
        'hp-sitescope001.dc.nova',
        'hp-sitescope002.dc.nova',
        'hp-sitescope003.dc.nova',
        'hp-sitescope004.dc.nova',
    ]

    t1 = time.time()
    atualizacoes = 0
    while True:
        seconds = time.time() - t1
        m, s = divmod(seconds, 60)
        h, m = divmod(m, 60)
        atualizacoes += 1
        print('Atualizacao {}'.format(atualizacoes))
        print('Rodando a {h}:{m}:{s}'.format(h=int(h), m=int(m), s=int(s)))
        for sitescope in sitescopes:
            criar_log_local(sitescope)
            alertas = converter_log_para_json(sitescope)
            inserir_alertas(gerar_ids(deletar_event_console(alertas)))

        time.sleep(600)

    '''
    t1 = time.time() * 1000
    alertas_email = get_alerta({'alert-type':'Mailto'})
    print ('Tempo de query: ' + str(time.time()*1000 - t1) + ' ms para buscar ' + str(alertas_email.count()) + ' alertas')
    '''
