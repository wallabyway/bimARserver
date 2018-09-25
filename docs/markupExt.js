// MarkupExt.js
function markup3d(viewer, options) {
    Autodesk.Viewing.Extension.call(this, viewer, options);

    this.scale = 
    this.particleCount = 20;
    this.size = 50.0;
    this.particles;
    this.msgs = [];
    this.raycaster = new THREE.Raycaster;
    this.scene = viewer.impl.sceneAfter;
    this.cursor = new THREE.Object3D( 0, 0, 0 );
    this.mouse = {x:0, y:0, button:0};
	this.raycaster = new THREE.Raycaster();
	this.camera = viewer.impl.camera;
	this.raycaster.params.PointCloud.threshold = 0.3;


    this.vertexShader = `
        uniform float size;
        varying vec3 vColor;

        void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
            gl_PointSize = size * ( size / (length(mvPosition.xyz) + 25.0) );
            gl_Position = projectionMatrix * mvPosition;
        }
	`

    this.fragmentShader = `
        uniform sampler2D tex;
        varying vec3 vColor;
        void main() {
            gl_FragColor = vec4( vColor.x, vColor.x, vColor.x, 1.0 );
            gl_FragColor = gl_FragColor * texture2D(tex, vec2((gl_PointCoord.x+vColor.y*1.0)/4.0, 1.0-gl_PointCoord.y));
            if (gl_FragColor.w < 0.5) discard;
        }
	`

}

markup3d.prototype = Object.create(Autodesk.Viewing.Extension.prototype);
markup3d.prototype.constructor = markup3d;

// on mouse move event, check if ray hit with pointcloud, move selection cursor
// https://stackoverflow.com/questions/28209645/raycasting-involving-individual-points-in-a-three-js-pointcloud
markup3d.prototype.updateHoverCursor = function(event) {
    if (!this.particles) return;
    var x = ( event.clientX / window.innerWidth ) * 2 - 1;
    var y =  - ( event.clientY / window.innerHeight ) * 2 + 1;
    var vector = new THREE.Vector3( x, y, 0.5 ).unproject(this.camera);
    this.raycaster.set(this.camera.position, vector.sub(this.camera.position).normalize());
    var nodes = this.raycaster.intersectObject( this.particles );
    if (this.selectedIndex) {
        this.geometry.colors[this.selectedIndex-1].r = 1.0;
        this.geometry.colorsNeedUpdate = true;
        viewer.impl.invalidate(true);
    }

    this.selectedIndex = (nodes.length == 0) ? 0 : (nodes[0].index + 1);
    if (this.selectedIndex) {
        this.geometry.colors[this.selectedIndex-1].r = 2.0;
    }
}

markup3d.prototype.load = function() {

    this.initPointCloud = function() {
        if (this.particles) 
            this.scene.remove(this.particles);
        else {
            // load the spriteSheet of textures
            var texture = THREE.ImageUtils.loadTexture("img/Issues.png");
            this.material = new THREE.ShaderMaterial({
                vertexColors: THREE.VertexColors,
                fragmentShader: this.fragmentShader,
                vertexShader: this.vertexShader,
                depthWrite: false,
                depthTest: false,
                uniforms: {
                    size: { type: "f", value: this.size },
                    tex: { type: "t", value: texture }
                }
            });
        }
        var offset = viewer.model.getData().globalOffset;
        this.particles = new THREE.PointCloud(this.geometry, this.material);
        this.particles.position.sub( offset );
        this.scene.add(this.particles);
    }


// Load new DataPoints via Event Message
    this.addMarkup = function(data) {
        this.msgs = data;
        this.geometry = new THREE.Geometry();
        const types = ["Issue", "BIMIQ_Warning", "RFI", "BIMIQ_Hazard"];

        data.map(item => {
            point = (new THREE.Vector3(item.x, item.y, item.z));
            this.geometry.vertices.push(point);
            var type = types.indexOf(item.type);
            this.geometry.colors.push(new THREE.Color(1.0,type,0));
        });
        this.initPointCloud();
    };

    var self = this;    
    window.addEventListener("newData", function(e){
        self.addMarkup(e.detail.Items)
    }, false);



// Mouse Event handlers
// Dispatch Message when a point is clicked
    this.addMouseListeners = function() {
        function onDocumentMouseMove( event ) {
            if (event.button !== 0) return;
            self.updateHoverCursor(event);
        }
        function onDocumentMouseClick() {
            if (!self.selectedIndex) return;
            window.dispatchEvent(new CustomEvent('onPointClick', {'detail': self.selectedIndex}));
            viewer.clearSelection();
        }
        function onDocumentTouchClick( t ) {
            self.updateHoverCursor( t.changedTouches[0] );
            onDocumentMouseClick();
        }
        document.addEventListener( 'click', onDocumentMouseClick, false );
        document.addEventListener( 'mousemove', onDocumentMouseMove, false );
        document.addEventListener( 'touchend', onDocumentTouchClick, false );
    }
    this.addMouseListeners();    
    return true;
};

markup3d.prototype.unload = function() {
    return true;
};

Autodesk.Viewing.theExtensionManager.registerExtension('markup3d', markup3d);