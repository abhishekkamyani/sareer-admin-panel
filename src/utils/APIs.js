import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  orderBy,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../utils/firebase";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import dayjs from "dayjs";

export const uploadFileToFirebase = async (file, path = "book-covers/") => {
  try {
    console.log("path", path);

    // 1. Get storage reference
    const storage = getStorage();
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `${path}${fileName}`);

    // 2. Set metadata (optional)
    const metadata = {
      contentType: file.type || "application/octet-stream",
    };

    // 3. Create upload task with timeout handling
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      let timedOut = false;

      // Set timeout (5 minutes)
      const timeout = setTimeout(() => {
        timedOut = true;
        uploadTask.cancel();
        console.log("error", error);
        reject(new Error("Upload timed out after 30 seconds"));
      }, 60000);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Progress tracking
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
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
              fileName: fileName,
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
    console.error("Upload failed:", error);
    throw error;
  }
};

export const fetchBooks = async () => {
  const snapshot = await getDocs(collection(db, "books"));
  return snapshot.docs.map((doc) => {
    const data = doc.data(); // Get the document data once

    // Manually pick only the fields you need for the list view
    return {
      id: doc.id,
      coverUrl: data.coverUrl, // Or whatever the field name is
      name: data.name,
      writer: data.writer,
      categories: data.categories,
      language: data.language,
      prices: data.prices,
      status: data.status,
      releaseDate: data.releaseDate?.toDate(), // Keep your date conversion
    };
  });
};

// Fetches orders from the 'orders' collection in Firestore, ordered by creation date
export const fetchOrders = async () => {
  const ordersCol = collection(db, "orders");
  const q = query(ordersCol, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  // Return the document ID along with the rest of the order data
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const fetchBook = async (bookId) => {
  if (!bookId) {
    // Don't run if there's no ID
    return null;
  }
  const bookDocRef = doc(db, "books", bookId);
  const docSnap = await getDoc(bookDocRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      releaseDate: data.releaseDate?.toDate(),
    };
  } else {
    // Throw an error so react-query can catch it
    throw new Error("Book not found!");
  }
};

export const fetchTotalBooks = async () => {
  const booksCol = collection(db, "books");
  const snapshot = await getCountFromServer(booksCol);
  return snapshot.data().count;
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
        format: "ebook",
      },
    ],
    cart: [],
    deviceTokens: ["fcm_token_alice123"],
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
        price: 5000,
      },
    ],
    purchasedBooks: [], // Empty array for no purchases
    deviceTokens: ["fcm_token_bob456"],
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
        format: "hardcopy",
      },
    ],
    cart: [],
    deviceTokens: ["fcm_token_fatima789"],
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
        format: "hardcopy",
      },
    ],
    cart: [],
    deviceTokens: [],
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
        format: "ebook",
      },
    ],
    cart: [],
    deviceTokens: ["fcm_token_sara101"],
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
        price: 900,
      },
    ],
    purchasedBooks: [],
    deviceTokens: ["fcm_token_ali202"],
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
        price: 10000,
      },
    ],
    purchasedBooks: [],
    deviceTokens: [],
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
        format: "ebook",
      },
    ],
    cart: [],
    deviceTokens: ["fcm_token_saleh303"],
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
        format: "hardcopy",
      },
    ],
    cart: [],
    deviceTokens: ["fcm_token_emma404"],
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
        format: "hardcopy",
      },
    ],
    cart: [],
    deviceTokens: ["fcm_token_omar505"],
  },
];

