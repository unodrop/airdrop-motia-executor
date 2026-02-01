import { CronConfig, Handlers } from 'motia'
import { listEnabledWallets } from '../../repositories/wallet.repository'

export const config: CronConfig = {
  type: 'cron',
  name: 'PharosSchedule',
  description: 'List EVM wallets and emit pharos-checkin per account',
  cron: '0 8 * * *',
  emits: ['pharos-checkin'],
  flows: ['pharos-checkin'],
  includeFiles: [
    '../repositories/wallet.repository.ts',
    '../types.ts',
  ],
}

const DEFAULT_ACCOUNT_INTERVAL_MS = 30_000

export const handler: Handlers['PharosSchedule'] = async ({ logger, emit }) => {
  const list = await listEnabledWallets({ chain: 'evm' })
  const intervalMs = Number(process.env.PHAROS_ACCOUNT_INTERVAL_MS) || DEFAULT_ACCOUNT_INTERVAL_MS
  logger.info('Pharos check-in: EVM accounts to process', { count: list.length, intervalMs })

  for (let i = 0; i < list.length; i++) {
    const item = list[i]!
    await emit({
      topic: 'pharos-checkin',
      data: { id: item.id },
    })
    if (i < list.length - 1) {
      await new Promise<void>((r) => setTimeout(r, intervalMs))
    }
  }
}
