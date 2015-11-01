var system = require("system"),
    page = require("webpage").create(),
    fs = require("fs"),
    identifier = '____RENDER____';

var cmdArgs = ["htmlPath",
             "filePath",
             "cssPath",
             "jsPath",
             "runningsPath",
             "paperFormat",
             "paperOrientation",
             "paperBorder",
             "paperWidth",
             "paperHeight",
             "renderDelay"];

args = cmdArgs.reduce(function (args, name, i) {
    args[name] = system.args[i + 1];
    return args;
}, {});

page.onInitialized = function() {
    /* Add CSS source to the page */
    page.evaluate(function(cssPath) {
      var head = document.querySelector("head");
      var css = document.createElement("link");

      css.rel = "stylesheet";
      css.href = cssPath;

      head.appendChild(css);
    }, args.cssPath);

    /* Add JS source to the page */
    page.evaluate(function(jsPath) {
      var head = document.querySelector("head");
      var script = document.createElement("script");

      script.src = jsPath;

      head.appendChild(script);
    }, args.jsPath);

    page.evaluate(function(identifier) {
        document.addEventListener('pdfTrigger', function () {
            console.log(identifier);
        }, false);
    }, identifier);

    /* Alter pagesize according to specified header/footer data */
    var defaultFormat = {format: args.paperFormat, orientation: args.paperOrientation, border: args.paperBorder};
    if(args.paperWidth !== 'false'){
      defaultFormat = {width: args.paperWidth, height: args.paperHeight, border: args.paperBorder};
    }

    page.paperSize = defaultFormat;

    if (args.runningsPath !== "nofile") {
      var runnings = require(args.runningsPath);
      page.paperSize = paperSize(args.runningsPath, defaultFormat);
    }
};

page.onLoadFinished = function(status) {
  console.log('Load status: ' + status);
  // Do other things here...
};

page.onError = function (msg, trace) {
    system.stderr.writeLine(msg);

    trace.forEach(function(item) {
        system.stderr.writeLine('   ' + item.file + ':' + item.line);
    });

    phantom.exit(1);
}

page.onConsoleMessage = function (msg) {
    console.log(msg);

    if (msg !== identifier) {
        return;
    }

    /* Render the page */
    setTimeout(function () {
        page.render(args.filePath);
        page.close();
        setTimeout(function(){ phantom.exit(0); }, 0);
    }, parseInt(args.renderDelay, 10));
}

page.open(args.htmlPath, function (status) {

  if (status == "fail") {
    page.close();
    phantom.exit(1);
    return;
  }

});

function paperSize(runningsPath, obj) {
  // encapsulate .contents into phantom.callback()
  //   Why does phantomjs not support Array.prototype.forEach?!
  var keys = ["header", "footer"]
  for (var i = 0; i < keys.length; i++) {
    var which = keys[i]
    if (runnings[which]
      && runnings[which].contents
      && typeof runnings[which].contents === "function") {
      obj[which] = {
        contents: phantom.callback(runnings[which].contents)
      }
      if (runnings[which].height)
        obj[which].height = runnings[which].height
    }
  }

  return obj
}
