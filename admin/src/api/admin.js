import client from './client';

export async function listUsers(params = {}) {
  const { data } = await client.get('/admin/users', { params });
  return data;
}

export async function getUser(userId) {
  const { data } = await client.get(`/admin/users/${userId}`);
  return data;
}

export async function updateUserStatus(userId, status) {
  const { data } = await client.patch(`/admin/users/${userId}`, { status });
  return data;
}

export async function addRole(userId, role) {
  const { data } = await client.post(`/admin/users/${userId}/roles`, { role });
  return data;
}

export async function removeRole(userId, role) {
  const { data } = await client.delete(`/admin/users/${userId}/roles/${role}`);
  return data;
}
