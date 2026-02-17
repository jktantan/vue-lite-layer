/**
 * 弹层回调函数类型
 * Layer callback function type
 *
 * @param command - 自定义命令标识（可选） / Custom command identifier (optional)
 * @param message - 传递给回调的消息数据（可选） / Message data passed to callback (optional)
 */
export type LayerCallback = (command?: any, message?: any) => void
