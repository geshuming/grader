// Modified from lib/public/WebGLCurve

const VIEWPORT_SIZE = 600;

var min_x = Infinity;
var max_x = -Infinity;
var min_y = Infinity;
var max_y = -Infinity;

function generateCurve(scaleMode, drawMode, numPoints, func, isFullView){
    var curvePosArray = [];
    // var transMat = mat4.create();
    // initialize the min/max to extreme values
    

    function evaluator(num, func){
        // func should take input of [0, 1] and output pair(x, y)
        // where x,y is in [0, 1]
        // evaluator has a side effect of recording the max/min
        // x and y value for adjusting the position
        for(var i = 0; i <= num; i += 1){
            var value = func(i / num);
            if ((typeof value !== "object") || (value.length !== 2)
                || (typeof value[0] !== "number") || (typeof value[1] !== "number")) {
                throw "Expected a point, encountered " + value;
            }
            var x = value[0] * 2 - 1;
            var y = value[1] * 2 - 1;
            curvePosArray.push(x, y);
            min_x = Math.min(min_x, x);
            max_x = Math.max(max_x, x);
            min_y = Math.min(min_y, y);
            max_y = Math.max(max_y, y);
        }
        return curvePosArray;
    }

    return evaluator(numPoints, func);
  }

/* We stub in our own drawCurve to:
    improve performance
    Reduce dependencies on node implementations of webgl and canvas
    Let us do fuzzy matching based on the vertices alone
 */
//
function drawCurve(curvePosArray, resolution) {
  var curveBitmap = [];
  
  // Initialize curveBitMap to 2D array of 0's
  for (var x = 0; x < resolution; x++) {
    if (!curveBitmap[x]) {
      curveBitmap[x] = [];
    }
    for (var y = 0; y < resolution; y++) {
      curveBitmap[x][y] = 0;
    }
  }

  // Scale the (x, y) to fit the bitmap resolution
  const range_x = max_x - min_x;
  const range_y = max_y - min_y;
  console.log("range_x: " + range_x);
  console.log("range_y: " + range_y);

  // Scale the actual points to fit the bitmap resolution
  function approximate_point(x, y) {
    // The 2 if-else are for cases where there is no range of x or y to let us scale
    // e.g. unit_line_at(t)
    // As such, I am simply setting all negative points to 0 and points above 600 to 600.
    // Otherwise, scale the points based on the range_x and range_y
    var approx_x;
    var approx_y;
    if (range_x === 0) {
      approx_x = x < 0
        ? 0
        : x > 600
          ? 600
          : Math.round(x);
    } else {
      approx_x = Math.round(((x - min_x) / (range_x)) * (resolution - 1));
    }
    if (range_y === 0) {
      approx_y = y < 0
        ? 0
        : y > 600
          ? 600
          : Math.round(y);
    } else {
      approx_y = Math.round(((y - min_y) / (range_y)) * (resolution - 1));
    }
    return {
      x: approx_x,
      y: approx_y
    }
  }

  // For every point in curvePosArray, fill in corresponding pixel in curveBitmap with 1
  for (var i = 0; i < curvePosArray.length; i+=2) {
    var approx_point = approximate_point(curvePosArray[i], curvePosArray[i+1]);
    var approx_x = approx_point.x;
    var approx_y = approx_point.y;   
    console.log("approx_point: " + JSON.stringify(approx_point));
    curveBitmap[approx_x][approx_y] = 1;
  }
  return curveBitmap;
}

function draw_connected(num){
    return function(func){
        return generateCurve("none", "lines", num, func);
    }
}

function draw_points_on(num){
    return function(func){
        return generateCurve("none", "points", num, func);
    }
}

function draw_points_squeezed_to_window(num){
    return function(func){
        return generateCurve("fit", "points", num, func);
    }
}

function draw_connected_squeezed_to_window(num){
    return function(func){
        return generateCurve("fit", "lines", num, func);
    }
}

function draw_connected_full_view(num) {
    return function(func) {
        return generateCurve("stretch", "lines", num, func, true);
    }
}

function draw_connected_full_view_proportional(num) {
    return function(func) {
        return generateCurve("fit", "lines", num, func, true);
    }
}

function make_point(x, y){
    return [x, y];
}

function x_of(pt){
    return pt[0];
}

function y_of(pt){
    return pt[1];
}

