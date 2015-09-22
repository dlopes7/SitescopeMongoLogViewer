queue()
    .defer(d3.json, "/relatorio/?mes=" + num_mes + "&filtro=" + filtro)
    .await(makeGraphs);

function makeGraphs(error, alertasJson) {

    //The entire JSON response (a Javascript array)
	var alertas = alertasJson;

    //In case the query has no results, let the user know
    if (alertas.length == 0){
        alert(alertas.length + ' alertas encontrados');
    }else{
        alert(alertas.length + ' alertas encontrados');
    }

    //Convert the time so Javascript doesn't try to autoconvert and mix timezones
	alertas.forEach(function(d) {
	    var hora =  new Date(d['horario']['$date']);
	    hora.setTime( hora.getTime() + hora.getTimezoneOffset()*60*1000 );
		d['horario'] = hora;
	});

    //This is the crossfilter object
	var ndx = crossfilter(alertas);

    //Dimension on the day of the month, used on a chart later
    var diaDim = ndx.dimension(function(d) {
        return d["horario"].getDate();
    });

    //Dimension that returns the entire thing (used in a table later)
    var tudoDim = ndx.dimension(function(d) {
	    return d;
	});

    //Agrupando valores pela data do mes
    var alertasPorDia = diaDim.group().reduce(
	    function(p, v) {
                    if (v.sitescope == "hp-sitescope001.dc.nova") {
                            p.sitescope001 += 1;
                    }
                    if (v.sitescope == "hp-sitescope002.dc.nova") {
                        p.sitescope002 += 1;
                    }
                    if (v.sitescope == "hp-sitescope003.dc.nova") {
                        p.sitescope003 += 1;
                    }
                    if (v.sitescope == "hp-sitescope004.dc.nova") {
                        p.sitescope004 += 1;
                    }
                    return p;
                },
        function(p, v) {
                    if (v.sitescope == "hp-sitescope001.dc.nova") {
                        p.sitescope001 -= 1;
                    }
                    if (v.sitescope == "hp-sitescope002.dc.nova") {
                        p.sitescope002 += 1;
                    }
                    if (v.sitescope == "hp-sitescope004.dc.nova") {
                        p.sitescope003 += 1;
                    }
                    if (v.sitescope == "hp-sitescope004.dc.nova") {
                        p.sitescope004 += 1;
                    }
                    return p;
                },
        function() {
                    return {
                            sitescope001:0,
                            sitescope002:0,
                            sitescope003:0,
                            sitescope004:0
                        };
                    }
	    );
	var minDate = diaDim.bottom(1)[0]["horario"].getDate();
	var maxDate = diaDim.top(1)[0]["horario"].getDate();

    var timeChart = dc.barChart("#time-chart");
	timeChart
		.width($(document).width() - 100)
		.height(300)
		.brushOn(true)
		.margins({top: 10, right: 150, bottom: 30, left: 50})
		.dimension(diaDim)
		.group(alertasPorDia, "hp-sitescope001.dc.nova")
		.centerBar(false)
		.legend(dc.legend().x($(document).width() - 250).y(10))
		.valueAccessor(function(d) {
                    return d.value.sitescope001;
                })
        .stack(alertasPorDia, "hp-sitescope002.dc.nova", function(d){return d.value.sitescope002;})
        .stack(alertasPorDia, "hp-sitescope003.dc.nova", function(d){return d.value.sitescope003;})
        .stack(alertasPorDia, "hp-sitescope004.dc.nova", function(d){return d.value.sitescope004;})
		.transitionDuration(500)
		.title(function(d){
                    return d.key
                            + "\nSitescope001: " + d.value.sitescope001
                            + "\nSitescope002: " + d.value.sitescope002
                            + "\nSitescope003: " + d.value.sitescope003
                            + "\nSitescope004: " + d.value.sitescope004 ;
                })
		.x(d3.scale.linear().domain([minDate, maxDate + 1]))
		.elasticY(true)
		.xAxisLabel(nome_mes)
		.xAxis().ticks(maxDate);

    var tempoFormat = d3.time.format("%H:%M:%S");
    var dataFormat = d3.time.format("%d/%m/%Y");

	var alertsTable = dc.dataTable('.alerts-table');
	alertsTable
	    .dimension(tudoDim)
	    .group(function (d) {
            return dataFormat(d['horario']);
        })
        .size(1000)
	    .columns([
	        {
	           label:'Horario',
	           format: function(d){
	            return tempoFormat(d['horario']);
	           }
	        },
	        'sitescope',
	        'alert-monitor',
	        'alert-type',
	        {
	            label:'Mensagem',
	            format: function(d){
	                if (d['alert-subject'] != null){
	                    return String.raw({ raw: d['alert-subject'].substring(0, 80) });
	                }else{
	                    return String.raw({ raw: (d['alert-message'] + ' - ' + d['action-name']).substring(0, 80) });
	                }
	            }
	        }
        ])
        .sortBy(function (d) {
            return d['horario'];
        })
		dc.renderAll();
};