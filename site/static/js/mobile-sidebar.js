(function () {
  function setupMobileSidebar() {
    var body = document.body;
    var sidebar = document.querySelector(".sidebar");
    var header = document.querySelector("header");
    var toggle = null;
    var mobileQuery = window.matchMedia("(max-width: 480px)");

    if (!header) {
      return;
    }

    if (!sidebar) {
      return;
    }

    body.classList.add("has-sidebar");

    toggle = header.querySelector("[data-sidebar-toggle]");

    if (!toggle) {
      toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "sidebar-toggle";
      toggle.setAttribute("data-sidebar-toggle", "");
      toggle.setAttribute("aria-label", "メニューを開く");
      toggle.setAttribute("aria-expanded", "false");

      for (var i = 0; i < 3; i += 1) {
        var line = document.createElement("span");
        line.className = "sidebar-toggle__line";
        toggle.appendChild(line);
      }

      header.insertBefore(toggle, header.firstChild);
    }

    if (!sidebar.id) {
      sidebar.id = "techdoc-sidebar";
    }
    toggle.setAttribute("aria-controls", sidebar.id);

    function closeSidebar() {
      body.classList.remove("sidebar-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "メニューを開く");
    }

    function openSidebar() {
      body.classList.add("sidebar-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "メニューを閉じる");
    }

    toggle.addEventListener("click", function () {
      if (body.classList.contains("sidebar-open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeSidebar();
      }
    });

    document.addEventListener("click", function (event) {
      if (!mobileQuery.matches || !body.classList.contains("sidebar-open")) {
        return;
      }

      if (toggle.contains(event.target) || sidebar.contains(event.target)) {
        return;
      }

      closeSidebar();
    });

    window.addEventListener("resize", function () {
      if (!mobileQuery.matches) {
        closeSidebar();
      }
    });

    var sidebarLinks = sidebar.querySelectorAll("a");
    sidebarLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (mobileQuery.matches) {
          closeSidebar();
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupMobileSidebar);
  } else {
    setupMobileSidebar();
  }
})();
