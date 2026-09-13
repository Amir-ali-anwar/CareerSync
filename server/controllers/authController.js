import { StatusCodes } from "http-status-codes";
import {
  attachCookiesToResponse,
  createTokenUser,
  sendVerificationEmail,
  sendPasswordResetEmail,
  isTokenValid,
  createJWT,
  hashToken,
  generateOtp,
  isPasswordBreached,
  revokeAllSessionsExcept,
  issueSession,
} from "../utils/index.js";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import crypto from "crypto";
import User from "../models/User.js";
import Token from "../models/Token.js";
import logger from "../utils/logger.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const TWO_FACTOR_PENDING_EXPIRY = "5m";

// Fire-and-forget: an account is fully created/updated in the database before this is
// called, so a slow or failing SMTP provider must never turn a successful registration/
// update into a client-visible 500, nor block the response waiting on outbound email.
// Failures are logged server-side (with the user's own resend-verification endpoint as
// the recovery path) instead of surfacing as a request error.
const dispatchVerificationEmail = (context, params) => {
  sendVerificationEmail(params).catch((error) => {
    logger.error("verification_email_failed", {
      context,
      userId: String(params.userId || ""),
      message: error.message,
    });
  });
};

// Same fire-and-forget reasoning as dispatchVerificationEmail above.
const dispatchPasswordResetEmail = (context, params) => {
  sendPasswordResetEmail(params).catch((error) => {
    logger.error("password_reset_email_failed", {
      context,
      userId: String(params.userId || ""),
      message: error.message,
    });
  });
};

// Constant-time string comparison for secret tokens (verification tokens, etc.) so
// response timing can't be used to guess a valid value character-by-character.
const timingSafeEqualStrings = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

const CLEARED_COOKIE_NAMES = ["accessToken", "refreshToken", "refreshTokenSecret"];
const clearAuthCookies = (res) => {
  CLEARED_COOKIE_NAMES.forEach((name) => {
    res.cookie(name, "logout", {
      httpOnly: true,
      expires: new Date(Date.now() + 1000),
      secure: process.env.NODE_ENV === "production",
      signed: true,
    });
  });
};

