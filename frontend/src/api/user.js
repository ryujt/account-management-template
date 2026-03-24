import client from './client';

export async function getProfile() {
  const { data } = await client.get('/user/info');
  return data;
}

export async function updateProfile(updates) {
  const { data } = await client.patch('/user/info', updates);
  return data;
}

export async function changePassword(currentPassword, newPassword) {
  const { data } = await client.post('/user/changepw', {
    currentPassword,
    newPassword,
  });
  return data;
}

export async function getSessions() {
  const { data } = await client.get('/user/sessions');
  return data;
}

export async function deleteSession(sessionId) {
  const { data } = await client.delete(`/user/sessions/${sessionId}`);
  return data;
}

export async function withdraw(password) {
  const { data } = await client.post('/user/withdraw', { password });
  return data;
}
