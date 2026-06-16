export const metadata = {
  title: 'MovSikel Admin',
  description: 'MovSikel administration dashboard'
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
