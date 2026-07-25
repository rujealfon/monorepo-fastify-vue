import { PiniaColada } from '@pinia/colada'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import AbilityRulesView from './AbilityRulesView.vue'

const api = vi.hoisted(() => ({
  DELETE: vi.fn(),
  GET: vi.fn(),
  POST: vi.fn()
}))

vi.mock('@/shared/api/client', () => ({ api }))

const response = { ok: true, status: 200 }
const customRule = {
  id: 20,
  key: 'tasks.read_custom',
  description: 'Custom task access',
  effect: 'allow',
  action: 'read',
  subject: 'Task',
  fields: null,
  actorConditions: null,
  resourceConditions: null,
  denialReason: null,
  priority: 0,
  isSystem: false,
  isActive: true,
  conditionSchemaVersion: 1,
  createdAt: '',
  updatedAt: ''
}
let authorizationRules: { action: string, subject: string }[]

async function mountView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/admin/ability-rules', component: { template: '<div />' } }]
  })
  await router.push('/admin/ability-rules')
  return mount(AbilityRulesView, {
    global: { plugins: [createPinia(), [PiniaColada, { queryOptions: { staleTime: 0 } }], router] }
  })
}

describe('abilityRulesView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizationRules = [{ action: 'read', subject: 'AbilityRule' }]
    api.POST.mockResolvedValue({ response })
    api.DELETE.mockResolvedValue({ response })
    api.GET.mockImplementation(async (url: string) => {
      if (url === '/api/v1/me/authorization') {
        return {
          data: {
            user: { id: '00000000-0000-0000-0000-000000000001', email: 'admin@example.com' },
            roles: [],
            rules: authorizationRules,
            authorizationVersion: 1
          },
          response
        }
      }
      if (url === '/api/v1/ability-rules/')
        return { data: [customRule], response }
      return {
        data: {
          actions: ['manage', 'read'],
          subjects: [{
            subject: 'Task',
            conditionFields: ['id'],
            readableFields: ['id', 'name'],
            writableFields: ['name'],
            identityFields: ['id']
          }],
          operators: [],
          actorReferences: [],
          conditionSchemaVersion: 1
        },
        response
      }
    })
  })

  it('shows the rule list without mutation controls to read-only administrators', async () => {
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.text()).toContain(customRule.key)
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Delete rule"]').exists()).toBe(false)
  })

  it('shows mutation controls to manage-all administrators', async () => {
    authorizationRules = [{ action: 'manage', subject: 'all' }]
    const wrapper = await mountView()
    await flushPromises()

    expect(wrapper.find('form').exists()).toBe(true)
    const deleteButton = wrapper.get('[aria-label="Delete rule"]')
    await deleteButton.trigger('click')
    await flushPromises()
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/ability-rules/{ruleId}', {
      params: { path: { ruleId: customRule.id } }
    })
  })
})
