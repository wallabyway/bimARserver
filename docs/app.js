var viewer;

var DBURL = 'https://uyb0241cs8.execute-api.us-west-2.amazonaws.com/vrock';
var lastAddId = -1;

// Vue.js components
window.app = new Vue({
  el: "#app",
  data: {
    styleIcon: {
      backgroundPosition:0,
      borderRadius:"20px"
    },
    name: '',
    item: {
      title:"myTitle",
      description:"myDesc",
      markupId:0,
      type:0,
    },
    itemIsVisible:false,
    Items: [ { title: 'loading...', url:"" }]
  },
  methods: {
    onPointClick: function (itemIndex) {
      this.itemIsVisible = true;
      this.item = this.Items[itemIndex-1];
      const types = ["Issue", "BIMIQ_Hazard", "RFI", "BIMIQ_Warning"];
      var iconpos = types.indexOf(this.item.type)*28;
      this.styleIcon.backgroundPosition = `${iconpos}px`;
      this.styleIcon.borderRadius = (this.item.type == "RFI") ? "3px" : "20px";
      //this.styleIcon.height = (this.item.description.length/2 + 25) + "px";
    },

    cardClick: function (point) {
      if (!viewer) return;
      var offset = viewer.model.getData().globalOffset;
      var pt = new THREE.Vector3(point.x, point.y, point.z).sub(offset);
      var cam = new THREE.Vector3().add(point.cameraPosition).sub(offset);
      viewer.autocam.goToView({
        "position": cam,
        "up":new THREE.Vector3(0,0,1),
        "center": pt,
        "pivot": pt,
        "fov":20,
        "worldUp":new THREE.Vector3(0,0,1),
        "isOrtho":false
      });
      this.itemIsVisible = false;
    },

    pollDataChange: function() {
        fetch(`${DBURL}/lastAddDelete`).then(r => r.json()).then( data=> {
            if (data.lastAddId != lastAddId) {
                lastAddId = data.lastAddId;
                this.loadData(data.Items);
            }
        });
    },

    loadData: function() {
      // new data!  Fetch and refresh the list and pointCloud
      fetch(`${DBURL}/allMsgs`).then(r => r.json()).then( data=> {
          this.Items = data.Items;
          //post message to pointCloud listener
          window.dispatchEvent(new CustomEvent('newData', {'detail': data}));
      })
    }
  },
  computed: {
    sortedIssues() {
      return this.Items
        .filter((a)=> {return (a.type=="Issue") })
        .sort((a, b) => { return b.markupId - a.markupId;});
    },
    sortedRFIs() {
      return this.Items
        .filter((a)=> {return (a.type=="RFI") })
        .sort((a, b) => { return b.markupId - a.markupId;});
    }, 
    sortedHazardWarnings() {
      return this.Items
        .filter((a)=> { return ((a.type=="BIMIQ_Hazard") || (a.type=="BIMIQ_Warning"))})
        .sort((a, b) => { return b.markupId - a.markupId;});
    },
    sheetViews() {
      return [{title:"2D sheet",urn:"wAyDxQGBgsFAgwJChgOCxQJCQwEAwT"},
              {title:"3D sheet",urn:"dfsAyDxQGBgsFAgwJChgOCxQJCQwEAwT"}];
    },
    showAlert() {
     return this.name.length > 4 ? true : false;
    }
}
})

app.loadData();

setInterval(function(){
  app.pollDataChange();
}.bind(this),8000);

window.addEventListener("onPointClick", function(e){
    app.onPointClick( e.detail );
}, false);


function initializeViewer() {
  var viewerApp;

  if (options)
        options.useADP=false;

  function onLoadSuccess() {
    var viewables = viewerApp.bubble.search({ 'type': 'geometry' });
    if (!viewables.length) return;
    viewerApp.selectItem(viewables[0].data);

    //load extension    
    viewer = viewerApp.getCurrentViewer();
    viewer.loadExtension("markup3d");
    viewer.setQualityLevel(true,true); //AO on, FXAA on
    viewer.setOptimizeNavigation(true);
    setTimeout(function(){
        viewer.impl.toggleGroundShadow(true);
        viewer.impl.toggleGroundReflection(true);
        viewer.restoreState(viewStates["home"]);
        //document.getElementsByClassName('viewcubeUI')[0].remove()
    },6000);
  };

  function onInitialized() {
    viewerApp = new Autodesk.Viewing.ViewingApplication('forgeViewer');
    viewerApp.registerViewer( viewerApp.k3D, Autodesk.Viewing.Private.GuiViewer3D );  
    viewerApp.loadDocument( options.urn, onLoadSuccess);
  };

  Autodesk.Viewing.Initializer( options, onInitialized);
}

var viewStates = {
    "home":
        {"seedURN":"dXJuOmFkc2sub2JqZWN0czpvcy5vYmplY3Q6Y2Fkc3VyZmVybG1waGJrYm8zbXd1ZjdjdXV5M2ZjNHpvem5jNXNwbHMvQURDLUFBQS1YLWNlbnRyYWwtbm9zbGFiLnJ2dA","objectSet":[{"id":[],"isolated":[],"hidden":[],"explodeScale":0,"idType":"lmv"}],"viewport":{"name":"","eye":[-14.364430552565317,-89.80644709304724,13.659321641315],"target":[-6.654233210711232,-95.85547279333575,7.028926100556107],"up":[0.4408792788926684,-0.34589128792715296,0.8282419202015654],"worldUpVector":[0,0,1],"pivotPoint":[9.70328140258789,-108.736312866211,-6.99766027927399],"distanceToOrbit":36.936453710977844,"aspectRatio":1.8683473389355743,"projection":"perspective","isOrthographic":false,"fieldOfView":20},"renderOptions":{"environment":"Boardwalk","ambientOcclusion":{"enabled":true,"radius":13.123359580052492,"intensity":1},"toneMap":{"method":1,"exposure":-7,"lightMultiplier":-1e-20},"appearance":{"ghostHidden":true,"ambientShadow":true,"antiAliasing":true,"progressiveDisplay":false,"swapBlackAndWhite":false,"displayLines":true,"displayPoints":true}},"cutplanes":[]},
}

