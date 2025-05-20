import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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