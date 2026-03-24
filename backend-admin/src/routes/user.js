import { Router } from 'express';
import { authenticate } from 'account-management-shared/middleware/authenticate';
import * as userService from 'account-management-shared/services/userService';

const router = Router();

/* ------------------------------------------------------------------ */
/*  GET /user/info                                                    */
/* ------------------------------------------------------------------ */

router.get('/info', authenticate, (req, res, next) => {
  try {
    const db = req.app.get('db');
    const profile = userService.getProfile(db, req.user.userId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
