'use client';
import Login from "@/components/Login/page";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [logedin, setLogedin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if(typeof window !== "undefined") {
      const storageName = localStorage.getItem('userName')
      if(storageName) {
        setLogedin(true)
        router.push('/operations');
      } else {
        setLogedin(false);
      }
    }
  }, [router])

  if (logedin) {
    return null; // Will redirect
  }

  return (
   <div className="main">
      <Login/>
   </div>
  );
}

