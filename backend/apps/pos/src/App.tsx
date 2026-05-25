import { useState } from 'react';

export default function App() {
  const [signedIn] = useState(false);
  if (!signedIn) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Sign in</h1>
        <p>Cashier login placeholder</p>
      </main>
    );
  }
  return <main>register placeholder</main>;
}
