import { useState } from 'react'
import { IOC, IOCType } from '../types'
import { iocService } from '../services/iocService'

const DEFAULT_FORM_DATA = {
  type: 'IP_ADDRESS' as IOCType,
  value: '',
  timestamp: new Date().toISOString().slice(0, 16),
  context: '',
  source: '',
}

interface UseIOCFormOptions {
  projectId: string | undefined
  iocs: IOC[]
  setIOCs: (iocs: IOC[]) => void
  onError?: (message: string) => void
}

export function useIOCForm({ projectId, iocs, setIOCs, onError }: UseIOCFormOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIOC, setEditingIOC] = useState<IOC | null>(null)
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)

  const reportError = (message: string) => {
    if (onError) onError(message)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId) return

    try {
      if (editingIOC) {
        const updatedIOC = await iocService.update(editingIOC.id, formData)
        setIOCs(iocs.map(ioc => ioc.id === editingIOC.id ? updatedIOC : ioc))
      } else {
        const newIOC = await iocService.create({ projectId, ...formData })
        setIOCs([...iocs, newIOC])
      }
      closeModal()
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : `Failed to ${editingIOC ? 'update' : 'create'} IOC`
      reportError(msg)
    }
  }

  const handleEdit = (ioc: IOC) => {
    setEditingIOC(ioc)
    setFormData({
      type: ioc.type,
      value: ioc.value,
      timestamp: new Date(ioc.timestamp).toISOString().slice(0, 16),
      context: ioc.context || '',
      source: ioc.source || '',
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (ioc: IOC) => {
    if (!confirm(`Are you sure you want to delete this IOC: ${ioc.value}?`)) return

    try {
      await iocService.delete(ioc.id)
      setIOCs(iocs.filter(i => i.id !== ioc.id))
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete IOC'
      reportError(msg)
    }
  }

  const handleAddNew = () => {
    setEditingIOC(null)
    setFormData({
      ...DEFAULT_FORM_DATA,
      timestamp: new Date().toISOString().slice(0, 16),
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIOC(null)
    setFormData({
      ...DEFAULT_FORM_DATA,
      timestamp: new Date().toISOString().slice(0, 16),
    })
  }

  return {
    isModalOpen,
    editingIOC,
    formData,
    setFormData,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleAddNew,
    closeModal,
  }
}
