import { Router } from "express";
import {authorizePermissions} from "../middlewares/permissions.js";

import {getAllTalents} from '../controllers/talentController.js'
const router = Router();

router
  .route("/")
  .get(authorizePermissions("employer"), getAllTalents);

export default router;
