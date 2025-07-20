/**
 * Firebase Cloud Function to send customized notifications.
 *
 * This version fixes the "sendToDevice is not a function" error by using the
 * correct and more modern `sendEachForMulticast` method for sending FCM messages.
 *
 * To deploy:
 * 1. Replace the contents of your existing `functions/index.js` file with this code.
 * 2. Run `firebase deploy --only functions` from your project's root directory.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.sendCustomNotification = functions.https.onCall(async (data, context) => {
  console.log("--- New Notification Request Received ---");
  const payload = data.data || data;
  console.log("Raw payload received by function:", payload);

  const { title, body, type, target, imageUrl, data: customData } = payload;

  if (!title || !body || !type || !target) {
    console.error("Validation Failed! One or more required arguments are missing.");
    throw new functions.https.HttpsError(
      "invalid-argument",
      "The function must be called with 'title', 'body', 'type', and 'target' arguments."
    );
  }

  try {
    console.log("Validation Succeeded. Proceeding to Step 1: Fetching users...");
    let usersQuery = db.collection("Users");

    if (target === "buyers") {
      console.log("Target is 'buyers'. Applying filter for 'hasMadePurchase'.");
      usersQuery = usersQuery.where("hasMadePurchase", "==", true);
    }
    
    const usersSnapshot = await usersQuery.get();
    console.log("Step 1a: Successfully fetched users snapshot.");

    if (usersSnapshot.empty) {
      console.log("No users found for the selected target audience.");
      return { success: true, message: "Request processed, but no users matched the criteria." };
    }

    const userDocs = usersSnapshot.docs;
    const recipientCount = userDocs.length;
    console.log(`Found ${recipientCount} users to notify.`);

    const historyRecord = {
      title,
      body,
      type,
      target,
      status: "processing",
      recipientCount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const historyRef = await db.collection("notificationHistory").add(historyRecord);
    console.log("Step 2: Created history record with ID:", historyRef.id);

    const batch = db.batch();
    const fcmTokens = [];

    userDocs.forEach((doc) => {
      const user = doc.data();
      const userId = doc.id;
      const userNotifRef = db.collection("notifications").doc();
      batch.set(userNotifRef, {
        userId,
        title,
        body,
        type,
        imageUrl: imageUrl || null,
        data: customData || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        isRead: false,
      });
      if (user.fcmToken && typeof user.fcmToken === 'string') {
        fcmTokens.push(user.fcmToken);
      }
    });

    await batch.commit();
    console.log("Step 3: Successfully committed batch write.");

    const uniqueTokens = [...new Set(fcmTokens)];
    let fcmSuccessCount = 0;

    if (uniqueTokens.length > 0) {
      const notificationPayload = { title, body };
      if (imageUrl) notificationPayload.imageUrl = imageUrl;
      
      const apnsPayload = { payload: { aps: { 'mutable-content': 1 } } };
      if (imageUrl) apnsPayload.fcm_options = { image: imageUrl };

      const androidPayload = {};
      if (imageUrl) androidPayload.notification = { image: imageUrl };

      const messagePayload = {
        notification: notificationPayload,
        data: { ...customData, type, click_action: "FLUTTER_NOTIFICATION_CLICK" },
        apns: apnsPayload,
        android: androidPayload,
      };

      console.log("Step 4: Preparing to send FCM messages using sendEachForMulticast...");
      
      // FIX: Using sendEachForMulticast which is the correct method for sending to a list of tokens.
      // This method is more robust and provides detailed results for each token.
      const response = await admin.messaging().sendEachForMulticast({
        tokens: uniqueTokens,
        ...messagePayload
      });
      
      fcmSuccessCount = response.successCount;
      console.log(`FCM messages sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    }

    await historyRef.update({
      status: "sent",
      fcmSuccessCount: fcmSuccessCount,
      fcmFailureCount: uniqueTokens.length - fcmSuccessCount,
    });

    return {
      success: true,
      message: `Notification sent to ${fcmSuccessCount} / ${recipientCount} users.`,
    };
  } catch (error) {
    console.error("FATAL Error during function execution:", error);
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred while sending the notification.",
      error.message
    );
  }
});
