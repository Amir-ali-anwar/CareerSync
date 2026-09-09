import { Server } from "socket.io";
import { parse as parseCookieHeader } from "cookie";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import logger from "../../utils/logger.js";

let io = null;

/**
 * Authenticates a socket.io handshake the same way `middlewares/auth.js` authenticates
 * a normal HTTP request - by unsigning the same `accessToken` cookie with the same
 * `JWT_SECRET` - so a socket connection is only ever as trusted as the browser session
 * that opened it. Each user gets one room (their userId) that every one of their tabs/
 * devices joins, so a notification is broadcast to all of them at once.
 */
const authenticateSocket = (socket, next) => {
  try {
    const rawCookieHeader = socket.handshake.headers.cookie;
    if (!rawCookieHeader) return next(new Error("Authentication required"));

    const cookies = parseCookieHeader(rawCookieHeader);
    const signedAccessToken = cookies.accessToken;
    if (!signedAccessToken) return next(new Error("Authentication required"));

    const accessToken = cookieParser.signedCookie(signedAccessToken, process.env.JWT_SECRET);
    if (!accessToken) return next(new Error("Authentication required"));

    const payload = jwt.verify(accessToken, process.env.JWT_SECRET);
    socket.userId = payload.user.userId;
    next();
  } catch (error) {
    next(new Error("Authentication required"));
  }
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.join(socket.userId);
  });

  logger.info("socket_io_initialized", {});
  return io;
};

/** No-op (logged) if socket.io was never initialized - e.g. in tests, which import
 *  `app.js` directly and never call `initSocket`. Notification creation must never fail
 *  just because nobody is listening for the live push. */
export const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(String(userId)).emit(event, payload);
};
