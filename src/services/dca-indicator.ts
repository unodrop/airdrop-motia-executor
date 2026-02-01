/**
 * 定投适合性判断：均线 + RSI 组合。
 * 规则：价格低于 MA60 或 MA20，且 RSI 未严重超买（< DCA_RSI_MAX）时提示适合定投。
 */

export type DCAIndicatorOptions = {
  /** RSI 超过此值视为超买，不适合定投。默认 45 */
  rsiMax?: number
}

const DEFAULT_RSI_MAX = 45

export type DCAVerdict = {
  suitable: boolean
  reason: string
}

/**
 * 根据当前价、MA20、MA60、RSI 判断是否适合定投，并返回简短原因。
 */
export function isSuitableForDCA(
  price: number,
  ma20: number | undefined,
  ma60: number | undefined,
  rsi: number | undefined,
  options: DCAIndicatorOptions = {}
): DCAVerdict {
  const rsiMax = options.rsiMax ?? (Number(process.env.DCA_RSI_MAX) || DEFAULT_RSI_MAX)

  const belowMa60 = ma60 != null && price < ma60
  const belowMa20 = ma20 != null && price < ma20
  const rsiOk = rsi == null || rsi < rsiMax

  if (belowMa60 && rsiOk) {
    return { suitable: true, reason: '价格低于 MA60 且 RSI 未超买' }
  }
  if (belowMa20 && rsiOk) {
    return { suitable: true, reason: '价格低于 MA20 且 RSI 未超买' }
  }
  if (rsi != null && rsi >= rsiMax) {
    return { suitable: false, reason: `RSI(${rsi.toFixed(0)}) 偏高，暂不适合加仓` }
  }
  if (ma60 != null && price >= ma60 && ma20 != null && price >= ma20) {
    return { suitable: false, reason: '价格在均线上方，可观望' }
  }
  return { suitable: false, reason: '数据不足或中性' }
}
