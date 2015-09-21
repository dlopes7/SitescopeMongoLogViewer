import json
import datetime
import re
from calendar import monthrange

from bson import json_util
from flask import Flask, render_template, jsonify, request
from pymongo import MongoClient

app = Flask(__name__)

MONGODB_HOST = 'localhost'
MONGODB_PORT = 27017
MONGODB_DB = 'sitescope'
MONGODB_COLLECTION = 'alerta_sem_event_console'


@app.route('/relatorio/')
def get_relatorio():
    mes = request.args.get('mes')
    dia = request.args.get('dia')
    filtro = request.args.get('filtro')

    if filtro is not None and filtro != 'None':
        filtro_campo, filtro_regex = filtro.split(':')
    else:
        filtro_campo, filtro_regex = None, None

    if mes is None:
        mes = datetime.datetime.now().month
    else:
        mes = int(mes)
    if dia is None:
        dia_fim = (monthrange(2015, mes))[1]
        dia_inicio = 1
    else:
        dia_inicio = int(dia)
        dia_fim = int(dia) + 1

    client = MongoClient(MONGODB_HOST, MONGODB_PORT)
    client.admin.authenticate('david', 'david')
    col = client[MONGODB_DB][MONGODB_COLLECTION]

    relatorio = []
    try:

        start_date = datetime.datetime(2015, mes, dia_inicio, 0, 0, 1)
        end_date = datetime.datetime(2015, mes, dia_fim, 23, 59, 59)

        if filtro is None or filtro == 'None':
            relatorio_diario = col.find({'horario': {'$gte': start_date, '$lt': end_date}})
        else:
            relatorio_diario = col.find({'horario': {'$gte': start_date, '$lt': end_date},
                                         '{}'.format(filtro_campo): re.compile('{}'.format(filtro_regex),
                                                                               re.IGNORECASE)})

    except ValueError as erro:
        return jsonify({'Erro': '{}'.format(erro)})

    # A future javascript array
    for resultado in relatorio_diario:
        relatorio.append(resultado)

    client.close()
    return json.dumps(relatorio, default=json_util.default)


@app.route('/')
def home_page():
    mes = request.args.get('mes')
    filtro = request.args.get('filtro')

    if mes is None:
        mes = datetime.datetime.now().month
    else:
        mes = int(mes)

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

    possiveis_filtros = ['sitescope',
                         'alert-group',
                         'alert-to',
                         'alert-message',
                         'alert-monitor',
                         'alert-type',
                         'alert-monitor-id',
                         'alert-subject',
                         'alert-id',
                         'action-name',
                         ]

    if mes not in meses.keys():
        return jsonify({'Erro': 'Mes invalido, opcoes validas sao: {}'.format(meses)})

    return render_template(
        'index.html',
        num_mes=mes,
        nome_mes=meses[mes],
        filtro=filtro,
        possiveis_filtros=possiveis_filtros,
    )


if __name__ == '__main__':
    app.run(host='vlo02737.corp.nova', port=80, debug=True)
