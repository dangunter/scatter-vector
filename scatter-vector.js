
// Heavily influenced by Mike Bostock's Scatter Matrix example
// http://mbostock.github.io/d3/talk/20111116/iris-splom.html
//

/**
 * Construct a scatterplot-vector (by analogy to `splom` for scatterplot matrix).
 *
 * Example usage:
 *
 *     var plot = spvec({url: "iris.csv", 
 *                       values: ['sepal width', 'petal length', 'petal width'],
 *                       factors: ['species']});
 *     plot.draw('sepal width');
 *
 * @param url Input is CSV data, with one column per factor/value
 *    - Line 1 is a header
 *    - Lines 2-n are data
 * @param size Size of each plot panel, in pixels
 * @param padding Padding around each plot panel, in pixels
 * @param factors List of indexes of columns that are factors, for grouping
 * @param values Indexes of columns that are observations (values)
 */
function spvec(params) {

    // Parameters.
    // plot data
    this.url = params.url || undefined;
    if (this.url === undefined) {
        throw "url is required";
    }
    // size 
    this.size = params.size || 140;
    // padding
    this.padding = params.padding || 10;
    // factors
    this.factors = params.factors || [];
    // values
    this.values = params.values || [];
    if (!(this.factors || this.values)) {
        throw "at least one of 'factors', 'values' is required";
    }
 
    // Local vars.
    this.has_plot = false;

    // Set self.
    var self = this;

    //=================
    // Private methods
    //=================

    function create_plot(data, primary, is_first) {
        console.debug("Plotting data:",data);
        var columns = d3.set();
        for (var p in data[0]) { if (!data.hasOwnProperty(p)) { columns.add(p); }}

        // Names, values, and factors.
        if (! columns.has(primary)) {
            throw "primary value '" + primary + "' not in data values";
        }
        var names = d3.set(columns.values());
        names.remove(primary);

        // If not specified, factors = names - values
        if (!self.factors) {
            self.factors = d3.set(names.values());
            self.values.forEach(function(v) { self.factors.remove(v); });
        }
        // If not specified, values = names - factors
        else if (!this.values) {
            self.values = d3.set(names.values());
            self.factors.forEach(function(v) { self.values.remove(v); });
        }
        else {
            if (is_first) {
                // save all values, including current primary
                self.orig_values = self.values
            }
            else {
                // reset to values w/old primary
                self.values = self.orig_values
            }
            // remove primary
            var v = d3.set(self.values);
            v.remove(primary);
            self.values = v.values();
        }

        var n = values.length;
        console.debug("max #panels = ",n);

        // Grouping column.
        var groups = d3.set();
        data.forEach(function(row) {
            var group = self.factors
                            .map(function(v) { return row[v]; })
                            .join("-");
            row["_group"] = group;
            groups.add(group);
        });
        // change 'groups' to sorted array
        self.groups = groups.values().sort();

        // Position scales.
        function get_domain(data, v) {
            var s = [d3.min(data, function(d) { return d[v]; }),
                    d3.max(data, function(d) { return d[v]; })];
            console.log(s);
            return s;
        }
        var x = {}, y = {}, range = [self.padding / 2, self.size - self.padding / 2];
        // Set X scales
        console.log("X scales");
        self.values.forEach(function(v) {
            // Coerce values to numbers.
            data.forEach(function(d) { d[v] = +d[v]; });
            x[v] = d3.scale.linear().domain(get_domain(data, v)).range(range);
        });
        // Set Y scale
        console.log("Y scales");
        data.forEach(function(d) { d[primary] = +d[primary]; });
        y[primary] = d3.scale.linear()
                     .domain(get_domain(data, primary).reverse())
                     .range(range);
        console.log("y",y);

        self.plot_data = data;
        self.x = x;
        self.y = y;
        self.nxticks = self.nyticks = 5;

        // Axes.
        console.debug("create axes");
        var x_axis = d3.svg.axis()
            .ticks(self.nxticks)
            .tickSize(self.size);

        var y_axis = d3.svg.axis()
            .ticks(self.nyticks)
            .tickSize(self.size * n);

        // Brush.
        console.debug("create brush");
        self.brush = d3.svg.brush()
            .on("brushstart", brushstart)
            .on("brush", brush)
            .on("brushend", brushend);

        // Root panel.
        console.debug("create root panel");
        self.svg = d3.select(".plot").append("svg:svg")
            //.attr("width", 1200)
            //.attr("height", 300)
            .append("svg:g")
              .attr("transform", "translate(" + 50 + "," + self.padding + ")");
              //.attr("transform", "translate(" + self.padding*3 + "," + self.padding + ")");

        // Legend.
        console.debug("create legend");
        var leg_x = self.size * n + 2*self.padding;
        var leg_y = (self.size - (n * 20)) / 2;
        var legend = self.svg.selectAll("g.legend")
            .data(self.groups)
            .enter().append("svg:g")
            .attr("class", "legend")
            .attr("transform", function(d, i) { 
                return "translate(" + leg_x + "," + (leg_y + i * 20) + ")";
            });

        legend.append("svg:circle")
            .attr("class", String)
            .attr("r", 3);

        legend.append("svg:text")
            .attr("x", 12)
            .attr("dy", ".31em")
            .text(function(d) { return "" + d; });

        // X-axis.
        console.debug("draw X axis");
        self.svg.selectAll("g.x.axis")
            .data(values)
            .enter().append("svg:g")
              .attr("class", "x axis")
              .attr("transform", function(d, i) { return "translate(" + i * self.size + ",0)"; })
            .each(function(d) {
                d3.select(this)
                    .call(x_axis.scale(x[d]).orient("bottom"));
                var sz_rt = self.size / Math.sqrt(2);
                d3.select(this)
                    .selectAll("text")
                        .attr("dx", "-0.2em")
                        .attr("dy", "0.2em")
                        .attr("transform", "translate(" + -sz_rt + "," + sz_rt/2 + ") rotate(-45)");
            });

        // Y-axis.
        console.debug("draw Y axis");
        self.svg.selectAll("g.y.axis")
            .data([primary])
            .enter().append("svg:g")
            .attr("class", "y axis")
            .attr("transform", function(d, i) { return "translate(" + self.size * n + ",0)"; })
            .each(function(d) {
                console.log("d", d, " y[d]",y[d](3));
                d3.select(this).call(y_axis.scale(y[d]).orient("left"));
            });

        // Cell and plot.
        console.debug("cell and plot")
        var cell = self.svg.selectAll("g.cell")
            .data(cross(values, [primary]))
            .enter().append("svg:g")
            .attr("class", function(d) { return (d.i > 0 ? "cell" : "cell first-cell"); })
            .attr("transform", function(d) { return "translate(" + d.i * size + ",0)"; })
            .each(plot);

        // Axis titles.
        console.debug("x-axis titles")
        cell.append("svg:text")
            .attr("x", self.padding)
            .attr("dx", "1em")
            .attr("y", self.padding + self.size)
            .attr("dy", "3em")
            .text(function(d) { return d.x; });

        /*
        var first_cell = self.svg.selectAll("g.first-cell");
        first_cell.filter(function(d) { return d.i === 0; }).append("svg:text")
            .attr("transform", "rotate(270," + self.size/2 + "," + self.size/2 + ")")
            .attr("y", -self.size/2)
            .attr("dx", (self.size - self.padding)/2)
            .attr("x", 0)
            .attr("dy", self.padding)
            .attr("style", "text-anchor: middle")
            .classed("yaxis-label", true)
            .text(function(d) { return d.y; });
        */
    }

    function plot(p) {
        console.debug("plotting cell");
        var data = self.plot_data; // local alias
        self.cell = d3.select(this);

        // Plot frame.
        self.cell.append("svg:rect")
        .attr("class", "frame")
        .attr("x", self.padding / 2)
        .attr("y", self.padding / 2)
        .attr("width", self.size - self.padding)
        .attr("height", self.size - self.padding);

        // Plot dots.
        self.cell.selectAll("circle")
            .data(data)
              .enter().append("svg:circle")
            .attr("class", function(d) { return d._group; })
            .attr("cx", function(d) { return (isNaN(d[p.x])) ? 0 : self.x[p.x](d[p.x]); })
            .attr("cy", function(d) { return (isNaN(d[p.y])) ? 0 :self.y[p.y](d[p.y]); })
            .attr("r", function(d) { return (isNaN(d[p.x]) || isNaN(d[p.y])) ? 0 : 3; } );

        // Plot brush.
        self.cell.call(self.brush.x(self.x[p.x])
                            .y(self.y[p.y]));
    }

    // Clear the previously-active brush, if any.
    function brushstart(p) {
        brush_selected(false);
        var cell = self.svg.selectAll("g.cell");
        if (self.brush.data !== p) {
            cell.call(self.brush.clear());
            self.brush.x(self.x[p.x]).y(self.y[p.y]).data = p;
        }
    }

    // Highlight the selected circles.
    function brush(p) {
        var e = self.brush.extent();
        self.svg.selectAll(".cell circle").attr("class", function(d) {
            return (e[0][0] <= d[p.x] && d[p.x] <= e[1][0] &&
                    e[0][1] <= d[p.y] && d[p.y] <= e[1][1] ? d._group : null);
        });
    }

    // If the brush is empty, select all circles.
    function brushend() {
        if (self.brush.empty()) {
            self.svg.selectAll(".cell circle")
                    .attr("class", function(d) { return d._group; });
        }
        else {
            brush_selected(true);
        }
    }

    // Toggle associated page elements when brushed area is selected.
    function brush_selected(value) {
        d3.select("#plot-selected").classed("disabled", !value);
    }

    // Generate a x b    
    function cross(a, b) {
        var c = [], n = a.length, m = b.length, i, j;
        for (i = -1; ++i < n;) {
            for (j = -1; ++j < m;) {
                c.push({x: a[i], i: i, y: b[j], j: j});
            }
        }
        return c;
    }

    //================
    // Public methods
    //================


    /** 
     * Create the plot.
     *
     * @param primary Name of primary value, against which to plot other values
     */
    function draw(primary) {
        if (self.has_plot) {
            console.debug("clearing old plot");
            d3.select("div.plot").html("");
            console.debug("creating new plot");
            create_plot(self.dataset, primary, false);
        }
        else {
            console.debug("loading plot data");
            d3.csv(self.url, function(dataset) {
                if (dataset === null) {
                    throw "error parsing url: " + self.url;
                }
                console.debug("creating new plot");
                create_plot(dataset, primary, true);
                self.dataset = dataset;
            });
            self.has_plot = true;
        }
    }

    /**
     * Get selected elements.
     */
    function selected(fun) {
        if (!self.has_plot || self.brush.empty()) {
            return [];
        }
        var result = [];
        var e = self.brush.extent();
        self.groups.forEach(function(grp) {
            self.svg.selectAll(".cell circle")
                      .filter("." + grp)
                        .datum(function(d) {
                            result.push(d);
                            return d;
                        });
        });
        if (result.length === 0) {
            return [];
        }
        else {
            return fun(result, self);
        }
    }

    return {
        draw: draw,
        selected: selected
    };
}

