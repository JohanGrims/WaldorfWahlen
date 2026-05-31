import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { setColorScheme, setTheme } from "mdui";
import { db } from "../../firebase";
import { SchoolData } from "../../types";

interface SchoolContextType {
  schoolData: SchoolData | null;
  loading: boolean;
  error: string | null;
}

const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

export const useSchool = () => {
  const context = useContext(SchoolContext);
  if (context === undefined) {
    throw new Error("useSchool must be used within a SchoolProvider");
  }
  return context;
};

interface SchoolProviderProps {
  children: React.ReactNode;
}

export const SchoolProvider: React.FC<SchoolProviderProps> = ({ children }) => {
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchoolData = async () => {
      try {
        setLoading(true);
        setError(null);

        const docSnap = await getDoc(doc(db, "schools", "SCHOOLID"));

        if (docSnap.exists()) {
          const data = docSnap.data() as SchoolData;
          setSchoolData(data);

          // Apply theme settings
          setColorScheme(data.primaryColor);
          const theme = localStorage.getItem("theme") as
            | "light"
            | "dark"
            | "auto"
            | null;
          setTheme(theme || "dark");
        } else {
          console.error("School document not found");
          // Redirect to /start.html when document is not found
          window.location.href = "/start.html";
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch school data"
        );
        console.error("Error fetching school data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchoolData();
  }, []);

  const value: SchoolContextType = {
    schoolData,
    loading,
    error,
  };

  return (
    <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
  );
};