export const orders = [
  // Order 1: Alice purchases Maths Book (ebook)
  {
    userId: "4Q1DbO26b1gZ2iu08mwR", // Alice Johnson
    userEmail: "alice.johnson1@example.com",
    username: "alice_j",
    items: [
      {
        bookId: "5HftR1wT63igOU4zrhGh", // Maths Book
        title: "Maths Book",
        price: 4500, // Discounted PKR
        originalPrice: 5000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
    ],
    subtotal: 4500,
    discount: 500,
    total: 4500,
    paymentMethod: "PayPal",
    paymentStatus: "completed",
    orderDate: new Date("2025-03-10T14:25:00Z"),
    createdAt: new Date("2025-03-10T14:25:00Z"), // For sorting
  },

  // Order 2: Fatima purchases MyNEWBOOK (ebook)
  {
    userId: "LTGBQguHgmj9Oee4ghDp", // Fatima Khan
    userEmail: "fatima.khan@example.com",
    username: "fatima_k",
    items: [
      {
        bookId: "KCiejHq06YJxONzoI0QC", // MyNEWBOOK
        title: "MyNEWBOOk",
        price: 9000, // Discounted PKR
        originalPrice: 10000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
    ],
    subtotal: 9000,
    discount: 1000,
    total: 9000,
    paymentMethod: "EasyPaisa",
    paymentStatus: "completed",
    orderDate: new Date("2025-05-15T18:30:00Z"),
    createdAt: new Date("2025-05-15T18:30:00Z"),
  },

  // Order 3: Omar purchases all three books (ebooks)
  {
    userId: "XH34P7nYrEYkvH20FZNU", // Omar Khalid
    userEmail: "omar.khalid@example.com",
    username: "omar_k",
    items: [
      {
        bookId: "5HftR1wT63igOU4zrhGh", // Maths Book
        title: "Maths Book",
        price: 4500,
        originalPrice: 5000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
      {
        bookId: "KCiejHq06YJxONzoI0QC", // MyNEWBOOK
        title: "MyNEWBOOk",
        price: 9000,
        originalPrice: 10000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
      {
        bookId: "YPrL0TZQEyklbJ1aVm2w", // Poetry
        title: "book 2025",
        price: 900,
        originalPrice: 1000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
    ],
    subtotal: 14400,
    discount: 1600,
    total: 14400,
    paymentMethod: "Bank Transfer",
    paymentStatus: "completed",
    orderDate: new Date("2025-05-20T11:15:00Z"),
    createdAt: new Date("2025-05-20T11:15:00Z"),
  },

  // Order 4: Saleh purchases Poetry (ebook)
  {
    userId: "REu3G6EyHW9hdvQ5zpmx", // Saleh Mahmood
    userEmail: "saleh.mahmood@example.com",
    username: "saleh_m",
    items: [
      {
        bookId: "YPrL0TZQEyklbJ1aVm2w", // Poetry
        title: "book 2025",
        price: 900,
        originalPrice: 1000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
    ],
    subtotal: 900,
    discount: 100,
    total: 900,
    paymentMethod: "EasyPaisa",
    paymentStatus: "completed",
    orderDate: new Date("2025-05-18T09:45:00Z"),
    createdAt: new Date("2025-05-18T09:45:00Z"),
  },

  // Order 5: Bob's pending order
  {
    userId: "MZ1IIOBxO9sjo4Dz11lF", // Bob Smith
    userEmail: "bob.smith@example.com",
    username: "bob_s",
    items: [
      {
        bookId: "5HftR1wT63igOU4zrhGh", // Maths Book
        title: "Maths Book",
        price: 4500,
        originalPrice: 5000,
        currency: "PKR",
        format: "ebook",
        quantity: 1,
      },
    ],
    subtotal: 4500,
    discount: 500,
    total: 4500,
    paymentMethod: "PayPal",
    paymentStatus: "pending",
    orderDate: new Date("2025-05-22T16:30:00Z"),
    createdAt: new Date("2025-05-22T16:30:00Z"),
  },
];

export const getCategories = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "categories"));
    const categories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return categories;
  } catch (err) {
    console.error("Failed to fetch categories", err);
    throw err;
  }
};

export const fetchNewReleases = async () => {
  const booksCol = collection(db, "books");
  const q = query(
    booksCol,
    where("releaseDate", ">=", dayjs().subtract(30, "day").toDate())
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

export const fetchSalesData = async () => {
  const ordersCol = collection(db, "orders");
  // const q = query(ordersCol, where("paymentStatus", "==", "completed"));
  const snapshot = await getDocs(ordersCol);

  let totalPKR = 0;
  let totalUSD = 0;
  let totalCopies = 0;

  snapshot.forEach((doc) => {
    const order = doc.data();
    totalPKR += order.total;
    totalCopies += order.items.reduce((sum, item) => sum + item.quantity, 0);
  });

  return { totalPKR, totalUSD, totalCopies };
};

export const fetchActiveUsers = async () => {
  const usersCol = collection(db, "Users");
  const q = query(
    usersCol,
    where("lastLogin", ">=", dayjs().subtract(1, "day").toDate())
  );
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
};

export const fetchRecentActivities = async () => {
  const ordersCol = collection(db, "orders");
  const q = query(ordersCol, orderBy("orderDate", "desc"), limit(5));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const order = doc.data();
    return {
      id: doc.id,
      bookName: order.items[0]?.title || "Multiple Books",
      action: "Purchase",
      date: order.orderDate.toDate().toLocaleString(),
      user: order.username,
    };
  });
};

export const fetchSalesByCategory = async (categories) => {
  const ordersCol = collection(db, "orders");
  const snapshot = await getDocs(ordersCol);

  const categorySales = categories.reduce((acc, category) => {
    acc[category] = 0;
    return acc;
  }, {});

  snapshot.forEach((doc) => {
    const order = doc.data();
    order.items.forEach((item) => {
      item.categories?.forEach((category) => {
        // if (categorySales.hasOwnProperty(category)) {
        //     categorySales[category] += item.price * item.quantity;
        // }
        const capitalizedCat =
          category.charAt(0).toUpperCase() + category.slice(1);
        categorySales[capitalizedCat] =
          (categorySales[capitalizedCat] || 0) + item.price * item.quantity;
      });
    });
  });

  return {
    categories: Object.keys(categorySales),
    sales: Object.values(categorySales),
  };
};

export const fetchReadingAnalytics = async () => {
  const usersCol = collection(db, "Users");
  const snapshot = await getDocs(usersCol);

  const dailyPages = Array(7).fill(0);

  snapshot.forEach((doc) => {
    const user = doc.data();
    user.readingProgress?.forEach((book) => {
      const readDate = book.lastReadAt?.toDate();
      if (readDate) {
        const daysAgo = dayjs().diff(readDate, "day");
        if (daysAgo >= 0 && daysAgo < 7) {
          dailyPages[6 - daysAgo] += book.totalPagesRead || 0;
        }
      }
    });
  });

  return dailyPages;
};

export const generateReport = async (reportType, dateRange) => {
  let reportData = {};

  // Get data based on report type
  switch (reportType) {
    case "sales":
      const ordersCol = collection(db, "orders");
      let salesQuery = query(ordersCol);

      if (dateRange) {
        salesQuery = query(
          ordersCol,
          where("orderDate", ">=", dateRange[0]),
          where("orderDate", "<=", dateRange[1])
        );
      }

      const snapshot = await getDocs(salesQuery);
      reportData = {
        type: "sales",
        data: snapshot.docs.map((doc) => {
          const order = doc.data();
          return {
            "Order ID": doc.id,
            "Order Date": dayjs(order.orderDate.toDate()).format(
              "YYYY-MM-DD HH:mm:ss"
            ),
            "User ID": order.userId,
            "User Email": order.userEmail,
            Username: order.username,
            "Payment Method": order.paymentMethod,
            "Payment Status": order.paymentStatus,
            "Subtotal (PKR)": order.subtotal,
            "Discount (PKR)": order.discount,
            "Total (PKR)": order.total,
            "Items Count": order.items.length,
            "Items Details": order.items
              .map((item) => `${item.title} (${item.format}, ₨${item.price})`)
              .join("; "),
          };
        }),
      };
      break;

    case "users":
      const usersCol = collection(db, "users");
      const usersSnapshot = await getDocs(usersCol);
      reportData = {
        type: "users",
        data: usersSnapshot.docs.map((doc) => {
          const user = doc.data();
          return {
            "User ID": doc.id,
            Email: user.email,
            Username: user.username,
            "Registration Date": dayjs(user.registrationDate.toDate()).format(
              "YYYY-MM-DD HH:mm:ss"
            ),
            Status: user.status,
            "Last Login": user.lastLogin
              ? dayjs(user.lastLogin.toDate()).format("YYYY-MM-DD HH:mm:ss")
              : "Never",
            "Device Tokens Count": user.deviceTokens?.length || 0,
            "Purchased Books Count": user.purchasedBooks?.length || 0,
            "Cart Items Count": user.cart?.length || 0,
          };
        }),
      };
      break;

    case "books":
      const booksCol = collection(db, "books");
      const booksSnapshot = await getDocs(booksCol);
      reportData = {
        type: "books",
        data: booksSnapshot.docs.map((doc) => {
          const book = doc.data();
          return {
            "Book ID": doc.id,
            Title: book.name,
            Writer: book.writer,
            Categories: book.categories?.join(", ") || "",
            Language: book.language,
            "Release Date": dayjs(book.releaseDate).format("YYYY-MM-DD"),
            "Price (PKR)": book.prices.pkr,
            "Discounted Price (PKR)":
              book.prices.discountedPkr || book.prices.pkr,
            "Price (USD)": book.prices.usd,
            "Discount Type": book.discount.type,
            "Discount Value": book.discount.value,
            Status: book.status,
            // 'Views': book.stats.views,
            // 'Purchases': book.stats.purchases,
            // 'Average Rating': book.stats.averageRating
          };
        }),
      };
      break;

    default:
      throw new Error("Invalid report type");
  }

  return reportData;
};

export const fetchNotificationHistory = async () => {
  const historyQuery = query(
    collection(db, "notificationHistory"),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate(),
  }));
};
