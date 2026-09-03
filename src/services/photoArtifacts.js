import api from './api';

const cleanObject = ({ id, photoId, createdAt, updatedAt, ...fields }) => fields;

export default {
  async getCaptures(photoId) {
    const { data } = await api.get(`/photos/${photoId}/captures`);
    return data;
  },
  async createCapture(photoId, payload) {
    const { data } = await api.post(`/photos/${photoId}/captures`, payload);
    return data;
  },
  async updateCapture(captureId, payload) {
    const { data } = await api.put(`/photo-captures/${captureId}`, payload);
    return data;
  },
  async deleteCapture(captureId) {
    await api.delete(`/photo-captures/${captureId}`);
  },
  async getObjects(photoId) {
    const { data } = await api.get(`/photos/${photoId}/objects`);
    return data;
  },
  async replaceObjects(photoId, objects) {
    const { data } = await api.put(`/photos/${photoId}/objects`, objects.map(cleanObject));
    return data;
  }
};
