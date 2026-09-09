import { StatusCodes } from "http-status-codes";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { authenticator } from "otplib";
import { BadRequestError, UnAuthenticatedError } from "../errors/index.js";
import { isTokenValid, issueSession, revokeAllSessionsExcept, getCurrentTokenId } from "../utils/index.js";
import User from "../models/User.js";

const TOTP_ISSUER = "CareerSync";
const BACKUP_CODE_COUNT = 8;

// Tolerate +/- one 30s period either side of the current one, to absorb minor clock
// drift between the server and the user's phone.
authenticator.options = { window: 1 };

const generateBackupCodes = () =>
  Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });

/**
 * @swagger
 * /api/v1/auth/2fa/setup:
 *   post:
 *     summary: Begin 2FA setup - generates a TOTP secret and its QR code
 *     description: >
 *       Does NOT enable 2FA yet - the secret is stored but twoFactorEnabled stays false
 *       until the user proves they've correctly added it to an authenticator app via
 *       POST /2fa/verify-setup.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Secret generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCodeDataUrl: { type: string, description: data:image/png;base64,... QR code }
 *                 secret: { type: string, description: Manual-entry fallback for the secret }
 *     requestBody:
 *       description: Required only when 2FA is already enabled, to re-authenticate before replacing the active secret.
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password: { type: string }
 */
const setupTwoFactor = async (req, res) => {
  const user = await User.findById(req.user.userId).select("+password");

  // Re-enrolling over an already-active secret is equivalent to a security downgrade
  // (a hijacked session could otherwise plant a new TOTP secret the real owner never
  // sees) - require the same password re-entry as disableTwoFactor before allowing it.
  if (user.twoFactorEnabled) {
    const { password } = req.body;
    if (!password) {
      throw new BadRequestError("Please provide your password to confirm");
    }
    if (!(await user.comparePassword(password))) {
      throw new UnAuthenticatedError("Invalid Credentials");
    }
  }

  const secret = authenticator.generateSecret();
  const uri = authenticator.keyuri(user.email, TOTP_ISSUER, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(uri);

  user.twoFactorSecret = secret;
  await user.save({ validateBeforeSave: false });

  res.status(StatusCodes.OK).json({ qrCodeDataUrl, secret });
};

/**
 * @swagger
 * /api/v1/auth/2fa/verify-setup:
 *   post:
 *     summary: Confirm 2FA setup with a code from the authenticator app
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: >
 *           2FA enabled. backupCodes are shown ONCE - the client must display them for
 *           the user to save; they cannot be retrieved again.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg: { type: string }
 *                 backupCodes: { type: array, items: { type: string } }
 *       400:
 *         description: Bad request - no setup in progress or invalid code
 */
const verifyTwoFactorSetup = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw new BadRequestError("Please provide the code from your authenticator app");
  }

  const user = await User.findById(req.user.userId).select("+twoFactorSecret");
  if (!user.twoFactorSecret) {
    throw new BadRequestError("No 2FA setup in progress. Call /2fa/setup first.");
  }

  if (!authenticator.verify({ token, secret: user.twoFactorSecret })) {
    throw new BadRequestError("Invalid code. Please try again.");
  }

  const backupCodes = generateBackupCodes();
  const hashedCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

  user.twoFactorEnabled = true;
  user.twoFactorBackupCodes = hashedCodes;
  await user.save({ validateBeforeSave: false });

  res.status(StatusCodes.OK).json({
    msg: "Two-factor authentication enabled.",
    backupCodes,
  });
};

/**
 * @swagger
 * /api/v1/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA (requires re-entering the current password)
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
 *         description: 2FA disabled
 */
const disableTwoFactor = async (req, res) => {
  const { password } = req.body;
  if (!password) {
    throw new BadRequestError("Please provide your password to confirm");
  }

  const user = await User.findById(req.user.userId).select("+password");
  if (!(await user.comparePassword(password))) {
    throw new UnAuthenticatedError("Invalid Credentials");
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorBackupCodes = undefined;
  await user.save({ validateBeforeSave: false });

  // Disabling 2FA weakens the account - treat it like a password change and sign out
  // every other device, keeping only the session making this request.
  await revokeAllSessionsExcept(user._id, getCurrentTokenId(req));

  res.status(StatusCodes.OK).json({ msg: "Two-factor authentication disabled." });
};

/**
 * @swagger
 * /api/v1/auth/2fa/login:
 *   post:
 *     summary: Complete a login that was gated by 2FA
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tempToken, token]
 *             properties:
 *               tempToken: { type: string, description: Returned by POST /login when requiresTwoFactor is true }
 *               token: { type: string, description: A 6-digit TOTP code, or a backup code }
 *     responses:
 *       200:
 *         description: Logged in
 *       401:
 *         description: Invalid/expired tempToken, or invalid code
 */
const completeTwoFactorLogin = async (req, res) => {
  const { tempToken, token } = req.body;
  if (!tempToken || !token) {
    throw new BadRequestError("Please provide tempToken and a code");
  }

  let payload;
  try {
    payload = isTokenValid(tempToken, process.env.JWT_SECRET);
  } catch (error) {
    throw new UnAuthenticatedError("Invalid or expired session. Please log in again.");
  }
  if (!payload.twoFactorPending?.userId) {
    throw new UnAuthenticatedError("Invalid or expired session. Please log in again.");
  }

  const user = await User.findById(payload.twoFactorPending.userId).select(
    "+twoFactorSecret +twoFactorBackupCodes"
  );
  if (!user || !user.twoFactorEnabled) {
    throw new UnAuthenticatedError("Invalid or expired session. Please log in again.");
  }

  const isValidTotp = authenticator.verify({ token, secret: user.twoFactorSecret });

  let usedBackupCode = false;
  if (!isValidTotp) {
    const codes = user.twoFactorBackupCodes || [];
    const matchIndex = (
      await Promise.all(codes.map((hashed) => bcrypt.compare(token, hashed)))
    ).findIndex(Boolean);

    if (matchIndex === -1) {
      throw new UnAuthenticatedError("Invalid code");
    }
    // Backup codes are single-use - remove the one just used.
    user.twoFactorBackupCodes = codes.filter((_, i) => i !== matchIndex);
    usedBackupCode = true;
  }

  if (usedBackupCode) {
    await user.save({ validateBeforeSave: false });
  }

  const userAgent = req.headers["user-agent"] || "unknown";
  const tokenUser = await issueSession({ res, user, ip: req.ip, userAgent });

  res.status(StatusCodes.OK).json({ tokenUser });
};

export { setupTwoFactor, verifyTwoFactorSetup, disableTwoFactor, completeTwoFactorLogin };
