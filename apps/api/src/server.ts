import { buildApp } from './app.js'
import { config } from './config/index.js'

const app = buildApp()

app.listen({ port: config.PORT, host: config.HOST }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`server listening at ${address}`)
})
