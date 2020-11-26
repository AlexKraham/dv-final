let dataset, genreData, areaData;
let svg;
let simulation, nodes;
let categoryLegend;
let currentStep;
let grossIncSizeScale, categoryColorScale, xGrossIncScale, yGrossIncScale;
let topMoviesNum;
// let scales; // create all the scale variables here

// all categories/genres of movies
const categories = ["Musical", "Adventure", "Drama", "Comedy", "Action", "Horror", "Romantic Comedy", "Thriller/Suspense", "Western", "Black Comedy", "Concert/Performance", "Documentary", "Missing"];

// may the genres to indices of the categoires array
const genreMap = { "Musical": 0, "Adventure": 1, "Drama": 2, "Comedy": 3, "Action": 4, "Horror": 5, "Romantic Comedy": 6, "Thriller/Suspense": 7, "Western": 8, "Black Comedy": 9, "Concert/Performance": 10, "Documentary": 11, "Missing": 12 };

// color palette, selected via colorbrewer2.org
const colors = ["#8dd3c7", "#b57d92", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f", "#818da1"];

// cooridnates for the nodes grouped by genre chart
const categoriesXY = {
    "Musical": [0, 550, 57382, 23.9],
    "Adventure": [600, 800, 43538, 48.3],
    "Drama": [0, 800, 41890, 50.9],
    "Comedy": [0, 250, 42200, 48.3],
    "Action": [300, 400, 42745, 31.2],
    "Horror": [200, 600, 36900, 40.5],
    "Romantic Comedy": [250, 800, 36342, 35.0],
    "Thriller/Suspense": [400, 200, 33062, 60.4],
    "Western": [500, 500, 36825, 79.5],
    "Black Comedy": [400, 600, 37344, 55.4],
    "Concert/Performance": [300, 700, 36421, 58.7],
    "Documentary": [600, 200, 32350, 74.9],
    "Missing": [600, 400, 31913, 63.2],
  };

// set up sizing configurations
const margin = { left: 170, top: 50, bottom: 50, right: 20 };
const width = 1000 - margin.left - margin.right;
const height = 950 - margin.top - margin.bottom;

// read the csv and initialize data.
d3.csv("data/disney_movies_total_gross.csv", function(d){
    return {
        title: d["movie_title"],
        releaseDate: d["release_date"],
        date: d3.timeParse("%b %d, %Y")(d["release_date"]),
        genre: d.genre,
        rating: d["MPAA_rating"],
        totalGross: Number(d["total_gross"].replace(/[^0-9\.-]+/g, "")),
        adjGross: Number(d["inflation_adjusted_gross"].replace(/[^0-9\.-]+/g, "")),
      };
}).then((data) => {
  // deal with dupe titles (I.e. The Jungle Book from 1964 and 2016)
  processedData = [];
  data.forEach(function (d){
    if(processedData.some(e => e.title === d.title)){
      processedData.push({...d, title: d.title + " " + d.date.getFullYear()});
    } else {
      processedData.push(d);
    }
  })


  // sort data by total gross
  processedData.sort((a, b) => (a.totalGross < b.totalGross ? 1 : -1));
  dataset = processedData;

  // process data set and replacing missing genres with the word missing
  dataset = dataset.map(function (d) {
    return d.genre === "" ? { ...d, genre: "Missing" } : d;
  });

  createScales();
  setTimeout(drawInitial(), 2000);
})

function createScales(){
    categoryColorScale = d3.scaleOrdinal(categories, colors);
    grossIncSizeScale = d3.scaleLinear(d3.extent(dataset, (d) => d.totalGross), [5,35]);
    xGrossIncScale = d3.scaleLinear(d3.extent(dataset, (d) => d.totalGross), [margin.left, margin.left + width]);
    yGrossIncScale = d3.scaleLinear().domain([0, d3.max(dataset, (d) => d.totalGross)]).range([margin.top + height, margin.top]);
    yDotScale = d3.scaleBand().range([margin.top, margin.top + height]).domain(dataset.map((d) => d.title)).padding(0.1);
}

function recalc_xGrossIncScale(num){
  return d3.scaleLinear(d3.extent(dataset.slice(0, num), (d) => d.totalGross), [margin.left, margin.left + width]).nice();
}

function recaclc_yDotScale(num){
  return d3.scaleBand().range([margin.top, margin.top + height]).domain(dataset.slice(0,num).map((d) => d.title));
}

function createLegend(x, y){
    let svg = d3.select("#legend");

    svg
      .append("g")
      .attr("class", "categoryLegend")
      .attr("transform", `translate(${x},${y})`);
  
    categoryLegend = d3
      .legendColor()
      .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
      .shapePadding(10)
      .scale(categoryColorScale);
  
    d3.select(".categoryLegend").call(categoryLegend);
}



// all initial elements drawn here
// we can hide or shown using opacity attribute
// each element should have an associated class name for reference
function drawInitial(){

  let svg = d3
        .select("#vis")
        .append("svg")
        .attr("width", 1000)
        .attr("height", 950)
        .attr("opacity", 1);

  topMoviesNum = 70;

  // re-create x scale for top 20 movies
  xGrossIncScale = recalc_xGrossIncScale(topMoviesNum);
  yDotScale = recaclc_yDotScale(topMoviesNum);
  // console.log(dataset);    
  let xDotAxis = d3
      .axisBottom(xGrossIncScale)
      // .ticks(8)
      .tickSize(height + 80)
      .tickFormat(function (d) {
        return "$" + d / 1000000 + " million";
      });
    
  let xDotAxisG = svg
      .append("g")
      .attr("class", "x-dot-axis")
      .attr("transform", "translate(0, 0)")
      .call(xDotAxis)
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line"))
      .attr("stroke-opacity", 0.2)
      .attr("stroke-dasharray", 2.5);

    // instantiates the force simulation 
  simulation = d3.forceSimulation(dataset);

    // define each tick of simulation
  simulation.on('tick', () => {
    nodes.attr('cx', d => d.x).attr('cy', d => d.y)
  })

    // stop sim later
  simulation.stop();

  let small_text = svg.selectAll(".small-text")
      .data(dataset.slice(0,topMoviesNum))
      .enter()
      .append("text")
      .text((d, i) => d.title.toLowerCase())
      .attr("class", "small-text")
      .attr("x", margin.left)
      .attr("y", (d, i) => yDotScale(d.title))
      .attr("font-size", 10)
      .attr("text-anchor", "end");

  // create nodes/circles
  nodes = svg
            .selectAll('circle')
            .data(dataset)
            .enter()
            .append('circle')
                .attr('fill', '#595959')
                .attr('r', 4)
                .attr('cx', (d, i) => xGrossIncScale(d.totalGross))
                .attr('cy', (d, i) => yDotScale(d.title))
                .attr('opacity', 0.8);  
  
  updateDotPlot(70);
  
  // Add mouseover and mouseout events for all circles
  // Changes opacity and adds border
  svg.selectAll("circle").on("mouseover", mouseOver).on("mouseout", mouseOut);

  var dotOptions = [10,20,30,40,50,60,70,80,90,100,150,200,250,300,350,400,450,500,550,579];


  d3.select("#selectFirst")
    .selectAll("dotOptions")
    .data(dotOptions)
    .enter()
    .append("option")
    .text(function (d) {
      return d;
    })
    .attr("value", (d) => d)
    .property('selected', 90);
    

  d3.select("#selectFirst").on("change", function (d) {
    var selectedOption = d3.select(this).property("value");
    updateDotPlot(selectedOption);
  });

  d3.select("#selectMovieName")
    .selectAll("nameOptions")
    .data(dataset.slice().sort((a,b) => a.title < b.title ? -1 : 1))
    .enter()
    .append("option")
    .text(function (d) { return d.title})
    .attr("value", (d) => d.title)
  
  d3.select("#selectMovieName").on("change", function (d) {
    var selectedOption = d3.select(this).property("value");
    showMovieInformation(selectedOption);
  })
    

  function updateDotPlot(num){
    topMoviesNum = num;
    xGrossIncScale = recalc_xGrossIncScale(num);
    yDotScale = recaclc_yDotScale(num);
    xDotAxis = d3
      .axisBottom(xGrossIncScale)
      // .ticks(8)
      .tickSize(height + 80)
      .tickFormat(function (d) {
        return "$" + d / 1000000 + " million";
      });
    xDotAxisG.transition().duration(1000).call(xDotAxis);

    svg.selectAll(".small-text")
      .remove();

    let text = svg.selectAll(".small-text")
      .data(dataset.slice(0,topMoviesNum))
      .enter()
      .append("text")
      .text((d, i) => d.title.toLowerCase())
      .attr("class", "small-text")
      .attr("x", - 200)
      .attr("y", (d, i) => yDotScale(d.title))
      .attr("fill-opacity", 0)
      .attr("font-size", 10)
      .attr("text-anchor", "end");

    text.transition().delay(500).duration(1000).attr('fill-opacity', 1).attr("x", margin.left)

    var circleNodes = svg.selectAll('circle')
                        .data(dataset.slice(0,num));

    circleNodes.exit().remove();
    circleNodes.enter().append("circle").attr('r', 4)
    .attr('cx', (d) => xGrossIncScale(d.totalGross))
    .attr('cy', (d) => yDotScale(d.title))
    .attr('fill', '#595959')
    .attr('opacity', 0.8)

    circleNodes
    .transition()
    .duration(500)
    .attr('cx', function(d) {
      console.log("x being called")
      return xGrossIncScale(d.totalGross);
    } )
    .attr('cy', (d) => yDotScale(d.title))
    .attr('r', 4)
    .attr('opacity', 0.8)

    svg.selectAll("circle").on("mouseover", mouseOver).on("mouseout", mouseOut);
  }

  function showMovieInformation(selectedOption){
    console.log(selectedOption);
  }

  // ================================== VISUALIZATION 2 ================================== //

  // svg.selectAll(".genre-rect")
  //     .data(categories)
  //     .enter()
  //     .append('rect')
  //       .attr('class', "genre-rect")
  //       .attr("x", d => categoriesXY[d][0] + 120 + 1000)
  //       .attr('y', d => categoriesXY[d][1] + 30)
  //       .attr('width', 130)
  //       .attr('height', 35)
  //       .attr('opacity', 0)
  //       .attr('fill', 'grey')

  // svg.selectAll(".label-text")
  //   .data(categories).enter()
  //   .append('text')
  //   .attr('class', 'label-text')
  //   .attr('opacity', 0)
  //   .raise()
  
  // svg.selectAll(".label-text")
  //     .text(d => d)
  //     .attr('x', d => categoriesXY[d][0] + 200 + 1000)
  //     .attr('y', d => categoriesXY[d][1] - 500)
  //     .attr('font-family', 'Domine')
  //     .attr('font-size', '12px')
  //     .attr('font-weight', 700)
  //     .attr('fill', 'black')
  //     .attr('text-anchor', 'middle')

  
}

function mouseOver(d, i) {
  console.log("MOSE OVER")

    d3.select(this)
      .transition("mouseover")
      .duration(100)
      .attr("opacity", 1)
      .attr("stroke-width", 5)
      .attr("stroke", "black");

    d3
      .select("#tooltip")
      .style("left", d3.event.pageX + 10 + "px")
      .style("top", d3.event.pageY - 25 + "px")
      .style("display", "inline-block").html(`<strong>Movie:</strong> ${
      d.title
    } 
              <br> <strong>Gross Income:</strong> $${d3.format(",.2r")(
                d.totalGross
              )} 
              <br> <strong>Adjusted Gross Income:</strong> $${d3.format(
                ",.2r"
              )(d.adjGross)}
              <br> <strong>Release Date:</strong> ${d.releaseDate}
              <br> <strong>Genre:</strong> ${d.genre}
              <br> <strong>Rating:</strong> ${d.rating}`);
  
}

function mouseOut(d, i) {

    d3.select("#tooltip").style("display", "none");

    d3.select(this)
      .transition("mouseout")
      .duration(100)
      .attr("opacity", 0.8)
      .attr("stroke-width", 0);
}

function clean(chartType){
  let svg = d3.select("#vis").select("svg");
  if(chartType !== "isDotPlot"){
    svg.select(".x-dot-axis").transition().attr("opacity", 0);
    svg
      .selectAll(".small-text")
      .transition()
      .attr("opacity", 0)
      .attr("x", -200);
    svg.selectAll("circle").transition().duration(1000).delay((d, i) => i * 2).attr('cx', width + 500).attr('cy', height/2).attr("opacity", 0)
    simulation.stop();
  }
}

function draw1(){
    simulation.stop();
    console.log("Drawing figure 1");
    currentStep = 1;
  
    let svg = d3
    .select("#vis")
    .select("svg")
    .attr("width", 1000)
    .attr("height", 950);

    clean("isDotPlot");

    d3.select(".categoryLegend").transition().remove();

    svg.select(".x-dot-axis").attr("opacity", 1);

    svg.selectAll("circle").data(dataset.slice(0, topMoviesNum)).exit().remove();

  svg
    .selectAll("circle")
    .transition()
    .duration(500)
    .delay(100)
    .attr("fill", "#636363")
    .attr("r", 4)
    .attr("cx", (d, i) => xGrossIncScale(d.totalGross))
    .attr("cy", (d) => yDotScale(d.title))
    .attr("opacity", 0.8);

  svg
    .selectAll(".small-text")
    .transition()
    .attr("opacity", 1)
    .attr("x", margin.left)
    .attr("y", (d) => yDotScale(d.title));
}

function draw2(){
    console.log("Drawing figure 2");
    currentStep = 2;
    clean("second");
    let svg = d3.select("#vis").select("svg");

    

    // create any missing circles
    let circleNodes = svg.selectAll("circle").data(dataset).enter().append("circle").attr('r', 4).attr('cy', 200).attr('cx', 200).on('mouseover', mouseOver).on('mouseout', mouseOut);

    svg
    .selectAll("circle")
    .transition()
    .duration(300)
    .delay((d, i) => i * 2)
    .attr("r", (d) => grossIncSizeScale(d.totalGross) * 1.2)
    .attr("fill", (d) => categoryColorScale(d.genre))
    .attr("opacity", 0.8);

    simulation = d3.forceSimulation(dataset);

    let cNodes = svg.selectAll("circle");

    simulation.on("tick", () => {
      cNodes.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });

    simulation
    .force("charge", d3.forceManyBody().strength([2]))
    .force(
      "forceX",
      d3.forceX(function (d) {
        // console.log(d.genre);
        return categoriesXY[d.genre][0] + 200;
      })
    )
    .force(
      "forceY",
      d3.forceY((d) => categoriesXY[d.genre][1] - 50)
    )
    .force(
      "collide",
      d3.forceCollide((d) => grossIncSizeScale(d.totalGross) + 4)
    )
    .alphaDecay([0.02]);

  //Reheat simulation and restart
  simulation.alpha(0.9).restart();

  createLegend(20, 50);


  // create labels
    
  // svg.selectAll(".genre-rect")
  //     .transition()
  //     .duration(300)
  //     .delay((d, i) => i * 30)
  //     .attr('opacity', 0.2)
  //     .attr('x', d => categoriesXY[d][0] + 120)
  
  // svg.selectAll(".label-text")
  //     .transition()
  //     .duration(300)
  //     .delay((d, i) => i * 30)
  //     .text(d => d)
  //     .attr('x', d => categoriesXY[d][0] + 200)
  //     .attr('y', d => categoriesXY[d][1] + 50)
  //     .attr('opacity', 1)
  // simulation.stop();
}

function draw3(){
    console.log("Drawing figure 3");
    currentStep = 3;
    clean("third")

    
}

function draw4(){
    console.log("Drawing figure 4");
    currentStep = 4;
}

function draw5(){
    console.log("Drawing figure 5");
    currentStep = 2;
}

function draw6(){
    console.log("Drawing figure 6");
    currentStep = 2;
}

function draw7(){
    console.log("Drawing figure 7");
    currentStep = 2;
}

function draw8(){
    console.log("Drawing figure 8");
    currentStep = 2;
}

function draw9(){
    console.log("Drawing figure 9");
    currentStep = 2;
}

//Array of all the graph functions
//Will be called from the scroller functionality

let activationFunctions = [
    draw1,
    draw2,
    draw3,
    draw4,
    draw5,
    draw6,
    draw7,
    draw8,
    draw9,
  ];

//All the scrolling function
//Will draw a new graph based on the index provided by the scroll

let scroll = scroller().container(d3.select("#graphic"));
scroll();

let lastIndex,
  activeIndex = 0;

scroll.on("active", function (index) {
  d3.selectAll(".step")
    .transition()
    .duration(500)
    .style("opacity", function (d, i) {
      return i === index ? 1 : 0.1;
    });

  activeIndex = index;
  let sign = activeIndex - lastIndex < 0 ? -1 : 1;
  let scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
  scrolledSections.forEach((i) => {
    activationFunctions[i]();
  });
  lastIndex = activeIndex;
});

scroll.on("progress", function (index, progress) {
  if ((index == 2) & (progress > 0.7)) {
  }
});