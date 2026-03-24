import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from 'account-management-shared/middleware/authenticate';
import { requireRole } from 'account-management-shared/middleware/requireRole';
import { validate } from 'account-management-shared/middleware/validate';
import * as adminService from 'account-management-shared/services/adminService';

const router = Router();

/* ------------------------------------------------------------------ */
/*  All admin routes require authentication + admin role              */
/* ------------------------------------------------------------------ */

router.use(authenticate, requireRole('admin'));

/* ------------------------------------------------------------------ */
/*  Validation schemas                                                */
/* ------------------------------------------------------------------ */

const listUsersQuerySchema = z.object({
  query: z.string().optional(),
  role: z.enum(['member', 'admin']).optional(),
  status: z.enum(['active', 'disabled', 'suspended', 'withdrawn']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateStatusSchema = z.object({
  status: z.enum(['active', 'disabled', 'suspended']),
});

const addRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

/* ------------------------------------------------------------------ */
/*  GET /admin/users                                                  */
/* ------------------------------------------------------------------ */

router.get(
  '/users',
  validate(listUsersQuerySchema, 'query'),
  (req, res, next) => {
    try {
      const db = req.app.get('db');
      const result = adminService.listUsers(db, req.query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/* ------------------------------------------------------------------ */
/*  GET /admin/users/:userId                                          */
/* ------------------------------------------------------------------ */

router.get('/users/:userId', (req, res, next) => {
  try {
    const db = req.app.get('db');
    const detail = adminService.getUserDetail(db, req.params.userId);
    res.status(200).json(detail);
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  PATCH /admin/users/:userId                                        */
/* ------------------------------------------------------------------ */

router.patch(
  '/users/:userId',
  validate(updateStatusSchema),
  (req, res, next) => {
    try {
      const db = req.app.get('db');
      adminService.updateUserStatus(
        db,
        req.params.userId,
        req.body.status,
        req.user.userId,
      );
      // Return updated user detail
      const detail = adminService.getUserDetail(db, req.params.userId);
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  },
);

/* ------------------------------------------------------------------ */
/*  POST /admin/users/:userId/roles                                   */
/* ------------------------------------------------------------------ */

router.post(
  '/users/:userId/roles',
  validate(addRoleSchema),
  (req, res, next) => {
    try {
      const db = req.app.get('db');
      adminService.addRole(
        db,
        req.params.userId,
        req.body.role,
        req.user.userId,
      );
      // Return updated user detail
      const detail = adminService.getUserDetail(db, req.params.userId);
      res.status(200).json(detail);
    } catch (err) {
      next(err);
    }
  },
);

/* ------------------------------------------------------------------ */
/*  DELETE /admin/users/:userId/roles/:role                           */
/* ------------------------------------------------------------------ */

router.delete('/users/:userId/roles/:role', (req, res, next) => {
  try {
    const db = req.app.get('db');
    adminService.removeRole(
      db,
      req.params.userId,
      req.params.role,
      req.user.userId,
    );
    // Return updated user detail
    const detail = adminService.getUserDetail(db, req.params.userId);
    res.status(200).json(detail);
  } catch (err) {
    next(err);
  }
});

export default router;
