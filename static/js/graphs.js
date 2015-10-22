queue()
    .defer(d3.json, "/relatorio/?mes=" + num_mes + "&filtro=" + filtro)
    .await(makeGraphs);

function makeGraphs(error, alertasJson) {

    //The entire JSON response (a Javascript array)
	var alertas = alertasJson;

    //In case the query has no results, let the user know
    if (alertas.length == 0){
        alert(alertas.length + ' alertas encontrados');
    }

    //Convert the time so Javascript doesn't try to autoconvert and mix timezones
	alertas.forEach(function(d) {
	    var hora =  new Date(d['horario']['$date']);
	    hora.setTime( hora.getTime() + hora.getTimezoneOffset()*60*1000 );
		d['horario'] = hora;

		if (d["action-name"].toLowerCase().indexOf("rtn") > -1 || d["action-name"].toLowerCase().indexOf("normal") > -1){
	        d["criticidade"] = "Normal"
	    }
	    else if (d["action-name"].toLowerCase().indexOf("rtn") == -1 && d["action-name"].toLowerCase().indexOf("normal") == -1 &&  d["action-name"].toLowerCase().indexOf("warning") > -1  ){
	         d["criticidade"] =  "Warning"
	    }
	    else if (d["action-name"].toLowerCase().indexOf("rtn") == -1 && d["action-name"].toLowerCase().indexOf("normal") == -1 &&  d["action-name"].toLowerCase().indexOf("critical") > -1  ){
	         d["criticidade"] =  "Critical"
	    }
	    else if (d["alert-message"]){
	        if (d["alert-message"].toLowerCase().indexOf("rtn") > -1 || d["alert-message"].toLowerCase().indexOf("normal") > -1){
	            d["criticidade"] = "Normal"
	        }
	        else if (d["alert-message"].toLowerCase().indexOf("rtn") == -1 && d["alert-message"].toLowerCase().indexOf("normal") == -1 &&  d["alert-message"].toLowerCase().indexOf("warning") > -1  ){
	         d["criticidade"] =  "Warning"
	        }
	        else if (d["alert-message"].toLowerCase().indexOf("rtn") == -1 && d["alert-message"].toLowerCase().indexOf("normal") == -1 &&  d["alert-message"].toLowerCase().indexOf("critical") > -1  ){
	         d["criticidade"] =  "Critical"
	        }
	    }

	    else{
	         d["criticidade"] =  "Outro";
	    }

	});

    //This is the crossfilter object
	var ndx = crossfilter(alertas);

	var all = ndx.groupAll();

    //Dimension on the day of the month, used on a chart later
    var diaDim = ndx.dimension(function(d) {
        return d["horario"].getDate();
    });

    //Dimension that returns the entire thing (used in a table later)
    var tudoDim = ndx.dimension(function(d) {
	    return d;
	});


	var chamadosDimGroup = tudoDim.group().reduceSum(function(d) {
	    if (d["alert-to"]){
	        if (d["alert-to"].indexOf("servicedesk") > -1){
	             return 1;
	        }
	    }
    return 0;

	});

    var criticidadeDim = ndx.dimension(function(d) {
        return d["criticidade"];
	});

	var criticidadeDimGroup = criticidadeDim.group();

	var sitescopeDim = ndx.dimension(function(d) {
	    if (d["alert-type"] == "Mailto"){
	        return "E-mail"
	    }
	    else if (d["alert-type"] == "Run"){
	        return "SMS"
	    }
	    else{
	        return d["alert-type"];
	    }

	});
	var sitescopeDimGroup = sitescopeDim.group();

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

    var colorScaleSis = d3.scale.ordinal().domain(["hp-sitescope001.dc.nova", "hp-sitescope002.dc.nova", "hp-sitescope003.dc.nova", "hp-sitescope004.dc.nova"])
                                   .range(["#1E90FF", "#FF8C00", "#228B22",  "#CD5C5C"]);

    var timeChart = dc.barChart("#time-chart");
	timeChart
		.width($(document).width() * 0.70)
		.height(320)
		.brushOn(true)
		.margins({top: 10, right: 150, bottom: 30, left: 50})
		.dimension(diaDim)
		.group(alertasPorDia, "hp-sitescope001.dc.nova")
		.centerBar(false)
		//.legend(dc.legend().x($(document).width() * 0.45).y(10))
		.valueAccessor(function(d) {
                    return d.value.sitescope001;
                })
        .stack(alertasPorDia, "hp-sitescope002.dc.nova", function(d){return d.value.sitescope002;})
        .stack(alertasPorDia, "hp-sitescope003.dc.nova", function(d){return d.value.sitescope003;})
        .stack(alertasPorDia, "hp-sitescope004.dc.nova", function(d){return d.value.sitescope004;})
		.transitionDuration(500)
		/*.title(function(d){
                    return d.key
                            + "\nSitescope001: " + d.value.sitescope001
                            + "\nSitescope002: " + d.value.sitescope002
                            + "\nSitescope003: " + d.value.sitescope003
                            + "\nSitescope004: " + d.value.sitescope004 ;
                })*/
		.x(d3.scale.linear().domain([minDate, maxDate + 1]))
		.colors(function(d){
                return colorScaleSis(d);
            })
		.elasticY(false)
		.xAxisLabel(nome_mes)
		.xAxis().ticks(maxDate);

    var tempoFormat = d3.time.format("%d/%m/%Y %H:%M:%S");
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
	        {
	           label:'Sitescope',
	           format: function(d){
	            return d['sitescope'].replace('hp-', '').replace('.dc.nova', '');
	           }
	        },
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
        .showGroups(false)
        .sortBy(function (d) {
            return d['horario'];
        })


        var numeroAlertas = dc.numberDisplay("#numero-alertas");

		numeroAlertas
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(all);

		var numeroChamados = dc.numberDisplay("#numero-chamados");

		numeroChamados
		.formatNumber(d3.format("d"))
		.group(chamadosDimGroup)
		.valueAccessor(function(d){
		    console.log(d)
		    return d.value;
		 });

		var alertasChart = dc.pieChart("#tipo-alertas");
        alertasChart
            .width(200)
            .height(200)
            .slicesCap(5)
            .innerRadius(25)
            .dimension(sitescopeDim)
            .group(sitescopeDimGroup);

        var colorScale = d3.scale.ordinal().domain(["Critical", "Warning", "Normal", "Outro"])
                                   .range(["#FF0000", "#FFD700", "#00BF00",  "#BDE5F8"]);

        var criticidadeChart = dc.pieChart("#criticidade");
        criticidadeChart
            .width(200)
            .height(200)
            .slicesCap(5)
            .innerRadius(25)
            .dimension(criticidadeDim)
            .colors(function(d){
                return colorScale(d);
            })
            .group(criticidadeDimGroup);


		dc.renderAll();
};