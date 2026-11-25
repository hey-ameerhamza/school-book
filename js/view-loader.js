(function () {
  var pageFiles = [
    "focus.html",
    "materials.html",
    "flashcards.html",
    "notes.html",
    "important_notes.html",
    "chat.html",
    "settings.html"
  ];
  var viewContainer = document.getElementById("viewContainer");

  Promise.all(pageFiles.map(function (file) {
    return fetch(file).then(function (response) {
      if (!response.ok) throw new Error("Could not load " + file + ".");
      return response.text();
    }).then(function (markup) {
      var page = new DOMParser().parseFromString(markup, "text/html");
      var template = page.querySelector("template[data-app-view]");
      if (!template) throw new Error("The page view is missing from " + file + ".");
      viewContainer.appendChild(template.content.cloneNode(true));
    });
  })).then(function () {
    var appScript = document.createElement("script");
    appScript.src = "js/app.js";
    appScript.onerror = function () {
      viewContainer.textContent = "The study workspace could not start. Please reload the page.";
    };
    document.body.appendChild(appScript);
  }).catch(function (error) {
    console.error("Could not load the SchoolBook pages:", error);
    viewContainer.textContent = "Some study pages could not be loaded. Please reload the page.";
  });
})();