const getTrustedFrontendOrigin = () =>
  process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000";

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - lastName
 *               - location
 *               - role
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's first name
 *                 example: John
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User's password (min 8 chars, at least one letter and one number)
 *                 example: password123
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *                 example: Doe
 *               location:
 *                 type: object
 *                 required:
 *                   - country
 *                   - city
 *                 properties:
 *                   country:
 *                     type: string
 *                     description: User's country
 *                     example: United States
 *                   city:
 *                     type: string
 *                     description: User's city
 *                     example: New York
 *               role:
 *                 type: string
 *                 enum: [talent, employer]
 *                 description: User's role
 *                 example: talent
 *               phone:
 *                 type: string
 *                 description: User's phone number
 *                 example: +1234567890
 *               companyName:
 *                 type: string
 *                 description: Company name (required for employer role)
 *                 example: Tech Corp
 *               companySize:
 *                 type: string
 *                 description: Company size (required for employer role)
 *                 example: 51-200
 *               industry:
 *                 type: string
 *                 description: Industry (required for employer role)
 *                 example: Technology
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Success! Please check your email to verify your account
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const register = async (req, res) => {
  const {
    name,
    email,
    password,
    lastName,
    location,
    role,
    phone,
    companyName,
    companySize,
    industry,
  } = req.body;

  if (
    !name ||
    !email ||
    !password ||
    !lastName ||
    !location?.country ||
    !location?.city ||
    !role ||
    !phone
  ) {
    throw new BadRequestError("Please provide all the values");
  }
  if (role === "employer") {
    if (!companyName || !companySize || !industry) {
      throw new BadRequestError(
        "Employer must provide companyName, companySize, and industry"
      );
    }
  }
  const isAlready = await User.findOne({ email });
  if (isAlready) {
    throw new BadRequestError("Email already exists");
  }

  if (await isPasswordBreached(password)) {
    throw new BadRequestError(
      "This password has appeared in a data breach. Please choose a different one."
    );
  }

  const verificationToken = generateOtp();
  const verificationTokenExpires = new Date(Date.now() + OTP_EXPIRY_MS);

  const userData = {
    name,
    email,
    password,
    lastName,
    location, // already in { country, city } format
    role,
    phone,
    verificationToken,
    verificationTokenExpires,
    ...(role === "employer" && { companyName, companySize, industry }),
  };

  const user = await User.create(userData);

  const origin = getTrustedFrontendOrigin();

  dispatchVerificationEmail("register", {
    userId: user._id,
    name: user.name,
    email: user.email,
    otp: user.verificationToken,
    origin,
  });

  res.status(StatusCodes.CREATED).json({
    msg: "Success! Please check your email to verify your account",
  });
};

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: password123
 *     responses:
 *       200:
 *         description: >
 *           User logged in successfully, OR (if the account has 2FA enabled) a
 *           `{ requiresTwoFactor: true, tempToken }` response - POST tempToken plus a
 *           TOTP/backup code to /api/v1/auth/2fa/login to complete the sign-in.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokenUser:
 *                   $ref: '#/components/schemas/User'
 *                 requiresTwoFactor: { type: boolean }
 *                 tempToken: { type: string }
 *         headers:
 *           Set-Cookie:
 *             description: JWT tokens set in httpOnly cookies (omitted when requiresTwoFactor is true)
 *             schema:
 *               type: string
 *               example: accessToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure
 *       400:
 *         description: Bad request - missing credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid credentials, unverified email, or account locked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError("Please provide email and password");
  }
  const user = await User.findOne({ email }).select("+password +twoFactorSecret +twoFactorBackupCodes");

  if (!user) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }


  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
      user.failedLoginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    throw new UnAuthenticatedError("Invalid Credentials");
  }
  if (!user.isVerified) {
    throw new UnAuthenticatedError("Please verify your email");
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save({ validateBeforeSave: false });

  // Some clients/proxies omit User-Agent entirely - default it so the required schema
  // field is always satisfied instead of silently persisting an invalid Token document.
  const userAgent = req.headers["user-agent"] || "unknown";
  const ip = req.ip;

  if (user.twoFactorEnabled) {
    const tempToken = createJWT({
      payload: { twoFactorPending: { userId: user._id.toString() } },
      expiresIn: TWO_FACTOR_PENDING_EXPIRY,
      secret: process.env.JWT_SECRET,
    });
    return res.status(StatusCodes.OK).json({ requiresTwoFactor: true, tempToken });
  }

  const tokenUser = await issueSession({ res, user, ip, userAgent });

  res.status(StatusCodes.OK).json({ tokenUser });
};

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Rotate the refresh token and issue a new access token
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tokenUser:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - missing, expired, or reused refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const refreshUserToken = async (req, res) => {
  const { refreshToken: refreshTokenCookie, refreshTokenSecret: refreshSecretCookie } =
    req.signedCookies;
  if (!refreshTokenCookie || !refreshSecretCookie) {
    throw new UnAuthenticatedError("Authentication Invalid");
  }

  let payload;
  try {
    // The refresh JWT only proves identity + expiry; it never carries the opaque
    // secret itself, and is verified against its own dedicated secret so a leaked
    // access-token signing key alone can't be used to mint a refresh session.
    payload = isTokenValid(refreshTokenCookie, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new UnAuthenticatedError("Authentication Invalid");
  }

  // Looked up by the specific session's own _id (embedded in the refresh JWT at issuance)
  // rather than by user, since a user can now have several concurrent sessions/devices.
  const existingToken = await Token.findById(payload.tokenId);
  const incomingHash = hashToken(refreshSecretCookie);

  if (
    !existingToken ||
    !existingToken.isValid ||
    existingToken.user.toString() !== payload.userId ||
    existingToken.refreshToken !== incomingHash
  ) {
    // Reuse of an already-rotated or revoked token: treat as compromised and revoke the session.
    if (existingToken) {
      existingToken.isValid = false;
      await existingToken.save();
    }
    throw new UnAuthenticatedError("Authentication Invalid");
  }

  const user = await User.findById(payload.userId);
  if (!user) {
    existingToken.isValid = false;
    await existingToken.save();
    throw new UnAuthenticatedError("Authentication Invalid");
  }

  const newRefreshTokenSecret = crypto.randomBytes(40).toString("hex");
  existingToken.refreshToken = hashToken(newRefreshTokenSecret);
  await existingToken.save();

  const tokenUser = createTokenUser(user);
  attachCookiesToResponse({
    res,
    user: tokenUser,
    refreshTokenSecret: newRefreshTokenSecret,
    tokenId: existingToken._id,
  });
  res.status(StatusCodes.OK).json({ tokenUser });
};

/**
 * @swagger
 * /api/v1/auth/updateUser:
 *   patch:
 *     summary: Update user profile
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's new email address
 *                 example: john.doe@example.com
 *               name:
 *                 type: string
 *                 description: User's new first name
 *                 example: John
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const updateUser = async (req, res, next) => {
  const { email, name } = req.body;
  if (!email || !name) {
    throw new BadRequestError("Please provide all values");
  }
  const user = await User.findOne({ _id: req.user.userId });

  const emailChanged = email.toLowerCase() !== user.email;
  if (emailChanged) {
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      throw new BadRequestError("Email already exists");
    }
  }

  user.email = email;
  user.name = name;

  if (emailChanged) {
    // Changing email means the new address hasn't been proven, so re-verification is required.
    user.isVerified = false;
    user.verificationToken = generateOtp();
    user.verificationTokenExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.verificationAttempts = 0;
  }

  await user.save();

  if (emailChanged) {
    const origin = getTrustedFrontendOrigin();
    dispatchVerificationEmail("updateUser", {
      userId: user._id,
      name: user.name,
      email: user.email,
      otp: user.verificationToken,
      origin,
    });
  }

  const tokenUser = createTokenUser(user);
  // Only the access-token cookie needs refreshing here (it carries the profile fields
  // that just changed); the existing refresh session is left untouched.
  attachCookiesToResponse({ res, user: tokenUser });
  res.status(StatusCodes.OK).json({
    user: tokenUser,
    ...(emailChanged && { msg: "Email changed. Please verify your new email address." }),
  });
};

/**
 * @swagger
 * /api/v1/auth/updateUserPassword:
 *   patch:
 *     summary: Update user password
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (min 8 chars, at least one letter and one number)
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Success! Password Updated.
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const updateUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new UnAuthenticatedError("Please provide both values");
  }
  if (oldPassword === newPassword) {
    throw new BadRequestError("New password must be different from the old password");
  }
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
    throw new BadRequestError("Password must be at least 8 characters and contain a letter and a number");
  }
  const user = await User.findOne({ _id: req.user.userId }).select("+password");
  const isPasswordCorrect = await user.comparePassword(oldPassword);

  if (!isPasswordCorrect) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }

  if (await isPasswordBreached(newPassword)) {
    throw new BadRequestError(
      "This password has appeared in a data breach. Please choose a different one."
    );
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  res.status(StatusCodes.OK).json({ msg: "Success! Password Updated." });
};

/**
 * @swagger
 * /api/v1/auth/showCurrentUser:
 *   get:
 *     summary: Get current user information
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const showCurrentUser = async (req, res) => {
  res.status(StatusCodes.OK).json({ user: req.user });
};


/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: john.doe@example.com
 *     responses:
 *       200:
 *         description: Verification email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Verification email resent. Please check your inbox.
 *       400:
 *         description: Bad request - validation error or account already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - no account found with this email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const resendVerificationToken = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError("Please provide email");
  }
  const user = await User.findOne({ email });

  if (!user) {
    throw new UnAuthenticatedError("No account found with this email");
  }

  if (user.isVerified) {
    throw new BadRequestError("Account already verified");
  }

  const verificationToken = generateOtp();
  const verificationTokenExpires = new Date(Date.now() + OTP_EXPIRY_MS);

  user.verificationToken = verificationToken;
  user.verificationTokenExpires = verificationTokenExpires;
  user.verificationAttempts = 0;

  await user.save({ validateBeforeSave: false });

  const origin = getTrustedFrontendOrigin();
  dispatchVerificationEmail("resendVerificationToken", {
    userId: user._id,
    name: user.name,
    email: user.email,
    otp: verificationToken,
    origin,
  });

  res.status(StatusCodes.OK).json({
    msg: "Verification email resent. Please check your inbox.",
  });

};

/**
 * @swagger
 * /api/v1/auth/verify-Email:
 *   post:
 *     summary: Verify user email address using an emailed 6-digit OTP code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, format: email, example: john.doe@example.com }
 *               otp: { type: string, description: 6-digit code emailed to the user, example: "123456" }
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: Email Verified
 *       401:
 *         description: Unauthorized - invalid token or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new BadRequestError("Please provide email and verification code");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnAuthenticatedError("Please provide valid email address");
  }
  if (!user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
    throw new UnAuthenticatedError("Verification code expired. Please request a new one.");
  }
  if (user.verificationAttempts >= MAX_OTP_ATTEMPTS) {
    throw new UnAuthenticatedError("Too many incorrect attempts. Please request a new code.");
  }
  if (!timingSafeEqualStrings(otp, user.verificationToken)) {
    user.verificationAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw new UnAuthenticatedError("Verification Failed");
  }
  user.isVerified = true;
  user.verified = Date.now();
  user.verificationToken = "";
  user.verificationTokenExpires = null;
  user.verificationAttempts = 0;
  await user.save();
  res.status(StatusCodes.OK).json({ msg: "Email Verified" });
};

/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Logout user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: user logged out!
 *         headers:
 *           Set-Cookie:
 *             description: JWT tokens cleared from cookies
 *             schema:
 *               type: string
 *               example: accessToken=logout; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT
 */
const logout = async (req, res) => {
  const { refreshToken: refreshTokenCookie } = req.signedCookies;
  if (refreshTokenCookie) {
    try {
      const payload = isTokenValid(refreshTokenCookie, process.env.JWT_REFRESH_SECRET);
      // Revoke only THIS session - a user may be logged in on other devices too.
      await Token.findByIdAndUpdate(payload.tokenId, { isValid: false });
    } catch (error) {
      // Refresh token already invalid/expired - nothing server-side to revoke.
    }
  }

  clearAuthCookies(res);

  res.status(StatusCodes.OK).json({ msg: "user logged out!" });
};

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset link
 *     description: >
 *       Always responds 200 with a generic message, whether or not an account exists for
 *       the given email - this prevents using the endpoint to enumerate registered
 *       emails. If an account does exist, a reset link (valid 10 minutes) is emailed
 *       fire-and-forget, same pattern as the verification email.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Generic acknowledgement (see description)
 *       400:
 *         description: Bad request - missing email
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new BadRequestError("Please provide email");
  }

  const user = await User.findOne({ email });
  if (user) {
    const resetToken = generateOtp();
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = new Date(Date.now() + OTP_EXPIRY_MS);
    user.passwordResetAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const origin = getTrustedFrontendOrigin();
    dispatchPasswordResetEmail("forgotPassword", {
      userId: user._id,
      name: user.name,
      email: user.email,
      otp: resetToken,
      origin,
    });
  }

  res.status(StatusCodes.OK).json({
    msg: "If an account exists for that email, a password reset link has been sent.",
  });
};

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Complete a password reset using the emailed 6-digit OTP code
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email: { type: string, format: email }
 *               otp: { type: string, description: 6-digit code emailed to the user, example: "123456" }
 *               newPassword: { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Bad request - missing values
 *       401:
 *         description: Unauthorized - invalid or expired reset code
 */
const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    throw new BadRequestError("Please provide all values");
  }

  const user = await User.findOne({ email });
  if (!user || !user.passwordResetToken || !user.passwordResetTokenExpires) {
    throw new UnAuthenticatedError("Invalid or expired reset code");
  }
  if (user.passwordResetTokenExpires < new Date()) {
    throw new UnAuthenticatedError("Reset code expired. Please request a new one.");
  }
  if (user.passwordResetAttempts >= MAX_OTP_ATTEMPTS) {
    throw new UnAuthenticatedError("Too many incorrect attempts. Please request a new code.");
  }
  if (!timingSafeEqualStrings(otp, user.passwordResetToken)) {
    user.passwordResetAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw new UnAuthenticatedError("Invalid or expired reset code");
  }

  if (await isPasswordBreached(newPassword)) {
    throw new BadRequestError(
      "This password has appeared in a data breach. Please choose a different one."
    );
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;
  user.passwordResetAttempts = 0;
  await user.save();

  // A password reset should log out every existing session, the same way changing your
  // password anywhere else should - revoke every session for this user.
  await revokeAllSessionsExcept(user._id);

  res.status(StatusCodes.OK).json({ msg: "Password reset successful. Please sign in with your new password." });
};

