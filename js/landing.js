document.addEventListener("DOMContentLoaded", function () {
  var stats = document.querySelectorAll(".hero-stat-value");
  stats.forEach(function (item) {
    item.classList.add("anim-fade-up");
  });
});

