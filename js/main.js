var margin = { top: 20, right: 90, bottom: 30, left: 90 },
  width = 800 - margin.left - margin.right,
  height = 800 - margin.top - margin.bottom;

let colorScale;
let subtopicColorScale;
let subtopics = [];
let subtopicscolors = [];
let topicSubtopicMap = null;
let selectedNode = null;


document.addEventListener('DOMContentLoaded', function () {
  d3.json("data/topic_subtopic_data.json").then(function (data) {
    topicSubtopicMap = new Map();
    for (var topic in data) {
      if (data.hasOwnProperty(topic)) {
        var subtopics = data[topic];
        topicSubtopicMap.set(topic, subtopics);
      }
    }
    console.log(topicSubtopicMap);
  });
  createHierarchialView();
});

function createHierarchialView() {

  const radius = width / 2;

  const svg = d3.select("#hierarchial_div").select("#hierarchial_svg")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${width / 2 + margin.left},${height / 2})`);

  d3.json("data/topic_subtopic_hierarchial.json").then(function (data) {
    const cluster = d3.cluster()
      .size([360, radius - 60]);

    const root = d3.hierarchy(data, function (d) {
      return d.children;
    });
    cluster(root);

    const linksGenerator = d3.linkRadial()
      .angle(function (d) { return d.x / 180 * Math.PI; })
      .radius(function (d) { return d.y; });

    svg.selectAll('path')
      .data(root.links())
      .join('path')
      .attr("d", linksGenerator)
      .style("fill", 'none')
      .attr("stroke", '#ccc');
    console.log(data);
    const topicNames = [...new Set(data.children.map(topic => topic.name))];

    colorScale = d3.scaleOrdinal()
      .domain(topicNames)
      .range(d3.schemeCategory10);

    svg.selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", function (d) {
        return `rotate(${d.x - 90})
          translate(${d.y})`;
      })
      .on("click", function (event, d) {
        const node = d3.select(this);
        const circle = node.select("circle");

        if (selectedNode && selectedNode.data === d) {
          circle.style("stroke", null)
            .style("stroke-width", null);
          selectedNode = null;
          createTemporalView();
        } else {
          if (selectedNode) {
            d3.select(selectedNode.element).select("circle")
              .style("stroke", null)
              .style("stroke-width", null);
          }

          circle.style("stroke", "yellow")
            .style("stroke-width", "5px");
          selectedNode = { element: this, data: d };
        }
        updateChart(d.data.name);
        const color = d.depth === 1 ? colorScale(d.data.name) : subtopicColorScale(d.data.name);
        const slider = document.getElementById("my-range");
        const sliderValue = slider.value;
        console.log("Slider value=" + sliderValue);
        DrawBubbleChart(d.data.name, d.depth < 1 ? colorScale : subtopicColorScale, !(d.depth === 1), d.depth, parseInt(sliderValue));
        updateDocumentView(d.data.name, color);
        if (d.data.name == "text") {
          createTemporalView();
          createDocumentView();
        }
        else {
          updateTemporalView(d.data.name);
          updateChart(d.data.name);
          const color = d.depth === 1 ? colorScale(d.data.name) : subtopicColorScale(d.data.name);
          updateDocumentView(d.data.name, color);
        }

      })
      .on("mouseover", function (event, d) {
        let html = "";
        console.log(d);
        if (d.depth === 1) {
          const sumOfChildren = d.children.reduce((acc, cur) => acc + cur.data.value, 0);
          html = "Topic: " + d.data.name + ", Frequency: " + sumOfChildren;
        }
        else {
          html = "SubTopic: " + d.data.name + ", Frequency: " + d.data.value;
        }
        d3.select("#tooltip")
          .style("opacity", .9);
        d3.select("#tooltip").html(html)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
        if (d.data.name == "text") {
          d3.select("#tooltip")
            .style("opacity", 0);
        }
      })
      .on("mouseout", function (event, d) {
        d3.select("#tooltip")
          .style("opacity", 0);
      })
      .each(function (d) {
        const node = d3.select(this);
        const radius = calculateRadius(d);

        node.append("circle")
          .attr("r", radius)
          .style("fill", d => {
            if (d.depth === 1) {
              return colorScale(d.data.name);
            } else if (d.depth === 2) {
              const parentColor = colorScale(d.parent.data.name);
              const siblings = d.parent.children.length;
              const index = d.parent.children.indexOf(d);
              subtopics.push(d.data.name);
              const c = adjustHSL(parentColor, index, siblings)
              subtopicscolors.push(c);
              return c;
            } else {
              return "#69b3a2";
            }
          });

        const textoffset = radius + 5;
        node.append("text")
          .attr("dy", ".31em")
          .attr("x", d => {
            if (d.depth < 2) {
              return 0;
            } else {
              return d.x < 180 === !d.children ? textoffset : -textoffset;
            }
          })
          .attr("text-anchor", d => {
            if (d.depth < 2) {
              return "middle";
            } else {
              return d.x < 180 === !d.children ? "start" : "end";
            }
          })
          .attr("transform", d => d.x < 180 ? null : "rotate(180)")
          .text(d => d.data.name)
          .style("font-size", "12px")
          .style("fill", "black");
      });

    subtopicColorScale = d3.scaleOrdinal()
      .domain(subtopics)
      .range(subtopicscolors);

    createKeywordRankingView();
    createTemporalView();
    createDocumentView();
  })
}

function calculateRadius(d) {
  if (d.data.name === "text") {
    return 25;
  } else if (d.children) {
    // Node is a topic; calculate sum of children's values
    const sumOfChildren = d.children.reduce((acc, cur) => acc + cur.data.value, 0);
    return (Math.sqrt(sumOfChildren) / 2);
  } else if (d.data.value) {
    // Node is a subtopic; use its own value
    return (Math.sqrt(d.data.value) / 2);
  } else {
    // Fallback radius
    return 20;
  }
}

function adjustHSL(color, index, total) {
  const hsl = d3.hsl(color);
  hsl.s = 0.5 + (index / (total - 1) * 0.5);
  hsl.l = 0.5 - (index / (total - 1) * 0.3);
  return hsl.toString();
}
function updateTemporalView(topic) {
  const svg = d3.select("#temporal_svg");
  svg.selectAll("*")
    .remove();

  const margin = { top: 30, right: 10, bottom: 30, left: 30 },
    width = 750 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

  d3.csv("data/month_topic_subtopic_counts.csv").then(function (data) {

    data.forEach(function (row) {
      for (var key in row) {
        if (row.hasOwnProperty(key)) {
          row[key] = parseFloat(row[key]);
        }
      }
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const xScale = d3.scalePoint()
      .domain(monthNames.slice(6))
      .range([0, width - 25])
      .padding(0.5);

    svg
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + 90)
      .append("g")
      .attr("transform",
        `translate(${margin.left}, ${margin.top})`);

    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xScale)
        .tickSize(-height))
      .selectAll(".tick line")
      .attr("stroke", "#b8b8b8")
      .attr("stroke-dasharray", "8,8");


    svg.selectAll(".tick line").attr("stroke", "#b8b8b8")

    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width / 2 + 40)
      .attr("y", height + 30)
      .text("Time (Month)");

    if (topicSubtopicMap.has(topic)) {
      subtopics = topicSubtopicMap.get(topic);
      console.log(subtopics);
      var maxY = 0;
      maxY = d3.max(data, function (d) {
        var total = 0;
        subtopics.forEach(function (subtopic) {
          total += +d[subtopic];
        });
        return total;
      });

      const yScale = d3.scaleLinear()
        .domain([-maxY, maxY])
        .range([height, 0]);

      var stack = d3.stack()
        .keys(subtopics)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetSilhouette);
      var layer = svg.selectAll(".layer")
        .data(x => {
          const d = stack(data);
          console.log(d);
          return d;
        })
        .enter().append("g")
        .attr("class", "layer");

      layer.append("path")
        .attr("class", "area")
        .attr("d", d3.area()
          .x(function (d, i) { return xScale(monthNames[d.data.month - 1]); }) // Adjusted to map the month number to its name
          .y0(function (d) { return yScale(d[0]); })
          .y1(function (d) { return yScale(d[1]); }))
        .style("fill", function (d) { return subtopicColorScale(d.key); })
        .on("mouseover", function (event, d) {
          let html = d.key;
          d3.select("#tooltip")
            .style("opacity", .9);
          d3.selectAll(".area").style("opacity", .2);
          d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1);
          d3.select("#tooltip").html(html)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function (event, d) {
          d3.select("#tooltip")
            .style("opacity", 0);
          d3.selectAll(".area").style("opacity", 1).style("stroke", "none");
        });
    }
    else {
      const yMax = d3.max(data, function (d) {
        return d[topic];
      })
      const yScale = d3.scaleLinear()
        .domain([-yMax, yMax])
        .range([height, 0]);
      var stack = d3.stack()
        .keys([topic])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetSilhouette);
      var layer = svg.selectAll(".layer")
        .data(x => {
          const d = stack(data);
          console.log(d);
          return d;
        })
        .enter().append("g")
        .attr("class", "layer");

      layer.append("path")
        .attr("class", "area")
        .attr("d", d3.area()
          .x(function (d, i) { return xScale(monthNames[d.data.month - 1]); }) // Adjusted to map the month number to its name
          .y0(function (d) { return yScale(d[0]); })
          .y1(function (d) { return yScale(d[1]); }))
        .style("fill", function (d) { return subtopicColorScale(d.key); })
        .on("mouseover", function (event, d) {
          let html = d.key;
          d3.select("#tooltip")
            .style("opacity", .9);
          d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1);
          d3.select("#tooltip").html(html)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function (event, d) {
          d3.select("#tooltip")
            .style("opacity", 0);
          d3.selectAll(".area").style("opacity", 1).style("stroke", "none");
        });
    }

  });
}
function createTemporalView() {
  const svg = d3.select("#temporal_svg");
  svg.selectAll("*")
    .remove();

  const margin = { top: 30, right: 10, bottom: 30, left: 10 },
    width = 750 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;
  d3.csv("data/month_topic_subtopic_counts.csv").then(function (data) {

    data.forEach(function (row) {
      for (var key in row) {
        if (row.hasOwnProperty(key)) {
          row[key] = parseFloat(row[key]);
        }
      }
    });

    svg
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + 90)
      .append("g")
      .attr("transform",
        `translate(${margin.left}, ${margin.top})`);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const xScale = d3.scalePoint()
      .domain(monthNames.slice(6))
      .range([0, width - 45])
      .padding(0.5);

    svg.append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(xScale)
        .tickSize(-height))
      .selectAll(".tick line")
      .attr("stroke", "#b8b8b8")
      .attr("stroke-dasharray", "8,8");

    svg.selectAll(".tick line").attr("stroke", "#b8b8b8")

    svg.append("text")
      .attr("text-anchor", "end")
      .attr("x", width / 2 + 40)
      .attr("y", height + 30)
      .text("Time (Month)");

    const gapSize = 60;
    var maxY = d3.max(data, function (d) {
      var total = 0;
      topicSubtopicMap.forEach(function (subtopics, topic) {
        subtopics.forEach(function (subtopic) {
          total += +d[subtopic];
        });
      });
      return total;
    });

    console.log(maxY);
    const yScale = d3.scaleLinear()
      .domain([-4000, 800])
      .range([height, 0]);

    var index = 0;
    topicSubtopicMap.forEach(function (subtopics, topic) {

      var stack = d3.stack()
        .keys(subtopics)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetSilhouette);
      var layer = svg.selectAll(".layer" + index)
        .data(x => {
          const d = stack(data);
          console.log(d);
          return d;
        })
        .enter().append("g")
        .attr("class", "layer" + index);

      layer.append("path")
        .attr("class", "area" + index)
        .attr("d", d3.area()
          .x(function (d, i) { return xScale(monthNames[d.data.month - 1]); }) // Adjusted to map the month number to its name
          .y0(function (d) { return yScale(d[0]) + index * gapSize; }) // Add an offset to the y0 value
          .y1(function (d) { return yScale(d[1]) + index * gapSize; })) // Add an offset to the y1 value
        .style("fill", function (d) { return subtopicColorScale(d.key); })
        .on("mouseover", function (event, d) {
          let html = d.key;
          d3.select("#tooltip")
            .style("opacity", .9);
          for (let i = 0; i <= index; i++) {
            d3.selectAll(".area" + i).style("opacity", .2);
          }

          d3.select(this)
            .style("stroke", "black")
            .style("opacity", 1);
          d3.select("#tooltip").html(html)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function (event, d) {
          d3.select("#tooltip")
            .style("opacity", 0);
          for (let i = 0; i <= index; i++) {
            d3.selectAll(".area" + i).style("opacity", 1).style("stroke", "none");
          }
        });

      index++;
    });

  });
}

function createDocumentView() {

  async function fetchCSV() {
    //fetch data with topic and subtopic names
    const response = await fetch('data/Covid-data-with-topic-names.csv');
    const data = await response.text();
    return d3.csvParse(data);
  }

  async function displayAllDocuments() {
    //display text along with corresponding topic colour
    const svg = d3.select("#document_svg");
    const dataset = await fetchCSV();

    let htmlContent = `<foreignObject width="100%" height="100%"><div class="document-content">`;
    dataset.forEach((doc, i) => {
      const topic = doc.Topic_;
      const color = colorScale(topic);
      htmlContent += `<p style="color: ${color};"><strong>Text ${i + 1}:</strong> ${doc.text}</p><hr />`;
    });
    htmlContent += `</div></foreignObject>`;
    svg.html(htmlContent);
  }

  displayAllDocuments();
}


async function fetchCSV() {
  const response = await fetch('data/Covid-data-with-topic-names.csv');
  const data = await response.text();
  return d3.csvParse(data);
}

async function updateDocumentView(topic) {
  const svg = d3.select("#document_svg");
  const dataset = await fetchCSV();
  //get documents based on both topic or subtopic
  const documents = dataset.filter(doc => doc.Topic_ === topic || doc["Sub-Topic_"] === topic);

  if (documents.length > 0) {
    let htmlContent = `<foreignObject width="100%" height="100%"><div class="document-content"><div class="centered"><h3 class="centered">${topic}</h3></div>`;
    documents.forEach((doc, i) => {
      const subtopic = doc["Sub-Topic_"];
      //get subtopic colour for selected topic, if subtopic selected, its colour.
      const color = subtopic ? subtopicColorScale(subtopic) : colorScale(topic);
      htmlContent += `<hr /><p style="color: ${color};"><strong>Text ${i + 1}:</strong> ${doc.text}</p>`;
    });
    htmlContent += `</div></foreignObject>`;
    svg.html(htmlContent);
  } else {
    svg.html(`<text x='10' y='20' class='document-content'>No documents found for ${topic}.</text>`);
  }
}

function createKeywordRankingView() {

  console.log("entered");
  async function fetchData(url) {
    const response = await fetch(url);
    return response.json();
  }

  async function updateChart() {

    let data;
    // const topicCounts = await fetchData('data/topic_counts.json');
    // data = Object.entries(topicCounts).map(([topic, count]) => ({ keyword: topic, intensity: count }));
    // console.log(data);
    // Convert the data into an array of arrays
    const keywords = await fetchData('data/textrank_overall_output.json');
    const dataArray = Object.entries(keywords);

    // Sort the array by the intensity (descending order)
    dataArray.sort((a, b) => b[1] - a[1]);

    // Update the keyword ranking view
    const margin = { top: 20, right: 10, bottom: 30, left: 120 };
    const width = 350 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const numKeywords = dataArray.length;
    console.log(numKeywords);
    const barHeight = 10;
    const ySpacing = 20;
    const svgHeight = margin.top + numKeywords * ySpacing + margin.bottom;

    // Update the SVG element's height
    const svg = d3.select("#keyword_svg");
    svg.attr("height", svgHeight);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const x = d3.scaleLinear()
      .range([0, width])
      .domain([0, d3.max(dataArray, d => d[1])]);

    const y = d3.scaleBand()
      .range([height, 0])
      .padding(0.1)
      .domain(dataArray.map(d => d[0]));

    g.selectAll(".bar")
      .data(dataArray)
      .enter().append("rect")
      .attr("class", "bar")
      .style("fill", d => colorScale(d[0]))
      .attr("x", 0)
      .attr("height", barHeight)
      .attr("y", (d, i) => margin.top + i * ySpacing)
      .attr("width", d => x(d[1]));

    g.selectAll(".bar-label")
      .data(dataArray)
      .enter().append("text")
      .attr("class", "bar-label")
      .attr("x", d => x(d[1]) + 3)
      .attr("y", (d, i) => margin.top + i * ySpacing + barHeight / 2)
      .attr("dy", ".35em");

    g.selectAll(".keyword-label")
      .data(dataArray)
      .enter().append("text")
      .attr("class", "keyword-label")
      .attr("x", -5)
      .attr("y", (d, i) => margin.top + i * ySpacing)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(d => d[0])
      .attr("alignment-baseline", "middle");
  }
  updateChart();
}
// createKeywordRankingView();

async function fetchData(url) {
  const response = await fetch(url);
  return response.json();
}

async function updateChart(topic) {
  let data;

  if (!topic) {
    // // Display all keywords if no topic is selected
    // const topicCounts = await fetchData('data/topic_counts.json');
    // data = Object.entries(topicCounts).map(([topic, count]) => ({ keyword: topic, intensity: count }));
    // console.log(data);

    // Fetch data
    console.log("no topic");
    data = await fetchData('data/textrank_overall_output.json');
    // Convert the data into an array of arrays
    const dataArray = Object.entries(data);

    // Sort the array by the intensity (descending order)
    dataArray.sort((a, b) => b[1] - a[1]);

    // Print the sorted data
    dataArray.forEach(([keyword, intensity]) => {
        console.log(`${keyword}: ${intensity}`);
    });

    // Initialize an object to store the top 5 keywords for each subtopic
    const topKeywordsBySubtopic = {};
  }
  else {
    const topicCounts = await fetchData('data/topic_counts.json');
    // Fetch keywords for the selected topic or subtopic
    const topicSubtopicCounts = await fetchData('data/textrank_output.json');

    if (topic in topicSubtopicCounts) {
      console.log(topic);
      // If the selected topic is found in the data
      const subtopics = topicSubtopicCounts[topic];
      data = Object.entries(subtopics).flatMap(subtopic => {
        const subtopicKey = subtopic[0]; // Get the subtopic key
        const keywords = subtopic[1]; // Get the keywords object
        return Object.entries(keywords).map(([keyword, intensity]) => ({ keyword, intensity, subtopic: subtopicKey, topic }));
      });
      console.log(data);
    } else {
      // If the selected topic is actually a subtopic, display only its keywords
      const topicSubtopicData = await fetchData('data/topic_subtopic_data.json');
      let mainTopic;
      for (const [main, subs] of Object.entries(topicSubtopicData)) {
        if (subs.includes(topic)) {
          mainTopic = main;
          break;
        }
      }
      const subtopicKeywords = topicSubtopicCounts[mainTopic][topic];
      data = Object.entries(subtopicKeywords).map(([keyword, intensity]) => ({ keyword, intensity, subtopic: topic }));
    }
    console.log(data);
    // Sort data by intensity in descending order
    data.sort((a, b) => b.intensity - a.intensity);
  }

  // Update the keyword ranking view
  const margin = { top: 20, right: 10, bottom: 30, left: 90 };
  const width = 300 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const numKeywords = data.length;
  const barHeight = 10;
  const ySpacing = 20;
  const svgHeight = margin.top + numKeywords * ySpacing + margin.bottom;

  // Update the SVG element's height
  const svg = d3.select("#keyword_svg");
  svg.attr("height", svgHeight);
  svg.selectAll("*").remove();

  const g = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  const x = d3.scaleLinear()
    .range([0, width])
    .domain([0, d3.max(data, d => d.intensity)]);

  const y = d3.scaleBand()
    .range([height, 0])
    .padding(0.1)
    .domain(data.map(d => d.keyword));

  g.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .style("fill", d => subtopicColorScale(d.subtopic)) // Assign color based on subtopic
    .attr("x", 0)
    .attr("height", barHeight)
    .attr("y", (d, i) => margin.top + i * ySpacing)
    .attr("width", d => x(d.intensity));

  g.selectAll(".bar-label")
    .data(data)
    .enter().append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.intensity) + 3)
    .attr("y", (d, i) => margin.top + i * ySpacing + barHeight / 2)
    .attr("dy", ".35em");

  g.selectAll(".keyword-label")
    .data(data)
    .enter().append("text")
    .attr("class", "keyword-label")
    .attr("x", -5)
    .attr("y", (d, i) => margin.top + i * ySpacing)
    .attr("dy", ".35em")
    .attr("text-anchor", "end")
    .text(d => d.keyword)
    .attr("alignment-baseline", "middle");
}


async function fetchDataForSubtopic(topic, subtopic) {
  const topicSubtopicCounts = await fetchData('data/textrank_output.json');
  const subtopics = topicSubtopicCounts[topic];
  if (subtopics && subtopics[subtopic]) {
    return Object.entries(subtopics[subtopic]).map(([keyword, intensity]) => ({ keyword, intensity }));
  } else {
    return [];
  }
}

function findTopicAndSubtopic(subtopic, topicSubtopicData) {
  for (const topic of Object.keys(topicSubtopicData)) {
    if (topicSubtopicData[topic].includes(subtopic)) {
      return [topic, subtopic];
    }
  }
  return [null, null];
}
