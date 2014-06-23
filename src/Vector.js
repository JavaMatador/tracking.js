(function() {
  /**
   * Vector utility.
   * @static
   * @constructor
   */
  tracking.Vector = function (obj) {
    var instance = this,
      matrix = obj.matrix,
      dimension = obj.dimension;

    if (matrix) {
      dimension = matrix._rows;
    }
    else if (dimension) {
      matrix = new tracking.Matrix({rows: dimension, cols: 1});
    }
    instance._matrix = matrix;
    instance._dimension = dimension;
  };

  tracking.Vector.prototype.squaredNorm = function() {
    var matrix = this._matrix;

    return matrix.transpose().multiply(matrix).data[0][0];
  };

  tracking.Vector.prototype.norm = function() {
    return Math.sqrt(this.squaredNorm());
  };
}());