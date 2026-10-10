// "Continue with Google" is switched on by setting AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.
export const googleSignInOn = () => !!(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim());
/** Set for 10 minutes when someone ticks "I'm 16 or older" and picks Google on the sign-up page. */
export const AGE_COOKIE = "mf_age16";
