from lxml import etree
import numpy
import requests
import time
from datetime import timedelta
from dateutil import parser
from django.http import HttpResponse
import urllib2
import urllib
from .app import TimeSeriesViewer
import csv
import zipfile
import StringIO
import time
import zipfile
import os
import dateutil.parser
from datetime import datetime
import pandas as pd
from hs_restclient import HydroShare
import controllers

def get_app_base_uri(request):
    base_url = request.build_absolute_uri()
    if "?" in base_url:
        base_url = base_url.split("?")[0]
    return base_url


def get_workspace():
    return TimeSeriesViewer.get_app_workspace().path
    #return app.get_app_workspace().path


def get_version(root):
    wml_version = None
    for element in root.iter():
        if '{http://www.opengis.net/waterml/2.0}Collection' in element.tag:
            wml_version = '2.0'
            break
        if '{http://www.cuahsi.org/waterML/1.1/}timeSeriesResponse' \
        or '{http://www.cuahsi.org/waterML/1.0/}timeSeriesResponse' in element.tag:
            wml_version = '1'
            break
    return wml_version

#drew 20150401 convert date string into datetime obj
# def time_str_to_datetime(t):
#     try:
#         t_datetime=parser.parse(t)
#         return t_datetime
#     except ValueError:
#         print "time_str_to_datetime error: "+ t
#         raise Exception("time_str_to_datetime error: "+ t)
#         return datetime.now()
#
#
# #drew 20150401 convert datetime obj into decimal second (epoch second)
# def time_to_int(t):
#     try:
#         d=parser.parse(t)
#         t_sec_str=d.strftime('%s')
#         return int(t_sec_str)
#     except ValueError:
#         print ("time_to_int error: "+ t)
#         raise Exception('time_to_int error: ' + t)


