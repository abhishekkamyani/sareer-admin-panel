/**
 * To deploy this function:
 * 1. Replace the contents of your existing `functions/index.js` file with this code.
 * 2. Run `firebase deploy --only functions` from your project root.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  // Optional: Add admin role verification for security
  // if (!context.auth || !context.auth.token.admin) {
  //   throw new functions.https.HttpsError(
  //     "permission-denied",
  //     "Must be an administrative user to send notifications."
  //   );
  // }

  const { message, type, target, bookId, scheduledDate } = data;

  // --- 1. Construct the Base Firestore Query to Find Target Users ---
  let usersQuery = db.collection("users");

  // We add a defensive check to ensure 'target' is an array before using it.
  if (Array.isArray(target) && target.length > 0) {
    if (target.includes("Specific Book Buyers") && bookId) {
      usersQuery = usersQuery.where(`purchasedBooks.${bookId}`, "==", true);
    }

    if (target.includes("Inactive Users")) {
      const inactiveDate = new Date();
      inactiveDate.setDate(inactiveDate.getDate() - 30);
      usersQuery = usersQuery.where("lastActive", "<", inactiveDate);
    }
  } else {
    // If target is missing or not an array, we can log it.
    console.warn("Warning: 'target' array was missing, empty, or invalid. Proceeding without audience filters.");
  }

  // --- 2. Fetch User Documents and Collect FCM Tokens ---
  const userDocs = await usersQuery.get();
  if (userDocs.empty) {
    console.log("No users found for the selected target.");
  }

  const tokens = [];
  userDocs.forEach((doc) => {
    const userData = doc.data();
    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
      tokens.push(...userData.fcmTokens);
    }
  });

  const uniqueTokens = [...new Set(tokens)];
  console.log(`Found ${uniqueTokens.length} unique device tokens to target.`);

  // --- 3. Save the Notification to Firestore History ---
  // **THE FIX IS HERE:** Provide default fallback values for any potentially undefined fields.
  const notificationRecord = {
    message: message || "No message content.", // Fallback for undefined message
    type: type || "General", // Fallback for undefined type
    target: target || ["Unknown"], 
    bookId: bookId || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: scheduledDate ? "scheduled" : (uniqueTokens.length > 0 ? "sent" : "processed"),
    sentAt: scheduledDate ? new Date(scheduledDate) : admin.firestore.FieldValue.serverTimestamp(),
    estimatedRecipients: uniqueTokens.length,
    stats: {
      successCount: 0,
      failureCount: 0,
    },
  };

  const notifRef = await db.collection("notifications").add(notificationRecord);
  console.log("Notification record saved to Firestore with ID:", notifRef.id);

  // --- 4. Send the Notification via FCM (if not scheduled for later) ---
  if (uniqueTokens.length > 0 && !scheduledDate) {
    const payload = {
      notification: {
        title: `E-Book Store: ${type || 'Notification'}`, // Use fallback for title too
        body: message,
      },
      data: {
        type: type || "General",
        bookId: bookId || "",
        screen: "/notifications",
      },
    };

    console.log("Sending FCM message...");
    const response = await admin.messaging().sendToDevice(uniqueTokens, payload);

    await notifRef.update({
      "stats.successCount": response.successCount,
      "stats.failureCount": response.failureCount,
    });

    console.log(`Successfully sent message to ${response.successCount} devices.`);
    return { success: true, message: `Notification sent to ${response.successCount} users.` };
  } else if (scheduledDate) {
    console.log("Notification is scheduled. No message sent now.");
    return { success: true, message: "Notification successfully scheduled." };
  } else {
    console.log("No tokens found, so no message sent.");
    return { success: true, message: "Request processed, but no users to notify." };
  }
});
