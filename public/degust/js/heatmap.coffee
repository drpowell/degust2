viridis = require('./lib/scale-color-perceptual/hex/viridis.json')
inferno = require('./lib/scale-color-perceptual/hex/inferno.json')
magma   = require('./lib/scale-color-perceptual/hex/magma.json')
plasma  = require('./lib/scale-color-perceptual/hex/plasma.json')

# Calculate an ordering for the genes.
# This uses a greedy N^2 algorithm to find the next closest data point on each iteration.
# Seems to do a decent job.
# The optimal solution is actually a travelling salesman problem.  I'm happy
# for better heuristics than this.  I did try an MDS of the data points and order
# those by the first dimension, but that did not give a nice heatmap.
# NOTE: this is intended to be used in a web-worker so has no external dependencies
calc_order = (e) ->
    [data, columns] = e.data

    t1 = new Date()

    if !data?
        self.postMessage({error: "Data missing"})
        return

    if !columns?
        self.postMessage({error: "Columns missing"})
        return

    if data? && data.length==0
        self.postMessage({done: []})
        return

    # Distance calc for 2 genes. (for clustering)
    dist = (r1,r2) ->
        s = 0
        for c in columns
            v = r1[c.idx]-r2[c.idx]
            s += v*v
            #s = Math.max(s,v)
        s

    # Calculate the most extreme point.  First calculate the "centre" of all the data-points
    # Then find the data-point most distant from it.  Will be used to start the clustering
    # Seems like a reasonable heuristic
    calc_extreme_point = () ->
        centroid = []
        tot = 0
        data.forEach((r) =>
            columns.map((c) ->
                centroid[c.idx]||=0
                centroid[c.idx] += r[c.idx])
            tot+=1)
        for k,v of centroid
            centroid[k] = v/tot
        max_i=0
        max_d=0
        for i in [0 .. data.length-1]
            d = dist(centroid, data[i])
            if d>max_d
                max_d=d
                max_i=i
        return max_i

    used = {}
    order = [calc_extreme_point()]
    used[order[0]] = true

    # Greedy clustering.  Find closest data-point and append
    message_after = 0
    while order.length < data.length
        if (message_after++)>=50
            message_after = 0
            postMessage({upto: order.length})
        row = data[order[order.length-1]]
        best_i = best_d = null
        for i in [0 .. data.length-1]
            continue if used[i]
            r = data[i]
            d = dist(row,r)
            if !best_d or d<best_d
                best_d = d
                best_i = i
        order.push(best_i)
        used[best_i] = true

    # Done.
    order_ids = order.map((i) => data[i].id)
    postMessage({done: order_ids, took: (new Date())-t1})

