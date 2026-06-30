import { useNavigate } from 'react-router-dom'
import ScanView from '@/components/ScanView'

export default function ScanPage() {
  const navigate = useNavigate()
  return (
    <ScanView onUnknownTag={uid => navigate(`/spools/add/nfctag?tagUid=${uid}`)} />
  )
}
