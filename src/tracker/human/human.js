(function (window, undefined) {

    tracking.type.HUMAN = {

        NAME: 'HUMAN',

        data: {},

        defaults: {
            blockSize: 20,

            blockJump: 5,

            blockScale: 1.25,

            data: 'frontal_face',

            minNeighborArea: 0.5,

            minNeighbors: 3
        },

        evalStage_: function(stage, integralImage, integralImageSquare, i, j, width, height, blockSize) {
            var instance = this,
                defaults = instance.defaults,
                stageIndex = stage[0],
                stageThreshold = stage[1],
                tree = stage[2],
                treeLen = tree.length,
                t,

                inverseArea = 1.0/(blockSize*blockSize),
                scale = blockSize/defaults.blockSize,

                stageSum = 0;

            for (t = 0; t < treeLen; t++) {
                var node = tree[t],
                    nodeLen = node.length,

                    nodeThreshold = node[nodeLen-3],
                    left = node[nodeLen-2],
                    right = node[nodeLen-1],

                    total,
                    totalSquare,
                    mean,
                    variance,

                    wb1 = i*width + j,
                    wb2 = i*width + (j + blockSize),
                    wb3 = (i + blockSize)*width + j,
                    wb4 = (i + blockSize)*width + (j + blockSize),

                    rectsSum = 0,
                    rectsLen = (nodeLen - 3)/5,
                    r,
                    x1, y1, x2, y2, rectWidth, rectHeight, rectWeight, w1, w2, w3, w4;

                total = integralImage[wb1] - integralImage[wb2] - integralImage[wb3] + integralImage[wb4];
                totalSquare = integralImageSquare[wb1] - integralImageSquare[wb2] - integralImageSquare[wb3] + integralImageSquare[wb4];
                mean = total*inverseArea;
                variance = totalSquare*inverseArea - mean*mean;

                if (variance > 1) {
                    variance = Math.sqrt(variance);
                }
                else {
                    variance = 1;
                }

                for (r = 0; r < rectsLen; r++) {
                     x1 = j + ~~(node[r*5]*scale);
                     y1 = i + ~~(node[r*5 + 1]*scale);
                     rectWidth = ~~(node[r*5 + 2]*scale);
                     rectHeight = ~~(node[r*5 + 3]*scale);
                     rectWeight = node[r*5 + 4];

                     x2 = x1 + rectWidth;
                     y2 = y1 + rectHeight;

                     w1 = y1*width + x1;
                     w2 = y1*width + x2;
                     w3 = y2*width + x1;
                     w4 = y2*width + x2;

                     rectsSum += (integralImage[w1] - integralImage[w2] - integralImage[w3] + integralImage[w4])*rectWeight;
                }

                if (rectsSum*inverseArea < nodeThreshold*variance) {
                    stageSum += left;
                }
                else {
                    stageSum += right;
                }
            }

            return (stageSum > stageThreshold);
        },

        merge_: function(rects, video) {
            var instance = this,
                defaults = instance.defaults,
                minNeighborArea = defaults.minNeighborArea,
                minNeighbors = defaults.minNeighbors,
                rectsLen = rects.length,
                i,
                j,
                x1,
                y1,
                blockSize1,
                x2,
                y2,
                x3,
                y3,
                x4,
                y4,
                blockSize2,
                px1,
                py1,
                px2,
                py2,
                pArea,
                group = 0,
                importantGroupCounter;
                importantGroups = {},
                faces = [];

            for (i = 0; i < rectsLen; i+=4) {
                x1 = rects[i + 0];
                y1 = rects[i + 1];
                blockSize1 = rects[i + 2];

                x2 = x1 + blockSize1;
                y2 = y1 + blockSize1;

                if (rects[i + 3]) {
                    continue;
                }

                group++;
                importantGroupCounter = 0;

                for (j = 0; j < rectsLen; j+=4) {
                    if (i === j && rects[j + 3]) {
                        continue;
                    }

                    x3 = rects[j + 0];
                    y3 = rects[j + 1];
                    blockSize2 = rects[j + 2];

                    x4 = x3 + blockSize2;
                    y4 = y3 + blockSize2;

                    px1 = Math.max(x1, x3);
                    py1 = Math.max(y1, y3);

                    px2 = Math.min(x2, x4);
                    py2 = Math.min(y2, y4);

                    pArea = Math.abs(px1 - px2)*Math.abs(py1 - py2);

                    video.canvas.context.strokeStyle = "rgb(0,255,0)";
                    video.canvas.context.strokeRect(px1, py1, Math.abs(px1 - px2), Math.abs(py1 - py2));

                    if ((pArea/(blockSize1*blockSize1) >= minNeighborArea) &&
                        (pArea/(blockSize2*blockSize2) >= minNeighborArea)) {

                        rects[i + 3] = group;
                        rects[j + 3] = group;
                        importantGroupCounter++;

                        if (importantGroupCounter >= minNeighbors) {
                            importantGroups[group] = importantGroupCounter;
                        }
                    }
                }
            }

            var groups = {}, counter = 0, x1Result = 0, y1Result = 0, x2Result = 0, y2Result = 0;

            for (i = 0; i < rectsLen; i+=4) {
                group = rects[i + 3];

                if (importantGroups[group]) {
                    for (j = 0; j < rectsLen; j+=4) {

                    }
                }
            }

            return faces;
        },

        track: function(trackerGroup, video) {
            var instance = this,
                config = trackerGroup[0],
                defaults = instance.defaults,
                imageData = video.getVideoCanvasImageData(),
                canvas = video.canvas,
                height = canvas.get('height'),
                width = canvas.get('width'),
                integralImage = new Uint32Array(width*height),
                integralImageSquare = new Uint32Array(width*height),

                imageLen = 0,
                g,

                stages = instance.data[config.data || defaults.data],
                stagesLen = stages.length,
                s,
                pixel,
                pixelSum = 0,
                pixelSumSquare = 0;

            canvas.forEach(imageData, function(r, g, b, a, w, i, j) {
                pixel = ~~(r*0.299 + b*0.587 + g*0.114);

                if (i === 0 & j === 0) {
                    pixelSum = pixel;
                    pixelSumSquare = pixel*pixel;
                }
                else if (i === 0) {
                    pixelSum = pixel + integralImage[i*width + (j - 1)];
                    pixelSumSquare = pixel*pixel + integralImageSquare[i*width + (j - 1)];
                }
                else if (j === 0) {
                    pixelSum = pixel + integralImage[(i - 1)*width + j];
                    pixelSumSquare = pixel*pixel + integralImageSquare[(i - 1)*width + j];
                }
                else {
                    pixelSum = pixel + integralImage[i*width + (j - 1)] + integralImage[(i - 1)*width + j] - integralImage[(i - 1)*width + (j - 1)];
                    pixelSumSquare = pixel*pixel + integralImageSquare[i*width + (j - 1)] + integralImageSquare[(i - 1)*width + j] - integralImageSquare[(i - 1)*width + (j - 1)];
                }

                integralImage[imageLen] = pixelSum;
                integralImageSquare[imageLen] = pixelSumSquare;
                imageLen++;
            });

            var i,
                j,
                blockJump = defaults.blockJump,
                blockScale = defaults.blockScale,
                blockSize = defaults.blockSize,
                maxBlockSize = Math.min(width, height),
                rectIndex = 0,
                rects = [];

            for (; blockSize <= maxBlockSize; blockSize = ~~(blockSize*blockScale)) {
                for (i = 0; i < (height - blockSize); i+=blockJump) {
                    for (j = 0; j < (width - blockSize); j+=blockJump) {
                        var pass = true;

                        for (s = 0; s < stagesLen; s++) {
                            var stage = stages[s];

                            pass = instance.evalStage_(stage, integralImage, integralImageSquare, i, j, width, height, blockSize);

                            if (!pass) {
                                break;
                            }
                        }

                        if (pass) {
                            rects[rectIndex++] = j;
                            rects[rectIndex++] = i;
                            rects[rectIndex++] = blockSize;
                            rects[rectIndex++] = 0;

                            console.log('ROSTO');
                            // canvas.setImageData(imageData);
                            canvas.context.strokeStyle = "rgb(255,0,0)";
                            canvas.context.strokeRect(j, i, blockSize, blockSize);
                        }
                    }
                }
            }

            // console.log(rects);

            var faces = instance.merge_(rects, video);

            // console.log(faces);
        }

    };

}( window ));