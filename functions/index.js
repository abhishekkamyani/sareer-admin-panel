/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios'); // Make sure to install axios in your functions directory: npm install axios

// Initialize Firebase Admin SDK
// This uses your Firebase project's default credentials.
admin.initializeApp();

// Access OneSignal credentials from Firebase Functions environment configuration.
// THESE MUST BE SET BEFORE DEPLOYMENT! See Phase 3, Step 2.
const ONE_SIGNAL_APP_ID = functions.config().onesignal.app_id;
const ONE_SIGNAL_REST_API_KEY = functions.config().onesignal.rest_api_key;

// HTTPS Callable function to send a OneSignal notification
exports.sendOneSignalNotification = functions.https.onCall(async (data, context) => {
    // --- Security Check (Highly Recommended) ---
    // Ensure the user calling this function is authenticated.
    // You might want to add more granular checks, e.g., if the user has an 'admin' role.
    if (!context.auth) {
        console.error('Unauthenticated call to sendOneSignalNotification');
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required to send notifications.');
    }
    // --- End Security Check ---

    const { message, type, target, bookId, scheduledDate, estimatedRecipients } = data;

    // Basic input validation
    if (!message || !type || !target || target.length === 0) {
        console.error('Missing required fields for notification:', data);
        throw new functions.https.HttpsError('invalid-argument', 'Message, type, and target audience are required.');
    }

    let segments = [];
    let filters = [];
    let headings = { en: type }; // Default heading for the notification

    // Logic to map your admin panel's 'target' options to OneSignal's targeting
    if (target.includes("All Users")) {
        // "Subscribed Users" is a common default segment in OneSignal for all active users
        segments.push("Subscribed Users");
    }
    if (target.includes("Specific Book Buyers") && bookId) {
        // For specific book buyers, you'd ideally use OneSignal Tags.
        // Your Flutter app needs to set these tags when a user purchases a book:
        // OneSignal.User.addTag(`purchased_book_${bookId}`, "true");
        filters.push({ "field": "tag", "key": `purchased_book_${bookId}`, "relation": "=", "value": "true" });
        // Important: If "All Users" is also selected, you might need to reconsider
        // how segments and filters interact. For now, we combine them.
    }
    if (target.includes("Inactive Users")) {
        // OneSignal often has a predefined "Inactive Users" segment based on app activity.
        segments.push("Inactive Users");
    }

    // Construct the OneSignal API request body
    const notificationBody = {
        app_id: ONE_SIGNAL_APP_ID,
        contents: { en: message }, // The main notification message
        headings: headings,       // The title of the notification
        // Custom data that your Flutter app can read when the notification is received/tapped
        data: {
            notificationType: type,
            ...(bookId && { bookId: bookId }), // Include bookId if applicable
        },
        // Targeting parameters for OneSignal
        included_segments: segments.length > 0 ? segments : undefined,
        filters: filters.length > 0 ? filters : undefined, // Filters are applied on top of segments
        // You can also target specific users by player_id or external_user_id if you have them:
        // include_player_ids: ["player_id_from_onesignal"],
        // include_external_user_ids: ["firebase_uid_of_user"], // If you map Firebase UIDs to OneSignal external_user_ids
    };

    // Handle scheduled notifications
    if (scheduledDate) {
        // OneSignal expects `send_after` in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DD HH:MM:SS TZ)
        // Using toISOString() is generally reliable.
        notificationBody.send_after = new Date(scheduledDate).toISOString();
    }

    try {
        // Make the HTTP POST request to the OneSignal API
        const response = await axios.post('https://onesignal.com/api/v1/notifications', notificationBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}` // Use your REST API Key
            }
        });

        console.log('OneSignal API Response:', response.data);

        // --- Save Notification History to Firestore ---
        // It's important to save this after the OneSignal API call,
        // to ensure the notification was at least *sent to OneSignal*.
        await admin.firestore().collection("notifications").add({
            type: type,
            target: target,
            message: message,
            status: scheduledDate ? "scheduled" : "sent", // Reflects state at OneSignal
            createdAt: admin.firestore.FieldValue.serverTimestamp(), // Server timestamp for creation
            sentAt: scheduledDate ? new Date(scheduledDate) : new Date(), // Actual send/scheduled time
            estimatedRecipients: estimatedRecipients, // Your calculated estimate
            ...(bookId && { bookId: bookId }),
            oneSignalId: response.data.id, // Store OneSignal's notification ID for future reference
            oneSignalRecipients: response.data.recipients, // OneSignal's count of target recipients
            // You might also want to store the full response.data for debugging
        });

        return { success: true, message: 'Notification sent/scheduled successfully via OneSignal.', oneSignalResponse: response.data };

    } catch (error) {
        console.error('Error sending OneSignal notification:', error.response ? error.response.data : error.message);

        // Re-throw an HttpsError to provide meaningful error messages to the client
        throw new functions.https.HttpsError(
            'internal',
            'Failed to send notification via OneSignal.',
            error.response ? error.response.data : { message: error.message }
        );
    }
});
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
