import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export const getCategories = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "categories"));
    const categories = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    return categories;
  } catch (err) {
    console.error("Failed to fetch categories", err);
    throw err;
  }
}