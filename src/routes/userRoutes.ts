import express from 'express';
import UsersController from '../controllers/users.controller';
import { authenticateUser } from '../middlewares/authenticateUser';
import { WrapAsync } from '../middlewares/wrapAsync';

const router = express.Router();

router.get('/users', WrapAsync(authenticateUser), WrapAsync(UsersController.getAllUsers));
router.get('/users/settings', WrapAsync(authenticateUser), WrapAsync(UsersController.getUserSettings));
router.put('/users/settings', WrapAsync(authenticateUser), WrapAsync(UsersController.updateUserSettings));

export default router;
