import {
  listUsers,
  getUserDetail,
  updateUserStatus,
  addRole,
  removeRole,
} from '../services/adminService.mjs';
import { authenticate, requireRole } from '../middleware/auth.mjs';
import {
  validateStatus,
  validateRole,
  parseBody,
  parseQueryParams,
} from '../middleware/validation.mjs';
import { success } from '../adapters/response.mjs';
import { NotFoundError } from '../utils/errors.mjs';

export async function handleAdmin(event, method, pathParts, origin) {
  const user = authenticate(event);
  requireRole(user, 'admin');

  // GET /admin/users
  if (method === 'GET' && pathParts[1] === 'users' && !pathParts[2]) {
    const params = parseQueryParams(event);
    const result = await listUsers({
      queryStr: params.query,
      role: params.role,
      status: params.status,
      cursor: params.cursor,
      limit: params.limit,
    });
    return success(result, 200, origin);
  }

  // GET /admin/users/:userId
  if (method === 'GET' && pathParts[1] === 'users' && pathParts[2] && !pathParts[3]) {
    const result = await getUserDetail(pathParts[2]);
    return success(result, 200, origin);
  }

  // PATCH /admin/users/:userId
  if (method === 'PATCH' && pathParts[1] === 'users' && pathParts[2] && !pathParts[3]) {
    const body = parseBody(event);
    const status = validateStatus(body.status);
    const result = await updateUserStatus(pathParts[2], status, user.userId);
    return success(result, 200, origin);
  }

  // POST /admin/users/:userId/roles
  if (
    method === 'POST' &&
    pathParts[1] === 'users' &&
    pathParts[2] &&
    pathParts[3] === 'roles' &&
    !pathParts[4]
  ) {
    const body = parseBody(event);
    const role = validateRole(body.role);
    const result = await addRole(pathParts[2], role, user.userId);
    return success(result, 200, origin);
  }

  // DELETE /admin/users/:userId/roles/:role
  if (
    method === 'DELETE' &&
    pathParts[1] === 'users' &&
    pathParts[2] &&
    pathParts[3] === 'roles' &&
    pathParts[4]
  ) {
    const role = validateRole(pathParts[4]);
    const result = await removeRole(pathParts[2], role, user.userId);
    return success(result, 200, origin);
  }

  const subPath = pathParts.slice(1).join('/');
  throw new NotFoundError(`Unknown admin route: ${method} /admin/${subPath}`);
}
