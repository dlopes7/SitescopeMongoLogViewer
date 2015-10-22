__author__ = 'david.lopes'
from calendar import monthrange
import datetime

from pymongo import MongoClient


def get_meses_disponiveis():
    meses = {
        1: 'Janeiro',
        2: 'Fevereiro',
        3: 'Marco',
        4: 'Abril',
        5: 'Maio',
        6: 'Junho',
        7: 'Julho',
        8: 'Agosto',
        9: 'Setembro',
        10: 'Outubro',
        11: 'Novembro',
        12: 'Dezembro',
    }
    anos = [2015,
            2016,
            ]

    servidor = '127.0.0.1'
    database = 'sitescope'
    collection = 'alerta_sem_event_console_v2'

    client = MongoClient(servidor, 27017)
    client.admin.authenticate('david', 'david')

    db = client[database]
    resultado = db[collection]

    client.close()
    meses_disponiveis = []
    for ano in anos:
        for mes in meses:
            start = datetime.datetime(ano, mes, 1, 0, 0, 1)
            end = datetime.datetime(ano, mes, (monthrange(ano, mes))[1], 23, 59, 59)
            # ()
            num_alertas = resultado.count({'horario': {'$gte': start, '$lt': end}})
            if num_alertas > 0:
                meses_disponiveis.append('{ano} - {mes}'.format(ano=ano, mes=meses[mes]))

    return meses_disponiveis


print(get_meses_disponiveis())
