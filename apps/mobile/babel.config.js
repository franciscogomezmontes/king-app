module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // colyseus.js pulls in @colyseus/schema's prebuilt UMD bundle, which uses "static {}" class
    // blocks — Metro's default Babel preset doesn't transform that syntax on its own.
    plugins: ["@babel/plugin-transform-class-static-block"],
  };
};
