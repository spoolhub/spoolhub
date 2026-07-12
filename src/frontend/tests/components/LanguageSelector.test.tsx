import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import LanguageSelector from '@/components/LanguageSelector'
import i18n from '@/i18n'

describe('LanguageSelector', () => {
  beforeEach(() => { i18n.changeLanguage('en') })
  it('renders the language button', () => {
    render(<LanguageSelector />)
    expect(screen.getByLabelText('Select language')).toBeInTheDocument()
  })

  it('shows English as default', () => {
    render(<LanguageSelector />)
    expect(screen.getByText('English')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByLabelText('Select language'))
    expect(screen.getByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Swedish')).toBeInTheDocument()
  })

  it('closes dropdown after selecting a language', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByLabelText('Select language'))
    fireEvent.click(screen.getByText('Spanish'))
    expect(screen.queryByText('Swedish')).not.toBeInTheDocument()
  })

  it('updates selected language after selection', () => {
    render(<LanguageSelector />)
    fireEvent.click(screen.getByLabelText('Select language'))
    fireEvent.click(screen.getByText('Spanish'))
    expect(screen.getByText('Spanish')).toBeInTheDocument()
  })
})
