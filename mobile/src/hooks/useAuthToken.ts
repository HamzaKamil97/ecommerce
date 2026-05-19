// Returns the current customer's auth token, or null if not logged in.
// Reads from the same AsyncStorage key used by medusaClient (AUTH_TOKEN_KEY = "medusa.auth.token").

import { useEffect, useState } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AUTH_TOKEN_KEY } from "../api/medusaClient"

export function useAuthToken(): string | null {
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    AsyncStorage.getItem(AUTH_TOKEN_KEY).then((v) => setToken(v))
  }, [])
  return token
}
