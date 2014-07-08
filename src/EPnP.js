(function() {
  /**
   * EPnP utility.
   * @static
   * @constructor
   */
  tracking.ePnP = {};

  tracking.ePnP.estimatePose = function(cameraIntrisicParameters, keypointMatches) {
    var controlPoints = [],
        projecterControlPoints = [];

    cameraIntrisicParameters = new tracking.Matrix({matrix: cameraIntrisicParameters});

    for (var i = 0; i < 4; ++i) {
      var keypointMatch = keypointMatches.pop();
      projecterControlPoints.push(keypointMatch.frameKeypoint);
      controlPoints.push(keypointMatch.templateKeypoint);
    }

    var M = this.createHomogeneousSystem(cameraIntrisicParameters, controlPoints, projecterControlPoints, keypointMatches);

// console.log('M', M.toString());
// console.log('v0\n', controlPoints[0].toString(), 'v1\n', controlPoints[1].toString(), 'v2\n', controlPoints[2].toString(), 'v3\n', controlPoints[3].toString());
  var homogeneousSystemSolution = this.oneDimesionalKernel(M.transpose().multiply(M), controlPoints);
  var data = homogeneousSystemSolution._matrix.data;
  for (var j = 0; j < 4; j++) {
    var cameraCoordinatesControlPoint = new tracking.Matrix({matrix: [data[j*3], data[j*3+1], data[j*3+2]]});
    console.log('projected:\n', cameraIntrisicParameters.multiply(cameraCoordinatesControlPoint).toString());
  }
  };

  tracking.ePnP.findNullEigenVectors = function(matrix) {
    var SVD = numeric.svd(matrix.data);
    var U = SVD.U;
    var vectorTemp;
    var eigenVectors = [];

    for (var i = 0; i < U[0].length; i++) {
      vectorTemp = [];
      for (var j = 0; j < U.length; j++) {
        vectorTemp.push(U[j][i]);
      }
      eigenVectors.push(new tracking.Vector(vectorTemp));
    }

    return eigenVectors;
  };

  tracking.ePnP.oneDimesionalKernel = function (matrix, controlPoints) {
    // console.log(matrix.toString());
    var eigenVectors = tracking.ePnP.findNullEigenVectors(matrix),
        // eigenVector = tracking.ePnP.findNullEigenVectors(matrix)[0],
        dividend = 0,
        divisor = 0;
      // console.log('eigenVectors\n', eigenVectors);
    // console.log('v0\n', vectors[0].toString(), 'v1\n', vectors[1].toString(), 'v2\n', vectors[2].toString(), 'v3\n', vectors[3].toString());
    for (var k = 8; k < 12; k++) {
      var eigenVector = eigenVectors[k];
      var eigenVectorData = eigenVector._matrix.data;
      var v0 = new tracking.Vector([[eigenVectorData[0]],[eigenVectorData[1]],[eigenVectorData[2]]]);
      var v1 = new tracking.Vector([[eigenVectorData[3]],[eigenVectorData[4]],[eigenVectorData[5]]]);
      var v2 = new tracking.Vector([[eigenVectorData[6]],[eigenVectorData[7]],[eigenVectorData[8]]]);
      var v3 = new tracking.Vector([[eigenVectorData[9]],[eigenVectorData[10]],[eigenVectorData[11]]]);
      var vectors = [v0, v1, v2, v3];
// console.log('v0\n', vectors[0].toString(), 'v1\n', vectors[1].toString(), 'v2\n', vectors[2].toString(), 'v3\n', vectors[3].toString());
      dividend = 0;
      divisor = 0;
      for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 4; j++) {
          // console.log(k, '|v['+i+'] −v['+j+']|', tracking.Vector.subtract(vectors[i], vectors[j]).norm());
          dividend += tracking.Vector.subtract(vectors[i], vectors[j]).norm() * tracking.Vector.subtract(controlPoints[i], controlPoints[j]).norm();
          divisor += tracking.Vector.subtract(vectors[i], vectors[j]).squaredNorm();
        }//console.log('\n');
      }//console.log('\n');
    //   console.log('dividend/divisor:', dividend, '/', divisor, ' = ', dividend/divisor);
    console.log('eigenVectors['  + k + ']:\n', eigenVectors[k].multiply(dividend/divisor).toString());
    }
    return eigenVectors[10].multiply(dividend/divisor);

  };

  tracking.ePnP.findBarycentricCoordenates = function (point, controlPoints) {
    var T = new tracking.Matrix({rows: 3, cols: 3}),
        TData = T.data,
        controlPointsMatrix = [controlPoints[0]._matrix.data, controlPoints[1]._matrix.data, controlPoints[2]._matrix.data, controlPoints[3]._matrix.data],
        result;

    for (var i = 0; i < 3; i++) {
      for (var j = 0; j < 3; j++) {
        TData[j][i] = controlPointsMatrix[i][j][0] - controlPointsMatrix[3][j][0];
        // console.log('zs', controlPointsMatrix[i][j][0], controlPointsMatrix[3][j][0]);
      }
    }

    // console.log('T', T.toString());
    T = T.invert3by3();
    // console.log('-T', T.toString());
    result = T.multiply(tracking.Vector.subtract(point, controlPoints[3])._matrix).data;
// console.log('findBarycentricCoordenates', [result[0][0], result[1][0], result[2][0], 1 - result[0][0] - result[1][0] - result[2][0]]);
    return [result[0][0], result[1][0], result[2][0], 1 - result[0][0] - result[1][0] - result[2][0]];
  };

  tracking.ePnP.createHomogeneousSystem = function (cameraIntrisicParameters, controlPoints, projecterControlPoints, keypointMatches) {
    var numKeypoints = keypointMatches.length,
        fu = cameraIntrisicParameters.data[0][0],
        fv = cameraIntrisicParameters.data[1][1],
        uc = cameraIntrisicParameters.data[0][2],
        vc = cameraIntrisicParameters.data[1][2],
        M = new tracking.Matrix({rows: 2*numKeypoints, cols: 12}),
        MData = M.data,
        barycentricCoordenates,
        deltaU,
        deltaV;

    for (var i = 0; i < keypointMatches.length; i++) {
      barycentricCoordenates = this.findBarycentricCoordenates(keypointMatches[i].templateKeypoint, controlPoints);
      deltaU = uc - keypointMatches[i].frameKeypoint._matrix.data[0];
      deltaV = vc - keypointMatches[i].frameKeypoint._matrix.data[1];
      for (var j = 0; j < 4; j++) {
        MData[2*i][3*j] = barycentricCoordenates[j] * fu;
        MData[2*i][3*j+1] = 0;
        MData[2*i][3*j+2] = barycentricCoordenates[j] * deltaU;

        MData[2*i+1][3*j] = 0;
        MData[2*i+1][3*j+1] = barycentricCoordenates[j] * fv;
        MData[2*i+1][3*j+2] = barycentricCoordenates[j] * deltaV;
      }
    }
// console.log('M', M.toString());
    return M;
  };
}());






















