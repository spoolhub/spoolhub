import styles from './PreviewProvider.module.css'
import { BrowserRouter } from 'react-router-dom'

export default function PreviewProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <BrowserRouter>{children}</BrowserRouter>
    </div>
  )
}
