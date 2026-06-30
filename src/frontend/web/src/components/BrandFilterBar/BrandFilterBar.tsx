import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './BrandFilterBar.module.css'

const BRAND_DOMAINS: Record<string, string> = {
  'Bambu Lab':      'bambulab.com',
  'eSUN 3D':        'esun3d.com',
  'Prusament':      'prusament.com',
  'Polymaker':      'polymaker.com',
  'Hatchbox':       'hatchbox3d.com',
  'SUNLU':          'sunlu.com',
  'Creality':       'creality.com',
  'ELEGOO':         'elegoo.com',
  'Overture':       'overture3d.com',
  'PolyLite':       'polymaker.com',
  'colorFabb':      'colorfabb.com',
  'Fillamentum':    'fillamentum.com',
  'Fiberlogy':      'fiberlogy.com',
  'extrudr':        'extrudr.com',
  'Das Filament':   'dasfilament.de',
  'Protopasta':     'proto-pasta.com',
  'MatterHackers':  'matterhackers.com',
  'NinjaTek':       'ninjatek.com',
  'Atomic Filament':'atomicfilament.com',
  'Inland':         'microcenter.com',
  'JAYO':           'jayofilament.com',
  'TINMORRY':       'tinmorry.com',
  'AzureFilm':      'azurefilm.hr',
  'Spectrum':       'spectrumfilaments.com',
  'Devil Design':   'devildesign.pl',
  'Anycubic':       'anycubic.com',
}

function logoUrl(brand: string): string | null {
  const domain = BRAND_DOMAINS[brand]
  if (!domain) return null
  return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`
}

interface BrandFilterBarProps {
  brands: string[]
  selected: string
  onChange: (brand: string) => void
}

export default function BrandFilterBar({ brands, selected, onChange }: BrandFilterBarProps) {
  const { t } = useTranslation()
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

  if (brands.length === 0) return null

  return (
    <div className={styles.wrap}>
      <button
        onClick={() => onChange('')}
        className={`${styles.btn}${selected === '' ? ` ${styles.btnActive}` : ''}`}
      >
        {t('brandFilterBar.allBrands')}
      </button>

      {brands.map(brand => {
        const url = logoUrl(brand)
        const hasError = imgErrors[brand]
        const isSelected = selected === brand

        return (
          <button
            key={brand}
            onClick={() => onChange(brand === selected ? '' : brand)}
            className={`${styles.btn}${isSelected ? ` ${styles.btnActive}` : ''}`}
          >
            {url && !hasError ? (
              <img
                src={url}
                alt={brand}
                className={styles.logo}
                onError={() => setImgErrors(e => ({ ...e, [brand]: true }))}
              />
            ) : (
              <span className={`${styles.fallback}${isSelected ? ` ${styles.fallbackActive}` : ''}`}>
                {brand[0]}
              </span>
            )}
            {brand}
          </button>
        )
      })}
    </div>
  )
}
