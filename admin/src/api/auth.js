import client from './client';

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function refresh() {
  const { data } = await client.post('/auth/refresh');
  return data;
}

export async function logout() {
  const { data } = await client.post('/auth/logout');
  return data;
}
