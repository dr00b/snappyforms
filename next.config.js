/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            // App Hosting's edge already 301s http->https, but that leaves one
            // plaintext request on the wire before the redirect — exactly the
            // request an attacker on shared venue wifi can intercept. HSTS
            // closes that window after the first visit.
            //
            // Deliberately no includeSubDomains: it would also bind subdomains
            // that do not exist yet (demo.snappyforms.org is planned in #7), and
            // a domain that has never been served can be hard to un-pin.
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          {
            // A shift check-in URL carries its code in the query string, so the
            // full URL must never travel in a Referer header to another origin.
            // Modern browsers default to this; stating it keeps older ones and
            // in-app webviews honest.
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            // Scanning is same-origin only. Pinned mainly so a future header
            // change cannot quietly take the camera away from /qr.
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
