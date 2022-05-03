// this construction helps avoid polluting the global name space
var Main = Main || {
  // internal stuff
  ageStack: [],
  batchMode: false,

  // how much to offset display of each image on stack:
  imageStackDisplayOffset: 100,

  // print out debug info, namely filter processing time
  debugPrint: true,

  // time in ms after which to pause filter application to update display
  // (can only pause between filters)
  applyRefreshTime: 1000,

  // time in ms before "working..." popup is displayed
  workingDialogDelay: 500,

};

function Pixel( comp0, comp1, comp2, a, colorSpace ) {
  if (typeof comp0 === "string") {
    this.colorSpace = "rgb";

    if (comp0.match(/rgb/g)) {
      // rgba string
      this.data = comp0.match(/-?\d+\.?\d*/g);
      for (var i = 0; i <= 2; i++) {
        this.data[i] = parseFloat(this.data[i] / 255);
      }
      this.a = (this.data[3] && parseFloat(this.data[3]) / 255) || 1;
      this.data[3] = undefined;
    }
    else {
      // hex string
      var bigint = parseInt( comp0.substring(1), 16 );
      this.data = [
        (( bigint >> 16 ) & 255) / 255,
        (( bigint >> 8  ) & 255) / 255,
        (( bigint       ) & 255) / 255,
      ];
      this.a = 1;
    }
  }
  else {
    if (a === undefined) {
      a = 1;
    }
    this.data = [
      comp0,
      comp1,
      comp2,
    ];
    this.a = a;
    this.colorSpace = colorSpace || "rgb";
  }
}


var waterColors = {
  color1: '#FFFFFF',
  color2: '#366be8',
  color3: '#001a93',
  color4: '#4b97ae'
 }

 var sandColors = {
  color1: '#000000',
  color2: '#fcd213',
  color3: '#edbc5f',
  color4: '#d1bf94'
 }

 var sceneParams = {
   wind: 10,
   jagged: 10
 }

// called when the gui params change and we need to update the image
Main.controlsChangeCallback = function() {
  //Main.filterHistoryData = Gui.getFilterHistoryData();
  Raytracer.updateColor("water_color1", (new Pixel(waterColors.color1).data));
  Raytracer.updateColor("water_color2", (new Pixel(waterColors.color2).data));
  Raytracer.updateColor("water_color3", (new Pixel(waterColors.color3).data));
  Raytracer.updateColor("water_color4", (new Pixel(waterColors.color4).data));

  Raytracer.updateColor("sand_color1", (new Pixel(sandColors.color1).data));
  Raytracer.updateColor("sand_color2", (new Pixel(sandColors.color2).data));
  Raytracer.updateColor("sand_color3", (new Pixel(sandColors.color3).data));
  Raytracer.updateColor("sand_color4", (new Pixel(sandColors.color4).data));

  Raytracer.setUniform('1f', 'wind', sceneParams.wind);
  Raytracer.setUniform('1f', 'jagged', sceneParams.jagged);


  //Main.totalApplyTimeSinceFirstFilter = 0;
  //Main.applyFilters();
};

window.onload = function() {
  var cmd = Parser.getCommands(document.URL)[0];

  var height = cmd.height || window.innerHeight;
  var width = cmd.width || window.innerWidth;

  var animated = cmd.animated || 0;
  var paused = false;
  var debug = cmd.debug || false;

  Raytracer.init(height, width, debug);

  Student.updateHTML();

  var drawScene = function() {
    //if (!animated || !paused) 
    Raytracer.render(true);

    requestAnimationFrame(drawScene);
  };

  drawScene();

  Raytracer.updateColor("water_color1", (new Pixel(waterColors.color1).data));
  Raytracer.updateColor("water_color2", (new Pixel(waterColors.color2).data));
  Raytracer.updateColor("water_color3", (new Pixel(waterColors.color3).data));
  Raytracer.updateColor("water_color4", (new Pixel(waterColors.color4).data));
  Raytracer.updateColor("sand_color1", (new Pixel(sandColors.color1).data));
  Raytracer.updateColor("sand_color2", (new Pixel(sandColors.color2).data));
  Raytracer.updateColor("sand_color3", (new Pixel(sandColors.color3).data));
  Raytracer.updateColor("sand_color4", (new Pixel(sandColors.color4).data));
  Raytracer.handleKey(1.0, 0.0);
  Raytracer.setUniform('1f', 'wind', sceneParams.wind);
  Raytracer.setUniform('1f', 'jagged', sceneParams.jagged);



  function snapShot() {
    // get the image data
    try {
      var dataURL = document.getElementById("canvas").toDataURL();
    } catch (err) {
      alert("Sorry, your browser does not support capturing an image.");
      return;
    }

    // this will force downloading data as an image (rather than open in new window)
    var url = dataURL.replace(/^data:image\/[^;]/, "data:application/octet-stream");
    window.open(url);
  }


  // add event listener that will cause 'I' key to download image
  window.addEventListener("keyup", function(event) {
    // only respond to 'I' key
    if (event.which == 73) {
      snapShot();
    } else if (event.which == 32) {
      paused = !paused;
    }
  });

  var magVal = 1.0;
  var offsetVal = 0;

  window.addEventListener("keydown", function(event) {
    // only respond to 'I' key
    if (event.which == 38) {
      magVal -= .01;
      Raytracer.handleKey(1/magVal, offsetVal);
      
    } else if (event.which == 40) {
      magVal += .01;
      Raytracer.handleKey(1/magVal, offsetVal);
    }
    else if (event.key == 'ArrowLeft'){
      offsetVal -=(3 *magVal);
      Raytracer.handleKey(1/magVal, offsetVal);
    }
    else if (event.key == 'ArrowRight'){
      offsetVal +=(3 * magVal);
      Raytracer.handleKey(1/magVal, offsetVal);
    }
  });

  window.addEventListener('click', function(event){
      Raytracer.handleClick(event.clientX, event.clientY);
  })

  Gui.init(Main.controlsChangeCallback);
};
