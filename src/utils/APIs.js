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

import dayjs from 'dayjs';

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

export const generateReport = async (reportType, dateRange) => {
    let reportData = {};

    // Get data based on report type
    switch (reportType) {
        case 'sales':
            const ordersCol = collection(db, 'orders');
            let salesQuery = query(ordersCol);

            if (dateRange) {
                salesQuery = query(
                    ordersCol,
                    where('orderDate', '>=', dateRange[0]),
                    where('orderDate', '<=', dateRange[1])
                );
            }

            const snapshot = await getDocs(salesQuery);
            reportData = {
                type: 'sales',
                data: snapshot.docs.map(doc => {
                    const order = doc.data();
                    return {
                        'Order ID': doc.id,
                        'Order Date': dayjs(order.orderDate.toDate()).format('YYYY-MM-DD HH:mm:ss'),
                        'User ID': order.userId,
                        'User Email': order.userEmail,
                        'Username': order.username,
                        'Payment Method': order.paymentMethod,
                        'Payment Status': order.paymentStatus,
                        'Subtotal (PKR)': order.subtotal,
                        'Discount (PKR)': order.discount,
                        'Total (PKR)': order.total,
                        'Items Count': order.items.length,
                        'Items Details': order.items.map(item =>
                            `${item.title} (${item.format}, ₨${item.price})`).join('; ')
                    };
                })
            };
            break;

        case 'users':
            const usersCol = collection(db, 'users');
            const usersSnapshot = await getDocs(usersCol);
            reportData = {
                type: 'users',
                data: usersSnapshot.docs.map(doc => {
                    const user = doc.data();
                    return {
                        'User ID': doc.id,
                        'Email': user.email,
                        'Username': user.username,
                        'Registration Date': dayjs(user.registrationDate.toDate()).format('YYYY-MM-DD HH:mm:ss'),
                        'Status': user.status,
                        'Last Login': user.lastLogin ?
                            dayjs(user.lastLogin.toDate()).format('YYYY-MM-DD HH:mm:ss') : 'Never',
                        'Device Tokens Count': user.deviceTokens?.length || 0,
                        'Purchased Books Count': user.purchasedBooks?.length || 0,
                        'Cart Items Count': user.cart?.length || 0
                    };
                })
            };
            break;

        case 'books':
            const booksCol = collection(db, 'books');
            const booksSnapshot = await getDocs(booksCol);
            reportData = {
                type: 'books',
                data: booksSnapshot.docs.map(doc => {
                    const book = doc.data();
                    return {
                        'Book ID': doc.id,
                        'Title': book.name,
                        'Writer': book.writer,
                        'Categories': book.categories?.join(', ') || '',
                        'Language': book.language,
                        'Release Date': dayjs(book.releaseDate).format('YYYY-MM-DD'),
                        'Price (PKR)': book.prices.pkr,
                        'Discounted Price (PKR)': book.prices.discountedPkr || book.prices.pkr,
                        'Price (USD)': book.prices.usd,
                        'Discount Type': book.discount.type,
                        'Discount Value': book.discount.value,
                        'Status': book.status,
                        // 'Views': book.stats.views,
                        // 'Purchases': book.stats.purchases,
                        // 'Average Rating': book.stats.averageRating
                    };
                })
            };
            break;

        default:
            throw new Error('Invalid report type');
    }

    return reportData;
};