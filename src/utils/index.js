import { collection, getDocs } from "firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db } from "./firebase";

export const uploadFileToFirebase = async (file, path = 'book-covers/') => {
    try {
        console.log("path", path);

        // 1. Get storage reference
        const storage = getStorage();
        const fileName = `${Date.now()}-${file.name}`;
        const storageRef = ref(storage, `${path}${fileName}`);

        // 2. Set metadata (optional)
        const metadata = {
            contentType: file.type || 'application/octet-stream',
        };

        // 3. Create upload task with timeout handling
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, file, metadata);
            let timedOut = false;

            // Set timeout (30 seconds)
            const timeout = setTimeout(() => {
                timedOut = true;
                uploadTask.cancel();
                console.log("error", error);
                reject(new Error('Upload timed out after 30 seconds'));
            }, 30000);

            uploadTask.on('state_changed',
                (snapshot) => {
                    // Progress tracking
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log(`Upload progress: ${progress.toFixed(2)}%`);
                },
                (error) => {
                    clearTimeout(timeout);
                    if (!timedOut) {
                        console.log("error", error);
                        reject(error);
                    }
                },
                async () => {
                    clearTimeout(timeout);
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve({
                            url: downloadURL,
                            path: `${path}${fileName}`,
                            fileName: fileName
                        });
                    } catch (error) {
                        console.log("error", error);

                        reject(error);
                    }
                }
            );
        });

        return await uploadPromise;

    } catch (error) {
        console.error('Upload failed:', error);
        throw error;
    }
};

export const fetchBooks = async () => {
    const snapshot = await getDocs(collection(db, "books"));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data() // <-- This is what returns clean data
    }));
  };

export const users = [
    {
        email: "alice.johnson@example.com",
        username: "alice_j",
        registrationDate: new Date("2025-01-15T10:00:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T08:30:00Z"),
        purchasedBooks: [
            {
                bookId: "5HftR1wT63igOU4zrhGh",
                purchaseDate: new Date("2025-03-10T14:25:00Z"),
                pricePaid: 4500,
                paymentMethod: "PayPal",
                format: "ebook"
            }
        ],
        cart: [],
        deviceTokens: ["fcm_token_alice123"]
    },
    {
        email: "bob.smith@example.com",
        username: "bob_s",
        registrationDate: new Date("2025-05-01T16:20:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-20T11:10:00Z"),
        cart: [
            {
                bookId: "5HftR1wT63igOU4zrhGh",
                addedAt: new Date("2025-05-20T11:05:00Z"),
                format: "hardcopy",
                price: 5000
            }
        ],
        purchasedBooks: [], // Empty array for no purchases
        deviceTokens: ["fcm_token_bob456"]
    },
    {
        email: "fatima.khan@example.com",
        username: "fatima_k",
        registrationDate: new Date("2024-11-30T12:00:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T09:15:00Z"),
        purchasedBooks: [
            {
                bookId: "KCiejHq06YJxONzoI0QC",
                purchaseDate: new Date("2025-05-15T18:30:00Z"),
                pricePaid: 9000,
                paymentMethod: "Cash on Delivery",
                format: "hardcopy"
            }
        ],
        cart: [],
        deviceTokens: ["fcm_token_fatima789"]
    },
    {
        email: "david.williams@example.com",
        username: "david_w",
        registrationDate: new Date("2024-08-10T08:45:00Z"),
        status: "inactive",
        lastLogin: new Date("2025-02-10T09:00:00Z"),
        purchasedBooks: [
            {
                bookId: "KCiejHq06YJxONzoI0QC",
                purchaseDate: new Date("2024-12-25T18:30:00Z"),
                pricePaid: 10000,
                paymentMethod: "Bank Transfer",
                format: "hardcopy"
            }
        ],
        cart: [],
        deviceTokens: []
    },
    {
        email: "sara.ahmed@example.com",
        username: "sara_a",
        registrationDate: new Date("2025-03-01T14:00:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T10:45:00Z"),
        purchasedBooks: [
            {
                bookId: "5HftR1wT63igOU4zrhGh",
                purchaseDate: new Date("2025-04-10T11:20:00Z"),
                pricePaid: 4500,
                paymentMethod: "PayPal",
                format: "ebook"
            }
        ],
        cart: [],
        deviceTokens: ["fcm_token_sara101"]
    },
    {
        email: "ali.raza@example.com",
        username: "ali_r",
        registrationDate: new Date("2025-05-22T17:00:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T11:20:00Z"),
        cart: [
            {
                bookId: "YPrL0TZQEyklbJ1aVm2w",
                addedAt: new Date("2025-05-23T11:15:00Z"),
                format: "ebook",
                price: 900
            }
        ],
        purchasedBooks: [],
        deviceTokens: ["fcm_token_ali202"]
    },
    {
        email: "fraud.user@example.com",
        username: "fraudster",
        registrationDate: new Date("2025-04-10T13:10:00Z"),
        status: "banned",
        lastLogin: new Date("2025-04-15T19:30:00Z"),
        cart: [
            {
                bookId: "KCiejHq06YJxONzoI0QC",
                addedAt: new Date("2025-04-15T19:25:00Z"),
                format: "hardcopy",
                price: 10000
            }
        ],
        purchasedBooks: [],
        deviceTokens: []
    },
    {
        email: "saleh.mahmood@example.com",
        username: "saleh_m",
        registrationDate: new Date("2025-02-20T10:30:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T12:00:00Z"),
        purchasedBooks: [
            {
                bookId: "5HftR1wT63igOU4zrhGh",
                purchaseDate: new Date("2025-05-10T14:00:00Z"),
                pricePaid: 4500,
                paymentMethod: "EasyPaisa",
                format: "ebook"
            }
        ],
        cart: [],
        deviceTokens: ["fcm_token_saleh303"]
    },
    {
        email: "emma.wilson@example.com",
        username: "emma_w",
        registrationDate: new Date("2025-01-05T09:15:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T07:45:00Z"),
        purchasedBooks: [
            {
                bookId: "5HftR1wT63igOU4zrhGh",
                purchaseDate: new Date("2025-03-20T16:20:00Z"),
                pricePaid: 5000,
                paymentMethod: "PayPal",
                format: "hardcopy"
            }
        ],
        cart: [],
        deviceTokens: ["fcm_token_emma404"]
    },
    {
        email: "omar.khalid@example.com",
        username: "omar_k",
        registrationDate: new Date("2024-10-01T11:00:00Z"),
        status: "active",
        lastLogin: new Date("2025-05-23T13:30:00Z"),
        purchasedBooks: [
            {
                bookId: "5HftR1wT63igOU4zrhGh",
                purchaseDate: new Date("2025-01-10T12:00:00Z"),
                pricePaid: 5000,
                paymentMethod: "Bank Transfer",
                format: "hardcopy"
            }
        ],
        cart: [],
        deviceTokens: ["fcm_token_omar505"]
    }
];