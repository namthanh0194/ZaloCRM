// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ZButton from './ZButton.vue';
import ZBadge from './ZBadge.vue';
import ZCard from './ZCard.vue';
import ZInput from './ZInput.vue';

describe('Design System UI Primitives', () => {
  it('renders ZButton with default primary variant and handles click', async () => {
    const wrapper = mount(ZButton, {
      slots: { default: 'Click Me' },
    });
    expect(wrapper.classes()).toContain('z-btn--primary');
    expect(wrapper.text()).toBe('Click Me');
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });

  it('renders ZButton loading state and disables interaction', () => {
    const wrapper = mount(ZButton, {
      props: { loading: true },
      slots: { default: 'Loading' },
    });
    expect(wrapper.classes()).toContain('is-loading');
    expect(wrapper.attributes('disabled')).toBeDefined();
  });

  it('renders ZBadge variants correctly', () => {
    const wrapper = mount(ZBadge, {
      props: { variant: 'success', dot: true },
      slots: { default: 'Active' },
    });
    expect(wrapper.classes()).toContain('z-badge--success');
    expect(wrapper.find('.z-badge__dot').exists()).toBe(true);
    expect(wrapper.text()).toBe('Active');
  });

  it('renders ZCard with header and body slots', () => {
    const wrapper = mount(ZCard, {
      slots: {
        header: 'Card Title',
        default: 'Card Body Content',
      },
    });
    expect(wrapper.find('.z-card__header').text()).toBe('Card Title');
    expect(wrapper.find('.z-card__body').text()).toBe('Card Body Content');
  });

  it('renders ZInput and emits update:modelValue on typing', async () => {
    const wrapper = mount(ZInput, {
      props: {
        modelValue: 'Initial',
        label: 'Email Address',
      },
    });
    expect(wrapper.find('.z-input__label').text()).toBe('Email Address');
    const input = wrapper.find('input');
    await input.setValue('test@example.com');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['test@example.com']);
  });
});
