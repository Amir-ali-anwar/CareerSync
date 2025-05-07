import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";

const register = async (req, res, next) => {
    const {name,email,password,lastName,location,city,role,phone}= req.body
    if(name||email||password||lastName||location||city||role||phone){
        throw new BadRequestError("Please provide all the values")
    }
}



export { register, login, updateUser };
