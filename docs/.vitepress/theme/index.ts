import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import VueLiteLayer from '../../../lib'
import '../../../lib/assets/style/index.scss'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.use(VueLiteLayer)
  }
} satisfies Theme
