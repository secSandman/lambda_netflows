
// CloudWatch Filter
// [version, account, eni, source, destination, srcport, destport="*", protocol="*", packets, bytes, windowstart, windowend, action="ACCEPT", flowlogstatus]

    'use strict';
    var AWS = require('aws-sdk');
    const zlib = require('zlib');
    var sns = new AWS.SNS({apiVersion: '2010-03-31'});
    var ec2 = new AWS.EC2();

    exports.handler = (event, context, callback) => {
    // TODO implement
    callback(null, 'Hello from Lambda');
    
    const payload = new Buffer(event.awslogs.data, 'base64');
    var privips = ['204.2.134','0','10','100.64','127','169.254','172.16','192','192.0.0.9','192.0.0.170','192.0.0.171','192.0.2','192.31.196','192.52.193','192.88.99','192.168','192.175.48','198.18','198.51.100','203.0.113'];
    var interNets = ['172.31.1', '172.31.2','172.31.44'];
    var badports = [20,21,22];
    var srcIpFromFlow = [];
    var srcPortFromFlow = [];
    var destIpFromFlow= [];
           
    function logEvents(parsed){
        let a = parsed.logEvents;
        var indexSrc = 0; 
        
        a.forEach(function(element){
            
        let srcIp = {
            srcIP: element.extractedFields.source,
            eventIndex: indexSrc
        }
        
    
        let srcPort = {
            srcPrt: element.extractedFields.srcport,
            eventIndex: indexSrc
        }
        
        let DestIp = {
            destIP: element.extractedFields.destination,
            eventIndex: indexSrc
        }
        
        subSrcIpToArray(srcIp,interNets);
        subSrcPortToArray(srcPort,badports);
        subDestIpToArray(DestIp,privips);
        
        indexSrc = indexSrc + 1;
        });
    }

   function subSrcIpToArray(srcIp,interNets){
    let i = 0;
    for (i; i < Object.keys(interNets).length; i++ ) {
        var iplen = interNets[i].length; 
        var trimmedString = srcIp.srcIP.substring(0,iplen);
        if(trimmedString == interNets[i]){
            srcIpFromFlow.push(srcIp.eventIndex);
            break;
        }
        else{continue;}
        }
    }
    
    function subSrcPortToArray(srcPort,interNets){
    let i = 0;
    for (i; i < Object.keys(badports).length; i++ ) {
        if(srcPort.srcPrt == badports[i]){
            srcPortFromFlow.push(srcPort.eventIndex);
            break;
        }
        else{continue;}
        }
    } 
    
    function subDestIpToArray(DestIp,privips){
    let i = 0;
    for (i; i < Object.keys(privips).length; i++ ) {
        var iplen = privips[i].length;
        var trimmedString = DestIp.destIP.substring(0,iplen);
        if(trimmedString !== privips[i]){
            destIpFromFlow.push(DestIp.eventIndex);
            break;
        }
        else{continue;}
        }
    }
    
    

function diffArray(object) {
  var R1 = [];
  //R1 will contain anything unique in arr1
  R1 = object.array1.filter(function(elem) {
    return object.array2.indexOf(elem) > -1;
  });
  return R1;
}



    unZip(payload);
      function unZip(payload) {
        zlib.gunzip(payload, (err, res) => {
        if (err) {
            return callback(err);
        }
        const parsed = JSON.parse(res.toString('utf8'));
        logEvents(parsed);
        
        let setAB = {
            array1: srcIpFromFlow,
            array2: srcPortFromFlow
        }
        
        let setBC = {
            array1: diffArray(setAB),
            array2: destIpFromFlow
        }
        
        let setD = diffArray(setBC);

        setD.forEach(function(element) {
            let snsObj = parsed.logEvents[element];
            snsnotice(snsObj)
        });
    })};
    
        function snsnotice(snsObj){
         const data = {
               "default": JSON.stringify(snsObj) 
            };
 
          var smsparams = {
          Message: JSON.stringify(data),
          MessageStructure: 'json',
          Subject: 'Potential data loss',
          TargetArn: '<Your SNS TPOIC ARN'
          };
          
          sns.publish(smsparams, function(err, data) {
          if (err) console.log(err, err.stack); // an error occurred
          else     console.log(data);           // successful response
          });
    }          
};

