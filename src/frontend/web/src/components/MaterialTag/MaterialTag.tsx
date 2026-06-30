import { getMaterialColor } from '@/utils/materialColors'
import styles from './MaterialTag.module.css'

export default function MaterialTag({ material }: { material: string }) {
  const color = getMaterialColor(material)
  return (
    <span
      className={styles.tag}
      style={{ color, borderColor: `${color}50`, backgroundColor: `${color}15` }}
    >
      {material}
    </span>
  )
}
