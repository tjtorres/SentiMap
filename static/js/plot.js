/*--------------GLOBALS-----------------*/
var circ_rad = 3;


var width = document.documentElement.clientWidth -200 ,
	height = document.documentElement.clientHeight;
	
var twip = "";

var click_state = 0;

var mouse = {x: 0, y: 0};

/*--------------------------------------*/

document.addEventListener('mousemove', function(e){ 
    mouse.x = e.clientX || e.pageX; 
    mouse.y = e.clientY || e.pageY 
}, false);


var projection = d3.geo.mercator()
	.translate([0, 50])
	.scale(1.8 * height / 2 / Math.PI);

var color = d3.scale.linear()
    .domain([0, .5, 1])
    .range(["red","gray","blue"]);

var zoom = d3.behavior.zoom()
	.scaleExtent([1, 15])
	.on("zoom", move);

var path = d3.geo.path()
	.projection(projection);

var svg = d3.select("#map").append("svg")
	.attr("width", width)
	.attr("height", height)
	.append("g")
	.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
	.call(zoom);



var g = svg.append("g");

var tooltip = d3.select("#map").append("div")
	.attr("class", "tooltip")
	.attr("style", "opacity: 0.0");


svg.append("rect")
	.attr("class", "overlay")
	.attr("x", -width / 2)
	.attr("y", -height / 2)
	.attr("width", width)
	.attr("height", height);



queue()
	.defer(d3.json, "static/Data/json/countries.topo.json")
	.defer(d3.json, "static/Data/json/states_usa.topo.json")
	.await(ready)


var myMouseoverFunction = function(d) {

	var circle = d3.select(this);
	circle.transition().duration(100)
		.attr("r", circ_rad * 3.5);



	tooltip.selectAll("div").remove();
	tooltip.classed("hidden", false);

	var q = tooltip
		.append("foreignObject")
		.attr("width", 50)
		.attr("height", 60)

	.append("xhtml:div")
		.style("font", "14px 'Arial Unicode MS'")
		.style("color", "#555")
		.html("<h3>" + d.text + "</h3>");


}




function ready(error, world, us, tweet) {
	g.append("path")
		.datum(topojson.feature(world, world.objects.countries))
		.attr("class", "land")
		.attr("d", path);
	g.append("path")
		.datum(topojson.mesh(world, world.objects.countries, function(a, b) {
			return a !== b;
		}))
		.attr("class", "boundary")
		.attr("d", path);
	g.append("path")
		.datum(topojson.mesh(us, us.objects.states, function(a, b) {
			return a !== b;
		}))
		.attr("class", "states")
		.attr("d", path);

	
		
	};
	
	
//Place for svg cicle elements. 
var circle = svg.selectAll("circle");



//get all tweets from database on initial load	
$(window).ready(function(){		
	$.getJSON("http://localhost:5000/init", 
		function(data){
		
		
		
		circle
		.data(data.items)
		.enter()
		.append("circle")
		.attr("cx", function(d){
			//var lat = parseFloat(d.lat);
			//var lon = parseFloat(d.lon);
			var x =  projection([d.lon, d.lat])[0];
			return x
		})
		.attr("cy", function(d){
			//var lat = parseFloat(d.lat);
			//var lon = parseFloat(d.lon);
			var y =  projection([d.lon, d.lat])[1];
			return y
		})
		.attr("r", function(){
			var scale = zoom.scale()
			return 3/scale
		})
		.attr("fill", function(d){
			var col = color(d.sent);
			
		
			return col
		})
			
		
		.attr("opacity", ".55")
		.attr("transform", function(){
			var t = zoom.translate(),
			    s = zoom.scale();
			
			return "translate(" + t + ")scale(" + s + ")"
		} )
		
		.on("mousemove", function(d, i) {
			

			tooltip
				.attr("style", function() {
					
						
						return "left:" + (mouse.x + 50) + "px;top:" + (mouse.y + $(window).scrollTop() -80) + "px";

					

				});

			


		})
		.on("mouseout", function(d, i) {

			//tooltip.transition().duration(80).style("opacity", 0);
			//tooltip.transition().duration(200).style("opacity", "0").each("end", function(){
			tooltip.classed("hidden", true);
			//});
			//tooltip.classed("hidden", true);
			var circle = d3.select(this);
			circle.transition().duration(200)
				.attr("r", circ_rad);


		})
		.on("mouseover", myMouseoverFunction)
		.on("mousedown.log", function(d) {
			d3.select("#text")
			.html("<b>Text: </b>" + d.text);
			
		d3.select("#sent")
		.html("<b>Sentiment: </b>" + String((2*d.sent-1).toFixed(1)));
			
			var coords = projection.invert(d3.mouse(this));
			var geocoder = new google.maps.Geocoder();
			var latlng = new google.maps.LatLng(coords[1], coords[0]);
			geocoder.geocode({
				'latLng': latlng
			}, function(results, status){
				var address = results[1].formatted_address;
				d3.select("#loc")
				.html("<b>Location: </b>" + address);
				
			var strip = address.replace(/\w*\d\w*/gi, '').replace(/\,/gi, ' ').replace(/USA|Canada|UK/gi,'')
				news_html(strip);
				
				
			})
			


		});
		
		
	})
});


