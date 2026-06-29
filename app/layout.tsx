export const metadata = {
  title: 'MovSikel Admin',
  description: 'MovSikel administration dashboard',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png' }
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.png'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: '#f1f5f9',
          color: '#0f172a'
        }}
      >
        {children}
      </body>
    </html>
  );
}
