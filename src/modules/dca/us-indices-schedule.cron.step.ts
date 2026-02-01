import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'USIndicesSchedule',
  description: '10 min before US market close (ET 15:50 Mon–Fri), emit us-indices-dca-analyze',
  cron: '50 15 * * 1-5',
  emits: ['us-indices-dca-analyze'],
  flows: ['dca-reminder'],
}

export const handler: Handlers['USIndicesSchedule'] = async ({ logger, emit }) => {
  logger.info('US indices DCA: emitting us-indices-dca-analyze')
  await emit({
    topic: 'us-indices-dca-analyze',
    data: {},
  })
}
