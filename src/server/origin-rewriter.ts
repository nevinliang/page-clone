export function generateOriginRewriteScript(
  sourceOrigin: string,
  localOrigin: string
): string {
  return `
<script data-page-clone="origin-rewriter">
(function() {
  var SOURCE = ${JSON.stringify(sourceOrigin)};
  var LOCAL = ${JSON.stringify(localOrigin)};

  function rewrite(url) {
    if (typeof url === "string") {
      if (url.startsWith(SOURCE)) return url.replace(SOURCE, LOCAL);
      var noProto = SOURCE.replace(/^https?:/, "");
      if (url.startsWith(noProto)) return url.replace(noProto, LOCAL.replace(/^https?:/, ""));
    }
    if (url instanceof URL) {
      if (url.origin === SOURCE) return new URL(url.pathname + url.search + url.hash, LOCAL);
    }
    if (url instanceof Request) {
      var r = rewrite(url.url);
      if (r !== url.url) return new Request(r, url);
    }
    return url;
  }

  var _fetch = window.fetch;
  window.fetch = function(input, init) { return _fetch.call(this, rewrite(input), init); };

  var _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    var args = Array.prototype.slice.call(arguments);
    args[1] = rewrite(url);
    return _open.apply(this, args);
  };

  if (window.EventSource) {
    var _ES = window.EventSource;
    window.EventSource = function(url, cfg) { return new _ES(rewrite(url), cfg); };
    window.EventSource.prototype = _ES.prototype;
  }

  console.log("[page-clone] Origin rewrite active: " + SOURCE + " -> " + LOCAL);
})();
</script>`;
}
