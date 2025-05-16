import UserModal from "../models/User.js";
import JobApplicationModal from "../models/JobApplicationModal.js";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from "../errors/index.js";
import { checkPermissions } from "../middlewares/permissions.js";

export const getAllTalents =async (req,res) => {
    const talents= await UserModal.find().select('talent -employer')
    console.log({talents});
     res.status(StatusCodes.OK).json(talents);
      
};
