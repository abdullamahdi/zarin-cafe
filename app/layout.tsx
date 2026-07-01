export const metadata = {
  title: "Zarin Café",
  description: "QR Menu Ordering System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}