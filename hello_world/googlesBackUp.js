var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var doc = new GoogleSpreadsheet('1OVoSmZ_WSM2q9iyR2Cdrgd37dmSI5vbx9mCop2yBIXc');
var sheet;


exports.handler=function (event,context,callback)
{
    return obtainFeedJira(callback);



};




var developers=["enrique.melgarejo","felipe.hermosilla","jose.colman","andrea.forneron","luis.encina","jaqueline.probst","miguel.godoy","jorge.vallejos","ignacio.rojas","christian.benitez","juan.talavera"];
//var developers=["enrique.melgarejo","felipe.hermosilla"];
//obtainFeedJira();

function testDate()
{
    var moment=require('moment');
    var a = moment().subtract(1,'day');
    var b = moment();


}




function obtainDateBetween()
{

    var moment = require("moment");
    var a = moment().subtract('2','day').startOf('day');
    var b = moment().endOf('day').endOf('day');


    return "BETWEEN+"+a+"+"+b;


}

function obtainFeedJira(callback) {


    var uris=[];
    developers.forEach(function (v,i,f)
    {


        var name=v;
        var uri="https://jira.tigo.com.hn/activity?streams=user+IS+"+name+"&amp;streams=update-date+"+obtainDateBetween()+"&amp;os_authType=basic&amp;maxResults=50";
        uris.push({uri:uri,name:name});

    });

    console.log(uris);
    async.each(uris,function (obj,callback)
    {
        var r=require("request");
        var headers= {
            "Authorization":"Basic ZW5yaXF1ZS5tZWxnYXJlam86Y29uanVyYTcwMA=="
        };

        r({headers:headers,url:obj.uri,method:"GET"}, function(err,data,body)
        {

            if (err)
            {
                callback(err)

            }
            else {


                var jsonData = parserXml(body);

                if (jsonData["feed"]["entry"] != null) {
                    var entriesInDate = jsonData["feed"]["entry"].filter(function (entry) {

                        return isInBetweenDate(entry);

                    });
                    console.log("tickets" + obj.name + "[" + entriesInDate.length + "]")

                   //   console.log(JSON.stringify(entriesInDate));
                   //   callback();
                    createGoogleSheet(entriesInDate, obj.name, callback);

                }
                else
                {
                    callback();
                }
            }

        });

    },function (error) {
        if (error) {
            console.log("[FeedJIRA] " + error.toLocaleString());
            var response = {
                "statusCode": 200,
                "headers": {
                    "my_header": "my_value"
                },
                "body": JSON.stringify({"status":"ERRROR","error":error.toLocaleString()}),
                "isBase64Encoded": false
            };
            callback(error,response);
        }
        else {
            console.log("FINALIZANDO");
            console.log("[FEEDJIRA] NO ERROR");

            var response = {
                "statusCode": 200,
                "headers": {
                    "my_header": "my_value"
                },
                "body": JSON.stringify({"status":"NO ERROR"}),
                "isBase64Encoded": false
            };
            callback(null,response);
        }
    });

}

function createGoogleSheet(entries,name,callback)
{

    console.log("waterfall init for name:" + name);
    async.waterfall([

            function setAuth(step) {
                var creds = require('./JiraActivities-0db1f01c320f.json');
                doc.useServiceAccountAuth(creds, step);
            },
            function infoDoc(step) {
                doc.getInfo(function (err, info) {
                    console.log('Loaded doc: ' + info.title + ' by ' + info.author.email);
                    sheet = info.worksheets;
                    step(null);
                });
            },
            checkAllSheet.bind(null,{name:name}),
            createSheet.bind(null,{entries:entries,name:name}),
            insertInSummarySheet.bind(null,{entries:entries,name:name})
        ],
        function (error,results){
            if (error)
            {
                console.log("Waterfall [Error]" + error.toString());
                callback(error.toLocaleString());
            }
            else
            {
                console.log("finish waterfall for " + name)
                callback();
            }
        });


}

