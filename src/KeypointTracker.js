(function() {

  /**
   * KeypointTracker utility.
   * @constructor
   * @extends {tracking.Tracker}
   */
  tracking.KeypointTracker = function(template) {
    tracking.KeypointTracker.base(this, 'constructor');
    var R = [[1, 0, 0],[0, 1, 0],[0, 0, 1]]; 
    var t = [0, 0, 0];
    this.previousPose_ = {R: R, t: t};
    this.template_ = template;
  };

  tracking.inherits(tracking.KeypointTracker, tracking.Tracker);

  tracking.KeypointTracker.prototype.cameraMatrix = null;

  tracking.KeypointTracker.prototype.estimatePose = function(keypointMatches) {
    return tracking.EPnP.solve(keypointMatches.objectKeypoints, keypointMatches.imageKeypoints, this.getCameraMatrix());
  };

  tracking.KeypointTracker.prototype.backproject_ = function(projectedObjectKeypoints) {
    
    return this.template_.backproject(projectedObjectKeypoints);
  };

  tracking.KeypointTracker.prototype.extractKeypoints = function(imageData, width, height) {
    var instance = this;

    instance.templateImageData_ = instance.template_.update(instance.previousPose_);

    instance.grayscaleTemplate_ = tracking.Image.grayscale(instance.templateImageData_, width, height);
    var projectedObjectKeypoints = tracking.Fast.findCorners(instance.grayscaleTemplate_, width, height);
    var objectKeypoints = instance.backproject_(projectedObjectKeypoints);

    instance.templateKeyPoints_ = {projectedObjectKeypoints: projectedObjectKeypoints, objectKeypoints: objectKeypoints};

    instance.grayscaleImage_ = tracking.Image.grayscale(imageData, width, height);
    instance.imageKeypoints_ = tracking.Fast.findCorners(instance.grayscaleImage_, width, height);
  };

  tracking.KeypointTracker.prototype.getCameraMatrix = function() {
    var instance = this;

    if (!instance.cameraMatrix) {
      instance.cameraMatrix = new Float32Array([2868.4, 0, 1219.5, 0, 2872.1, 1591.7, 0, 0, 1]);
    }

    return instance.cameraMatrix;
  };

  tracking.KeypointTracker.prototype.matchKeypoints = function(width) {
    var instance = this;

    var descriptors1 = tracking.Brief.getDescriptors(instance.grayscaleTemplate_, width, instance.templateKeyPoints_.projectedObjectKeypoints);
    var descriptors2 = tracking.Brief.getDescriptors(instance.grayscaleImage_, width, instance.imageKeypoints_);

    var matches = tracking.Brief.match(instance.templateKeyPoints_.projectedObjectKeypoints, descriptors1, instance.imageKeypoints_, descriptors2);
    var matchingFrameKeypoints = [];
    for (var i = 0; i < instance.templateKeyPoints_.objectKeypoints.length; i++) {
      matchingFrameKeypoints.push(instance.imageKeypoints_[matches[i]]);
    }

    return {objectKeypoints: instance.templateKeyPoints_.objectKeypoints, imageKeypoints: matchingFrameKeypoints};
  };

  tracking.KeypointTracker.prototype.setCameraMatrix = function(cameraMatrix) {
    this.cameraMatrix = cameraMatrix;
  };

  tracking.KeypointTracker.prototype.track = function(pixels, width, height) {
    var instance = this;

    if (!this.template_.isReady()) {
      return;
    }

    instance.extractKeypoints(pixels, width, height);

    var matches = instance.matchKeypoints(width);

    if (matches.objectKeypoints.length === 0) {
      return;
    }

    instance.previousPose_ = instance.estimatePose(matches);
    return instance.previousPose_;

  };

}());
