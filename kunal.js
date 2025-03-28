var distinctTimeStamps = [];
var globalData = {};
var iscircleclicked = false;
let maxFrequency, radiusScale, textSize;
var margin = { top: 50, right: 90, bottom: 50, left: 100 };
var selectedKeywords = [];
var pos_var = [];
let eventEvolutionSVG;
var radius = [];
let eventEvolutionHeight = 800;
let eventEvolutionWidth = 800;
var depth_local = 0;
var topic_local = "";
var color_local = null;
var issubtopic_local = false;
eventEvolutionSVG = d3.select("#event_svg")
    .append("svg")
    .attr("width", eventEvolutionWidth)
    .attr("height", eventEvolutionHeight)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

document.addEventListener("DOMContentLoaded", async function () {
    DrawBubbleChart("", null, true, 0, 0);
    document.getElementById("my-range").addEventListener("input", function () {
        var value = this.value;
        DrawBubbleChart(topic_local, color_local, issubtopic_local, depth_local, parseInt(value), true);
    });
});
function ResetChart() {
    console.log("inside reset chart function")
    d3.selectAll(".bubble").remove();
    d3.selectAll(".text_bubbles").remove();
    d3.selectAll(".arc_bubble").remove();
    d3.selectAll(".outer_rings_bubble").remove();
}
function DrawBubbleChart(topic, color, issubtopic, depth, intensity, isCalledFromIntensity = false) {
    console.log(intensity);
    depth_local = depth;
    topic_local = topic;
    color_local = color;
    issubtopic_local = issubtopic;
    console.log("inside bubble chart function");
    if (!isCalledFromIntensity)
        d3.select("#bubble_svg_chart").remove();
    var minradius = 25;
    var maxRadius = 50;
    var query = {}
    if (topic == "" || topic == null || topic == "text") {
        query = {
            "key": "total",
            "value": "",
            "intensity": intensity
        }
    } else if (issubtopic) {
        query = {
            "key": "subtopic",
            "value": topic,
            "intensity": intensity

        }
        minradius = 15;
        maxRadius = 30;
    } else {
        query = {
            "key": "topic",
            "value": topic,
            "intensity": intensity
        }
    }
    console.log(query);
    d3.json("http://127.0.0.1:8000/keywords/", {
        method: 'POST',
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        },
        body: JSON.stringify(query)
    }).then(function (data) {

        data = JSON.parse(data);
        console.log(data);
        globalData = data;
        var bubbleChartHeight = (1800 * data["Data"].length) / 300,
            bubbleChartHeight = 2500;
        width = 1800 - margin.left - margin.right,
            height = bubbleChartHeight - margin.top - margin.bottom;

        var svg = null;
        data["Data"].forEach(function (d) {
            d.Frequency = +d.Frequency;
        });


        var x = d3.scaleBand()
            .domain(["July", "August", "September", "October", "November", "December"])
            .range([0, width]).padding(0.1);
        var y = d3.scaleBand()
            .domain(data["Topics"])
            .range([height, 0]).padding(1);

        if (!isCalledFromIntensity) {
            svg = d3.select("#my_dataviz")
                .append("svg")
                .attr("id", "bubble_svg_chart")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .on("click", function (event, d) {
                    if (!d3.select(event.target).classed("bubble") && !d3.select(event.target).classed("bubble_plus_image")) {
                        console.log("data");
                        console.log(globalData);
                        svg.selectAll(".text")
                            .data(globalData["Data"])
                            .style("fill", "rgba(255,255,255,1)");

                        svg.selectAll(".bubble")
                            .data(globalData["Data"])
                            .style("opacity", "1")
                        svg.selectAll(".bubble_plus").remove();
                        svg.selectAll(".bubble_plus_image").remove();
                        svg.selectAll(".overlay-ring").remove();
                        svg.selectAll(".overlay-ring_rel_words").remove();
                        svg.selectAll(".ring_rel_words").remove();
                    }

                })
                .append("g")
                .attr("id", "bubble_svg_chart_g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            svg.append("g")
                .attr("transform", `translate(0, ${height})`)
                .call(d3.axisBottom(x))
                .style("font-size", "15px");

            svg.append("g")
                .call(d3.axisLeft(y))
                .selectAll("text")
                .style("text-anchor", "end")
                .style("font-size", "12px")
                .attr("dx", "-0.5em")
                .attr("dy", "0.15em")
                .attr("width", 30)
                .attr("transform", "rotate(-45)");
        } else {
            svg = d3.select("#bubble_svg_chart_g");
            ResetChart();
        }

        console.log(data["Data"]);

        var radiusScale = d3.scaleSqrt().range([minradius, maxRadius]);

        if (color == null) {
            color = d3.scaleOrdinal(d3.schemeCategory10);
        } else {
            console.log("color is not null");
            console.log(color);
        }

        var simulation = d3.forceSimulation()
            .force("x", d3.forceX(function (d) { return x(d.Month.toString()); }).strength(0.1))
            .force("y", d3.forceY(function (d) { return y(d.Topic); }).strength(0.1))
            .force("collide", d3.forceCollide(function (d) { return radiusScale(d.Frequency) + 2; }));
        var textSize = d3.scaleSqrt().range([10, maxRadius]);

        maxFrequency = d3.max(data["Data"], function (d) { return d.Frequency; });
        radiusScale.domain([0, maxFrequency]);
        textSize.domain([0, maxFrequency]);
        var bubbles = svg.selectAll(".bubble")
            .data(data["Data"])
            .enter().append("circle")
            .attr("class", function (d) { return "bubble word-" + d.Keyword })
            .attr("id", function (d) { return d.Topic + "_" + d.Keyword + "_" + d.Month; })
            .attr("r", function (d) { radius.push({ keyword: d.Keyword, radius: radiusScale(d.Frequency) }); return radiusScale(d.Frequency); })
            .style("fill", function (d) { return color(d.Topic); })
            .on("click", function (event, d) {

                var clickedCircle = d3.select(this);
                var circleId = clickedCircle.attr("id");
                var parts = circleId.split('_');
                var topic = parts[0];
                var keyword = parts[1];
                var month = parts[2];
                var filteredData = data["Data"].filter(item => item.Topic == topic && item.Keyword == keyword && item.Month == month);
                svg.selectAll(".overlay-ring").remove();
                svg.selectAll(".overlay-ring_rel_words").remove();
                svg.selectAll(".ring_rel_words").remove();
                svg.selectAll(".bubble_plus").remove();
                svg.selectAll(".bubble_plus_image").remove();
                console.log(clickedCircle["_groups"][0][0]["attributes"]["cx"]["value"]);
                var cx = parseFloat(clickedCircle["_groups"][0][0]["attributes"]["cx"]["value"]);
                var cy = parseFloat(clickedCircle["_groups"][0][0]["attributes"]["cy"]["value"]);
                var radiusOuter = parseFloat(clickedCircle["_groups"][0][0]["attributes"]["r"]["value"]) * 3.0; // Adjust the radius for the outer circle
                var radiusInner = parseFloat(clickedCircle["_groups"][0][0]["attributes"]["r"]["value"]) * 1.5; // Adjust the radius for the inner circle
                var curcircle = svg.append("circle")
                    .attr("class", "bubble_plus")
                    .attr("r", "10")
                    .attr("cx", function (d) { return cx + parseFloat(clickedCircle["_groups"][0][0]["attributes"]["r"]["value"]) })
                    .attr("cy", cy)
                    .style("fill", "white")
                    .style("stroke", "black")
                    .style("stroke-width", "2px")


                svg.append('image')
                    .attr("class", "bubble_plus_image")
                    .attr('xlink:href', 'images/plus.png')
                    .attr('width', 20)
                    .attr('height', 20)
                    .attr('x', function (d) { return cx + parseFloat(clickedCircle["_groups"][0][0]["attributes"]["r"]["value"]) - 10 })
                    .attr('y', cy - 10)
                    .on('click', function (d) {
                        handleBubbleClick(keyword, month, topic)
                    });

                var points = [];
                for (var angle = 0; angle <= Math.PI * 2; angle += 0.01) {
                    var x = cx + Math.cos(angle) * radiusOuter;
                    var y = cy + Math.sin(angle) * radiusOuter;
                    points.push([x, y]);
                }
                for (var angle = Math.PI * 2; angle >= 0; angle -= 0.01) {
                    var x = cx + Math.cos(angle) * radiusInner;
                    var y = cy + Math.sin(angle) * radiusInner;
                    points.push([x, y]);
                }

                var ringPath = "M" + points.map(function (p) { return p.join(","); }).join("L") + "Z";

                svg.append("path")
                    .attr("class", "overlay-ring")
                    .attr("d", ringPath)
                    .style("fill", "black")
                    .style("opacity", "0.7");

                var circlePoints = [];
                console.log(filteredData);
                if (filteredData.length == 0) {
                    return;
                }
                var opacityScale = d3.scaleLinear()
                    .domain([filteredData[0].MinCorrelation, filteredData[0].MaxCorrelation])
                    .range([0.1, 1]);
                svg.selectAll(".bubble")
                    .data(data["Data"])
                    .style("opacity", function (d) { return opacityScale(filteredData[0].CorrelationArray[d.Keyword]); })

                svg.selectAll(".text_bubbles")
                    .data(data["Data"])
                    .style("fill", function (d) { return "rgba(255, 255, 255, " + opacityScale(filteredData[0].CorrelationArray[d.Keyword]) + ")"; })
                console.log(filteredData[0].RelatedKeywords);
                for (var i = 0; i < filteredData[0].RelatedKeywords.length; i++) {
                    var colour = "";
                    if (i < 2) {
                        colour = "green";
                    } else if (i < 4) {
                        colour = "gold";
                    } else {
                        colour = "skyblue";
                    }
                    var angle = i * Math.PI / 3;
                    var radiusMiddle = (radiusOuter + radiusInner) / 2;
                    var x = cx + Math.cos(angle) * radiusMiddle;
                    var y = cy + Math.sin(angle) * radiusMiddle;
                    circlePoints.push([x, y, filteredData[0].RelatedKeywords[i], colour]);
                }

                var circleRadius = (radiusOuter - radiusInner) / 2;
                circlePoints.forEach(function (p) {
                    svg.append("circle")
                        .attr("cx", p[0])
                        .attr("cy", p[1])
                        .attr("r", circleRadius)
                        .attr("class", "overlay-ring_rel_words")
                        .on("click", function (event, d) {
                            svg.selectAll(".word-" + p[2])
                                .each(function (d) {
                                    var circle = d3.select(this);
                                    var cx = parseFloat(circle.attr("cx"));
                                    var cy = parseFloat(circle.attr("cy"));
                                    var radius = parseFloat(circle.attr("r")) * 2.0; // Adjust the radius for the concentric circle
                                    svg.append("circle")
                                        .attr("cx", cx)
                                        .attr("cy", cy)
                                        .attr("r", radius)
                                        .attr("class", "concentric-circle-temp-circle")
                                        .style("fill", "none")
                                        .style("stroke", "black")
                                        .style("stroke-width", "5px");
                                });
                            setTimeout(function () {
                                svg.selectAll(".concentric-circle-temp-circle").remove();
                            }, 5000);

                        })
                        .style("fill", p[3])
                        .style("opacity", "0.7")
                    svg.append("text")
                        .attr("x", p[0])
                        .attr("y", p[1])
                        .attr("text-anchor", "middle")
                        .attr("class", "ring_rel_words")
                        .attr("dominant-baseline", "central")
                        .style("font-size", function () {
                            var len = p[2].length;
                            var size = (circleRadius * 3) / len;
                            return Math.min(size, textSize(d.Frequency));
                        })
                        .style("fill", "white")
                        .text(p[2]);

                });

            });

        var outerRings = null;
        var text = svg.selectAll(".text_bubbles")
            .data(data["Data"])
            .enter().append("text")
            .attr("class", ".text_bubbles")
            .attr("text-anchor", "middle")
            .style("fill", "white")
            .style("font-size", function (d) {
                var len = d.Keyword.length;
                var size = (radiusScale(d.Frequency) * 2.5) / len;
                return Math.min(size, textSize(d.Frequency));
            })
            .text(function (d) { return d.Keyword; });
        var bubbles_arc = null;
        if (depth < 2) {
            var arc = d3.arc()
                .innerRadius(function (d) { return 0.8 * radiusScale(d.Frequency); })
                .outerRadius(function (d) { return 0.9 * radiusScale(d.Frequency); })
                .startAngle(0)
                .endAngle(function (d) { return d["InnerRadius"]; });

            bubbles_arc = svg.selectAll(".arc_bubble")
                .data(data["Data"])
                .enter().append("g")
                .attr("class", "arc_bubble");

            bubbles_arc.append("path")
                .attr("d", arc)
                .attr("fill", "#FAF9F6");

            outerRings = svg.selectAll(".outer_rings_bubble")
                .data(data["Data"])
                .enter().append("g")
                .attr("class", "outer_rings_bubble");

            outerRings.each(function (d) {
                var keys = Object.keys(d["OuterRadius"]);

                var colors = d3.schemeSet1;

                var colorScaleTopics = d3.scaleOrdinal()
                    .domain(keys)
                    .range(colors);

                var radiusDictionary = d["OuterRadius"];
                var prevAngle = 0;
                var nextAngle = 0;

                for (var i = 0; i < keys.length; i++) {
                    nextAngle += radiusDictionary[keys[i]];
                    var outerarc = d3.arc()
                        .innerRadius(radiusScale(d.Frequency))
                        .outerRadius(1.1 * radiusScale(d.Frequency))
                        .startAngle(prevAngle)
                        .endAngle(nextAngle);

                    d3.select(this).append("path")
                        .attr("d", outerarc)
                        .attr("fill", colorScaleTopics(keys[i]));

                    prevAngle += radiusDictionary[keys[i]];
                }
            });

        }
        simulation.nodes(data["Data"]).on("tick", ticked);

        function ticked() {
            console.log("inside ticked");
            bubbles
                .attr("cx", function (d) { return d.x + (x.bandwidth() / 2); })
                .attr("cy", function (d) { return d.y + (y.bandwidth() / 2); })


            if (depth < 2) {
                outerRings.attr("transform", function (d) { return "translate(" + (d.x + (x.bandwidth() / 2)) + "," + (d.y + (y.bandwidth() / 2)) + ")" });
                bubbles_arc.attr("transform", function (d) { return "translate(" + (d.x + (x.bandwidth() / 2)) + "," + (d.y + (y.bandwidth() / 2)) + ")"; });
            }



            text
                .attr("x", function (d) { return d.x + (x.bandwidth() / 2); })
                .attr("y", function (d) { return d.y + (y.bandwidth() / 2); });
        }

        function handleBubbleClick(keyword, month, topic) {
            console.log(keyword);
            console.log(month);
            console.log(topic);
            selectedKeywords.push({ keyword: keyword, month: month, topic: topic }); // Store selected keyword details
            const eventEvolutionHeight = 600;
            const eventEvolutionWidth = 1800;

            eventEvolutionSVG = d3.select("#event_svg")
                .append("svg")
                .attr("width", eventEvolutionWidth)
                .attr("height", eventEvolutionHeight)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            const x = d3.scaleBand()
                .domain(["July", "August", "September", "October", "November", "December"])
                .range([0, eventEvolutionWidth - 20])
                .padding(0.1);

            var monthIndex = ["July", "August", "September", "October", "November", "December"].indexOf(month);
            console.log(monthIndex);
            var bubbleX = x.bandwidth() * monthIndex + x.bandwidth() / 2;
            var bubbleY;
            bubbleX, bubbleY = calculateBubbleYPosition(bubbleX, pos_var);

            pos_var.push({ keyword: keyword, cx: bubbleX, cy: bubbleY, month: monthIndex });

            var circle = eventEvolutionSVG.append("g")
                .attr("class", "bubble")
                .attr("transform", "translate(" + bubbleX + "," + bubbleY + ")");

            var selectedRadius = radius.find(item => item.keyword === keyword).radius;
            console.log(selectedRadius);

            circle.append("circle")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", selectedRadius)
                .style("fill", color(topic));

            circle.append("text")
                .attr("text-anchor", "middle")
                .attr("dy", ".35em")
                .text(keyword);

            eventEvolutionSVG.append("g")
                .attr("transform", "translate(-80," + (eventEvolutionHeight - margin.bottom - 40) + ")")
                .call(d3.axisBottom(x));

            // Add click event listener to bubbles in the event evolution SVG
            eventEvolutionSVG.selectAll(".bubble").on("click", function() {
                var bubbleText = d3.select(this).select("text").text(); // Extract keyword from the clicked bubble
                var confirmation = confirm("Do you want to delete " + bubbleText + " keyword?");
                if (confirmation) {
                    // Remove the keyword from selectedKeywords array
                    selectedKeywords = selectedKeywords.filter(function(keyword) {
                        return keyword.keyword !== bubbleText;
                    });
                    // Remove the clicked bubble from the visualization
                    d3.select(this).remove();
                }
            });
        }

        function calculateBubbleYPosition(bubbleX, pos_var) {
            if (pos_var.length === 0) {
                return 100;
            }

            var currentX = bubbleX;
            var maxY = 100;
            for (var i = 0; i < pos_var.length; i++) {
                var distance = Math.abs(currentX - pos_var[i].cx);
                if (distance < 50) {
                    maxY = Math.max(maxY, pos_var[i].cy + 75);
                }
            }
            return currentX, maxY;
        }

        document.getElementById("execute_button").addEventListener("click", async function () {
            console.log(selectedKeywords);

            var correlationScores = [];

            if (selectedKeywords.length > 1) {
                for (var i = 0; i < selectedKeywords.length - 1; i++) {
                    for (var j = i + 1; j < selectedKeywords.length; j++) {
                        if (selectedKeywords[i].keyword && selectedKeywords[j].keyword) {
                            const correlationScore = await findCorrelationScore(selectedKeywords[i].keyword, selectedKeywords[j].keyword);
                            correlationScores.push({
                                keywords: [selectedKeywords[i].keyword, selectedKeywords[j].keyword],
                                score: correlationScore
                            });
                        }
                    }
                }
                console.log(correlationScores);

                correlationScores.forEach(function (scoreObj) {
                    console.log(scoreObj);
                    var keyword1 = scoreObj.keywords[0];
                    var keyword2 = scoreObj.keywords[1];
                    var score = scoreObj.score;
                    var thickness = scaleCorrelationScore(score * 100)

                    if (score * 100 > 2) {
                        console.log(thickness);
                        var bubble1 = pos_var.find(item => item.keyword === keyword1);
                        var bubble2 = pos_var.find(item => item.keyword === keyword2);
                        console.log(bubble1);
                        console.log(bubble2);
                        var topic1 = selectedKeywords.find(item => item.keyword === keyword1).topic;
                        var topic2 = selectedKeywords.find(item => item.keyword === keyword2).topic;
                        if (Math.abs(bubble1.month - bubble2.month) === 1 || Math.abs(bubble2.month - bubble1.month) === 1) {
                            var path = drawCurvedLine(bubble1.cx, bubble1.cy, bubble2.cx, bubble2.cy, thickness);
                            eventEvolutionSVG.append("path")
                                .attr("d", path)
                                .style("fill", "none")
                                .style("stroke", "black")
                                .style("stroke-width", thickness);
                        }

                        var circle1 = eventEvolutionSVG.append("g")
                            .attr("class", "bubble")
                            .attr("transform", "translate(" + bubble1.cx + "," + bubble1.cy + ")");

                        var selectedRadius1 = radius.find(item => item.keyword === keyword1).radius;
                        console.log(selectedRadius1);

                        circle1.append("circle")
                            .attr("cx", 0)
                            .attr("cy", 0)
                            .attr("r", selectedRadius1)
                            .style("fill", color(topic1));

                        circle1.append("text")
                            .attr("text-anchor", "middle")
                            .attr("dy", ".35em")
                            .text(keyword1);

                        var circle2 = eventEvolutionSVG.append("g")
                            .attr("class", "bubble")
                            .attr("transform", "translate(" + bubble2.cx + "," + bubble2.cy + ")");

                        var selectedRadius2 = radius.find(item => item.keyword === keyword2).radius;
                        console.log(selectedRadius2);

                        circle2.append("circle")
                            .attr("cx", 0)
                            .attr("cy", 0)
                            .attr("r", selectedRadius2)
                            .style("fill", color(topic2));

                        circle2.append("text")
                            .attr("text-anchor", "middle")
                            .attr("dy", ".35em")
                            .text(keyword2);
                        

                        

                    }
                });

                function scaleCorrelationScore(correlationScore) {
                    var minScore = 0;
                    var maxScore = 32;

                    var minThickness = 1;
                    var maxThickness = 8;

                    var scaledThickness = minThickness + (correlationScore - minScore) * (maxThickness - minThickness) / (maxScore - minScore);

                    return scaledThickness;
                }
            }
        });

        function drawCurvedLine(x1, y1, x2, y2, thickness) {

            if (thickness < 4) {
                var dx = x2 - x1,
                    dy = y2 - y1,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 0 0,1 " + x2 + "," + y2;
            }
            else {
                console.log("enetered else case");
                var dx = x2 - x1,
                    dy = y2 - y1,
                    dr = Math.sqrt(dx * dx + dy * dy);
                return "M" + x1 + "," + y1 + "A" + dr + "," + dr + " 1 0,1 " + x2 + "," + y2;
            }
        }


        function findCorrelationScore(keyword1, keyword2) {
            var csvFilePath = "data/correlation_matrix.csv";

            return fetch(csvFilePath)
                .then(response => response.text())
                .then(csvData => {
                    var lines = csvData.split("\n");
                    var headers = lines[0].split(",");
                    var keyword1Index = headers.indexOf(keyword1);
                    var keyword2Index = headers.indexOf(keyword2);
                    console.log(keyword1);
                    console.log(keyword2);
                    var correlationScore = 0;
                    for (var i = 1; i < lines.length; i++) {
                        var values = lines[i].split(",");
                        if (values.length > 1) {
                            var currentKeyword1 = values[0];
                            for (var j = 1; j < values.length; j++) {
                                var currentKeyword2 = headers[j];
                                if ((currentKeyword1 === keyword1 && currentKeyword2 === keyword2) ||
                                    (currentKeyword1 === keyword2 && currentKeyword2 === keyword1)) {
                                    console.log("keyword match");
                                    console.log(parseFloat(values[j]));
                                    return parseFloat(values[j]);
                                }
                            }
                        }
                    }
                    return 0;
                });
        }

    });


}
