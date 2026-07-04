import { defineConfig } from 'vitepress'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  ignoreDeadLinks: [/^http:\/\/localhost:5174\/?$/],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    },
    resolve: {
      alias: {
        '@lib': fileURLToPath(new URL('../../lib', import.meta.url))
      }
    }
  },
  title: 'Vue Lite Layer',
  head: [['link', { rel: 'icon', href: '/img/logo.svg' }]],

  locales: {
    root: {
      label: '中文',
      lang: 'zh-CN',
      description: '基于 Vue 3 的服务式弹层组件',
      themeConfig: {
        nav: [
          { text: '指南', link: '/guide/install' },
          { text: 'API', link: '/api/config' },
          { text: '演示', link: '/demo/' },
          {
            text: '代码仓库',
            items: [{ text: 'GitHub', link: 'https://github.com/jktantan/vue-lite-layer' }]
          }
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '安装', link: '/guide/install' },
              { text: '快速上手', link: '/guide/quickstart' },
              { text: 'Nuxt 支持', link: '/guide/nuxt' }
            ]
          },
          {
            text: 'API 参考',
            items: [
              { text: '配置项', link: '/api/config' },
              { text: '弹层实例', link: '/api/instance' },
              { text: 'Composables', link: '/api/composables' }
            ]
          },
          {
            text: '交互演示',
            items: [{ text: 'Demo', link: '/demo/' }]
          },
          {
            text: '进阶',
            items: [
              { text: '国际化', link: '/advanced/i18n' },
              { text: 'Teleport 挂载', link: '/advanced/teleport' }
            ]
          }
        ],
        docFooter: {
          next: '下一页',
          prev: '上一页'
        },
        outline: {
          label: '本页目录'
        },
        search: {
          provider: 'local',
          options: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换',
                  closeText: '关闭'
                }
              }
            }
          }
        }
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      description: 'Service-style modal/layer component for Vue 3',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/install' },
          { text: 'API', link: '/en/api/config' },
          { text: 'Demo', link: '/en/demo/' },
          {
            text: 'Repository',
            items: [{ text: 'GitHub', link: 'https://github.com/jktantan/vue-lite-layer' }]
          }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Installation', link: '/en/guide/install' },
              { text: 'Quick Start', link: '/en/guide/quickstart' },
              { text: 'Nuxt Support', link: '/en/guide/nuxt' }
            ]
          },
          {
            text: 'API Reference',
            items: [
              { text: 'Configuration', link: '/en/api/config' },
              { text: 'Layer Instance', link: '/en/api/instance' },
              { text: 'Composables', link: '/en/api/composables' }
            ]
          },
          {
            text: 'Interactive Demo',
            items: [{ text: 'Demo', link: '/en/demo/' }]
          },
          {
            text: 'Advanced',
            items: [
              { text: 'Internationalization', link: '/en/advanced/i18n' },
              { text: 'Teleport Mounting', link: '/en/advanced/teleport' }
            ]
          }
        ],
        docFooter: {
          next: 'Next',
          prev: 'Previous'
        },
        outline: {
          label: 'On this page'
        }
      }
    }
  },

  themeConfig: {
    logo: '/img/logo.svg',
    footer: {
      message: 'Released under the Apache License.',
      copyright: 'Copyright © 2024-present tantan'
    },
    search: {
      provider: 'local'
    }
  }
})
