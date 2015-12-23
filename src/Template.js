(function() {

    /**
     * Template utility.
     * @constructor
     */
    tracking.Template = function(meshPath, texturePath, width, height) {
        var instance = this,
            renderer = new THREE.WebGLRenderer({
                antialias: true
            }),
            camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR),
            loader = new THREE.JSONLoader();

        instance.pixelsData_ = new Uint8Array(width * height * 4);

        var VIEW_ANGLE = 45,
            ASPECT = width / height,
            NEAR = 1,
            FAR = 10000;

        renderer.setSize(width, height);

        document.getElementById('template').appendChild(renderer.domElement);

        camera.position.set(0, 100, 300);
        camera.rotation.x = -Math.PI / 12;

        loader.load(meshPath, function(geometry, materials) {
            instance.texturedScene_ = instance.createTexturedScene(camera, geometry, texturePath);
            instance.depthMapScene_ = instance.createDepthMapScene(camera, geometry);
        });

        instance.renderer_ = renderer;
        instance.camera_ = camera;
        instance.width_ = width;
        instance.height_ = height;
    };

    tracking.Template.prototype.isReady = function() {
      if (this.texturedScene_ && this.depthMapScene_) {
        return true;
      }
      return false;
    };

    tracking.Template.prototype.createTexturedScene = function(camera, geometry, texturePath) {
        var textureLoader = new THREE.TextureLoader(),
            scene = new THREE.Scene(),
            light = new THREE.DirectionalLight(0xffffff);

        scene.add(camera);

        light.position.set(0, 100, 60);

        scene.add(light);

        textureLoader.load(texturePath, function(texture) {
            var material = new THREE.MeshLambertMaterial({
                map: texture,
                colorAmbient: [0.480000026226044, 0.480000026226044, 0.480000026226044],
                colorDiffuse: [0.480000026226044, 0.480000026226044, 0.480000026226044],
                colorSpecular: [0.8999999761581421, 0.8999999761581421, 0.8999999761581421]
            });

            var mesh = new THREE.Mesh(
                geometry,
                material
            );
            scene.add(mesh);
        });

        return scene;
    };

    tracking.Template.prototype.createDepthMapScene = function(camera, geometry) {
        var instance = this,
            scene = new THREE.Scene(),
            mesh,
            shaderMaterial;

        scene.add(camera);

        shaderMaterial = new THREE.ShaderMaterial({
            vertexShader: instance.getVertexShader(),
            fragmentShader: instance.getFragmentShader(),
            transparent: true
        });

        mesh = new THREE.Mesh(
            geometry,
            shaderMaterial
        );

        scene.add(mesh);

        return scene;
    };

    tracking.Template.prototype.update = function(pose) {
        var instance = this;
        //     matrixWorldInverse = instance.camera_.matrixWorldInverse,
        //     R = pose.R,
        //     t = pose.t;

        // for (var i = 0; i < 3; i++) {
        //     for (var j = 0; j < 3; j++) {
        //         matrixWorldInverse.elements[i * 4 + j] = R[i * 3 + j];
        //     }
        //     matrixWorldInverse.elements[i * 4 + 3] = t[i];
        // }

        // matrixWorldInverse.elements[12] = 0;
        // matrixWorldInverse.elements[13] = 0;
        // matrixWorldInverse.elements[14] = 0;
        // matrixWorldInverse.elements[15] = 1;

        instance.renderer_.render(instance.texturedScene_, instance.camera_);
        var gl = instance.renderer_.getContext();
        gl.readPixels(0, 0, instance.width_, instance.height_, gl.RGBA, gl.UNSIGNED_BYTE, instance.pixelsData_);
        return instance.pixelsData_;
    };

    tracking.Template.prototype.colorTo3DPoint = function(R, G, B, a) {
      var M = 255.0/a,
          r = R / 255.0,
          g = G / 255.0,
          b = B / 255.0,
          cMin = Math.min(r, g, b),
          cMax = Math.max(r, g, b),
          cMed = r + g + b - cMax - cMin,
          pMin = M - cMax - 3,
          pMed = cMed - cMax + M - 4,
          pMax = 2 * M - cMax - 4,
          x,
          y,
          z;

          if (r < g && r < b) {
            x = pMin;
            if (g < b) {
              y = pMed;
              z = pMax;
            }
            else {
              z = pMed;
              y = pMax; 
            }
          } else if (g < b) {
            y = pMin;
            if (r < b) {
              x = pMed;
              z = pMax;
            }
            else {
              z = pMed;
              x = pMax; 
            }
          } else {
            z = pMin;
            if (r < g) {
              x = pMed;
              y = pMax;
            }
            else {
              y = pMed;
              x = pMax; 
            }
          }
      return [x, y, z];
    };

    tracking.Template.prototype.backproject = function(points) {
        var instance = this,
            pixels = new Uint8Array(instance.width_ * instance.height_ * 4),
            gl,
            result = [];

        instance.renderer_.render(instance.depthMapScene_, instance.camera_);
        gl = instance.renderer_.getContext();

        gl.readPixels(0, 0, instance.width_, instance.height_, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        for (var i = 0; i < points.length; i += 2) {
            var xi = points[i];
            var yi = points[i + 1];

            var R = pixels[(yi * instance.width_ + xi) * 4    ];
            var G = pixels[(yi * instance.width_ + xi) * 4 + 1];
            var B = pixels[(yi * instance.width_ + xi) * 4 + 2];
            var a = pixels[(yi * instance.width_ + xi) * 4 + 3];

            var point3D = instance.colorTo3DPoint(R, G, B, a);

            result.push(point3D);
        }

        return result;
    };

    tracking.Template.prototype.getVertexShader = function() {
        return 'varying vec3 vPosition;' + 
                'void main() {' +
                  'vPosition = position;' +
                  'gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);' +
                '}';
    };

    tracking.Template.prototype.getFragmentShader = function() {
        return 'varying vec3 vPosition;' +
              'void main() {' +
              '  float m = min(vPosition[0], min(vPosition[1], vPosition[2])) - 1.0;' +
              '  float M = max(vPosition[0], max(vPosition[1], vPosition[2])) - m;' +
              '  gl_FragColor = vec4((vPosition[0]-m)/M, (vPosition[1]-m)/M, (vPosition[2]-m)/M, 1.0/M);' +
              '}';
    };

}());




