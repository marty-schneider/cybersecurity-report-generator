import { create } from 'zustand'
import { IOC, TTPMapping } from '../types'

interface IOCState {
  iocs: IOC[]
  ttps: TTPMapping[]
  isAnalyzing: boolean
  analysisProgress: number
  setIOCs: (iocs: IOC[]) => void
  addIOC: (ioc: IOC) => void
  updateIOC: (id: string, ioc: Partial<IOC>) => void
  deleteIOC: (id: string) => void
  setTTPs: (ttps: TTPMapping[]) => void
  setAnalyzing: (isAnalyzing: boolean) => void
  setAnalysisProgress: (progress: number) => void
}

export const useIOCStore = create<IOCState>((set) => ({
  iocs: [],
  ttps: [],
  isAnalyzing: false,
  analysisProgress: 0,
  setIOCs: (iocs) => set({ iocs }),
  addIOC: (ioc) => set((state) => ({ iocs: [...state.iocs, ioc] })),
  updateIOC: (id, updatedData) =>
    set((state) => ({
      iocs: state.iocs.map((ioc) => (ioc.id === id ? { ...ioc, ...updatedData } : ioc)),
    })),
  deleteIOC: (id) => set((state) => ({ iocs: state.iocs.filter((ioc) => ioc.id !== id) })),
  setTTPs: (ttps) => set({ ttps }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),
}))
