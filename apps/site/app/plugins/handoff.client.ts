// web is a separate origin with no shared cookie domain (see README's "Direct
// requests between unrelated domains"), so a logged-in web user carries a
// one-time handoff token in the URL when linking here (apps/web's AppLayout).
// Redeem it for site's own session cookie before the app renders, so
// use-profile's one-shot refresh() sees it on the very first page load.
export default defineNuxtPlugin(async () => {
  const route = useRoute()
  const token = route.query.token
  if (typeof token !== 'string')
    return

  const client = useApiClient()
  await client.POST('/api/v1/auth/handoff/exchange', { body: { token } }).catch(() => {})

  const { token: _discard, ...query } = route.query
  await navigateTo({ path: route.path, query }, { replace: true })
})