/**
 * @swagger
 * /api/v1/auth/me:
 *   delete:
 *     summary: Permanently delete the authenticated user's account
 *     description: >
 *       Requires re-entering the current password as confirmation. Deleting the user
 *       triggers the existing User model cascade hook (removes an employer's jobs, or a
 *       talent's job applications).
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Bad request - missing password
 *       401:
 *         description: Unauthorized - invalid password or invalid token
 */
const deleteAccount = async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw new BadRequestError("Please provide your password to confirm account deletion");
  }

  const user = await User.findOne({ _id: req.user.userId }).select("+password");
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }

  // findOneAndDelete (not deleteOne) is required here - the User model's cascade hook
  // (cleans up an employer's jobs or a talent's applications) is registered on the
  // "findOneAndDelete" mongoose middleware event specifically.
  await User.findOneAndDelete({ _id: req.user.userId });
  await revokeAllSessionsExcept(req.user.userId);

  clearAuthCookies(res);
  res.status(StatusCodes.OK).json({ msg: "Account deleted" });
};

export {
  register,
  login,
  updateUser,
  logout,
  showCurrentUser,
  verifyEmail,
  updateUserPassword,
  resendVerificationToken,
  refreshUserToken,
  forgotPassword,
  resetPassword,
  deleteAccount,
};
