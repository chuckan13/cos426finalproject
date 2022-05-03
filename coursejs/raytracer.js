var Raytracer = Raytracer || {};

// for animation
Raytracer.frame = 0;
Raytracer.needsToDraw = true;
//

Raytracer.handleClick = function(x, y) {
  var clickCoord = [x, y]
  this.setUniform("2fv", 'clickCoord', clickCoord);
  this.setUniform("1i", 'clickFrame', this.frame);
};
Raytracer.handleKey = function(magVal_, offsetVal_) {
  var magVal = [magVal_, 0.0]
  var offsetVal = [offsetVal_, 0.0]

  this.setUniform("2fv", 'offset', offsetVal)
  this.setUniform("2fv", 'magnify', magVal)
  Raytracer.needsToDraw = true;
};

Raytracer.initShader = function(program, shaderType, src, debug) {
  var shader = this.gl.createShader(shaderType);
  this.gl.shaderSource(shader, src);
  this.gl.compileShader(shader);

  // check compile status and report error
  var ok = this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS);

  if (debug || !ok) {
    var log = this.gl.getShaderInfoLog(shader);
    var msg = debug ? "Debug status of " : "Compile error in ";
    msg += "shader type " + shaderType + ": " + log;
    alert(msg);
    console.log(msg);
  }
  this.gl.attachShader(program, shader);
  return shader;
};

Raytracer.init = function(height, width, debug) {
  canvas = document.getElementById("canvas");
  this.gl = canvas.getContext("experimental-webgl", { preserveDrawingBuffer: true });
  canvas.width = width;
  canvas.height = height;

  this.gl.viewportWidth = canvas.width;
  this.gl.viewportHeight = canvas.height;

  this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

  this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  var fSrc = Parser.parseTxt("shaders/fragmentShader.frag");
  var vSrc = Parser.parseTxt("shaders/vertexShader.vert");
  
  this.program = this.gl.createProgram();

  var compileStartTime = performance.now();

  this.initShader(this.program, this.gl.VERTEX_SHADER, vSrc, debug);
  this.initShader(this.program, this.gl.FRAGMENT_SHADER, fSrc, debug);

  var compileTime = Math.round(performance.now() - compileStartTime);
  // console.log('shader compilation completed in ' + compileTime + ' ms.');

  this.gl.linkProgram(this.program);
  this.gl.useProgram(this.program);

  this.gl.uniform1f(this.gl.getUniformLocation(this.program, "width"), width);
  this.gl.uniform1f(this.gl.getUniformLocation(this.program, "height"), height);

  positionLocation = this.gl.getAttribLocation(this.program, "a_position");
  this.gl.enableVertexAttribArray(positionLocation);

  var bufferGeom = new Float32Array([
    -1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
  ]);
  var buffer = this.gl.createBuffer();
  buffer.itemSize = 2;
  buffer.numItems = 6;

  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, bufferGeom, this.gl.STATIC_DRAW);
  this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

  this.gl.uniform1i(this.gl.getUniformLocation(this.program, "frame"), this.frame);

  Raytracer.RotationMatrix = mat4.create();
  mat4.identity(Raytracer.RotationMatrix);

  canvas.onmousedown = Raytracer.handleMouseDown;
  document.onmouseup = Raytracer.handleMouseUp;
  document.onmousemove = Raytracer.handleMouseMove;
};


Raytracer.setUniform = function(varType, varName, v0, v1, v2) {
  var unifName = "uniform" + varType;
  v0 = v0 || 0.0;
  v1 = v1 || 0.0;
  v2 = v2 || 0.0;
  // v1 and v2 may be undefined because we only need 1 argument, but this is ok
  this.gl[unifName](this.gl.getUniformLocation(this.program, varName), v0, v1, v2);
};

Raytracer.updateColor = function(colorNum, colorVal){
  this.setUniform("3fv", colorNum, colorVal)
  Raytracer.needsToDraw = true;
}

Raytracer.render = function(animated) {
  this.frame++;

  if (animated) {
    this.setUniform("1i", "frame", this.frame);
  }
  if (this.needsToDraw || animated) {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
    this.needsToDraw = false;
  }
};
