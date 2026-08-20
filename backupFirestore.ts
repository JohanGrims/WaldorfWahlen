import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

console.log("Starting backup script...");

// Path to your Firebase service account key JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(
  __dirname,
  "waldorfwahlen-service-account.json"
);
const outputPath = path.resolve(__dirname, "firestore-backup.json");

console.log("Service account path:", serviceAccountPath);
console.log("Service account file exists:", fs.existsSync(serviceAccountPath));

console.log("About to initialize Firebase admin...");

initializeApp({
  credential: cert(serviceAccountPath),
});

console.log("Firebase admin initialized successfully");
const db = getFirestore();
console.log("Firestore instance created:", typeof db);

async function getAllCollections(): Promise<string[]> {
  console.log("Fetching all collections...");
  const collections = await db.listCollections();
  console.log(
    `Found ${collections.length} collections:`,
    collections.map((col) => col.id)
  );
  return collections.map((col) => col.id);
}

async function getDocumentData(
  docRef: admin.firestore.DocumentReference
): Promise<any> {
  console.log(`Fetching document: ${docRef.path}`);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.log(`Document ${docRef.path} does not exist`);
    return null;
  }
  const data = docSnap.data();
  console.log(`Document ${docRef.path} fetched successfully`);

  // Recursively get all subcollections
  console.log(`Checking subcollections for document: ${docRef.path}`);
  const subcollections = await docRef.listCollections();
  console.log(
    `Found ${subcollections.length} subcollections for ${docRef.path}`
  );

  for (const subcol of subcollections) {
    console.log(`Processing subcollection: ${subcol.path}`);
    const subcolDocs = await subcol.listDocuments();
    console.log(
      `Found ${subcolDocs.length} documents in subcollection ${subcol.path}`
    );
    data[subcol.id] = {};
    for (const subDocRef of subcolDocs) {
      const subDocData = await getDocumentData(subDocRef);
      if (subDocData !== null) {
        data[subcol.id][subDocRef.id] = subDocData;
      }
    }
  }
  return data;
}

async function backupFirestore() {
  console.log("Starting Firestore backup process...");
  const backup: Record<string, any> = {};
  const collections = await getAllCollections();

  console.log(`Processing ${collections.length} collections...`);
  for (const colName of collections) {
    if (colName === "schools") {
      console.log(`Skipping collection: ${colName}`);
      continue;
    }

    console.log(`\n--- Processing collection: ${colName} ---`);
    backup[colName] = {};
    const colRef = db.collection(colName);
    console.log(`Getting documents from collection: ${colName}`);
    const docs = await colRef.listDocuments();
    console.log(`Found ${docs.length} documents in collection: ${colName}`);

    for (const docRef of docs) {
      console.log(
        `Processing document: ${docRef.id} in collection: ${colName}`
      );
      const docData = await getDocumentData(docRef);
      if (docData !== null) {
        backup[colName][docRef.id] = docData;
        console.log(`Document ${docRef.id} added to backup`);
      } else {
        console.log(`Document ${docRef.id} was null, skipping`);
      }
    }
    console.log(`Completed collection: ${colName}`);
  }

  console.log(`\nWriting backup to file: ${outputPath}`);
  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(
    `Firestore backup completed successfully! Written to ${outputPath}`
  );
  console.log(`Backup contains ${Object.keys(backup).length} collections`);
}

backupFirestore().catch((err) => {
  console.error("Error backing up Firestore:", err);
  process.exit(1);
});
