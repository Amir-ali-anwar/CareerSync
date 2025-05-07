import { StatusCodes } from "http-status-codes";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import sendVerificationEmail from '../utils/sendVerificationEmail.js'
import crypto from 'crypto'
import User from '../models/User.js'

const register = async (req, res, next) => {
    const { name, email, password, lastName, location, city, role, phone } = req.body;
  
    if (!name || !email || !password || !lastName || !location || !city || !role || !phone) {
      throw new BadRequestError('Please provide all the values');
    }
  
    const isAlready = await User.findOne({ email });
    if (isAlready) {
      throw new BadRequestError('Email already exists');
    }
  
    const verificationToken = crypto.randomBytes(40).toString('hex');
  
    const user = await User.create({
      name,
      email,
      password,
      lastName,
      location,
      city,
      role,
      phone,
      verificationToken,
    });
  
    const origin = req.get('origin') || 'http://localhost:3000';
  
    await sendVerificationEmail({
      name: user.name,
      email: user.email,
      verificationToken: user.verificationToken,
      origin,
    });
  
    res.status(StatusCodes.CREATED).json({
      msg: 'Success! Please check your email to verify your account',
    });
  };
const login = async (req, res, next) => {

}

const updateUser = async (req, res, next) => {

}

export { register, login, updateUser };
