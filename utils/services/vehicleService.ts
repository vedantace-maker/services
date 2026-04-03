import api from '../api';

export type VehicleType = 'bike' | 'scooty';

export type Vehicle = {
    id: number;
    type: VehicleType;
    brand: string;
    model: string;
    year: string;
    registration: string;
    color: string;
};

export type VehiclePayload = Omit<Vehicle, 'id'>;

export async function getMyVehicles(): Promise<Vehicle[]> {
    const { data } = await api.get('/vehicles/');
    return Array.isArray(data) ? data : data.results ?? [];
}

export async function addVehicle(payload: VehiclePayload): Promise<Vehicle> {
    const { data } = await api.post('/vehicles/', payload);
    return data;
}

export async function updateVehicle(
    id: number,
    payload: Partial<VehiclePayload>
): Promise<Vehicle> {
    const { data } = await api.patch(`/vehicles/${id}/`, payload);
    return data;
}

export async function deleteVehicle(id: number): Promise<void> {
    await api.delete(`/vehicles/${id}/`);
}


// export async function getMyVehicles() {
//     const res = await api.get('/vehicles/my-vehicles/');
//     return res.data;
// }