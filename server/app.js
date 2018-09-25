'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const app = express();

app.use(bodyParser.json());

var lastmarkupAddId = 0;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Load the AWS SDK for Node.js
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient({region: 'us-west-2'});
const s3 = new AWS.S3();

var request = require('request');
app.get('/api/token', getToken);
app.get('/api/uploadtoken', getUploadToken);

function getScopedToken(res, params) {
  request.post('https://developer.api.autodesk.com/authentication/v1/authenticate',
    { form: params },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var authResponse = JSON.parse(body);
        res.send(authResponse);
      }
      else {
        console.log("Token error: ");
        if (response && response.statusCode) {
          console.log (response.statusCode);
        }
      }
    }
  );
}

function getToken(req, res) {

  var params = {
    client_id: process.env.FORGE_CLIENT_ID,
    client_secret: process.env.FORGE_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'data:read'
  }
  getScopedToken(res, params);
};

function getUploadToken(req, res) {

  var params = {
    client_id: process.env.FORGE_CLIENT_ID,
    client_secret: process.env.FORGE_CLIENT_SECRET,
    grant_type: 'client_credentials',
    scope: 'data:read data:write bucket:read bucket:create'
  }
  getScopedToken(res, params);
};

const forge = require('forge-apis')

// gets oauth token from Forge API
const oAuth2TwoLegged = new forge.AuthClientTwoLegged(
	'LMphbKbO3mUF7cuuy3Fc4zozNC5sPLS',
	'Kv2yCP9ERU1sC6Y',
	['viewables:read'])

// The browser will ask for a fresh Access Token as a javascript file
app.get('/js/init.js', (req, res) => {
	oAuth2TwoLegged.authenticate().then( function(restoken) {
		res.send(` 
			options = {
				accessToken: "${restoken.access_token}",
				env: "AutodeskProduction",
				urn: "urn:dXJuOmFc2sub2JqZWN0czpvcy5vYmplY3Q6bWVydGVubG1waGJrYm8zbXd1ZjdjdXV5M2ZjNHpvem5jNXNwbHMvQURDLUFBQS1YLWNlbnRyYWwucnZ0"
			};
		`);
		console.log(`Sent ForgeToken: ${restoken.access_token}`);
	});
})




// Check if database has changed.  If not, don't use GET /allMsgs to reduce throttling
app.get('/lastAddDelete', (req, res) => {
		res.send(`{"lastAddId":${lastmarkupAddId},"lastDeleteId":0}`);	
});



// Get all msg's from DynamoDB
app.get('/allMsgs', (req, res) => {
	let params = {
		TableName: "markupdb",
		Limit: 1000
	};

	if (req.query.creator) {
		params.FilterExpression = `#cr = :creator`;
		params.ExpressionAttributeNames = { "#cr": "creator"};
    	params.ExpressionAttributeValues= {":creator": req.query.creator,};
    }

	if (req.query.urn) {
		params.FilterExpression = `#urn = :urn`;
		params.ExpressionAttributeNames = { "#urn": "urn"};
    	params.ExpressionAttributeValues= {":urn": req.query.urn,};
    }

	docClient.scan(params, function(err, data){
		if (err) {
			res.send(`${err}`);
		}else{
			let out = JSON.stringify(data);
			res.send(`${out}`);
		}
	});
})



// Post Msg to dynamoDB
app.post('/msg', (req, res) => {
	let params = {
		Item: req.body,
		TableName: "markupdb",
	}
	
	//add unique ID, if not specified
	if (!params.Item.markupId) 
		params.Item.markupId = Math.round( 1000*(Date.now()+Math.random(1)) ); 

	lastmarkupAddId = params.Item.markupId;

	let niceDayTime = new Date().toISOString().
	  replace(/T/, ' ').      // replace T with a space
	  replace(/\..+/, '');

	params.Item.dateTime = niceDayTime;

	docClient.put( params, (err, data) => {
		if (err) {
			res.status(400).send(`${err}`); return;
		}
		res.send(`${params.Item.markupId}`);
	});
});



// Get signed upload url from AWS. Use it to upload a jpg to an S3 bucket.
app.get('/getimageDrop', (req, res) => {
	const url = s3.getSignedUrl('putObject', {
	    Bucket: 'vrokit2',
	    ContentType:'image/jpg',
	    ACL: 'public-read',
	    Key: `${req.query.markupId}.jpg`,
	    Expires: 6000,
	});
	res.status(200).send(`${url}`);
});
// example:  to upload 'inputFile.png', first get the dropUrl, then use http.PUT to upload the inputFile.png to the dropURL.
//   curl https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/getimageDrop?markupId=1234
//   curl -X PUT '${responseUrl}' -H 'Content-Type:image/png' --data-binary '@inputFile.png' 




// Delete up to 25 items at a time.
// input: array of key items to delete '[1,2,3,4,5,6]'
app.post('/deleteItems', (req, res) => {
	let items = req.body;
	let params = {
		RequestItems: { "markupdb": [] }
	}

	items.map(item => {
		var nitem = { DeleteRequest: { Key: {markupId:item} } };
		params.RequestItems.markupdb.push(nitem);
	});

	docClient.batchWrite( params, (err, data) => {
		if (err) { res.status(400).send(JSON.stringify(`${err}`)); return; } res.send(data); 
	});
})



// handle static files
app.use(express.static(__dirname + '/../www'));

//app.listen(3000); // <-- uncomment this line for local debugging, then type: >node app.js

module.exports = app


/*
Post a new markup
curl -H "Content-Type: application/json" -X POST -d '{"markupId":"9", "title":"mymessage", "type":"RFI", "creator":"alice"}' https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg
*/
