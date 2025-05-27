import {
    collection,
    query,
    where,
    getDocs,
    getCountFromServer,
    orderBy,
    limit,
} from "firebase/firestore";
import { db } from "../utils/firebase";

export const fetchTotalBooks = async () => {
    const booksCol = collection(db, "books");
    const snapshot = await getCountFromServer(booksCol);
    return snapshot.data().count;
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
    const q = query(ordersCol, where("paymentStatus", "==", "completed"));
    const snapshot = await getDocs(q);

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
    const usersCol = collection(db, "users");
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
    const usersCol = collection(db, "users");
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