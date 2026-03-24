import client from './client';

export async function register(email, password, displayName) {
  const { data } = await client.post('/auth/register', {
    email,
    password,
    displayName,
  });
  return data;
}

export async function login(email, password) {
  const { data } = await client.post('/auth/login', { email, password });
  return data;
}

export async function logout() {
  const { data } = await client.post('/auth/logout');
  return data;
}

export async function refresh() {
  const { data } = await client.post('/auth/refresh');
  return data;
}

export async function resetPassword(newPassword) {
  const { data } = await client.post('/auth/password/reset', { newPassword });
  return data;
}
