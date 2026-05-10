import { adminAuth } from "../config/firebaseAdmin.js";

export default async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Missing Firebase auth token",
        });
    }

    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired Firebase token",
        });
    }
}