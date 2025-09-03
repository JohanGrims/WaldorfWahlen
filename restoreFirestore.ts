import admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

console.log("Starting restore script...");

// Path to your Firebase service account key JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(
  __dirname,
  "waldorfwahlen-service-account.json"
);
const backupPath = path.resolve(__dirname, "firestore-backup.json");

console.log("Service account path:", serviceAccountPath);
console.log("Service account file exists:", fs.existsSync(serviceAccountPath));
console.log("Backup file path:", backupPath);
console.log("Backup file exists:", fs.existsSync(backupPath));

if (!fs.existsSync(serviceAccountPath)) {
  console.error("Service account file not found!");
  process.exit(1);
}

if (!fs.existsSync(backupPath)) {
  console.error("Backup file not found!");
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

console.log("Firebase admin initialized successfully");
const db = admin.firestore();

// Helper function to convert timestamp objects
function convertTimestamps(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (
    typeof obj === "object" &&
    obj._seconds !== undefined &&
    obj._nanoseconds !== undefined
  ) {
    // Convert Firestore timestamp format to Timestamp object
    return admin.firestore.Timestamp.fromMillis(
      obj._seconds * 1000 + Math.floor(obj._nanoseconds / 1000000)
    );
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  if (typeof obj === "object") {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestamps(value);
    }
    return converted;
  }

  return obj;
}

// Function to determine if a field contains subcollection data
function isSubcollection(key: string, value: any): boolean {
  // Check if this looks like a subcollection (object with document-like keys)
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  // Check if all values in the object are themselves objects (indicating documents)
  const values = Object.values(value);
  if (values.length === 0) {
    return false;
  }

  // If all values are objects and none are arrays, and keys look like document IDs, it's likely a subcollection
  return values.every(
    (v) => typeof v === "object" && v !== null && !Array.isArray(v)
  );
}

// Function to upload a document with its subcollections
async function uploadDocument(
  docRef: admin.firestore.DocumentReference,
  docData: any
): Promise<void> {
  console.log(`Uploading document: ${docRef.path}`);

  // Separate document fields from subcollections
  const documentFields: any = {};
  const subcollections: { [key: string]: any } = {};

  for (const [key, value] of Object.entries(docData)) {
    if (isSubcollection(key, value)) {
      subcollections[key] = value;
      console.log(`  Found subcollection: ${key}`);
    } else {
      documentFields[key] = convertTimestamps(value);
    }
  }

  // Upload the document fields (if any)
  if (Object.keys(documentFields).length > 0) {
    await docRef.set(documentFields);
    console.log(
      `  Document fields uploaded: ${Object.keys(documentFields).length} fields`
    );
  }

  // Upload subcollections
  for (const [subcolName, subcolData] of Object.entries(subcollections)) {
    console.log(`  Processing subcollection: ${subcolName}`);
    const subcolRef = docRef.collection(subcolName);

    for (const [subDocId, subDocData] of Object.entries(
      subcolData as Record<string, any>
    )) {
      const subDocRef = subcolRef.doc(subDocId);
      await uploadDocument(subDocRef, subDocData);
    }
    console.log(`  Subcollection ${subcolName} uploaded successfully`);
  }
}

// Function to upload a collection to schools/wsp/{collectionName}
async function uploadCollection(
  collectionName: string,
  collectionData: any
): Promise<void> {
  console.log(
    `\n--- Uploading collection: ${collectionName} to schools/wsp/${collectionName} ---`
  );

  const targetColRef = db
    .collection("schools")
    .doc("wsp")
    .collection(collectionName);

  for (const [docId, docData] of Object.entries(collectionData)) {
    const docRef = targetColRef.doc(docId);
    await uploadDocument(docRef, docData);
    console.log(`Document ${docId} uploaded successfully`);
  }

  console.log(`Collection ${collectionName} upload completed`);
}

// Main restore function
async function restoreFirestore(): Promise<void> {
  console.log("Starting Firestore restore process...");

  // Read the backup file
  const backupContent = fs.readFileSync(backupPath, "utf-8");
  const backup = JSON.parse(backupContent);

  console.log(
    `Backup contains ${Object.keys(backup).length} collections:`,
    Object.keys(backup)
  );

  // Ensure schools/wsp document exists
  console.log("Creating schools/wsp document if it doesn't exist...");
  const wspDocRef = db.collection("schools").doc("wsp");
  await wspDocRef.set({ initialized: true }, { merge: true });
  console.log("schools/wsp document ready");

  // Process each collection
  for (const [collectionName, collectionData] of Object.entries(backup)) {
    try {
      await uploadCollection(collectionName, collectionData);
    } catch (error) {
      console.error(`Error uploading collection ${collectionName}:`, error);
      throw error;
    }
  }

  console.log("\n✅ Firestore restore completed successfully!");
  console.log(`All data has been restored to schools/wsp/`);
}

// Run the restore
restoreFirestore().catch((err) => {
  console.error("❌ Error restoring Firestore:", err);
  process.exit(1);
});
