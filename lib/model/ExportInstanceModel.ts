export interface ExportInstance {
  id: string
  uniqueGroup: string
  close: () => boolean
  top: () => void
  max: () => void
  restore: () => void
}
