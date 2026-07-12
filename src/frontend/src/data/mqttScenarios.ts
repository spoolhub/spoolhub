export interface MqttScenario {
  id: string
  label: string
  gcodeState: string
  progressPercent: number
  remainingMinutes: number
  subtaskName: string | null
  layerNum: number
  totalLayerNum: number
  nozzleTempC: number
  bedTempC: number
}

export const MQTT_SCENARIOS: MqttScenario[] = [
  {
    id: 'idle',
    label: 'Idle',
    gcodeState: 'IDLE',
    progressPercent: 0,
    remainingMinutes: 0,
    subtaskName: null,
    layerNum: 0,
    totalLayerNum: 0,
    nozzleTempC: 0,
    bedTempC: 0,
  },
  {
    id: 'running-26',
    label: 'Running 26%',
    gcodeState: 'RUNNING',
    progressPercent: 26,
    remainingMinutes: 19,
    subtaskName: 'Waveshare_Amoled_175_Stand_v33',
    layerNum: 16,
    totalLayerNum: 62,
    nozzleTempC: 219,
    bedTempC: 55,
  },
  {
    id: 'running-54',
    label: 'Running 54%',
    gcodeState: 'RUNNING',
    progressPercent: 54,
    remainingMinutes: 38,
    subtaskName: 'Gridfinity_3x4_bin_v2',
    layerNum: 33,
    totalLayerNum: 62,
    nozzleTempC: 220,
    bedTempC: 55,
  },
  {
    id: 'running-87',
    label: 'Running 87%',
    gcodeState: 'RUNNING',
    progressPercent: 87,
    remainingMinutes: 6,
    subtaskName: 'Dragon_articulated_v5',
    layerNum: 54,
    totalLayerNum: 62,
    nozzleTempC: 218,
    bedTempC: 55,
  },
  {
    id: 'paused',
    label: 'Paused',
    gcodeState: 'PAUSE',
    progressPercent: 45,
    remainingMinutes: 32,
    subtaskName: 'Gridfinity_3x4_bin_v2',
    layerNum: 28,
    totalLayerNum: 62,
    nozzleTempC: 200,
    bedTempC: 45,
  },
  {
    id: 'finished',
    label: 'Finished',
    gcodeState: 'FINISH',
    progressPercent: 100,
    remainingMinutes: 0,
    subtaskName: 'Waveshare_Amoled_175_Stand_v33',
    layerNum: 62,
    totalLayerNum: 62,
    nozzleTempC: 25,
    bedTempC: 25,
  },
  {
    id: 'failed',
    label: 'Failed',
    gcodeState: 'FAILED',
    progressPercent: 34,
    remainingMinutes: 0,
    subtaskName: 'RC_car_chassis_v2',
    layerNum: 21,
    totalLayerNum: 62,
    nozzleTempC: 0,
    bedTempC: 0,
  },
]
