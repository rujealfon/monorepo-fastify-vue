import type { PolicyExpression } from '@monorepo-fastify-vue/api-client'

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PolicyExpressionBuilder from './PolicyExpressionBuilder.vue'

describe('policyExpressionBuilder', () => {
  it('renders nested groups and emits serializable children', async () => {
    const expression: PolicyExpression = {
      type: 'all',
      children: [{
        type: 'not',
        child: { type: 'compare', field: 'task.done', operator: 'eq', value: { type: 'literal', value: true } }
      }]
    }
    const wrapper = mount(PolicyExpressionBuilder, {
      props: { modelValue: expression, fields: ['task.done', 'task.ownerId', 'actor.id'] }
    })

    expect(wrapper.findAll('[aria-label="Expression type"]')).toHaveLength(3)
    await wrapper.findAll('button').find(button => button.text().includes('Add expression'))!.trigger('click')
    const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as PolicyExpression
    expect(emitted).toMatchObject({ type: 'all', children: [expression.children[0], { type: 'compare' }] })
    expect(() => JSON.stringify(emitted)).not.toThrow()
  })
})
