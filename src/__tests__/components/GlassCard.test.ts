import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GlassCard from '@/components/common/GlassCard.vue'

describe('GlassCard', () => {
  it('renders default slot content', () => {
    const wrapper = mount(GlassCard, {
      slots: { default: '卡片内容' },
    })
    expect(wrapper.text()).toContain('卡片内容')
  })

  it('applies default padding', () => {
    const wrapper = mount(GlassCard, {
      slots: { default: '内容' },
    })
    const div = wrapper.find('.glass-card')
    expect(div.attributes('style')).toContain('24px')
  })

  it('applies custom padding', () => {
    const wrapper = mount(GlassCard, {
      props: { padding: '16px' },
      slots: { default: '内容' },
    })
    const div = wrapper.find('.glass-card')
    expect(div.attributes('style')).toContain('16px')
  })

  it('renders HTML in slot', () => {
    const wrapper = mount(GlassCard, {
      slots: { default: '<span class="inner">内部元素</span>' },
    })
    expect(wrapper.find('.inner').exists()).toBe(true)
    expect(wrapper.find('.inner').text()).toBe('内部元素')
  })
})
