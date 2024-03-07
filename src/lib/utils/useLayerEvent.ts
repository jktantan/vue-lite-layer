import { type Callback } from '../model/CallbackFunction'
import { useEmitter } from './layerMitt'

export default () => {
  const emitter = useEmitter()

  /**
   * 点击了OK按钮
   */
  const emitOk = () => {
    console.log(emitter)
    emitter.emit('ok')
  }
  /**
   * 点击了取消
   */
  const emitCancel = () => {
    emitter.emit('cancel')
  }

  const emitClose = () => {
    emitter.emit('close')
  }
  const startLoading = () => {
    emitter.emit('startLoading')
  }
  const stopLoading = () => {
    emitter.emit('stopLoading')
  }
  /**
   * 点击了其他按钮
   */
  const emitCommand = (command?: any) => {
    emitter.emit('command', command)
  }

  const onOk = (func?: Callback) => {
    emitter.on('ok', () => {
      console.log('ok')
      if (func !== null && func !== undefined) {
        func?.()
      } else {
        emitter.emit('close')
      }
    })
  }

  /**
   * 点击了取消
   */
  const onCancel = (func?: Callback) => {
    emitter.on('cancel', () => {
      console.log('cancel')
      if (func !== null && func !== undefined) {
        func?.()
      } else {
        emitter.emit('close')
      }
    })
  }

  /**
   * 点击了其他按钮
   */
  const onCommand = (func?: Callback) => {
    emitter.on('command', (command?: any) => {
      console.log('command')
      if (func !== null && func !== undefined) {
        func?.(command)
      }
    })
  }

  const emitAfterOk = (message?: any) => {
    emitter.emit('afterOk', message)
  }
  const emitAfterCancel = (message?: any) => {
    emitter.emit('afterCancel', message)
  }
  const emitAfterCommand = (command: string, message?: any) => {
    emitter.emit('afterCommand', {
      command,
      message
    })
  }

  return {
    emitOk,
    emitCancel,
    emitCommand,
    emitClose,
    onOk,
    onCancel,
    onCommand,
    emitAfterOk,
    emitAfterCancel,
    emitAfterCommand,
    startLoading,
    stopLoading
  }
}
