import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '@/components/common/StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders active status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'active' },
    })
    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.find('.status-dot').exists()).toBe(true)
  })

  it('renders expired status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'expired' },
    })
    expect(wrapper.text()).toContain('已过期')
  })

  it('renders draft status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'draft' },
    })
    expect(wrapper.text()).toContain('草稿')
  })

  it('renders terminated status correctly', () => {
    const wrapper = mount(StatusBadge, {
      props: { status: 'terminated' },
    })
    expect(wrapper.text()).toContain('已终止')
  })
})
