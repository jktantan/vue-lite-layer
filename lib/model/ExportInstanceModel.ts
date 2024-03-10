export interface ExportInstance {
  id: string
  group: string
  uniqueGroup: string
  close: () => boolean
  top: () => void
  max: () => void
  restore: () => void
}
