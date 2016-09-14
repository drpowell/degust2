class QC
	@pvalue_histogram: (data) ->
		width = 700
		height = 400

		pval_col = data.columns_by_type('p')[0]
		if !pval_col?
			pval_col = data.columns_by_type('fdr')[0]
		pvals = data.get_data().map((r) -> r[pval_col.idx])
		bins = d3.layout.histogram()
				  .bins(50)(pvals)

		div = $('<div class="middle">')
		div.css(
			'position': 'absolute'
			'top': '80px'
			'left': ($(window).width()-width)/2 + "px"
			'height': (height+10) + "px"
		)
		$("body").append(div)

		barGraph = new BarGraph(
				   elem: div.get(0)
				   tot_width: width
				   tot_height: height
				   title: "P-value histogram"
				   xlabel: "p-value"
				   ylabel: "number"
				   xdomain: [0,1]
				   xordinal: false
		)
		barGraph.draw(bins.map((b) -> {lbl: b.x, val: b.y, width: b.dx}))
		QC.overlay(div, () -> div.remove())

	@overlay: (elem, closed) ->
		# now the overlay highlight
		elem.addClass('edit-elem')
		over = $('<div class="edit-overlay">')
		elem_back = $('<div class="edit-backdrop">')

		offset = elem.offset()
		offset.top = offset.top-4
		offset.left = offset.left-4
		elem_back.width(elem.innerWidth()+8).height(elem.innerHeight()+8).offset(offset)

		$("body").append(over)
		$("body").append(elem_back)
		over.on('click', () ->
			elem.removeClass('edit-elem')
			over.remove()
			elem_back.remove()
			closed()
		)



window.QC = QC