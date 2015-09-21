queue()
    .defer(d3.json, "/relatorio/?mes=8")
    .await(makeGraphs);

function makeGraphs(error, alertasJson) {

	//Clean projectsJson data
	var alertas = alertasJson;
	alertas.forEach(function(d) {
    	console.log(d)
	});


	//Create a Crossfilter instance
	var ndx = crossfilter(alertas);

	//Define Dimensions
	var diaDim = ndx.dimension(function(d) { return d["dia"]; });

	//Calculate metrics
	//var alertasPorDia = diaDim.group();
	var alertasPorDia = diaDim.group().reduceSum(function(d) {
	                                                return d["count"]
	                                            });

	var minDate = diaDim.bottom(1)[0]["dia"];
	var maxDate = diaDim.top(1)[0]["dia"];



    //Charts
	var timeChart = dc.barChart("#time-chart");
	var pontos = maxDate - minDate


	timeChart
		.width(600)
		.height(240)
		.brushOn(false)
		.margins({top: 10, right: 50, bottom: 30, left: 50})
		.dimension(diaDim)
		.group(alertasPorDia)
		.transitionDuration(500)
		.x(d3.scale.linear().domain([minDate, maxDate]))
		.elasticY(true)
		.xAxisLabel("Setembro")
		.yAxis().ticks(4);


    dc.renderAll();

};