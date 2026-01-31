import type { Express, Request, Response, NextFunction } from 'express'
import { defineConfig } from '@motiadev/core'
import endpointPlugin from '@motiadev/plugin-endpoint/plugin'
import logsPlugin from '@motiadev/plugin-logs/plugin'
import observabilityPlugin from '@motiadev/plugin-observability/plugin'
import statesPlugin from '@motiadev/plugin-states/plugin'
import bullmqPlugin from '@motiadev/plugin-bullmq/plugin'

export default defineConfig({
  plugins: [observabilityPlugin, statesPlugin, endpointPlugin, logsPlugin, bullmqPlugin],
  app: (app: Express) => {
    const user = process.env.MOTIA_WORKBENCH_AUTH_USER
    const pass = process.env.MOTIA_WORKBENCH_AUTH_PASSWORD
    if (!user || !pass) return
    const expected = Buffer.from(`${user}:${pass}`).toString('base64')
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.path.startsWith('/__motia')) return next()
      const auth = req.headers.authorization
      if (!auth || auth !== `Basic ${expected}`) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Motia Workbench"')
        return res.status(401).send('Unauthorized')
      }
      next()
    })
  },
})
