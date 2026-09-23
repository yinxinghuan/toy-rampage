// Deployment adapter only. No accounts, game state, payments or database.
export async function handleApi(request) {
  if (new URL(request.url).pathname === '/api/health' && request.method === 'GET') {
    return Response.json({ ok: true, game: 'toy-rampage', build: 'toy-rampage-alteru-20260923-r50', mode: 'alteru-release', persistence: 'local-browser' });
  }
  return new Response('Not Found', { status: 404 });
}
