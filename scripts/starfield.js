/* Starfield — generates animated star backgrounds on any page */
(function () {
  'use strict';

  function makeStars(n, w, h) {
    var arr = [];
    for (var i = 0; i < n; i++) {
      arr.push(
        Math.round(Math.random() * w) + 'px ' +
        Math.round(Math.random() * h) + 'px #fff'
      );
    }
    return arr.join(',');
  }

  var s1 = makeStars(700, 2000, 2000);
  var s2 = makeStars(200, 2000, 2000);
  var s3 = makeStars(100, 2000, 2000);

  var st = document.createElement('style');
  st.textContent =
    '#stars,#stars:after{box-shadow:' + s1 + '}' +
    '#stars2,#stars2:after{box-shadow:' + s2 + '}' +
    '#stars3,#stars3:after{box-shadow:' + s3 + '}';
  document.head.appendChild(st);

  ['stars', 'stars2', 'stars3'].forEach(function (id) {
    if (!document.getElementById(id)) {
      var d = document.createElement('div');
      d.id = id;
      d.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(d, document.body.firstChild);
    }
  });
})();
