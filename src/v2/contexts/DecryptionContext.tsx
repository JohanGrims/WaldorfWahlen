import React, { createContext, useContext, useState } from "react";
import * as XLSX from "xlsx";
import { hashEmail } from "../utils/crypto";

export interface DecryptedStudent {
  name: string;
  email: string;
  grade: number;
  listIndex?: number;
  token: string;
}

interface DecryptionContextType {
  isDecrypted: boolean;
  students: DecryptedStudent[];
  studentMap: Record<string, DecryptedStudent>; // token -> Student
  decryptFile: (file: File) => Promise<void>;
  clear: () => void;
}

const DecryptionContext = createContext<DecryptionContextType | null>(null);

export const useDecryption = () => {
  const context = useContext(DecryptionContext);
  if (!context) {
    throw new Error("useDecryption must be used within a DecryptionProvider");
  }
  return context;
};

export const DecryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<DecryptedStudent[]>([]);
  const [studentMap, setStudentMap] = useState<Record<string, DecryptedStudent>>({});
  const [isDecrypted, setIsDecrypted] = useState(false);

  const decryptFile = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<any>(sheet);

          const parsed: DecryptedStudent[] = [];
          const map: Record<string, DecryptedStudent> = {};

          for (const row of json) {
            const email = row.Email || row["E-Mail"] || row.email || row.Mail;
            const name = row.Name || row.name || row.Schüler || row.Student;
            const grade = parseInt(row.Klasse || row.Grade || row.grade || row.Jahrgang || "0");
            const listIndex = parseInt(row.Nummer || row.ListIndex || row.Nr || "0");

            if (email && name) {
              const token = await hashEmail(email);
              const student = { name, email, grade, listIndex, token };
              parsed.push(student);
              map[token] = student;
            }
          }

          setStudents(parsed);
          setStudentMap(map);
          setIsDecrypted(true);
          resolve();
        } catch (err) {
          console.error(err);
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const clear = () => {
    setStudents([]);
    setStudentMap({});
    setIsDecrypted(false);
  };

  return (
    <DecryptionContext.Provider value={{ isDecrypted, students, studentMap, decryptFile, clear }}>
      {children}
    </DecryptionContext.Provider>
  );
};
