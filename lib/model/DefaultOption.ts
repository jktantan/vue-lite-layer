import { LocationType, type LayerGlobalConfig } from './LayerModel'

const defaultConfig: LayerGlobalConfig = {
  teleport: 'body',
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
  i18n: { locale: 'zh-CN' },
}
export default defaultConfig
