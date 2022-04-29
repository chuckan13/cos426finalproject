"use strict";

// NOTE: requires a version of dat.gui.js with the following additions:
//  - callbacks on folder open/close
//  - guiFolder.removeFolder(folderName)

// from http://stackoverflow.com/questions/15313418/javascript-assert
function assert(condition, message) {
  if (!condition) {
    message = message || "Assertion failed";
    if (typeof Error !== "undefined") {
      throw new Error(message);
    }
    throw message; // Fallback
  }
  return condition;
};


var Gui = Gui || {
  hidden: false,
  filterDefs: [],
};

Gui.handleControlsChange = function() {
  this.controlsChangeCallback();
};

Gui.init = function(controlsChangeCallback) {
  var genFuncAddFilter = function(filterDef) {
    return function() {
      Gui.addHistoryEntry(filterDef);
    }
  };

  // save off callbacks for easy access
  this.controlsChangeCallback = controlsChangeCallback;

  if (this.hidden) {
    this.historyFilters = [];

    this.fullyInitialized = true;
    return;
  }

  // make and save off dat.gui gui objects
  this.historyDatGui = new dat.GUI();

  // make a button for each filterDef, in the correct folder
  this.filterFolders = {};
  this.applyFuncs = {};
  for (var filterIdx = 0; filterIdx < this.filterDefs.length; filterIdx++) {
    var filterDef = this.filterDefs[filterIdx];

    // get the gui folder where the button goes (make it if doesn't yet exist)
    var filterFolder = undefined;
    if (filterDef.folderName) {
      filterFolder = this.filterFolders[filterDef.folderName];

      if (filterFolder === undefined) {
        filterFolder = this.filterListDatGui.addFolder(
          filterDef.folderName,
          function() {},
          function() {}
          );
        this.filterFolders[filterDef.folderName] = filterFolder;
      }
    }
    else {
      filterFolder = this.filterListDatGui;
    }

    // generate the button function and make the button
    filterDef.applyFunc = filterDef.applyFunc || genFuncAddFilter(filterDef);
    this.applyFuncs[filterDef.name] = filterDef.applyFunc;
    var filterButton = filterFolder.add(this.applyFuncs, filterDef.name);
  }

  
  var defaultOnChangeFunc = function() {
    return function() {
      Gui.handleControlsChange();
    }
  }

  // CONSTRUCT THE HISTORY PANE
  this.historyFolder = this.historyDatGui.addFolder("Color");
  this.historyFolder.open();
  this.historyFilters = [];

  var color1Control = this.historyFolder.addColor(colors,'color1').name('Color 1').listen();
  color1Control.onChange(function() {
      Gui.handleControlsChange();
  });
  var color2Control = this.historyFolder.addColor(colors,'color2').name('Color 2').listen();
  color2Control.onChange(function() {
      Gui.handleControlsChange();
  });
  var color3Control = this.historyFolder.addColor(colors,'color3').name('Color 3').listen();
  color3Control.onChange(function() {
      Gui.handleControlsChange();
  });
  var color4Control = this.historyFolder.addColor(colors,'color4').name('Color 4').listen();
  color4Control.onChange(function() {
      Gui.handleControlsChange();
  });




  /* 
  if (GuiConfig.onInit) {
    GuiConfig.onInit(this);
  }
  */

  this.fullyInitialized = true;
};