import { useEffect, useState } from 'react';
import { useAuth } from '@/AuthProvider';
import { createFetchWithAuth } from "@/fetchWithAuth";
export function useVerifyMagicLink(){
  const { apiHost, hasSignedInBefore, mode: authMode } = useAuth();
  const [verified, setHasVerified] = useState(false);
  const fetchWithAuth = createFetchWithAuth({
    authMode,
    authHost: apiHost,
  });
  const ENDPOINT = "/magic-link/poll"

  useEffect( ()=> {
      async function checkVerification(){
    const response = fetchWithAuth(ENDPOINT, {
      method: "POST",
      // headers: {content}
    })
  }
  try {
    // timeout for every 1 or 2 seconds
    // call functin
    // ping the server end point
      // if 200 response
      //navigate to /
      const response =  checkVerification();
    } catch (error) {
      //
    }
  })

  return {verified}
}
