import '../app/globals.css';

export const metadata = {
  title: 'VITA – più tempo per te',
  description: 'Il tuo spazio personale di controllo e chiarezza',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        {children}
      </body>
    </html>
  );
}