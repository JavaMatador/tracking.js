(function() {
  /**
   * EPnp utility.
   * @static
   * @constructor
   */
  tracking.ePnP = {};

  tracking.ePnP.estimatePose = function(cameraIntrisicParameters, keypointMatches) {
    
  };

  tracking.ePnP.findNullEigenVector = function(matrix) {
    var reducedMatrix = matrix.reducedRowEchelon().matrix,
        eigenVectors = [];

    eigenVectors.push(new Matrix({
      matrix: [reducedMatrix[0][11], reducedMatrix[1][11], reducedMatrix[2][11], reducedMatrix[3][11],
        reducedMatrix[4][11], reducedMatrix[5][11], reducedMatrix[6][11], reducedMatrix[7][11],
        reducedMatrix[8][11], reducedMatrix[9][11], reducedMatrix[10][11], 1
      ]
    }).transpose());

    eigenVectors.push(new Matrix({
      matrix: [reducedMatrix[0][10], reducedMatrix[1][10], reducedMatrix[2][10], reducedMatrix[3][10],
        reducedMatrix[4][10], reducedMatrix[5][10], reducedMatrix[6][10], reducedMatrix[7][10],
        reducedMatrix[8][10], reducedMatrix[9][10], 1, 0
      ]
    }).transpose());

    eigenVectors.push(new Matrix({
      matrix: [reducedMatrix[0][9], reducedMatrix[1][9], reducedMatrix[2][9], reducedMatrix[3][9],
        reducedMatrix[4][9], reducedMatrix[5][9], reducedMatrix[6][9], reducedMatrix[7][9],
        reducedMatrix[8][9], 1, 0, 0
      ]
    }).transpose());

    eigenVectors.push(new Matrix({
      matrix: [reducedMatrix[0][8], reducedMatrix[1][8], reducedMatrix[2][8], reducedMatrix[3][8],
        reducedMatrix[4][8], reducedMatrix[5][8], reducedMatrix[6][8], reducedMatrix[7][8],
        1, 0, 0, 0
      ]
    }).transpose());

    return eigenVectors;
  };
}());