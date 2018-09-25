#testing AWS-Lambda endpoint's and dynamoDB
echo 'send 3 markups: issue, issueBIMwarning, RFI'
curl -H "Content-Type: application/json" -X POST -d '{"x":0,"y":0,"z":0, "message":"type0 is issue. point at origin", "type":0, "archive":false, "data":"{username:\"bealem\"}" }' https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg
curl -H "Content-Type: application/json" -X POST -d '{"x":1,"y":0,"z":0, "message":"type1 is issue-warning. point at 1,0,0", "type":1, "archive":false, "data":"{username:\"bealem\"}" }' https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg
curl -H "Content-Type: application/json" -X POST -d '{"x":1,"y":1,"z":0, "message":"type2 is RFI. point at 1,1,0", "type":2, "archive":false, "data":"{username:\"bealem\"}" }' https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg


echo 'get all messages'
curl https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/allMsgs


echo 'open landing page'
open https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/index.html


echo 'write new markup, with custom markupId'
curl -H "Content-Type: application/json" -X POST -d '{"markupId":24, "x":1,"y":1,"z":0, "message":"type2 is RFI. point at 1,1,0", "type":2, "archive":false, "data":"{username:\"bealem\"}" }' https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg

echo 'update existing markupId, but set to archive'
curl -H "Content-Type: application/json" -X POST -d '{"markupId":24, "x":1,"y":1,"z":0, "message":"type2 is RFI. point at 1,1,0", "type":2, "archive":true, "data":"{username:\"bealem\"}" }' https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock/msg
