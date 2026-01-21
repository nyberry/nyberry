module.exports = function(eleventyConfig) {
  // Static files passthrough
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("blog/images");
  eleventyConfig.addPassthroughCopy("games/sumfing/assets");

  eleventyConfig.addPassthroughCopy("moonwalk.html");

  // Collection: pages
  eleventyConfig.addCollection("pages", function(collectionApi) {
  return collectionApi.getAll().filter(item =>
    "title" in item.data &&
    "description" in item.data &&
    "image" in item.data &&
    !item.data.excludeFromIndex
  )
  .sort((a, b) => b.date - a.date);   // 👈 newest first
});




  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site"
    }
  };
};
