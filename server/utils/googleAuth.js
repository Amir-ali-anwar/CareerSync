import { OAuth2Client } from "google-auth-library";

let client;
const getClient = () => {
  if (!client) client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return client;
};

/**
 * Verifies a Google Identity Services ID token and returns its payload
 * ({ sub, email, email_verified, given_name, family_name, picture, ... }).
 * Throws if the token is invalid, expired, or wasn't issued for our GOOGLE_CLIENT_ID.
 *
 * Isolated into its own module (rather than called inline in the controller) so
 * tests can mock it directly - a real Google ID token can't be verified offline.
 */
const verifyGoogleIdToken = async (idToken) => {
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

export default verifyGoogleIdToken;
