import type { IncomingMessage, ServerResponse } from 'node:http'

import { buildApp } from '../apps/api/src/app.js'

const app = buildApp()
const ready = app.ready()

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  await ready

  const url = new URL(request.url ?? '/', 'http://localhost')
  const path = url.searchParams.get('path')

  if (path) {
    url.searchParams.delete('path')
    request.url = `/${path}${url.search}`
  }

  app.server.emit('request', request, response)
}