def parse_1_0_and_1_1(root):

    root_tag = root.tag.lower()

    # we only display the first 50000 values
    threshold = 50000000
    try:
        if 'timeseriesresponse' in root_tag or 'timeseries' in root_tag or "envelope" in root_tag or 'timeSeriesResponse' in root_tag:

            # lists to store the time-series data
            for_graph = []
            boxplot = []
            master_values={}
            meth_qual = []
            for_highchart = []
            for_canvas = []
            my_times = []
            my_values = []

            x_value = []
            y_value = []
            nodata = "-9999"  # default NoData value. The actual NoData value is read from the XML noDataValue tag
            timeunit=None
            sourcedescription = None
            timesupport =None
            # metadata items
            units, site_name, variable_name,quality,method, organization = None, None, None, None, None, None
            unit_is_set = False
            datatype = None
            valuetype = None
            samplemedium = None
            smallest_value = 0
            n = None
            v = None
            t= 0
            times =[]
            x = 'x'
            y = 'y'
            # iterate through xml document and read all values

            # print "parsing values from water ml"
            # print datetime.now()
            for element in root.iter():
                bracket_lock = -1
                if '}' in element.tag:

                    bracket_lock = element.tag.index('}')  # The namespace in the tag is enclosed in {}.
                    tag = element.tag[bracket_lock+1:]     # Takes only actual tag, no namespace


                    if 'value'!= tag:
                        # in the xml there is a unit for the value, then for time. just take the first

                        if 'unitName' == tag or 'units' ==tag or 'UnitName'==tag or 'unitCode'==tag:
                            if not unit_is_set:
                                units = element.text
                                unit_is_set = True
                        if 'noDataValue' == tag:
                            nodata = element.text
                        if 'siteName' == tag:
                            site_name = element.text
                        if 'variableName' == tag:
                            variable_name = element.text
                        if 'organization'==tag or 'Organization'==tag or'siteCode'==tag:
                            try:
                                organization = element.attrib['agencyCode']
                            except:
                                organization = element.text
                        if 'definition' == tag or 'qualifierDescription'==tag:
                            quality = element.text
                        if 'methodDescription' == tag or 'MethodDescription'==tag:
                            method = element.text
                        if 'dataType' == tag :
                            datatype = element.text
                        if 'valueType' == tag:
                            valuetype = element.text
                        if "sampleMedium" == tag:
                            samplemedium = element.text
                        if "timeSupport"== tag or"timeInterval" ==tag:
                            timesupport =element.text
                        if"unitName"== tag or "UnitName"==tag:
                            timeunit =element.text
                        if"sourceDescription"== tag or "SourceDescription"==tag:
                            sourcedescription =element.text

                    elif 'value' == tag:
                        # print element.attrib
                        try:
                            # my_times.append(element.attrib['dateTimeUTC'])
                            n = element.attrib['dateTimeUTC']
                        except:
                            # my_times.append(element.attrib['dateTime'])
                            n =element.attrib['dateTime']
                        try:
                            quality= element.attrib['qualityControlLevelCode']
                        except:
                            quality1 =''
                        try:
                            method = element.attrib['methodCode']
                        except:
                            method=''
                        # print quality
                        # print method

                        dic = quality +'aa'+method

                        # master_values['aaa'] = {}
                        # master_values['aaa']['value1']='hello'

                        # if dic not in master_values:
                        if dic not in meth_qual:
                            meth_qual.append(dic)
                            master_values.update({dic:{}})


                        v = element.text
                        # tii = pd.Timestamp(n).value/1000000#pandas convert string to time object
                        # tii = ti.value/1000000 #gets timestamp and convert time to milliseconds
                        # t =t*1000# This adds three extra zeros for correct formatting

                        if v == nodata:
                            value = None
                            # for_canvas.append({x:n,y:value})
                            # for_graph.append(value)
                            x_value.append(n)
                            y_value.append(value)

                        else:
                            # for_canvas.append({x:n,y:v})

                            v = float(element.text)
                            for_graph.append(v)
                            x_value.append(n)
                            y_value.append(v)

                        master_values[dic].update({n:v})

            # print "parse custom values !!!!!!!!!!!!!!!!!!!!!"
            # print datetime.now()
            # print master_values
            # print 'aaa'
            # print meth_qual
            # print x_value

            value_count = len(x_value)
            # largest_time = for_canvas[value_count - 1][0]
            # End of measuring the WaterML processing time...
            mean = numpy.mean(for_graph)
            mean = float(format(mean, '.2f'))
            median = float(format(numpy.median(for_graph), '.2f'))
            quar1 = float(format(numpy.percentile(for_graph,25), '.2f'))
            quar3 = float(format(numpy.percentile(for_graph,75), '.2f'))
            min1 = float(format(min(for_graph), '.2f'))
            max1 = float(format(max(for_graph), '.2f'))
            boxplot.append(1)
            boxplot.append(min1)#adding data for the boxplot
            boxplot.append(quar1)
            boxplot.append(median)
            boxplot.append(quar3)
            boxplot.append(max1)
            sd = numpy.std(for_graph)
            # print "parse end !!!!!!!!!!!!!!!!!!!!!"
            # print datetime.now()

            return {
                'site_name': site_name,
                # 'start_date': str(smallest_time),
                # 'end_date': str(largest_time),
                'variable_name': variable_name,
                'units': units,
                'wml_version': '1',
                # 'for_highchart': for_highchart,
                'for_canvas':for_canvas,
                'mean': mean,
                'median': median,
                'max':max1,
                'min':min1,
                'stdev': sd,
                'count': value_count,
                'organization': organization,
                'quality': quality,
                'method': method,
                'status': 'success',
                'datatype' :datatype,
                'valuetype' :valuetype,
                'samplemedium':samplemedium,
                'smallest_value':smallest_value,
                'timeunit':timeunit,
                'sourcedescription' :sourcedescription,
                'timesupport' : timesupport,
                'boxplot':boxplot,
                'xvalue':x_value,
                'yvalue':y_value,

            }
        else:
            parse_error = "Parsing error: The WaterML document doesn't appear to be a WaterML 1.0/1.1 time series"
            error_report("Parsing error: The WaterML document doesn't appear to be a WaterML 1.0/1.1 time series")
            print parse_error
            return {
                'status': parse_error
            }
    except Exception, e:
        data_error = "Parsing error: The Data in the Url, or in the request, was not correctly formatted for water ml 1."
        error_report("Parsing error: The Data in the Url, or in the request, was not correctly formatted.")
        print data_error
        print e
        return {
            'status': data_error
        }


