'use client'

import { useState } from 'react'

export default function VendorLogin() {
  const [userId, setUserId] = useState('')

  const enter = () => {
    if (!userId) return
    document.cookie = `vendor_user_id=${encodeURIComponent(userId)}; path=/; max-age=86400`
    window.location.href = '/dashboard'
  }

  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <h1 style={{ marginTop: 0 }}>Vendor Portal</h1>
        <p className="muted">Sign in with your vendor account.</p>

        <div className="grid" style={{ marginTop: 24 }}>
          <div>
            <label className="muted" style={{ fontSize: 13 }}>User ID (from Medusa Admin)</label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="usr_..."
              autoFocus
            />
          </div>
          <button onClick={enter}>Enter</button>
        </div>

        <p style={{ marginTop: 32, fontSize: 13 }} className="muted">
          Note: this is a stub login. Real auth (JWT + password) is a TODO. For now, paste any Medusa user id that has a
          Vendor row tied to it — see `docs/TESTING_GUIDE.md` section 4.
        </p>
      </div>
    </div>
  )
}
