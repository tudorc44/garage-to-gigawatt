// fmt must reproduce the examples in docs/design-system/README.md § Numbers.
import { describe, expect, it } from 'vitest'
import { fmt } from '../../src/ui/format.ts'

describe('fmt (port of G2G.fmt)', () => {
  it('money', () => {
    expect(fmt.money(950)).toBe('$950')
    expect(fmt.money(6480)).toBe('$6,480')
    expect(fmt.money(84_000)).toBe('$84.0K')
    expect(fmt.money(1_500_000)).toBe('$1.5M')
    expect(fmt.money(2_000_000_000)).toBe('$2.0B')
    expect(fmt.money(2.82)).toBe('$2.82')
    expect(fmt.money(-10_400)).toBe('−$10.4K')
    expect(fmt.money(1234.5, { exact: true, dp: 2 })).toBe('$1,234.50')
  })

  it('signed and delta', () => {
    expect(fmt.signed(2.82)).toBe('+$2.82')
    expect(fmt.signed(-0.33)).toBe('−$0.33')
    expect(fmt.delta(0.12, 'pct')).toBe('▲12%')
    expect(fmt.delta(-0.09, 'pct')).toBe('▼9%')
    expect(fmt.delta(-10_400, 'money')).toBe('▼$10.4K')
    expect(fmt.delta(0, 'pct')).toBe('= flat')
  })

  it('crypto, hashrate, power, cents, percent', () => {
    expect(fmt.crypto(850, 'BTC')).toBe('850 BTC')
    expect(fmt.crypto(40, 'ETH')).toBe('40 ETH')
    expect(fmt.crypto(1.2, 'BTC')).toBe('1.2 BTC')
    expect(fmt.crypto(0.0269, 'BTC')).toBe('0.0269 BTC')
    expect(fmt.hash(720, 'MH')).toBe('720 MH/s')
    expect(fmt.hash(13.5, 'TH')).toBe('13.5 TH/s')
    expect(fmt.hash(3240, 'TH')).toBe('3.24 PH/s')
    expect(fmt.hash(5_600_000, 'TH')).toBe('5.6 EH/s')
    expect(fmt.power(3.8)).toBe('3.8 kW')
    expect(fmt.power(53)).toBe('53 kW')
    expect(fmt.power(1000)).toBe('1 MW')
    expect(fmt.power(20_000)).toBe('20 MW')
    expect(fmt.cents(0.08)).toBe('8¢/kWh')
    expect(fmt.cents(0.035)).toBe('3.5¢/kWh')
    expect(fmt.pct(0.6)).toBe('60%')
  })

  it('quarters and dates', () => {
    expect(fmt.quarter('2018Q3')).toBe('Q3 2018')
    expect(fmt.quarter('2018Q3', 6)).toBe('Q3 2018 · week 6')
    expect(fmt.date('2017-10-02')).toBe('2 Oct 2017')
    expect(fmt.date('2017-10-02', false)).toBe('2 Oct')
  })
})
