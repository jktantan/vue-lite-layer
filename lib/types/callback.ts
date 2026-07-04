/**
 * 弹层回调函数类型
 * Layer callback function type
 *
 * @param commandOrMessage - 自定义命令标识或消息数据（可选） / Custom command identifier or message data (optional)
 * @param message - 传递给回调的消息数据（可选） / Message data passed to callback (optional)
 */
export type LayerCallback<CommandOrMessage = unknown, Message = unknown> = {
  bivarianceHack(commandOrMessage?: CommandOrMessage, message?: Message): void
}['bivarianceHack']
