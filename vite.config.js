import { defineConfig } from 'vite';

const CRAZYGAMES_BUILD_ID = 'toy-rampage-crazygames-20260924-r51';

export default defineConfig(({ mode }) => {
  const crazygames = mode === 'crazygames';
  return {
    // Relative base so the bundle loads inside a Crazy Games iframe or at
    // /toy-rampage/crazygames/ without rewriting asset URLs.
    base: './',
    build: {
      outDir: crazygames ? 'dist-crazygames' : 'dist',
      emptyOutDir: true,
    },
    plugins: crazygames
      ? [
          {
            name: 'crazygames-guest-marker',
            transformIndexHtml(html) {
              return html
                .replace(
                  /<meta name="build-id" content="[^"]*"\s*\/>/,
                  `<meta name="build-id" content="${CRAZYGAMES_BUILD_ID}" />`,
                )
                .replace(
                  '</head>',
                  '  <script>window.__isCrazyGamesBuild=true</script>\n</head>',
                );
            },
          },
        ]
      : [],
  };
});
