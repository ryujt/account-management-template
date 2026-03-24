import {
  getInfo,
  updateInfo,
  changePassword,
  listSessions,
  revokeSession,
  withdraw,
} from '../services/userService.mjs';
import { authenticate } from '../middleware/auth.mjs';
import {
  validateDisplayName,
  validatePassword,
  parseBody,
} from '../middleware/validation.mjs';
import { success } from '../adapters/response.mjs';
import { BadRequestError, NotFoundError } from '../utils/errors.mjs';

export async function handleUser(event, method, pathParts, origin) {
  const user = authenticate(event);
  const subPath = pathParts.slice(1).join('/');

  if (method === 'GET' && subPath === 'info') {
    const result = await getInfo(user.userId);
    return success(result, 200, origin);
  }

  if (method === 'PATCH' && subPath === 'info') {
    const body = parseBody(event);
    const displayName = validateDisplayName(body.displayName);
    const result = await updateInfo(user.userId, { displayName });
    return success(result, 200, origin);
  }

  if (method === 'POST' && subPath === 'changepw') {
    const body = parseBody(event);
    const currentPassword = validatePassword(body.currentPassword, 'currentPassword');
    const newPassword = validatePassword(body.newPassword, 'newPassword');
    const result = await changePassword(user.userId, {
      currentPassword,
      newPassword,
    });
    return success(result, 200, origin);
  }

  if (method === 'GET' && subPath === 'sessions') {
    const result = await listSessions(user.userId, user.sessionId);
    return success(result, 200, origin);
  }

  // DELETE /user/sessions/:sessionId
  if (method === 'DELETE' && pathParts[1] === 'sessions' && pathParts[2]) {
    const sessionId = pathParts[2];
    const result = await revokeSession(user.userId, sessionId, user.sessionId);
    return success(result, 200, origin);
  }

  if (method === 'POST' && subPath === 'withdraw') {
    const body = parseBody(event);
    if (!body.password) throw new BadRequestError('Password is required');
    const password = validatePassword(body.password);
    const result = await withdraw(user.userId, { password });
    return success(result, 200, origin);
  }

  throw new NotFoundError(`Unknown user route: ${method} /user/${subPath}`);
}
