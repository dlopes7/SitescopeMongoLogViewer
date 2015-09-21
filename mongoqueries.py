from calendar import monthrange
import datetime

from pymongo import MongoClient


def get_alertas_por_dia(mes):
    ultimo_dia = (monthrange(2015, mes))[1]

    relatorio = {}
    client = MongoClient('localhost', 27017)
    client.admin.authenticate('david', 'david')

    col = client['sitescope']['alerta_sem_event_console']

    for dia in range(1, ultimo_dia):
        start_date = datetime.datetime(2015, 9, dia)
        end_date = datetime.datetime(2015, 9, dia + 1)

        pipeline = [
            {'$match': {'horario': {'$gte': start_date, '$lt': end_date}}},
            {'$group': {'_id': '$sitescope', 'count': {'$sum': 1}}}
        ]
        relatorio_diario = list(col.aggregate(pipeline))
        if relatorio_diario:
            relatorio[dia] = (relatorio_diario)
    return relatorio


print(get_alertas_por_dia('setembro').items())