//Listen for tweets coming from the Twitter stream. 
$.eventsource({
            label: "json-event-source",
            url: "http://localhost:5000/tweets",
            dataType: "json",
          open: function() {
            console.log( "opened" );
        },
        message: function( data ){ 
			
			

			if (isNaN(data.lat)){}
			else{
				circle
				.data([data])
				.enter()
				.append("circle")
				.attr("cx", function(d){

					var x =  projection([d.lon, d.lat])[0];
					return x
				})
				.attr("cy", function(d){

					var y =  projection([d.lon, d.lat])[1];
					return y
				})
				.attr("r", function(){
					var scale = zoom.scale()
					return 3/scale
				})
				.attr("fill", function(d){
					var col = color(d.sent);
			
		
					return col
				})
			
				
				.attr("opacity", ".55")
				.attr("transform", function(){
					var t = zoom.translate(),
					    s = zoom.scale();
			
					return "translate(" + t + ")scale(" + s + ")"
				} )
		
				.on("mousemove", function(d, i) {
			

					tooltip
						.attr("style", function() {
					
						
								return "left:" + (mouse.x + 50) + "px;top:" + (mouse.y + $(window).scrollTop() -80) + "px";

					

						});

			


				})
				.on("mouseout", function(d, i) {

					//tooltip.transition().duration(80).style("opacity", 0);
					//tooltip.transition().duration(200).style("opacity", "0").each("end", function(){
					tooltip.classed("hidden", true);
					//});
					//tooltip.classed("hidden", true);
					var circle = d3.select(this);
					circle.transition().duration(200)
						.attr("r", circ_rad);


				})
				.on("mouseover", myMouseoverFunction)
				.on("mousedown.log", function(d) {
					d3.select("#text")
					.html("<b>Text: </b>" + d.text);
			
				d3.select("#sent")
				.html("<b>Sentiment: </b>" + String((2*d.sent-1).toFixed(1)));
			
					var coords = projection.invert(d3.mouse(this));
					var geocoder = new google.maps.Geocoder();
					var latlng = new google.maps.LatLng(coords[1], coords[0]);
					geocoder.geocode({
						'latLng': latlng
					}, function(results, status){

						var address = results[1].formatted_address;
						d3.select("#loc")
						.html("<b>Location: </b>" + address);

					var strip = address.replace(/\w*\d\w*/gi, '').replace(/\,/gi, ' ').replace(/USA|Canada|UK/gi,'')
						news_html(strip);
						
					})


				});
				
			
			circle
			.data([data])
			.enter()
			.append("circle")
			.attr("id", "ping")
			.attr("cx", function(d){

				var x =  projection([d.lon, d.lat])[0];
				return x
			})
			.attr("cy", function(d){

				var y =  projection([d.lon, d.lat])[1];
				return y
			})
			.attr("transform", function(){
				var t = zoom.translate(),
				    s = zoom.scale();
		
				return "translate(" + t + ")scale(" + s + ")"
			} )
			.attr("r", function(){
					var scale = zoom.scale()
					return 3/scale
			})
			.attr("stroke", function(d){
				var col = color(d.sent);
			
		
				return col
			})
			.attr("stroke-width", function(){
					var scale = zoom.scale()
					return 7/scale
			})
			.style("opacity", 1.0)
			.attr("fill", "none")
			.transition().duration(1000)
			.attr("r", function(){
					var scale = zoom.scale()
					return 50/scale
			})
			.attr("stroke", "white")
			.attr("stroke-width", 1)
			.style("opacity", 0.0)
			.remove()
			
			
			
			
		}
			

        },
        

      });

//Reverse Geocoding of Mouse Position
function gMaps_geocoder(lon, lat) {
	var geocoder = new google.maps.Geocoder();
	var latlng = new google.maps.LatLng(lat, lon);
	geocoder.geocode({
		'latLng': latlng
	}, function(results, status) {
		if (status == google.maps.GeocoderStatus.OK) {
			
		} else {
			return '';
		}
	});

};

//GoogleNews search function
function news_html(loc){
	
	var searchControl = new google.search.SearchControl();
	var localSearch = new google.search.LocalSearch();
	searchControl.addSearcher(localSearch);
	searchControl.addSearcher(new google.search.NewsSearch());
	
	localSearch.setCenterPoint(loc);
	
	searchControl.setResultSetSize(3);
	
	 // create a drawOptions object
	 var drawOptions = new google.search.DrawOptions();

	 // tell the searcher to draw itself in linear mode
	 drawOptions.setDrawMode(google.search.SearchControl.DRAW_MODE_LINEAR);
	 
	 searchControl.draw(document.getElementById("mod-bod"), drawOptions);
	 
	 searchControl.execute(loc);
	 $('#myModal').modal('toggle');
	 	


};




//Handles scaling and translation on zoom and pan events
function move() {
	var t = d3.event.translate,
		s = d3.event.scale;
	t[0] = Math.min(width / 2 * (s - 1), Math.max(width / 2 * (1 - s), t[0]));
	t[1] = Math.min(height / 2 * (s - 1) + 200 * s, Math.max(height / 2 * (1 - s) - 0 * s, t[1]));
	zoom.translate(t);
	g.style("stroke-width", 1 / s).attr("transform", "translate(" + t + ")scale(" + s + ")");
	g.style("stroke-width", 1 / s).attr("transform", "translate(" + t + ")scale(" + s + ")");
	circ_rad = 3 / s
	svg.selectAll("circle").attr("r", circ_rad);
	svg.selectAll("circle").attr("transform", "translate(" + t + ")scale(" + s + ")");
};
	
 