// Checks the solution curve against the "drawn" curve and returns true/false
// Resolution: pixel height/width of bitmap
// Accuracy: fraction of pixels that need to match to be considered as passing
function __check_canvas(draw_mode, num_points, student_curve, solution_curve, 
  resolution=600, accuracy=0.99) {
    // if(solution_mode != stashed_draw_mode) {
    //   return false;
    // }
    
    // Load student's curve and solution's curve into respective bitmaps
    // Suggestion: Let generate_curve return the point_array of the input curve so we 
    // don't have to play with states as seen below.

    // Generate student_curve's bitmap and solution_curve's bitmap first
    // to get the same min/max_x/y for scaling points in point_array to the bitmap
    var student_point_array = draw_mode(num_points)(student_curve);
    var solution_point_array = draw_mode(num_points)(solution_curve);
    
    var studentBitmap = drawCurve(student_point_array, resolution);
    var solutionBitmap = drawCurve(solution_point_array, resolution);

    // Initialize a counter for number of pixels that match between student and solution
    // Step through all pixels in the bitmap and increment the number of matching pixels
    // accordingly
    // const TOTAL_PIXELS = resolution * resolution;
    const TOTAL_POINTS = num_points + 1;
    var matched_pixels = 0;
    for (var i = 0; i < resolution; i++) {
      for (var j = 0; j < resolution; j++) {
        if (studentBitmap[i][j] === 1 && studentBitmap[i][j] === solutionBitmap[i][j]) {
          matched_pixels++;
        }
      }
    }

    console.log("TOTAL_POINTS: " + TOTAL_POINTS);
    console.log("matched_pixels: " + matched_pixels);
    const test_accuracy = matched_pixels / TOTAL_POINTS;
    console.log("test_accuracy: " + test_accuracy);

    // Check fraction of correct pixels against accuracy tolerance
    if (test_accuracy >= accuracy) {
      return true;
    } else {
      return false;
    }
}

function unit_circle(t) {
  return make_point(Math.sin(2 * Math.PI * t),
                    Math.cos(2 * Math.PI * t));
}

function unit_line_at(y) {
  return t => make_point(t, y);
}

function some_shape(t) {
  if (t < 0.5) {
    return make_point(Math.sin(2 * Math.PI * t),
        Math.cos(2 * Math.PI * t));
  } else {
    return make_point(t, t * 2);
  }
}

function up_line(t) {
  return make_point(0.5, t);
}
function down_line(t) {
  return make_point(0.5, 1-t);
}
(draw_connected(200))(up_line);
(draw_connected(200))(down_line);

function forward_sine(t) {
  return make_point(t, Math.sin(t * Math.PI));
}
function backward_sine(t) {
  return make_point(-t, Math.sin(t * Math.PI));
}
// (draw_connected_squeezed_to_window(200))(forward_sine);
// (draw_connected_squeezed_to_window(200))(backwards_sine);

/* Tests */

// Pass. Expected.
// const TEST_DRAW_MODE = draw_connected;
// const TEST_NUM_POINTS = 200;
// const TEST_STUDENT_CURVE = up_line;
// const TEST_SOLUTION_CURVE = down_line;

// Pass. Expected.
// const TEST_DRAW_MODE = draw_connected;
// const TEST_NUM_POINTS = 200;
// const TEST_STUDENT_CURVE = unit_circle;
// const TEST_SOLUTION_CURVE = unit_circle;

// Fail. Expected.
// const TEST_DRAW_MODE = draw_connected;
// const TEST_NUM_POINTS = 200;
// const TEST_STUDENT_CURVE = forward_sine;
// const TEST_SOLUTION_CURVE = backward_sine;

// Pass. Expected.
// const TEST_DRAW_MODE = draw_connected;
// const TEST_NUM_POINTS = 200;
// const TEST_STUDENT_CURVE = unit_line_at(3);
// const TEST_SOLUTION_CURVE = unit_line_at(3);

// Fail. Expected.
const TEST_DRAW_MODE = draw_connected;
const TEST_NUM_POINTS = 200;
const TEST_STUDENT_CURVE = unit_line_at(10);
const TEST_SOLUTION_CURVE = unit_line_at(50);

console.log(__check_canvas(
  TEST_DRAW_MODE, 
  TEST_NUM_POINTS, 
  TEST_STUDENT_CURVE, 
  TEST_SOLUTION_CURVE));
