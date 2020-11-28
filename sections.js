let dataset, genreData, areaData;
let svg;
let simulation, nodes;
let categoryLegend;
let currentStep;
let grossIncSizeScale, categoryColorScale, xGrossIncScale, yGrossIncScale, xAreaScale, yAreaScale, yAreaAdjScale;
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
  // d3.csv("data/disney-voice-actors.csv", function(d){
  //   return {
  //     character: d['character'],
  //     actor: d['voice-actor'],
  //     movie: d['movie']
  //   }
  // }).then((data) => {
  //   console.log(data)
  // })
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

  initGenreData();

  initAreaData();

  createScales();
  setTimeout(drawInitial(), 2000);
})

function initGenreData(){
  genreData = [
    { genre: "Musical", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Adventure", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Drama", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: ""},
    { genre: "Comedy", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Action", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Horror", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Romantic Comedy", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Thriller/Suspense", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Western", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Black Comedy", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Concert/Performance", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Documentary", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
    { genre: "Missing", income: 0, adjGross: 0, top: 0, bot: 9000000000, topTitle: "", botTitle: "" },
  ];

  dataset.forEach(function (d) {
    let index = genreMap[d.genre ?? "Missing"];
    // console.log("D", d)
    genreData[index].income += d.totalGross;
    genreData[index].adjGross += d.adjGross;
    if(d.totalGross > genreData[index].top){
      genreData[index].top = d.totalGross;
      genreData[index].topTitle = d.title;
    }
    if(d.totalGross < genreData[index].bot){
      genreData[index].bot = d.totalGross;
      genreData[index].botTitle = d.title;
    }
    // genreData[index]
  });
  genreData.sort((a, b) => (a.income > b.income ? -1 : 1));
}

function initAreaData(){
  areaData = d3
    .nest()
    .key(function (d) {
      return d3.timeYear(d.date);
    })
    .rollup(function (d) {
      return {
        totalGross: d3.sum(d, (g) => g.totalGross),
        Musical: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Musical" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Musical" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Musical" ? 1 : 0;
          }),
        },
        Adventure: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Adventure" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Adventure" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Adventure" ? 1 : 0;
          }),
        },
        Drama: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Drama" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Drama" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Drama" ? 1 : 0;
          }),
        },
        Comedy: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Comedy" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Comedy" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Comedy" ? 1 : 0;
          }),
        },
        Action: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Action" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Action" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Action" ? 1 : 0;
          }),
        },
        Horror: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Horror" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Horror" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Horror" ? 1 : 0;
          }),
        },
        "Romantic Comedy": {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Romantic Comedy" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Romantic Comedy" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Romantic Comedy" ? 1 : 0;
          }),
        },
        "Thriller/Suspense": {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Thriller/Suspense" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Thriller/Suspense" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Thriller/Suspense" ? 1 : 0;
          }),
        },
        Western: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Western" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Western" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Western" ? 1 : 0;
          }),
        },
        "Black Comedy": {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Black Comedy" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Black Comedy" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Black Comedy" ? 1 : 0;
          }),
        },
        "Concert/Performance": {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Concert/Performance" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Concert/Performance" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Concert/Performance" ? 1 : 0;
          }),
        },
        Documentary: {
          totalGross: d3.sum(d, function (g) {
            return g.genre == "Documentary" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre == "Documentary" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Documentary" ? 1 : 0;
          }),
        },
        Missing: {
          totalGross: d3.sum(d, function (g) {
            // console.log("G",g);
            return g.genre === "Missing" ? g.totalGross : 0;
          }),
          adjGross: d3.sum(d, function (g) {
            return g.genre === "Missing" ? g.adjGross : 0;
          }),
          total: d3.sum(d, function (g) {
            return g.genre == "Missing" ? 1 : 0;
          }),
        },
        adjGross: d3.sum(d, (g) => g.adjGross),
        total: d3.sum(d, (g) => 1),
      };
    })
    .entries(dataset);

  areaData.sort((a, b) => (new Date(a.key) < new Date(b.key) ? -1 : 1));

  areaData.map((d) => (d.key = new Date(d.key)));

}

