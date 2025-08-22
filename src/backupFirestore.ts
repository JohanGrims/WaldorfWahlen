import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Path to your Firebase service account key JSON
const serviceAccountPath = path.resolve(__dirname, "waldorfwahlen-service-account.json");
const outputPath = path.resolve(__dirname, "firestore-backup.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
});

const db = admin.firestore();

async function getAllCollections(): Promise<string[]> {
  const collections = await db.listCollections();
  return collections.map(col => col.id);
}

async function getDocumentData(docRef: admin.firestore.DocumentReference): Promise<any> {
  const docSnap = await docRef.get();
  if (!docSnap.exists) return null;
  const data = docSnap.data();

  // Recursively get all subcollections
  const subcollections = await docRef.listCollections();
  for (const subcol of subcollections) {
    const subcolDocs = await subcol.listDocuments();
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
  const backup: Record<string, any> = {};
  const collections = await getAllCollections();

  for (const colName of collections) {
    backup[colName] = {};
    const colRef = db.collection(colName);
    const docs = await colRef.listDocuments();
    for (const docRef of docs) {
      const docData = await getDocumentData(docRef);
      if (docData !== null) {
        backup[colName][docRef.id] = docData;
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`Firestore backup written to ${outputPath}`);
}

backupFirestore().catch(err => {
  console.error("Error backing up Firestore:", err);
  process.exit(1);
});