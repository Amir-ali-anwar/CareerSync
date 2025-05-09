import jwt from 'jsonwebtoken'
const createJWT = ({ payload }) => {
  if (!payload) throw new Error("JWT payload is undefined");

  const token = jwt.sign(payload, process.env.JWT_SECRET);
  return token;
};

const isTokenValid = ( token ) => jwt.verify(token, process.env.JWT_SECRET);

const attachCookiesToResponse = ({ res, user,refreshToken }) => {
  const accessTokenJWT = createJWT({ payload: {user} });
  const refreshTokenJWT = createJWT({ payload: {user,refreshToken} });

  const oneDay = 1000 * 60 * 60 * 24;

  res.cookie('accessToken', accessTokenJWT, {
    httpOnly: true,
    expires: new Date(Date.now() + oneDay),
    secure: process.env.NODE_ENV === 'production',
    signed: true,
  });
  res.cookie('refreshToken', refreshTokenJWT, {
    httpOnly: true,
    expires: new Date(Date.now() + oneDay),
    secure: process.env.NODE_ENV === 'production',
    signed: true,
  });
};

export {
  createJWT,
  isTokenValid,
  attachCookiesToResponse,
};
