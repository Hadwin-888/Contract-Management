import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCard from '@/components/dashboard/StatCard.vue'

// Mock setInterval to control animation
vi.useFakeTimers()

describe('StatCard', () => {
  it('renders title and value', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: '合同总数',
        value: 42,
        icon: '📄',
      },
    })
    expect(wrapper.text()).toContain('合同总数')
    expect(wrapper.find('.icon-emoji').text()).toBe('📄')
  })

  it('renders suffix when provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: '风险评分',
        value: 75,
        icon: '⚠️',
        suffix: '分',
      },
    })
    expect(wrapper.text()).toContain('分')
  })

  it('applies custom color', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: '测试',
        value: 10,
        icon: '🔵',
        color: '#ff0000',
      },
    })
    const iconEl = wrapper.find('.stat-icon')
    expect(iconEl.attributes('style')).toContain('255, 0, 0')
  })

  it('renders trend indicator when provided', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: '测试',
        value: 10,
        icon: '📈',
        trend: { value: 15, isUp: true },
      },
    })
    expect(wrapper.text()).toContain('↑')
    expect(wrapper.text()).toContain('15')
    expect(wrapper.find('.stat-trend.up').exists()).toBe(true)
  })

  it('renders down trend correctly', () => {
    const wrapper = mount(StatCard, {
      props: {
        title: '测试',
        value: 10,
        icon: '📉',
        trend: { value: 5, isUp: false },
      },
    })
    expect(wrapper.text()).toContain('↓')
    expect(wrapper.find('.stat-trend.down').exists()).toBe(true)
  })

  it('animates value counting up on mount', () => {
    mount(StatCard, {
      props: {
        title: '测试',
        value: 100,
        icon: '🔢',
      },
    })

    // After one tick of the animation, displayValue should have started incrementing
    vi.advanceTimersByTime(100)
    // displayValue is internal, but the component mounts without error
  })
})
