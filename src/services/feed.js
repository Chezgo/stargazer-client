import api from './api';

export default {
  async getFeed(cursor = null, limit = 20) {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    const response = await api.get('/feed', { params });
    return response.data;
  },

  async getPhotoAssemblySnapshot(photoId) {
    const response = await api.get(`/photos/${photoId}/assembly`);
    return response.data;
  },

  async likePhoto(photoId) {
    const response = await api.put(`/photos/${photoId}/like`);
    return response.data;
  },

  async unlikePhoto(photoId) {
    const response = await api.delete(`/photos/${photoId}/like`);
    return response.data;
  },

  async likeAssembly(assemblyId) {
    const response = await api.put(`/assemblies/${assemblyId}/like`);
    return response.data;
  },

  async unlikeAssembly(assemblyId) {
    const response = await api.delete(`/assemblies/${assemblyId}/like`);
    return response.data;
  },

  async getComments(photoId, cursor = null, limit = 20) {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    const response = await api.get(`/photos/${photoId}/comments`, { params });
    return response.data;
  },

  async createComment(photoId, text, parentCommentId = null) {
    const payload = { text };
    if (parentCommentId) payload.parentCommentId = parentCommentId;
    const response = await api.post(`/photos/${photoId}/comments`, payload);
    return response.data;
  },

  async updateComment(commentId, text) {
    const response = await api.patch(`/comments/${commentId}`, { text });
    return response.data;
  },

  async deleteComment(commentId) {
    await api.delete(`/comments/${commentId}`);
  }
};
