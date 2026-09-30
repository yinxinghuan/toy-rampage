import { defineConfig } from 'vite';

function patchSource(code, from, to, label) {
  if (!code.includes(from)) throw new Error(`crazygames desktop patch missed: ${label}`);
  return code.replace(from, to);
}

// Rewrites the shared entry only while building the guest bundle. The host
// build does not register this plugin, so dist/ stays byte-identical.
function crazygamesDesktopGuest() {
  return {
    name: 'crazygames-desktop-guest',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/main.js')) return null;
      let next = patchSource(
        code,
        "const crazygames=import.meta.env.MODE==='crazygames';",
        "const crazygames=import.meta.env.MODE==='crazygames';\nif(crazygames){const {installCrazyGamesGuest}=await import('./crazygames/guest.js');installCrazyGamesGuest();}",
        'boot',
      );
      next = patchSource(
        next,
        "if(game.stage==='ready'&&game.get('land')&&landPresented!==token){benchMode='land';landPresented=token;}",
        "if(game.stage==='ready'&&game.get('land')&&landPresented!==token){if(!window.__cgKeepWeapons?.(game))benchMode='land';landPresented=token;}",
        'bench',
      );
      next = patchSource(
        next,
        "if(game.stage==='ready'&&game.waves[game.wave]?.mix&&!freshMove&&!game.get('land')&&!['refresh','place'].includes(game.lesson))$('#hint-title').textContent=t('next',{name:t('mixedWave')});",
        "if(game.stage==='ready'&&game.waves[game.wave]?.mix&&!freshMove&&!game.get('land')&&!['refresh','place'].includes(game.lesson))$('#hint-title').textContent=t('next',{name:t('mixedWave')});if(window.__cgHint){const cgHint=window.__cgHint(game,{benchMode});if(cgHint)$('#hint-title').textContent=cgHint;}",
        'hint',
      );
      next = patchSource(
        next,
        'function guidePlan(){',
        "function guidePlan(){if(window.__cgGuide){const cg=window.__cgGuide(game,{benchMode,selection,$,overlayHidden:()=>overlay.hidden,hasBenchMove:()=>Boolean(newUnitMove())});if(cg!==undefined)return cg;}",
        'guide',
      );
      next = patchSource(
        next,
        'now-lastInteraction<3000',
        'now-lastInteraction<(window.__cgGuideDelay??3000)',
        'guide-delay',
      );
      next = patchSource(
        next,
        'return pixel?pixel.modal(mode,title,content):',
        "if(window.__cgModal){const cgModal=window.__cgModal(mode,content,game);if(typeof cgModal==='string')content=cgModal;}return pixel?pixel.modal(mode,title,content):",
        'modal',
      );
      next = patchSource(
        next,
        "if(recoveryPending&&e.key==='Escape'){e.preventDefault();return;}",
        "if(recoveryPending&&e.key==='Escape'){e.preventDefault();return;}if(window.__cgKey?.(e,{action,confirmMode,game}))return;",
        'keys',
      );
      next = patchSource(
        next,
        'pixel?.mount(root,game);',
        "pixel?.mount(root,game);if(crazygames){const {mountCrazyGamesGuest}=await import('./crazygames/guest.js');await mountCrazyGamesGuest();}",
        'mount',
      );
      return { code: next, map: null };
    },
  };
}

const CRAZYGAMES_BUILD_ID = 'toy-rampage-crazygames-20260930-desktop';

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
          crazygamesDesktopGuest(),
        ]
      : [],
  };
});
