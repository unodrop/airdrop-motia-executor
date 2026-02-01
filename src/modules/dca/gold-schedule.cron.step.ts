import { CronConfig, Handlers } from 'motia'

export const config: CronConfig = {
  type: 'cron',
  name: 'GoldSchedule',
  description: '10 min before gold close (ET 16:50 Mon–Fri), emit gold-dca-analyze',
  cron: '50 16 * * 1-5',
  emits: ['gold-dca-analyze'],
  flows: ['dca-reminder'],
}

export const handler: Handlers['GoldSchedule'] = async ({ logger, emit }) => {
  logger.info('Gold DCA: emitting gold-dca-analyze')
  await emit({
    topic: 'gold-dca-analyze',
    data: {},
  })
}