function insertInSummarySheet(ctx,step)
{

    var sheetByUser=sheet.filter(function (v,i,s){
        return v.title=="Summary";
    });


    async.each(ctx.entries, function (ent, cb) {
        console.log(JSON.stringify(ent));
        var objToPersist = transform(ent);
        objToPersist["User"] = ctx.name;
        sheetByUser[0].addRow(objToPersist, function (err, result) {
            if (err) {
                console.log("error escribiendo " + err.toString());
                cb(err);

            }
            else {
                cb();
            }

        });
    }, function (err) {
        console.log("[[[[[[[EACH FINISH]]]]]]");
        if (err) step(err);
        else
            step(null);


    });



}

function checkAllSheet(ctx,step)
{
    console.log("checking" + JSON.stringify(ctx));
    var flagCreateSheet=true;
    doc.getInfo(function (err,info){
    if (err) step(err);

        info.worksheets.forEach(function (v,i,t){

            if (v.title ==ctx.name )
            {
                flagCreateSheet=false;

            }

        });

        step(null,flagCreateSheet);
    });


}
function createSheet(ctx,toCreate,step)
{
    if (toCreate) {
        doc.addWorksheet({
            "title": ctx.name,
            "rowCount": ctx.entries.length > 0 ? ctx.entries.length : 2,
            "headers": ["User", "Summary", "Description", "Link","Updated"]
        }, function (err, worksheet) {
            if (err) {
                console.log("error " + err)
                step("error");
            }
            else {
                console.log(JSON.stringify(worksheet));
                addEntriesToWorkSheet(worksheet,ctx.entries,ctx.name);
                step(null);
            }

        });

    }
    else {

        console.log("variable sheet" + sheet)
        var sheetByUser=sheet.filter(function (v,i,s){
            return v.title==ctx.name;
        });
       if (sheetByUser && sheetByUser.length>0) {
           async.each(ctx.entries, function (ent, cb) {
               var objToPersist = transform(ent);
               objToPersist["User"] = ctx.name;
               sheetByUser[0].addRow(objToPersist, function (err, result) {
                   if (err) {
                       console.log("error escribiendo " + err.toString());
                       cb(err);

                   }
                   else {
                       cb();
                   }

               });
           }, function (err) {
                   console.log("[[[[[[[EACH FINISH]]]]]]");
                   if (err) step(err);
                   else
                       step(null);


               });

       }
       else
       {
           step(null);
       }

    }

}

function addEntriesToWorkSheet(worksheet,entries,name)
{
    entries.forEach(function (v,i,s){
        var objToPersist=transform(v);
        objToPersist["User"]=name;
        worksheet.addRow(objToPersist,function (err,result){
            if (err)
            {
                console.log("imposible crear registro");
            }

        })
    })
}

function transform(entry)
{
    var obj={};
    obj["Link"]=entry["link"][0]["$"]["href"];;
    obj["Updated"]=entry["updated"][0];
    if (entry["activity:object"][0].hasOwnProperty("summary"))
    {
        obj["Summary"]=entry["activity:object"][0]["summary"][0]["_"];
    }
    else
    if (entry.hasOwnProperty("activity:target"))
    {

        obj["Summary"]=entry["activity:target"][0]["summary"][0]["_"];


    }
    return obj;

}


function isInBetweenDate(entry)
{
    var moment = require("moment");
    var a = moment().subtract('2','day').startOf('day');
    var b = moment().endOf('day').endOf('day');
    var time=entry.updated[0];
    time=moment(time).utcOffset(time);
    return time.isBetween(a,b);
}

function parserXml(feed)
{
    var xml2js=require("xml2js");
    var parser=new xml2js.Parser();
    var dataJSON="";
    parser.parseString(feed, function (err,data)
    {
        dataJSON=data;

    });
    return dataJSON;
}
