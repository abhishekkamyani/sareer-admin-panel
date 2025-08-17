import {
  collection,
  getDocs,
  writeBatch,
  doc,
  deleteField,
} from "firebase/firestore";
import { db } from "../utils/firebase";

/**
 * Helper function to remove undefined values from an object, as Firestore
 * does not support them. Replaces undefined with an empty string.
 * @param {object} obj The object to sanitize.
 * @returns {object} The sanitized object.
 */
const sanitizeData = (obj) => {
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = obj[key] === undefined ? '' : obj[key];
    }
  }
  return sanitized;
};

/**
 * This function migrates book content from an array within the 'books' collection
 * to individual documents in a new 'book_contents' collection.
 *
 * WARNING: This is a destructive operation. It removes the 'content' field
 * from the original book documents after migration.
 * ALWAYS BACK UP YOUR FIRESTORE DATA BEFORE RUNNING A MIGRATION SCRIPT.
 */
export const migrateBookContentToNewCollection = async () => {
  console.log("Starting book content migration...");
  // Get a reference to the source collection (books) and the destination collection (book_contents)
  const booksCollectionRef = collection(db, "books");
  const bookContentsCollectionRef = collection(db, "book_contents");

  try {
    // Fetch all documents from the 'books' collection
    const allBooksSnapshot = await getDocs(booksCollectionRef);
    if (allBooksSnapshot.empty) {
      console.log("No books found to migrate.");
      return;
    }

    // Set up batching to handle large datasets efficiently and avoid timeout errors
    const BATCH_LIMIT = 500;
    let batch = writeBatch(db);
    let operationCount = 0;
    let migratedBooksCount = 0;

    // Iterate through each book document
    for (const bookDoc of allBooksSnapshot.docs) {
      const bookData = bookDoc.data();
      const bookId = bookDoc.id;

      // Check if the book document has a 'content' array to migrate
      if (Array.isArray(bookData.content) && bookData.content.length > 0) {
        // Calculate the number of operations for this book (each chapter + 1 update operation)
        const operationsForThisBook = bookData.content.length + 1;

        // Check if committing the current operations would exceed the batch limit
        if (operationCount + operationsForThisBook > BATCH_LIMIT) {
          console.log(`Operation count (${operationCount}) nearing limit. Committing current batch...`);
          await batch.commit();
          // Start a new batch after a successful commit
          batch = writeBatch(db);
          operationCount = 0;
          console.log("New batch started.");
        }
        
        console.log(`Found content in book: "${bookData.name}" (${bookId}). Migrating...`);
        migratedBooksCount++;

        // Add each chapter as a new document to the new collection
        bookData.content.forEach((chapter, index) => {
          const newContentData = {
            bookId: bookId,
            heading: chapter.heading || "Untitled Chapter",
            body: chapter.body || "",
            alignment: chapter.alignment || "left",
            order: typeof chapter.order === 'number' ? chapter.order : index,
          };
          const sanitizedContentData = sanitizeData(newContentData);
          const newContentDocRef = doc(bookContentsCollectionRef);
          batch.set(newContentDocRef, sanitizedContentData);
          operationCount++;
        });

        // Use deleteField() to remove the old 'content' array from the original document
        const bookRef = doc(db, "books", bookId);
        batch.update(bookRef, { content: deleteField() });
        operationCount++;
      }
    }

    // Commit any remaining operations in the final batch
    if (operationCount > 0) {
      console.log(`Committing final batch of ${operationCount} operations...`);
      await batch.commit();
    }

    console.log("-----------------------------------------");
    console.log("✅ Migration completed successfully!");
    console.log(`Total books with content migrated: ${migratedBooksCount}`);
    console.log("-----------------------------------------");

  } catch (error) {
    console.error("❌ An error occurred during migration:", error);
    console.error("Migration failed. Please check the logs for details.");
  }
};