function createScales(){
  // console.log("AREA In create", areaData);
    categoryColorScale = d3.scaleOrdinal(categories, colors);
    grossIncSizeScale = d3.scaleLinear(d3.extent(dataset, (d) => d.totalGross), [5,35]);
    xGrossIncScale = d3.scaleLinear(d3.extent(dataset, (d) => d.totalGross), [margin.left, margin.left + width]);
    yGrossIncScale = d3.scaleLinear().domain([0, d3.max(dataset, (d) => d.totalGross)]).range([margin.top + height, margin.top]);
    yDotScale = d3.scaleBand().range([margin.top, margin.top + height]).domain(dataset.map((d) => d.title)).padding(0.1);
    xAreaScale = d3.scaleTime().domain(d3.extent(areaData, (d) => d.key)).range([margin.left, margin.left + width]);
    yAreaScale = d3.scaleLinear().domain([0, d3.max(areaData, (d) => d.value.totalGross)]).range([margin.top + height / 2, margin.top]);
    yAreaAdjScale = d3.scaleLinear().domain([0, d3.max(areaData, (d) => d.value.adjGross)]).range([margin.top + height / 2, margin.top]);
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

  let movieNames = dataset.slice();
  movieNames.push({title: ""})
  console.log(movieNames);
  d3.select("#selectMovieName")
    .selectAll("nameOptions")
    .data(movieNames.sort((a,b) => a.title < b.title ? -1 : 1))
    .enter()
    .append("option")
    .text(function (d) { return d.title})
    .attr("value", (d) => d.title)
  
  d3.select("#selectMovieName").on("change", function (d) {
    var selectedOption = d3.select(this).property("value");
    showMovieInformation(selectedOption);
  })
    

  function updateDotPlot(num){
    svg.select(".movieText").transition().duration(500).attr('opacity', 0).remove();
    svg.select(".movieGenre").transition().duration(500).attr('opacity', 0).remove();
    svg.select(".releaseDate").transition().duration(500).attr('opacity', 0).remove();
    svg.select(".rating").transition().duration(500).attr('opacity', 0).remove();
    svg.select(".totalGross").transition().duration(500).attr('opacity', 0).remove();
    svg.select(".adjGross").transition().duration(500).attr('opacity', 0).remove();

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
    xDotAxisG.transition().duration(1000).call(xDotAxis).attr("opacity", 1);

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
    svg.select(".movieCircle").remove();
    svg.select(".movieText").remove();
    svg.select(".movieGenre").remove();
    svg.select(".releaseDate").remove();
    svg.select(".rating").remove();
    svg.select(".totalGross").remove();
    svg.select(".adjGross").remove();
    console.log(selectedOption);
    clean("none");
    var movieInfo = dataset.filter(d => d.title === selectedOption)[0];

    svg.append('circle').attr("class", "movieCircle").attr('cx', margin.left + width/2).attr("cy", margin.top + height/2).attr('fill', '#3F4531').attr('r', 0).on('mouseover', function(){})
    svg.append("text").attr("class", "movieText").attr("x", margin.left + width/2).attr("y", margin.top + height /2).text(movieInfo.title).style("text-anchor", "middle").attr("opacity", 0)
    svg.append("text").attr("class", "movieGenre").attr("x", margin.left + width/2).attr("y", margin.top + height /2).text("Genre: " + movieInfo.genre).style("text-anchor", "middle").attr("opacity", 0)
    svg.append("text").attr("class", "releaseDate").attr("x", margin.left + width/2).attr("y", margin.top + height /2).text("Rating: " + movieInfo.rating).style("text-anchor", "middle").attr("opacity", 0)
    svg.append("text").attr("class", "rating").attr("x", margin.left + width/2).attr("y", margin.top + height /2).text("Release Date: " + movieInfo.releaseDate).style("text-anchor", "middle").attr("opacity", 0)
    svg.append("text").attr("class", "totalGross").attr("x", margin.left + width/2).attr("y", margin.top + height /2).text("Total Gross: $" + d3.format(",")(movieInfo.totalGross)).style("text-anchor", "middle").attr("opacity", 0)
    svg.append("text").attr("class", "adjGross").attr("x", margin.left + width/2).attr("y", margin.top + height /2).text("Adjusted Gross (For Inflation): $" + d3.format(",")(movieInfo.adjGross)).style("text-anchor", "middle").attr("opacity", 0)
    // svg.append("text").attr("class", "movieText").attr("x", margin.left + width/2).attr("y", margin.top + height /2 + 40).text(movieInfo.genre).style("text-anchor", "middle").attr("opacity", 0)


    svg.select(".movieCircle").transition().duration(1000).attr('cx', margin.left + width/2).attr("cy", margin.top + height/2).attr("r", 400).attr("opacity", 0.8)


    svg.select(".movieText").transition().duration(1000).attr('opacity', 1).attr('y', margin.top + height /3).style("font-size", "40px").style("font-family", "DM Serif Display").attr("fill", "#d7dbd7")
    svg.select(".movieGenre").transition().duration(1000).attr('opacity', 1).attr("y", margin.top + height/3 + 100).style("font-size", "30px").style("font-family", "Libre Franklin").attr("fill", "#ffffff")
    svg.select(".releaseDate").transition().duration(1000).attr('opacity', 1).attr("y", margin.top + height/3 + 140).style("font-size", "30px").style("font-family", "Libre Franklin").attr("fill", "#ffffff")
    svg.select(".rating").transition().duration(1000).attr('opacity', 1).attr("y", margin.top + height/3 + 180).style("font-size", "30px").style("font-family", "Libre Franklin").attr("fill", "#ffffff")
    svg.select(".totalGross").transition().duration(1000).attr('opacity', 1).attr("y", margin.top + height/3 + 220).style("font-size", "30px").style("font-family", "Libre Franklin").attr("fill", "#ffffff")
    svg.select(".adjGross").transition().duration(1000).attr('opacity', 1).attr("y", margin.top + height/3 + 260).style("font-size", "30px").style("font-family", "Libre Franklin").attr("fill", "#ffffff")

    
  
    
    console.log("Movie", movieInfo)
   
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

  // ================================== VISUALIZATION 3 ================================== //
  let xTimeAxis = d3.axisBottom(xAreaScale);

  let xTimeAxisG = svg
    .append("g")
    .call(xTimeAxis)
    .attr("class", "area-x")
    .attr("opacity", 0)
    .attr("transform", `translate(0, ${margin.top + 700})`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 1)
    .attr("stroke-dasharray", 1.5);

  let yIncAxis = d3
    .axisLeft(yAreaAdjScale)
    .ticks(5)
    .tickSize([width])
    .tickFormat(function (d) {
      return "$" + d / 1000000000 + " billion";
    });

  let yIncAxisGroup = svg
    .append("g")
    .call(yIncAxis)
    .attr("class", "area-y")
    .attr("opacity", 0)
    .attr("transform", `translate(${margin.left + width}, 275)`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 0.2)
    .attr("stroke-dasharray", 2.5);
  
  const areaGenerator = d3
    .area()
    .x((d) => xAreaScale(d.key))
    .y0(yAreaAdjScale(0))
    .y1((d) => yAreaAdjScale(d.value.totalGross))
    .curve(d3.curveBasis);

  svg
    .append("g")
    .append("path")
    .attr("class", "area-path")
    .attr("transform", `translate(0, 275)`)
    // .attr("stroke", "steelblue")
    .attr("fill", "#cce5df")
    .attr("stroke", "#69b3a2")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0)
    .attr("d", areaGenerator(areaData));


  // ================================== VISUALIZATION 4: Adjusted Gross Income ================================== //
  let yAdjIncAxis = d3
    .axisLeft(yAreaAdjScale)
    .ticks(5)
    .tickSize([width])
    .tickFormat(function (d) {
      return "$" + d / 1000000000 + " billion";
    });

  let yAdjIncAxisGroup = svg
    .append("g")
    .call(yAdjIncAxis)
    .attr("class", "adj-area-y")
    .attr("opacity", 0)
    .attr("transform", `translate(${margin.left + width}, 275)`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 0.2)
    .attr("stroke-dasharray", 2.5);

  const adjAreaGenerator = d3
    .area()
    .x((d) => xAreaScale(d.key))
    .y0(yAreaAdjScale(0))
    .y1((d) => yAreaAdjScale(d.value.adjGross))
    .curve(d3.curveBasis);

  svg
    .append("g")
    .append("path")
    .attr("class", "adj-area-path")
    .attr("transform", `translate(0, 275)`)
    // .attr("stroke", "steelblue")
    .attr("fill", "#f0dfb4")
    .attr("stroke", "#d1b05a")
    .attr("stroke-width", 1.5)
    .attr("opacity", 0)
    .attr("d", adjAreaGenerator(areaData));

  // ================================== VISUALIZATION 6: Line Charts ================================== //
  var xLineScale = d3
    .scaleTime()
    .domain(d3.extent(areaData, (d) => d.key))
    .range([margin.left, margin.left + width]);

  var yLineScale = d3
    .scaleLinear()
    .domain([0, d3.max(areaData, (d) => d.value.adjGross)])
    .range([margin.top + height / 2, margin.top]);

  let xLineAxis = d3.axisBottom(xLineScale);
  let yLineAxis = d3
    .axisLeft(yLineScale)
    .tickSize([width])
    .tickFormat(function (d) {
      return "$" + d / 1000000000 + " billion";
    });

  let xLineAxisG = svg
    .append("g")
    .call(xLineAxis)
    .attr("class", "line-x")
    .attr("opacity", 0)
    .attr("transform", `translate(0, ${margin.top + 700})`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 1)
    .attr("stroke-dasharray", 1.5);

  let yLineAxisG = svg
    .append("g")
    .call(yLineAxis)
    .attr("class", "line-y")
    .attr("opacity", 0)
    .attr("transform", `translate(${margin.left + width}, 275)`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 0.2)
    .attr("stroke-dasharray", 2.5);

  const lineGenerator = d3
    .line()
    .x((d) => xLineScale(d.key))
    .y((d) => yLineScale(d.value.Musical.adjGross))
    .curve(d3.curveBasis);

  var genreLine = svg
    .append("g")
    .append("path")
    .attr("class", "line-path")
    .attr("transform", `translate(0, 275)`)
    // .attr("stroke", "steelblue")
    .attr("fill", "none")
    .attr("stroke", "#ffcc00")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0)
    .attr("d", lineGenerator(areaData));


  // CREATE THE SELECTION OPTIONS
  d3.select("#selectButton")
    .selectAll("myOptions")
    .data(categories)
    .enter()
    .append("option")
    .text(function (d) {
      return d;
    })
    .attr("value", (d) => d);

  function update(selectedGroup) {
    console.log("Updating", selectedGroup);
    console.log("area data", areaData);
    xLineScale = d3
      .scaleTime()
      .domain(d3.extent(areaData, (d) => d.key))
      .range([margin.left, margin.left + width]);
    yLineScale = d3
      .scaleLinear()
      .domain([0, d3.max(areaData, (d) => d.value[selectedGroup].adjGross)])
      .range([margin.top + height / 2, margin.top]);
    xLineAxis = d3.axisBottom(xLineScale);
    yLineAxis = d3
      .axisLeft(yLineScale)
      .tickSize([width])
      .tickFormat(function (d) {
        return "$" + d / 1000000000 + " billion";
      });

    xLineAxisG.transition().duration(1000).call(xLineAxis);

    yLineAxisG.transition().duration(1000).call(yLineAxis);

    genreLine
      .datum(areaData)
      .transition()
      .duration(1000)
      .attr(
        "d",
        d3
          .line()
          .x((d) => xLineScale(d.key))
          .y((d) => yLineScale(d.value[selectedGroup].adjGross))
          .curve(d3.curveBasis)
      )
      .attr("stroke", (d) => colors[genreMap[selectedGroup]]);
  }

  d3.select("#selectButton").on("change", function (d) {
    var selectedOption = d3.select(this).property("value");
    update(selectedOption);
  });

  // ================================== VISUALIZATION 7: Line Charts Num Movies By Genre ================================== //
  let xNumLineScale = d3
    .scaleTime()
    .domain(d3.extent(areaData, (d) => d.key))
    .range([margin.left, margin.left + width]);

  let yNumLineScale = d3
    .scaleLinear()
    .domain([0, d3.max(areaData, (d) => d.value.total)])
    .range([margin.top + height / 2, margin.top]);

  let xNumLineAxis = d3.axisBottom(xNumLineScale);
  let yAxisTicks = yNumLineScale
    .ticks()
    .filter((tick) => Number.isInteger(tick));
  let yNumLineAxis = d3
    .axisLeft(yNumLineScale)
    .tickSize([width])
    .tickValues(yAxisTicks)
    .tickFormat(d3.format("d"));

  let xNumLineAxisG = svg
    .append("g")
    .call(xNumLineAxis)
    .attr("class", "num-line-x")
    .attr("opacity", 0)
    .attr("transform", `translate(0, ${margin.top + 700})`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 1)
    .attr("stroke-dasharray", 1.5);

  let yNumLineAxisG = svg
    .append("g")
    .call(yNumLineAxis)
    .attr("class", "num-line-y")
    .attr("opacity", 0)
    .attr("transform", `translate(${margin.left + width}, 275)`)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 0.2)
    .attr("stroke-dasharray", 2.5);

  const numLineGenerator = d3
    .line()
    .x((d) => xNumLineScale(d.key))
    .y((d) => yNumLineScale(d.value.total));
  // .curve(d3.curveBasis)

  var numLine = svg
    .append("g")
    .append("path")
    .attr("class", "num-line-path")
    .attr("transform", `translate(0, 275)`)
    // .attr("stroke", "steelblue")
    .attr("fill", "none")
    .attr("stroke", "#ffcc00")
    .attr("stroke-width", 2.5)
    .attr("opacity", 0)
    .attr("d", numLineGenerator(areaData))

  var options = ["All", ...categories];

  d3.select("#selectNumButton")
    .selectAll("myOptions")
    .data(options)
    .enter()
    .append("option")
    .text(function (d) {
      return d;
    })
    .attr("value", (d) => d);

  function updateNumChart(selectedGroup) {
    // console.log("Updating", selectedGroup);
    // console.log("area data", areaData);
    xNumLineScale = d3
      .scaleTime()
      .domain(d3.extent(areaData, (d) => d.key))
      .range([margin.left, margin.left + width]);
    yNumLineScale = d3
      .scaleLinear()
      .domain([0, d3.max(areaData, (d) => selectedGroup == "All" ? d.value.total : d.value[selectedGroup].total)])
      .range([margin.top + height / 2, margin.top]);
    yAxisTicks = yNumLineScale.ticks().filter((tick) => Number.isInteger(tick));
    xNumLineAxis = d3.axisBottom(xNumLineScale);
    yNumLineAxis = d3
      .axisLeft(yNumLineScale)
      .tickSize([width])
      .tickValues(yAxisTicks)
      .tickFormat(d3.format("d"));

    xNumLineAxisG.transition().duration(1000).call(xNumLineAxis);

    yNumLineAxisG.transition().duration(1000).call(yNumLineAxis);

    numLine
      .datum(areaData)
      .transition()
      .duration(1000)
      .attr(
        "d",
        d3
          .line()
          .x((d) => xNumLineScale(d.key))
          .y((d) => yNumLineScale(selectedGroup == "All" ?  d.value.total : d.value[selectedGroup].total))
      )
      .attr("stroke", (d) => selectedGroup == "All" ? 'black' : colors[genreMap[selectedGroup]]);
  }

  d3.select("#selectNumButton").on("change", function (d) {
    var selectedOption = d3.select(this).property("value");
    updateNumChart(selectedOption);
  });

  // // ================================== VISUALIZATION 8: Bar Chart ================================== //
  // console.log("GENRE", genreData);
  xGenreScale = d3
    .scaleLinear()
    .domain(d3.extent(genreData, (d) => d.income))
    .range([margin.left, margin.left + width]);
  yGenreScale = d3
    .scaleBand()
    .range([margin.top + 250, margin.top + height])
    .domain(genreData.map((d) => d.genre))
    .padding(0.1);

  let xGenreAxis = d3
    .axisBottom(xGenreScale)
    .tickSize(-height + 250)
    .tickFormat(function (d) {
      return "$" + d / 1000000000 + " billion";
    });

  let xGenreAxisG = svg
    .append("g")
    .attr("class", "genre-chart-x")
    .attr("transform", `translate(0, ${height + margin.top - 100})`)
    .attr("opacity", 0)
    .call(xGenreAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 0.2)
    .attr("stroke-dasharray", 2.5);

  let yGenreAxis = d3.axisLeft(yGenreScale);

  let yGenreAxisG = svg
    .append("g")
    .attr("class", "genre-chart-y")
    .attr("opacity", 0)
    .attr("transform", `translate(${margin.left}, -100)`)
    .call(yGenreAxis)
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line"))
    .attr("stroke-opacity", 0.2)
    .attr("stroke-dasharray", 2.5);

  let genreRects = svg
    .selectAll("myRect")
    .data(genreData)
    .enter()
    .append("rect")
    .attr("class", "genre-rects")
    .attr("opacity", 0)
    .attr("x",  width + 1000)
    .attr("y", function (d) {
      // console.log("doing", d.genre)
      return yGenreScale(d.genre) - 100;
    })
    .attr("width", function (d) {
      // console.log("wow", yGenreScale(100000));
      return xGenreScale(0);
    })
    .attr("height", yGenreScale.bandwidth())
    .attr("fill", function (d) {
      return colors[genreMap[d.genre]];
    })
    .on("mouseover", mouseOverBarChart)
    .on("mouseout", mouseOutBarChart);


    function mouseOverBarChart(d, i) {
      // console.log("MOSE OVER")
    
        d3.select(this)
          .transition("mouseover")
          .duration(100)
          .attr("opacity", 1)
          .attr("stroke-width", 2)
          .attr("stroke", "black");
    
        d3
          .select("#tooltip")
          .style("left", d3.event.pageX + 10 + "px")
          .style("top", d3.event.pageY - 25 + "px")
          .style("display", "inline-block").html(`<strong>Genre:</strong> ${
          d.genre
        } 
                  <br> <strong>Top Grossing Movie:</strong> ${d.topTitle}
                  <br> <strong>Total Gross:</strong> $${d3.format(",")(
                    d.top
                  )} 
                  <br> <strong>Bottom Grossing Movie:</strong> ${d.botTitle}
                  <br> <strong>Total Gross:</strong> $${d3.format(",")(
                    d.bot
                  )} 
                `);
      
    }
    
    function mouseOutBarChart(d, i) {
    
        d3.select("#tooltip").style("display", "none");
    
        d3.select(this)
          .transition("mouseout")
          .duration(100)
          .attr("opacity", 0.8)
          .attr("stroke-width", 0);
    }

    let barChartOptions = ["Total Gross Income", "Adjusted Gross (For Inflation)"];

    d3.select("#selectBarChart")
    .selectAll("myBarChartOptions")
    .data(barChartOptions)
    .enter()
    .append("option")
    .text(function (d) {
      return d;
    })
    .attr("value", (d) => d);

    d3.select("#selectBarChart").on("change", function (d) {
      var selectedOption = d3.select(this).property("value");
      if(selectedOption == "Total Gross Income"){
        xGenreScale = d3
          .scaleLinear()
          .domain(d3.extent(genreData, (d) => d.income))
          .range([margin.left, margin.left + width]);

        xGenreAxis = d3.axisBottom(xGenreScale)
          .tickSize(-height + 250)
          .tickFormat(function (d) {
              return "$" + d / 1000000000 + " bil.";
          });;

        xGenreAxisG.transition().duration(1000).call(xGenreAxis);
        genreRects.transition().duration(1000)
                  .attr("x", xGenreScale(0))
                  .attr("width", function (d) {
                      return xGenreScale(d.income);
                  })

      } else {
        xGenreScale = d3
          .scaleLinear()
          .domain(d3.extent(genreData, (d) => d.adjGross))
          .range([margin.left, margin.left + width]);

        xGenreAxis = d3.axisBottom(xGenreScale)
                      .tickSize(-height + 250)
                      .tickFormat(function (d) {
                          return "$" + d / 1000000000 + " bil.";
                      });;

        xGenreAxisG.transition().duration(1000).call(xGenreAxis);


        genreRects.transition().duration(1000)
                  .attr("x", xGenreScale(0))
                  .attr("width", function (d) {
                      return xGenreScale(d.adjGross);
                  })
      }
    });

  //   // ============================= CONCLUSION VISUALIZATIONS ============================= //
  svg
  .append("g")
  .append("image")
  .attr("class", "conclusion-img")
  .attr(
    "xlink:href",
    "https://drive.google.com/uc?export=view&id=1_ZkAlcC23pSgoYiy42PmdNw6I_XlTc0Z"
  )
  .attr("width", 1000)
  .attr("height", 1000)
  .attr("x", width + 1000)
  .attr("y", height / 2)
  .attr("opacity", 0);

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
              <br> <strong>Gross Income:</strong> $${d3.format(",")(
                d.totalGross
              )} 
              <br> <strong>Adjusted Gross Income:</strong> $${d3.format(
                ","
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
  svg.select(".movieCircle").transition().duration(1000).attr("cx", width + 1000).remove();
    svg.select(".movieText").transition().duration(1000).attr('x', width + 1000).attr('opacity', 0).remove();
    svg.select(".movieGenre").transition().duration(1000).attr('x', width + 1000).attr('opacity', 0).remove();
    svg.select(".releaseDate").transition().duration(1000).attr('x', width + 1000).attr('opacity', 0).remove();
    svg.select(".rating").transition().duration(1000).attr('x', width + 1000).attr('opacity', 0).remove();
    svg.select(".totalGross").transition().duration(1000).attr('x', width + 1000).attr('opacity', 0).remove();
    svg.select(".adjGross").transition().duration(1000).attr('x', width + 1000).attr('opacity', 0).remove();
  if(chartType !== "one"){
    svg.select(".x-dot-axis").transition().attr("opacity", 0);
    svg
      .selectAll(".small-text")
      .transition()
      .attr("opacity", 0)
      .attr("x", -200);
    svg.selectAll("circle").transition().duration(1000).delay((d, i) => i * 2).attr('cx', width + 500).attr('cy', height/2).attr("opacity", 0)
    simulation.stop();

    
  }
  if(chartType !== "two"){
    
  }
  if(chartType !=="three"){
    svg.select(".area-x").transition().attr("opacity", 0);
    svg.select(".area-y").transition().attr("opacity", 0);
    svg.select(".area-path").transition().attr("opacity", 0);
  }
  if(chartType !=="four"){
    svg.select(".area-x").transition().attr("opacity", 0);
    svg.select(".adj-area-y").transition().attr("opacity", 0);
    svg.select(".adj-area-path").transition().attr("opacity", 0);
  }
  if(chartType !== "six"){
    svg.select(".line-x").transition().attr("opacity", 0);
    svg.select(".line-y").transition().attr("opacity", 0);
    svg.select(".line-path").transition().attr("opacity", 0);
  }
  if(chartType !== "seven"){
    svg.select(".num-line-x").transition().attr("opacity", 0);
    svg.select(".num-line-y").transition().attr("opacity", 0);
    svg.select(".num-line-path").transition().attr("opacity", 0);
  }
  if(chartType !== "eight"){
    svg.select(".genre-chart-x").transition().attr("opacity", 0);
    svg.select(".genre-chart-y").transition().attr("opacity", 0);
    svg
      .selectAll(".genre-rects")
      .transition()
      .duration(1000)
      .delay((d, i) => i * 100 )
      .attr("opacity", 0)
      .attr("width", function (d) {
        return xGenreScale(0);
      })
      .attr('x', width+1000)
      
  }
  if(chartType !== "nine"){
    svg.select(".conclusion-img").transition().attr('x', width + 1000).attr('y', height / 2).attr("opacity", 0);
    document.body.style.backgroundColor = "#F5F4F1";
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

    clean("one");

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
    clean("two");
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
}

function draw3(){
  let svg = d3.select("#vis").select("svg");
    console.log("Drawing figure 3");
    currentStep = 3;
    clean("three")

    svg.select(".area-path").transition().duration(1400).attr("opacity", 0.7);
    svg.select(".area-x").transition().duration(1400).attr("opacity", 1);
    svg.select(".area-y").transition().duration(1400).attr("opacity", 1);
}

function draw4(){
    console.log("Drawing figure 4");
    currentStep = 4;
    clean("four");

  let svg = d3.select("#vis").select("svg");

  svg.select(".adj-area-path").transition().duration(700).attr("opacity", 0.7);
  svg.select(".area-x").transition().duration(700).attr("opacity", 1);
  svg.select(".adj-area-y").transition().duration(700).attr("opacity", 1);
}

function draw5(){
  console.log("Drawing figure 5");
  currentStep = 5;
  clean("five");
  let svg = d3.select("#vis").select("svg");

  svg.select(".adj-area-path").transition().duration(700).attr("opacity", 0.5);
  svg.select(".area-path").transition().duration(700).attr("opacity", 1);
  svg.select(".area-x").transition().duration(700).attr("opacity", 1);
  svg.select(".adj-area-y").transition().duration(700).attr("opacity", 1);
}

function draw6(){
    console.log("Drawing figure 6");
    currentStep = 6;
    clean("six");

  let svg = d3.select("#vis").select("svg");

  svg.select(".line-x").transition().duration(700).attr("opacity", 1);
  svg.select(".line-y").transition().duration(700).attr("opacity", 1);
  svg.select(".line-path").transition().duration(700).attr("opacity", 1);

}

function draw7(){
  console.log("Drawing figure 7");
  

  clean("seven");

  let svg = d3.select("#vis").select("svg");

  svg.select(".num-line-x").transition().duration(700).delay(currentStep === 8 ? 1400 : 0).attr("opacity", 1);
  svg.select(".num-line-y").transition().duration(700).delay(currentStep === 8 ? 1400 : 0).attr("opacity", 1);
  svg.select(".num-line-path").transition().duration(700).delay(currentStep === 8 ? 1800 : 0).attr("opacity", 1);
  currentStep = 7;
}

function draw8(){


  let svg = d3.select("#vis").select("svg");
  currentStep = 8;
  console.log("drawing 8");

  clean("eight");

  svg.select(".genre-chart-x").transition().duration(1400).attr("opacity", 1);
  svg.select(".genre-chart-y").transition().duration(1400).delay(2000).attr("opacity", 1);
  svg
    .selectAll(".genre-rects")
    .transition()
    .duration(1400)
    .attr("width", (d) => xGenreScale(d.income))
    .attr("x", (d) => xGenreScale(0))
    .attr("opacity", 1)
    .delay(function (d, i) {
      return i * 100;
    });
}

function draw9(){
  currentStep = 9;
  clean("none");
  let svg = d3.select("#vis").select("svg");
  console.log("drawing 9");
  svg.select(".conclusion-img").transition().delay(1200).duration(700).attr("x", 0).attr("y", 0).attr("opacity", 1);
  document.body.style.backgroundColor = "#CCE7D6";
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