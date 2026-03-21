/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/api/rss",
        headers: [
          { key: "Content-Type", value: "application/rss+xml; charset=utf-8" },
          { key: "Cache-Control", value: "s-maxage=3600, stale-while-revalidate" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
