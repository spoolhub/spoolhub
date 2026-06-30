import { BrowserRouter } from 'react-router-dom'

export default function PreviewProvider({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>
}
