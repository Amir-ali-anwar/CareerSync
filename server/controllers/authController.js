import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import User from '../models/User.js'
const register = async (req, res, next) => {
    const {name,email,password,lastName,location,city,role,phone}= req.body
    if(name||email||password||lastName||location||city||role||phone){
        throw new BadRequestError("Please provide all the values")
    }
    const isAlready= User.findOne(email)
    if(isAlready){
        throw new BadRequestError("Email Already exist")
    }
    const verificationToken= crypto.randomBytes(40).toString(80)
    const user= await user.create({name,email,password,lastName,location,city,phone,verificationToken})
    await sendVerificationEmail({  name: user.name,
        email: user.email,
        verificationToken: user.verificationToken,
        origin});
      res.status(StatusCodes.CREATED).json({  msg: 'Success! Please check your email to verify account'});
  
}

const login = async (req, res, next) => {

}

const updateUser = async (req, res, next) => {

}

export { register, login, updateUser };
