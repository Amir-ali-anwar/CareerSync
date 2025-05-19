import OrganizationModal from '../models/OrganizationModal.js'
import { StatusCodes } from "http-status-codes";
import {BadRequestError} from "../errors/index.js";
import {checkPermissions} from "../middlewares/permissions.js";

export const createOrganization= async(req,res)=>{
const {name,description,industry,companySize,headquarters,about}= req.body
if (
  !name?.trim() ||
  !description?.trim() ||
  !industry?.trim() ||
  !companySize?.trim() ||
  !headquarters?.city?.trim() ||
  !headquarters?.country?.trim() ||
  !about?.trim()
 
) {
  throw new Error("All required organization fields must be provided");
}

}


