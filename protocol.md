# Proxy Server - Issues API Protocol 

> A series of simple 'JSON' based commands based on vrokit website, to send and receive markup3D data from a cloud database (AWS DynamoDB)


- Protocol will be GET/POST 
 - for simplicity and 
 - more robust than web-sockets, in the event of constant disconnects (bad wifi connections)
- No authentication (yet),
- Long-polling used for real-time-'ness'
 - this is implemented on server
 - no change to regular client side http get requests

---

### > Five Markup3D commands...

## 1. Send new markup to server:

```
endpoint: https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg
IF TYPE == RFI
msg = 
{
"type": "RFI”, 
"title": "This is a issue Title"
"question": "what is this?",
"suggestedAnswer": "this is the suggested answer",
"creator": "@bealem",
"urn": "dXJuOmFkc2sub2...YWR2YW5jZWQucnZ0",
"archive": false,
"x": 0, "y": 0, "z": -12.924,
"img_url": "http://vrock.it/img/Issues.png",
"cameraOrientation": {
"x": 0, "y": 0, "z": 0, "w": 0
},
"cameraPosition": {
"x": 0, "y": 0, "z": 0
},
}

ELSE
msg = 
{
"type": "Issue"|“BIMIQ_Warning”|“BIMIQ_Hazard”, 
"title": "This is a issue Title"
"description": "and the issue description",

"creator": "@bealem",
"urn": "dXJuOmFkc2...2YW5jZWQucnZ0",
"archive": false,
"x": 0, "y": 0, "z": -12.924,
"img_url": "http://vrock.it/img/Issues.png",
"cameraOrientation": {
"x": 0, "y": 0, "z": 0, "w": 0
},
"cameraPosition": {
"x": 0, "y": 0, "z": 0
},

}

return markupId
```
example:  markupId = http.post( 'vrock.it/sendmsg', msg )


## 2. Send new image to server:

> This has changed... now use a signed URL 

post a json object containing a base64 encoded png file.  The markupId specifies the filename.



```
endpoint: vrock.it/sendimage
BODY:
{"markupId":1237, "base64String":"iVBORw...."}
RESPONSE:
https://s3.amazonaws.com/vrokit/tmp/{markupId}.png

Notice that the encoded string has the  "data:image/png;base64,iVBORw..." preamble removed.

```


## 3.Query all markup:
msg = http.get( 'vrock.it/allMsgs' )


```
GET: https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/allMsgs
response msg =
[{ markupId:'uuid1', x:0, y:0, z:0, etc...},
{ markupId:'uuid2', x:0, y:0, z:0, etc...},
...
]
```

## 4.Delete markup from database:

// Delete up to 25 items at a time.
// input: array of key items to delete '[1,2,3,4,5,6]'

```
endpoint: vrock.it/deleteItems
msg = [ uuid1, uuid2 ]
```

example:   http.post( 'vrock.it/deleteItems',  [1,2,3] )



## 5.Get last add or delete markupId 
// What is the last markupId added or deleted to the table.  use this to detect a recent change for polling efficiency
// input: array of key items to delete '[1,2,3,4,5,6]'
```
endpoint: vrock.it/lastAddDelete
response:
{"lastAddId":345,"lastDeleteId":0}
```
