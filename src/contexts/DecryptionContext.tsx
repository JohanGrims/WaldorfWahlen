import React, { createContext, useContext, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { hashEmail } from "../utils/crypto";

export interface StudentMapping {
  name: string;
  email: string;
  grade: number;
  token: string;
}

interface DecryptionContextValue {
  students: StudentMapping[];
  hasMapping: boolean;
  loadFromExcel: (file: File) => Promise<number>;
  clearMapping: () => void;
  resolveName: (token: string) => string;
}

const DecryptionContext = createContext<DecryptionContextValue>({
  students: [],
  hasMapping: false,
  loadFromExcel: async () => 0,
  clearMapping: () => {},
  resolveName: (token) => token,
});

export const useDecryption = () => useContext(DecryptionContext);

export const DecryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<StudentMapping[]>([]);

  useEffect(() => {
    // Load from SessionStorage on mount
    try {
      const stored = sessionStorage.getItem("decryption_mapping");
      if (stored) {
        setStudents(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error loading mapping from session storage", e);
    }
  }, []);

  const loadFromExcel = async (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<any>(firstSheet);

          const mapping: StudentMapping[] = [];
          for (const row of json) {
            const email = row.Email || row["E-Mail"] || row.email || row.Mail;
            const name = row.Name || row.name || row.Schüler || row.Student;
            const grade = parseInt(row.Klasse || row.Grade || row.grade || row.Jahrgang || "0");

            if (email && name) {
              const token = await hashEmail(email);
              mapping.push({ name, email, grade, token });
            }
          }

          setStudents(mapping);
          sessionStorage.setItem("decryption_mapping", JSON.stringify(mapping));
          resolve(mapping.length);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const clearMapping = () => {
    setStudents([]);
    sessionStorage.removeItem("decryption_mapping");
  };

  const resolveName = (token: string) => {
    const student = students.find((s) => s.token === token);
    return student ? student.name : token;
  };

  return (
    <DecryptionContext.Provider
      value={{
        students,
        hasMapping: students.length > 0,
        loadFromExcel,
        clearMapping,
        resolveName,
      }}
    >
      {children}
    </DecryptionContext.Provider>
  );
};
