import { PositionPreset, type LayerGlobalConfig } from './layer'

/**
 * 弹层全局默认配置
 * Layer global default configuration
 *
 * 当用户未指定某选项时，使用这里的值作为兜底。
 * When user doesn't specify an option, use values here as fallback.
 */
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
  location: PositionPreset.CENTER_CENTER,
  max: true,
  close: true,
  banner: true,
  i18n: { locale: 'zh-CN' }
}

export default defaultConfig
