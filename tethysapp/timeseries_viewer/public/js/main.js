var data = [];
var unit_tracker = [];
var unit1 = null
var unit2 = null;
var resid_on = null;
//ymax and ymin store the maximum y value for each axis.
var ymax =0
var ymin=0
var y2max=0
var y2min=0
//tool tip for the quality control column
var quality_title=null
var number = 0


var unit3 = ''
var res = null
// here we set up the configuration of the CanvasJS chart
var chart_options = {
    zoomEnabled: true,
    height: 600,
    legend: {
        cursor: "pointer",
        itemclick: function (e) {
            if (typeof (e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                e.dataSeries.visible = false;
            } else {
                e.dataSeries.visible = true;
            }
            e.chart.render();
        }
    },
    colorSet: 'greenShades',
    title: {
        fontSize: 20,
        text: "Data Series Viewer"
    },
    toolTip: {
        content: "{name}{y} <br>{x}"
    },
    data: [],
    axisX: {

        labelFontSize: 10
    },
    axisY: {
        fontSize: 15,
        labelFontSize: 10,
        titleWrap: true,
        titleMaxWidth: 150,
        gridThickness:2,
        includeZero: false,
        //viewportMaximum:180,
        //interval: 50
    },
    axisY2: {
        title: "",
        fontSize: 15,
        labelFontSize: 10,
        titleWrap: true,
        gridThickness:2,
        includeZero: false,
    }
};

// shows an error message in the chart title
function show_error(error_message) {
    $('#loading').hide();
    console.log(error_message);
    $('#error-message').text(error_message);
}

function add_series_to_chart(chart, res_id, end_of_resources, unit_off,id_qms,src,xml_rest_id) {

    xtime.length = 0
    xval = ''
    yvalu = ''
    master_id =[]
    length_master= 0

    current_url = location.href;
    index = current_url.indexOf("timeseries-viewer");
    base_url = current_url.substring(0, index);


    if (src =='xmlrest'){

        xml_rest_id = res_id
        res_id ='xmlrest'

    }
    var csrf_token = getCookie('csrftoken');
    data_url = base_url + 'timeseries-viewer/chart_data/' + res_id + '/' + src + '/';
    $.ajax({
        type:"POST",
        headers:{'X-CSRFToken':csrf_token},
        dataType: 'json',
        //timeout: 5000,
        data:{'url_xml':xml_rest_id},
        url: data_url,
        success: function (json) {
            console.log(json)
            var dseries =[]
            error = json.error
            if (error != ''){show_error(error)}
            else {
                var chart = $("#chartContainer").CanvasJSChart()
                json = json.data
                len = json.length
                for (series in json) {
                    plot_data(chart, res_id, end_of_resources, unit_off, id_qms, json[series], len)
                }
            }
        },
        error: function () {
            show_error("Error loading time series from " + res_id);
        }
    });
}
function roundUp(x){
    var negative = false;
    if(x < 0) {
        negative = true;
        x *= -1;
    }
    var y = Math.pow(10, x.toString().length-1);
    x = (x/y);
    x = Math.ceil(x);
    x = x*y;
    if(negative)
    {
        x *= -1;
    }
    return x;
}
function roundDown(x){
    var negative = false;
    if(x<10 && x>=0){
        x = 0

        return x
    }
    else if(x <1 && x>=-1){
        x=1
        negative = true
    }
    else if(x < 0) {
        if(x<0 &&x >= -10){
            x = -10
            return x
        }
        else{
            negative = true;
            x *= -1
        }
        var y = Math.pow(10, x.toString().length-1);
        x = (x/y);
        x = Math.ceil(x);
        x = x*y*-1;

        return x
    }
    var y = Math.pow(10, x.toString().length-1);
    x = (x/y);
    x = Math.floor(x);
    x = x*y;

    if(negative){
        x *= -1;
        return x;
    }
    else{
        return x;
    }
}

function myFunc(id, name) {
    var chart1 = $("#chartContainer").CanvasJSChart()
    var selected_box = document.getElementById(id)

    var chk_unit = document.getElementById(id).name;
    var series = chart1.options.data[id].visible
    res = selected_box.getAttribute("data-resid")

    //units = units.replace(/\s+/g, '==')
    if (series == true) {
        chart1.options.data[id].visible = false
        chart1.render();
    } else if (series == false) {
        //first_unit =''
        if (chk_unit != unit1 && chk_unit != unit2) {
            unit1_display =unit1.replace(/==/g, ' ')
            unit2_display =unit2.replace(/==/g, ' ')
            var test1 = 'Please select a unit type to hide.<br>' +
                '<input type="radio" id ="r1" name ="units" value=' + unit1 + ' checked>' + unit1_display + '<br>' +
                '<input type="radio" id ="r2" name ="units" value=' + unit2 + '>' + unit2_display + '<br>' +
                '<button class="btn btn-danger" id="change_unit" onclick ="multipletime()" >submit</button>'
            $('#' + id).attr('checked', false);
            $('#unit_selector_info').html("")
            $('#unit_selector_info').append(test1)
            unit3 = chk_unit
            var popupDiv = $('#unit_selector');
            popupDiv.modal('show');

        }
        else {
            chart1.options.data[id].visible = true
            chart1.render();
        }
    }
}

var popupDiv = $('#welcome-popup');
$(document).ready(function (callback) {
    console.log("ready")
    var src = find_query_parameter("SourceId");
    var wu = find_query_parameter("WofUri");
    var source =find_query_parameter("Source");
    if (source[0] == "cuahsi"){
        src='cuahsi'
    }
    else{
        var src1 = find_query_parameter("src");

        if (src1 =='hydroshare'){src = src1}
        else if (src1 =='xmlrest'){src=src1}
        else{src =null}
    }
    var table = $('#data_table').DataTable({
        "createdRow": function (row, data, dataIndex) {

            if (number == 0 || number%10 ==0) {
                color1 = "#ec3131"
            }
            if (number == 1|| number%10 ==1) {
                color1 = "#2cc52e"
            }
            if (number == 2|| number%10 ==2) {
                color1 = "#313eec"
            }
            if (number == 3|| number%10 ==3) {
                color1 = "#dd25d5"
            }
            if (number == 4|| number%10 ==4) {
                color1 = "#0d0c0d"
            }
            if (number == 5|| number%10 ==5) {
                color1 = "#31cbec"
            }
            if (number == 6|| number%10 ==6) {
                color1 = "#fb8915"
            }
            if (number == 7|| number%10 ==7) {
                color1 = "#ffb8e7"
            }
            if (number == 8|| number%10 ==8) {
                color1 = "#fbfd07"
            }
            if (number == 9|| number%10 ==9) {
                color1 = "#660099"
            }

            $('td', row).eq(0).css("backgroundColor", color1)
            $('td', row).eq(1).each(function () {
                var sTitle;
                sTitle = "Click here to see more data"
                this.setAttribute('title', sTitle);
            });
            $('td', row).eq(6).each(function () {
                ;
                sTitle = {"data": "quality"},
                    this.setAttribute('title', quality_title);
            });
            //console.log({"data": "quality"})
            var table = $('#data_table').DataTable()
            table.$('td').tooltip({
                selector: '[data-toggle="tooltip"]',
                container: 'body',
                "delay": 0,
                "track": true,
                "fade": 100
            });
        },

        data: data,

        "columns": [
            {
                "className": "legend",
                "data": "legend"
            },
            {
                "className": 'details-control',
                "orderable": false,
                "data": null,
                "defaultContent": ''
            },
            {"data": "organization"},
            {"data": "name"},
            {"data": "variable"},
            {"data": "unit"},
            {"data": "quality"},
            {"data": "count"},
            //{"data":"download"}
        ],
        "order": [[1, 'asc']]
    });
    //Add event listener for opening and closing details
    $('#data_table tbody').on('click', 'td.details-control', function () {
        var tr = $(this).closest('tr');
        var row = table.row(tr);

        row_num = row[0][0]
        if (row.child.isShown()) {
            // This row is already open - close it
            row.child.hide();
            tr.removeClass('shown');
        }
        else {
            // Open this row
            row.child(format(row.data())).show();
            box(row.data().boxplot_count);
            var series =
            {
                name: 'Site:' + row.data().name +
                ' Variable:' + row.data().variable,
                data: [],
                groupPadding: 0,
            }
            // creating and formatting the boxplot for each time series
            series.data = [row.data().boxplot.map(Number)];
            var name_plot = '#container' + row.data().boxplot_count
            var chart = $(name_plot).highcharts();
            chart.setTitle({text: row.data().name});
            chart.yAxis[0].setTitle({text: row.data().variable + ' (' + row.data().unit + ')'})
            chart.xAxis[0].setTitle({
                text: 'Mean: ' + row.data().mean + ' Median: ' + row.data().median +'<br>'+
                ' Maximum: ' + row.data().max + '  Minimum : ' + row.data().min
            })
            chart.addSeries(series);
            tr.addClass('shown');
        }
    });

    $('#loading').show();
    addingseries();
    $('#stat_div').hide();
    //$('#button').hide();

    $('#multiple_units').hide();
    $('#data_table_length').html("")
    $('#data_table_filter').html("")
    $("#chart").hide();
    // change the app title
    document.title = 'Data Series Viewer';
})
/* Formatting function for row details - modify as you need */
function format(d) {
    // `d` is the original data object for the row
    name = 'container' + d.boxplot_count
    return '<div id = "container' + d.boxplot_count + '"class ="highcharts-boxplot" style = "float:right;height:300px;width:40%" ></div>' +
        '<link href="https://gitcdn.github.io/bootstrap-toggle/2.2.2/css/bootstrap-toggle.min.css" rel="stylesheet">'+
        '<script src="https://gitcdn.github.io/bootstrap-toggle/2.2.2/js/bootstrap-toggle.min.js"></script>'+
        '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:100px; margin-left:8.5%;font-size: 9pt">' +
        '<tr>' +
        '<td>Sample Medium:</td>' +
        '<td>' + d.samplemedium + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Method:</td>' +
        '<td>' + d.method + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Data Type:</td>' +
        '<td>' + d.datatype + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Value Type:</td>' +
        '<td>' + d.valuetype + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Time Support:</td>' +
        '<td>' + d.timesupport + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Time Units:</td>' +
        '<td>' + d.timeunit + '</td>' +
        '</tr>' +
        '<tr>' +
        '<td>Source Description:</td>' +
        '<td>' + d.sourcedescription + '</td>' +
        '</tr>' +
        '<tr>' +
        '<table cellpadding="5" cellspacing="0" border="0" style="padding-left:100px; margin-left:8.5%;font-size: 9pt">'+
        '<td>Line Plot</td>'+
        '<td><label class="switch"> <input id= "'+d.number+'"type="checkbox"onClick ="scatter_line(this.id);"> <div class="slider round"></div> </label></td>' +
        '<td>' +
        '<div id="scatter'+ d.number+'">Scatter Plot</div>' +
        '' +
        '</td>' +
        '</table>'+
        '</tr>' +
        '</table>';
    //'<input type="checkbox" checked data-toggle="toggle">
}

function box(number) {
    var name = '#container' + number
    $(name).highcharts({
        chart: {

            type: 'boxplot'
        },
        legend: {
            enabled: false
        },
        xAxis: {
            categories: 1,
            title: {
                text: ''
            },
            minRange: 1,
            labels: {enabled: false}
        },
        yAxis: {
            labels: {
                style: {
                    width: '20px'
                },
                step: 1
            }
        },
        title: {
            align: 'center'
        },
        plotOptions: {
            series: {
                groupPadding: 0
            }
        },
    });
};
function finishloading(callback) {
    $(window).resize()
    $('#stat_div').show();
    $(window).resize();
    $('#loading').hide();
    $('#multiple_units').show();
    var chart = $("#chartContainer").CanvasJSChart()
    $("#chart").show();
    chart.render();


}

function addingseries(unit_off) {
    var src = find_query_parameter("src");
    var series_counter =0
    var source = find_query_parameter('Source')
    var end_of_resources = false
    var chart = $("#chartContainer").CanvasJSChart()
    var counter = 0
    var res_id =null
    var xml_rest_id=null
    CanvasJS.addColorSet("greenShades",
        [//colorSet Array
            "#ec3131",
            "#2cc52e",
            "#313eec",
            "#dd25d5",
            "#0d0c0d",
            "#31cbec",
            "#fb8915",
            "#ffb8e7",
            "#fbfd07",
            "#660099",
        ])
    $("#chartContainer").CanvasJSChart(chart_options);

    if (source[0] == 'cuahsi'){
        src='cuahsi'
    }
    else if (source[0]=''){window.location ='http://data.cuahsi.org/#'}

    if (src =='cuahsi'){
        res_id=find_query_parameter('WofUri')
        var quality=find_query_parameter('QCLID')
        var method=find_query_parameter('MethodId')
        var sourceid = find_query_parameter('SourceId')

    }
    else if(src=='hydroshare') {
        res_id = find_query_parameter("res_id");
    }
    else if (src=='xmlrest'){

        res_id = find_query_parameter("res_id");

        res_id = res_id[0].split(',')
    }


    //var series_counter = 0
    if (unit_off == null) {
        unit_off = ''
    }
    series_counter = res_id.length

    for (var id in res_id){
        xtime = []
        if( src =='cuahsi'){
            if(quality[id]=='null' || quality[id]=='None')
            {quality1=''}
            else{quality1 = quality[id]}
            if(method[id]=='null' || method[id]=='None')
            {method1=''}
            else{method1 = method[id]}
            if(sourceid[id]=='null' ||sourceid[id]=='None')
            {sourceid1=''}
            else{sourceid1 = sourceid[id]}
            id_qms =  quality1 +'aa'+method1+'aa'+sourceid1
        }
        else{
            id_qms="not_cuahsi"
        }
        counter = counter + 1
        if (counter ==series_counter){end_of_resources =true}
        add_series_to_chart(chart, res_id[id], end_of_resources, unit_off,id_qms,src);
    }
}
function multipletime() {
    var popupDiv = $('#unit_selector');
    var chart = $("#chartContainer").CanvasJSChart()
    popupDiv.modal('hide');
    $('#stat_div').hide();
    $('#multiple_units').hide();
    $('#loading').show();
    var unit_off = document.querySelector('input[name = "units"]:checked').value;
    unit1 = document.querySelector('input[name = "units"]:not(:checked)').value;
    unit2 = unit3
    resid_on = res
    chart.options.data = []
    chart.render()
    $("#chartContainer").html=''
    $("#chart").hide();
    ymax =0
    ymin=0
    y2max=0
    y2min=0
    var table = $('#data_table').DataTable();
    number  = 0
    table
        .clear()
        .draw();
    addingseries(unit_off);
}
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function trim_input(string){
    string = string.replace(']','')
    string = string.replace('[','')
    string = string.replace(/'/g,'')
    string = string.replace(/"/g,'')
    string = string.replace(/ /g,'')
    //string = string.replace('[','')
    string =string.split(',')
    return string
}
function find_query_parameter(name) {
    url = location.href;
    values=[]
    url1 = url.split('?')
    if (url1[1]==undefined){values.push('')}
    else {
        url1 = url1[1].split('&')
        for (e in url1) {
            if (url1[e].indexOf(name) == 0) {
                string = url1[e]
                string = string.split('=')
                values.push(string[1])
            }
        }
    }
    return values
}
function scatter_line(id){
    var chart1 = $("#chartContainer").CanvasJSChart()
    data = chart1.options.data
    var size = Object.keys(data).length;
    var selected_box = document.getElementById(id)
    var chk_unit = document.getElementById(id).name;
    var type = chart1.options.data[id].type
    if(type =='line'){
        chart1.options.data[id].type = 'scatter'
        if (size==1){chart1.options.data[id].color='#ec3131'}//keeps the scatter plot points the same color

    }
    else{chart1.options.data[id].type='line'

    }
    chart1.render()
}
function plot_data(chart, res_id, end_of_resources, unit_off,id_qms,data,len){
    json = data
    var status = json.status;
    if (status !== 'success') //displays error
    {
        show_error(chart, "Error loading time series from " + res_id + ": " + status)
        $('#loading').hide();
        return;
    }
    var units = json.units;
    var master_values = json.master_values;
    var master_counter = json.master_counter;
    var master_times = json.master_times;
    var meta_dic = json.meta_dic;
    var master_boxplot = json.master_boxplot
    var master_stat = json.master_stat
    var bad_meta = false
    var bad_meta_counter = 0
    var val1=[]

    var counter =0
    id_qms_a_split = id_qms.split('aa')//identifier based upon url parameters
    var counter1 = 0
    for (val in master_values)//this loop deals with any parameters that are not specified in the url query
    {

        meta1 = val.split("aa");// an identifier based upon data in file
        if (id_qms != 'not_cuahsi')
        {
            if (id_qms_a_split[0] == '') {
                meta1[0] = ''
            }
            if (id_qms_a_split[1] == '') {
                meta1[1] = ''
            }
            if (id_qms_a_split[2] == '') {
                meta1[2] = ''
            }
        }
        if (meta_dic['quality_code'][meta1[0]] == undefined) {
            meta1[0] = ''
        }
        else {
            meta1[0] = meta_dic['quality_code'][meta1[0]]// replaces quality code with quality id
        }
        id_qms_a = id_qms_a_split[0] + 'aa' + id_qms_a_split[1] + 'aa' + id_qms_a_split[2]
        val1.push(meta1[0] + 'aa' + meta1[1] + 'aa' + meta1[2])

        if (val1[counter1] != id_qms_a) {
            bad_meta_counter += 1
        }
        counter1 = counter1+1
    }
    if (bad_meta_counter == Object.keys(master_values).length) {
        bad_meta = true
    }

    for (val in master_values) {
        if (bad_meta == true) {
            var arr=[]
            for (entry in val1){arr.push('')}
            val1 = arr

            id_qms_a = ''
        }

        //else {
        //    meta1 = val.split("aa");
        //
        //    if (id_qms != 'not_cuahsi') {
        //
        //        if (id_qms_a_split[0] == '') {
        //            meta1[0] = ''
        //        }
        //        if (id_qms_a_split[1] == '') {
        //            meta1[1] = ''
        //        }
        //        if (id_qms_a_split[2] == '') {
        //            meta1[2] = ''
        //        }
        //    }
        //    if (meta_dic['quality_code'][meta1[0]] == undefined) {
        //        meta1[0] = ''
        //        //id_qms_a_split[0]=''
        //    }
        //    else {
        //        meta1[0] = meta_dic['quality_code'][meta1[0]]
        //    }
        //    id_qms_a = id_qms_a_split[0] + 'aa' + id_qms_a_split[1] + 'aa' + id_qms_a_split[2]
        //    val1 = meta1[0] + 'aa' + meta1[1] + 'aa' + meta1[2]
        //    id_qms_a_split = id_qms.split('aa')
        //}
        //console.log(counter)
        //console.log(val1)
        //console.log(id_qms_a)
        //console.log(val1[counter])
        //console.log(val)
        if (id_qms_a == val1[counter] || id_qms_a == 'not_cuahsi') {
            m_xval = []
            m_yval = []
            length_master = length_master + 1
            master_id.push(val)
            meta = val.split("aa");
            code = meta_dic['quality_code'][meta[0]]
            quality = meta_dic['quality'][code]
            quality_code = [meta[0]]
            method = meta_dic['method'][meta[1]]
            sourcedescription = meta_dic['source'][meta[2]]
            organization = meta_dic['organization'][meta[2]]
            m_yval = master_times[val]
            boxplot = master_boxplot[val]
            mean = master_stat[val][0]
            median = master_stat[val][1]
            max = master_stat[val][2]
            min = master_stat[val][3]
            m_xval = master_values[val]
            count = m_xval.length
            var site_name = json.site_name
            var variable_name = json.variable_name
            var unit = json.units
            var datatype = json.datatype
            var valuetype = json.valuetype
            var samplemedium = json.samplemedium
            var timesupport = json.timesupport
            var timeunit = json.timeunit
            var boxplot_count = number
            if (site_name == null) {
                site_name = "N/A"
            }
            if (variable_name == null) {
                variable_name = "N/A"
            }
            if (organization == null) {
                organization = "N/A"
            }
            if (quality == null) {
                quality = "N/A"
            }
            if (method == null) {
                method = "N/A"
            }
            if (datatype == null) {
                datatype = "N/A"
            }
            if (valuetype == null) {
                valuetype = "N/A"
            }
            if (unit == null) {
                unit = 'N/A'
            }
            if (timesupport == null) {
                timesupport = "N/A"
            }
            if (timeunit == null || timeunit == ' ') {
                timeunit = "N/A"
            }
            if (sourcedescription == null) {
                sourcedescription = "N/A"
            }
            if (samplemedium == null) {
                samplemedium = "N/A"
            }
            if (units != null) {
                units = units.replace(/\s+/g, '==');//removes any spaces in the units
            }
            var unit_off_bool = false
            unit_tracker.push(units);//tracks the units of the different time series
            unit_different2 = null;
            same_unit = 1//goes to 2 when more than one unit type is graphed
            yaxis = 0 //tracks which dataset set goes on which axis
            var y_title = null;//tracks which variable to use for the yaxis title
            test = []
            for (i = 0; i < m_xval.length; i++)//formats values and times for the graph
            {
                temp_date = new Date(m_yval[i])
                test.push(temp_date)
                actual_date = temp_date.getTimezoneOffset()*1000*60+temp_date.getTime()
                xtime.push({x:actual_date , y: m_xval[i]})
            }
            data1 = xtime
            if (unit_off == '') //unit_off stores the unit being turned off if there are more than 2 unit types
            {
                unit1 = unit_tracker[0];
                if (unit1 == units) {
                    y_title = 0
                }
                if (unit1 != units)//checks the first unit type agaisnt the current unit
                {
                    same_unit = 2;//flags which axis is to be used
                    y_title = 1
                    if (unit2 == null) {
                        unit2 = units //this tracks the second unit type if there is one
                    }
                    if (units != unit2) {
                        same_unit = 3
                        y_title = 3
                    }
                }
            }
            else {
                y_title = 3
                unit_off_bool = true
                if (units != unit_off) {
                    if (units == unit1) {
                        y_title = 0
                        unit_off_bool = false
                    }
                    else if (resid_on == res_id) {
                        y_title = 1
                        unit_off_bool = false
                    }
                }
            }
            if (y_title == 0) {//sets the y-axis title and graphs data on primary axis
                if (max > ymax) {
                    ymax = max
                }
                if (min < ymin) {
                    ymin = min
                }
                var newSeries =
                {
                    //type: "scatter",
                    type: "line",
                    axisYType: "primary",
                    //axisYType:"secondary",
                    xValueType: "dateTime",
                    xValueFormatString: "MMM DD, YYYY: HH:mm",
                    showInLegend: false,
                    indexLabelFontSize: 1,
                    visible: true,
                    name: 'Site: ' + site_name + ' <br/> Variable: ' + json.variable_name + '<br/> Value: ',
                    dataPoints: data1
                };
                chart.options.axisY.title = json.variable_name + ' (' + json.units + ')'
                chart.options.axisY.titleWrap = true
                chart.options.data.push(newSeries);
                if (ymax == 0 && ymin == 0) {
                    ymax = 4.5, ymin = 0
                }
                grid_values = gridlines(ymax,ymin)
                chart.options.axisY.viewportMaximum = grid_values.maxview
                chart.options.axisY.maximum = grid_values.maxview
                chart.options.axisY.viewportMinimum = grid_values.minview
                chart.options.axisY.minimum = grid_values.minview
                chart.options.axisY.interval = grid_values.interval
            }
            else if (y_title == 1) {//sets the y-axis 2 title and flags that the data is graphed on the secondary axis
                if (max > y2max) {
                    y2max = max
                }
                if (min < y2min) {
                    y2min = min
                }
                var newSeries =
                {
                    type: "line",
                    //axisYType:"primary",
                    axisYType: "secondary",
                    xValueType: "dateTime",
                    xValueFormatString: "MMM DD, YYYY: HH:mm",
                    showInLegend: false,
                    indexLabelFontSize: 1,
                    visible: true,
                    name: 'Site: ' + site_name + ' <br/> Variable: ' + json.variable_name + '<br/> Value: ',
                    dataPoints: data1
                };
                chart.options.axisY2.title = json.variable_name + ' (' + json.units + ')'
                chart.options.axisY2.titleWrap = true
                chart.options.data.push(newSeries);
                if (y2max == 0 && y2min == 0) {
                    y2max = 4.5, y2min = 0
                }
                grid_values = gridlines(y2max,y2min)
                chart.options.axisY2.viewportMaximum = grid_values.maxview
                chart.options.axisY2.viewportMinimum = grid_values.minview
                chart.options.axisY2.interval = grid_values.interval
                chart.options.axisY2.maximum = grid_values.maxview
                chart.options.axisY2.minimum = grid_values.minview
            }
            else if (y_title == 3) {//sets the y-axis 2 title and flags that data should not be visible
                var newSeries =
                {
                    type: "line",
                    //axisYType:"primary",
                    axisYType: "primary",
                    xValueType: "dateTime",
                    showInLegend: false,
                    indexLabelFontSize: 1,
                    visible: false,
                    name: 'Site: ' + site_name + ' <br/> Variable: ' + json.variable_name + '<br/> Value: ',
                    dataPoints: data1
                };
                chart.options.data.push(newSeries);
            }
            chart.options.axisY.titleFontSize = 15
            chart.options.axisY2.titleFontSize = 15
            chart.options.axisX.titleFontSize = 15
            xtime = []

            if ((unit1 != units && unit2 != units) || unit_off_bool == true)//this triggers if more than 2 different units are used
            {
                var legend = "<div style='text-align:center'><input class = 'checkbox' id =" + number + " name =" + units + " data-resid =" + res_id
                    + " type='checkbox' onClick ='myFunc(this.id,this.name);' >" + "</div"
                $('#multiple_units').html("")
                $('#multiple_units').append('* Only two types of units are displayed at a time.');
                title = 1
                var chart = $("#chartContainer").CanvasJSChart()
            }
            else {
                var legend = "<div style='text-align:center' '><input class = 'checkbox' id =" + number + " name =" + units + " data-resid =" + res_id
                    + " type='checkbox' onClick ='myFunc(this.id,this.name);'checked = 'checked'>" + "</div>"
                var chart = $("#chartContainer").CanvasJSChart()
                title=0
            }

            if (quality == "N/A") {
                quality_title = "N/A"
            }
            else {
                quality_title = quality //string representing the contents of the tooltip
                if (quality.length > 20) {
                    quality = '(' + quality_code + ') ' + quality.substring(0, quality.indexOf(' ') + 1) + '...'
                }
            }
            var dataset = {
                legend: legend,
                number: number,
                organization: organization,
                name: site_name,
                variable: variable_name,
                unit: unit,
                samplemedium: samplemedium,
                count: count,
                //download:download,
                quality: quality,
                method: method,
                datatype: datatype,
                valuetype: valuetype,
                timesupport: timesupport,
                timeunit: timeunit,
                sourcedescription: sourcedescription,
                mean: mean,
                median: median,
                max: max,
                min: min,
                boxplot: boxplot,
                boxplot_count: boxplot_count
            }
            var table = $('#data_table').DataTable();//defines the primary table
            table.row.add(dataset).draw();//adds data from the time series to the primary table
            chart.render();//updated chart with new values
            number = number + 1;
        }
        counter =counter+1
    }
    //    end of looping through timeseries

    if (end_of_resources == true )//checks to see if all the data is loaded before displaying
    {
        if (title == 1) {
            //chart.setTitle({ text: "CUAHSI Data Series Viewer*" });
            chart.options.title.text = "CUAHSI Data Series Viewer*"
            chart.render();
        }
        else {
            //chart.setTitle({ text: "CUAHSI Data Series Viewer" });
            chart.options.title.text = "CUAHSI Data Series Viewer"
            chart.render();
        }
        $('#data_table tbody tr:eq(0) td:eq(1)').click()
        $('#data_table tbody tr:eq(0) td:eq(1)').click()
        for (i = 0; i < number; i++) {
            $('#data_table tbody tr:eq(' + i + ') td:eq(1)').click()
            $('#data_table tbody tr:eq(' + i + ') td:eq(1)').click()
        }
        finishloading();
    }
}
function gridlines(ymax,ymin){
    console.log(ymax)
    console.log(ymin)

    maxview = roundUp(Math.ceil(ymax))
    maxview = maxview + 0.1 * maxview

    minview = roundDown(Math.floor(ymin))
    minview = minview + minview * .1

    interval = Math.ceil(maxview - minview) / 11
    console.log(maxview)
    console.log(minview)
    console.log(interval)

    if (minview < 0) {
        console.log(minview/interval)
        neg_interval = Math.ceil(-1*(minview/interval))
        //pos1_interval = Math.ceil(maxview/interval)
        pos_interval = 11-neg_interval


        if (ymax> pos_interval*interval)//checks to make sure points are in view range
        {
            interval = Math.ceil(maxview/interval)*interval
        }
        if (ymin<minview){
            interval = Math.ceil(-1*minview/interval)*interval
        }

        maxview = pos_interval*interval
        minview = -1*neg_interval*interval
        console.log(maxview)
        console.log(minview)
        //while(maxview <ymax){
        //
        //}
    }
    else {
        interval = (maxview - minview) / 11
        minview = (Math.ceil((minview / interval)) * interval)
    }
    console.log(maxview)
    console.log(minview)
    console.log(interval)

    if (maxview <ymax || minview>ymin){
       interval = Math.ceil(maxview - minview) / 11
    }
    return {'maxview':maxview,'minview':minview,'interval':interval}
}