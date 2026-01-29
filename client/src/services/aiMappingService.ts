import api from './apiClient'

export const aiMappingService = {
    mapColumns: async (headers: string[], sampleData: any[]): Promise<Record<string, string | null>> => {
        const response = await api.post('/iocs/map-columns', {
            headers,
            sampleData,
        })
        return response.data
    },
}
