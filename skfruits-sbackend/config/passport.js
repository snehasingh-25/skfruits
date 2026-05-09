import passport from "passport";
import GoogleStrategy from "passport-google-oidc";
import prisma from "../prisma.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";

/**
 * Registers Google OAuth and session (de)serialization on the shared passport instance.
 * Import this module once from index.js before passport.initialize().
 */

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:3003/auth/login/federated/google/callback",
      scope: ["profile", "email"],
    },
    async (issuer, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const googleId = profile.id;

        if (!email) {
          return done(new Error("No email found in Google profile"), null);
        }

        let user = await prisma.user.findUnique({
          where: { email: normalizeEmail(email) },
        });

        if (user) {
          if (!user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: { googleId },
            });
          }
        } else {
          user = await prisma.user.create({
            data: {
              email: normalizeEmail(email),
              name: name || email.split("@")[0],
              googleId,
              role: "customer",
              password: "",
            },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
