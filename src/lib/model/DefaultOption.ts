import { LocationType, type LayerConfig } from '../model/AreaModel'

const defaultConfig: LayerConfig = {
  id: '',
  teleport: 'body',
  uniqueGroup: '',
  size: {
    width: '300px',
    height: '400px'
  },
  footer: true,
  shade: true,
  shadeClose: true,
  maxWidth: 'none',
  maxHeight: 'none',
  location: LocationType.CENTER_CENTER,
  max: true,
  close: true,
  i18n: { locale: 'zh_CN' },
  onCancel: null,
  onOk: null,
  onCommand: null
}
export default defaultConfig
