class BarGraph
    constructor: (@opts) ->
        @opts.tot_width  ||= 200
        @opts.tot_height ||= 200
        @opts.ylabel || = ''
        @opts.xlabel || = ''
        @opts.title ||= ''
        @opts.xordinal = true if !@opts.xordinal?

        margin = {top: 20, right: 10, bottom: 40, left: 40}
        @width = @opts.tot_width - margin.left - margin.right
        @height = @opts.tot_height - margin.top - margin.bottom

        if @opts.xordinal
          @x = d3.scale.ordinal()
                 .rangeRoundBands([0, @width], .1)
        else
          @x = d3.scale.linear()
                 .range([0, @width])

        @y = d3.scale.linear()
               .range([@height, 0])

        @xAxis = d3.svg.axis()
                   .scale(@x)
                   .orient("bottom")
                   .tickSize(8,1)

        @yAxis = d3.svg.axis()
                   .scale(@y)
                   .orient("left")
                   .tickSize(8,1)

        @svg = d3.select(@opts.elem).append("svg")
                 .attr('class','bar-chart')
                 .attr("width", @width + margin.left + margin.right)
                 .attr("height", @height + margin.top + margin.bottom)
                .append("g")
                 .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    draw: (data) ->
        @svg.selectAll("*").remove()
        @x.domain(if @opts.xdomain? then @opts.xdomain else data.map((d) -> d.lbl ))
        @y.domain([0, d3.max(data, (d) -> d.val)])

        @svg.append("text")
             .attr('class', 'title')
             .attr("x", @width/2)
             .attr("y", -10)
             .style("text-anchor", "middle")
             .text(@opts.title)

        @svg.append("g")
             .attr("class", "x axis")
             .attr("transform", "translate(0," + @height + ")")
             .call(@xAxis)
            .append("text")
             .attr('class', 'label')
             .attr("x", @width/2)
             .attr("y", 30)
             .style("text-anchor", "middle")
             .text(@opts.xlabel)

        @svg.append("g")
             .attr("class", "y axis")
             .call(@yAxis)
           .append("text")
             .attr('class', 'label')
             .attr("transform", "rotate(-90)")
             .attr("x", -60)
             .attr("y", -30)
             .style("text-anchor", "end")
             .text(@opts.ylabel)

        @svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
              .attr("class", "bar")
              .attr("x", (d) => @x(d.lbl))
              .attr("width", (d) => if d.width then @x(d.width) else @x.rangeBand())
              .attr("y", (d) => @y(d.val))
              .attr("height", (d) => @height - @y(d.val))
              .on('click', (d) => if @opts.click? then @opts.click(d))

window.BarGraph = BarGraph