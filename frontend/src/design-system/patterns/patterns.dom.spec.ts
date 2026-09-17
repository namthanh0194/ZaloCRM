// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PageShell from './PageShell.vue';
import PageHeader from './PageHeader.vue';
import EmptyState from './EmptyState.vue';
import StatCard from './StatCard.vue';

describe('Design System Layout & Patterns', () => {
  it('renders PageShell with wide container and padding', () => {
    const wrapper = mount(PageShell, {
      props: { width: 'wide', padded: true },
      slots: { default: '<div class="content">Test</div>' },
    });
    expect(wrapper.classes()).toContain('z-page-shell--wide');
    expect(wrapper.classes()).toContain('is-padded');
    expect(wrapper.find('.content').text()).toBe('Test');
  });

  it('renders PageHeader with title, description, and action buttons', () => {
    const wrapper = mount(PageHeader, {
      props: {
        title: 'User Management',
        description: 'Manage roles and system permissions',
      },
      slots: {
        actions: '<button>Add User</button>',
      },
    });
    expect(wrapper.find('.z-page-header__title').text()).toBe('User Management');
    expect(wrapper.find('.z-page-header__desc').text()).toBe('Manage roles and system permissions');
    expect(wrapper.find('.z-page-header__actions').text()).toBe('Add User');
  });

  it('renders EmptyState with title, description, and action slot', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No Data Found',
        description: 'Try adjusting your filters',
      },
      slots: {
        action: '<button>Reset Filters</button>',
      },
    });
    expect(wrapper.find('.z-empty-state__title').text()).toBe('No Data Found');
    expect(wrapper.find('.z-empty-state__desc').text()).toBe('Try adjusting your filters');
    expect(wrapper.find('.z-empty-state__action').text()).toBe('Reset Filters');
  });

  it('renders StatCard with label, value, and positive trend', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Total Revenue',
        value: '$45,200',
        trend: '+12%',
        trendDirection: 'up',
      },
    });
    expect(wrapper.find('.z-stat-card__label').text()).toBe('Total Revenue');
    expect(wrapper.find('.z-stat-card__value').text()).toBe('$45,200');
    expect(wrapper.find('.z-stat-card__trend').text()).toBe('+12%');
    expect(wrapper.find('.z-stat-card__trend').classes()).toContain('is-up');
  });

  it('renders StatCard semantic variant and clickable state', () => {
    const wrapper = mount(StatCard, {
      props: {
        label: 'Unread messages',
        value: 12,
        variant: 'danger',
        clickable: true,
      },
    });

    expect(wrapper.classes()).toContain('is-danger');
    expect(wrapper.classes()).toContain('is-clickable');
  });
});
