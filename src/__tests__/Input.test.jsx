import { describe, test, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import Input from '../components/ui/Input'

afterEach(() => cleanup())

describe('Input', () => {
  test('renders an input with default styling', () => {
    const { container } = render(<Input placeholder="Type" />)
    const el = container.querySelector('input')
    expect(el).toBeTruthy()
    expect(el.getAttribute('type')).toBe('text')
    expect(el.className).toMatch(/border/)
    expect(el.className).toMatch(/h-9/)
  })

  test('forwards typed value via onChange', async () => {
    const onChange = vi.fn()
    render(<Input placeholder="Email" onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText('Email'), 'a')
    expect(onChange).toHaveBeenCalled()
  })

  test('error prop applies copper border classes', () => {
    const { container } = render(<Input error placeholder="x" />)
    const cn = container.querySelector('input').className
    expect(cn).toMatch(/border-\[var\(--color-copper\)\]/)
  })

  test('leadingIcon wraps input in a relative div with the icon at left', () => {
    const { container } = render(
      <Input leadingIcon={<span data-testid="leading">@</span>} placeholder="Search" />,
    )
    const wrapper = container.querySelector('div.relative')
    expect(wrapper).toBeTruthy()
    expect(wrapper.querySelector('[data-testid="leading"]')).toBeTruthy()
    // The input gets pl-9 to clear the leading icon
    expect(container.querySelector('input').className).toMatch(/pl-9/)
  })

  test('wrapperClassName applies to the wrapper, not the input', () => {
    const { container } = render(
      <Input
        leadingIcon={<span>@</span>}
        wrapperClassName="flex-1 my-marker"
        placeholder="x"
      />,
    )
    const wrapper = container.querySelector('div.relative')
    expect(wrapper.className).toMatch(/my-marker/)
    expect(wrapper.className).toMatch(/flex-1/)
    // Input shouldn't get those layout classes
    expect(container.querySelector('input').className).not.toMatch(/my-marker/)
  })

  test('forwards ref to the underlying input', () => {
    let captured = null
    function Capture() {
      const ref = useRef(null)
      captured = ref
      return <Input ref={ref} placeholder="x" />
    }
    render(<Capture />)
    expect(captured.current?.tagName).toBe('INPUT')
  })

  test('disabled input does not accept input', async () => {
    render(<Input disabled placeholder="x" />)
    const el = screen.getByPlaceholderText('x')
    expect(el.disabled).toBe(true)
    await userEvent.type(el, 'abc')
    expect(el.value).toBe('')
  })
})