def getResourceIDs(page_request):
    resource_string = page_request.GET['res_id']  # retrieves IDs from url
    resource_IDs = resource_string.split(',')  # splits IDs by commma
    return resource_IDs


def findZippedUrl(page_request, res_id):
    base_url = page_request.build_absolute_uri()
    if "?" in base_url:
        base_url = base_url.split("?")[0]
        zipped_url = base_url + "temp_waterml/" + res_id + ".xml"
        return zipped_url


def parse_2_0(root):
    print "running parse_2"
    try:
        if 'Collection' in root.tag:
            ts = etree.tostring(root)
            keys = []
            vals = []
            for_graph = []
            for_highchart=[]
            units, site_name, variable_name, latitude, longitude, method = None, None, None, None, None, None
            name_is_set = False
            variable_name = root[1].text
            organization = None
            quality = None
            method =None
            datatype = None
            valuetype = None
            samplemedium = None
            timeunit=None
            sourcedescription = None
            timesupport =None
            smallest_value = 0
            for element in root.iter():
                if 'MeasurementTVP' in element.tag:
                        for e in element:
                            if 'time' in e.tag:
                                keys.append(e.text)
                            if 'value' in e.tag:
                                vals.append(e.text)
                if 'uom' in element.tag:
                    units = element.text
                if 'MonitoringPoint' in element.tag:
                    for e in element.iter():
                        if 'name' in e.tag and not name_is_set:
                            site_name = e.text
                            name_is_set = True
                        if 'pos' in e.tag:
                            lat_long = e.text
                            lat_long = lat_long.split(' ')
                            latitude = lat_long[0]
                            longitude = lat_long[1]
                if 'observedProperty' in element.tag:
                    for a in element.attrib:
                        if 'title' in a:
                            variable_name = element.attrib[a]
                if 'ObservationProcess' in element.tag:
                    for e in element.iter():
                        if 'processType' in e.tag:
                            for a in e.attrib:
                                if 'title' in a:
                                    method=e.attrib[a]

                if 'organization' in element.tag:
                    organization = element.text

                if 'definition' in element.tag:
                    quality = element.text

                if 'methodDescription' in element.tag:
                    method = element.text
                if 'dataType' in element.tag:
                    datatype = element.text
                if 'valueType' in element.tag:
                    valuetype = element.text
                if "sampleMedium" in element.tag:
                    samplemedium = element.text
                if"timeSupport"in element.text:
                    timesupport =element.text
                if"unitName"in element.text:
                    timeunit =element.text
                if"sourceDescription"in element.text:
                    sourcedescription =element.text

            for i in range(0,len(keys)):
                time_str=keys[i]
                time_obj=time_str_to_datetime(time_str)

                if vals[i] == "-9999.0"or vals[i]=="-9999":
                    val_obj = None
                else:
                    val_obj=float(vals[i])

                item=[time_obj,val_obj]
                for_highchart.append(item)
            values = dict(zip(keys, vals))

            for k, v in values.items():
                t = time_to_int(k)
                for_graph.append({'x': t, 'y': float(v)})
            smallest_time = list(values.keys())[0]
            largest_time = list(values.keys())[0]
            for t in list(values.keys()):
                if t < smallest_time:
                    smallest_time = t
                if t> largest_time:
                    largest_time = t
            for v in list(values.vals()):
                if v < smallest_value:
                    smallest_value = t




            return {'time_series': ts,
                    'site_name': site_name,
                    'start_date': smallest_time,
                    'end_date':largest_time,
                    'variable_name': variable_name,
                    'units': units,
                    'values': values,
                    'wml_version': '2.0',
                    'latitude': latitude,
                    'longitude': longitude,
                    'for_highchart': for_highchart,
                    'organization':organization,
                    'quality':quality,
                    'method':method,
                    'status': 'success',
                    'datatype' :datatype,
                    'valuetype' :valuetype,
                    'samplemedium':samplemedium,
                    'smallest_value':smallest_value,
                    'timeunit':timeunit,
                    'sourcedescription' :sourcedescription,
                    'timesupport' : timesupport,
                    'values':vals
                    }
        else:
            print "Parsing error: The waterml document doesn't appear to be a WaterML 2.0 time series"
            error_report("Parsing error: The waterml document doesn't appear to be a WaterML 2.0 time series")
            return "Parsing error: The waterml document doesn't appear to be a WaterML 2.0 time series"
    except:
        print "Parsing error: The Data in the Url, or in the request, was not correctly formatted."
        error_report("Parsing error: The Data in the Url, or in the request, was not correctly formatted.")
        return "Parsing error: The Data in the Url, or in the request, was not correctly formatted."



