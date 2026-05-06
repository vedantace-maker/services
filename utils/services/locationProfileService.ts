import api from '../api';

export interface LocationProfile {
    id: number;
    type: 'home' | 'office' | 'other';
    label: string;
    address: string;
    latitude: number;
    longitude: number;
    created_at?: string;
    updated_at?: string;
}

export type CreateLocationProfile = Omit<LocationProfile, 'id' | 'created_at' | 'updated_at'>;

export const locationProfileService = {
    getAll: (): Promise<LocationProfile[]> =>
        api.get('/location-profile/').then((r) => {
            const data = r.data;
            if (Array.isArray(data)) return data as LocationProfile[];
            if (Array.isArray(data?.results)) return data.results as LocationProfile[];
            return [] as LocationProfile[];
        }),

    create: (data: CreateLocationProfile): Promise<LocationProfile> =>
        api.post<LocationProfile>('/location-profile/', data).then((r) => r.data),

    update: (id: number, data: Partial<CreateLocationProfile>): Promise<LocationProfile> =>
        api.put<LocationProfile>(`/location-profile/${id}/`, data).then((r) => r.data),

    remove: (id: number): Promise<void> =>
        api.delete(`/location-profile/${id}/`).then(() => undefined),
};