import { CronConfig, Handlers } from 'motia'
import { listEnabledWallets } from '../../repositories/wallet.repository'

export const config: CronConfig = {
  type: 'cron',
  name: 'PharosSchedule',
  description: 'List enabled accounts and emit pharos-checkin per account',
  cron: '0 8 * * *',
  emits: ['pharos-checkin'],
  flows: ['pharos-checkin'],
  includeFiles: [
    '../repositories/wallet.repository.ts',
    '../types.ts',
  ],
}

export const handler: Handlers['PharosSchedule'] = async ({ logger, emit }) => {
  const list = await listEnabledWallets()
  logger.info('Pharos check-in: accounts to process', { count: list.length })

  for (const item of list) {
    await emit({
      topic: 'pharos-checkin',
      data: { id: item.id },
    })
  }
}