def Original_Checker(xml_file):
    try:
        tree = etree.parse(xml_file)
        root = tree.getroot()
        wml_version = get_version(root)
        if wml_version == '1':
            return parse_1_0_and_1_1(root)
        elif wml_version == '2.0':
            return parse_2_0(root)
    except ValueError, e:
        error_report("xml parse error")
        return read_error_file(xml_file)
    except:
        error_report("xml parse error")
        return read_error_file(xml_file)

def read_error_file(xml_file):
    try:
        f = open(xml_file)
        return {'status': f.readline()}
    except:
        error_report('invalid WaterML file')
        return {'status': 'invalid WaterML file'}

def unzip_waterml(request, res_id,src,res_id2,xml_id):
    # print "unzip!!!!!!!"
    # print "unzipping"
    # print datetime.now()
    # this is where we'll unzip the waterML file to
    temp_dir = get_workspace()
    file_data =None
    # waterml_url = ''

    # get the URL of the remote zipped WaterML resource
    if not os.path.exists(temp_dir+"/id"):
        os.makedirs(temp_dir+"/id")

    if 'cuahsi'in src :
        # url_zip = 'http://bcc-hiswebclient.azurewebsites.net/CUAHSI/HydroClient/WaterOneFlowArchive/'+res_id+'/zip'
        url_zip = 'http://qa-webclient-solr.azurewebsites.net/CUAHSI/HydroClient/WaterOneFlowArchive/'+res_id+'/zip'
    elif 'hydroshare' in src:
        # url_zip = 'https://www.hydroshare.org/hsapi/_internal/'+res_id+'/download-refts-bag/'
        # hs = HydroShare()
        # hs.getResource(res_id)
        # z = zipfile.ZipFile(StringIO.StringIO(hs.content))
        # file_list = z.namelist()

        hs = controllers.getOAuthHS(request)
        file_path = get_workspace() + '/id'
        hs.getResource(res_id, destination=file_path, unzip=True)
        root_dir = file_path + '/' + res_id
        data_dir = root_dir + '/' + res_id + '/data/contents/'
        # f = open(data_dir)
        # print f.read()
        for subdir, dirs, files in os.walk(data_dir):
            for file in files:
                if  'wml_1_' in file:
                    data_file = data_dir + file
                    with open(data_file, 'r') as f:
                        # print f.read()
                        file_data = f.read()
                        f.close()
                        file_temp_name = temp_dir + '/id/' + res_id + '.xml'
                        file_temp = open(file_temp_name, 'wb')
                        file_temp.write(file_data)
                        file_temp.close()
    #
    # elif 'hydroshare_generic' in src:
    #     target_url =  'https://www.hydroshare.org/django_irods/download/'+res_id+'/data/contents/HIS_reference_timeseries.txt'
    #     data = urllib2.urlopen(target_url) # it's a file like object and works just like a file

    elif "xmlrest" in src:
        url_zip = res_id2
        res = urllib.unquote(res_id2).decode()
        r = requests.get(res, verify=False)
        file_data = r.content
        file_temp_name = temp_dir + '/id/'+xml_id+'.xml'
        file_temp = open(file_temp_name, 'wb')
        file_temp.write(file_data)
        file_temp.close()
    else:
        url_zip = 'http://' + request.META['HTTP_HOST'] + '/apps/data-cart/showfile/'+res_id


    if src != 'hydroshare_generic' and src != 'xmlrest' and src !='hydroshare':
        waterml_url = "test"
        # print "request start"
        # print datetime.now()
        r = requests.get(url_zip, verify=False)
        # r = urllib2.urlopen(url_zip)
        # print r
        # print r.read()
        # print StringIO.StringIO(r.read()).read()
        # print "request end"
        # print datetime.now()
        # print r
        try:
            # z = zipfile.ZipFile(StringIO.StringIO(r.read()))
            z = zipfile.ZipFile(StringIO.StringIO(r.content))
            file_list = z.namelist()
            # print "finished getting file list"
            # print datetime.now()
            try:
                for file in file_list:
                    if 'hydroshare' in src:
                        if 'wml_1_' in file:
                            file_data = z.read(file)
                            file_temp_name = temp_dir + '/id/' + res_id + '.xml'
                            file_temp = open(file_temp_name, 'wb')
                            file_temp.write(file_data)
                            file_temp.close()
                    else:
                        # print "Reading file"
                        # print datetime.now()
                        file_data = z.read(file)
                        # print "Finished reading file"
                        # print datetime.now()
                        file_temp_name = temp_dir + '/id/' + res_id + '.xml'
                        # print "Writing file"
                        # print datetime.now()
                        file_temp = open(file_temp_name, 'wb')
                        file_temp.write(file_data)
                        file_temp.close()
                        # print "Finished writing file"
                        # print datetime.now()
            # error handling

            # checks to see if data is an xml
            except etree.XMLSyntaxError as e:
                print "Error:Not XML"
                error_report("Error:Not XML")
                return False

            # checks to see if Url is valid
            except ValueError, e:
                error_report("Error:invalid Url")
                print "Error:invalid Url"
                return False

            # checks to see if xml is formatted correctly
            except TypeError, e:
                error_report("Error:string indices must be integers not str")
                print "Error:string indices must be integers not str"
                return False

        # check if the zip file is valid
        except zipfile.BadZipfile as e:
                error_message = "Bad Zip File"
                error_report(error_message)
                print "Bad Zip file"
                return False

    # finally we return the waterml_url
    # print "File created"
    # print datetime.now()
    # return waterml_url


