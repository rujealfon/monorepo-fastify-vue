// web is a separate origin with no shared cookie domain (see README's "Direct
// requests between unrelated domains"), so a logged-in web user carries a
// one-time handoff token in the URL fragment when linking here (apps/web's
// AppLayout, goToSite()). It's a fragment (#token=...), not a query param, so
// it's never sent to the server on the initial request and can't leak into
// site's access logs or a subsequent page's Referer header -- window.location
// is read directly rather than useRoute() since Vue Router doesn't parse the
// fragment into route.query. Redeem it for site's own session cookie before
// the app renders, so use-profile's one-shot refresh() sees it on the very
// first page load.
export default defineNuxtPlugin(async () => {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
  if (!token)
    return

  const client = useApiClient()
  await client.POST('/api/v1/auth/handoff/exchange', { body: { token } }).catch(() => {})

  const route = useRoute()
  await navigateTo({ path: route.path, query: route.query }, { replace: true })
})