class Heatmap
    constructor: (@opts) ->
        @opts.h_pad ?= 20
        @opts.h ?= 20
        @opts.label_width ?= 120
        @opts.legend_height ?= 100;

        @opts.limit ?= @opts.width - @opts.label_width

        @opts.width = d3.select(@opts.elem).node().clientWidth - 20;
        @opts.limit = @opts.width - @opts.label_width;

        @svg = d3.select(@opts.elem).append('svg')
        @svg.append('g').attr("class", "labels")
        @svg.append('g').attr("class", "genes").attr("transform", "translate(#{@opts.label_width},0)")
        @svg.attr("width", "100%").attr("height", 100)

        @info = @svg.append('text')
                    .attr("class", "info")
                    .attr("x", @opts.width-200)
                    .attr("y", 10)

        @legend = @svg.append('g').attr('class',"legend")

        @dispatch = d3.dispatch("mouseover","mouseout");

        @get_color_scale = @_color_red_blue;

        # Create a single wrapper for later use
        @worker = new WorkerWrapper(calc_order, (d) => @_worker_callback(d))
        @_enabled = true
        @_make_menu(@opts.elem);


    resize: () ->
        @opts.width = d3.select(@opts.elem).node().clientWidth - 20;
        @opts.limit = @opts.width - @opts.label_width;
        @info.attr("x", @opts.width-200)
        @legend.attr("width", @opts.width)
        @_redraw_all();

    # Enable/disable the heatmap.  When disabled it is hidden and does not update
    enabled: (enabled) ->
        if enabled?
            @_enabled = enabled
            $(@opts.elem).toggle(enabled)
        else
            @_enabled

    _make_menu: (el) ->
        print_menu = [] #(new Print(@svg, "heatmap")).menu()
        menu = [
                divider: true
            ,
                title: 'Colour scheme'
            ,
                title: 'Red/white/blue'
                action: (elm, d, i) =>
                    @get_color_scale = @_color_red_blue;
                    @_redraw_all();
            ,
                title: 'Red/black/green'
                action: (elm, d, i) =>
                    @get_color_scale = @_color_red_green;
                    @_redraw_all();
            ,
                title: 'Viridis'
                action: (elm, d, i) =>
                    @get_color_scale = @_color_viridis(viridis);
                    @_redraw_all();
            ,
                title: 'Inferno',
                action: (elm, d, i) =>
                    @get_color_scale = @_color_viridis(inferno);
                    @_redraw_all();
            ,
                title: 'Magma',
                action: (elm, d, i) =>
                    @get_color_scale = @_color_viridis(magma);
                    @_redraw_all();
            ,
                title: 'Plasma',
                action: (elm, d, i) =>
                    @get_color_scale = @_color_viridis(plasma);
                    @_redraw_all();
        ]
        d3.select(el).on('contextmenu', d3.contextMenu(print_menu.concat(menu))) # attach menu to element

    _color_red_blue : () ->
        return d3.scale.linear()
                 .domain([-@max, 0, @max])
                 .range(["blue", "white", "red"]);

    _color_red_green : () ->
        d3.scale.linear()
                 .domain([-@max, 0, @max])
                 .range(["green", "black", "red"]);

    _color_viridis: (scale) ->
        () ->
          d3.scale.quantize()
             .domain([-@max, @max])
             .range(scale);

    _redraw_all : () ->
        @_draw_columns();
        @_render_heatmap();


    _make_legend: () ->
        @colorScale = @get_color_scale()
        @legend.selectAll("*").remove()

        @legend.append('text')
               .attr("x", -10)
               .attr("y", 20)
               .attr("text-anchor", "end")
               .text("Heatmap log-fold-change ")

        width = 100
        @legend.attr("transform", "translate(#{@opts.width-width}, #{@height - @opts.legend_height})")

        steps = width
        stepToVal = d3.scale.linear().domain([0, steps-1]).range([-@max, @max])
        vals = (v for v in [0 ... steps])

        g = @legend.append('g')

        rects = g.selectAll('rect')
                       .data(vals)
        rects.enter().append("rect")
                     .attr("x", (v) -> v*1.0*width/steps)
                     .attr("height", 20)
                     .attr("width", 1.0*width/steps)
                     .style("fill", (v) => @colorScale(stepToVal(v)))

        sc = d3.scale.linear().domain([-@max,@max]).range([0,width])
        axis = d3.svg.axis()
                  .scale(sc)
                  .orient("bottom")
                  .tickSize(5)
        # Draw the ticks and rotate labels by 90%
        g.append('g')
         .attr('transform', "translate(0, 20)")
         .call(axis)
          .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", "-0.4em")
            .attr("transform", "rotate(-90)");

    set_order: (@order) ->
        # Nothing

    _show_calc_info: (str) ->
        @info.text(str)

    _worker_callback: (d) ->
        if d.error?
            log_error("Worker error : #{d.error}")
        if d.upto?
            @_show_calc_info("Clustered #{d.upto} of #{@data.length}")
        if d.done?
            @order = d.done
            @_render_heatmap()
            @_show_calc_info("")
        if d.took?
            log_debug("calc_order: took=#{d.took}ms for #{@data.length} points")

    # Calculate the order of genes for the heatmap.  This uses the 'calc_order' function
    # from above, wrapped in a web-worker
    _calc_order: () ->
        @worker.start([@data,@columns.map((c) -> {idx: c.idx})])

    _thinking: (bool) ->
        @_is_thinking = bool
        @svg.select("g.genes").attr('opacity',if bool then 0.4 else 1)

    schedule_update: (data) ->
        @data=data if data
        return if !@data? || !@columns? || !@_enabled

        scheduler.schedule('heatmap.render', () => )

        @_thinking(true)
        @_calc_order()

    # update_columns(columns,extent,sel_column)
    #   columns - The DGE condition columns
    #   extent - the total range of all columns
    #   sel_column - column to order rendering by  (usually p-value so most significant "on top")
    update_columns: (@columns, extent, @sel_column) ->
        @max = d3.max(extent.map(Math.abs))
        @height = @opts.legend_height + @opts.h_pad + (@opts.h * @columns.length);
        @svg.attr("width", @opts.width)
            .attr("height", @height)
        @_draw_columns()

    reorder_columns: (columns) ->
        @columns = columns
        scheduler.schedule('heatmap.render', (() => 
            @_draw_columns()
            if !@_is_thinking
                @_render_heatmap()
        ), 200)

    _draw_columns: () ->
        cols = @svg.select('.labels').selectAll('.label')
                   .data(@columns, (c) -> c.name)
        cols.enter().append('text').attr("class","label")
        cols.exit().remove()
        cols.attr("text-anchor", "end")
            .text((d) -> d.name)
            .transition()
            .attr('x', @opts.label_width)
            .attr('y', (d,i) => i * @opts.h + @opts.h/2)
        @_make_legend()

    _render_heatmap: () ->
        @_thinking(false)
        kept_data = {}
        sorted = @data[0..]
        sorted.sort((a,b) => a[@sel_column] - b[@sel_column])
        kept_data[d.id]=d for d in sorted[0..@opts.limit-1]

        # Recalc @max?
        # flatten = (arr) -> [].concat.apply([], arr)
        # ex = d3.extent(flatten(@data.map((r) => d3.extent(@columns.map((c) -> r[c.idx])))))
        # @max = d3.max(ex.map(Math.abs))
        # @_make_legend()

        row_ids={}
        num_kept=0
        for id in (@order || data.map((d) -> d.id))
            if kept_data[id]
                row_ids[id]=num_kept
                num_kept += 1

        w = d3.min([@opts.h, (@opts.width - @opts.label_width) / num_kept])

        #console.log("max",@max,"kept",kept_data,"num", num_kept, w)

        # @_create_brush(w)

        genes = @svg.select(".genes").selectAll("g.gene")
                    .data(d3.values(kept_data)) #, (d) -> d.id)

        genes.enter().append("g").attr("class","gene")
        genes.exit().remove()

        cells = genes.selectAll(".cell")
                     .data(((d) =>
                         if !row_ids[d.id]?
                             log_info("missing row_ids[#{d.id}]")
                             return
                         res=[]
                         for i,c of @columns
                             res.push {row:row_ids[d.id], col:i, score: d[c.idx], id: d.id }
                         res),
                         (d) -> d.col)
        cells.enter().append("rect").attr('class','cell')
        cells.attr("width",  w)
             .attr("height", @opts.h)
             .style("fill", (d) => @colorScale(d.score))
             .attr("x", (d) => d.row * w)
             .attr("y", (d) => d.col * @opts.h)
        cells.exit().remove()

        genes.on('mouseover', (d) => @dispatch.mouseover(d))
        genes.on('mouseout', () => @dispatch.mouseout())

        #genes.on('mousedown', (e,l) -> console.log 'down', e,l)
        #genes.on('mouseup', (e,l) -> console.log 'up', e,l)
        #genes.on('mousemove', (e,l) -> console.log 'move', e,l)

    on: (t,func) ->
        @dispatch.on(t, func)

    # NOT IN USE - not sure how to get it right.  How should it interact with parallel-coords or ma-plot?
    _create_brush: (w) ->
        # Create brush
        x = d3.scale.identity().domain([0, (@opts.width - @opts.label_width)])
        brush = d3.svg.brush()
             .x(x)
             #.extent([0,200])
             #.on("brush", () -> console.log 'brushed', brush.extent())
             .on("brushend", () =>
                ex = brush.extent()
                data = @svg.selectAll("rect.cell").data()
                d = data.filter((d) -> d.col=='0' && ex[0]<=d.row*w && ex[1]>=d.row*w)
                #console.log "in range=",d
                )

        @svg.select("g.brush").remove()
        gBrush = @svg.append("g")
             .attr("class", "brush")
             .attr("transform", "translate(#{@opts.label_width},0)")
             .call(brush)
            # .call(brush.event)
        gBrush.selectAll("rect")
              .attr("height", 100*@opts.h_pad + @opts.h * @columns.length);


window.Heatmap = Heatmap
