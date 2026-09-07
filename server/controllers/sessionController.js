import { StatusCodes } from "http-status-codes";
import { NotFoundError } from "../errors/index.js";
import { getCurrentTokenId, revokeAllSessionsExcept } from "../utils/index.js";
import Token from "../models/Token.js";

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   get:
 *     summary: List the caller's active sessions (devices currently signed in)
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active sessions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       ip: { type: string }
 *                       userAgent: { type: string }
 *                       createdAt: { type: string, format: date-time }
 *                       updatedAt: { type: string, format: date-time }
 *                       isCurrent: { type: boolean }
 */
const getSessions = async (req, res) => {
  const tokens = await Token.find({ user: req.user.userId, isValid: true }).sort({ updatedAt: -1 });
  const currentTokenId = getCurrentTokenId(req);

  const sessions = tokens.map((token) => ({
    id: token._id,
    ip: token.ip,
    userAgent: token.userAgent,
    createdAt: token.createdAt,
    updatedAt: token.updatedAt,
    isCurrent: currentTokenId ? token._id.toString() === currentTokenId : false,
  }));

  res.status(StatusCodes.OK).json({ sessions });
};

/**
 * @swagger
 * /api/v1/auth/sessions/{id}:
 *   delete:
 *     summary: Revoke one specific session (sign out one device)
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Session revoked
 *       404:
 *         description: No such session for this user
 */
const revokeSession = async (req, res) => {
  const token = await Token.findOne({ _id: req.params.id, user: req.user.userId });
  if (!token) {
    throw new NotFoundError("Session not found");
  }

  token.isValid = false;
  await token.save();

  res.status(StatusCodes.OK).json({ msg: "Session revoked" });
};

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   delete:
 *     summary: Revoke every OTHER active session (log out all other devices)
 *     description: The session making this request is left signed in.
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Other sessions revoked
 */
const revokeOtherSessions = async (req, res) => {
  await revokeAllSessionsExcept(req.user.userId, getCurrentTokenId(req));
  res.status(StatusCodes.OK).json({ msg: "Signed out of all other devices" });
};

export { getSessions, revokeSession, revokeOtherSessions };