# finds the waterML file path in the workspace folder
def waterml_file_path(res_id,xml_rest,xml_id):
    base_path = get_workspace()
    if xml_rest == True:
        file_path = base_path + "/id/"+xml_id #+ res_id
    else:
        file_path = base_path + "/id/"+ res_id

    if not file_path.endswith('.xml'):
        file_path += '.xml'
    return file_path


    return file_list
def error_report(text):
    temp_dir = get_workspace()
    temp_dir = temp_dir[:-24]
    file_temp_name = temp_dir + '/error_report.txt'
    file_temp = open(file_temp_name, 'a')
    time = datetime.now()
    time2 = time.strftime('%Y-%m-%d %H:%M')
    file_temp.write(time2+": "+text+"\n")
    file_temp.close()
def viewer_counter(request):
    temp_dir = get_workspace()
    try:
        hs = controllers.getOAuthHS(request)
        user =  hs.getUserInfo()
        user1 = user['username']
        print user1
    except:
        user1 =""

    if user1 != 'mbayles2':
        temp_dir = temp_dir[:-24]

        file_temp_name = temp_dir + '/view_counter.txt'
        if not os.path.exists(temp_dir+"/view_counter.txt"):
            file_temp = open(file_temp_name, 'a')
            first = '1'
            file_temp.write(first)
            file_temp.close()
        else:
            file_temp = open(file_temp_name, 'r+')
            content = file_temp.read()
            number = int(content)
            # time = datetime.now()
            # time2 = time.strftime('%Y-%m-%d %H:%M')
            number  = number +1
            number  = str(number)
            file_temp.seek(0)
            file_temp.write(number)
            file_temp.close()
    else:
        user1=''
# def xmlrest(res_id2)